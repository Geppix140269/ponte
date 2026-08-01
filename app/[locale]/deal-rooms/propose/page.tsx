import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import NotOpenYet from "@/components/deal-room/NotOpenYet";
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
import { dealRoomGate } from "@/lib/deal-room/queries";
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
import { MARKET_FAMILIES, MARKET_INTENTS } from "@/lib/taxonomy/market";
import UnsavedFormGuard from "@/components/ponte/nav/UnsavedFormGuard";
import { proposeRoom } from "../actions";
import { withdrawListingAction } from "../../_actions/listings";

export const dynamic = "force-dynamic";

/**
 * A Deal described in the taxonomy's words, never in the database's.
 *
 * This line printed the stored keys: "services offer_trade_service", and for a
 * row created before the family columns existed, "No family recorded No intent
 * recorded". Both are the schema talking to a member in its own vocabulary,
 * which is the same leak `publicRef` was written to close for imported
 * references.
 *
 * A row that genuinely records neither says so once, plainly, rather than
 * twice in the negative. It is not an error and it is not the member's fault:
 * those rows predate the columns.
 */
function describeDeal(deal: DealFacts): string {
  const family = MARKET_FAMILIES.find((f) => f.key === deal.marketFamily)?.label ?? null;
  const intent = MARKET_INTENTS.find((i) => i.key === deal.marketIntent)?.label ?? null;
  if (family && intent) return `${family} · ${intent}`;
  return family ?? intent ?? "Created before markets were recorded";
}

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
  searchParams: { deal?: string; error?: string; remove?: string };
}) {
  setRequestLocale(params.locale);

  /*
   * A signed-out visitor is NOT sent to sign in.
   *
   * This page redirected to /login this morning, which was an improvement on
   * the 404 it replaced and still the wrong answer. The owner named the rule:
   *
   *   > Don't use frustration to create an offer or to see how it works. That
   *   > creates friction. They have to click, they have to play ... It's the
   *   > moment they make a public offer, or they want to open a Deal Room,
   *   > that triggers the next phase.
   *
   * It is not a new rule. `components/AccountGate.tsx` has stated it since C7:
   * "the gate fires at the moment of irreversible action and nowhere else."
   * The redirect added here was a regression against an accepted design.
   *
   * So a visitor with no session reads this page. They have no Deals, so the
   * list is empty and the route into the composer above it is what they take.
   * Opening a room is a privileged write and is refused in `proposeRoom`,
   * which asks `dealRoomGate()` for itself: the boundary is on the action, not
   * on the reading of the page.
   */
  const gate = await dealRoomGate();

  const supabase = createClient();
  const { data: rows } = await supabase
    .from("listings")
    .select(
      "id, status, market_family, market_intent, product, user_id, valid_until, quantity, unit, incoterm, origin_country, destination_country, service_category_key, coverage_scope_key, distribution_partner_type_key, territory_codes, product_sector_key",
    )
    .eq("user_id", gate?.profileId ?? "00000000-0000-0000-0000-000000000000")
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
    <UnsavedFormGuard>
      <CommandError message={searchParams.error} />
      <RoomHeader
        reference="Deal Rooms"
        title="Take this Deal forward"
        dealLine="A Deal Room is a protected workspace for one defined Deal. The party you invite can join without buying anything."
      />

      {/*
        A room does not have to be built on something already here.

        The owner asked, looking at three old records: "What if I want to open
        a new deal room and not based on the things that I have inserted
        previously?" A picker that only offers the past is a dead end for
        anybody whose next deal is not in it.

        A room is still built around an opportunity (ADR-0028), so the honest
        answer is not a room from nothing: it is a route to describe the new
        thing, which takes a minute and is free. Stated before the list rather
        than under it, so it is found by somebody who has already decided none
        of these is the one.
      */}
      <Band title="Start something new">
        <p className="dr__item-meta">
          A Deal Room is built around one opportunity. If the deal you have in mind is not below, describe it first and
          come straight back.
        </p>
        <p className="dr__why">
          <a className="dr__link" href={`/${params.locale}/structure`}>
            Describe a new requirement or offer
          </a>
          {" · "}
          Free, and it stays private until you publish it.
        </p>
      </Band>

      <Band title="Choose the Deal">
        {deals.length === 0 ? (
          <>
            <Empty>
              You have not brought a requirement or an offer to the desk yet. A room is built on a snapshot of one, so
              there has to be one first.
            </Empty>
            <p className="dr__why">
              <a className="dr__link" href={`/${params.locale}/structure`}>
                Bring a requirement or offer to the desk
              </a>
              {" · "}
              It is free, and it is the only step between here and a room.
            </p>
          </>
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
              const open = check.blockers.filter((b) => !b.code.startsWith("no_counterparty"));
              const ready = open.length === 0;
              return (
                /*
                  The WHOLE row is the control, not the title alone.

                  Only the title was a link, and it carried no affordance, so a
                  member looking at three rows marked "Incomplete" saw three
                  verdicts and no way forward. The owner reached this screen on
                  1 August 2026 and read it exactly that way: "that's another
                  way for me just to leave and don't come back".
                */
                <li key={deal.id} className="dr__rowwrap">
                  <a className="dr__pick" href={`/${params.locale}/deal-rooms/propose?deal=${deal.id}`}>
                    <span>
                      <span className="dr__item-title">
                        {check.scope?.subject ?? deal.product ?? "Untitled Deal"}
                      </span>
                      {/*
                        The taxonomy's own labels. This printed the stored keys
                        - "services offer_trade_service", and "No family
                        recorded No intent recorded" for a row predating the
                        columns - which is the database talking to a member in
                        its own vocabulary, the same leak as the source-platform
                        reference in `publicRef`.
                      */}
                      <span className="dr__item-meta">{describeDeal(deal)}</span>
                    </span>
                    {/*
                      What is missing, and how many. "Incomplete" is a verdict
                      with no remedy and reads as a refusal; every row here is
                      selectable whatever it says, and choosing one shows the
                      list of what it needs with a route to each.
                    */}
                    <span className={ready ? "dr__chip dr__chip--done" : "dr__chip dr__chip--declared"}>
                      {ready ? "Ready" : open.length === 1 ? "1 detail to add" : `${open.length} details to add`}
                    </span>
                  </a>
                  {/*
                    Taking a record off the list, in two steps and with no
                    JavaScript.

                    The first step is a link that adds `?remove=<id>`; the
                    second is the form it reveals. A one-click destructive
                    control that needs a script to confirm is a control that
                    fires unconfirmed the day the script does not arrive.

                    It is a WITHDRAWAL, and the copy says so. Ponte does not
                    delete a commercial record: the reference stays citable and
                    the history stays worth having, and `withdrawn -> draft` is
                    a member transition, so nothing here is one way.
                  */}
                  {searchParams.remove === deal.id ? (
                    <form action={withdrawListingAction} className="dr__rm dr__rm--ask">
                      <input type="hidden" name="id" value={deal.id} />
                      <input type="hidden" name="returnTo" value="/deal-rooms/propose" />
                      <span>
                        Take this off your list? It is withdrawn, not deleted, and you can bring it back from your
                        records.
                      </span>
                      <button className="b b--sm" type="submit">
                        Withdraw it
                      </button>
                      <a className="dr__link" href={`/${params.locale}/deal-rooms/propose`}>
                        Keep it
                      </a>
                    </form>
                  ) : (
                    <p className="dr__rm">
                      <a className="dr__link" href={`/${params.locale}/deal-rooms/propose?remove=${deal.id}`}>
                        Take this off my list
                      </a>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Band>

      {selected && dealBlockers.length > 0 ? (
        <>
          <Banner tone="review" title="This Deal needs a few more details first">
            {dealBlockers.map((blocker) => `${blocker.message}${blocker.remedy ? ` ${blocker.remedy}` : ""}`).join(" ")}
          </Banner>
          {/*
            A banner that names a problem and offers no way to fix it is a
            wall. The composer is where every one of these is resolved, so the
            screen says so and links there.
          */}
          <p className="dr__why">
            <a className="dr__link" href={`/${params.locale}/structure?listing=${selected.id}`}>
              Add the missing details to this Deal
            </a>
            {" · "}
            Everything else about the room is ready when the Deal is.
          </p>
        </>
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
