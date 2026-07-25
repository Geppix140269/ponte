"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { inferIntent, type RouteKey, type ExtractedFacts } from "@/lib/landing/intent";
import { destinationFor } from "@/lib/landing/routing";
import { ROTATING_EXAMPLES } from "@/lib/landing/examples";
import { track } from "@/lib/landing/analytics";
import PonteBridge, { type BridgeCenter } from "./PonteBridge";
import VoiceSheet, { type VoiceLabels } from "./VoiceSheet";

const ROUTES: RouteKey[] = ["find", "structure", "check", "investigate"];

// Which of a route's four facts read as optional / unknown, so colour never
// carries the only meaning (the fact word itself always states it too).
const FACT_TONE: Record<RouteKey, string[]> = {
  find: ["", "opt", "opt", "opt"],
  structure: ["", "", "", "opt"],
  check: ["", "", "unk", "opt"],
  investigate: ["", "", "unk", "opt"],
};

// BCP-47 recognition tag for the *interface* locale. This only sets the voice
// recogniser's starting language; the user can still speak any language and the
// edited transcript is classified language-independently. Add a tag here when an
// interface locale is added (see LANGUAGES.md).
const SPEECH_LANG: Record<string, string> = {
  en: "en-US",
};

export default function PonteLanding({ locale, rtl }: { locale: string; rtl: boolean }) {
  const t = useTranslations("home");
  const router = useRouter();
  const bold = useCallback((chunks: ReactNode) => <b>{chunks}</b>, []);

  const [activeRoute, setActiveRoute] = useState<RouteKey | null>(null);
  const [objective, setObjective] = useState("");
  const [clarify, setClarify] = useState(false);
  const [clarifyReply, setClarifyReply] = useState("");
  const [interpreting, setInterpreting] = useState(false);
  const [needProduct, setNeedProduct] = useState(false);
  const [focused, setFocused] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [live, setLive] = useState("");

  const fieldRef = useRef<HTMLTextAreaElement | null>(null);

  const announce = useCallback((message: string) => {
    setLive("");
    window.setTimeout(() => setLive(message), 50);
  }, []);

  // Reduced motion is read once on the client, so the server render is stable.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const paused = activeRoute !== null || objective.trim() !== "" || focused;

  // Rotate the example placeholder only while the field is empty, unfocused and
  // no route is chosen. It begins in English (index 0, same on server and
  // client, so no hydration mismatch) and returns to English each cycle.
  useEffect(() => {
    if (reduceMotion || paused) return undefined;
    const id = window.setInterval(() => {
      setExampleIndex((i) => (i + 1) % ROTATING_EXAMPLES.length);
    }, 3600);
    return () => window.clearInterval(id);
  }, [reduceMotion, paused]);

  const grow = useCallback(() => {
    const el = fieldRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  const example = ROTATING_EXAMPLES[exampleIndex];
  const placeholder = activeRoute ? t(`routes.${activeRoute}.placeholder`) : example.text;
  const fieldDir = objective
    ? "auto"
    : activeRoute
      ? rtl
        ? "rtl"
        : "ltr"
      : example.dir;
  const fieldLang = objective ? undefined : activeRoute ? locale : example.lang;

  const center: BridgeCenter = activeRoute
    ? {
        eyebrow: t(`routes.${activeRoute}.label`),
        title: t(`routes.${activeRoute}.title`),
        titleEm: t(`routes.${activeRoute}.titleEm`),
        hint: t(`routes.${activeRoute}.hint`),
      }
    : {
        eyebrow: t("gateway.centerEyebrow"),
        title: t("gateway.centerTitle"),
        titleEm: t("gateway.centerTitleEm"),
        hint: t("gateway.centerHint"),
      };

  const labels = useMemo(
    () =>
      ROUTES.reduce(
        (acc, key) => {
          acc[key] = t(`routes.${key}.label`);
          return acc;
        },
        {} as Record<RouteKey, string>,
      ),
    [t],
  );

  const selectRoute = useCallback(
    (key: RouteKey, opts?: { silent?: boolean }) => {
      setActiveRoute(key);
      setClarify(false);
      setNeedProduct(false);
      track("route_suggested", { route: key });
      if (!opts?.silent) {
        track("route_confirmed", { route: key });
        announce(`${t(`routes.${key}.label`)}. ${t(`routes.${key}.title`)}.`);
        window.requestAnimationFrame(() => fieldRef.current?.focus());
      }
    },
    [announce, t],
  );

  const navigate = useCallback(
    (route: RouteKey, text: string, factsOverride?: ExtractedFacts) => {
      const facts = factsOverride ?? inferIntent(text || "", route).facts;
      track("intent_submitted", { route });
      router.push(destinationFor(route, facts));
    },
    [router],
  );

  // The AI fallback: for anything the deterministic matcher cannot resolve (any
  // language, any product outside its small vocabulary), ask the server to read
  // the objective. Returns true when it navigated or answered, false when the
  // caller should fall back to the deterministic clarify path. Never throws.
  const interpretWithAi = useCallback(
    async (text: string): Promise<boolean> => {
      setInterpreting(true);
      try {
        const res = await fetch("/api/landing/interpret", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text }),
        }).catch(() => null);
        const data = res && res.ok ? await res.json().catch(() => null) : null;
        if (!data?.ok) return false;

        if (data.route) {
          selectRoute(data.route as RouteKey, { silent: true });
          navigate(data.route as RouteKey, text, {
            raw: text,
            product: data.product ?? undefined,
            company: data.company ?? undefined,
          });
          return true;
        }
        // No route, but the model gave a reply in the user's language: show it
        // rather than a generic prompt, so the visitor is never met with nothing.
        if (data.reply) {
          setClarifyReply(data.reply as string);
          setClarify(true);
          announce(data.reply as string);
          return true;
        }
        return false;
      } finally {
        setInterpreting(false);
      }
    },
    [announce, navigate, selectRoute],
  );

  const submit = useCallback(
    async (raw?: string) => {
      const text = (raw ?? objective).trim();

      if (activeRoute) {
        if (activeRoute === "find" && !inferIntent(text, "find").facts.product) {
          // A route is already chosen but no product was read from the text.
          // Try the AI (the product may be in another language) before asking.
          if (text && (await interpretWithAi(text))) return;
          setNeedProduct(true);
          announce(t("find.needProductAnnounce"));
          fieldRef.current?.focus();
          return;
        }
        navigate(activeRoute, text);
        return;
      }

      if (!text) {
        announce(t("clarify.emptyAnnounce"));
        fieldRef.current?.focus();
        return;
      }

      const result = inferIntent(text);
      const resolvedByMatcher =
        result.route && !(result.route === "find" && result.needsClarification);
      if (resolvedByMatcher) {
        selectRoute(result.route as RouteKey, { silent: true });
        navigate(result.route as RouteKey, text);
        return;
      }

      // The matcher could not fully resolve it. Ask the AI (any language, any
      // product); only if that is unavailable do we fall back to clarify.
      if (await interpretWithAi(text)) return;

      if (result.route === "find") {
        selectRoute("find", { silent: true });
        setNeedProduct(true);
        announce(t("find.needProductAnnounce"));
        fieldRef.current?.focus();
        return;
      }
      setClarify(true);
      announce(t("clarify.announce"));
    },
    [objective, activeRoute, announce, navigate, selectRoute, interpretWithAi, t],
  );

  const onVoiceUse = useCallback(
    (text: string) => {
      setVoiceOpen(false);
      setObjective(text);
      window.requestAnimationFrame(grow);
      submit(text);
    },
    [grow, submit],
  );

  const voiceLabels: VoiceLabels = {
    title: t("voiceSheet.title"),
    requesting: t("voiceSheet.requesting"),
    listening: t("voiceSheet.listening"),
    ready: t("voiceSheet.ready"),
    editHint: t("voiceSheet.editHint"),
    noSpeech: t("voiceSheet.noSpeech"),
    noSpeechHint: t("voiceSheet.noSpeechHint"),
    denied: t("voiceSheet.denied"),
    deniedHint: t("voiceSheet.deniedHint"),
    unsupported: t("voiceSheet.unsupported"),
    unsupportedHint: t("voiceSheet.unsupportedHint"),
    errorLabel: t("voiceSheet.error"),
    errorHint: t("voiceSheet.errorHint"),
    stop: t("voiceSheet.stop"),
    reRecord: t("voiceSheet.reRecord"),
    continueLabel: t("voiceSheet.continueLabel"),
    tryAgain: t("voiceSheet.tryAgain"),
    typeInstead: t("voiceSheet.typeInstead"),
    close: t("voiceSheet.close"),
  };

  const support: ReactNode = interpreting
    ? t("voice.sub")
    : clarify
      ? clarifyReply || t.rich("clarify.prompt", { b: bold })
      : needProduct
        ? t.rich("find.needProductSupport", { b: bold })
        : activeRoute
          ? t.rich(`routes.${activeRoute}.support`, { b: bold })
          : t("voice.sub");

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite">
        {live}
      </div>

      <header className="lhead">
        <Link className="lockup" href="/" aria-label={t("header.homeAria")}>
          <span className="lockup__chip">
            <svg className="lockup__mark" viewBox="0 0 120 120" aria-hidden="true">
              <path
                d="M22 98 L22 60 C22 35 98 35 98 60 L98 98"
                fill="none"
                stroke="currentColor"
                strokeWidth="11"
                strokeLinejoin="miter"
                strokeLinecap="square"
              />
              <line x1="12" y1="98" x2="108" y2="98" stroke="currentColor" strokeWidth="5" />
              <circle className="lockup__dot" cx="60" cy="41" r="10" />
            </svg>
          </span>
          <span className="lockup__word">Ponte</span>
          <span className="lockup__tld">.trade</span>
        </Link>
        <div className="lhead__actions">
          <span className="lhead__pos">{t("header.tradeClarity")}</span>
        </div>
      </header>

      <main className="land">
        <div className="land__top">
          <section className="obj" aria-label={t("hero.regionLabel")}>
            <div className="obj__eyebrow">
              <span className="eyebrow">{t("eyebrow")}</span>
            </div>
            <h1 className="obj__q">
              {t("headline")}
              <em>{t("supporting")}</em>
            </h1>

            <div className="talk">
              <button
                type="button"
                className={`mic${voiceOpen ? " listening" : ""}`}
                aria-label={t("voice.ariaLabel")}
                onClick={() => {
                  track("voice_started");
                  setVoiceOpen(true);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
              </button>
              <span className="talk__label">
                <span className="talk__cta">{t("voice.cta")}</span>
                <span className="talk__sub">{support}</span>
              </span>
            </div>

            <div className="obj__type">
              <span className="obj__or">{t("type.or")}</span>
              <div className="obj__ask">
                <textarea
                  ref={fieldRef}
                  className="obj__field"
                  rows={1}
                  dir={fieldDir}
                  lang={fieldLang}
                  value={objective}
                  placeholder={placeholder}
                  autoComplete="off"
                  aria-label={t("type.ariaLabel")}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onChange={(e) => {
                    setObjective(e.target.value);
                    setClarify(false);
                    setClarifyReply("");
                    setNeedProduct(false);
                    grow();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                />
                <button
                  type="button"
                  className={`obj__go${interpreting ? " is-busy" : ""}`}
                  aria-label={t("type.continueLabel")}
                  aria-busy={interpreting}
                  disabled={interpreting}
                  onClick={() => submit()}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
              <p className="obj__ai">{t("ai.disclosure")}</p>
            </div>
          </section>

          <section className="gatewrap" aria-label={t("gateway.regionLabel")}>
            <PonteBridge active={activeRoute} center={center} labels={labels} onSelect={selectRoute} />
            <div className="rfacts" aria-live="polite">
              {activeRoute
                ? [1, 2, 3, 4].map((n, i) => (
                    <span key={n} className={`rfact ${FACT_TONE[activeRoute][i]}`.trim()}>
                      {t(`routes.${activeRoute}.fact${n}`)}{" "}
                      <span className="q">{t(`routes.${activeRoute}.fact${n}q`)}</span>
                    </span>
                  ))
                : null}
            </div>
          </section>
        </div>

        <div className="land__foot">
          <div className="re">{t.rich("trust", { b: bold })}</div>
        </div>
      </main>

      <VoiceSheet
        open={voiceOpen}
        lang={SPEECH_LANG[locale] ?? "en-US"}
        labels={voiceLabels}
        announce={announce}
        onClose={() => setVoiceOpen(false)}
        onUse={onVoiceUse}
      />
    </>
  );
}
