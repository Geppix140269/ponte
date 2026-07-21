"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Paperclip, Camera, Eye, AlertCircle, TrendingUp, Sparkles } from "lucide-react";
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

// Who is submitting: the single most important vetting fact in physical
// trade. Sellers and buyers get their own wording.
const ROLES: Record<"offer" | "requirement", { v: string; label: string }[]> = {
  offer: [
    { v: "producer", label: "Producer / owner of the goods" },
    { v: "trading_co", label: "Trading company holding title" },
    { v: "mandated_broker", label: "Broker with a seller mandate" },
    { v: "intermediary", label: "Intermediary (no mandate)" },
  ],
  requirement: [
    { v: "end_buyer", label: "End buyer" },
    { v: "trading_co", label: "Trading company" },
    { v: "mandated_broker", label: "Broker with a buyer mandate" },
    { v: "intermediary", label: "Intermediary (no mandate)" },
  ],
};

const NEEDS_CHAIN = new Set(["mandated_broker", "intermediary"]);

const STEPS: Record<ListingType, string[]> = {
  offer: ["The product", "The terms", "Photos & files", "Preview"],
  requirement: ["What you need", "Delivery", "Files", "Preview"],
  service: ["The service", "Scope", "Files", "Preview"],
};

const LAST = 3;
const DRAFT_KEY = "ponte_draft";

function safeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(-80);
}

export default function ListingForm({
  initialType = "offer",
  isAuthed = false,
  restoreDraft = false,
}: {
  initialType?: ListingType;
  isAuthed?: boolean;
  restoreDraft?: boolean;
}) {
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
  const [wasDraft, setWasDraft] = useState(false);
  const [restoredNote, setRestoredNote] = useState(false);

  // Instant listing check (free, AI): reciprocity on the preview step.
  type Assessment = {
    score: number;
    headline: string;
    fix: string[];
    improve: string[];
    passed: string[];
  };
  const [assess, setAssess] = useState<Assessment | null>(null);
  const [assessStatus, setAssessStatus] = useState<"idle" | "loading" | "done" | "error" | "upgrade">("idle");

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

  // Who you are in this deal
  const [role, setRole] = useState("");
  const [chain, setChain] = useState("");

  // Terms
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [incoterm, setIncoterm] = useState("To discuss");
  const [timing, setTiming] = useState(initialType === "requirement" ? "As soon as possible" : "Ready now");
  const [extraTerms, setExtraTerms] = useState("");

  const cat = TRADE_CATEGORIES.find((c) => c.id === catId);
  const isGoods = type !== "service";
  const stepsForType = STEPS[type];

  // Restore a draft stashed before the sign-in round-trip (text only:
  // browsers cannot persist chosen files across navigation).
  useEffect(() => {
    if (!restoreDraft) return;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.type === "offer" || d.type === "requirement" || d.type === "service") setType(d.type);
      if (typeof d.catId === "string") setCatId(d.catId);
      if (typeof d.sub === "string") setSub(d.sub);
      if (typeof d.serviceName === "string") setServiceName(d.serviceName);
      if (typeof d.description === "string") setDescription(d.description);
      if (typeof d.qty === "string") setQty(d.qty);
      if (typeof d.unit === "string") setUnit(d.unit);
      if (typeof d.freq === "string") setFreq(d.freq);
      if (typeof d.price === "string") setPrice(d.price);
      if (d.priceBasis === "unit" || d.priceBasis === "deal") setPriceBasis(d.priceBasis);
      if (typeof d.role === "string") setRole(d.role);
      if (typeof d.chain === "string") setChain(d.chain);
      if (typeof d.origin === "string") setOrigin(d.origin);
      if (typeof d.destination === "string") setDestination(d.destination);
      if (typeof d.incoterm === "string") setIncoterm(d.incoterm);
      if (typeof d.timing === "string") setTiming(d.timing);
      if (typeof d.extraTerms === "string") setExtraTerms(d.extraTerms);
      sessionStorage.removeItem(DRAFT_KEY);
      setStep(2);
      setRestoredNote(true);
    } catch {
      // ignore a corrupt stash
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreDraft]);

  // Object URLs for the photo previews on the preview step.
  const previewUrls = useMemo(
    () => media.filter((f) => IMAGE_TYPES.has(f.type)).slice(0, 4).map((f) => URL.createObjectURL(f)),
    [media],
  );
  useEffect(() => {
    return () => previewUrls.forEach((u) => URL.revokeObjectURL(u));
  }, [previewUrls]);

  // Composed exactly as the submit payload composes them, so the preview
  // is honest.
  const composedProduct = isGoods
    ? `${cat?.label ?? ""}${sub && sub !== "Other" ? ` · ${sub}` : ""}`
    : serviceName.trim();
  const composedVolume = qty.trim()
    ? `${qty.trim()} ${unit}${freq !== "One-off" ? ` ${freq.toLowerCase()}` : ""}`
    : "";
  const composedPriceLine = price
    ? `Price indication: USD ${price} ${priceBasis === "unit" ? `per ${unit}` : "for the deal"}`
    : "";

  function switchType(t: ListingType) {
    setType(t);
    setTiming(t === "requirement" ? "As soon as possible" : "Ready now");
    setRole("");
    setChain("");
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
    if (step === 1 && isGoods) {
      if (!role) {
        setError("One tap: who are you in this deal?");
        return;
      }
      if (NEEDS_CHAIN.has(role) && !chain) {
        setError("One more tap: how close are you to the deal?");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, LAST));
  }

  async function runAssessment() {
    if (assessStatus === "loading") return;
    setAssessStatus("loading");
    try {
      const res = await fetch("/api/marketplace/assess", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type,
          product: composedProduct,
          description,
          quantity: composedVolume,
          price: composedPriceLine,
          origin,
          destination,
          role: isGoods
            ? ROLES[type === "offer" ? "offer" : "requirement"].find((r) => r.v === role)?.label ?? ""
            : "",
          media_count: media.length,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 402) {
        setAssessStatus("upgrade");
        return;
      }
      if (!res.ok || !body.assessment) throw new Error();
      setAssess(body.assessment as Assessment);
      setAssessStatus("done");
    } catch {
      setAssessStatus("error");
    }
  }

  // Auto-run the check the first time the preview opens.
  useEffect(() => {
    if (step === LAST && assessStatus === "idle" && description.trim().length >= 15) {
      runAssessment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function stashDraft() {
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          type, catId, sub, serviceName, description, qty, unit, freq,
          price, priceBasis, role, chain, origin, destination, incoterm,
          timing, extraTerms,
        }),
      );
    } catch {
      // storage full or blocked: they just retype
    }
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
    if (step < LAST) {
      next();
      return;
    }
    await publish(false);
  }

  async function publish(asDraft: boolean) {
    // Guests: stash the text, sign in, come back to the same spot.
    if (!isAuthed) {
      stashDraft();
      router.push(
        `/login?next=${encodeURIComponent(`/marketplace/new?type=${type}&restore=1`)}`,
      );
      return;
    }
    // Photos: required to publish an offer (buyers must see the product);
    // drafts can wait.
    if (!asDraft && type === "offer" && !media.some((f) => IMAGE_TYPES.has(f.type))) {
      setError("At least one photo of the product is required to publish an offer.");
      return;
    }

    setStatus("sending");
    setError("");
    setUploadWarning("");
    setWasDraft(asDraft);

    // Compose the payload from the structured inputs.
    const product = composedProduct;
    const volume = composedVolume;
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
    const priceLine = composedPriceLine;
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
          submitter_role: isGoods
            ? ROLES[type === "offer" ? "offer" : "requirement"].find((r) => r.v === role)?.label ?? ""
            : "",
          chain_depth: isGoods ? chain : "",
          draft: asDraft,
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
          {wasDraft ? "Saved as draft" : "Submitted"}{ref ? ` · ${ref}` : ""}.
        </h3>
        <p className="mt-2 text-[14px] text-gray-2">
          {wasDraft
            ? "Your draft is safe under Your listings on the marketplace page. Submit it for vetting whenever you are ready."
            : "Your listing is with the desk for vetting. You will be notified by email either way, usually within two business days."}
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
        {isGoods && (
          <>
            {/* Who are you in this deal: role + chain distance */}
            <p className="mb-3 text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>
              Who are you in this deal? *
            </p>
            <div className="flex flex-wrap gap-2">
              {ROLES[type === "offer" ? "offer" : "requirement"].map((r) => (
                <button
                  key={r.v}
                  type="button"
                  onClick={() => { setRole(r.v); if (!NEEDS_CHAIN.has(r.v)) setChain(""); }}
                  className={`rounded-full border px-4 py-2 text-[12px] transition-colors ${
                    role === r.v
                      ? "border-gold bg-gold text-navy font-semibold"
                      : "border-white/15 text-gray-2 hover:border-gold/60 hover:text-cream"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {NEEDS_CHAIN.has(role) && (
              <div className="mt-3">
                <select value={chain} onChange={(e) => setChain(e.target.value)} className={FIELD}>
                  <option value="">How close are you to the deal? *</option>
                  <option>{type === "offer" ? "Direct to the producer" : "Direct to the end buyer"}</option>
                  <option>One intermediary between</option>
                  <option>Two or more intermediaries</option>
                  <option>Not sure</option>
                </select>
                {role === "mandated_broker" && (
                  <p className="mt-2 text-[11px] text-gray-2">
                    Upload the mandate with your documents in the next step. It speeds up vetting.
                  </p>
                )}
              </div>
            )}
            <div className="my-5 h-px bg-white/10" />
          </>
        )}
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
        {restoredNote && (
          <p className="mt-3 rounded-[10px] px-4 py-3 text-[12px] text-gold" style={{ background: "rgba(232,160,32,0.12)", border: "1px solid rgba(232,160,32,0.35)" }}>
            Welcome back, your draft was restored. Photos cannot survive the
            sign-in trip, so re-attach them here before publishing.
          </p>
        )}
      </div>

      {/* ============ STEP 4: PREVIEW ============ */}
      <div className={step === LAST ? "" : "hidden"}>
        <p className="mb-3 flex items-center gap-2 text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>
          <Eye className="h-3.5 w-3.5 text-gold" /> This is how it appears on the board
        </p>

        <div className="rounded-2xl border border-gold/25 bg-white/[0.04] p-5 md:flex md:gap-6">
          {previewUrls.length > 0 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrls[0]}
              alt="Your product"
              className="mb-4 h-40 w-full rounded-lg object-cover md:mb-0 md:h-32 md:w-48 md:shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="mono text-[12px] text-gold">PT-····</span>
              <span className="badge uppercase">{type}</span>
              <span className="flex-1 text-[15px] text-cream">
                {composedProduct || "Your product"}
              </span>
            </div>
            <p className="mono mt-3 text-[12px] leading-relaxed text-gray-2">
              {[
                type !== "requirement" && origin && `Origin: ${origin}`,
                type === "requirement" && destination && `Destination: ${destination}`,
                composedVolume,
                isGoods && incoterm !== "To discuss" ? incoterm : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-gray-2">
              {[description.trim(), composedPriceLine].filter(Boolean).join("\n") ||
                "Your description appears here."}
            </p>
            {previewUrls.length > 1 && (
              <div className="mt-3 flex gap-2">
                {previewUrls.slice(1).map((u) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={u} src={u} alt="" className="h-14 w-20 rounded-md object-cover" />
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-gray-2">
          Your name and contact details are never shown. The reference number
          is assigned after the desk approves the listing.
          {!isAuthed && " Publishing is free: one click to sign in, no password."}
        </p>

        {/* Instant listing check */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>
              <Sparkles className="h-3.5 w-3.5 text-gold" /> Listing check · free
            </span>
            {assessStatus === "done" && assess && (
              <span className="serif text-gold" style={{ fontSize: 26, fontWeight: 500 }}>
                {assess.score}<span className="text-[14px] text-gray-2">/100</span>
              </span>
            )}
          </div>

          {assessStatus === "loading" && (
            <p className="mt-3 text-[13px] text-gray-2">Reading your listing…</p>
          )}
          {assessStatus === "error" && (
            <p className="mt-3 text-[13px] text-gray-2">
              The check is unavailable right now. You can still publish.
            </p>
          )}
          {assessStatus === "upgrade" && (
            <div className="mt-3">
              <p className="text-[13px] leading-relaxed text-gray-2">
                You have used your free checks. Ponte AI gives you unlimited
                listing checks and your personal AI account manager for
                <span className="text-gold"> $19/month</span>.
              </p>
              <a
                href={process.env.NEXT_PUBLIC_AI_PAYMENT_LINK || "/pricing"}
                className="btn-gold mt-3 inline-flex"
              >
                Unlock Ponte AI
              </a>
            </div>
          )}
          {assessStatus === "done" && assess && (
            <div className="mt-2 space-y-2.5">
              <p className="text-[13px] leading-relaxed text-cream">{assess.headline}</p>
              {assess.fix.length > 0 && (
                <div className="flex gap-2 text-[12.5px] leading-relaxed text-red-400">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{assess.fix.join(" · ")}</span>
                </div>
              )}
              {assess.improve.length > 0 && (
                <div className="flex gap-2 text-[12.5px] leading-relaxed text-gold">
                  <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{assess.improve.join(" · ")}</span>
                </div>
              )}
              {assess.passed.length > 0 && (
                <div className="flex gap-2 text-[12.5px] leading-relaxed text-positive">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{assess.passed.join(" · ")}</span>
                </div>
              )}
              <button
                type="button"
                onClick={runAssessment}
                className="text-[11px] uppercase text-gray-2 hover:text-gold"
                style={{ letterSpacing: "0.14em" }}
              >
                Check again after edits
              </button>
            </div>
          )}
        </div>
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
          {step < 2
            ? "Continue"
            : step === 2
              ? "Preview my listing"
              : status === "sending"
                ? "Working…"
                : isAuthed
                  ? "Publish for vetting"
                  : "Sign in and publish (free)"}
          <ArrowRight className="h-4 w-4" />
        </button>
        {step === LAST && isAuthed && (
          <button
            type="button"
            onClick={() => publish(true)}
            disabled={status === "sending"}
            className="btn-ghost-light disabled:opacity-60"
          >
            Save as draft
          </button>
        )}
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
