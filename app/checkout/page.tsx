import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard } from "lucide-react";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <section className="bg-white py-20">
      <div className="container-px max-w-xl text-center">
        <CreditCard className="mx-auto h-10 w-10 text-gold-600" />
        <h1 className="mt-5 text-3xl font-extrabold">Secure checkout</h1>
        <p className="mt-3 text-navy/65">
          Stripe checkout is being connected in the next build phase. Once your
          Stripe keys are in place, this step redirects to a hosted, PCI-compliant
          payment page in USD with automatic VAT via Stripe Tax.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/cart" className="btn-outline">Back to cart</Link>
          <Link href="/catalogue" className="btn-gold">Continue browsing</Link>
        </div>
      </div>
    </section>
  );
}
