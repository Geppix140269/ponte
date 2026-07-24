import { redirect } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isRtl } from "@/i18n/routing";
import { landingFontVars } from "@/components/home/landing/fonts";
import FindChrome from "@/components/find/FindChrome";
import { getUser, isSupabaseConfigured } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import "@/components/find/find.css";

export const dynamic = "force-dynamic";

type Waiting = { id: string; created_at: string; ref: string; product: string };
type Mine = { id: string; ref: string; product: string; status: string };

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
 * "Waiting on others" is the introduction requests this member has sent that
 * the owner has not yet decided: their work, correctly filed as not their move.
 * "My opportunities" is the listings they own. Both are read with explicit
 * owner/requester filters. An item waiting on someone else never appears as the
 * member's task, which is the whole point of the split.
 */
export default async function WorkspacePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("find");
  const locale = await getLocale();
  const user = await getUser();
  if (!user) redirect("/login?next=/workspace");

  let waiting: Waiting[] = [];
  let mine: Mine[] = [];

  if (isSupabaseConfigured()) {
    const sb = createAdminClient();

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
    const { data: own } = await sb
      .from("listings")
      .select("id, ref, product, status")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(20);
    mine = (own ?? []).map((l) => ({ id: l.id, ref: l.ref, product: l.product, status: l.status }));
  }

  return (
    <div className={`ponte-find ${landingFontVars}`} dir={isRtl(params.locale) ? "rtl" : "ltr"}>
      <FindChrome>
        <section className="fphead" style={{ borderBottom: "none" }}>
          <h1 className="fphead__h serif">{t("workspace.title")}</h1>
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
                <p className="wsrow__meta">{m.ref}</p>
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
