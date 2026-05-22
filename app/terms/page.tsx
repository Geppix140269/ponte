import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Sale",
  description: "Terms of sale for Ponte Trade intelligence products.",
};

const LAST_UPDATED = "21 May 2026";

export default function TermsPage() {
  return (
    <section className="bg-white py-16 lg:py-20">
      <div className="container-px max-w-3xl">
        <h1 className="text-4xl font-extrabold">Terms of Sale</h1>
        <p className="mt-3 text-sm text-navy/55">Last updated: {LAST_UPDATED}</p>

        <div className="prose-legal mt-8">
          <p>
            These Terms of Sale govern your purchase of digital intelligence
            products from Ponte Trade. By placing an order you agree to these
            terms.
          </p>

          <h2>Products</h2>
          <p>
            We sell digital reports, data packs, and intelligence briefs as
            one-time purchases or subscriptions. Some products are configured by
            you (for example by HS code or country) before purchase; the
            configuration you provide determines the report you receive.
          </p>

          <h2>Delivery</h2>
          <ul>
            <li>Instant products are available to download immediately after payment.</li>
            <li>Reports marked 24h or 48h are delivered within that window after order confirmation, following manual QA.</li>
            <li>Custom research timelines are scoped with you after purchase.</li>
          </ul>

          <h2>Licence &amp; use</h2>
          <p>
            Reports are licensed to the named purchaser for internal business
            use and are delivered as watermarked PDFs. You may not resell,
            redistribute, or publish the reports without our written consent.
          </p>

          <h2>Refunds</h2>
          <p>
            Because our products are bespoke digital intelligence prepared for
            you, sales are generally final once a report has been delivered. If a
            report is materially defective or not delivered, contact us and we
            will correct or refund it.
          </p>

          <h2>Payment &amp; tax</h2>
          <p>
            Payments are processed securely by Stripe in EUR. Applicable VAT is
            calculated at checkout based on your billing country.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about an order? Email{" "}
            <a href="mailto:hello@ponte.trade">hello@ponte.trade</a>.
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
