"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Paperclip, Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

const STEPS = ["The deal", "The terms", "Photos & files"];

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
  const [product, setProduct] = useState("");
  const [details, setDetails] = useState("");

  function next() {
    setError("");
    if (step === 0 && !product.trim()) {
      setError(type === "service" ? "Name the service first." : "Name the product first.");
      return;
    }
    if (step === 1 && !details.trim()) {
      setError("The essentials are the listing. A few lines is enough.");
      return;
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
    const hasImage = media.some((f) => IMAGE_TYPES.has(f.type));
    if (!hasImage) {
      setError("At least one photo of the product is required.");
      return;
    }

    setStatus("sending");
    setError("");
    setUploadWarning("");
    const form = e.currentTarget;
    const fields = Object.fromEntries(new FormData(form).entries());

    try {
      // 1. Create the listing (metadata only).
      setProgress("Creating your listing…");
      const res = await fetch("/api/marketplace/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...fields, product, details, type }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Something went wrong. Please try again.");
      setRef(body.ref || "");
      const listingId = body.id as string;

      // 2. Upload media and documents straight from the browser.
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
          Your listing is with the desk for vetting. Nothing is circulated
          until it is approved and papered. You will be notified by email
          either way, usually within two business days.
        </p>
        {uploadWarning && (
          <p className="mt-3 text-[13px] text-gold">{uploadWarning}</p>
        )}
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
        {STEPS.map((label, i) => (
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

      {/* Step 1: the deal */}
      <div className={step === 0 ? "" : "hidden"}>
        <div className="mb-5 grid grid-cols-3 gap-2 rounded-lg border border-white/10 p-1">
          {(["offer", "requirement", "service"] as ListingType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-md py-2.5 text-[11px] uppercase transition-colors ${
                type === t ? "bg-gold text-navy font-bold" : "text-gray-2 hover:text-cream"
              }`}
              style={{ letterSpacing: "0.14em" }}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            maxLength={200}
            placeholder={type === "service" ? "Service offered / needed *" : "Product (HS code if known) *"}
            className={`${FIELD} sm:col-span-2`}
          />
          <input name="hs_code" maxLength={12} placeholder="HS code" className={FIELD} />
          <input name="volume" maxLength={120} placeholder="Volume / quantity" className={FIELD} />
        </div>
      </div>

      {/* Step 2: the terms */}
      <div className={step === 1 ? "" : "hidden"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <input name="origin" maxLength={80} placeholder="Origin (country/region)" className={FIELD} />
          <input name="destination" maxLength={80} placeholder="Destination (country/region)" className={FIELD} />
          <input name="incoterm" maxLength={20} placeholder="Incoterm (FOB, CIF...)" className={FIELD} />
          <input name="indicative_value_usd" type="number" min="0" step="1" placeholder="Indicative value (USD)" className={FIELD} />
        </div>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={3000}
          rows={6}
          placeholder="The essentials a serious counterparty will ask first: specs, price basis, timing, terms, certifications. Facts only, no marketing. *"
          className={`${FIELD} mt-4 resize-y`}
        />
      </div>

      {/* Step 3: media + documents */}
      <div className={step === 2 ? "" : "hidden"}>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-gold/40 bg-gold/5 px-4 py-5 text-sm text-cream hover:border-gold">
          <Camera className="h-4 w-4 text-gold" />
          <span>
            {media.length > 0
              ? media.map((f) => f.name).join(", ")
              : `Photos and videos of the product * (at least one photo, up to ${MAX_MEDIA} files, ${MAX_MEDIA_MB} MB each)`}
          </span>
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={onMediaChange}
          />
        </label>
        <p className="mt-2 text-[11px] leading-relaxed text-gray-2">
          What the counterparty sees. Real photos close deals; a short video
          of the product, the plant or the stock is even stronger.
        </p>

        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-white/15 px-4 py-5 text-sm text-gray-2 hover:border-gold/50">
          <Paperclip className="h-4 w-4 text-gold" />
          <span>
            {docs.length > 0
              ? docs.map((f) => f.name).join(", ")
              : `Documents (optional: specs, licences, certificates · up to ${MAX_DOCS}, ${MAX_DOC_MB} MB each)`}
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
        Nothing goes live until the desk approves it. Counterparty names stay
        confidential and introductions run only under signed NCNDA and fee
        terms.
      </p>
    </form>
  );
}
