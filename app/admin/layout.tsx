import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupabaseConfigured, getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const adminNav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/network", label: "Network" },
  { href: "/admin/network/verifications", label: "Verifications" },
  { href: "/admin/network/reports", label: "Reports" },
  { href: "/admin/network/fraud", label: "Fraud" },
  { href: "/admin/network/listings", label: "Listings" },
  { href: "/admin/network/settlements", label: "Settlements" },
];

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <section className="container-px py-20">
      <div className="glass p-12 max-w-xl mx-auto text-center">
        <h1 className="serif text-ink" style={{ fontSize: 32, fontWeight: 500 }}>{title}</h1>
        <p className="mt-4 text-[15px] text-gray-2 leading-relaxed">{body}</p>
        <Link href="/" className="btn-gold mt-8">Back to site</Link>
      </div>
    </section>
  );
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return <Notice title="Admin" body="The admin panel activates once Supabase is connected. Add your Supabase keys to enable it." />;
  }
  const user = await getUser();
  if (!user) redirect("/login?next=/admin");
  const supabase = createClient();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") {
    return <Notice title="Restricted" body="This area is for administrators. If you should have access, set your profile role to 'admin' in Supabase." />;
  }
  return (
    <div>
      <div className="nav-glass border-b border-rule">
        <div className="container-px flex h-14 items-center gap-6 overflow-x-auto">
          <span className="serif text-ink text-sm uppercase" style={{ letterSpacing: "0.22em", fontWeight: 500 }}>Admin</span>
          {adminNav.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap text-[12px] uppercase text-gray-2 hover:text-gold" style={{ letterSpacing: "0.18em" }}>{n.label}</Link>
          ))}
        </div>
      </div>
      <div className="container-px py-10">{children}</div>
    </div>
  );
}
