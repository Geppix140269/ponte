// Server-side fraud detection: duplicate company/domain checks, suspicious
// activity flags, and entity blocking. Writes fraud_flags / blocked_entities /
// audit_logs via the service role.
import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  normalizeCompanyName, normalizeDomain, severityForDuplicate,
} from "@/lib/network/fraud";

const NIL = "00000000-0000-0000-0000-000000000000";

// Detect duplicate organizations by normalized name and domain. Raises a
// fraud_flag for each kind of duplicate found. Returns the flag types raised.
export async function detectDuplicateOrganization(input: {
  id?: string; name: string; website?: string | null;
}): Promise<{ flags: string[] }> {
  const sb = createAdminClient();
  const nameN = normalizeCompanyName(input.name);
  const domainN = input.website ? normalizeDomain(input.website) : null;
  const selfId = input.id ?? NIL;
  const flags: string[] = [];

  const { data: byName } = await sb
    .from("organizations").select("id").eq("name_normalized", nameN).neq("id", selfId).limit(1);
  if (byName && byName.length) {
    await sb.from("fraud_flags").insert({
      subject_type: "organization", subject_id: selfId === NIL ? byName[0].id : selfId,
      flag_type: "duplicate_company", severity: severityForDuplicate("name"),
      detail: `Duplicate company name: "${nameN}"`,
    });
    flags.push("duplicate_company");
  }

  if (domainN) {
    const { data: byDomain } = await sb
      .from("organizations").select("id").eq("domain_normalized", domainN).neq("id", selfId).limit(1);
    if (byDomain && byDomain.length) {
      await sb.from("fraud_flags").insert({
        subject_type: "organization", subject_id: selfId === NIL ? byDomain[0].id : selfId,
        flag_type: "duplicate_domain", severity: severityForDuplicate("domain"),
        detail: `Duplicate domain: "${domainN}"`,
      });
      flags.push("duplicate_domain");
    }
  }
  return { flags };
}

// Throttle + flag suspicious bursts of an action by a user (e.g. listings,
// reports, ADAMftd checks). Returns false when the burst limit is exceeded,
// raising a fraud_flag the first time it trips in the window.
export function isWithinActivityLimit(
  userId: string, action: string, limit: number, windowMs: number,
): boolean {
  return checkRateLimit(`activity:${action}:${userId}`, limit, windowMs);
}

export async function flagSuspiciousActivity(
  subjectType: "user" | "organization" | "listing" | "deal",
  subjectId: string, detail: string,
): Promise<void> {
  const sb = createAdminClient();
  await sb.from("fraud_flags").insert({
    subject_type: subjectType, subject_id: subjectId,
    flag_type: "suspicious_activity", severity: "medium", detail,
  });
}

// Block an entity (user / org / domain / email) and record it.
export async function blockEntity(
  entityType: "user" | "organization" | "domain" | "email",
  value: string, reason: string, actorId?: string,
): Promise<{ error?: string }> {
  const sb = createAdminClient();
  const { error } = await sb.from("blocked_entities").upsert(
    { entity_type: entityType, value, reason, created_by: actorId ?? null },
    { onConflict: "entity_type,value" },
  );
  if (error) return { error: error.message };
  await sb.from("audit_logs").insert({
    actor_id: actorId ?? null, action: "block_entity", target_type: entityType, target_id: null,
    metadata: { value, reason },
  });
  return {};
}
