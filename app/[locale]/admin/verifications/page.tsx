import { createAdminClient } from "@/lib/supabase/server";
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
  registry: Record<string, unknown> | null;
  vies: Record<string, unknown> | null;
  gleif: Record<string, unknown> | null;
  sanctions_hits: Record<string, unknown> | null;
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

const FIELD =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-gray-2/60 focus:border-gold focus:outline-none";

const STATUS_TONE: Record<string, string> = {
  review: "text-gold",
  pending: "text-gray-2",
  // Not with the desk: several companies matched the name and the case is
  // paused on the member choosing which one they meant. Nothing to decide here.
  needs_selection: "text-gray-2",
  auto_verified: "text-positive",
  verified: "text-positive",
  rejected: "text-negative",
  failed: "text-negative",
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
    <details className="border-t border-white/10 pt-3 first:border-t-0 first:pt-0">
      <summary
        className="cursor-pointer text-[10px] uppercase text-gold"
        style={{ letterSpacing: "0.18em" }}
      >
        {label}
      </summary>
      <pre className="mono mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/25 p-3 text-[11px] leading-relaxed text-gray-2">
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
    <span className="text-[12.5px] text-gray-2">
      <span className="text-gray-2/70">{label}: </span>
      <span className="text-cream">{value}</span>
    </span>
  );
}

export default async function AdminVerificationsPage() {
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

    return (
      <div className="glass p-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="mono text-[12px] text-gold">
            #{v.id.slice(0, 8)}
          </span>
          <span className="badge uppercase">Level {v.level_requested}</span>
          <span className="flex-1 text-[15px] text-cream">{v.subject_name}</span>
          <span
            className={`text-[11px] uppercase ${STATUS_TONE[v.status] ?? "text-gray-2"}`}
            style={{ letterSpacing: "0.2em" }}
          >
            {v.status.replace("_", " ")}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
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
          <p className="mt-3 border-l-2 border-white/10 pl-3 text-[13px] leading-relaxed text-gray-2">
            {v.verdict_reason}
          </p>
        )}

        {/* AI pre-read on the left, raw sources on the right, side by side so
            a claim in the summary can be checked against what was stored. */}
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="text-[10px] uppercase text-gold"
                style={{ letterSpacing: "0.18em" }}
              >
                AI pre-read
              </span>
              {ai?.verdict_suggestion && (
                <span className="text-[12px] font-bold text-cream">
                  suggests: {ai.verdict_suggestion.replace("_", " ")}
                </span>
              )}
              <span className="text-[11px] text-gray-2">
                A suggestion, not a decision.
              </span>
            </div>

            {ai?.summary_text ? (
              <p className="mt-3 text-[13px] leading-relaxed text-cream">
                {ai.summary_text}
              </p>
            ) : (
              <p className="mt-3 text-[13px] text-gray-2">
                No summary was stored for this case. Read the sources.
              </p>
            )}

            {Array.isArray(ai?.flags) && ai!.flags!.length > 0 && (
              <p className="mt-3 text-[12.5px] leading-relaxed text-red-400">
                Flags: {ai!.flags!.join(" · ")}
              </p>
            )}

            {Array.isArray(ai?.checks) && ai!.checks!.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead
                    className="border-b border-white/10 text-[9.5px] uppercase text-gray-2"
                    style={{ letterSpacing: "0.18em" }}
                  >
                    <tr>
                      <th className="py-2 pr-3">Check</th>
                      <th className="py-2 pr-3">Result</th>
                      <th className="py-2 pr-3">Source</th>
                      <th className="py-2">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {ai!.checks!.map((c, i) => (
                      <tr key={`${v.id}-check-${i}`}>
                        <td className="py-2 pr-3 text-cream">{c.check ?? "-"}</td>
                        <td
                          className={`py-2 pr-3 ${
                            c.result === "pass"
                              ? "text-positive"
                              : c.result === "fail"
                                ? "text-negative"
                                : "text-gold"
                          }`}
                        >
                          {c.result ?? "-"}
                        </td>
                        <td className="py-2 pr-3 text-gray-2">{c.source ?? "-"}</td>
                        <td className="py-2 text-gray-2">{c.note ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <span
              className="text-[10px] uppercase text-gray-2"
              style={{ letterSpacing: "0.18em" }}
            >
              Source data as stored
            </span>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
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

            <div className="mt-4 space-y-3">
              <Raw label="registry" value={v.registry} />
              <Raw label="vies" value={v.vies} />
              <Raw label="gleif" value={v.gleif} />
              <Raw label="sanctions_hits" value={v.sanctions_hits} />
            </div>
          </div>
        </div>

        {docs.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className="text-[10px] uppercase text-gray-2"
              style={{ letterSpacing: "0.18em" }}
            >
              Documents
            </span>
            {docs.map((d) => (
              <a
                key={d.id}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="badge-gold text-[11px] hover:opacity-80"
              >
                {d.docType.replace(/_/g, " ")}
              </a>
            ))}
            <span className="text-[11px] text-gray-2">
              Links are signed and expire within the hour.
            </span>
          </div>
        )}

        {/* Three decisions, three forms, each with its own note. Every one of
            them is taken by the person reading this page. */}
        <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 md:grid-cols-3">
          <form action={approveVerificationAction} className="grid gap-2">
            <input type="hidden" name="id" value={v.id} />
            <textarea
              name="note"
              rows={2}
              maxLength={1500}
              placeholder="Note to the member, optional. Sent with the approval."
              className={FIELD}
            />
            <button className="btn-gold justify-center" disabled={!open}>
              Approve
            </button>
          </form>

          <form action={rejectVerificationAction} className="grid gap-2">
            <input type="hidden" name="id" value={v.id} />
            <textarea
              name="note"
              rows={2}
              maxLength={1500}
              placeholder="Reason for the rejection. Sent to the member."
              className={FIELD}
            />
            <button className="btn-ghost-light justify-center" disabled={!open}>
              Reject
            </button>
          </form>

          <form action={requestDocumentsAction} className="grid gap-2">
            <input type="hidden" name="id" value={v.id} />
            <textarea
              name="note"
              rows={2}
              maxLength={1500}
              placeholder="What is missing. Sent to the member, the case stays open."
              className={FIELD}
            />
            <button className="btn-ghost-light justify-center" disabled={!open}>
              Request documents
            </button>
          </form>
        </div>
        {!open && (
          <p className="mt-3 text-[11.5px] text-gray-2">
            This case is not open for review. Only a case in review can be
            decided here.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className="serif text-white mb-2" style={{ fontSize: 32, fontWeight: 500 }}>
        Verifications
      </h1>
      <p className="max-w-3xl text-[13px] leading-relaxed text-gray-2">
        {queue.length} case{queue.length === 1 ? "" : "s"} waiting for review,{" "}
        {rest.length} other{rest.length === 1 ? "" : "s"} shown below them. Read
        the pre-read against the source data before deciding. An approval and a
        rejection are always your decision, never the model&apos;s.
      </p>

      <h2
        className="mt-9 text-[11px] uppercase text-gold"
        style={{ letterSpacing: "0.22em" }}
      >
        Waiting for review
      </h2>
      {queue.length === 0 ? (
        <div className="mt-4 glass p-6 text-[13px] text-gray-2">
          Nothing is waiting. Cases arrive here when a check cannot be settled
          against the sources on its own.
        </div>
      ) : (
        <ul className="mt-4 space-y-4">
          {queue.map((v) => (
            <li key={v.id}>
              <Card v={v} />
            </li>
          ))}
        </ul>
      )}

      <h2
        className="mt-12 text-[11px] uppercase text-gray-2"
        style={{ letterSpacing: "0.22em" }}
      >
        Everything else
      </h2>
      {rest.length === 0 ? (
        <div className="mt-4 glass p-6 text-[13px] text-gray-2">
          No other verifications yet.
        </div>
      ) : (
        <ul className="mt-4 space-y-4">
          {rest.map((v) => (
            <li key={v.id}>
              <Card v={v} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
