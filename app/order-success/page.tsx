import type { Metadata } from "next";
import Link from "next/link";
import { BridgeMark } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false },
};

export default function OrderSuccessPage() {
  return (
    <section className="container-px py-20">
      <div className="glass p-12 max-w-xl mx-auto text-center">
        {/* Span Traversal motion fires on the report-ready moment. */}
        <BridgeMark animate className="mx-auto h-20 w-20" />
        <h1
          className="serif text-white mt-6"
          style={{ fontSize: 32, fontWeight: 500 }}
        >
          Thank you for your order
        </h1>
        <p className="mt-4 text-[15px] text-gray-2 leading-relaxed">
          Instant downloads are available immediately in your account. For
          reports requiring production, we&apos;ll email you within 24 hours
          with your confirmed delivery date. Your card is authorized now
          and charged only when production starts.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/account" className="btn-gold">Go to my account</Link>
          <Link href="/catalogue" className="btn-ghost-light">Browse more</Link>
        </div>
      </div>
    </section>
  );
}