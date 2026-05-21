import type { Metadata } from "next";
import EmailSignup from "@/components/EmailSignup";
import ArchPattern from "@/components/ArchPattern";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "The Ponte Marketplace — a verified platform connecting international buyers and sellers. Launching soon.",
};

export default function MarketplacePage() {
  return (
    <section className="relative flex min-h-[calc(100vh-5rem)] items-center overflow-hidden bg-navy">
      <ArchPattern className="opacity-[0.04]" />
      <div className="container-px relative py-20">
        <p className="tag-rule">Coming Soon</p>
        <h1 className="mt-6 max-w-3xl text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
          The Ponte Marketplace
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
          A verified platform connecting international buyers and sellers.
          Launching soon — register your interest to be first in.
        </p>
        <div className="mt-10">
          <EmailSignup
            formName="marketplace"
            buttonLabel="Notify Me"
            variant="dark"
          />
        </div>
      </div>
    </section>
  );
}
