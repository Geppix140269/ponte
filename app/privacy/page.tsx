import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Ponte (1402 Celsius Ltd) collects, uses, and protects your personal data, and your rights under UK GDPR and EU GDPR.",
};

const LAST_UPDATED = "21 May 2026";

export default function PrivacyPage() {
  return (
    <>
      <PageHero label="Legal" title="Privacy Policy" />

      <section className="section bg-white">
        <div className="container-px max-w-3xl">
          <p className="text-sm text-gray">Last updated: {LAST_UPDATED}</p>

          <div className="legal-prose mt-10">
            <p>
              This Privacy Policy explains how Ponte, the trading name of 1402
              Celsius Ltd (&ldquo;Ponte&rdquo;, &ldquo;we&rdquo;,
              &ldquo;us&rdquo;), collects, uses, and protects personal data when
              you visit ponte.trade or contact us. We act as the data controller
              for the personal data described below.
            </p>

            <h2>Who we are</h2>
            <p>
              1402 Celsius Ltd operates from offices in the United Kingdom
              (20–22 Wenlock Road, London, N1 7GU; Reg. No: 12475013) and
              Bulgaria (1A Aton Street, Building 6, Plovdiv, 4002; Reg. No:
              207314767). For any privacy enquiry, contact{" "}
              <a href="mailto:info@ponte.trade">info@ponte.trade</a>.
            </p>

            <h2>Data we collect</h2>
            <ul>
              <li>
                <strong>Contact form:</strong> your name, email address,
                company, area of interest, and the contents of your message.
              </li>
              <li>
                <strong>Newsletter and interest sign-ups:</strong> your email
                address.
              </li>
              <li>
                <strong>Technical data:</strong> limited information your browser
                sends automatically (such as IP address and user agent) which
                our hosting provider may process to deliver and secure the site.
              </li>
            </ul>

            <h2>How we use your data</h2>
            <ul>
              <li>To respond to your enquiries and provide our services.</li>
              <li>
                To send you insights and updates where you have asked to receive
                them.
              </li>
              <li>To operate, secure, and improve our website.</li>
            </ul>

            <h2>Legal basis</h2>
            <p>
              We rely on your <strong>consent</strong> for marketing
              communications, on the necessity to take steps at your request
              prior to entering a contract for enquiry handling, and on our{" "}
              <strong>legitimate interests</strong> in running and securing our
              business and website.
            </p>

            <h2>Sharing your data</h2>
            <p>
              We do not sell your personal data. We share it only with service
              providers who help us operate the site and communicate with you
              (for example our hosting and form-handling provider), and where
              required by law.
            </p>

            <h2>International transfers</h2>
            <p>
              Where data is transferred outside the UK or EEA, we rely on
              appropriate safeguards such as adequacy decisions or standard
              contractual clauses.
            </p>

            <h2>Retention</h2>
            <p>
              We keep personal data only as long as necessary for the purposes
              above, after which it is securely deleted or anonymised.
            </p>

            <h2>Your rights</h2>
            <p>
              Under UK GDPR and EU GDPR you have the right to access, rectify,
              erase, restrict, or object to the processing of your personal
              data, and to data portability. You may withdraw consent at any
              time and lodge a complaint with a supervisory authority (the UK ICO
              or the Bulgarian CPDP). To exercise any right, email{" "}
              <a href="mailto:info@ponte.trade">info@ponte.trade</a>.
            </p>

            <h2>Cookies</h2>
            <p>
              For details on how we use cookies and similar technologies, see our{" "}
              <Link href="/cookies">Cookie Policy</Link>.
            </p>

            <h2>Changes</h2>
            <p>
              We may update this policy from time to time. The latest version
              will always be available on this page.
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
