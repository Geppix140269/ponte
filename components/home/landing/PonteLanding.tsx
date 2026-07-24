"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { inferIntent, type RouteKey } from "@/lib/landing/intent";
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

const SPEECH_LANG: Record<string, string> = {
  en: "en-US",
  zh: "zh-CN",
  es: "es-ES",
  ar: "ar-SA",
  fr: "fr-FR",
  pt: "pt-PT",
  ru: "ru-RU",
  de: "de-DE",
  hi: "hi-IN",
  it: "it-IT",
};

export default function PonteLanding({ locale, rtl }: { locale: string; rtl: boolean }) {
  const t = useTranslations("home");
  const router = useRouter();
  const bold = useCallback((chunks: ReactNode) => <b>{chunks}</b>, []);

  const [activeRoute, setActiveRoute] = useState<RouteKey | null>(null);
  const [objective, setObjective] = useState("");
  const [clarify, setClarify] = useState(false);
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
    (route: RouteKey, text: string) => {
      const facts = inferIntent(text || "", route).facts;
      track("intent_submitted", { route });
      router.push(destinationFor(route, facts));
    },
    [router],
  );

  const submit = useCallback(
    (raw?: string) => {
      const text = (raw ?? objective).trim();

      if (activeRoute) {
        if (activeRoute === "find" && !inferIntent(text, "find").facts.product) {
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
      if (!result.route) {
        setClarify(true);
        announce(t("clarify.announce"));
        return;
      }
      if (result.route === "find" && result.needsClarification) {
        selectRoute("find", { silent: true });
        setNeedProduct(true);
        announce(t("find.needProductAnnounce"));
        fieldRef.current?.focus();
        return;
      }
      selectRoute(result.route, { silent: true });
      navigate(result.route, text);
    },
    [objective, activeRoute, announce, navigate, selectRoute, t],
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

  const support: ReactNode = clarify
    ? t.rich("clarify.prompt", { b: bold })
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
                  className="obj__go"
                  aria-label={t("type.continueLabel")}
                  onClick={() => submit()}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
            </div>
          </section>

          <section className="gatewrap" aria-label={t("gateway.regionLabel")}>
            <div className="gate__labels">
              <span>{t("gateway.chooseWhereToBegin")}</span>
              <span className="r">{t("gateway.goldSignal")}</span>
            </div>
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
