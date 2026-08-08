/**
 * The standing footer, on every bridge surface.
 *
 * ## Why this is a component and not markup each surface repeats
 *
 * The operator statement and the legal routes are OBLIGATIONS, not decoration.
 * A surface that forgets the privacy link has not made a design choice, it has
 * created a compliance gap. Stated once, no surface can omit one by accident.
 *
 * ## What belongs here and what does not
 *
 * Every route named below exists and resolves. A footer that lists a page which
 * does not exist is worse than a footer with fewer links, because a dead legal
 * link reads as neglect precisely where a visitor is checking whether you are
 * a real company.
 *
 * The fee is NOT restated here. `/pricing` owns it, and a price in two places
 * is a price that will eventually disagree with itself.
 */

const COLUMNS: readonly {
  key: string;
  heading: string;
  links: readonly { label: string; href: string }[];
}[] = [
  {
    key: "market",
    heading: "The market",
    links: [
      { label: "Find an opportunity", href: "/find" },
      { label: "Publish an opportunity", href: "/publish" },
      { label: "Market Signals", href: "/market-signals" },
    ],
  },
  {
    key: "product",
    heading: "Deal Rooms",
    links: [
      { label: "What a Deal Room is", href: "/deal-rooms" },
      { label: "Verification", href: "/verification" },
      { label: "Fees", href: "/pricing" },
    ],
  },
  {
    key: "learn",
    heading: "Learn",
    links: [
      { label: "Duties and tariffs", href: "/learn/duties" },
      { label: "Reading trade data", href: "/learn/trade-data" },
    ],
  },
  {
    key: "ponte",
    heading: "Ponte",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="brg-foot">
      <div className="brg-mx">
        <div className="brg-foot__cols">
          {COLUMNS.map((column) => (
            <nav className="brg-foot__col" key={column.key} aria-label={column.heading}>
              <div className="brg-eyebrow">{column.heading}</div>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/*
          The operator statement. Two separate claims, and the second one is the
          one that matters: naming what Ponte checks without naming what it does
          not reads as a guarantee about a counterparty, and is not one.
        */}
        {/* "published as printed" is withdrawn here for the same reason it is
            withdrawn on the entrance: a Market Signal is a sourced, dated,
            unconfirmed indication, recorded in Ponte's own words, and claiming
            to reprint a source puts Ponte behind its wording as though it had
            adopted it. ADR-0041, amendment of 8 August 2026. */}
        <p className="brg-foot__op">
          Ponte Trade is operated by 1402 Celsius Ltd, registered in the United Kingdom. Market
          Signals are read from named public sources and dated. Ponte has not confirmed them with
          the party named in them.
        </p>
      </div>
    </footer>
  );
}
