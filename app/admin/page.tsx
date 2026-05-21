import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function count(table: string): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

export default async function AdminOverview() {
  const [orders, products, users, subscribers] = await Promise.all([
    count("orders"),
    count("products"),
    count("profiles"),
    count("newsletter_subscribers"),
  ]);

  const cards = [
    { label: "Orders", value: orders },
    { label: "Products", value: products },
    { label: "Users", value: users },
    { label: "Subscribers", value: subscribers },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Overview</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-line bg-white p-6">
            <p className="text-3xl font-extrabold text-navy">{c.value}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-navy/55">
              {c.label}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-navy/55">
        Counts read live from Supabase. Seed the catalogue (supabase/seed.sql)
        to populate products.
      </p>
    </div>
  );
}
