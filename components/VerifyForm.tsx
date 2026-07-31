"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { COUNTRIES } from "@/lib/countries";
import { MEMBER_BUSINESS_ATTESTATION } from "@/lib/verification/purpose";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";

/** What this check is for. Only 'member_business' can move the member's badge. */
export type VerifyPurpose = "member_business" | "counterparty_check";

/**
 * The verification request form (Block B), in the Ponte Desk generation.
 *
 * The chrome changed; the rules did not. The purposes, the attestation gate, the
 * credit cost stated before anything is spent on a PAID counterparty check
 * (a member-business check is free and shows none of it), the 401/402/429 paths, the
 * candidate disambiguation that resumes the case already paid for, and the
 * three outcomes are exactly as they were. Verified, review and failed keep the
 * reserved semantic colours rather than gold, because gold is a brand signal
 * here and never a verification status.
 *
 * Every control below is a Desk primitive: the fields are the Desk's own field
 * treatment, the actions are `fbtn` and `b`, the outcome sits on a raised
 * record surface with a reserved status rule. Nothing here is a local
 * imitation of a control that already exists.
 *
 * Block E folds the remaining English lines into the message fragments; the
 * rest already reads the `verification` namespace.
 */
const PURPOSE_COPY: Record<
  VerifyPurpose,
  { attest?: string; note: string; resultNote: string }
> = {
  member_business: {
    attest: MEMBER_BUSINESS_ATTESTATION.text,
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
    <p className="vcand__f">
      <span className="vcand__fk">{label}: </span>
      <span className={mono ? "vcand__fv mono" : "vcand__fv"}>
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
  /**
   * What this check costs, or null when it is free. Verifying the member's own
   * business is free (ADR-0018, Issue #135): the page passes null, and no
   * balance, cost, shortfall or top-up affordance is rendered for it.
   */
  cost: number | null;
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

  // A free check has no cost, so it can never be short of credits.
  const isPaid = cost !== null;
  const short = isPaid && balance !== null && balance < cost;

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
          // Sent only as a real boolean, and only true once the member has
          // ticked the attestation. The server requires it for member_business.
          attestation: isBusiness ? attested === true : false,
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
      <section className="vres">
        <div className="vres__head">
          <span className="vres__eb">{t("request.select.count", { count: total })}</span>
          <h2 className="vres__t">
            <PonteIcon name="profile.company" size={18} />
            {t("request.select.title")}
          </h2>
        </div>
        <p className="vres__p">{t("request.select.body")}</p>
        <p className="vres__free">{t("request.select.noCharge")}</p>

        {capped && (
          <p className="vres__meta">
            {t("request.select.capped", { total, shown: candidates.length })}
          </p>
        )}

        <ul className="vcands">
          {candidates.map((c, i) => {
            const usable = Boolean(c.regNumber);
            const chosen = usable && picked === c.regNumber;
            return (
              <li key={`${c.regNumber ?? "no-number"}-${i}`}>
                <label
                  className={`vcand${chosen ? " is-picked" : ""}${usable ? "" : " is-off"}`}
                >
                  <input
                    type="radio"
                    name="candidate"
                    className="vcand__r"
                    value={c.regNumber ?? ""}
                    checked={chosen}
                    disabled={!usable}
                    onChange={() => {
                      setPicked(c.regNumber ?? "");
                      setError("");
                    }}
                  />
                  <span className="vcand__b">
                    <span className="vcand__n">
                      {c.companyName ?? t("request.select.unknown")}
                    </span>
                    <span className="vcand__fs">
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
                    </span>
                    {!usable && (
                      <span className="vcand__off">{t("request.select.noNumber")}</span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        {error && <p className="verr">{error}</p>}

        <div className="vacts">
          <button
            type="button"
            onClick={onSelect}
            disabled={resuming || !picked}
            className="fbtn"
          >
            {resuming
              ? t("request.select.working")
              : t("request.select.continue")}
          </button>
          <button type="button" onClick={reset} className="fbtn fbtn--secondary">
            {t("request.select.startOver")}
          </button>
        </div>
      </section>
    );
  }

  if (status === "done" && outcome) {
    const verified = outcome.status === "auto_verified";
    const review = outcome.status === "review";
    // The outcome tone is a reserved semantic, never the brand gold.
    const tone = verified ? "is-pos" : review ? "is-review" : "is-neg";

    return (
      <section className={`vres vres--out ${tone}`}>
        <div className="vres__head">
          {/* The status rule and the heading carry the outcome between them;
              an eyebrow here would only repeat the heading. */}
          <h2 className="vres__t">
            {verified
              ? t("request.result.verifiedTitle")
              : review
                ? t("request.result.reviewTitle")
                : t("request.result.failedTitle")}
          </h2>
        </div>
        <p className="vres__p">
          {verified
            ? t("request.result.verifiedBody")
            : review
              ? t("request.result.reviewBody")
              : t("request.result.failedBody")}
        </p>
        {outcome.reason && (
          <div className="vreason">
            <span className="vreason__l">{t("request.result.reasonLabel")}</span>
            <p className="vreason__p">{outcome.reason}</p>
          </div>
        )}
        <p className="vres__meta">{copy.resultNote}</p>
        <div className="vacts">
          <button type="button" onClick={reset} className="b">
            {t("request.result.again")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="vform">
      {/* Balance and price, stated before anything is spent, on the PAID path
          only. Verifying the member's own business is free (ADR-0018, Issue
          #135): it shows no balance, no cost, no shortfall and no top-up, and
          says plainly that it is free instead. */}
      {isPaid ? (
        <>
          <div className="vbal">
            <span className="vbal__l mono">{t("request.balance.label")}</span>
            <span className="vbal__n">{balance ?? "-"}</span>
            <span className="vbal__u">{t("request.balance.unit")}</span>
            <span className="vbal__c mono">{t("request.balance.cost", { cost })}</span>
          </div>

          {short && (
            <div className="notice vshort">
              <PonteIcon name="evidence.evreview" size={18} />
              <div>
                <b>{t("request.balance.short")}</b>
                <div className="vshort__a">
                  <Link href="/pricing" className="b b--2">
                    {t("request.balance.topUp")}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="vfree">
          Verifying the business you represent is free. It is separate from a
          paid check on another company.
        </p>
      )}

      <div className="vfields">
        <div>
          <label className="vlabel" htmlFor="v-name">
            {t("request.fields.nameLabel")}
          </label>
          <input
            id="v-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            placeholder={t("request.fields.namePlaceholder")}
            className="vfield"
          />
        </div>

        <div>
          <label className="vlabel" htmlFor="v-country">
            {t("request.fields.countryLabel")}
          </label>
          <select
            id="v-country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="vfield"
          >
            <option value="">{t("request.fields.countryPlaceholder")}</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="vpair">
          <div>
            <label className="vlabel" htmlFor="v-reg">
              {t("request.fields.regLabel")}
              <span className="vopt">{t("request.fields.optional")}</span>
            </label>
            <input
              id="v-reg"
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              maxLength={60}
              placeholder={t("request.fields.regPlaceholder")}
              className="vfield"
            />
            <p className="vhint">{t("request.fields.regHint")}</p>
          </div>

          <div>
            <label className="vlabel" htmlFor="v-vat">
              {t("request.fields.vatLabel")}
              <span className="vopt">{t("request.fields.optional")}</span>
            </label>
            <input
              id="v-vat"
              value={vat}
              onChange={(e) => setVat(e.target.value)}
              maxLength={40}
              placeholder={t("request.fields.vatPlaceholder")}
              className="vfield"
            />
            <p className="vhint">{t("request.fields.vatHint")}</p>
          </div>
        </div>
      </div>

      {/* What this check is for, stated plainly, and for the business path an
          explicit attestation before a badge-granting check runs. */}
      <p className="vnote">{copy.note}</p>
      {isBusiness && copy.attest && (
        <label className="vattest">
          <input
            type="checkbox"
            checked={attested}
            onChange={(e) => {
              setAttested(e.target.checked);
              setError("");
            }}
          />
          <span>{copy.attest}</span>
        </label>
      )}

      {error && <p className="verr">{error}</p>}

      <button
        type="submit"
        disabled={status === "sending" || short || (isBusiness && !attested)}
        className="fbtn fbtn--block vsubmit"
      >
        {status === "sending" ? t("request.working") : t("request.submit")}
      </button>
    </form>
  );
}
