import { Link } from "@/i18n/navigation";

/**
 * The Ponte brand lockup: the one place the mark is drawn.
 *
 * ## Why this is an authored SVG and not a Ponte Flow icon
 *
 * Constitution section 7 prohibits ad hoc SVG interface icons. The Phase 1
 * audit recorded the lockup as gap G6d because it did not fit that rule
 * cleanly, and the owner has since ruled on it:
 *
 * > The approved Ponte brand lockup is an identity asset, not an interface
 * > icon. It may remain an authored SVG, but it must be rendered through one
 * > shared brand component; it must not be duplicated locally; it must not be
 * > redrawn. Constitution icon restrictions still apply to interface icons.
 *
 * The distinction is the whole of the exception, so it is worth stating
 * precisely: an interface icon names an action or a state, and there are 89
 * approved ones for that. A lockup names the company. It is not a member of the
 * registry's semantic vocabulary and it never will be, because "Ponte" is not a
 * state a record can be in. The exception is therefore narrow by construction -
 * it covers one drawing, and it does not extend to anything this component's
 * consumers might want an icon for.
 *
 * ## What this component's existence enforces
 *
 * The geometry below is transcribed unchanged from the inline SVG that
 * previously lived in `DeskShell`. Nothing was reproportioned, re-pathed or
 * "tidied": a redraw is exactly what the ruling forbids, and a lockup that
 * drifts by a few units per copy is how a brand stops being one.
 *
 * Because it is defined once, the arch cannot fork. `flow-integration.test.ts`
 * asserts that no other file under `app/` or `components/` contains the arch
 * path, so a second copy fails a check rather than passing a review.
 *
 * ## Styling
 *
 * The class names are supplied by `.ponte-desk` in `components/desk/desk.css`,
 * which is the only scope that currently renders this component. That is a real
 * constraint and not an oversight: a consumer outside the Desk would render an
 * unstyled lockup today. Lifting the five `.cmd__*` rules out of the Desk scope
 * belongs to the first journey slice that needs the lockup elsewhere, doing it
 * here, with no consumer to verify against, would be a styling change made
 * blind.
 *
 * The mark takes its colour from the chip around it (`currentColor` on the arch
 * and the deck line); only the keystone dot is painted, in gold. That is the
 * brand signal, and Constitution section 6 keeps it a signal: it is not
 * verification, approval, review or success, and nothing about this component
 * lets it become one.
 */

/**
 * The scope a lockup is rendered into.
 *
 * The mark was found in four places, `DeskShell`, `FindChrome`, `PonteShell`
 * and `PonteLanding`, drawn identically but dressed by three different
 * stylesheets under three different class vocabularies. This prop is what lets
 * one component serve all four without restyling any of them: the drawing is
 * shared, the class names each scope's CSS already targets are preserved.
 *
 * Two differences between the copies are carried here rather than resolved,
 * because resolving them would be a redraw and a visual change:
 *
 *   - the three legacy copies set `strokeLinecap="square"`; the Desk copy does
 *     not, so its arch ends are butt-capped;
 *   - the landing wordmark carries no `serif` class, where Desk and Find do.
 *
 * Neither is a difference anyone chose, they are drift between copies, which is
 * the argument for this component existing. Which variant is canonical is a
 * question for the owner, recorded as gap DS-2. Until it is answered, every
 * surface renders exactly what it rendered before.
 */
export type PonteLockupScope = "desk" | "find" | "landing";

interface ScopeSpec {
  root: string;
  chip: string;
  dot: string;
  word: string;
  tld: string;
  /** Sizing: some scopes size the SVG by attribute, others by CSS or a class. */
  markClass?: string;
  sizedAttribute?: boolean;
  squareCaps: boolean;
  serifWord: boolean;
}

const SCOPES: Record<PonteLockupScope, ScopeSpec> = {
  // .ponte-desk, components/desk/desk.css, sizes the mark via `.cmd__chip svg`.
  desk: {
    root: "cmd__lockup",
    chip: "cmd__chip",
    dot: "cmd__dot",
    word: "cmd__word",
    tld: "cmd__tld",
    squareCaps: false,
    serifWord: true,
  },
  // .ponte-find, components/find/find.css, sizes the mark by attribute.
  find: {
    root: "flockup",
    chip: "flockup__chip",
    dot: "flockup__dot",
    word: "flockup__word",
    tld: "flockup__tld",
    sizedAttribute: true,
    squareCaps: true,
    serifWord: true,
  },
  // .ponte-landing, components/home/landing/landing.css, sizes via a class.
  landing: {
    root: "lockup",
    chip: "lockup__chip",
    dot: "lockup__dot",
    word: "lockup__word",
    tld: "lockup__tld",
    markClass: "lockup__mark",
    squareCaps: true,
    serifWord: false,
  },
};

export interface PonteLockupProps {
  /** Which stylesheet dresses this instance. Defaults to the Desk, the target system. */
  scope?: PonteLockupScope;
  /** Where the lockup navigates. The product home unless a surface says otherwise. */
  href?: string;
  /**
   * The accessible name of the link. The mark itself is `aria-hidden`, so this
   * is the only thing a screen reader announces for it.
   */
  label?: string;
}

export default function PonteLockup({
  scope = "desk",
  href = "/",
  label = "Ponte Trade, home",
}: PonteLockupProps) {
  const s = SCOPES[scope];

  return (
    <Link className={s.root} href={href} aria-label={label}>
      <span className={s.chip}>
        {/* Identity asset, not an interface icon, see the note above. The only
            authored SVG permitted outside the Ponte Flow registry, and the only
            copy of this geometry in the product: check-governance.mjs fails if a
            second file contains the arch path. */}
        <svg
          className={s.markClass}
          width={s.sizedAttribute ? 20 : undefined}
          height={s.sizedAttribute ? 20 : undefined}
          viewBox="0 0 120 120"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M22 98 L22 60 C22 35 98 35 98 60 L98 98"
            fill="none"
            stroke="currentColor"
            strokeWidth="11"
            strokeLinejoin="miter"
            strokeLinecap={s.squareCaps ? "square" : undefined}
          />
          <line x1="12" y1="98" x2="108" y2="98" stroke="currentColor" strokeWidth="5" />
          <circle className={s.dot} cx="60" cy="41" r="10" />
        </svg>
      </span>
      <span className={s.serifWord ? `${s.word} serif` : s.word}>Ponte</span>
      <span className={s.tld}>.trade</span>
    </Link>
  );
}
