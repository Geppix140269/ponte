import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { OPERATOR_LINE, CONTACT } from "@/lib/legal/content";
import "./pfooter.css";

/**
 * The public footer for the Brand v5 journeys (home, Find, Verify, and the
 * legal pages). Box-free by rule: a single hairline top rule, cream ground,
 * ink text, no card and no rounded corners. It is deliberately NOT mounted
 * inside the Structure composer flow or the account gate, where it would
 * distract from a single action.
 */
export default async function PonteFooter() {
  const t = await getTranslations("siteFooter");

  return (
    <footer className="pfooter">
      <div className="pfooter__inner">
        <p className="pfooter__who">{t("whoWeAre")}</p>
        <nav className="pfooter__links" aria-label={t("navLabel")}>
          <Link href="/about">{t("about")}</Link>
          <span aria-hidden="true">·</span>
          <Link href="/privacy">{t("privacy")}</Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms">{t("terms")}</Link>
          <span aria-hidden="true">·</span>
          <a href={`mailto:${CONTACT.general}`}>{t("contact")}</a>
        </nav>
        <p className="pfooter__legal">{OPERATOR_LINE}</p>
      </div>
    </footer>
  );
}
