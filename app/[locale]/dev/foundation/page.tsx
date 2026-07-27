import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import LifecycleState from "@/components/ponte/state/LifecycleState";
import { PROGRESS_FLOOR, progressBand, progressValue, type ProgressStep } from "@/lib/ponte/progress";
import { MOTION_COMPONENTS } from "@/lib/ponte/motion";
import PonteLockup from "@/components/ponte/brand/PonteLockup";
import "@/components/desk/desk.css";
import "@/components/ponte/state/state.css";

/**
 * Phase 2 foundation specimen sheet.
 *
 * Development only: it 404s in production, is not translated, not linked and
 * not indexed, and `/dev/` is already bared by ChromeGate. It adds no route to
 * the product.
 *
 * It exists because this PR builds shared primitives that no journey mounts
 * yet, and Constitution section 21 does not accept technical tests as evidence.
 * The lifecycle states and the progress engine would otherwise be reviewable
 * only by reading their source. Here they can be looked at, photographed at
 * 390 x 844, and checked with the reduced-motion setting on, which is the one
 * thing a unit test genuinely cannot show.
 *
 * The progress rows are rendered from the engine, not written out, so a change
 * to the weights or the floor shows up here rather than in a stale table.
 */

export const metadata = {
  title: "Ponte Phase 2 foundation specimen",
  robots: { index: false, follow: false },
};

/**
 * A realistic irregular procedure, weighted by how much of the whole each step
 * actually completes. Naming the subject settles more of a deal than attaching
 * a second document, and the weights say so.
 */
const STEPS: ProgressStep[] = [
  { id: "subject", weight: 28 },
  { id: "facts", weight: 24 },
  { id: "detail", weight: 19 },
  { id: "evidence", weight: 17 },
  { id: "preview", weight: 12 },
];

export default function FoundationSpecimenPage({ params }: { params: { locale: string } }) {
  if (process.env.NODE_ENV === "production") notFound();
  setRequestLocale(params.locale);

  // Walk the procedure one step at a time, which is what a member does.
  const walk = STEPS.map((_, i) => {
    const done = STEPS.slice(0, i + 1).map((s) => s.id);
    return { done, value: progressValue(STEPS, done)! };
  });

  return (
    <div className="ponte-desk" style={{ padding: "32px 24px", minHeight: "100vh" }}>
      <header style={{ marginBottom: 40 }}>
        <PonteLockup />
        <h1 className="serif" style={{ fontSize: 28, marginTop: 20, color: "var(--ink)" }}>
          Phase 2 foundation
        </h1>
        <p style={{ color: "var(--ink-3)", maxWidth: "64ch", marginTop: 8 }}>
          Shared primitives built before the journey redesigns. Nothing on this page is mounted on a
          product route yet.
        </p>
      </header>

      {/* ---- Lifecycle states ------------------------------------------- */}
      <section style={{ marginBottom: 48 }}>
        <h2 className="serif" style={{ fontSize: 20, color: "var(--ink)" }}>
          Lifecycle states
        </h2>
        <p style={{ color: "var(--ink-3)", maxWidth: "64ch", margin: "8px 0 20px" }}>
          Seven states, each distinguished by its words, its marker geometry and only then by colour.
          Only the two where work is genuinely happening move. Read this page in greyscale, or with
          reduced motion on, and every state should still be identifiable.
        </p>

        <div style={{ display: "grid", gap: 14 }}>
          <LifecycleState state="loading" label="Loading" detail="Reading the market record" />
          <LifecycleState state="active" label="Searching" detail="Checking public signals now" />
          <LifecycleState state="waiting" label="Waiting for you" detail="Two facts are still needed" />
          <LifecycleState state="review" label="Under review" detail="A person is checking the evidence" />
          <LifecycleState
            state="blocked"
            label="Cannot submit"
            detail="Your business profile is incomplete"
          />
          <LifecycleState state="completed" label="Draft complete" detail="Ready to submit for review" />
          <LifecycleState state="error" label="Could not save" detail="The connection dropped" />
        </div>
      </section>

      {/* ---- Progress engine -------------------------------------------- */}
      <section style={{ marginBottom: 48 }}>
        <h2 className="serif" style={{ fontSize: 20, color: "var(--ink)" }}>
          Deterministic progress
        </h2>
        <p style={{ color: "var(--ink-3)", maxWidth: "64ch", margin: "8px 0 20px" }}>
          Rendered from the engine. Nothing completed has no percentage at all, the first value clears
          the floor of {PROGRESS_FLOOR}, the increments are irregular because the weights are, and 100
          arrives only when the last step does. 100 means the draft is complete and nothing more.
        </p>

        <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 620, maxWidth: 720, fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--mute)" }}>
              <th style={{ padding: "6px 10px 6px 0", fontWeight: 600 }}>Completed</th>
              <th style={{ padding: "6px 10px", fontWeight: 600 }}>Value</th>
              <th style={{ padding: "6px 10px", fontWeight: 600 }}>Step</th>
              <th style={{ padding: "6px 10px", fontWeight: 600 }}>Opportunity band</th>
              <th style={{ padding: "6px 10px", fontWeight: 600 }}>Submission band</th>
            </tr>
          </thead>
          <tbody style={{ color: "var(--ink-2)" }}>
            <tr style={{ borderTop: "1px solid var(--rule)" }}>
              <td style={{ padding: "8px 10px 8px 0" }}>Nothing</td>
              <td style={{ padding: "8px 10px", fontWeight: 700, color: "var(--ink)" }}>
                {progressValue(STEPS, []) === null ? "No percentage" : "DEFECT"}
              </td>
              <td style={{ padding: "8px 10px", color: "var(--mute)" }}>&mdash;</td>
              <td style={{ padding: "8px 10px", color: "var(--mute)" }} colSpan={2}>
                Neutral state, never 0%
              </td>
            </tr>
            {walk.map((row, i) => (
              <tr key={row.value} style={{ borderTop: "1px solid var(--rule)" }}>
                <td style={{ padding: "8px 10px 8px 0" }}>{row.done.join(", ")}</td>
                <td style={{ padding: "8px 10px", fontWeight: 700, color: "var(--ink)" }}>{row.value}%</td>
                <td style={{ padding: "8px 10px", color: "var(--mute)" }}>
                  {i === 0 ? `+${row.value - PROGRESS_FLOOR} from floor` : `+${row.value - walk[i - 1].value}`}
                </td>
                <td style={{ padding: "8px 10px" }}>{progressBand(row.value, "opportunity")}</td>
                <td style={{ padding: "8px 10px" }}>{progressBand(row.value, "submission")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      {/* ---- Motion register --------------------------------------------- */}
      <section>
        <h2 className="serif" style={{ fontSize: 20, color: "var(--ink)" }}>
          Motion register
        </h2>
        <p style={{ color: "var(--ink-3)", maxWidth: "64ch", margin: "8px 0 20px" }}>
          Read from the approved specification, not restated. The class is what the delivered drawing
          carries as its root; H01 has none because it is engine-driven. No component is activated on
          a journey in this PR.
        </p>

        <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 760, maxWidth: 900, fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--mute)" }}>
              <th style={{ padding: "6px 10px 6px 0", fontWeight: 600 }}>ID</th>
              <th style={{ padding: "6px 10px", fontWeight: 600 }}>Class</th>
              <th style={{ padding: "6px 10px", fontWeight: 600 }}>Meaning</th>
              <th style={{ padding: "6px 10px", fontWeight: 600 }}>Reduced motion</th>
            </tr>
          </thead>
          <tbody style={{ color: "var(--ink-2)" }}>
            {MOTION_COMPONENTS.map((c) => (
              <tr key={c.id} style={{ borderTop: "1px solid var(--rule)" }}>
                <td style={{ padding: "8px 10px 8px 0", fontWeight: 700, color: "var(--ink)" }}>{c.id}</td>
                <td style={{ padding: "8px 10px", fontFamily: "var(--f-mono)" }}>
                  {c.cssClass ?? "engine"}
                </td>
                <td style={{ padding: "8px 10px" }}>{c.meaning}</td>
                <td style={{ padding: "8px 10px", color: "var(--ink-3)" }}>{c.reducedMotion}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>
    </div>
  );
}
