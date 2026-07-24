"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import AccountGate from "@/components/AccountGate";
import {
  emptyDraft,
  openGaps,
  bucketize,
  blockers as computeBlockers,
  toSubmitPayload,
  type StructureDraft,
  type Intent,
  type CompletionField,
} from "@/lib/structure/draft";

// Tap vocabularies (from the design handoff). All selectable; no typing.
const INCOTERMS = ["EXW", "FOB", "CIF", "CFR", "DDP"];
const UNITS = ["MT", "kg", "containers", "TEU"];
const PAYMENTS = ["LC at sight", "LC 30d", "TT advance", "CAD", "Open account"];
const VALIDITIES = [7, 30, 60, 90];
const ROLES = ["Principal", "Producer", "Distributor", "Agent (mandated)", "Intermediary"];
const FREQS = ["Spot", "Monthly", "Quarterly", "Annual contract"];
const COUNTRIES: [string, string][] = [
  ["Brazil", "BR"], ["Argentina", "AR"], ["India", "IN"], ["China", "CN"],
  ["United States", "US"], ["Germany", "DE"], ["Netherlands", "NL"],
  ["United Arab Emirates", "AE"], ["Turkey", "TR"], ["Vietnam", "VN"],
  ["Thailand", "TH"], ["Nigeria", "NG"],
];

type Step = "intent" | "structuring" | "facts" | "complete" | "preview" | "submit" | "received" | "error";
type Chapter = { chapter: string; chapter_title: string };
type Heading = { heading: string; heading_title: string };
type Hit = { code: string; display: string; short_title: string | null };

const STEP_MARK: Partial<Record<Step, string>> = {
  intent: "S01", facts: "S02", complete: "S03", preview: "S04", submit: "S05", received: "S06",
};

export default function StructureComposer() {
  const t = useTranslations("structure");
  const router = useRouter();
  const [draft, setDraft] = useState<StructureDraft>(emptyDraft);
  const [stack, setStack] = useState<Step[]>(["intent"]);
  const step = stack[stack.length - 1];
  const set = (patch: Partial<StructureDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const go = (s: Step) => setStack((st) => [...st, s]);
  const replace = (s: Step) => setStack((st) => [...st.slice(0, -1), s]);
  const back = () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));

  // Submit + gate
  const [gateOpen, setGateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultRef, setResultRef] = useState("");
  const [savedDraft, setSavedDraft] = useState(false);
  const pending = useRef<boolean | null>(null);
  const ran = useRef(false);

  const doSend = useCallback(async (asDraft: boolean) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/marketplace/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSubmitPayload(draft, { draft: asDraft, nowIso: new Date().toISOString() })),
      });
      if (res.status === 401) {
        pending.current = asDraft;
        setGateOpen(true);
        return;
      }
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        replace("error");
        return;
      }
      setResultRef(j.ref ?? "");
      setSavedDraft(asDraft);
      replace("received");
    } finally {
      setSubmitting(false);
    }
  }, [draft]);

  const onGateComplete = useCallback(async () => {
    if (ran.current) return;
    ran.current = true;
    setGateOpen(false);
    await doSend(pending.current ?? false);
  }, [doSend]);

  return (
    <div className="ponte-find" style={{ minHeight: "100dvh" }}>
      <div className="sbar">
        {stack.length > 1 && step !== "received" ? (
          <button className="sbar__back" onClick={back} aria-label={t("bar.back")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        ) : (
          <span className="sbar__title serif">Ponte<span style={{ color: "var(--ink-3)", fontFamily: "var(--f-mono)", fontSize: 12 }}>.trade</span></span>
        )}
        {STEP_MARK[step] && <span className="sbar__step">{STEP_MARK[step]}</span>}
      </div>

      <div className="fmain">
        {step === "intent" && <IntentStep draft={draft} set={set} onNext={() => go("structuring")} t={t} />}
        {step === "structuring" && <Structuring onDone={() => replace("facts")} t={t} />}
        {step === "facts" && <FactsStep draft={draft} onComplete={() => go("complete")} onAdd={() => go("complete")} t={t} />}
        {step === "complete" && <CompleteStep draft={draft} set={set} onDone={() => go("preview")} t={t} />}
        {step === "preview" && <PreviewStep draft={draft} onNext={() => go("submit")} t={t} />}
        {step === "submit" && (
          <SubmitStep
            draft={draft}
            submitting={submitting}
            onSubmit={() => doSend(false)}
            onSaveDraft={() => doSend(true)}
            onResolve={() => back()}
            t={t}
          />
        )}
        {step === "received" && <ReceivedStep savedDraft={savedDraft} resultRef={resultRef} onWorkspace={() => router.push("/workspace")} t={t} />}
        {step === "error" && <ErrorStep onRetry={() => replace("submit")} t={t} />}
      </div>

      <footer className="ffoot">{t("trust")}</footer>

      <AccountGate open={gateOpen} context="publish" onClose={() => setGateOpen(false)} onComplete={onGateComplete} />
    </div>
  );
}

type T = ReturnType<typeof useTranslations>;

// ---- S01 intent -> product -------------------------------------------------
function IntentStep({ draft, set, onNext, t }: { draft: StructureDraft; set: (p: Partial<StructureDraft>) => void; onNext: () => void; t: T }) {
  const intents: { key: Intent; label: string; desc: string }[] = [
    { key: "requirement", label: t("intent.buy"), desc: t("intent.buyDesc") },
    { key: "offer", label: t("intent.sell"), desc: t("intent.sellDesc") },
    { key: "service", label: t("intent.service"), desc: t("intent.serviceDesc") },
  ];
  const ready = !!draft.intent && !!draft.product;
  return (
    <section className="sstep reveal">
      <div className="fphead__eb"><span className="fphead__rule" aria-hidden="true" /><span className="eyebrow">{t("intent.eyebrow")}</span></div>
      <h1 className="fphead__h serif">{t("intent.title")}</h1>
      <div className="tapopts" role="group" aria-label={t("intent.title")}>
        {intents.map((it) => (
          <button key={it.key} className="tapopt" aria-pressed={draft.intent === it.key} onClick={() => set({ intent: it.key })}>
            <span className="tapopt__t serif">{it.label}</span>
            <span className="tapopt__d">{it.desc}</span>
          </button>
        ))}
      </div>

      <div className={`prodblock${draft.intent ? " on" : ""}`}>
        <HsDrill draft={draft} set={set} t={t} />
        {draft.product && (
          <p className="orpick__t" style={{ marginTop: 16 }}>
            {t("intent.chosen")}: <b style={{ color: "var(--ink)" }}>{draft.product}</b>
            {draft.hsCode ? ` · HS ${draft.hsCode}` : ""}
          </p>
        )}
        <div style={{ marginTop: 24 }}>
          <button className="fbtn fbtn--lg" disabled={!ready} onClick={onNext}>{t("intent.cta")} →</button>
        </div>
      </div>
    </section>
  );
}

// The HS drill-down (chapter -> heading -> six-digit) with a search fallback.
function HsDrill({ draft, set, t }: { draft: StructureDraft; set: (p: Partial<StructureDraft>) => void; t: T }) {
  const [mode, setMode] = useState<"browse" | "search">("browse");
  const [level, setLevel] = useState<"chapters" | "headings" | "codes">("chapters");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [codes, setCodes] = useState<Hit[]>([]);
  const [chosen, setChosen] = useState<{ chapter?: Chapter; heading?: Heading }>({});
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const deb = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/hs/search?chapters=1").then((r) => r.json()).then((d) => setChapters(d?.chapters ?? [])).catch(() => {});
  }, []);

  const pick = useCallback((product: string, code: string) => {
    set({ product, hsCode: code, unit: draft.unit ?? "MT" });
    // Prefill the unit chip from the WCO unit when the code has one.
    fetch(`/api/hs/search?code=${code}`).then((r) => r.json()).then((d) => {
      const u = d?.code?.unit;
      if (typeof u === "string" && u.trim()) set({ unit: u.trim() });
    }).catch(() => {});
  }, [set, draft.unit]);

  useEffect(() => {
    if (deb.current) window.clearTimeout(deb.current);
    const q = query.trim();
    if (q.length < 2) { setHits([]); return; }
    deb.current = window.setTimeout(() => {
      fetch(`/api/hs/search?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((d) => setHits((d?.codes ?? []).slice(0, 10))).catch(() => setHits([]));
    }, 220);
  }, [query]);

  if (mode === "search") {
    return (
      <div>
        <div className="hscrumb"><button onClick={() => setMode("browse")}>{t("hs.browse")}</button></div>
        <input className="snote hssearch" style={{ minHeight: "auto", padding: "10px 12px" }} value={query} placeholder={t("hs.searchPlaceholder")} aria-label={t("hs.searchPlaceholder")} onChange={(e) => setQuery(e.target.value)} />
        {hits.map((h) => (
          <button key={h.code} className="hsrow leaf" onClick={() => pick(h.short_title ?? h.display, h.code)}>
            <span>{h.short_title ?? h.display}</span>
            <span className="hsrow__code">{h.code}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="orpick"><span className="orpick__t">{t("hs.choose")}</span><span className="orpick__n">{t("hs.catalogue")}</span></div>
      <div className="hscrumb">
        <button onClick={() => { setLevel("chapters"); setChosen({}); }}>{t("hs.all")}</button>
        {chosen.chapter && <><span>›</span><button onClick={() => { setLevel("headings"); setChosen({ chapter: chosen.chapter }); }}>{chosen.chapter.chapter_title}</button></>}
        {chosen.heading && <><span>›</span><span>{chosen.heading.heading_title}</span></>}
      </div>

      {level === "chapters" && (
        <div className="hsgrid">
          {chapters.map((c) => (
            <button key={c.chapter} className="hstile" onClick={() => {
              setChosen({ chapter: c });
              fetch(`/api/hs/search?chapter=${c.chapter}`).then((r) => r.json()).then((d) => { setHeadings(d?.headings ?? []); setLevel("headings"); }).catch(() => {});
            }}>
              {c.chapter_title}<span className="hstile__n">{c.chapter}</span>
            </button>
          ))}
        </div>
      )}
      {level === "headings" && headings.map((h) => (
        <button key={h.heading} className="hsrow" onClick={() => {
          setChosen((c) => ({ ...c, heading: h }));
          fetch(`/api/hs/search?heading=${h.heading}`).then((r) => r.json()).then((d) => { setCodes(d?.codes ?? []); setLevel("codes"); }).catch(() => {});
        }}>
          <span>{h.heading_title}</span><span className="hsrow__code">{h.heading} ›</span>
        </button>
      ))}
      {level === "codes" && codes.map((c) => (
        <button key={c.code} className={`hsrow leaf${draft.hsCode === c.code ? " is-picked" : ""}`} onClick={() => pick(c.short_title ?? c.display, c.code)}>
          <span>{c.short_title ?? c.display}</span><span className="hsrow__code">HS {c.code}</span>
        </button>
      ))}

      <button className="paste-toggle" onClick={() => setMode("search")}>{t("hs.searchInstead")}</button>
    </div>
  );
}

function Structuring({ onDone, t }: { onDone: () => void; t: T }) {
  const [msg, setMsg] = useState(0);
  const lines = [t("structuring.s1"), t("structuring.s2"), t("structuring.s3")];
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { onDone(); return; }
    const a = window.setInterval(() => setMsg((m) => Math.min(m + 1, lines.length - 1)), 620);
    const done = window.setTimeout(onDone, 1900);
    return () => { window.clearInterval(a); window.clearTimeout(done); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="structing sstep">
      <svg width="72" height="60" viewBox="0 0 120 90" aria-hidden="true">
        <path d="M22 78 L22 46 C22 24 98 24 98 46 L98 78" fill="none" stroke="var(--rule-strong)" strokeWidth="8" />
        <circle cx="60" cy="30" r="7" fill="var(--gold)" />
      </svg>
      <p className="structing__s">{lines[msg]}</p>
    </section>
  );
}

// ---- S02 facts & gaps ------------------------------------------------------
function FactsStep({ draft, onComplete, onAdd, t }: { draft: StructureDraft; onComplete: () => void; onAdd: () => void; t: T }) {
  const b = bucketize(draft);
  return (
    <section className="sstep reveal">
      <div className="fphead__eb"><span className="fphead__rule" aria-hidden="true" /><span className="eyebrow">{t("facts.eyebrow")}</span></div>
      <h1 className="fphead__h serif">{t("facts.reward", { facts: b.commercial.length, gaps: b.missing.length })}</h1>

      <Bucket label={t("facts.commercial")}>
        {b.commercial.map((k) => (
          <div className="sfact" key={k}><span className="sfact__k">{t(`field.${k}`)}</span><span className="sval sval--ok">✓ {t("facts.stated")}</span></div>
        ))}
      </Bucket>
      {b.missing.length > 0 && (
        <Bucket label={`${t("facts.missing")} · ${b.missing.length}`}>
          {b.missing.map((k) => (
            <div className="sfact" key={k}><span className="sfact__k">{t(`field.${k}`)}</span><button className="sval sval--add" onClick={onAdd}>{t("facts.add")} →</button></div>
          ))}
        </Bucket>
      )}
      <Bucket label={t("facts.evidence")}>
        {b.evidence.map((k) => (
          <div className="sfact" key={k}><span className="sfact__k">{t(`evidence.${k}`)}</span><span className="sval sval--ev">{t("facts.atReview")}</span></div>
        ))}
      </Bucket>
      <Bucket label={t("facts.private")}>
        {b.keptPrivate.map((k) => (
          <div className="sfact" key={k}><span className="sfact__k">{t(`private.${k}`)}</span><span className="sval sval--priv">{t("facts.withheld")}</span></div>
        ))}
      </Bucket>

      <div style={{ marginTop: 24 }}><button className="fbtn fbtn--lg fbtn--block" onClick={onComplete}>{t("facts.cta")}</button></div>
    </section>
  );
}

function Bucket({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bucket reveal-stagger">
      <div className="bucket__l">{label}</div>
      {children}
    </div>
  );
}

// ---- S03 progressive completion -------------------------------------------
function CompleteStep({ draft, set, onDone, t }: { draft: StructureDraft; set: (p: Partial<StructureDraft>) => void; onDone: () => void; t: T }) {
  const [queue] = useState<CompletionField[]>(() => openGaps(draft));
  const [i, setI] = useState(0);
  const field = queue[i];
  const total = queue.length;
  const next = () => (i + 1 < total ? setI(i + 1) : onDone());

  if (!field) { onDone(); return null; }

  return (
    <section className="sstep">
      <div className="fphead__eb"><span className="fphead__rule" aria-hidden="true" /><span className="eyebrow">{t("complete.eyebrow")}</span></div>
      <div className="readiness" style={{ margin: "12px 0 20px" }}>
        <div className="readiness__track"><div className="readiness__fill" style={{ width: `${(i / total) * 100}%` }} /></div>
        <span className="readiness__label">{t("complete.remaining", { n: total - i })}</span>
      </div>
      <div className="qwrap">
        <h2 className="q serif">{t(`ask.${field}`)}</h2>
        <QControl field={field} draft={draft} set={set} t={t} />
      </div>
      <div className="qnav">
        <button className="fbtn fbtn--ghost" onClick={next}>{t("complete.skip")}</button>
        <button className="fbtn" onClick={next}>{i + 1 < total ? t("complete.next") : t("complete.done")}</button>
      </div>
    </section>
  );
}

function QControl({ field, draft, set, t }: { field: CompletionField; draft: StructureDraft; set: (p: Partial<StructureDraft>) => void; t: T }) {
  const chips = (opts: string[], value: string | null, onPick: (v: string) => void) => (
    <div className="chiprow">{opts.map((o) => <button key={o} className="fchip" aria-pressed={value === o} onClick={() => onPick(o)}>{o}</button>)}</div>
  );
  switch (field) {
    case "quantity":
      return (
        <div>
          <div className="stepper">
            <button className="step" onClick={() => set({ quantity: Math.max(0, (draft.quantity ?? 10000) - 5000) })} aria-label="-">−</button>
            <span className="stepval">{(draft.quantity ?? 10000).toLocaleString()}</span>
            <button className="step" onClick={() => set({ quantity: (draft.quantity ?? 10000) + 5000 })} aria-label="+">+</button>
          </div>
          {chips(UNITS, draft.unit, (v) => set({ unit: v }))}
          {chips(FREQS, draft.frequency, (v) => set({ frequency: v }))}
        </div>
      );
    case "origin":
      return <div className="chiprow">{COUNTRIES.map(([n, iso]) => <button key={iso} className="fchip" aria-pressed={draft.origin === n} onClick={() => set({ origin: n })}><span style={{ color: "var(--gold-ink)" }}>{iso}</span> {n}</button>)}</div>;
    case "destination":
      return <div className="chiprow">{COUNTRIES.map(([n, iso]) => <button key={iso} className="fchip" aria-pressed={draft.destination === n} onClick={() => set({ destination: n })}><span style={{ color: "var(--gold-ink)" }}>{iso}</span> {n}</button>)}</div>;
    case "incoterm":
      return chips(INCOTERMS, draft.incoterm, (v) => set({ incoterm: v }));
    case "payment":
      return chips(PAYMENTS, draft.payment, (v) => set({ payment: v }));
    case "validity":
      return <div className="chiprow">{VALIDITIES.map((d) => <button key={d} className="spill" aria-pressed={draft.validityDays === d} onClick={() => set({ validityDays: d })}>{t("complete.days", { n: d })}</button>)}</div>;
    case "role":
      return chips(ROLES, draft.role, (v) => set({ role: v }));
    case "note":
      return <textarea className="snote" placeholder={t("ask.notePlaceholder")} value={draft.note ?? ""} onChange={(e) => set({ note: e.target.value })} />;
  }
}

// ---- S04 public / private / reviewer --------------------------------------
function PreviewStep({ draft, onNext, t }: { draft: StructureDraft; onNext: () => void; t: T }) {
  const [tab, setTab] = useState<"public" | "private" | "reviewer">("public");
  const ns = t("field.notStated");
  const row = (k: string, v: string | null) => (
    <div className="lrow" key={k}><span className="lrow__k">{k}</span><span className={`lrow__v${v ? "" : " ns"}`}>{v ?? ns}</span></div>
  );
  const kind = draft.intent === "offer" ? t("intent.sell") : draft.intent === "service" ? t("intent.service") : t("intent.buy");
  return (
    <section className="sstep reveal">
      <div className="fphead__eb"><span className="fphead__rule" aria-hidden="true" /><span className="eyebrow">{t("preview.eyebrow")}</span></div>
      <h1 className="fphead__h serif">{t("preview.title")}</h1>
      <div className="tabs2" role="tablist">
        {(["public", "private", "reviewer"] as const).map((x) => (
          <button key={x} className="tab2" role="tab" aria-selected={tab === x} onClick={() => setTab(x)}>{t(`preview.${x}`)}</button>
        ))}
      </div>

      {tab === "public" && (
        <div>
          <p className="pv__note">{t("preview.publicNote")}</p>
          <div className="ledger2">
            {row(t("field.kind"), kind)}
            {row(t("field.product"), draft.product)}
            {row(t("field.hsCode"), draft.hsCode ? `HS ${draft.hsCode}` : null)}
            {row(t("field.quantity"), draft.quantity ? `${draft.quantity}${draft.unit ? ` ${draft.unit}` : ""}` : null)}
            {row(t("field.frequency"), draft.frequency)}
            {row(t("field.route"), draft.origin || draft.destination ? `${draft.origin ?? ns} → ${draft.destination ?? ns}` : null)}
            {row(t("field.incoterm"), draft.incoterm)}
            {row(t("field.validity"), draft.validityDays ? t("complete.days", { n: draft.validityDays }) : null)}
          </div>
        </div>
      )}
      {tab === "private" && (
        <div>
          <p className="pv__note">{t("preview.privateNote")}</p>
          <div className="ledger2">
            {row(t("private.identity"), t("preview.reviewerOnly"))}
            {row(t("private.contact"), t("preview.withheld"))}
            {row(t("field.payment"), draft.payment)}
            {row(t("field.role"), draft.role)}
            {row(t("field.note"), draft.note)}
          </div>
        </div>
      )}
      {tab === "reviewer" && (
        <div>
          <p className="pv__note">{t("preview.reviewerNote")}</p>
          <div className="rev">
            <div className="lrow"><span className="lrow__k">{t("reviewer.facts")}</span><span className={`rev__v ${computeBlockers(draft).some((b) => b.resolve === "complete") ? "wait" : "ok"}`}>{computeBlockers(draft).some((b) => b.resolve === "complete") ? t("reviewer.partial") : t("reviewer.yes")}</span></div>
            <div className="lrow"><span className="lrow__k">{t("reviewer.authority")}</span><span className="rev__v wait">{t("reviewer.evidenceNeeded")}</span></div>
            <div className="lrow"><span className="lrow__k">{t("reviewer.verified")}</span><span className="rev__v wait">{t("reviewer.notYet")}</span></div>
            <div className="lrow"><span className="lrow__k">{t("reviewer.sanctions")}</span><span className="rev__v wait">{t("reviewer.onSubmission")}</span></div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 24 }}><button className="fbtn fbtn--secondary fbtn--lg" onClick={onNext}>{t("preview.cta")}</button></div>
    </section>
  );
}

// ---- S05 save / submit -----------------------------------------------------
function SubmitStep({ draft, submitting, onSubmit, onSaveDraft, onResolve, t }: { draft: StructureDraft; submitting: boolean; onSubmit: () => void; onSaveDraft: () => void; onResolve: () => void; t: T }) {
  const blocks = computeBlockers(draft);
  return (
    <section className="sstep">
      <div className="fphead__eb"><span className="fphead__rule" aria-hidden="true" /><span className="eyebrow">{t("submit.eyebrow")}</span></div>
      <h1 className="fphead__h serif">{t("submit.title")}</h1>
      <p className="fphead__def">{t("submit.sub", { n: blocks.length })}</p>
      <div style={{ marginTop: 16 }}>
        {blocks.map((b) => (
          <div className="block" key={b.key}>
            <div className="block__t">{t(`blocker.${b.key}`)}</div>
            <div className="block__d">{t(`blocker.${b.key}Desc`)}</div>
            {b.resolve && <button className="block__r" onClick={onResolve}>{t("submit.resolve")} →</button>}
          </div>
        ))}
      </div>
      <div className="submit-cta">
        <button className="fbtn fbtn--lg fbtn--block" disabled={submitting} onClick={onSubmit}>{t("submit.submit")}</button>
        <button className="fbtn fbtn--ghost fbtn--block" disabled={submitting} onClick={onSaveDraft}>{t("submit.saveDraft")}</button>
      </div>
    </section>
  );
}

// ---- S06 received ----------------------------------------------------------
function ReceivedStep({ savedDraft, resultRef, onWorkspace, t }: { savedDraft: boolean; resultRef: string; onWorkspace: () => void; t: T }) {
  return (
    <section className="rec">
      <span className="eyebrow">{savedDraft ? t("received.savedEyebrow") : t("received.eyebrow")}</span>
      <div className="rec-ack">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <h1 className="rec-title serif">{savedDraft ? t("received.draftTitle") : t("received.title")}</h1>
      <p className="rec-body">{savedDraft ? t("received.draftBody") : t("received.body")}{resultRef ? ` (${resultRef})` : ""}</p>
      <div className="rec-next">
        <div className="rec-step"><span>{t("received.next1")}</span><b>{t("received.underReview")}</b></div>
        <div className="rec-step"><span>{t("received.next2")}</span><b>{t("received.no")}</b></div>
        <div className="rec-step"><span>{t("received.next3")}</span><b>{t("received.workspace")}</b></div>
      </div>
      <button className="fbtn fbtn--lg" onClick={onWorkspace}>{t("received.cta")}</button>
    </section>
  );
}

function ErrorStep({ onRetry, t }: { onRetry: () => void; t: T }) {
  return (
    <section className="sstep">
      <span className="err-badge">{t("error.badge")}</span>
      <h1 className="fphead__h serif" style={{ marginTop: 8 }}>{t("error.title")}</h1>
      <p className="fphead__def">{t("error.body")}</p>
      <div style={{ marginTop: 20 }}><button className="fbtn" onClick={onRetry}>{t("error.retry")}</button></div>
    </section>
  );
}
