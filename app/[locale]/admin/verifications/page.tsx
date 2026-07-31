import { createAdminClient } from "@/lib/supabase/server";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import {
  draftVerificationNotes,
  type RegistryJson,
  type ViesJson,
  type GleifJson,
  type SanctionsJson,
} from "@/lib/verification/decision-notes";
import {
  approveVerificationAction,
  rejectVerificationAction,
  requestDocumentsAction,
} from "./actions";

export const dynamic = "force-dynamic";

/**
 * The verification review queue.
 *
 * The point of this page is one thing: put the model's pre-read next to the
 * raw source data so a person can compare them before deciding. The summary
 * is a reading of the sources, not a substitute for them, so the sources are
 * on the same screen and are never collapsed away entirely.
 *
 * Approve and reject are human actions. There is no automatic decision on
 * this page and none may be added.
 */

// Level 3 documents live in a private bucket. Signed URLs only, and a path is
// never rendered or logged.
const DOCS_BUCKET = "verification-docs";
const DOC_URL_TTL_SECONDS = 3600;

const card: React.CSSProperties = {
  background: "var(--raised)",
  border: "1px solid var(--rule)",
  borderRadius: "var(--dk-radius)",
  boxShadow: "var(--e-1)",
  padding: "18px 20px",
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  font: "inherit",
  fontSize: 13.5,
  color: "var(--ink)",
  background: "var(--raised)",
  border: "1px solid var(--rule-strong)",
  borderRadius: "var(--dk-radius-in)",
  padding: "9px 11px",
  resize: "vertical",
};

const tag: React.CSSProperties = {
  fontFamily: "var(--f-mono)",
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 600,
  color: "var(--ink-2)",
  border: "1px solid var(--rule-strong)",
  borderRadius: 4,
  padding: "2px 7px",
};

const box: React.CSSProperties = {
  background: "var(--sunken)",
  border: "1px solid var(--rule)",
  borderRadius: "var(--dk-radius)",
  padding: 16,
};

const capLabel: React.CSSProperties = {
  fontFamily: "var(--f-mono)",
  fontSize: 10,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
};

type ReconcileCheck = {
  check?: string;
  result?: string;
  source?: string;
  note?: string;
};

type AiSummary = {
  verdict_suggestion?: string;
  summary_text?: string;
  checks?: ReconcileCheck[];
  flags?: string[];
} | null;

type VerificationRow = {
  id: string;
  user_id: string | null;
  guest_email: string | null;
  subject_name: string;
  subject_country: string | null;
  subject_reg_number: string | null;
  subject_vat: string | null;
  subject_lei: string | null;
  level_requested: number;
  status: string;
  registry: RegistryJson | null;
  vies: ViesJson | null;
  gleif: GleifJson | null;
  sanctions_hits: SanctionsJson | null;
  ai_summary: AiSummary;
  verdict_reason: string | null;
  reviewed_by: string | null;
  rescreened_at: string | null;
  created_at: string;
  decided_at: string | null;
};

type DocRow = {
  id: string;
  verification_id: string;
  storage_path: string;
  doc_type: string;
};

// Status shown in the desk's semantic tokens: review is the slate review token,
// a pass is positive, a refusal is danger, and a paused case is muted ink. Gold
// is never a status.
const STATUS_COLOR: Record<string, string> = {
  review: "var(--review)",
  pending: "var(--ink-3)",
  // Not with the desk: several companies matched the name and the case is
  // paused on the member choosing which one they meant. Nothing to decide here.
  needs_selection: "var(--ink-3)",
  auto_verified: "var(--pos)",
  verified: "var(--pos)",
  rejected: "var(--neg)",
  failed: "var(--neg)",
};

function fmt(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function str(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

/** Raw source data, exactly as it was stored. Nothing summarised away. */
function Raw({ label, value }: { label: string; value: unknown }) {
  return (
    <details style={{ borderTop: "1px solid var(--rule)", paddingTop: 12 }}>
      <summary
        className="mono"
        style={{ cursor: "pointer", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)" }}
      >
        {label}
      </summary>
      <pre
        className="mono"
        style={{
          marginTop: 8,
          maxHeight: 288,
          overflow: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          borderRadius: "var(--dk-radius-in)",
          background: "var(--raised)",
          border: "1px solid var(--rule)",
          padding: 12,
          fontSize: 11,
          lineHeight: 1.6,
          color: "var(--ink-2)",
        }}
      >
        {value === null || value === undefined
          ? "not stored"
          : JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
      <span style={{ color: "var(--ink-3)" }}>{label}: </span>
      <span style={{ color: "var(--ink)" }}>{value}</span>
    </span>
  );
}

/*
 * What the last click did, in words.
 *
 * The actions redirect here with `r` set, so every outcome including a refusal
 * arrives as something the reviewer can read. Anything not in this map is shown
 * raw rather than swallowed: an unknown code is still information.
 */
const OUTCOME: Record<string, { tone: "good" | "bad"; text: string }> = {
  verified: { tone: "good", text: "Approved. The member has been emailed and the level is on their account." },
  rejected: { tone: "good", text: "Rejected. The member has been emailed." },
  documents: { tone: "good", text: "Documents requested. The member has been emailed and the case stays open." },
  not_admin: { tone: "bad", text: "Nothing was written: your session is not signed in as an admin. Sign in again." },
  no_id: { tone: "bad", text: "Nothing was written: the form arrived without a case id." },
  no_case: { tone: "bad", text: "Nothing was written: that case no longer exists." },
  not_open: { tone: "bad", text: "Nothing was written: that case is not open for review any more." },
  db_error: { tone: "bad", text: "The database refused the write, so nothing was decided." },
};

/** Extra detail the action passed alongside the outcome. */
const DETAIL: Record<string, string> = {
  no_address: "The decision is saved, but no email address could be resolved, so the member has NOT been told.",
  send_failed: "The decision is saved, but the email did not send. Tell the member another way.",
};

function OutcomeBanner({ r, m }: { r?: string; m?: string }) {
  if (!r) return null;
  const known = OUTCOME[r];
  const good = (known?.tone ?? "bad") === "good";
  const detail = m ? (DETAIL[m] ?? m) : null;
  return (
    <section className="sec" style={{ paddingBottom: 0 }}>
      {good ? (
        <div
          style={{
            background: "var(--pos-tint)",
            border: "1px solid var(--pos-line)",
            borderRadius: "var(--dk-radius)",
            padding: "14px 16px",
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--ink-2)",
          }}
        >
          <p style={{ color: "var(--pos)", fontWeight: 600 }}>{known?.text ?? `Outcome: ${r}`}</p>
          {detail && (
            <p className="mono" style={{ marginTop: 8, fontSize: 12, color: "var(--ink-3)" }}>
              {detail}
            </p>
          )}
        </div>
      ) : (
        <div className="err">
          <PonteIcon name="evidence.evreview" size={22} />
          <div>
            <b>{known?.text ?? `Outcome: ${r}`}</b>
            {detail && (
              <p className="mono" style={{ marginTop: 6 }}>
                {detail}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: { r?: string; m?: string };
}) {
  const adminSb = createAdminClient();

  const [{ data: rows }, { data: docRows }] = await Promise.all([
    adminSb
      .from("verifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
    adminSb
      .from("verification_documents")
      .select("id, verification_id, storage_path, doc_type"),
  ]);

  const all = (rows ?? []) as VerificationRow[];

  // Review first, everything else after, newest first inside each group.
  const queue = all.filter((v) => v.status === "review");
  const rest = all.filter((v) => v.status !== "review");

  // Requester addresses, for display only.
  const emailById = new Map<string, string>();
  for (const uid of Array.from(
    new Set(all.map((v) => v.user_id).filter((v): v is string => Boolean(v))),
  )) {
    const { data } = await adminSb.auth.admin.getUserById(uid);
    if (data?.user?.email) emailById.set(uid, data.user.email);
  }

  // Documents are private. A signed URL is minted per render and expires; the
  // storage path itself is never put on the page and never logged.
  const docsByCase = new Map<string, { id: string; docType: string; url: string }[]>();
  for (const d of (docRows ?? []) as DocRow[]) {
    const { data } = await adminSb.storage
      .from(DOCS_BUCKET)
      .createSignedUrl(d.storage_path, DOC_URL_TTL_SECONDS);
    if (!data?.signedUrl) continue;
    const arr = docsByCase.get(d.verification_id) ?? [];
    arr.push({ id: d.id, docType: d.doc_type, url: data.signedUrl });
    docsByCase.set(d.verification_id, arr);
  }

  function Card({ v }: { v: VerificationRow }) {
    const ai = v.ai_summary;
    const docs = docsByCase.get(v.id) ?? [];
    const requester = v.user_id
      ? (emailById.get(v.user_id) ?? v.user_id.slice(0, 8))
      : (v.guest_email ?? "-");
    const registry = v.registry ?? {};
    const sanctions = v.sanctions_hits ?? {};
    const screened = Array.isArray((sanctions as { screened?: unknown }).screened)
      ? ((sanctions as { screened: unknown[] }).screened as string[])
      : [];
    const open = v.status === "review";
    const drafts = draftVerificationNotes(v);

    return (
      <div style={card}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
            #{v.id.slice(0, 8)}
          </span>
          <span style={tag}>Level {v.level_requested}</span>
          <span style={{ flex: 1, fontSize: 15, color: "var(--ink)" }}>{v.subject_name}</span>
          <span
            className="mono"
            style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: STATUS_COLOR[v.status] ?? "var(--ink-3)" }}
          >
            {v.status.replace("_", " ")}
          </span>
        </div>

        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: "4px 24px" }}>
          <Fact label="Requested by" value={requester} />
          <Fact label="Country" value={v.subject_country} />
          <Fact label="Reg number" value={v.subject_reg_number} />
          <Fact label="VAT" value={v.subject_vat} />
          <Fact label="LEI" value={v.subject_lei} />
          <Fact label="Opened" value={fmt(v.created_at)} />
          <Fact label="Decided" value={v.decided_at ? fmt(v.decided_at) : null} />
          <Fact
            label="Re-screened"
            value={v.rescreened_at ? fmt(v.rescreened_at) : null}
          />
        </div>

        {v.verdict_reason && (
          <p
            style={{
              marginTop: 12,
              borderLeft: "2px solid var(--rule)",
              paddingLeft: 12,
              fontSize: 13,
              lineHeight: 1.6,
              color: "var(--ink-2)",
            }}
          >
            {v.verdict_reason}
          </p>
        )}

        {/* AI pre-read on the left, raw sources on the right, side by side so
            a claim in the summary can be checked against what was stored. */}
        <div
          style={{
            marginTop: 20,
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          }}
        >
          <div style={{ ...box, borderLeft: "3px solid var(--review)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
              <span className="mono" style={{ ...capLabel, letterSpacing: "0.18em", color: "var(--review)" }}>
                AI pre-read
              </span>
              {ai?.verdict_suggestion && (
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                  suggests: {ai.verdict_suggestion.replace("_", " ")}
                </span>
              )}
              <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                A suggestion, not a decision.
              </span>
            </div>

            {ai?.summary_text ? (
              <p style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, color: "var(--ink)" }}>
                {ai.summary_text}
              </p>
            ) : (
              <p style={{ marginTop: 12, fontSize: 13, color: "var(--ink-3)" }}>
                No summary was stored for this case. Read the sources.
              </p>
            )}

            {Array.isArray(ai?.flags) && ai!.flags!.length > 0 && (
              <p style={{ marginTop: 12, fontSize: 12.5, lineHeight: 1.6, color: "var(--neg)" }}>
                Flags: {ai!.flags!.join(" · ")}
              </p>
            )}

            {Array.isArray(ai?.checks) && ai!.checks!.length > 0 && (
              <div style={{ marginTop: 16, overflowX: "auto" }}>
                <table className="mono" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12 }}>
                  <thead>
                    <tr>
                      {["Check", "Result", "Source", "Note"].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "6px 8px 6px 0",
                            fontSize: 9.5,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            color: "var(--ink-3)",
                            borderBottom: "1px solid var(--rule)",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ai!.checks!.map((c, i) => (
                      <tr key={`${v.id}-check-${i}`}>
                        <td style={{ padding: "6px 8px 6px 0", color: "var(--ink)", borderTop: "1px solid var(--rule)" }}>
                          {c.check ?? "-"}
                        </td>
                        <td
                          style={{
                            padding: "6px 8px 6px 0",
                            borderTop: "1px solid var(--rule)",
                            color:
                              c.result === "pass"
                                ? "var(--pos)"
                                : c.result === "fail"
                                  ? "var(--neg)"
                                  : "var(--review)",
                          }}
                        >
                          {c.result ?? "-"}
                        </td>
                        <td style={{ padding: "6px 8px 6px 0", color: "var(--ink-2)", borderTop: "1px solid var(--rule)" }}>
                          {c.source ?? "-"}
                        </td>
                        <td style={{ padding: "6px 0", color: "var(--ink-2)", borderTop: "1px solid var(--rule)" }}>
                          {c.note ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={box}>
            <span className="mono" style={capLabel}>
              Source data as stored
            </span>

            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: "4px 24px" }}>
              <Fact label="Registry" value={str(registry.source)} />
              <Fact
                label="Available"
                value={registry.available === true ? "yes" : "no"}
              />
              <Fact label="Registered name" value={str(registry.companyName)} />
              <Fact label="Registry number" value={str(registry.regNumber)} />
              <Fact label="Registry status" value={str(registry.status)} />
              <Fact
                label="Incorporated"
                value={str(registry.incorporationDate)}
              />
              <Fact label="Checked" value={str(registry.checkedAt)} />
              <Fact label="Not checked because" value={str(registry.reason)} />
              <Fact
                label="Sanctions"
                value={
                  (sanctions as { clean?: boolean }).clean === true
                    ? "no candidates"
                    : "candidates found"
                }
              />
              <Fact
                label="Strong candidates"
                value={str((sanctions as { strongCount?: number }).strongCount)}
              />
              <Fact
                label="Names screened"
                value={screened.length ? screened.join(", ") : null}
              />
            </div>

            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <Raw label="registry" value={v.registry} />
              <Raw label="vies" value={v.vies} />
              <Raw label="gleif" value={v.gleif} />
              <Raw label="sanctions_hits" value={v.sanctions_hits} />
            </div>
          </div>
        </div>

        {docs.length > 0 && (
          <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <span className="mono" style={capLabel}>
              Documents
            </span>
            {docs.map((d) => (
              <a
                key={d.id}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="b b--2 b--sm"
              >
                {d.docType.replace(/_/g, " ")}
              </a>
            ))}
            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
              Links are signed and expire within the hour.
            </span>
          </div>
        )}

        {/* Three decisions, three forms, each with its own note. Every one of
            them is taken by the person reading this page.

            Each box arrives already written, drafted from this case's own
            stored sources by lib/verification/decision-notes. It is a draft and
            nothing more: it is the box's default value, so typing over it or
            emptying it works exactly as it did before, and whatever is left in
            the box at the moment of the click is what the member reads. */}
        <div
          style={{
            marginTop: 20,
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            borderTop: "1px solid var(--rule)",
            paddingTop: 20,
          }}
        >
          <form action={approveVerificationAction} style={{ display: "grid", gap: 8 }}>
            <input type="hidden" name="id" value={v.id} />
            <textarea
              name="note"
              rows={8}
              maxLength={1500}
              defaultValue={open ? drafts.approve : ""}
              placeholder="Note to the member, optional. Sent with the approval."
              style={fieldStyle}
            />
            <button className="b b--block" disabled={!open} aria-disabled={!open ? "true" : undefined}>
              Approve
            </button>
          </form>

          <form action={rejectVerificationAction} style={{ display: "grid", gap: 8 }}>
            <input type="hidden" name="id" value={v.id} />
            <textarea
              name="note"
              rows={8}
              maxLength={1500}
              defaultValue={open ? drafts.reject : ""}
              placeholder="Reason for the rejection. Sent to the member."
              style={fieldStyle}
            />
            <button className="b b--2 b--block" disabled={!open} aria-disabled={!open ? "true" : undefined}>
              Reject
            </button>
          </form>

          <form action={requestDocumentsAction} style={{ display: "grid", gap: 8 }}>
            <input type="hidden" name="id" value={v.id} />
            <textarea
              name="note"
              rows={8}
              maxLength={1500}
              defaultValue={open ? drafts.documents : ""}
              placeholder="What is missing. Sent to the member, the case stays open."
              style={fieldStyle}
            />
            <button className="b b--2 b--block" disabled={!open} aria-disabled={!open ? "true" : undefined}>
              Request documents
            </button>
          </form>
        </div>
        {!open && (
          <p style={{ marginTop: 12, fontSize: 11.5, color: "var(--ink-3)" }}>
            This case is not open for review. Only a case in review can be
            decided here.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <OutcomeBanner r={searchParams.r} m={searchParams.m} />
      <section className="sec">
      <div className="sech">
        <div>
          <h2>
            <PonteIcon name="evidence.evreview" size={18} />
            Verifications
          </h2>
          <p className="d">
            {queue.length} case{queue.length === 1 ? "" : "s"} waiting for review,{" "}
            {rest.length} other{rest.length === 1 ? "" : "s"} shown below them. Read
            the pre-read against the source data before deciding. An approval and a
            rejection are always your decision, never the model&apos;s.
          </p>
        </div>
      </div>

      <h3
        className="mono"
        style={{ marginTop: 12, marginBottom: 12, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-2)" }}
      >
        Waiting for review
      </h3>
      {queue.length === 0 ? (
        <div className="empty">
          <PonteIcon name="evidence.infocomplete" size={24} />
          <div>
            <b>Nothing is waiting</b>
            <p>
              Cases arrive here when a check cannot be settled against the sources
              on its own.
            </p>
          </div>
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {queue.map((v) => (
            <li key={v.id}>
              <Card v={v} />
            </li>
          ))}
        </ul>
      )}

      <h3
        className="mono"
        style={{ marginTop: 32, marginBottom: 12, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-3)" }}
      >
        Everything else
      </h3>
      {rest.length === 0 ? (
        <div className="empty">
          <PonteIcon name="primitive.span" size={24} />
          <div>
            <b>No other verifications yet</b>
            <p>Decided and paused cases will appear here.</p>
          </div>
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {rest.map((v) => (
            <li key={v.id}>
              <Card v={v} />
            </li>
          ))}
        </ul>
      )}
      </section>
    </>
  );
}
