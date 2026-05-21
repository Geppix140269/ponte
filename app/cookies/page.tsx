import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "How Ponte uses cookies and similar technologies on ponte.trade, and how you can manage your preferences.",
};

const LAST_UPDATED = "21 May 2026";

export default function CookiesPage() {
  return (
    <>
      <PageHero label="Legal" title="Cookie Policy" />

      <section className="section bg-white">
        <div className="container-px max-w-3xl">
          <p className="text-sm text-gray">Last updated: {LAST_UPDATED}</p>

          <div className="legal-prose mt-10">
            <p>
              This Cookie Policy explains how Ponte (1402 Celsius Ltd) uses
              cookies and similar technologies on ponte.trade. It should be read
              alongside our <Link href="/privacy">Privacy Policy</Link>.
            </p>

            <h2>What cookies are</h2>
            <p>
              Cookies are small text files stored on your device when you visit a
              website. They are widely used to make sites work, and to provide
              information to site owners.
            </p>

            <h2>How we use cookies</h2>
            <p>
              We keep our use of cookies to a minimum. We currently use:
            </p>
            <ul>
              <li>
                <strong>Strictly necessary storage:</strong> a single entry in
                your browser&apos;s local storage that remembers your cookie
                preference so we don&apos;t ask again on every visit. This is
                essential and is not used for tracking.
              </li>
            </ul>
            <p>
              We do <strong>not</strong> currently use advertising or
              cross-site tracking cookies. Should we introduce analytics or other
              non-essential cookies in future, they will only be set after you
              give consent through our cookie banner.
            </p>

            <h2>Managing cookies</h2>
            <p>
              You can accept or decline non-essential cookies via the banner
              shown on your first visit. You can also control or delete cookies
              and local storage through your browser settings at any time.
              Blocking strictly necessary storage may affect how the site
              remembers your preferences.
            </p>

            <h2>Contact</h2>
            <p>
              Questions about this policy? Email{" "}
              <a href="mailto:info@ponte.trade">info@ponte.trade</a>.
            </p>

            <p className="legal-note">
              This page is provided as general information and is not legal
              advice. We recommend having it reviewed by qualified counsel before
              relying on it.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
