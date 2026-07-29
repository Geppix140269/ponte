import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { landingFontVars } from "@/components/home/landing/fonts";
import { createClient } from "@/lib/supabase/server";
import { isMissingColumnError } from "@/lib/listings/classification";
import { presentRecord, type FactsRow } from "@/lib/listings/record-facts";
import { railFor } from "@/lib/desk/journey";
import { marketEntrances } from "@/lib/desk/entrances";
import DeskShell from "@/components/desk/DeskShell";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import "@/components/desk/desk.css";

/**
 * A member's own records: the private side of R-SUBMIT's Conclude station.
 *
 * This route exists because a Member Opportunity is a different product object
 * from a Market Signal, and a member who has submitted one had nowhere in the
 * Desk to see it. Its records were reachable only through the legacy
 * application, which is exactly the seam the Desk is replacing.
 *
 * It is owner-scoped and nothing else. The read is made with the member's OWN
 * session, so row-level security is the access control rather than a filter
 * written here: a member sees their records because RLS returns theirs, and
 * would see nothing if the policy said so. No admin client, no service role,
 * no cross-member read.
 *
 * Critically, this route publishes nothing. A record that does not pass the
 * publication contract is shown to its owner in its true state, with the exact
 * reason it is not public, and remains invisible to everyone else. The two
 * production records this was built for (PT-9001 and PT-9002) are approved and
 * current but not publishable, solely because the bound member-business
 * verification is still `review` rather than a passing status, and
 * `PASSING_VERIFICATION_STATUSES` admits only `auto_verified` and `verified`.
 *
 * Making them public would mean weakening that contract, which is not this
 * route's job and is not something a UI change should ever do. Showing the
 * owner the truth is.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your records",
  robots: { index: false },
};

/** The record states a member can be in, in the member's own words. */
const STATUS_COPY: Record<string, { label: string; slot: string; note: string }> = {
  draft: {
    label: "Saved privately",
    slot: "saved",
    note: "Stored to your account. Not visible to Ponte reviewers or any member.",
  },
  submitted: {
    label: "Submitted for review",
    slot: "submitted",
    note: "Received with a reference. No reviewer has opened it yet.",
  },
  approved: {
    label: "Reviewed",
    slot: "published",
    note: "Reviewed by Ponte. Whether it is publicly visible depends on the publication contract below.",
  },
  rejected: {
    label: "Returned for correction",
    slot: "returned",
    note: "A named item must be corrected. The record and its history are preserved.",
  },
  closed: { label: "Closed", slot: "complete", note: "No longer active." },
};

export default async function OpportunitiesPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  // The member's own records, read with their own session. RLS decides.
  //
  // The classification columns are selected because a member's own record must
  // read back to them in the vocabulary they built it in. Before this, every
  // record on this page printed "Quantity" and "Delivery", so a member who had
  // just completed the trade-service journey - which never asks for either -
  // was shown their own freight capability as two blank product fields.
  //
  // The family terms are appended optionally: `20260728d` is not applied, and
  // selecting a column that does not exist fails the whole read. A member must
  // not lose sight of their records to a pending migration.
  const BASE =
    "id, ref, type, product, status, hs_code, origin, destination, quantity, quantity_mode, " +
    "quantity_min, quantity_max, unit, frequency, incoterm, payment_terms, submitter_role, " +
    "validity_type, valid_until, created_at, market_family, market_intent, " +
    "service_category_key, service_subcategory_keys, distribution_partner_type_key, " +
    "distribution_relationship_terms, coverage_scope_key, territory_codes, product_sector_key, " +
    "custom_category_label";

  const readOwn = (columns: string) =>
    supabase
      .from("listings")
      .select(columns)
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

  let rows: Record<string, unknown>[] | null = null;
  if (user) {
    let { data, error } = await readOwn(`${BASE}, service_terms, distribution_terms`);
    if (error && isMissingColumnError(error)) ({ data, error } = await readOwn(BASE));
    rows = (data as Record<string, unknown>[] | null) ?? null;
  }

  // The bound member-business verification, which is what decides whether an
  // approved record may be published. Read for explanation, never to override.
  const { data: verification } = user
    ? await supabase
        .from("verifications")
        .select("id, purpose, status, subject_name, created_at")
        .eq("user_id", user.id)
        .eq("purpose", "member_business")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const records = rows ?? [];
  const passing = verification?.status === "verified" || verification?.status === "auto_verified";
  const rail = railFor("submit", 3, { terminal: true });

  return (
    <div className={`ponte-desk ${landingFontVars}`}>
      <DeskShell rail={rail} objective={null}>
        <section className="sec">
          <div className="sech">
            <div>
              <h2>
                <PonteIcon name="profile.drafts" size={18} label="Your records" />
                Your records
              </h2>
              <p className="d">
                Requirements, offers, service capabilities and distribution intentions you have
                submitted to Ponte. These are Member Opportunities: records you created, which is a
                different thing from a Market Signal that Ponte observed in a public source.
              </p>
            </div>
            <Link href="/structure">
              Start a new record<span aria-hidden="true"> &rarr;</span>
            </Link>
          </div>

          {!user ? (
            <div className="empty">
              <PonteIcon name="participation.registration" size={24} label="Sign in required" />
              <div>
                <b>Sign in to see your records</b>
                <p>
                  Records are stored against a person, so Ponte cannot show them without knowing
                  who is asking. Nothing here is public, and nothing is shown to another member.
                </p>
                <div className="empty__a">
                  <Link className="b" href="/login">
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          ) : records.length === 0 ? (
            <div className="empty">
              <PonteIcon name="profile.drafts" size={24} label="No records yet" />
              <div>
                <b>You have not created a record yet</b>
                <p>
                  Every family is open to you: a product requirement or offer, a trade service you
                  need or provide, or a distribution arrangement you are looking for or can cover.
                </p>
                <div className="empty__a">
                  {marketEntrances().flatMap((family) =>
                    family.create.slice(0, 1).map((entrance) => (
                      <Link key={entrance.intent} className="b b--2" href={entrance.href}>
                        {entrance.label}
                      </Link>
                    )),
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {records.map((row) => {
                const r = row as Record<string, string>;
                const copy = STATUS_COPY[r.status] ?? {
                  label: r.status,
                  slot: "complete",
                  note: "",
                };
                // The record in its own family's words. `kindLabel` states the
                // canonical intent ("Offer a trade service"), not the legacy
                // three-value `type`, which cannot express distribution at all
                // and cannot tell a service request from a service offer.
                const p = presentRecord(row as FactsRow);
                // The two facts that lead. Product records still lead with
                // quantity and Incoterm; a service leads with what it can
                // commit to and when, and a distribution opportunity with its
                // territory and timing. Only STATED facts appear here: this is
                // a summary card, and "Not stated" twice is not a summary.
                const lead = p.facts
                  .filter((f) => f.value !== null && f.key !== "product" && f.key !== "service")
                  .slice(0, 2);
                return (
                  <article className="rec rec--opp" key={r.id}>
                    <div className="rec__m">
                      <div className="rec__top">
                        <span className="cls cls--opp">{p.kindLabel}</span>
                        <span className="r">{r.ref}</span>
                        <span className={`slot slot--${copy.slot}`}>{copy.label}</span>
                      </div>
                      <h3>{p.subject ?? r.ref}</h3>
                      {p.headline ? (
                        <div className="rec__cor">
                          <PonteIcon name="primitive.span" size={18} />
                          <span>{p.headline.value}</span>
                        </div>
                      ) : null}
                      <p className="d" style={{ marginTop: 10 }}>
                        {copy.note}
                      </p>
                    </div>

                    {lead.length > 0 ? (
                      <dl className="rec__f">
                        {lead.map((f) => (
                          <div key={f.key}>
                            <dt>{f.label}</dt>
                            <dd>{f.value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </article>
                );
              })}

              {/* The publication contract, stated rather than worked around.
                  An approved record that is not public has one reason, and the
                  member is entitled to read it. */}
              {records.some((r) => (r as { status?: string }).status === "approved") && !passing ? (
                <div className="notice" style={{ marginTop: 12 }}>
                  <PonteIcon name="evidence.evreview" size={18} />
                  <div>
                    <b>Reviewed, and not yet publicly visible</b>
                    Publication needs a passing member-business verification bound to your
                    account. Yours is currently{" "}
                    <b style={{ display: "inline" }}>{verification?.status ?? "not started"}</b>, and
                    only a completed check publishes a record. Ponte does not publish a member
                    record on the strength of the record alone, and this page does not make an
                    exception.{" "}
                    <Link href="/verify">Continue the verification</Link>.
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>
      </DeskShell>
    </div>
  );
}
