import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import { prohibitedUseFor } from "@/design-system/ponte-flow/components/PonteIcon";
import { ponteIcons } from "@/design-system/ponte-flow/registry/ponte-flow-registry";
import type {
  FlowIconKey,
  FlowLabelledKey,
} from "@/design-system/ponte-flow/generated/flow-icon-keys";
import { FLOW_LABELLED_KEYS } from "@/design-system/ponte-flow/generated/flow-icon-keys";
import { landingFontVars } from "@/components/home/landing/fonts";
import "@/components/find/find.css";
import "./flow.css";

/**
 * Ponte Flow specimen sheet.
 *
 * Development only: it 404s in production, is not translated, not linked and
 * not indexed. It exists so the delivered system can be checked against the
 * handoff by eye and photographed for a review, which is otherwise impossible
 * for the reduced drawings (they only appear below 21px) and for the
 * reduced-motion path (which by definition shows nothing moving).
 *
 * It renders from the registry, so a new asset appears here automatically and
 * a removed one disappears. Nothing on this page is hand-listed.
 */

export const metadata = {
  title: "Ponte Flow specimen",
  robots: { index: false, follow: false },
};

const DECORATIVE = (key: string): key is Exclude<FlowIconKey, FlowLabelledKey> =>
  !(FLOW_LABELLED_KEYS as readonly string[]).includes(key);

/** The sizes the sizing document names, plus the two the brief asks to see. */
const SIZES = [16, 20, 24, 32, 40, 48] as const;

export default function FlowSpecimenPage({ params }: { params: { locale: string } }) {
  if (process.env.NODE_ENV === "production") notFound();
  setRequestLocale(params.locale);

  const withReduced = ponteIcons.filter((i) => i.reducedAsset);
  const byLibrary = (library: string) => ponteIcons.filter((i) => i.library === library);

  return (
    <div className={`ponte-find ${landingFontVars} fspec`}>
      <main>
        <header className="fspec__head">
          <h1 className="fspec__h">Ponte Flow specimen</h1>
          <p className="fspec__p">
            {ponteIcons.length} registered keys · {withReduced.length} with an authored reduced
            drawing · rendered through PonteIcon from the delivered registry.
          </p>
        </header>

        {/* Reduced threshold: the same key at both sides of 21px. */}
        <section className="fspec__sec">
          <h2 className="fspec__h2">Reduced drawings at 16px and 20px</h2>
          <p className="fspec__p">
            Below 21px the authored reduced asset is used instead of a shrunken standard one.
            Left to right: 16, 20, then 24 for comparison. Stroke is optical, so it thickens
            with size rather than scaling with it.
          </p>
          <div className="fspec__grid">
            {withReduced.slice(0, 18).map((icon) =>
              DECORATIVE(icon.key) ? (
                <div key={icon.key} className="fspec__cell">
                  <div className="fspec__row">
                    <PonteIcon name={icon.key} size={16} />
                    <PonteIcon name={icon.key} size={20} />
                    <PonteIcon name={icon.key} size={24} />
                  </div>
                  <code className="fspec__k">{icon.key}</code>
                </div>
              ) : null,
            )}
          </div>
        </section>

        {/* Every size in the table, one key. */}
        <section className="fspec__sec">
          <h2 className="fspec__h2">Optical stroke across the size table</h2>
          <div className="fspec__row fspec__row--baseline">
            {SIZES.map((size) => (
              <div key={size} className="fspec__size">
                <PonteIcon name="deal.origin" size={size} />
                <code className="fspec__k">{size}</code>
              </div>
            ))}
          </div>
        </section>

        {/* Focus: the ring is on the interactive host, never on the SVG. */}
        <section className="fspec__sec">
          <h2 className="fspec__h2">Keyboard focus</h2>
          <p className="fspec__p">
            Tab to these. The ring sits on the button, never on the icon, and is never removed.
            An icon-only control carries its own label and a 44 by 44 hit target.
          </p>
          <div className="fspec__row">
            <button type="button" className="fbtn">
              <PonteIcon name="deal.preview" size={20} /> With a visible label
            </button>
            <button type="button" className="fspec__iconbtn" aria-label="Save privately">
              <PonteIcon name="deal.save" size={20} label="Save privately" />
            </button>
            <a className="fbtn fbtn--secondary" href="#top">
              A focusable link
            </a>
          </div>
        </section>

        {/* The states that must never become a verification badge. */}
        <section className="fspec__sec">
          <h2 className="fspec__h2">Participation and evidence states</h2>
          <p className="fspec__p">
            Each is a separate state with its own asset and its own sentence. None of them may be
            combined into a single &quot;verified&quot; mark: no such state exists in the product.
          </p>
          <ul className="fspec__states">
            {byLibrary("F")
              .filter((i) => i.key.startsWith("participation.") || i.key.startsWith("evidence."))
              .map((icon) => (
                <li key={icon.key} className="fspec__state">
                  {DECORATIVE(icon.key) ? (
                    <PonteIcon name={icon.key} size={24} />
                  ) : (
                    // The registry types its keys as plain strings, so the
                    // narrowing above proves "decorative" but not "labelled".
                    <PonteIcon name={icon.key as FlowLabelledKey} size={24} label={icon.meaning} />
                  )}
                  <div>
                    <code className="fspec__k">{icon.key}</code>
                    <p className="fspec__p">{icon.meaning}</p>
                    {prohibitedUseFor(icon.key as FlowIconKey) && (
                      <p className="fspec__prohibited">
                        Prohibited: {prohibitedUseFor(icon.key as FlowIconKey)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </section>

        {/* Motion, and its removal. */}
        <section className="fspec__sec">
          <h2 className="fspec__h2">Motion and reduced motion</h2>
          <p className="fspec__p">
            Every Flow component is authored in its end state, so reduced motion is a removal, not
            a redraw: the value, the numeral and the sentence stay. This page ships the delivered
            motion CSS and the reduced-motion contract; it starts no animation, because nothing
            here is a process that is actually running.
          </p>
          <p className="fspec__p">
            To see the reduced path, set the OS &quot;reduce motion&quot; preference or add
            <code className="fspec__k"> data-reduced-motion=&quot;1&quot; </code> to any ancestor.
            Both must produce identical output.
          </p>
        </section>
      </main>
    </div>
  );
}
