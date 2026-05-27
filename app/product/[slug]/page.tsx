import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import ProductBuyPanel from "@/components/ProductBuyPanel";
import ProductCard from "@/components/ProductCard";
import PreviewPaywall from "@/components/PreviewPaywall";
import { PRODUCTS } from "@/lib/catalogue";
import {
  getProduct,
  getCategory,
  relatedProducts,
} from "@/lib/catalogue-db";

// ISR: revalidate every 60 s; admin saves call revalidatePath() for instant update.
export const revalidate = 60;
// Allow new DB products that weren't in the build-time list.
export const dynamicParams = true;

const DATA_SOURCES = [
  "UN Comtrade",
  "World Bank",
  "WTO",
  "Eurostat",
  "ITC",
  "EU Taxud",
];

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return { title: "Product" };

  const path = `/product/${product.slug}`;
  const ogTitle = `${product.title} | Ponte Trade`;
  return {
    title: product.title,
    description: product.shortDescription,
    alternates: { canonical: path },
    openGraph: {
      title: ogTitle,
      description: product.shortDescription,
      url: path,
      siteName: "Ponte Trade",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: product.shortDescription,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const [product, related] = await Promise.all([
    getProduct(params.slug),
    getProduct(params.slug).then((p) =>
      p ? relatedProducts(p) : Promise.resolve([])
    ),
  ]);
  if (!product) notFound();

  const category = await getCategory(product.categorySlug);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.fullDescription,
    sku: product.sku,
    category: category?.name,
    brand: { "@type": "Brand", name: "Ponte Trade" },
    offers: {
      "@type": "Offer",
      price: (product.priceCents / 100).toFixed(2),
      priceCurrency: product.currency,
      availability: "https://schema.org/InStock",
      url: `https://ponte.trade/product/${product.slug}`,
      seller: { "@type": "Organization", name: "Ponte Trade" },
    },
  };

  return (
    <section className="container-px py-10 lg:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      {/* Breadcrumb */}
      <nav
        className="mono text-[11px] uppercase text-gray-2"
        style={{ letterSpacing: "0.18em" }}
      >
        <Link href="/catalogue" className="hover:text-gold">Catalogue</Link>
        <span className="mx-2 text-white/20">/</span>
        <Link href={`/category/${category?.slug}`} className="hover:text-gold">
          {category?.name}
        </Link>
        {product.band && (
          <>
            <span className="mx-2 text-white/20">/</span>
            <span>{product.band}</span>
          </>
        )}
      </nav>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px] lg:gap-14">
        {/* Left column */}
        <div>
          <h1
            className="serif text-white leading-tight"
            style={{
              fontSize: "clamp(36px, 5vw, 56px)",
              fontWeight: 400,
              lineHeight: 1.04,
              letterSpacing: "-0.01em",
            }}
          >
            {product.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="badge-navy mono">{product.sku}</span>
            {slotDisplay && (
              <span
                className={`text-[11px] uppercase ${slotDisplay.isSaturated ? "text-gold" : "text-positive"}`}
                style={{ letterSpacing: "0.22em" }}
              >
                {slotDisplay.primary}
              </span>
            )}
          </div>

          <p className="mt-7 text-[16px] leading-relaxed text-gray-2 max-w-2xl">
            {product.fullDescription}
          </p>

          {/* What's included */}
          <div className="mt-10 glass p-8">
            <h2
              className="serif text-white text-xl mb-5"
              style={{ fontWeight: 500 }}
            >
              What&apos;s included
            </h2>
            <ul className="space-y-3">
              {product.includes.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-[14px] text-cream"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Data sources */}
          <div className="mt-7 glass-tight p-7">
            <p className="field-label">Data sources</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DATA_SOURCES.map((s) => (
                <span
                  key={s}
                  className="rounded-full px-3 py-1.5 text-[11px] uppercase text-gold"
                  style={{
                    background: "rgba(201,151,58,0.10)",
                    border: "1px solid rgba(201,151,58,0.25)",
                    letterSpacing: "0.18em",
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
            <p className="mt-5 text-[12px] leading-relaxed text-gray-2">
              Every report is reviewed and signed off by a senior sector
              analyst, then cross-checked against multiple official sources.
              Where sources conflict, outliers are flagged and Monte Carlo
              models estimate the most likely outcome.
            </p>
          </div>

          {/* Preview */}
          <div className="mt-10">
            <PreviewPaywall product={product} />
          </div>
        </div>

        {/* Right column, sticky buy panel */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductBuyPanel product={product} />
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-20 pt-12 border-t border-white/10">
          <h2
            className="serif text-white text-2xl mb-8"
            style={{ fontWeight: 500 }}
          >
            You may also like
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.sku} product={p} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
