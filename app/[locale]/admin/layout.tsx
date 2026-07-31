import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupabaseConfigured, getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { landingFontVars } from "@/components/home/landing/fonts";
import DeskShell from "@/components/desk/DeskShell";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import "@/components/desk/desk.css";

export const dynamic = "force-dynamic";

// The administration desk. The legacy shop (Products, Orders, and their admin
// screens) was retired with zero orders ever taken; the products and categories
// tables still hold the old rows, readable in the Supabase console if that era
// ever needs a look. The live desk carries Listings, Signals, Verifications and
// Users, each a real current operation.
const adminNav = [
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/signals", label: "Signals" },
  { href: "/admin/verifications", label: "Verifications" },
  { href: "/admin/users", label: "Users" },
];

/** The Desk chrome around every admin surface, supplied once by the layout. */
function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`ponte-desk ${landingFontVars}`}>
      <DeskShell rail={null} objective={null}>
        {children}
      </DeskShell>
    </div>
  );
}

function Gate({ title, body }: { title: string; body: string }) {
  return (
    <AdminShell>
      <section className="sec">
        <div className="empty">
          <PonteIcon name="profile.account" size={24} />
          <div>
            <b>{title}</b>
            <p>{body}</p>
            <div className="empty__a">
              <Link className="b b--2" href="/">
                Back to Ponte
              </Link>
            </div>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <Gate
        title="Administration activates once sign-in is connected"
        body="The admin desk becomes available when the authentication service is configured for this deployment. Nothing here can load until then."
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
      <Gate
        title="This area is for administrators"
        body="Your account does not carry the admin role. If you should have access, set your profile role to 'admin' in Supabase."
      />
    );
  }

  return (
    <AdminShell>
      <section className="sec" style={{ paddingBottom: 0 }}>
        <nav
          aria-label="Administration"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 18,
            paddingBottom: 14,
            borderBottom: "1px solid var(--rule)",
          }}
        >
          <span className="kicker">Administration</span>
          {adminNav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              style={{
                fontFamily: "var(--f-mono)",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink-2)",
              }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </section>
      {children}
    </AdminShell>
  );
}
