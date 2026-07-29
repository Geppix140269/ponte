import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { landingFontVars } from "@/components/home/landing/fonts";
import DealRoomBridge from "@/components/ponte/bridge/DealRoomBridge";
import { MomentumPanel } from "@/components/deal-room/primitives";
import {
  admittedMomentum,
  blockerResolvedMomentum,
  evidenceAcceptedMomentum,
  evidenceSubmittedMomentum,
  procedureApprovedMomentum,
  readOnlyMomentum,
} from "@/lib/deal-room/momentum";
import { NOTE, STATES } from "./states";
import "@/design/authority/bridge/v1/source/ponte-bridge.css";
import "@/components/ponte/bridge/bridge-integration.css";
import "@/components/ponte/state/state.css";
import "@/components/deal-room/deal-room.css";

/**
 * The Deal Room state gallery.
 *
 * Development only: it 404s in production, is not linked, not indexed and not
 * translated. Same purpose and same gate as the product intake gallery that
 * precedes it.
 *
 * Constitution section 21 requires desktop and 390 x 844 evidence of the states
 * a change touches, and most Deal Room states cannot be reached on demand in a
 * browser: a blocked room needs a real disagreement, a read-only room needs a
 * term to expire, and `Ready to proceed` needs an entire transaction to finish.
 * Worse, at Gate B the tables do not exist in any database - applying the
 * migration is a Gate C owner decision - so there is nothing to drive the real
 * surfaces with at all.
 *
 * Rendering each state from the real domain is how the evidence stays
 * reproducible. Nothing here is mocked: every model comes from `bridgeModel()`
 * over a step table from `templateFor()`, and every percentage from
 * `procedureProgress()`. A rule that drifts drifts out of the evidence with it.
 *
 * `?only=<id>` renders one state alone, for a Playwright capture.
 */

export const metadata = {
  title: "Ponte Deal Room states",
  robots: { index: false, follow: false },
};

export default async function DealRoomStatesPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams?: { only?: string; momentum?: string };
}) {
  if (process.env.NODE_ENV === "production") notFound();
  setRequestLocale(params.locale);

  const only = searchParams?.only;
  const states = only ? STATES.filter((state) => state.id === only) : STATES;
  if (states.length === 0) notFound();

  const momentums = [
    admittedMomentum({
      organisationLabel: "Atlantico Comercio",
      roomHref: "#",
      previousValue: null,
      currentValue: null,
    }),
    procedureApprovedMomentum({
      roomHref: "#",
      previousValue: null,
      currentValue: 22,
      firstStepTitle: "Product specification and quantity agreed",
      firstStepOwner: "Atlantico Comercio",
    }),
    evidenceSubmittedMomentum({
      evidenceTitle: "the certificate of analysis",
      reviewerLabel: "Iberia Importaciones",
      href: "#",
      previousValue: 22,
      currentValue: 22,
    }),
    evidenceAcceptedMomentum({
      evidenceTitle: "The capacity declaration",
      stepTitle: "Supply capability evidenced",
      href: "#",
      previousValue: 36,
      currentValue: 52,
      nextStepTitle: "Documentary and regulatory requirements agreed",
      nextStepOwner: "Both principals",
    }),
    blockerResolvedMomentum({
      blockerTitle: "Sampling point is not accepted by both principals",
      href: "#",
      previousValue: 52,
      currentValue: 60,
      nextStepTitle: "Inspection and delivery procedure agreed",
      nextStepOwner: "Sondagem Inspecoes",
    }),
    readOnlyMomentum({ href: "#" }),
  ];

  return (
    <div className={landingFontVars}>
      <div className="dr" style={{ minHeight: "100dvh" }}>
        {!only ? (
          <header style={{ marginBottom: 40 }}>
            <p className="dr__ref">Development only · not indexed · not linked</p>
            <h1 className="dr__title">Multi-party Deal Room Bridge v1</h1>
            <p className="dr__deal">{NOTE}</p>
          </header>
        ) : null}

        {states.map((state) => (
          <section key={state.id} style={{ marginBottom: only ? 0 : 72 }} id={state.id}>
            {!only ? (
              <>
                <h2 className="dr__band-title">{state.title}</h2>
                <p className="dr__deal" style={{ marginBottom: 22 }}>
                  {state.note}
                </p>
              </>
            ) : null}

            <div className="dr__progress" style={{ marginBottom: 18 }}>
              <span className="dr__stage">{state.stage}</span>
              {state.model.completion === null ? (
                <span className="dr__no-value">{state.progressLabel}</span>
              ) : (
                <span className="dr__value">{state.progressLabel}</span>
              )}
            </div>

            <DealRoomBridge model={state.model} caption="DR-2026-0048" />
          </section>
        ))}

        {!only ? (
          <section style={{ marginTop: 24 }}>
            <h2 className="dr__band-title">Professional Momentum, at every meaningful completion and recovery</h2>
            <p className="dr__deal" style={{ marginBottom: 22 }}>
              Five parts, always in this order. The progress line is absent whenever no percentage may lawfully be
              shown, which is why the first and last panels have none.
            </p>
            <div style={{ display: "grid", gap: 18 }}>
              {momentums.map((momentum) => (
                <MomentumPanel key={momentum.actionCompleted} momentum={momentum} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
