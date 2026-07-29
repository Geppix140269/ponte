import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Action, Band, Banner, Empty, RoomHeader } from "@/components/deal-room/primitives";
import { dealRoomGate } from "@/lib/deal-room/queries";
import { createClient } from "@/lib/supabase/server";
import { assessCredibleInterest, type DealFacts } from "@/lib/deal-room/interest";
import { templateFor } from "@/lib/deal-room/procedure";
import { STARTER_LIMITS_PROPOSED } from "@/lib/deal-room/entitlement";
import { LAUNCH_OPERATING_MODES, OPERATING_MODE_LABEL } from "@/lib/deal-room/states";

export const dynamic = "force-dynamic";

/**
 * DR-01 and DR-02: the entry decision and the proposed master-room builder.
 *
 * One page, because at launch there is one entitlement path. Presenting a
 * three-tier pricing table with two tiers disabled would be a pricing screen
 * for prices that are not approved; the Starter room is described as what it is
 * - a real room, with limits - and the paid paths are named without being
 * offered.
 *
 * The eligibility rule is family-aware, which is the part that matters. A
 * services Deal is never told it is missing a quantity, and a distribution Deal
 * is never told it is missing an Incoterm. Every reason a Deal cannot proceed
 * is listed, in the member's words, with the remedy where one exists.
 */
export default async function ProposeRoomPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { deal?: string };
}) {
  setRequestLocale(params.locale);

  const gate = await dealRoomGate();
  if (!gate) notFound();

  const supabase = createClient();
  const { data: rows } = await supabase
    .from("listings")
    .select(
      "id, status, market_family, market_intent, product, user_id, valid_until, quantity, unit, incoterm, origin_country, destination_country, service_category_key, coverage_scope_key, distribution_partner_type_key, territory_codes, product_sector_key",
    )
    .eq("user_id", gate.profileId)
    .order("created_at", { ascending: false })
    .limit(25);

  const deals: DealFacts[] = ((rows ?? []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    status: row.status as string,
    marketFamily: (row.market_family as DealFacts["marketFamily"]) ?? null,
    marketIntent: (row.market_intent as string | null) ?? null,
    product: (row.product as string | null) ?? null,
    ownerProfileId: row.user_id as string,
    validUntil: (row.valid_until as string | null) ?? null,
    withdrawnAt: null,
    quantity: (row.quantity as number | null) ?? null,
    unit: (row.unit as string | null) ?? null,
    incoterm: (row.incoterm as string | null) ?? null,
    originCountry: (row.origin_country as string | null) ?? null,
    destinationCountry: (row.destination_country as string | null) ?? null,
    serviceCategoryKey: (row.service_category_key as string | null) ?? null,
    coverageScopeKey: (row.coverage_scope_key as string | null) ?? null,
    distributionPartnerTypeKey: (row.distribution_partner_type_key as string | null) ?? null,
    territoryCodes: (row.territory_codes as string[] | null) ?? null,
    productSectorKey: (row.product_sector_key as string | null) ?? null,
  }));

  const selected = searchParams.deal ? deals.find((deal) => deal.id === searchParams.deal) : undefined;

  // A counterparty is required before a room can be proposed. At this stage the
  // member has not named one, so the assessment is run with the Deal facts and
  // a placeholder interest to surface the Deal-side blockers early.
  const assessment = selected
    ? assessCredibleInterest(selected, {
        route: "accepted_introduction",
        interestedParty: "",
        role: "Counterparty",
        statedObjective: "To be recorded when the counterparty is named.",
        counterpartyProfileId: "pending",
      })
    : null;

  const dealBlockers = assessment?.blockers.filter((blocker) => !blocker.code.startsWith("no_counterparty")) ?? [];

  return (
    <>
      <RoomHeader
        reference="Deal Rooms"
        title="Take this Deal forward"
        dealLine="A Deal Room is a protected workspace for one defined Deal. The party you invite can join without buying anything."
      />

      <Band title="Choose the Deal">
        {deals.length === 0 ? (
          <Empty>
            You have no published Deal to take forward. A Deal Room begins from a Deal that is complete and published,
            because the room is built on a snapshot of it that later edits cannot rewrite.
          </Empty>
        ) : (
          <ul className="dr__list">
            {deals.map((deal) => {
              const check = assessCredibleInterest(deal, {
                route: "accepted_introduction",
                interestedParty: "",
                role: "Counterparty",
                statedObjective: "To be recorded when the counterparty is named.",
                counterpartyProfileId: "pending",
              });
              const eligible = check.blockers.filter((b) => !b.code.startsWith("no_counterparty")).length === 0;
              return (
                <li className="dr__item" key={deal.id}>
                  <div>
                    <p className="dr__item-title">
                      <a className="dr__link" href={`/${params.locale}/deal-rooms/propose?deal=${deal.id}`}>
                        {check.scope?.subject ?? deal.product ?? "Untitled Deal"}
                      </a>
                    </p>
                    <p className="dr__item-meta">
                      {deal.marketFamily ?? "No family recorded"} · {deal.marketIntent ?? "No intent recorded"}
                    </p>
                  </div>
                  <span className={eligible ? "dr__chip dr__chip--done" : "dr__chip dr__chip--declared"}>
                    {eligible ? "Ready" : "Incomplete"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Band>

      {selected && dealBlockers.length > 0 ? (
        <Banner tone="review" title="This Deal is not ready for a room yet">
          {dealBlockers.map((blocker) => `${blocker.message}${blocker.remedy ? ` ${blocker.remedy}` : ""}`).join(" ")}
        </Banner>
      ) : null}

      {selected && dealBlockers.length === 0 && assessment ? (
        <>
          <Band title="How this room will be entitled">
            <ul className="dr__list">
              <li className="dr__item">
                <div>
                  <p className="dr__item-title">Starter Deal Room</p>
                  <p className="dr__item-meta">
                    The real workflow: admission, an agreed procedure, evidence, clarifications, blockers and a durable
                    history. No card required.
                  </p>
                  <p className="dr__item-limit">
                    {STARTER_LIMITS_PROPOSED.activeDays} active days, beginning when the first invited principal is
                    admitted rather than when you create the room · {STARTER_LIMITS_PROPOSED.subRooms} private
                    workspaces · {STARTER_LIMITS_PROPOSED.externalOrganisations} external organisations. When the term
                    ends the room becomes read-only and nothing is deleted.
                  </p>
                </div>
                <span className="dr__chip dr__chip--done">Available</span>
              </li>
            </ul>
            <p className="dr__why">
              Portfolio subscriptions and Ponte Credits are the ongoing paid paths. Neither is available yet, and no
              price is being quoted here. The invited party never needs one to take part.
            </p>
          </Band>

          <Band title="The procedure this room would start from">
            <p className="dr__item-meta">{templateFor(assessment.scope!.family).summary}</p>
            <ul className="dr__list">
              {templateFor(assessment.scope!.family).steps.map((step) => (
                <li className="dr__item" key={step.key}>
                  <div>
                    <p className="dr__item-title">
                      {step.seq}. {step.title}
                    </p>
                    <p className="dr__item-meta">{step.completionCondition}</p>
                  </div>
                  <span className="dr__weight">Weight {step.weight}</span>
                </li>
              ))}
            </ul>
            <p className="dr__why">
              This is a proposal. It governs nothing until every required approver has approved it, and either side can
              amend it before then. No completion percentage exists until it is agreed.
            </p>
          </Band>

          <Band title="Room settings">
            <ul className="dr__list">
              <li className="dr__item">
                <div>
                  <p className="dr__item-title">Operating mode</p>
                  <p className="dr__item-meta">
                    {LAUNCH_OPERATING_MODES.map((mode) => OPERATING_MODE_LABEL[mode]).join(" or ")}
                  </p>
                  <p className="dr__item-limit">
                    Ponte-facilitated and Ponte-managed modes commit human Ponte work and are not offered here. Nothing
                    in this room implies Ponte staff involvement.
                  </p>
                </div>
              </li>
              <li className="dr__item">
                <div>
                  <p className="dr__item-title">First private workspace</p>
                  <p className="dr__item-meta">
                    One workspace is created for the counterparty you invite. It is a separate permission boundary: no
                    other participant can see it, or infer that it exists.
                  </p>
                </div>
              </li>
            </ul>
          </Band>

          <div className="dr__actions">
            <Action
              label="Create the proposed room"
              reason="Name the counterparty first. A room is proposed to somebody, and Ponte will not open one without an identified principal on the other side."
            />
          </div>
        </>
      ) : null}
    </>
  );
}
