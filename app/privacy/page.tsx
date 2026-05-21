import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Ponte Trade collects, uses, and protects your personal data under UK and EU GDPR.",
};

const LAST_UPDATED = "21 May 2026";

export default function PrivacyPage() {
  return (
    <section className="bg-white py-16 lg:py-20">
      <div className="container-px max-w-3xl">
        <h1 className="text-4xl font-extrabold">Privacy Policy</h1>
        <p className="mt-3 text-sm text-navy/55">Last updated: {LAST_UPDATED}</p>

        <div className="prose-legal mt-8">
          <p>
            This policy explains how Ponte Trade collects, uses, and protects
            personal data when you use pontetrade.com and purchase our products.
            We act as the data controller.
          </p>

          <h2>Data we collect</h2>
          <ul>
            <li><strong>Account &amp; orders:</strong> name, email, company, billing country, and order history.</li>
            <li><strong>Report configuration:</strong> the parameters you supply (HS code, country, product, brief).</li>
            <li><strong>Payments:</strong> handled by Stripe; we never see or store full card details.</li>
            <li><strong>Technical:</strong> limited data your browser sends, used to deliver and secure the site.</li>
          </ul>

          <h2>How we use it</h2>
          <ul>
            <li>To prepare and deliver the reports you purchase.</li>
            <li>To process payments and meet tax obligations.</li>
            <li>To send order, delivery, and (where you opt in) newsletter emails.</li>
            <li>To operate, secure, and improve the service.</li>
          </ul>

          <h2>Legal basis</h2>
          <p>
            We rely on performance of our contract with you (to deliver
            purchases), consent (for marketing), and our legitimate interests in
            running and securing the business.
          </p>

          <h2>Processors</h2>
          <p>
            We share data only with the providers that run the service —
            including Supabase (database, auth, storage), Stripe (payments), and
            Resend (email) — and where required by law.
          </p>

          <h2>Your rights</h2>
          <p>
            Under UK and EU GDPR you may access, correct, erase, restrict, or
            port your data, and object to processing. You can withdraw consent at
            any time and complain to a supervisory authority. To exercise a
            right, email <a href="mailto:hello@pontetrade.com">hello@pontetrade.com</a>.
          </p>

          <h2>Cookies</h2>
          <p>
            We use only the storage necessary to run the cart and your session.
            See our <Link href="/terms">Terms of Sale</Link> for purchase terms.
          </p>

          <p className="mt-10 rounded-md border-l-2 border-gold bg-mist p-4 text-xs">
            This page is general information, not legal advice. Have it reviewed
            by qualified counsel before relying on it.
          </p>
        </div>
      </div>
    </section>
  );
}
