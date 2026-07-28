import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { landingFontVars } from "@/components/home/landing/fonts";
import IntakeStateGallery from "./IntakeStateGallery";
import { GALLERY } from "./states";
import "@/components/find/find.css";
import "@/components/structure/structure.css";
import "@/design/authority/bridge/v1/source/ponte-bridge.css";
import "@/components/ponte/bridge/bridge-integration.css";
import "@/components/ponte/state/state.css";
import "@/components/products/intake/intake.css";

/**
 * The product intake state gallery.
 *
 * Development only: it 404s in production, is not translated, not linked and
 * not indexed. It exists for the same reason the Ponte Flow specimen sheet
 * does, and it answers the same requirement.
 *
 * Constitution section 21 needs desktop and 390 x 844 evidence of the states a
 * change touches. Several states of this journey cannot be reached on demand in
 * a browser: a blocked format needs a legacy binary to hand, an extraction
 * failure needs the model to be unavailable, and a resumed session needs the
 * member to have left and returned. Rendering each from a real reducer value is
 * how the evidence becomes reproducible rather than a screenshot from somebody's
 * machine on a good day.
 *
 * Nothing here is mocked. Every session in `states.ts` is produced by driving
 * the same reducer the running journey uses, so a state that drifts out of the
 * product drifts out of the evidence with it.
 *
 * `?only=<id>` renders one state alone, which is what the Playwright evidence
 * run captures.
 */

export const metadata = {
  title: "Ponte product intake states",
  robots: { index: false, follow: false },
};

export default function ProductIntakeStatesPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams?: { only?: string };
}) {
  if (process.env.NODE_ENV === "production") notFound();
  setRequestLocale(params.locale);

  const only = searchParams?.only;
  const states = only ? GALLERY.filter((s) => s.id === only) : GALLERY;
  if (states.length === 0) notFound();

  return (
    <div className={landingFontVars}>
      <div className="ponte-find" style={{ minHeight: "100dvh" }}>
        <div className="fmain">
          <IntakeStateGallery
            states={states.map((s) => ({ id: s.id, title: s.title, note: s.note, session: s.session }))}
            bare={Boolean(only)}
          />
        </div>
      </div>
    </div>
  );
}
