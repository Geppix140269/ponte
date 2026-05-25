import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { CATEGORIES } from "@/lib/catalogue";
import {
  getCategory,
  productsByCategory,
} from "@/lib/catalogue-db";

export const revalidate = 60;
export const dynamicParams = true;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const category = await getCategory(params.slug);
  if (!category) return { title: "Category" };

  const path = `/category/${category.slug}`;
  const ogTitle = `${category.name} — Ponte Trade`;
  return {
    title: category.name,
    description: category.description,
    alternates: { canonical: path },
    openGraph: {
      title: ogTitle,
      description: category.description,
      url: path,
      siteName: "Ponte Trade",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: category.description,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  const [category, products] = await Promise.all([
    getCategory(params.slug),
    productsByCategory(params.slug),
  ]);
  if (!category) notFound();

  const bands = Array.from(
    new Set(products.map((p) => p.band).filter(Boolean))
  ) as string[];

  return (
    <>
      <header className="container-px pt-14 pb-10 md:pt-20 md:pb-12">
        <span className="pill">Category</span>
        <h1
          className="serif text-white mt-6 mb-5"
          style={{
            fontWeight: 400,
            fontSize: "clamp(40px, 6vw, 72px)",
            lineHeight: 1.02,
            letterSpacing: "-0.015em",
          }}
        >
          {category.name}
        </h1>
        <p className="text-[17px] text-gray-2 leading-relaxed max-w-2xl">
          {category.description}
        </p>
      </header>

      <section className="container-px pb-20 space-y-14">
        {bands.length > 0 ? (
          bands.map((band) => (
            <div key={band}>
              <h2
                className="serif text-white mb-7"
                style={{ fontSize: 26, fontWeight: 500 }}
              >
                {band}
              </h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {products
                  .filter((p) => p.band === band)
                  .map((p) => (
                    <ProductCard key={p.sku} product={p} />
                  ))}
              </div>
            </div>
          ))
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.sku} product={p} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
