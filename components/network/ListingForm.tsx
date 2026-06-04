"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createListing, type ListingInput } from "@/lib/network/listing-actions";

export function ListingForm({ defaultType }: { defaultType: "offer" | "request" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [reasons, setReasons] = useState<string[] | null>(null);
  const [por, setPor] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input: ListingInput = {
      listing_type: (String(f.get("listing_type")) as "offer" | "request"),
      commodity: String(f.get("commodity") || ""),
      hs_code: String(f.get("hs_code") || "") || null,
      origin_country: String(f.get("origin_country") || "") || null,
      destination_country: String(f.get("destination_country") || "") || null,
      quantity: f.get("quantity") ? Number(f.get("quantity")) : null,
      unit: String(f.get("unit") || "") || null,
      incoterms: String(f.get("incoterms") || "") || null,
      loading_port: String(f.get("loading_port") || "") || null,
      price_on_request: por,
      price_cents: !por && f.get("price") ? Math.round(Number(f.get("price")) * 100) : null,
      currency: String(f.get("currency") || "USD"),
      specifications: String(f.get("specifications") || "") || null,
    };
    setErr(null); setReasons(null);
    start(async () => {
      const res = await createListing(input);
      if (res.error) { setErr(res.error); setReasons(res.reasons ?? null); return; }
      router.push(`/network/listings/${res.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="glass p-8 space-y-5 max-w-3xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Type</Label>
          <select name="listing_type" defaultValue={defaultType} className="field">
            <option value="offer">Offer (I am selling)</option>
            <option value="request">Request (I am buying)</option>
          </select>
        </div>
        <Field name="commodity" label="Commodity" required />
        <Field name="hs_code" label="HS code" />
        <Field name="origin_country" label="Origin country" />
        <Field name="destination_country" label="Destination country" />
        <Field name="quantity" label="Quantity" type="number" />
        <Field name="unit" label="Unit (e.g. MT)" />
        <Field name="incoterms" label="Incoterms" />
        <Field name="loading_port" label="Loading port" />
        <Field name="price" label="Price" type="number" />
        <Field name="currency" label="Currency" def="USD" />
      </div>
      <label className="inline-flex items-center gap-2 text-[13px] text-gray-2">
        <input type="checkbox" checked={por} onChange={(e) => setPor(e.target.checked)} /> Price on request
      </label>
      <div>
        <Label>Specifications</Label>
        <textarea name="specifications" rows={4} className="field" placeholder="Grade, quality, crop year, terms…" />
        <p className="mt-1 text-[11px] text-gray-2">Direct contact details are automatically hidden from public listings.</p>
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="btn-gold">{pending ? "Publishing…" : "Publish listing"}</button>
        {err && <span className="text-negative text-sm">{err}</span>}
      </div>
      {reasons && reasons.length > 0 && (
        <ul className="text-[12px] text-negative list-disc pl-5">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
      )}
    </form>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mono text-[10px] text-gray-2 uppercase block mb-1.5" style={{ letterSpacing: "0.18em" }}>{children}</label>;
}
function Field({ name, label, type = "text", required, def }: { name: string; label: string; type?: string; required?: boolean; def?: string }) {
  return (
    <div>
      <Label>{label}{required ? " *" : ""}</Label>
      <input name={name} type={type} required={required} defaultValue={def} className="field" />
    </div>
  );
}
