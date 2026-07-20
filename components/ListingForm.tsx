"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Paperclip } from "lucide-react";

type ListingType = "offer" | "requirement" | "service";

const FIELD =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-cream placeholder:text-gray-2/60 focus:border-gold focus:outline-none";

const MAX_FILES = 5;
const MAX_FILE_MB = 10;

const STEPS = ["The deal", "The terms", "Documents"];

export default function ListingForm() {
  const router = useRouter();
  const [type, setType] = useState<ListingType>("offer");
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [ref, setRef] = useState("");
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

  function onFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} documents.`);
      e.target.value = "";
      setFileNames([]);
      return;
    }
    const tooBig = files.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig) {
      setError(`"${tooBig.name}" is over ${MAX_FILE_MB} MB.`);
      e.target.value = "";
      setFileNames([]);
      return;
    }
    setError("");
    setFileNames(files.map((f) => f.name));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step < 2) {
      next();
      return;
    }
    setStatus("sending");
    setError("");
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("type", type);
    try {
      const res = await fetch("/api/marketplace/submit", {
        method: "POST",
        body: data,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Something went wrong. Please try again.");
      }
      setRef(body.ref || "");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
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
          Your listing is now with the desk for vetting. Nothing is
          circulated until it is approved and papered. You will be notified
          by email either way, usually within two business days.
        </p>
        <button type="button" onClick={() => router.push("/marketplace")} className="btn-gold mt-6">
          Back to my listings
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
            name="product"
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
          name="details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={3000}
          rows={6}
          placeholder="The essentials a serious counterparty will ask first: specs, price basis, timing, terms, certifications. Facts only, no marketing. *"
          className={`${FIELD} mt-4 resize-y`}
        />
      </div>

      {/* Step 3: documents */}
      <div className={step === 2 ? "" : "hidden"}>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-white/15 px-4 py-5 text-sm text-gray-2 hover:border-gold/50">
          <Paperclip className="h-4 w-4 text-gold" />
          <span>
            {fileNames.length > 0
              ? fileNames.join(", ")
              : `Supporting documents (up to ${MAX_FILES}, PDF or images, ${MAX_FILE_MB} MB each)`}
          </span>
          <input
            type="file"
            name="documents"
            multiple
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onFilesChange}
          />
        </label>
        <p className="mt-3 text-[11px] leading-relaxed text-gray-2">
          Specs, licences, registrations, certificates. Visible only to the
          desk, never to counterparties, and they speed up vetting
          considerably. Optional, but listings with documents clear faster.
        </p>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {/* Controls */}
      <div className="mt-6 flex items-center gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => { setError(""); setStep((s) => s - 1); }}
            className="btn-ghost-light"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}
        <button
          type="submit"
          disabled={status === "sending"}
          className="btn-gold flex-1 justify-center disabled:opacity-60"
        >
          {step < 2 ? "Continue" : status === "sending" ? "Submitting…" : "Submit for vetting"}
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
