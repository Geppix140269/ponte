import type { Metadata } from "next";
import Link from "next/link";
import { UserCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <section className="bg-white py-20">
      <div className="container-px max-w-xl text-center">
        <UserCircle2 className="mx-auto h-10 w-10 text-gold-600" />
        <h1 className="mt-5 text-3xl font-extrabold">Your account</h1>
        <p className="mt-3 text-navy/65">
          Sign-in (magic link + Google) and your download centre are being
          connected with Supabase Auth in the next build phase. Once live,
          you&apos;ll manage orders, downloads, and subscriptions here.
        </p>
        <div className="mt-8">
          <Link href="/catalogue" className="btn-gold">Browse the Catalogue</Link>
        </div>
      </div>
    </section>
  );
}
