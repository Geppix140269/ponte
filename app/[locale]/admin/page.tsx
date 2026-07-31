import { createClient } from "@/lib/supabase/server";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";

export const dynamic = "force-dynamic";

async function count(table: string): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

async function countWhere(table: string, col: string, val: string): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(col, val);
  return count ?? 0;
}

// Founding attribution (Block F). Aggregate counts only, by invitation code, no
// member identities. This admin subtree is gated by AdminLayout, so this is the
// admin-only exposure the brief requires. The founding database is small, so
// the tally is done in code rather than through a database group-by.
async function foundingAttribution(): Promise<{ code: string; count: number }[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("referral_code")
    .not("referral_code", "is", null);
  const tally = new Map<string, number>();
  for (const row of (data ?? []) as { referral_code: string | null }[]) {
    if (row.referral_code) {
      tally.set(row.referral_code, (tally.get(row.referral_code) ?? 0) + 1);
    }
  }
  return Array.from(tally.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);
}

export default async function AdminOverview() {
  const [submitted, reviewed, listings, users] = await Promise.all([
    countWhere("listings", "status", "submitted"),
    countWhere("listings", "status", "approved"),
    count("listings"),
    count("profiles"),
  ]);

  const cards = [
    { label: "Submitted", value: submitted },
    { label: "Reviewed", value: reviewed },
    { label: "Listings total", value: listings },
    { label: "Users", value: users },
  ];

  const attribution = await foundingAttribution();

  return (
    <>
      <section className="sec">
        <div className="sech">
          <div>
            <p className="kicker">Overview</p>
            <h2>
              <PonteIcon name="profile.account" size={18} />
              Current operations
            </h2>
            <p className="d">Counts read live from Supabase.</p>
          </div>
        </div>

        <dl className="factgrid">
          {cards.map((c) => (
            <div key={c.label}>
              <dt>{c.label}</dt>
              <dd>{c.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="sec">
        <div className="sech">
          <div>
            <h2>Founding attribution</h2>
            <p className="d">
              Aggregate counts by invitation code, with no member identities.
              Members who arrive via the general invitation URL (/join) are
              counted here by invitation code.
            </p>
          </div>
        </div>

        {attribution.length === 0 ? (
          <div className="empty">
            <PonteIcon name="profile.reference" size={24} />
            <div>
              <b>No founding referrals recorded yet</b>
              <p>
                As members arrive through an invitation code, their totals appear
                here.
              </p>
            </div>
          </div>
        ) : (
          <div className="panel" style={{ maxWidth: 420 }}>
            <div className="panel__h">
              <b>By invitation code</b>
              <span>{attribution.length} codes</span>
            </div>
            <div>
              {attribution.map((a, i) => (
                <div
                  key={a.code}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 16px",
                    fontFamily: "var(--f-mono)",
                    fontSize: 13,
                    borderTop: i === 0 ? "0" : "1px solid var(--rule)",
                  }}
                >
                  <span style={{ color: "var(--ink-2)" }}>{a.code}</span>
                  <span style={{ color: "var(--ink)", fontWeight: 600 }}>
                    {a.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
