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
];

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <section className="bg-white py-20">
      <div className="container-px max-w-xl text-center">
        <h1 className="text-3xl font-extrabold">{title}</h1>
        <p className="mt-3 text-navy/65">{body}</p>
        <Link href="/" className="btn-gold mt-8">Back to site</Link>
      </div>
    </section>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <Notice
        title="Admin"
        body="The admin panel activates once Supabase is connected. Add your Supabase keys to enable it."
      />
    );
  }

  const user = await getUser();
  if (!user) redirect("/login?next=/admin");

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return (
      <Notice
        title="Restricted"
        body="This area is for administrators. If you should have access, set your profile role to 'admin' in Supabase."
      />
    );
  }

  return (
    <div className="bg-mist">
      <div className="border-b border-line bg-white">
        <div className="container-px flex h-14 items-center gap-6 overflow-x-auto">
          <span className="text-sm font-bold text-navy">Admin</span>
          {adminNav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap text-sm font-medium text-navy/60 hover:text-navy"
            >
              {n.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="container-px py-10">{children}</div>
    </div>
  );
}
