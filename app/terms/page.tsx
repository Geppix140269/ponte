import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Sale",
  description: "Terms of sale for Ponte Trade intelligence products.",
};

const LAST_UPDATED = "26 May 2026";

export default function TermsPage() {
  return (
    <section className="container-px py-14 lg:py-20">
      <header className="max-w-3xl mb-10">
        <span className="pill">Legal</span>
        <h1
          className="serif text-white mt-6 mb-3"
          style={{
            fontSize: "clamp(36px, 5vw, 56px)",
            fontWeight: 400,
            lineHeight: 1.04,
            letterSpacing: "-0.01em",
          }}
        >
          Terms of Sale
        </h1>
        <p
          className="mono text-[11px] uppercase text-gray-2"
          style={{ letterSpacing: "0.18em" }}
        >
          Last updated · {LAST_UPDATED}
        </p>
      </header>

      <div className="glass p-8 md:p-12 max-w-3xl">
        <div className="prose-legal">
          <p>
            These Terms of Sale govern your purchase of digital intelligence
            products from Ponte Trade. By placing an order you agree to these
            terms.
          </p>

          <h2>Products</h2>
          <p>
            We sell digital reports, data packs, and intelligence briefs as
            one-time purchases or subscriptions. Some products are configured
            by you (for example by HS code or country) before purchase; the
            configuration you provide determines the report you receive.
          </p>

          <h2>Delivery and payment authorization</h2>
          <p>
            For instant downloads, payment is taken at checkout and the
            report is available immediately in your account.
          </p>
          <p>
            For reports requiring human production, your card is{" "}
            <strong>authorized but not charged</strong> at checkout. Within
            4 hours of order we will email you with the confirmed delivery
            date. Your card is only charged when we start production on the
            confirmed date.
          </p>
          <p>
            If we are unable to deliver by the confirmed date, the
            authorization is released and your card is never charged. The
            pending charge may remain visible on your bank statement for
            1-7 days depending on your bank.
          </p>
          <p>
            Custom research timelines are scoped with you after purchase.
          </p>

          <h2>Licence &amp; use</h2>
          <p>
            Reports are licensed to the named purchaser for internal business
            use and are delivered as watermarked PDFs. You may not resell,
            redistribute, or publish the reports without our written consent.
          </p>

          <h2>Refunds</h2>
          <p>
            Because our products are bespoke digital intelligence prepared for
            you, sales are generally final once a report has been delivered.
            If a report is materially defective or not delivered, contact us
            and we will correct or refund it.
          </p>

          <h2>Payment &amp; tax</h2>
          <p>
            Payments are processed securely by Stripe in USD. Applicable VAT
            is calculated at checkout based on your billing country.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about an order? Email{" "}
            <a href="mailto:hello@ponte.trade">hello@ponte.trade</a> and we
            will respond within one business day.
          </p>
        </div>
      </div>
    </section>
  );
}
