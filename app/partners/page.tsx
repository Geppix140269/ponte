import type { Metadata } from "next";
import EmailSignup from "@/components/EmailSignup";
import ArchPattern from "@/components/ArchPattern";

export const metadata: Metadata = {
  title: "Partners",
  description:
    "Become a Ponte Partner — access our global network, co-branded opportunities, and dedicated support. The partner portal is launching soon.",
};

export default function PartnersPage() {
  return (
    <section className="relative flex min-h-[calc(100vh-5rem)] items-center overflow-hidden bg-navy">
      <ArchPattern className="opacity-[0.04]" />
      <div className="container-px relative py-20">
        <p className="tag-rule">Partner Area</p>
        <h1 className="mt-6 max-w-3xl text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
          Become a Ponte Partner
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
          Access our global network, co-branded opportunities, and dedicated
          support. The partner portal is launching soon.
        </p>
        <div className="mt-10">
          <EmailSignup
            formName="partners"
            buttonLabel="Register Interest"
            variant="dark"
          />
        </div>
      </div>
    </section>
  );
}
