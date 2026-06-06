"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, User } from "lucide-react";
import { BridgeMark } from "@/components/Logo";
import { NotificationBell } from "@/components/network/NotificationBell";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/network/discover", label: "Discover" },
  { href: "/network/listings", label: "Listings" },
  { href: "/network/verify", label: "Verify" },
  { href: "/network/deals", label: "Deal Rooms" },
  { href: "/pricing", label: "Pricing" },
  { href: "/catalogue", label: "Market Intelligence" },
];

// auth: null = still resolving, false = signed out, true = signed in.
export function NetworkHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    let active = true;
    let supabase: ReturnType<typeof createClient>;
    try { supabase = createClient(); } catch { setAuthed(false); return; }
    supabase.auth.getUser().then(({ data }) => { if (active) setAuthed(!!data.user); }).catch(() => active && setAuthed(false));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (active) setAuthed(!!session?.user); });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return (
    <header className="sticky top-0 z-50 nav-glass">
      <nav className="container-px flex h-16 items-center justify-between">
        <Link href="/" aria-label="ponte.trade" className="flex items-center gap-2">
          <BridgeMark className="h-7 w-7" stroke="#0F0F0E" node="#C9973A" />
          <span className="serif text-ink text-lg" style={{ fontWeight: 600, letterSpacing: "0.01em" }}>ponte<span className="text-gold">.trade</span></span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/catalogue" && pathname.startsWith(l.href));
            return (
              <Link key={l.href} href={l.href}
                className={`text-[12px] uppercase transition-colors ${active ? "text-gold" : "text-gray-2 hover:text-gold"}`}
                style={{ letterSpacing: "0.16em" }}>{l.label}</Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {authed ? (
            <>
              <NotificationBell />
              <Link href="/account" className="inline-flex p-2 text-gray-2 hover:text-gold" aria-label="Account"><User className="h-5 w-5" /></Link>
              <form action="/auth/signout" method="post">
                <button type="submit" className="text-[12px] uppercase text-gray-2 hover:text-gold" style={{ letterSpacing: "0.16em" }}>Sign out</button>
              </form>
            </>
          ) : authed === false ? (
            <>
              <Link href="/login" className="text-[12px] uppercase text-gray-2 hover:text-gold" style={{ letterSpacing: "0.16em" }}>Sign in</Link>
              <Link href="/pricing" className="btn-gold px-4 py-2 text-[12px]">Get started</Link>
            </>
          ) : null}
        </div>

        <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex rounded-full p-2 text-ink hover:bg-white/5 md:hidden" aria-label="Menu" aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-rule bg-[rgba(7,16,27,0.92)] md:hidden">
          <div className="container-px flex flex-col py-3">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="py-2.5 text-sm uppercase text-ink" style={{ letterSpacing: "0.16em" }}>{l.label}</Link>
            ))}
            {authed ? (
              <>
                <Link href="/account" className="py-2.5 text-sm uppercase text-ink" style={{ letterSpacing: "0.16em" }}>Account</Link>
                <Link href="/network/notifications" className="py-2.5 text-sm uppercase text-ink" style={{ letterSpacing: "0.16em" }}>Notifications</Link>
                <form action="/auth/signout" method="post" className="contents">
                  <button type="submit" className="py-2.5 text-left text-sm uppercase text-ink" style={{ letterSpacing: "0.16em" }}>Sign out</button>
                </form>
              </>
            ) : authed === false ? (
              <>
                <Link href="/login" className="py-2.5 text-sm uppercase text-ink" style={{ letterSpacing: "0.16em" }}>Sign in</Link>
                <Link href="/pricing" className="btn-gold mt-2 text-center">Get started</Link>
              </>
            ) : null}
          </div>
        </div>
      )}
    </header>
  );
}
