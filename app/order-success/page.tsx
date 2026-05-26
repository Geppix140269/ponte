import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false },
};

export default function OrderSuccessPage() {
  return (
    <section className="container-px py-20">
      <div className="glass p-12 max-w-xl mx-auto text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-positive" />
        <h1
          className="serif text-white mt-6"
          style={{ fontSize: 32, fontWeight: 500 }}
        >
          Thank you for your order
        </h1>
        <p className="mt-4 text-[15px] text-gray-2 leading-relaxed">
          Instant downloads are available immediately in your account. Reports
          with a 24h or 48h SLA are being prepared, you&apos;ll receive an
          email with your download link when they&apos;re ready.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/account" className="btn-gold">Go to my account</Link>
          <Link href="/catalogue" className="btn-ghost-light">Browse more</Link>
        </div>
      </div>
    </section>
  );
}
