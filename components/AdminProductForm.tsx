"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveProduct, archiveProduct } from "@/app/admin/products/actions";

interface DbProduct {
  id: string;
  sku: string;
  slug: string;
  title: string;
  category_id: string;
  band: string | null;
  short_description: string | null;
  full_description: string | null;
  includes: string[] | null;
  price_cents: number;
  price_from: boolean;
  price_suffix: string | null;
  alt_price: string | null;
  currency: string;
  savings_cents: number | null;
  delivery_type: string;
  is_subscription: boolean;
  is_configurable: boolean;
  config_fields: unknown | null;
  price_tiers: unknown | null;
  featured: boolean;
  status: string;
  preview_pdf_url: string | null;
  preview_pages: number | null;
}

interface DbCategory {
  id: string;
  slug: string;
  name: string;
}

interface Props {
  product?: DbProduct;
  categories: DbCategory[];
}

export default function AdminProductForm({ product, categories }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState(product?.preview_pdf_url ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const isEdit = Boolean(product?.id);

  // ---- Upload preview PDF to ponte-previews bucket ----------------------
  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const supabase = createClient();
      const path = `previews/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const { error } = await supabase.storage
        .from("ponte-previews")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage
        .from("ponte-previews")
        .getPublicUrl(path);
      setPreviewUrl(data.publicUrl);
    } catch (e: any) {
      setUploadError(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const includesText = (product?.includes ?? []).join("\n");
  const configJson = product?.config_fields
    ? JSON.stringify(product.config_fields, null, 2)
    : "";
  const tiersJson = product?.price_tiers
    ? JSON.stringify(product.price_tiers, null, 2)
    : "";

  return (
    <form
      action={(fd) => startTransition(() => saveProduct(fd))}
      className="space-y-8"
    >
      {/* Hidden fields */}
      {product?.id && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="preview_pdf_url" value={previewUrl} />

      {/* ---- Identity ---------------------------------------------------- */}
      <section className="rounded-xl border border-line bg-white p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy/50">Identity</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="field-label">SKU *</label>
            <input name="sku" className="field" required defaultValue={product?.sku} placeholder="e.g. MR-001" />
          </div>
          <div>
            <label className="field-label">Slug *</label>
            <input name="slug" className="field" required defaultValue={product?.slug} placeholder="e.g. single-country-market-report" />
          </div>
          <div>
            <label className="field-label">Title *</label>
            <input name="title" className="field" required defaultValue={product?.title} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Category *</label>
            <select name="category_id" className="field" required defaultValue={product?.category_id ?? ""}>
              <option value="">— choose —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Band (optional sub-group)</label>
            <input name="band" className="field" defaultValue={product?.band ?? ""} placeholder="e.g. Market Overview" />
          </div>
        </div>
      </section>

      {/* ---- Copy -------------------------------------------------------- */}
      <section className="rounded-xl border border-line bg-white p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy/50">Copy</h2>
        <div>
          <label className="field-label">Short description *</label>
          <input name="short_description" className="field" required defaultValue={product?.short_description ?? ""} />
        </div>
        <div>
          <label className="field-label">Full description *</label>
          <textarea name="full_description" className="field min-h-[100px]" required defaultValue={product?.full_description ?? ""} />
        </div>
        <div>
          <label className="field-label">What&apos;s included (one item per line)</label>
          <textarea name="includes" className="field font-mono text-xs min-h-[120px]" defaultValue={includesText} />
        </div>
      </section>

      {/* ---- Pricing ----------------------------------------------------- */}
      <section className="rounded-xl border border-line bg-white p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy/50">Pricing</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className="field-label">Price (USD) *</label>
            <input name="price" type="number" step="0.01" min="0" className="field" required
              defaultValue={product ? (product.price_cents / 100).toFixed(2) : ""} />
          </div>
          <div>
            <label className="field-label">Currency</label>
            <input name="currency" className="field" defaultValue={product?.currency ?? "USD"} />
          </div>
          <div>
            <label className="field-label">Price suffix</label>
            <input name="price_suffix" className="field" defaultValue={product?.price_suffix ?? ""} placeholder="/mo" />
          </div>
          <div>
            <label className="field-label">Alt price text</label>
            <input name="alt_price" className="field" defaultValue={product?.alt_price ?? ""} placeholder="or $249/yr" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className="field-label">Bundle savings (USD)</label>
            <input name="savings" type="number" step="0.01" min="0" className="field"
              defaultValue={product?.savings_cents ? (product.savings_cents / 100).toFixed(2) : ""} />
          </div>
          <div className="flex items-center gap-2 self-end pb-2">
            <input type="checkbox" name="price_from" id="price_from" defaultChecked={product?.price_from} />
            <label htmlFor="price_from" className="text-sm text-navy">Show as &ldquo;From $X&rdquo;</label>
          </div>
        </div>
        <div>
          <label className="field-label">Price tiers (JSON — leave blank if none)</label>
          <textarea name="price_tiers" className="field font-mono text-xs min-h-[100px]" defaultValue={tiersJson} />
        </div>
      </section>

      {/* ---- Delivery & status ------------------------------------------- */}
      <section className="rounded-xl border border-line bg-white p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy/50">Delivery &amp; status</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className="field-label">Delivery type *</label>
            <select name="delivery_type" className="field" required defaultValue={product?.delivery_type ?? "48h"}>
              <option value="instant">Instant</option>
              <option value="24h">24h</option>
              <option value="48h">48h</option>
              <option value="72h">72h</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="field-label">Status *</label>
            <select name="status" className="field" required defaultValue={product?.status ?? "draft"}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="flex items-center gap-2 self-end pb-2">
            <input type="checkbox" name="featured" id="featured" defaultChecked={product?.featured} />
            <label htmlFor="featured" className="text-sm text-navy">Featured on homepage</label>
          </div>
          <div className="flex items-center gap-2 self-end pb-2">
            <input type="checkbox" name="is_subscription" id="is_subscription" defaultChecked={product?.is_subscription} />
            <label htmlFor="is_subscription" className="text-sm text-navy">Subscription product</label>
          </div>
        </div>
      </section>

      {/* ---- Configuration ----------------------------------------------- */}
      <section className="rounded-xl border border-line bg-white p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy/50">Configuration</h2>
        <div className="flex items-center gap-2">
          <input type="checkbox" name="is_configurable" id="is_configurable" defaultChecked={product?.is_configurable} />
          <label htmlFor="is_configurable" className="text-sm text-navy">Product is configurable (has form fields)</label>
        </div>
        <div>
          <label className="field-label">Config fields (JSON array — leave blank if not configurable)</label>
          <textarea name="config_fields" className="field font-mono text-xs min-h-[120px]" defaultValue={configJson} />
        </div>
      </section>

      {/* ---- Preview PDF ------------------------------------------------- */}
      <section className="rounded-xl border border-line bg-white p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy/50">Preview PDF</h2>
        {previewUrl && (
          <p className="text-xs text-navy/60 break-all">
            Current: <a href={previewUrl} target="_blank" rel="noopener" className="underline">{previewUrl}</a>
          </p>
        )}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="field-label">Upload new PDF (ponte-previews bucket)</label>
            <input ref={fileRef} type="file" accept="application/pdf" className="field" />
          </div>
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="btn-outline h-10 shrink-0"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
        {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
        {previewUrl && !uploading && (
          <p className="text-xs text-emerald-700">✓ Preview PDF set</p>
        )}
        <div>
          <label className="field-label">Preview pages to show (default 2)</label>
          <input name="preview_pages" type="number" min="1" max="10" className="field w-24"
            defaultValue={product?.preview_pages ?? 2} />
        </div>
      </section>

      {/* ---- Actions ----------------------------------------------------- */}
      <div className="flex items-center gap-4">
        <button type="submit" disabled={isPending} className="btn-gold">
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Create product"}
        </button>
        <a href="/admin/products" className="btn-outline">Cancel</a>
        {isEdit && product && (
          <form
            action={() =>
              startTransition(() => archiveProduct(product.id, product.slug))
            }
            className="ml-auto"
          >
            <button
              type="submit"
              className="text-sm text-red-600 hover:text-red-700 underline"
              onClick={(e) => {
                if (!confirm("Archive this product? It will be hidden from the public catalogue.")) {
                  e.preventDefault();
                }
              }}
            >
              Archive
            </button>
          </form>
        )}
      </div>
    </form>
  );
}
