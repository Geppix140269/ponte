"use client";

import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { inferIntent, type RouteKey, type ExtractedFacts } from "@/lib/landing/intent";
import { destinationFor } from "@/lib/landing/routing";
import { bridgeNavigation, type BridgeRoute } from "@/lib/landing/bridge";
import { track } from "@/lib/landing/analytics";
import type { ActivityBandItem } from "@/lib/board/activity-view";
import ActivityBand from "./ActivityBand";
import PonteFlow, { type FlowCaption, type FlowRouteLabels } from "./PonteFlow";

/**
 * The Ponte Trade entrance (North Star entry architecture, section 5).
 *
 * The hierarchy is fixed by the North Star and is the reason this file is
 * ordered the way it is:
 *
 *   header -> recent market activity -> Ponte Trade -> "What's your deal?"
 *   -> two-route bridge -> search -> popular areas -> trust -> footer
 *
 * Two things this page no longer does, both deliberate:
 *
 *   - It offers two primary routes, not four. Check a company and Investigate a
 *     signal are contextual and downstream; they stay reachable through search
 *     and from the journeys that own them.
 *   - It has no voice control. Browser support is inconsistent, accuracy across
 *     accents is not good enough for a first impression, and most visitors are
 *     not native English speakers. Typing and search are the interaction. Voice
 *     survives inside journeys (the Find picker, the Check composer), where it
 *     assists rather than greets.
 *
 * The market data (the band, the popular areas) is read on the server and
 * handed down as already-rendered strings, so this component stays a thin
 * interaction layer and the page never issues a client query.
 */

export interface PopularArea {
  /** Sector id from HS_CATEGORIES. */
  id: number;
  label: string;
  /** Locale-relative path into Explore. */
  href: string;
  /** Real record count, already formatted. */
  count: string;
}

export default function PonteLanding({
  rtl,
  activity,
  popular,
}: {
  rtl: boolean;
  activity: ActivityBandItem[];
  popular: PopularArea[];
}) {
  const t = useTranslations("home");
  const router = useRouter();
  const bold = useCallback((chunks: ReactNode) => <b>{chunks}</b>, []);
  const aboutLink = useCallback(
    (chunks: ReactNode) => (
      <Link className="lnote__a" href="/about">
        {chunks}
      </Link>
    ),
    [],
  );

  const [query, setQuery] = useState("");
  const [clarify, setClarify] = useState(false);
  const [clarifyReply, setClarifyReply] = useState("");
  const [interpreting, setInterpreting] = useState(false);
  const [live, setLive] = useState("");

  const fieldRef = useRef<HTMLInputElement | null>(null);

  const announce = useCallback((message: string) => {
    setLive("");
    window.setTimeout(() => setLive(message), 50);
  }, []);

  const caption: FlowCaption = {
    eyebrow: t("gateway.centerEyebrow"),
    hint: t("gateway.centerHint"),
  };

  const routeLabels: Record<BridgeRoute, FlowRouteLabels> = {
    explore: { title: t("routes.explore.label"), support: t("routes.explore.support") },
    deal: { title: t("routes.deal.label"), support: t("routes.deal.support") },
  };

  /**
   * A deliberate click on a bridge route: a direct entrance. The page leaves at
   * once, with no objective, no product and no second step. Anything already
   * typed rides along; the journey collects whatever it still needs.
   */
  const openRoute = useCallback(
    (key: BridgeRoute) => {
      const text = query.trim();
      const facts = text ? inferIntent(text, "find").facts : undefined;
      const { destination, events } = bridgeNavigation(key, facts);
      for (const e of events) track(e.name, e.meta);
      router.push(destination);
    },
    [query, router],
  );

  const navigate = useCallback(
    (route: RouteKey, text: string, factsOverride?: ExtractedFacts) => {
      const facts = factsOverride ?? inferIntent(text || "", route).facts;
      track("intent_submitted", { route });
      router.push(destinationFor(route, facts));
    },
    [router],
  );

  /**
   * The AI fallback: for anything the deterministic matcher cannot resolve (any
   * language, any product outside its small vocabulary), ask the server to read
   * the search. Returns true when it navigated or answered, false when the
   * caller should fall back. Never throws.
   */
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
          navigate(data.route as RouteKey, text, {
            raw: text,
            product: data.product ?? undefined,
            company: data.company ?? undefined,
          });
          return true;
        }
        // No route, but the model gave a reply in the visitor's language: show
        // it rather than a generic prompt, so nobody is met with nothing.
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
    [announce, navigate],
  );

  /**
   * Search. A specific search bypasses the visual drill-down and opens the
   * market it names; anything the interpreter cannot place opens Explore rather
   * than an apology, because the market universe is always a useful answer.
   */
  const submit = useCallback(async () => {
    const text = query.trim();
    if (!text) {
      announce(t("search.emptyAnnounce"));
      fieldRef.current?.focus();
      return;
    }

    const result = inferIntent(text);
    const resolvedByMatcher =
      result.route && !(result.route === "find" && result.needsClarification);
    if (resolvedByMatcher) {
      navigate(result.route as RouteKey, text);
      return;
    }

    if (await interpretWithAi(text)) return;

    // Nothing could be read from the words. Explore, filtered by what was
    // typed, is still market activity: never an empty result page.
    const { destination, events } = bridgeNavigation("explore", { raw: text });
    for (const e of events) track(e.name, e.meta);
    router.push(destination);
  }, [query, announce, navigate, interpretWithAi, router, t]);

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
          <Link className="lhead__link" href="/explore">
            {t("routes.explore.label")}
          </Link>
          <Link className="lhead__link" href="/structure">
            {t("routes.deal.label")}
          </Link>
        </div>
      </header>

      <ActivityBand
        items={activity}
        labels={{ title: t("activity.title"), note: t("activity.note") }}
      />

      <main className="land">
        <div className="land__top">
          <section className="obj" aria-label={t("hero.regionLabel")}>
            <div className="obj__eyebrow">
              <span className="eyebrow">{t("brand")}</span>
            </div>
            <h1 className="obj__q">
              {t("headline")}
              <em>{t("supporting")}</em>
            </h1>
          </section>

          <section className="gatewrap" aria-label={t("gateway.regionLabel")}>
            <PonteFlow caption={caption} labels={routeLabels} onOpen={openRoute} />
          </section>

          <section className="lsearch" aria-label={t("search.regionLabel")}>
            <label className="lsearch__l" htmlFor="ponte-search">
              {t("search.label")}
            </label>
            <div className="obj__ask">
              <input
                id="ponte-search"
                ref={fieldRef}
                className="obj__field"
                type="search"
                dir={rtl ? "rtl" : "ltr"}
                value={query}
                placeholder={t("search.placeholder")}
                autoComplete="off"
                enterKeyHint="search"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setClarify(false);
                  setClarifyReply("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void submit();
                  }
                }}
              />
              <button
                type="button"
                className={`obj__go${interpreting ? " is-busy" : ""}`}
                aria-label={t("search.go")}
                aria-busy={interpreting}
                disabled={interpreting}
                onClick={() => void submit()}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
            <p className="lsearch__h">
              {interpreting
                ? t("search.reading")
                : clarify
                  ? clarifyReply || t("search.clarify")
                  : t("search.hint")}
            </p>
            <p className="obj__ai">{t("ai.disclosure")}</p>
          </section>

          {popular.length > 0 && (
            <section className="popular" aria-label={t("popular.title")}>
              <h2 className="popular__t">{t("popular.title")}</h2>
              <ul className="popular__l">
                {popular.map((area) => (
                  <li key={area.id}>
                    <Link className="popular__i" href={area.href}>
                      <span className="popular__n">{area.label}</span>
                      <span className="popular__c">
                        {t("popular.records", { count: area.count })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* What a record is, how the desk treats it and when an account is
              needed used to be printed here in full. It is reference, not an
              entrance: it belongs on About, which now carries it, and this page
              links to it in one line rather than reprinting the argument. */}
          <p className="lnote">
            {t.rich("trustLink", { b: bold, a: aboutLink })}
          </p>
        </div>
      </main>
    </>
  );
}
