import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard } from "lucide-react";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <section className="container-px py-20">
      <div className="glass p-12 max-w-xl mx-auto text-center">
        <CreditCard className="mx-auto h-10 w-10 text-gold" />
        <h1
          className="serif text-white mt-6"
          style={{ fontSize: 32, fontWeight: 500 }}
        >
          Secure checkout
        </h1>
        <p className="mt-4 text-[15px] text-gray-2 leading-relaxed">
          Stripe checkout is being connected in the next build phase. Once your
          Stripe keys are in place, this step redirects to a hosted,
          PCI-compliant payment page in USD with automatic VAT via Stripe Tax.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/cart" className="btn-ghost-light">Back to cart</Link>
          <Link href="/catalogue" className="btn-gold">Continue browsing</Link>
        </div>
      </div>
    </section>
  );
}
