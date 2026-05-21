import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false },
};

export default function OrderSuccessPage() {
  return (
    <section className="bg-white py-20">
      <div className="container-px max-w-xl text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="mt-5 text-3xl font-extrabold">Thank you for your order</h1>
        <p className="mt-3 text-navy/65">
          Instant downloads are available immediately in your account. Reports
          with a 24h or 48h SLA are being prepared — you&apos;ll receive an email
          with your download link when they&apos;re ready.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/account" className="btn-navy">Go to my account</Link>
          <Link href="/catalogue" className="btn-outline">Browse more</Link>
        </div>
      </div>
    </section>
  );
}
