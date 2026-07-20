import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Terms for Ponte's brokerage services, Deal Sheet membership and advisory engagements. Ponte is operated by 1402 Celsius Ltd (Bulgaria).",
};

const LAST_UPDATED = "20 July 2026";

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
          Terms
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
            Ponte is a trading name of 1402 Celsius Ltd, a company
            incorporated in Bulgaria with registered number 207314767 and
            registered office at 1A Aton Street, Building 6, Plovdiv 4002,
            Bulgaria (&ldquo;Ponte&rdquo;, &ldquo;we&rdquo;,
            &ldquo;us&rdquo;). 1402 Celsius Ltd (United Kingdom, Reg.
            12475013) is a group company and is not the contracting party
            under these terms. These terms govern your use of ponte.trade and
            the services offered on it. By using the site, submitting a deal,
            joining the Deal Sheet, or engaging us, you agree to them.
          </p>

          <h2>1. Brokerage services</h2>
          <p>
            We act as broker and intermediary only. We are never a party to,
            or principal in, any transaction between counterparties we
            introduce, and we make no warranty as to the performance,
            solvency or conduct of any counterparty. Introductions are made
            only after both sides have signed our non-circumvention and
            non-disclosure agreement and written fee terms, which then govern
            the introduction and prevail over these terms in case of
            conflict.
          </p>
          <p>
            Submitting an offer or requirement through the Deal Desk creates
            no obligation on either side. We circulate opportunities on an
            anonymized basis and do not disclose counterparty identities
            before the paperwork above is in place. Our brokerage
            remuneration is a success fee agreed in writing per transaction;
            no fee is payable for submitting or browsing opportunities.
          </p>

          <h2>2. The Deal Sheet</h2>
          <p>
            Deal Sheet membership is free, personal, and granted at our
            discretion after vetting. Items in the Deal Sheet are indicative,
            anonymized summaries provided by third parties; they are not
            offers capable of acceptance, and we do not guarantee their
            accuracy, availability or completion. Members may not forward,
            republish or scrape the Deal Sheet, or use it to circumvent us.
            Membership can be withdrawn at any time, and you can leave at any
            time by replying to any issue.
          </p>

          <h2>3. Advisory and intelligence engagements</h2>
          <p>
            We sell analyst engagements (calls, strategy intensives and
            retainers) priced by the engagement and scoped in writing.
            Nothing on this site is sold as a subscription. Written
            deliverables from an engagement are licensed to the named client
            for internal business use and may not be resold, redistributed
            or published without our written consent. Because engagements
            are bespoke, fees are final once the work is delivered; if a
            deliverable is materially defective or not delivered, contact us
            and we will correct or refund it.
          </p>

          <h2>4. No advice</h2>
          <p>
            Content on this site, in the Deal Sheet and in our reports is
            commercial information, not legal, tax, investment or other
            professional advice. You remain responsible for your own
            decisions and for compliance with laws applicable to you,
            including sanctions and export controls.
          </p>

          <h2>5. Payment and tax</h2>
          <p>
            Payments are processed securely by Stripe in USD. Applicable VAT
            is calculated at checkout based on your billing country.
          </p>

          <h2>6. Liability</h2>
          <p>
            Nothing in these terms excludes liability that cannot be excluded
            by law. Subject to that, our total liability arising out of the
            site, the Deal Sheet or any product is limited to the fees you
            paid us for the item giving rise to the claim, and we are not
            liable for indirect or consequential loss, loss of profit or loss
            of opportunity.
          </p>

          <h2>7. Contact</h2>
          <p>
            Questions? Email{" "}
            <a href="mailto:hello@ponte.trade">hello@ponte.trade</a> and we
            will respond within one business day.
          </p>
        </div>
      </div>
    </section>
  );
}
