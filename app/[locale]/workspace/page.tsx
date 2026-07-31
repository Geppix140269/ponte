import { redirect } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isRtl } from "@/i18n/routing";
import { landingFontVars } from "@/components/home/landing/fonts";
import FindChrome from "@/components/find/FindChrome";
import { getUser, isSupabaseConfigured } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { presentRecord, type FactsRow } from "@/lib/listings/record-facts";
import { INTEREST_ROLE_LABELS, type InterestRole } from "@/lib/interest/expression";
import { connectDecisionAction } from "../_actions/listings";
import "@/components/find/find.css";

export const dynamic = "force-dynamic";

type Waiting = { id: string; created_at: string; ref: string; product: string };
/**
 * An introduction request another member has sent on a record THIS member owns,
 * still undecided. It is the owner's move, which is why it leads the page.
 *
 * The requester's business identity is deliberately absent from this shape and
 * from the read that fills it. Pre-acceptance the owner sees the substance of
 * the request (role, target, geography, reason) and an accurate "confirmed
 * member" label, never the business name or a contact. Disclosure happens in
 * connectDecisionAction, and only on acceptance.
 */
type Decision = {
  id: string;
  created_at: string;
  ref: string;
  product: string;
  role: string | null;
  target: string | null;
  geography: string | null;
  reason: string | null;
};
/**
 * `kind` is the record's own family and intent in words, not the legacy
 * three-value `type`. A member with a freight-forwarding record and a durum
 * wheat offer saw two identical rows before this: the same title treatment,
 * the same status, and nothing saying which market either belonged to.
 */
type Mine = { id: string; ref: string; product: string; status: string; kind: string };

function fmtDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  try {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(d);
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * The member workspace, ordered by action ownership (H03/H04).
 *
 * "Waiting on your decision" is the introduction requests other members have
 * sent on records this member owns. It leads because it is the only thing on the
 * page that is the member's own move, and the page asks what needs their
 * attention. "Waiting on others" is the introduction requests this member has
 * sent that the owner has not yet decided: their work, correctly filed as not
 * their move. "My opportunities" is the listings they own. All three are read
 * with explicit owner/requester filters. An item waiting on someone else never
 * appears as the member's task, which is the whole point of the split.
 */
export default async function WorkspacePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("find");
  const locale = await getLocale();
  const user = await getUser();
  if (!user) redirect("/login?next=/workspace");

  let waiting: Waiting[] = [];
  let mine: Mine[] = [];
  let decisions: Decision[] = [];

  if (isSupabaseConfigured()) {
    const sb = createAdminClient();

    // The owner side. Every record this member owns is read, not the first
    // twenty: a pending request on the twenty-first record is still the
    // member's move, and a limit here would silently hide it.
    const { data: owned } = await sb
      .from("listings")
      .select("id, ref, product")
      .eq("user_id", user!.id);
    const ownedIds = (owned ?? []).map((l) => l.id);
    if (ownedIds.length > 0) {
      // The select is the disclosure rule in code: `interested_business` is not
      // among these columns, so the counterparty's identity is never read on to
      // this page at all, let alone rendered.
      const { data: inbound } = await sb
        .from("listing_connections")
        .select(
          "id, listing_id, created_at, interest_role, interest_target, interest_geography, interest_reason",
        )
        .eq("status", "pending")
        .in("listing_id", ownedIds)
        .order("created_at", { ascending: false });
      const ownedById = new Map((owned ?? []).map((l) => [l.id, l]));
      decisions = (inbound ?? []).map((c) => ({
        id: c.id,
        created_at: c.created_at,
        ref: ownedById.get(c.listing_id)?.ref ?? "",
        product: ownedById.get(c.listing_id)?.product ?? "",
        role: c.interest_role,
        target: c.interest_target,
        geography: c.interest_geography,
        reason: c.interest_reason,
      }));
    }

    // H03 , introduction requests this member has sent, still pending.
    const { data: conns } = await sb
      .from("listing_connections")
      .select("id, created_at, listing_id")
      .eq("requester_id", user!.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const listingIds = Array.from(new Set((conns ?? []).map((c) => c.listing_id)));
    const refByListing = new Map<string, { ref: string; product: string }>();
    if (listingIds.length > 0) {
      const { data: ls } = await sb.from("listings").select("id, ref, product").in("id", listingIds);
      for (const l of ls ?? []) refByListing.set(l.id, { ref: l.ref, product: l.product });
    }
    waiting = (conns ?? []).map((c) => ({
      id: c.id,
      created_at: c.created_at,
      ref: refByListing.get(c.listing_id)?.ref ?? "",
      product: refByListing.get(c.listing_id)?.product ?? "",
    }));

    // H04 , listings this member owns.
    //
    // The canonical pair is read alongside so each row can name its own market.
    // Only the two columns are needed: `presentRecord` derives the kind from
    // them and falls back to the legacy `type` for rows that predate them.
    const { data: own } = await sb
      .from("listings")
      .select("id, ref, product, status, type, market_family, market_intent")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(20);
    mine = (own ?? []).map((l) => ({
      id: l.id,
      ref: l.ref,
      product: l.product,
      status: l.status,
      kind: presentRecord(l as FactsRow).kindLabel,
    }));
  }

  return (
    <div className={`ponte-find ${landingFontVars}`} dir={isRtl(params.locale) ? "rtl" : "ltr"}>
      <FindChrome>
        <section className="fphead" style={{ borderBottom: "none" }}>
          <h1 className="fphead__h serif">{t("workspace.title")}</h1>
        </section>

        {/* Waiting on your decision , the owner side of an introduction */}
        <section className="wsblock" aria-label={t("workspace.decideTitle")}>
          <h2 className="wsblock__h serif">
            {t("workspace.decideTitle")}
            <span className="wsblock__n">{decisions.length}</span>
          </h2>
          {decisions.length > 0 ? (
            decisions.map((d) => {
              const roleLabel = d.role
                ? INTEREST_ROLE_LABELS[d.role as InterestRole] ?? d.role
                : null;
              // A request made before the structured fields existed carries none
              // of them. It still reads, and it is still decidable.
              const facts = [
                { key: "target", label: t("workspace.decideTarget"), value: d.target },
                { key: "geography", label: t("workspace.decideGeography"), value: d.geography },
                { key: "reason", label: t("workspace.decideReason"), value: d.reason },
              ].filter((f) => Boolean(f.value));
              return (
                <div className="wsrow" key={d.id}>
                  <div className="wsrow__top">
                    <span className="wsrow__title serif">{d.product || d.ref}</span>
                    <span className="wsrow__status">{t("workspace.decideStatus")}</span>
                  </div>
                  <p className="wsrow__meta">
                    {d.ref} · {t("workspace.decideMeta", { date: fmtDate(d.created_at, locale) })}
                  </p>
                  {/* "Confirmed member" is the whole claim: they signed in with a
                      confirmed email. It is NOT a claim that their business is
                      verified, and the business name is withheld until the owner
                      accepts. */}
                  <p className="wsrow__meta">
                    {roleLabel
                      ? t("workspace.decideRequestRole", { role: roleLabel })
                      : t("workspace.decideRequest")}
                  </p>
                  {facts.length > 0 ? (
                    <dl className="qfacts">
                      {facts.map((f) => (
                        <div className="qfact" key={f.key}>
                          <dt className="qfact__k">{f.label}</dt>
                          <dd className="qfact__v">{f.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  <p className="flane__note" style={{ marginTop: 12 }}>
                    {t("workspace.decideDisclosure")}
                  </p>
                  <form action={connectDecisionAction} style={{ display: "flex", gap: 10 }}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="returnTo" value="/workspace" />
                    <button className="fbtn" name="decision" value="accepted">
                      {t("workspace.decideAccept")}
                    </button>
                    <button className="fbtn fbtn--secondary" name="decision" value="declined">
                      {t("workspace.decideDecline")}
                    </button>
                  </form>
                </div>
              );
            })
          ) : (
            <p className="flane__note">{t("workspace.decideEmpty")}</p>
          )}
        </section>

        {/* H03 , Waiting on others */}
        <section className="wsblock" aria-label={t("workspace.waitingTitle")}>
          <h2 className="wsblock__h serif">
            {t("workspace.waitingTitle")}
            <span className="wsblock__n">{waiting.length}</span>
          </h2>
          {waiting.length > 0 ? (
            waiting.map((w) => (
              <div className="wsrow" key={w.id}>
                <div className="wsrow__top">
                  <Link className="wsrow__title serif" href={`/find/o/${w.ref}`}>
                    {w.product || w.ref}
                  </Link>
                  <span className="wsrow__status">{t("workspace.waitingStatus")}</span>
                </div>
                <p className="wsrow__meta">
                  {w.ref} · {t("workspace.waitingMeta", { date: fmtDate(w.created_at, locale) })}
                </p>
              </div>
            ))
          ) : (
            <p className="flane__note">{t("workspace.waitingEmpty")}</p>
          )}
        </section>

        {/* H04 , My opportunities */}
        <section className="wsblock" aria-label={t("workspace.mineTitle")}>
          <h2 className="wsblock__h serif">
            {t("workspace.mineTitle")}
            <span className="wsblock__n">{mine.length}</span>
          </h2>
          {mine.length > 0 ? (
            mine.map((m) => (
              <div className="wsrow" key={m.id}>
                <div className="wsrow__top">
                  <span className="wsrow__title serif">{m.product}</span>
                  <span className="wsrow__status">
                    {m.status === "approved" ? t("workspace.mineStatusApproved") : t("workspace.mineStatusSubmitted")}
                  </span>
                </div>
                <p className="wsrow__meta">
                  {m.ref} · {m.kind}
                </p>
              </div>
            ))
          ) : (
            <p className="flane__note">{t("workspace.mineEmpty")}</p>
          )}
        </section>
      </FindChrome>
    </div>
  );
}
