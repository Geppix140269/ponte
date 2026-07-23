import { createClient } from "@/lib/supabase/server";

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
  const [pending, approved, listings, users, orders, products] = await Promise.all([
    countWhere("listings", "status", "submitted"),
    countWhere("listings", "status", "approved"),
    count("listings"),
    count("profiles"),
    count("orders"),
    count("products"),
  ]);

  const cards = [
    { label: "Awaiting vetting", value: pending },
    { label: "Approved listings", value: approved },
    { label: "Listings total", value: listings },
    { label: "Users", value: users },
    { label: "Legacy orders", value: orders },
    { label: "Legacy products", value: products },
  ];

  const attribution = await foundingAttribution();

  return (
    <div>
      <h1
        className="serif text-white mb-7"
        style={{ fontSize: 32, fontWeight: 500 }}
      >
        Overview
      </h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="glass p-6">
            <p
              className="serif text-white"
              style={{ fontSize: 36, fontWeight: 500, lineHeight: 1 }}
            >
              {c.value}
            </p>
            <p
              className="mt-3 text-[10px] uppercase text-gray-2"
              style={{ letterSpacing: "0.22em" }}
            >
              {c.label}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-[13px] text-gray-2">
        Counts read live from Supabase. Seed the catalogue (supabase/seed.sql)
        to populate products.
      </p>

      <section className="mt-10">
        <h2
          className="serif text-white mb-4"
          style={{ fontSize: 22, fontWeight: 500 }}
        >
          Founding attribution
        </h2>
        {attribution.length === 0 ? (
          <p className="text-[13px] text-gray-2">
            No founding referrals recorded yet. Members who arrive via the
            general invitation URL (/join) are counted here by invitation code.
          </p>
        ) : (
          <div className="glass divide-y divide-white/10 max-w-md">
            {attribution.map((a) => (
              <div
                key={a.code}
                className="flex items-center justify-between px-5 py-3 text-[14px]"
              >
                <span className="mono text-cream">{a.code}</span>
                <span className="text-white">{a.count}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
