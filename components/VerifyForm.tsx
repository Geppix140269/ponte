"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertCircle, BadgeCheck, Clock, ListChecks, ShieldCheck } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";

const FIELD =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-cream placeholder:text-gray-2/60 focus:border-gold focus:outline-none";

const LABEL = "block text-[11px] uppercase text-gray-2";
const LABEL_STYLE = { letterSpacing: "0.16em" } as const;

/** What this check is for. Only 'member_business' can move the member's badge. */
export type VerifyPurpose = "member_business" | "counterparty_check";

/**
 * Block B copy for the two purposes, in English for now. The rest of this form
 * still reads the `verification` message namespace; Block E folds these lines in
 * and rebuilds the locales. Kept here, not inferred from the page, so the button
 * a member presses and the purpose the server records are the same thing.
 */
const PURPOSE_COPY: Record<
  VerifyPurpose,
  { attest?: string; note: string; resultNote: string }
> = {
  member_business: {
    attest: "This is the business I represent on Ponte.",
    note: "Verifying your own business is what unlocks the Business checked badge, publishing an opportunity and receiving an introduction.",
    resultNote:
      "This verifies your own business. A clean pass sets your Business checked status.",
  },
  counterparty_check: {
    note: "This is a private check on another company. It does not verify your business and does not change your account or badge.",
    resultNote:
      "This was a private counterparty check. It does not change your own account, level or badge.",
  },
};

/** One of the companies that matched the name. Mirrors RegistryCandidate. */
type Candidate = {
  companyName?: string;
  regNumber?: string;
  status?: string;
  incorporationDate?: string;
  address?: string;
  jurisdiction?: string;
};

type Outcome = {
  id: string;
  status: "auto_verified" | "review" | "failed" | "needs_selection";
  reason: string;
  candidates?: Candidate[];
  candidateTotal?: number;
};

/**
 * One labelled fact about a candidate. A missing value is written out as not
 * stated rather than hidden, because a blank field and an unpublished one look
 * the same to a member and only one of them is a reason to pick a different
 * company.
 */
function Detail({
  label,
  value,
  fallback,
  mono,
}: {
  label: string;
  value?: string;
  fallback: string;
  mono?: boolean;
}) {
  return (
    <p className="text-[12.5px] leading-relaxed text-gray-2">
      <span className="text-gray-2/70">{label}: </span>
      <span className={mono ? "mono text-cream" : "text-cream"}>
        {value || fallback}
      </span>
    </p>
  );
}

export default function VerifyForm({
  balance,
  cost,
  purpose,
}: {
  balance: number | null;
  cost: number;
  purpose: VerifyPurpose;
}) {
  const t = useTranslations("verification");
  const isBusiness = purpose === "member_business";
  const copy = PURPOSE_COPY[purpose];

  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [vat, setVat] = useState("");
  // The member-business path requires an explicit attestation that this is the
  // business they represent, before a badge-granting check is run (blueprint P10).
  const [attested, setAttested] = useState(false);

  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  // The company the member picked when several matched the name, held as the
  // registration number because that is what identifies it to the register.
  const [picked, setPicked] = useState("");
  const [resuming, setResuming] = useState(false);

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
    if (isBusiness && !attested) {
      setError("Please confirm this is the business you represent.");
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
          purpose,
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

  /**
   * The member picked which company they meant. This FINISHES the verification
   * they already paid for: it carries the existing verification id, and the
   * server resumes that same case rather than opening a new one. No credits are
   * spent, which is why nothing here looks at the balance.
   */
  async function onSelect() {
    if (resuming || !outcome) return;
    if (!picked) {
      setError(t("request.select.errors.pick"));
      return;
    }

    setError("");
    setResuming(true);
    try {
      const res = await fetch("/api/verification/select", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ verificationId: outcome.id, regNumber: picked }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.status === 401) throw new Error(t("request.errors.signIn"));
      if (res.status === 429) throw new Error(t("request.errors.rateLimit"));
      if (res.status === 404) throw new Error(t("request.select.errors.notFound"));
      if (res.status === 409)
        throw new Error(t("request.select.errors.notSelectable"));
      if (res.status === 400 && body?.error === "unknown_candidate") {
        throw new Error(t("request.select.errors.unknownCandidate"));
      }
      if (!res.ok || !body?.id) throw new Error(t("request.select.errors.generic"));

      setPicked("");
      setOutcome(body as Outcome);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : t("request.select.errors.generic"),
      );
    } finally {
      setResuming(false);
    }
  }

  function reset() {
    setOutcome(null);
    setStatus("idle");
    setError("");
    setPicked("");
    setName("");
    setCountry("");
    setRegNumber("");
    setVat("");
    setAttested(false);
  }

  // Several companies carry that name, so the check is paused on the member's
  // answer rather than sent to the desk. Everything needed to tell twenty
  // similar names apart is on the screen: name, number, status, incorporation
  // date and registered address.
  if (status === "done" && outcome?.status === "needs_selection") {
    const candidates = outcome.candidates ?? [];
    const total = outcome.candidateTotal ?? candidates.length;
    const capped = total > candidates.length;

    return (
      <div className="glass p-8">
        <ListChecks className="h-8 w-8 text-gold" />
        <h2
          className="serif text-white mt-5"
          style={{ fontSize: 26, fontWeight: 500 }}
        >
          {t("request.select.title")}
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-gray-2">
          {t("request.select.body")}
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-gold">
          {t("request.select.noCharge")}
        </p>

        <p className="mt-5 text-[12.5px] text-gray-2">
          {capped
            ? t("request.select.capped", { total, shown: candidates.length })
            : t("request.select.count", { count: total })}
        </p>

        <ul className="mt-5 grid gap-3">
          {candidates.map((c, i) => {
            const usable = Boolean(c.regNumber);
            const chosen = usable && picked === c.regNumber;
            return (
              <li key={`${c.regNumber ?? "no-number"}-${i}`}>
                <label
                  className={`flex gap-3 rounded-xl border p-4 ${
                    usable ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                  } ${
                    chosen
                      ? "border-gold bg-gold/10"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <input
                    type="radio"
                    name="candidate"
                    className="mt-1 accent-gold"
                    value={c.regNumber ?? ""}
                    checked={chosen}
                    disabled={!usable}
                    onChange={() => {
                      setPicked(c.regNumber ?? "");
                      setError("");
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] leading-snug text-cream">
                      {c.companyName ?? t("request.select.unknown")}
                    </p>
                    <div className="mt-2 grid gap-1">
                      <Detail
                        label={t("request.select.numberLabel")}
                        value={c.regNumber}
                        fallback={t("request.select.unknown")}
                        mono
                      />
                      <Detail
                        label={t("request.select.statusLabel")}
                        value={c.status?.replace(/[-_]/g, " ")}
                        fallback={t("request.select.unknown")}
                      />
                      <Detail
                        label={t("request.select.incorporatedLabel")}
                        value={c.incorporationDate}
                        fallback={t("request.select.unknown")}
                      />
                      <Detail
                        label={t("request.select.addressLabel")}
                        value={c.address}
                        fallback={t("request.select.unknown")}
                      />
                    </div>
                    {!usable && (
                      <p className="mt-2 text-[11.5px] leading-relaxed text-gray-2">
                        {t("request.select.noNumber")}
                      </p>
                    )}
                  </div>
                </label>
              </li>
            );
          })}
        </ul>

        {error && <p className="mt-5 text-sm text-red-400">{error}</p>}

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onSelect}
            disabled={resuming || !picked}
            className="btn-gold disabled:opacity-60"
          >
            <ShieldCheck className="h-4 w-4" />
            {resuming
              ? t("request.select.working")
              : t("request.select.continue")}
          </button>
          <button type="button" onClick={reset} className="btn-ghost-light">
            {t("request.select.startOver")}
          </button>
        </div>
      </div>
    );
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
        <p className="mt-4 text-[12.5px] leading-relaxed text-gray-2">
          {copy.resultNote}
        </p>
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

      {/* What this check is for, stated plainly, and for the business path an
          explicit attestation before a badge-granting check runs. */}
      <p className="mt-6 text-[12.5px] leading-relaxed text-gray-2">{copy.note}</p>
      {isBusiness && copy.attest && (
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <input
            type="checkbox"
            className="mt-0.5 accent-gold"
            checked={attested}
            onChange={(e) => {
              setAttested(e.target.checked);
              setError("");
            }}
          />
          <span className="text-[13.5px] leading-relaxed text-cream">
            {copy.attest}
          </span>
        </label>
      )}

      {error && <p className="mt-5 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={status === "sending" || short || (isBusiness && !attested)}
        className="btn-gold mt-7 w-full justify-center disabled:opacity-60"
      >
        <ShieldCheck className="h-4 w-4" />
        {status === "sending" ? t("request.working") : t("request.submit")}
      </button>
    </form>
  );
}
