import { Link } from "@/i18n/navigation";
import { landingFontVars } from "@/components/home/landing/fonts";
import PonteFooter from "@/components/PonteFooter";
import type { LegalDoc } from "@/lib/legal/content";
import "./legal.css";

/**
 * Renders a legal / informational document (About, Privacy, Terms) box-free in
 * the Brand v5 heritage-light style: Playfair headings, Inter body, generous
 * whitespace, a fine rule between sections, no cards. The shared public footer
 * sits at the foot. The only interactive elements are the nav and footer links.
 */
export default function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <div className={`ponte-legal ${landingFontVars}`}>
      <header className="lgl__top">
        <Link className="lgl__lockup" href="/">
          <span className="lgl__word">Ponte</span>
          <span className="lgl__tld">.trade</span>
        </Link>
      </header>

      <main className="lgl">
        <div className="lgl__head">
          <h1 className="lgl__title">{doc.title}</h1>
          {doc.updated ? <p className="lgl__updated">{doc.updated}</p> : null}
          {doc.lead ? <p className="lgl__lead">{doc.lead}</p> : null}
        </div>

        <div className="lgl__body">
          {doc.blocks.map((block, i) => {
            switch (block.t) {
              case "h2":
                return (
                  <h2 className="lgl__h" key={i}>
                    {block.text}
                  </h2>
                );
              case "p":
                return (
                  <p className="lgl__p" key={i}>
                    {block.text}
                  </p>
                );
              case "list":
                return (
                  <ul className="lgl__list" key={i}>
                    {block.items.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                );
              case "mail":
                return (
                  <p className="lgl__p" key={i}>
                    <a className="lgl__mail" href={`mailto:${block.email}`}>
                      {block.email}
                    </a>
                  </p>
                );
            }
          })}
        </div>
      </main>

      <PonteFooter />
    </div>
  );
}
