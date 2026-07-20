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
    </div>
  );
}
