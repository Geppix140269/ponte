"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Paperclip, Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TRADE_CATEGORIES } from "@/components/tradeCategories";

type ListingType = "offer" | "requirement" | "service";

const FIELD =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-cream placeholder:text-gray-2/60 focus:border-gold focus:outline-none";

const MAX_MEDIA = 12;
const MAX_MEDIA_MB = 50;
const MAX_DOCS = 5;
const MAX_DOC_MB = 10;

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const DOC_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

const INCOTERMS = ["To discuss", "EXW", "FOB", "CIF", "CFR", "DAP", "DDP"];

const STEPS: Record<ListingType, string[]> = {
  offer: ["The product", "The terms", "Photos & files"],
  requirement: ["What you need", "Delivery", "Files"],
  service: ["The service", "Scope", "Files"],
};

function safeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(-80);
}

export default function ListingForm({ initialType = "offer" }: { initialType?: ListingType }) {
  const router = useRouter();
  const [type, setType] = useState<ListingType>(initialType);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [media, setMedia] = useState<File[]>([]);
  const [docs, setDocs] = useState<File[]>([]);
  const [ref, setRef] = useState("");
  const [uploadWarning, setUploadWarning] = useState("");

  // The deal
  const [catId, setCatId] = useState("");
  const [sub, setSub] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("MT");
  const [freq, setFreq] = useState("One-off");
  const [price, setPrice] = useState("");
  const [priceBasis, setPriceBasis] = useState<"unit" | "deal">("unit");

  // Terms
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [incoterm, setIncoterm] = useState("To discuss");
  const [timing, setTiming] = useState(initialType === "requirement" ? "As soon as possible" : "Ready now");
  const [extraTerms, setExtraTerms] = useState("");

  const cat = TRADE_CATEGORIES.find((c) => c.id === catId);
  const isGoods = type !== "service";
  const stepsForType = STEPS[type];

  function switchType(t: ListingType) {
    setType(t);
    setTiming(t === "requirement" ? "As soon as possible" : "Ready now");
    setError("");
  }

  function next() {
    setError("");
    if (step === 0) {
      if (isGoods && !catId) {
        setError("Pick a category first, one tap.");
        return;
      }
      if (isGoods && cat && cat.subs.length > 1 && !sub) {
        setError("Pick the closest match, one more tap.");
        return;
      }
      if (!isGoods && !serviceName.trim()) {
        setError("Name the service first.");
        return;
      }
      if (!description.trim()) {
        setError(
          type === "requirement"
            ? "Describe what you need: specs, grade, quality."
            : "Describe it in a few lines: variety, grade, specs.",
        );
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 2));
  }

  function onMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > MAX_MEDIA) {
      setError(`Maximum ${MAX_MEDIA} photos and videos.`);
      e.target.value = "";
      return;
    }
    for (const f of files) {
      if (!IMAGE_TYPES.has(f.type) && !VIDEO_TYPES.has(f.type)) {
        setError(`"${f.name}": photos (PNG, JPG, WEBP, GIF) or videos (MP4, WEBM, MOV) only.`);
        e.target.value = "";
        return;
      }
      if (f.size > MAX_MEDIA_MB * 1024 * 1024) {
        setError(`"${f.name}" is over ${MAX_MEDIA_MB} MB.`);
        e.target.value = "";
        return;
      }
    }
    setError("");
    setMedia(files);
  }

  function onDocsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > MAX_DOCS) {
      setError(`Maximum ${MAX_DOCS} documents.`);
      e.target.value = "";
      return;
    }
    for (const f of files) {
      if (!DOC_TYPES.has(f.type)) {
        setError(`"${f.name}": PDF or image documents only.`);
        e.target.value = "";
        return;
      }
      if (f.size > MAX_DOC_MB * 1024 * 1024) {
        setError(`"${f.name}" is over ${MAX_DOC_MB} MB.`);
        e.target.value = "";
        return;
      }
    }
    setError("");
    setDocs(files);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step < 2) {
      next();
      return;
    }
    // Photos: required for offers (buyers must see the product), optional otherwise.
    if (type === "offer" && !media.some((f) => IMAGE_TYPES.has(f.type))) {
      setError("At least one photo of the product is required for an offer.");
      return;
    }

    setStatus("sending");
    setError("");
    setUploadWarning("");

    // Compose the payload from the structured inputs.
    const product = isGoods
      ? `${cat?.label ?? ""}${sub && sub !== "Other" ? ` · ${sub}` : ""}`
      : serviceName.trim();
    const volume = qty.trim()
      ? `${qty.trim()} ${unit}${freq !== "One-off" ? ` ${freq.toLowerCase()}` : ""}`
      : "";
    const priceNum = Number(price);
    const qtyNum = Number(qty.replace(/[, ]/g, ""));
    const totalValue =
      price && Number.isFinite(priceNum) && priceNum > 0
        ? priceBasis === "deal"
          ? priceNum
          : Number.isFinite(qtyNum) && qtyNum > 0
            ? priceNum * qtyNum
            : null
        : null;
    const priceLine = price
      ? `Price indication: USD ${price} ${priceBasis === "unit" ? `per ${unit}` : "for the deal"}`
      : "";
    const timingLine = isGoods
      ? `${type === "offer" ? "Availability" : "Needed"}: ${timing}`
      : "";
    const details = [description.trim(), priceLine, timingLine, extraTerms.trim()]
      .filter(Boolean)
      .join("\n");

    try {
      setProgress("Creating your listing…");
      const res = await fetch("/api/marketplace/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type,
          product,
          details,
          volume,
          origin: type === "offer" || type === "service" ? origin : "",
          destination: type === "requirement" ? destination : "",
          incoterm: isGoods && incoterm !== "To discuss" ? incoterm : "",
          indicative_value_usd: totalValue ? String(totalValue) : "",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Something went wrong. Please try again.");
      setRef(body.ref || "");
      const listingId = body.id as string;

      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (uid && listingId) {
        let failed = 0;
        const total = media.length + docs.length;
        let done = 0;
        for (const f of media) {
          done++;
          setProgress(`Uploading ${done} of ${total}: ${f.name}`);
          const path = `${uid}/${listingId}/${Date.now()}_${safeName(f.name)}`;
          const { error: upErr } = await supabase.storage
            .from("listing-media")
            .upload(path, f, { contentType: f.type });
          if (upErr) { failed++; continue; }
          await supabase.from("listing_media").insert({
            listing_id: listingId,
            user_id: uid,
            path,
            kind: VIDEO_TYPES.has(f.type) ? "video" : "image",
          });
        }
        for (const f of docs) {
          done++;
          setProgress(`Uploading ${done} of ${total}: ${f.name}`);
          const path = `${uid}/${listingId}/${Date.now()}_${safeName(f.name)}`;
          const { error: upErr } = await supabase.storage
            .from("listing-docs")
            .upload(path, f, { contentType: f.type });
          if (upErr) { failed++; continue; }
          await supabase.from("listing_documents").insert({
            listing_id: listingId,
            user_id: uid,
            path,
            filename: f.name.slice(-120),
          });
        }
        if (failed > 0) {
          setUploadWarning(
            `${failed} file(s) failed to upload. The listing stands; the desk will ask for anything missing.`,
          );
        }
      }
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setProgress("");
    }
  }

  if (status === "sent") {
    return (
      <div className="glass p-8 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-positive" />
        <h3 className="serif text-white text-xl mt-4" style={{ fontWeight: 500 }}>
          Submitted{ref ? ` · ${ref}` : ""}.
        </h3>
        <p className="mt-2 text-[14px] text-gray-2">
          Your listing is with the desk for vetting. You will be notified by
          email either way, usually within two business days.
        </p>
        {uploadWarning && <p className="mt-3 text-[13px] text-gold">{uploadWarning}</p>}
        <button type="button" onClick={() => router.push("/marketplace")} className="btn-gold mt-6">
          Back to the marketplace
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="glass p-7 md:p-8">
      {/* Progress */}
      <div className="mb-7 flex items-center gap-3">
        {stepsForType.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col gap-2">
            <div
              className="h-1 rounded-full transition-colors duration-300"
              style={{ background: i <= step ? "var(--gold)" : "rgba(255,255,255,0.1)" }}
            />
            <span
              className={`text-[10px] uppercase ${i === step ? "text-gold" : "text-gray-2"}`}
              style={{ letterSpacing: "0.16em" }}
            >
              {i + 1}. {label}
            </span>
          </div>
        ))}
      </div>

      {/* ============ STEP 1 ============ */}
      <div className={step === 0 ? "" : "hidden"}>
        <div className="mb-5 grid grid-cols-3 gap-2 rounded-lg border border-white/10 p-1">
          {(["offer", "requirement", "service"] as ListingType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => switchType(t)}
              className={`rounded-md py-2.5 text-[11px] uppercase transition-colors ${
                type === t ? "bg-gold text-navy font-bold" : "text-gray-2 hover:text-cream"
              }`}
              style={{ letterSpacing: "0.14em" }}
            >
              {t === "offer" ? "I sell" : t === "requirement" ? "I need" : "Service"}
            </button>
          ))}
        </div>

        {isGoods ? (
          <>
            {/* Category grid: click, don't type */}
            <p className="mb-3 text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>
              {type === "offer" ? "What are you selling?" : "What do you need?"} Pick a category
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {TRADE_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setCatId(c.id); setSub(""); }}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all duration-200 ${
                    catId === c.id
                      ? "border-gold bg-gold/15 scale-[1.03]"
                      : "border-white/10 bg-white/[0.03] hover:border-gold/50"
                  }`}
                >
                  <c.icon className={`h-6 w-6 ${catId === c.id ? "text-gold" : "text-gray-2"}`} />
                  <span className={`text-[10.5px] leading-tight ${catId === c.id ? "text-cream" : "text-gray-2"}`}>
                    {c.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Subcategory chips */}
            {cat && cat.subs.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {cat.subs.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSub(s)}
                    className={`rounded-full border px-4 py-2 text-[12px] transition-colors ${
                      sub === s
                        ? "border-gold bg-gold text-navy font-semibold"
                        : "border-white/15 text-gray-2 hover:border-gold/60 hover:text-cream"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <input
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            maxLength={200}
            placeholder="What service do you offer or need? *"
            className={FIELD}
          />
        )}

        {/* Description: free text, the only typing that matters */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder={
            type === "offer"
              ? "Describe the product: variety, grade, specs, packaging. *"
              : type === "requirement"
                ? "Describe what you need: specs, grade, quality, packaging. *"
                : "Describe the scope in a few lines. *"
          }
          className={`${FIELD} mt-4 resize-y`}
        />

        {isGoods && (
          <>
            {/* Quantity */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                inputMode="decimal"
                maxLength={12}
                placeholder="Quantity"
                className={FIELD}
              />
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className={FIELD}>
                <option>MT</option>
                <option>KG</option>
                <option>Tons</option>
                <option>Litres</option>
                <option>Units</option>
                <option>Pallets</option>
                <option>Containers</option>
                <option>Other</option>
              </select>
              <select value={freq} onChange={(e) => setFreq(e.target.value)} className={FIELD}>
                <option>One-off</option>
                <option>Per month</option>
                <option>Per quarter</option>
                <option>Per year</option>
                <option>Ongoing</option>
              </select>
            </div>

            {/* Price: USD per unit or for the deal */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                maxLength={12}
                placeholder={type === "requirement" ? "Target price (USD)" : "Price (USD)"}
                className={FIELD}
              />
              <select
                value={priceBasis}
                onChange={(e) => setPriceBasis(e.target.value as "unit" | "deal")}
                className={FIELD}
              >
                <option value="unit">USD per {unit}</option>
                <option value="deal">USD for the deal</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* ============ STEP 2 ============ */}
      <div className={step === 1 ? "" : "hidden"}>
        {type === "offer" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <input value={origin} onChange={(e) => setOrigin(e.target.value)} maxLength={80} placeholder="Origin (country/region)" className={FIELD} />
            <select value={incoterm} onChange={(e) => setIncoterm(e.target.value)} className={FIELD}>
              {INCOTERMS.map((i) => <option key={i}>{i === "To discuss" ? "Incoterm: to discuss" : i}</option>)}
            </select>
            <select value={timing} onChange={(e) => setTiming(e.target.value)} className={`${FIELD} sm:col-span-2`}>
              <option>Ready now</option>
              <option>Within 30 days</option>
              <option>Seasonal</option>
              <option>To be agreed</option>
            </select>
          </div>
        )}
        {type === "requirement" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <input value={destination} onChange={(e) => setDestination(e.target.value)} maxLength={80} placeholder="Deliver to (country/region)" className={FIELD} />
            <select value={incoterm} onChange={(e) => setIncoterm(e.target.value)} className={FIELD}>
              {INCOTERMS.map((i) => <option key={i}>{i === "To discuss" ? "Incoterm: to discuss" : i}</option>)}
            </select>
            <select value={timing} onChange={(e) => setTiming(e.target.value)} className={`${FIELD} sm:col-span-2`}>
              <option>As soon as possible</option>
              <option>Within 30 days</option>
              <option>Within 90 days</option>
              <option>Flexible</option>
            </select>
          </div>
        )}
        {type === "service" && (
          <input value={origin} onChange={(e) => setOrigin(e.target.value)} maxLength={80} placeholder="Where? (country/region, or worldwide)" className={FIELD} />
        )}
        <textarea
          value={extraTerms}
          onChange={(e) => setExtraTerms(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Anything else the desk should know (optional)"
          className={`${FIELD} mt-4 resize-y`}
        />
      </div>

      {/* ============ STEP 3 ============ */}
      <div className={step === 2 ? "" : "hidden"}>
        <label className={`flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-5 text-sm hover:border-gold ${
          type === "offer" ? "border-gold/40 bg-gold/5 text-cream" : "border-white/15 text-gray-2"
        }`}>
          <Camera className="h-4 w-4 text-gold" />
          <span>
            {media.length > 0
              ? media.map((f) => f.name).join(", ")
              : type === "offer"
                ? `Photos and videos of the product * (at least one photo, up to ${MAX_MEDIA})`
                : `Photos or videos (optional, up to ${MAX_MEDIA})`}
          </span>
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={onMediaChange}
          />
        </label>

        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-white/15 px-4 py-5 text-sm text-gray-2 hover:border-gold/50">
          <Paperclip className="h-4 w-4 text-gold" />
          <span>
            {docs.length > 0
              ? docs.map((f) => f.name).join(", ")
              : `Documents (optional: specs, licences, certificates · up to ${MAX_DOCS})`}
          </span>
          <input
            type="file"
            multiple
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onDocsChange}
          />
        </label>
        <p className="mt-2 text-[11px] leading-relaxed text-gray-2">
          Documents are visible only to the desk, never to counterparties.
        </p>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {progress && <p className="mt-4 text-sm text-gold">{progress}</p>}

      {/* Controls */}
      <div className="mt-6 flex items-center gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => { setError(""); setStep((s) => s - 1); }}
            className="btn-ghost-light"
            disabled={status === "sending"}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}
        <button
          type="submit"
          disabled={status === "sending"}
          className="btn-gold flex-1 justify-center disabled:opacity-60"
        >
          {step < 2 ? "Continue" : status === "sending" ? "Working…" : "Submit for vetting"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-gray-2">
        Share only what you are comfortable sharing. Prefer an NCNDA with the
        desk first?{" "}
        <a
          href="mailto:hello@ponte.trade?subject=NCNDA%20before%20listing&body=Please%20send%20me%20your%20NCNDA%20to%20sign%20before%20I%20submit%20my%20listing%20details."
          className="text-gold hover:text-cream"
        >
          Request it here
        </a>{" "}
        and list after signing. Nothing goes live until the desk approves it.
      </p>
    </form>
  );
}
