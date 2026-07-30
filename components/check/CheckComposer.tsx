"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import AccountGate from "@/components/AccountGate";
import CountryPicker from "@/components/CountryPicker";
import JourneyBack from "@/components/ponte/nav/JourneyBack";
import type { EvidenceReceipt, CheckResult } from "@/lib/check/receipt";

type Purpose = "member_business" | "counterparty_check";
type Candidate = {
  companyName?: string;
  regNumber?: string;
  status?: string;
  incorporationDate?: string;
  address?: string;
  jurisdiction?: string;
};
type Step =
  | "identify" // K01
  | "candidates" // K02
  | "purpose" // K03
  | "preview" // K04 (member) / K05 (counterparty)
  | "running" // K06
  | "receipt" // K07
  | "more_info" // K08
  | "unavailable"; // K09

// The named sources, stated plainly. Directors/officers are screened, NOT
// beneficial owners: the receipt never claims ownership was traced.
const SOURCES = [
  "Company registry (Companies House or OpenCorporates)",
  "VAT number (EU VIES)",
  "Sanctions lists (OFAC, EU, UN, UK OFSI)",
  "The company's named directors and officers, screened against those lists",
];

const RESULT_LABEL: Record<CheckResult, string> = {
  confirmed: "Confirmed",
  no_match: "No match",
  possible_match: "Review",
  not_confirmed: "Not confirmed",
  unavailable: "Unavailable",
};
const RESULT_PILL: Record<CheckResult, string> = {
  confirmed: "vpill--ok",
  no_match: "vpill--ok",
  possible_match: "vpill--warn",
  not_confirmed: "vpill--none",
  unavailable: "vpill--warn",
};

export default function CheckComposer({ cost }: { cost: number }) {
  const router = useRouter();
  const tj = useTranslations("journey");

  const [company, setCompany] = useState("");
  const [country, setCountry] = useState(""); // ISO alpha-2
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [attested, setAttested] = useState(false);

  const [stack, setStack] = useState<Step[]>(["identify"]);
  const step = stack[stack.length - 1];
  const go = (s: Step) => setStack((st) => [...st, s]);
  const replace = (s: Step) => setStack((st) => [...st.slice(0, -1), s]);
  const back = () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));

  // K02 candidates
  const [cands, setCands] = useState<Candidate[]>([]);
  const [candTotal, setCandTotal] = useState(0);
  const [candLoading, setCandLoading] = useState(false);
  const [candReason, setCandReason] = useState<string | null>(null);

  // Run + gate + outcome
  const [verId, setVerId] = useState("");
  const [receipt, setReceipt] = useState<EvidenceReceipt | null>(null);
  const [receiptStatus, setReceiptStatus] = useState("");
  const [failReason, setFailReason] = useState("");
  const [gateOpen, setGateOpen] = useState(false);
  const pending = useRef(false);
  const ran = useRef(false);

  // Voice (K01), a first-class alternative to typing the name.
  const [voiceOk, setVoiceOk] = useState(false);
  const [listening, setListening] = useState(false);
  useEffect(() => {
    setVoiceOk(
      typeof window !== "undefined" &&
        ("SpeechRecognition" in window || "webkitSpeechRecognition" in window),
    );
  }, []);
  const sayName = useCallback(() => {
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => any }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = document.documentElement.lang || "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListening(true);
    rec.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript ?? "";
      if (text) setCompany(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  }, []);

  // K02: free registry search, before any gate or spend.
  const findCandidates = useCallback(async () => {
    setCandLoading(true);
    setCandReason(null);
    setCands([]);
    try {
      const res = await fetch("/api/verification/candidates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: company.trim(), country }),
      }).catch(() => null);
      const data = res && res.ok ? await res.json().catch(() => null) : null;
      if (data?.ok) {
        setCands(data.candidates ?? []);
        setCandTotal(data.candidateTotal ?? (data.candidates?.length ?? 0));
        setCandReason((data.candidates?.length ?? 0) === 0 ? data.reason ?? "no_match" : null);
      } else {
        setCandReason(data?.reason ?? "lookup_failed");
      }
    } finally {
      setCandLoading(false);
    }
  }, [company, country]);

  const openCandidates = () => {
    go("candidates");
    void findCandidates();
  };

  // K06: run the checks. On 401 the account/credits gate opens here, and only
  // here; K01-K05 happened before any account or spend.
  const runCheck = useCallback(async () => {
    if (!candidate || !purpose) return;
    try {
      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: candidate.companyName || company.trim(),
          country,
          regNumber: candidate.regNumber ?? "",
          purpose,
          attestation: purpose === "member_business" ? attested : false,
        }),
      });
      if (res.status === 401) {
        pending.current = true;
        setGateOpen(true);
        return;
      }
      const outcome = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 402) {
        setFailReason(outcome?.error ?? "The check could not be completed.");
        replace("unavailable");
        return;
      }
      if (res.status === 402) {
        setFailReason("You do not have enough verification credits for this check.");
        replace("unavailable");
        return;
      }
      await resolveOutcome(outcome);
    } catch {
      setFailReason("The check could not be completed. Please try again.");
      replace("unavailable");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate, purpose, company, country, attested]);

  const fetchReceipt = useCallback(async (id: string) => {
    setVerId(id);
    const res = await fetch(`/api/verification/${id}`).catch(() => null);
    const data = res && res.ok ? await res.json().catch(() => null) : null;
    if (data?.ok && data.receipt) {
      setReceipt(data.receipt as EvidenceReceipt);
      setReceiptStatus(data.status ?? "");
      replace("receipt");
    } else {
      setFailReason("The evidence receipt could not be loaded.");
      replace("unavailable");
    }
  }, []);

  const resolveOutcome = useCallback(
    async (outcome: {
      id?: string;
      status?: string;
      reason?: string;
      candidates?: Candidate[];
      candidateTotal?: number;
    }) => {
      if (outcome.status === "needs_selection") {
        setVerId(outcome.id ?? "");
        setCands(outcome.candidates ?? []);
        setCandTotal(outcome.candidateTotal ?? (outcome.candidates?.length ?? 0));
        replace("more_info");
        return;
      }
      if (outcome.status === "auto_verified" || outcome.status === "review") {
        if (outcome.id) await fetchReceipt(outcome.id);
        return;
      }
      // failed
      setFailReason(outcome.reason ?? "The check could not be completed.");
      replace("unavailable");
    },
    [fetchReceipt],
  );

  const startRun = () => {
    go("running");
    void runCheck();
  };

  // Closing the gate without completing sign-in must not strand the visitor
  // on the K06 spinner: startRun() already pushed "running" before the 401
  // response opened the gate, and the back button is deliberately hidden on
  // that step. Step back to the preview and clear the pending run so "Run the
  // checks" works again.
  const closeGate = useCallback(() => {
    setGateOpen(false);
    if (pending.current) {
      pending.current = false;
      replace("preview");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onGateComplete = useCallback(async () => {
    if (ran.current) return;
    ran.current = true;
    setGateOpen(false);
    if (pending.current) {
      pending.current = false;
      await runCheck();
    }
    ran.current = false;
  }, [runCheck]);

  // K08: the member picked which company they meant. Finishes the already-paid
  // case; spends nothing further.
  const resumeWith = useCallback(
    async (regNumber?: string) => {
      if (!verId || !regNumber) return;
      replace("running");
      try {
        const res = await fetch("/api/verification/select", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ verificationId: verId, regNumber }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.outcome) {
          await resolveOutcome(data.outcome);
        } else {
          setFailReason("Could not continue the check.");
          replace("unavailable");
        }
      } catch {
        setFailReason("Could not continue the check.");
        replace("unavailable");
      }
    },
    [verId, resolveOutcome],
  );

  const stepMark = (s: Step): string => {
    const base: Partial<Record<Step, string>> = {
      identify: "K01",
      candidates: "K02",
      purpose: "K03",
      running: "K06",
      receipt: "K07",
      more_info: "K08",
      unavailable: "K09",
    };
    if (s === "preview") return purpose === "counterparty_check" ? "K05" : "K04";
    return base[s] ?? "";
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <div className="vbar">
        {stack.length > 1 && step !== "running" ? (
          <JourneyBack onClick={back} label={tj("back")} />
        ) : (
          <span className="vbar__title">Check &amp; Verify</span>
        )}
        {stepMark(step) && <span className="vbar__step">{stepMark(step)}</span>}
      </div>

      <div className="vmain">
        {step === "identify" && (
          <IdentifyStep
            company={company}
            setCompany={setCompany}
            country={country}
            setCountry={setCountry}
            voiceOk={voiceOk}
            listening={listening}
            onVoice={sayName}
            onNext={openCandidates}
          />
        )}

        {step === "candidates" && (
          <CandidatesStep
            loading={candLoading}
            cands={cands}
            total={candTotal}
            reason={candReason}
            onPick={(c) => {
              setCandidate(c);
              go("purpose");
            }}
            onRefine={back}
          />
        )}

        {step === "purpose" && (
          <PurposeStep
            purpose={purpose}
            onPick={(p) => {
              setPurpose(p);
              setAttested(false);
              go("preview");
            }}
          />
        )}

        {step === "preview" && candidate && purpose && (
          <PreviewStep
            candidate={candidate}
            purpose={purpose}
            cost={cost}
            attested={attested}
            setAttested={setAttested}
            onRun={startRun}
          />
        )}

        {step === "running" && <RunningStep />}

        {step === "receipt" && receipt && (
          <ReceiptStep
            receipt={receipt}
            status={receiptStatus}
            purpose={purpose}
            // The check is already saved server-side the moment it ran; there is
            // no separate save/attach action to perform here. member_business
            // sends the member to /account, where their verification status
            // actually appears; counterparty_check has no dedicated view yet, so
            // it returns to the general workspace rather than claiming one.
            onDone={() => router.push(purpose === "member_business" ? "/account" : "/workspace")}
          />
        )}

        {step === "more_info" && (
          <MoreInfoStep cands={cands} total={candTotal} onPick={(c) => resumeWith(c.regNumber)} onRefine={() => replace("identify")} />
        )}

        {step === "unavailable" && (
          <UnavailableStep reason={failReason} onRefine={() => replace("identify")} />
        )}
      </div>

      <AccountGate open={gateOpen} context="verify" onClose={closeGate} onComplete={onGateComplete} />
    </div>
  );
}

// ---- K01 identify ----------------------------------------------------------
function IdentifyStep({
  company,
  setCompany,
  country,
  setCountry,
  voiceOk,
  listening,
  onVoice,
  onNext,
}: {
  company: string;
  setCompany: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  voiceOk: boolean;
  listening: boolean;
  onVoice: () => void;
  onNext: () => void;
}) {
  const ready = company.trim().length > 1 && /^[A-Z]{2}$/.test(country);
  return (
    <section className="vstep">
      <div className="fphead__eb">
        <span className="fphead__rule" aria-hidden="true" />
        <span className="eyebrow">Check &amp; Verify</span>
      </div>
      <h1 className="fphead__h serif">Which company?</h1>
      <p className="vsub">
        Name the company. It is the one thing you type here; everything after is a tap. You can say
        it instead.
      </p>

      <div className="vfieldrow">
        <input
          className="vfield"
          type="text"
          value={company}
          placeholder="Company name"
          aria-label="Company name"
          onChange={(e) => setCompany(e.target.value)}
        />
        {voiceOk && (
          <button
            type="button"
            className={`fchip${listening ? " is-listening" : ""}`}
            aria-pressed={listening}
            onClick={onVoice}
          >
            🎙 Say the name
          </button>
        )}
      </div>

      <p className="eyebrow" style={{ marginTop: 28 }}>
        Country of registration
      </p>
      <div style={{ marginTop: 10 }}>
        <CountryPicker value={country} onChange={setCountry} />
      </div>

      <div style={{ marginTop: 28 }}>
        <button className="fbtn fbtn--lg" disabled={!ready} onClick={onNext}>
          Find the company →
        </button>
      </div>
    </section>
  );
}

// ---- K02 candidates --------------------------------------------------------
function CandidatesStep({
  loading,
  cands,
  total,
  reason,
  onPick,
  onRefine,
}: {
  loading: boolean;
  cands: Candidate[];
  total: number;
  reason: string | null;
  onPick: (c: Candidate) => void;
  onRefine: () => void;
}) {
  return (
    <section className="vstep">
      <div className="fphead__eb">
        <span className="fphead__rule" aria-hidden="true" />
        <span className="eyebrow">Pick the entity</span>
      </div>
      <h1 className="fphead__h serif">Which legal entity?</h1>
      <p className="vsub">This is a free look-up. Nothing is checked or charged until you choose why and confirm.</p>

      {loading ? (
        <p className="vrun__s">Searching the register...</p>
      ) : cands.length > 0 ? (
        <>
          <div className="vledger">
            {cands.map((c, i) => (
              <button key={`${c.regNumber ?? i}`} type="button" className="vcand" onClick={() => onPick(c)}>
                <span className="vcand__n">
                  {c.companyName ?? "Unnamed company"}
                  {c.status ? ` · ${c.status}` : ""}
                </span>
                <span className="vcand__m">{c.regNumber ?? c.jurisdiction ?? ""}</span>
              </button>
            ))}
          </div>
          {total > cands.length && (
            <p className="vsub" style={{ marginTop: 14 }}>
              The register holds {total}. Showing the first {cands.length}; refine the name if yours is not here.
            </p>
          )}
        </>
      ) : (
        <div className="vnote">
          No matching company was found for that name and country. Refine the name or country and try again.
          {reason && reason !== "no_match" ? ` (${reason})` : ""}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <button className="fbtn fbtn--ghost" onClick={onRefine}>
          Refine the name or country
        </button>
      </div>
    </section>
  );
}

// ---- K03 purpose -----------------------------------------------------------
function PurposeStep({ purpose, onPick }: { purpose: Purpose | null; onPick: (p: Purpose) => void }) {
  return (
    <section className="vstep">
      <div className="fphead__eb">
        <span className="fphead__rule" aria-hidden="true" />
        <span className="eyebrow">Why are you checking?</span>
      </div>
      <h1 className="fphead__h serif">What is this for?</h1>
      <p className="vsub">The two are different, not just in wording. Choose the one that fits.</p>

      <div className="vopts">
        <button
          className="vopt"
          aria-pressed={purpose === "member_business"}
          onClick={() => onPick("member_business")}
        >
          <span className="vopt__t">Verify my business</span>
          <span className="vopt__d">
            This is the business you represent. A pass can raise your own status, shown on your account.
            You will confirm you represent it.
          </span>
        </button>
        <button
          className="vopt"
          aria-pressed={purpose === "counterparty_check"}
          onClick={() => onPick("counterparty_check")}
        >
          <span className="vopt__t">Check a counterparty</span>
          <span className="vopt__d">
            Someone else you are dealing with. This is private to you. It never changes your status or
            theirs.
          </span>
        </button>
      </div>
    </section>
  );
}

// ---- K04 / K05 preview -----------------------------------------------------
function PreviewStep({
  candidate,
  purpose,
  cost,
  attested,
  setAttested,
  onRun,
}: {
  candidate: Candidate;
  purpose: Purpose;
  cost: number;
  attested: boolean;
  setAttested: (v: boolean) => void;
  onRun: () => void;
}) {
  const isMember = purpose === "member_business";
  const ready = !isMember || attested;
  return (
    <section className="vstep">
      <div className="fphead__eb">
        <span className="fphead__rule" aria-hidden="true" />
        <span className="eyebrow">{isMember ? "Verify my business" : "Counterparty check"}</span>
      </div>
      <h1 className="fphead__h serif">Before anything runs</h1>
      <p className="vsub">
        {isMember
          ? "This verifies the business you represent. A pass can raise your status, shown on your account."
          : "This is private to you. It never affects your status or the counterparty's."}
      </p>

      <p className="eyebrow" style={{ marginTop: 8 }}>
        Subject
      </p>
      <div className="vledger">
        <div className="vrow">
          <span className="vrow__k">{candidate.companyName ?? "Company"}</span>
          <span className="vrow__v">{candidate.regNumber ?? ""}</span>
        </div>
      </div>

      <p className="eyebrow" style={{ marginTop: 20 }}>
        What is checked, against named sources
      </p>
      <ul className="vunknown" style={{ marginTop: 10 }}>
        {SOURCES.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>

      <p className="eyebrow" style={{ marginTop: 20 }}>
        Cost and limits
      </p>
      <div className="vledger">
        <div className="vrow">
          <span className="vrow__k">Cost</span>
          <span className="vrow__v">
            {cost} verification credit{cost === 1 ? "" : "s"}
          </span>
        </div>
        <div className="vrow">
          <span className="vrow__k">What it cannot promise</span>
          <span className="vrow__v" style={{ maxWidth: "60%" }}>
            evidence, not a guarantee
          </span>
        </div>
      </div>
      <div className="vnote">
        The result is a dated record of what was checked, against which named source, and on what date,
        with what remains unknown stated plainly. It is never a score or a badge, and does not remove
        the need for your own due diligence.
      </div>

      {isMember && (
        <button
          type="button"
          className="vcheckbox"
          aria-pressed={attested}
          onClick={() => setAttested(!attested)}
        >
          <span className="vcheckbox__box" aria-hidden="true">
            {attested ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
          </span>
          <span>I confirm I represent this business and am authorised to verify it.</span>
        </button>
      )}

      <div style={{ marginTop: 24 }}>
        <button className="fbtn fbtn--lg" disabled={!ready} onClick={onRun}>
          Run the checks →
        </button>
      </div>
      <p className="vsub" style={{ marginTop: 12, fontSize: 13 }}>
        You will sign in and spend credits only now, when the checks actually run.
      </p>
    </section>
  );
}

// ---- K06 running -----------------------------------------------------------
function RunningStep() {
  return (
    <section className="vrun">
      <div className="vrun__dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <p className="vrun__s">Checking against the named sources...</p>
    </section>
  );
}

// ---- K07 receipt -----------------------------------------------------------
function ReceiptStep({
  receipt,
  status,
  purpose,
  onDone,
}: {
  receipt: EvidenceReceipt;
  status: string;
  purpose: Purpose | null;
  onDone: () => void;
}) {
  const isMember = purpose === "member_business";
  return (
    <section className="vstep">
      <div className="fphead__eb">
        <span className="fphead__rule" aria-hidden="true" />
        <span className="eyebrow">
          Evidence receipt{receipt.checkedOn ? ` · ${receipt.checkedOn}` : ""}
        </span>
      </div>
      <h1 className="fphead__h serif">{receipt.subject}</h1>
      <p className="vsub">
        {status === "review"
          ? "Checked, but not fully confirmed. Here is exactly what was and was not established."
          : "Here is exactly what was checked, against which source, and when."}
      </p>

      {receipt.checks.map((c) => (
        <div className="vcheck" key={c.key}>
          <div className="vcheck__top">
            <span className="vcheck__l">{c.label}</span>
            <span className={`vpill ${RESULT_PILL[c.result]}`}>{RESULT_LABEL[c.result]}</span>
          </div>
          <div className="vcheck__meta">
            {[c.source, c.checkedOn ? `checked ${c.checkedOn}` : null, c.detail]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
      ))}

      <p className="eyebrow" style={{ marginTop: 24 }}>
        What remains unknown
      </p>
      <ul className="vunknown" style={{ marginTop: 10 }}>
        {receipt.unknowns.map((u, i) => (
          <li key={i}>{u}</li>
        ))}
      </ul>

      <div className="vactions">
        <button className="fbtn fbtn--lg" onClick={onDone}>
          {isMember ? "View my account" : "Back to my workspace"}
        </button>
        <button className="fbtn fbtn--ghost" onClick={() => window.print()}>
          Print or save as PDF
        </button>
      </div>
    </section>
  );
}

// ---- K08 more info needed --------------------------------------------------
function MoreInfoStep({
  cands,
  total,
  onPick,
  onRefine,
}: {
  cands: Candidate[];
  total: number;
  onPick: (c: Candidate) => void;
  onRefine: () => void;
}) {
  return (
    <section className="vstep">
      <div className="fphead__eb">
        <span className="fphead__rule" aria-hidden="true" />
        <span className="eyebrow">More information needed</span>
      </div>
      <h1 className="fphead__h serif">Which one did you mean?</h1>
      <p className="vsub">
        The name matched more than one company on the register. Pick the right one to finish the check.
        You have already paid for it; choosing does not cost anything more.
      </p>
      <div className="vledger">
        {cands.map((c, i) => (
          <button key={`${c.regNumber ?? i}`} type="button" className="vcand" onClick={() => onPick(c)}>
            <span className="vcand__n">
              {c.companyName ?? "Unnamed company"}
              {c.status ? ` · ${c.status}` : ""}
            </span>
            <span className="vcand__m">{c.regNumber ?? ""}</span>
          </button>
        ))}
      </div>
      {total > cands.length && (
        <p className="vsub" style={{ marginTop: 14 }}>
          The register holds {total}; showing the first {cands.length}.
        </p>
      )}
      <div style={{ marginTop: 24 }}>
        <button className="fbtn fbtn--ghost" onClick={onRefine}>
          Refine the name or country
        </button>
      </div>
    </section>
  );
}

// ---- K09 unavailable / not confirmed --------------------------------------
function UnavailableStep({ reason, onRefine }: { reason: string; onRefine: () => void }) {
  return (
    <section className="vstep">
      <div className="fphead__eb">
        <span className="fphead__rule" aria-hidden="true" />
        <span className="eyebrow">Not confirmed</span>
      </div>
      <h1 className="fphead__h serif">This could not be confirmed</h1>
      <p className="vsub">
        {reason ||
          "A source could not be reached, or held no matching record. Nothing here says the company is bad, only that it was not confirmed on this run."}
      </p>
      <div className="vnote">
        Source unavailable means a register or list could not be reached, so it was not checked. Not
        confirmed means it was checked and held no matching record. The two are different, and neither
        is a verdict on the company.
      </div>
      <div style={{ marginTop: 24 }}>
        <button className="fbtn fbtn--lg" onClick={onRefine}>
          Refine the name or country
        </button>
      </div>
    </section>
  );
}
