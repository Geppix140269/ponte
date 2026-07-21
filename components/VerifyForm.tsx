"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertCircle, BadgeCheck, Clock, ShieldCheck } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";

const FIELD =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-cream placeholder:text-gray-2/60 focus:border-gold focus:outline-none";

const LABEL = "block text-[11px] uppercase text-gray-2";
const LABEL_STYLE = { letterSpacing: "0.16em" } as const;

type Outcome = {
  id: string;
  status: "auto_verified" | "review" | "failed";
  reason: string;
};

export default function VerifyForm({
  balance,
  cost,
}: {
  balance: number | null;
  cost: number;
}) {
  const t = useTranslations("verification");

  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [vat, setVat] = useState("");

  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const short = balance !== null && balance < cost;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;

    if (!name.trim()) {
      setError(t("request.errors.name"));
      return;
    }
    if (!country) {
      setError(t("request.errors.country"));
      return;
    }

    setError("");
    setStatus("sending");
    try {
      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          country,
          regNumber: regNumber.trim(),
          vat: vat.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.status === 401) throw new Error(t("request.errors.signIn"));
      if (res.status === 402) throw new Error(t("request.errors.credits"));
      if (res.status === 429) throw new Error(t("request.errors.rateLimit"));
      if (!res.ok || !body?.id) throw new Error(t("request.errors.generic"));

      setOutcome(body as Outcome);
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      setError(
        err instanceof Error && err.message
          ? err.message
          : t("request.errors.generic"),
      );
    }
  }

  function reset() {
    setOutcome(null);
    setStatus("idle");
    setError("");
    setName("");
    setCountry("");
    setRegNumber("");
    setVat("");
  }

  if (status === "done" && outcome) {
    const verified = outcome.status === "auto_verified";
    const review = outcome.status === "review";
    const Icon = verified ? BadgeCheck : review ? Clock : AlertCircle;
    const tone = verified
      ? "text-positive"
      : review
        ? "text-gold"
        : "text-red-400";

    return (
      <div className="glass p-8">
        <Icon className={`h-8 w-8 ${tone}`} />
        <h2
          className="serif text-white mt-5"
          style={{ fontSize: 26, fontWeight: 500 }}
        >
          {verified
            ? t("request.result.verifiedTitle")
            : review
              ? t("request.result.reviewTitle")
              : t("request.result.failedTitle")}
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-gray-2">
          {verified
            ? t("request.result.verifiedBody")
            : review
              ? t("request.result.reviewBody")
              : t("request.result.failedBody")}
        </p>
        {outcome.reason && (
          <p className="mt-4 border-l-2 border-white/10 pl-3 text-[13px] leading-relaxed text-gray-2">
            <span
              className="mono text-[10px] uppercase text-gray-2"
              style={LABEL_STYLE}
            >
              {t("request.result.reasonLabel")}
            </span>
            <br />
            {outcome.reason}
          </p>
        )}
        <button type="button" onClick={reset} className="btn-gold mt-7">
          {t("request.result.again")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="glass p-7 md:p-8">
      {/* Balance and price, stated before anything is spent. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] uppercase text-gray-2" style={LABEL_STYLE}>
            {t("request.balance.label")}
          </span>
          <span className="serif text-gold" style={{ fontSize: 24, fontWeight: 500 }}>
            {balance ?? "-"}
          </span>
          <span className="text-[12px] text-gray-2">
            {t("request.balance.unit")}
          </span>
        </div>
        <span className="text-[12.5px] text-gray-2">
          {t("request.balance.cost", { cost })}
        </span>
      </div>

      {short && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <p className="flex-1 text-[13px] text-gold">
            {t("request.balance.short")}
          </p>
          <Link href="/pricing" className="btn-ghost-light">
            {t("request.balance.topUp")}
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-5">
        <div>
          <label className={LABEL} style={LABEL_STYLE} htmlFor="v-name">
            {t("request.fields.nameLabel")}
          </label>
          <input
            id="v-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            placeholder={t("request.fields.namePlaceholder")}
            className={`${FIELD} mt-2`}
          />
        </div>

        <div>
          <label className={LABEL} style={LABEL_STYLE} htmlFor="v-country">
            {t("request.fields.countryLabel")}
          </label>
          <select
            id="v-country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={`${FIELD} mt-2`}
          >
            <option value="" className="bg-navy">
              {t("request.fields.countryPlaceholder")}
            </option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code} className="bg-navy">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={LABEL} style={LABEL_STYLE} htmlFor="v-reg">
              {t("request.fields.regLabel")}{" "}
              <span className="text-gray-2/70">
                {t("request.fields.optional")}
              </span>
            </label>
            <input
              id="v-reg"
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              maxLength={60}
              placeholder={t("request.fields.regPlaceholder")}
              className={`${FIELD} mt-2`}
            />
            <p className="mt-2 text-[11.5px] leading-relaxed text-gray-2">
              {t("request.fields.regHint")}
            </p>
          </div>

          <div>
            <label className={LABEL} style={LABEL_STYLE} htmlFor="v-vat">
              {t("request.fields.vatLabel")}{" "}
              <span className="text-gray-2/70">
                {t("request.fields.optional")}
              </span>
            </label>
            <input
              id="v-vat"
              value={vat}
              onChange={(e) => setVat(e.target.value)}
              maxLength={40}
              placeholder={t("request.fields.vatPlaceholder")}
              className={`${FIELD} mt-2`}
            />
            <p className="mt-2 text-[11.5px] leading-relaxed text-gray-2">
              {t("request.fields.vatHint")}
            </p>
          </div>
        </div>
      </div>

      {error && <p className="mt-5 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={status === "sending" || short}
        className="btn-gold mt-7 w-full justify-center disabled:opacity-60"
      >
        <ShieldCheck className="h-4 w-4" />
        {status === "sending" ? t("request.working") : t("request.submit")}
      </button>
    </form>
  );
}
