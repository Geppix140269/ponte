import type { Metadata } from "next";
import CatalogueBrowser from "@/components/CatalogueBrowser";
import { getAllProducts, getAllCategories } from "@/lib/catalogue-db";

export const revalidate = 60;

const CATALOGUE_DESC =
  "Browse the full Ponte Trade catalogue, market reports, analysis modules, bundles, geopolitical risk, country and company intelligence.";

export const metadata: Metadata = {
  title: "Catalogue",
  description: CATALOGUE_DESC,
  alternates: { canonical: "/catalogue" },
  openGraph: {
    title: "Catalogue | Ponte Trade",
    description: CATALOGUE_DESC,
    url: "/catalogue",
    siteName: "Ponte Trade",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Catalogue | Ponte Trade",
    description: CATALOGUE_DESC,
  },
};

export default async function CataloguePage() {
  const [products, categories] = await Promise.all([
    getAllProducts(),
    getAllCategories(),
  ]);

  return (
    <>
      <header className="container-px pt-14 pb-10 md:pt-20 md:pb-12">
        <span className="pill">Catalogue</span>
        <h1
          className="serif text-white mt-6 mb-5"
          style={{
            fontWeight: 400,
            fontSize: "clamp(40px, 6vw, 72px)",
            lineHeight: 1.02,
            letterSpacing: "-0.015em",
          }}
        >
          Every report,{" "}
          <em className="text-gold italic" style={{ fontWeight: 400 }}>
            one place.
          </em>
        </h1>
        <p className="text-[17px] text-gray-2 leading-relaxed max-w-2xl">
          Filter by category and delivery time. Configure and buy what you
          need, no subscription.
        </p>
      </header>

      <section className="container-px pb-20">
        <CatalogueBrowser products={products} categories={categories} />
      </section>
    </>
  );
}
