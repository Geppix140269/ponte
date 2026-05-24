import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { CATEGORIES } from "@/lib/catalogue";
import { getAllCategories, getCategory, productsByCategory } from "@/lib/catalogue-db";

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
    new Set(products.map((p) => p.band).filter(Boolean)),
  ) as string[];

  return (
    <>
      <section className="bg-navy">
        <div className="container-px py-16 lg:py-20">
          <p className="eyebrow">Category</p>
          <h1 className="mt-4 text-4xl font-extrabold text-white sm:text-5xl">
            {category.name}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/70">
            {category.description}
          </p>
        </div>
      </section>

      <section className="bg-white py-14 lg:py-16">
        <div className="container-px space-y-12">
          {bands.length > 0 ? (
            bands.map((band) => (
              <div key={band}>
                <h2 className="mb-6 text-xl font-bold text-navy">{band}</h2>
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
        </div>
      </section>
    </>
  );
}
