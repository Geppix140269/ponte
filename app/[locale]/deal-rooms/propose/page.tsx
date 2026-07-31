import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  Band,
  Banner,
  CommandError,
  CommandForm,
  Empty,
  Field,
  RoomHeader,
  SelectField,
  Submit,
  TextField,
} from "@/components/deal-room/primitives";
import { dealRoomGate, initiatorAdmissibility } from "@/lib/deal-room/queries";
import { createClient } from "@/lib/supabase/server";
import {
  assessCredibleInterest,
  INTEREST_ROUTES,
  INTEREST_ROUTE_LABEL,
  type DealFacts,
} from "@/lib/deal-room/interest";
import { templateFor } from "@/lib/deal-room/procedure";
import { STARTER_LIMITS_PROPOSED } from "@/lib/deal-room/entitlement";
import { LAUNCH_OPERATING_MODES, OPERATING_MODE_LABEL } from "@/lib/deal-room/states";
import UnsavedFormGuard from "@/components/ponte/nav/UnsavedFormGuard";
import { declareOpenerCapacity, declareOpeningIntent, proposeRoom } from "../actions";

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
  searchParams: { deal?: string; error?: string };
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

  /*
   * ADR-0021 ruling 2, on the surface as well as in the command.
   *
   * The member who opens a room is held to the same Deal Room-ready minimum as
   * the member they invite. If they do not meet it the control is not rendered
   * at all: North Star section 10 forbids a dead button, and section 3.5 forbids
   * an interface promising what it cannot deliver. What replaces it names the
   * evidence that is missing and links to where it is supplied, which is free.
   *
   * Nothing here counts, scores or measures. Product contract section 6: the
   * model stays evidence-specific rather than numerical.
   */
  const admissibility = selected ? await initiatorAdmissibility(selected.id, params.locale) : null;
  const admissible = admissibility?.admissible ?? false;

  // What the member already declared, so the form below is a correction rather
  // than a blank slate they have to fill in from memory every time.
  const { data: me } = selected
    ? await supabase.from("profiles").select("company, country, declared_capacity, legal_or_trading_name").maybeSingle()
    : { data: null };
  const mine = (me ?? {}) as {
    company?: string | null;
    country?: string | null;
    declared_capacity?: string | null;
    legal_or_trading_name?: string | null;
  };

  // And what they declared about THIS Deal. Own-row policy only, so a
  // declaration that is not theirs returns nothing and the form starts empty.
  const { data: intentRow } = selected
    ? await supabase
        .from("deal_room_opener_declarations")
        .select("business_relationship, transaction_role, participation_authority")
        .eq("listing_id", selected.id)
        .maybeSingle()
    : { data: null };
  const intent = (intentRow ?? {}) as {
    business_relationship?: string | null;
    transaction_role?: string | null;
    participation_authority?: string | null;
  };

  return (
    <UnsavedFormGuard>
      <CommandError message={searchParams.error} />
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

          <Band title="Name the counterparty and open the room">
            <p className="dr__item-meta">
              A room is proposed to somebody. Ponte will not open one without an identified principal on the other
              side, a stated role and a stated objective: curiosity is not credible commercial interest.
            </p>

            {admissibility && !admissible ? (
              <>
                {/*
                  One line per missing criterion, each linking to the place that
                  exact fact is supplied. The single "Supply it now" link that
                  used to sit here pointed everything at the business
                  verification form, which cannot record a transaction role or a
                  submitter relationship - so most of the time it was a dead end
                  wearing the clothes of a next step.
                */}
                <Banner tone="review" title="Before you can open a Deal Room">
                  {admissibility.summary} {admissibility.limitation}
                </Banner>
                <ul className="dr__list">
                  {admissibility.pending.map((item) => (
                    <li key={item.criterion} className="dr__check">
                      <p className="dr__item-title">{item.label}</p>
                      <p className="dr__check-why">{item.remedy!.statement}</p>
                      <a className="dr__link" href={item.remedy!.href}>
                        Supply this
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {/*
              The opener's own declaration, on the page where they are asked for
              it. Section 6's "identified business OR declared professional
              capacity" only became real at this door when there was somewhere
              for an independent professional to put the capacity: before
              20260731g this page could read `profiles.company` and nothing
              else, so a broker with no company was permanently refused.

              It is rendered whether or not the member is admissible, because a
              declaration is also a thing somebody may want to correct.
            */}
            <div id="opener-about">
              <p className="dr__item-meta">
                Who you act for, under what name, and where you are established. Ponte records these declarations and
                does not check them. If you act for a company, its name is enough; if you act in your own professional
                capacity, state that capacity and the name you trade under. These are true of you in every Deal, so
                they are kept on your account.
              </p>
              <CommandForm
                action={declareOpenerCapacity}
                hidden={{
                  locale: params.locale,
                  returnTo: `/${params.locale}/deal-rooms/propose?deal=${selected.id}`,
                }}
              >
                <Field
                  label="The professional capacity you act in"
                  name="declaredCapacity"
                  defaultValue={mine.declared_capacity ?? undefined}
                  help="For example: independent broker, freight forwarder, legal adviser. Leave blank if you act for a company named on your account."
                />
                <Field
                  label="Legal or trading name you act under"
                  name="legalName"
                  defaultValue={mine.legal_or_trading_name ?? undefined}
                  help="The name itself, not the capacity. Leave blank to use the company on your account."
                />
                <Field
                  label="Jurisdiction you are established in"
                  name="jurisdiction"
                  defaultValue={mine.country ?? undefined}
                />
                <Submit label="Record this declaration" />
              </CommandForm>
            </div>

            {/*
              The three facts that are about THIS Deal rather than about the
              member, and the reason they are a separate form.

              Until 31 July 2026 the opener declared none of them. Owning an
              approved Deal produced a relationship read from the Deal's
              submitter role and two literals - "Deal owner" and "Owner of the
              published Deal" - and the gate counted all three as satisfied. The
              controller struck it: owning a Ponte listing is not a declaration
              of authority to act for the business behind it, and a string the
              system wrote is not something the member said. An invitee types
              all three; the opener now does too.
            */}
            <div id="opener-intent">
              <p className="dr__item-meta">
                How you stand to the business you represent in this Deal, your role in it, and what authorises you to
                act in that role. These are about this transaction, not about you in general, so they are recorded
                against this Deal. Ponte records the declaration and does not check it.
              </p>
              <CommandForm
                action={declareOpeningIntent}
                hidden={{
                  locale: params.locale,
                  listingId: selected.id,
                  returnTo: `/${params.locale}/deal-rooms/propose?deal=${selected.id}`,
                }}
              >
                <TextField
                  label="How you stand to the business you represent"
                  name="businessRelationship"
                  required
                  defaultValue={intent.business_relationship ?? undefined}
                  help="An office you hold, a mandate you were given, or an engagement you were retained under. This is not your role in the transaction and not your authority to commit."
                />
                <Field
                  label="Your role in this transaction"
                  name="transactionRole"
                  required
                  defaultValue={intent.transaction_role ?? undefined}
                  help="For example: seller, buyer, seller's agent. Responsibilities in the procedure are assigned by role."
                />
                <TextField
                  label="Your authority to act in that role"
                  name="participationAuthority"
                  required
                  defaultValue={intent.participation_authority ?? undefined}
                  help="State what authorises you: an office you hold, a mandate, an engagement. Declaring authority is not the same as it having been sighted."
                />
                <Submit label="Record this declaration" />
              </CommandForm>
            </div>

            {admissible ? (
            <CommandForm
              action={proposeRoom}
              hidden={{
                locale: params.locale,
                listingId: selected.id,
                returnTo: `/${params.locale}/deal-rooms/propose?deal=${selected.id}`,
              }}
            >
              {/*
                The intended principal is persisted on the room, and the later
                invitation is addressed from that record rather than from a
                form field, so the person invited is necessarily the person
                credible interest was recorded for. Either an existing member,
                or a named external principal.
              */}
              <Field
                label="Counterparty member id"
                name="counterpartyProfileId"
                help="If they are already a Ponte member. Their existence is checked, and the invitation goes to their registered address - it cannot be redirected afterwards."
              />
              <Field
                label="Or, their email"
                name="counterpartyEmail"
                type="email"
                help="If they are not a member yet. Give this and their name instead of a member id."
              />
              <Field
                label="And their name"
                name="counterpartyName"
                help="Who the external principal is. Recorded on the room as the party this Deal is being taken forward with."
              />
              <Field
                label="Their role in this transaction"
                name="counterpartyRole"
                required
                defaultValue="Buyer"
                help="Responsibilities in the procedure are assigned by role."
              />
              <TextField
                label="What they want, in their words"
                name="objective"
                required
                help="The substance of the interest they expressed. This is recorded as the credible-interest event and stays in the room history."
              />
              <SelectField
                label="How this interest arose"
                name="interestRoute"
                defaultValue="accepted_introduction"
                options={INTEREST_ROUTES.map((route) => ({ value: route, label: INTEREST_ROUTE_LABEL[route] }))}
              />
              <SelectField
                label="Operating mode"
                name="operatingMode"
                defaultValue="software_only"
                options={LAUNCH_OPERATING_MODES.map((mode) => ({ value: mode, label: OPERATING_MODE_LABEL[mode] }))}
                help="Ponte-facilitated and Ponte-managed modes commit human Ponte work and are not offered in this release."
              />
              <Field
                label="Purpose of the first private workspace"
                name="subRoomPurpose"
                required
                defaultValue={`Negotiation: ${assessment.scope!.subject}`}
                help="A separate permission boundary for this counterparty. No other participant can see it, or infer that it exists."
              />
              <Submit label="Create the proposed room" />
            </CommandForm>
            ) : null}

            <p className="dr__why">
              Creating the room reserves your Starter entitlement. The 30-day term does not begin until the invited
              principal is admitted, so an invitation nobody answers does not spend it.
            </p>
          </Band>
        </>
      ) : null}
    </UnsavedFormGuard>
  );
}
