import type { Metadata } from "next";
import CatalogueBrowser from "@/components/CatalogueBrowser";

export const metadata: Metadata = {
  title: "Catalogue",
  description:
    "Browse the full Ponte Trade catalogue — market reports, analysis modules, bundles, geopolitical risk, country and company intelligence.",
};

export default function CataloguePage() {
  return (
    <>
      <section className="bg-navy">
        <div className="container-px py-16 lg:py-20">
          <p className="eyebrow">Catalogue</p>
          <h1 className="mt-4 text-4xl font-extrabold text-white sm:text-5xl">
            Every report, one place
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/70">
            Filter by category and delivery time. Configure and buy what you
            need — no subscription.
          </p>
        </div>
      </section>

      <section className="bg-white py-12 lg:py-16">
        <div className="container-px">
          <CatalogueBrowser />
        </div>
      </section>
    </>
  );
}
