// Which listing owners are currently allowed to keep their approved listings
// public, on the strength of their live member-business verification.
//
// This is the data-fetching companion to isPubliclyEligibleVerification. The
// three public read paths (homepage showcase, board, detail) all call it so
// they share one rule: an approved listing whose owner has lost their passing
// member-business verification, or dropped below the member level, disappears
// from every public surface even though the row is still `approved`.
//
// It reads with the admin client because the public surfaces serve anonymous
// visitors, for whom RLS would return nothing.

import type { createAdminClient } from "@/lib/supabase/server";
import { isPubliclyEligibleVerification } from "./publication-gate";

type AdminClient = ReturnType<typeof createAdminClient>;

/** The subset of owner ids whose verification is currently public-eligible. */
export async function eligibleOwnerIds(
  sb: AdminClient,
  ownerIds: (string | null | undefined)[],
): Promise<Set<string>> {
  const out = new Set<string>();
  const ids = Array.from(new Set(ownerIds.filter((v): v is string => !!v)));
  if (ids.length === 0) return out;

  const { data: profs } = await sb
    .from("profiles")
    .select("id, verification_level, business_verification_id")
    .in("id", ids);
  const rows = profs ?? [];

  const bvids = Array.from(
    new Set(rows.map((p) => p.business_verification_id).filter((v): v is string => !!v)),
  );
  const verById = new Map<string, { purpose: string | null; status: string | null }>();
  if (bvids.length > 0) {
    const { data: vers } = await sb
      .from("verifications")
      .select("id, purpose, status")
      .in("id", bvids);
    for (const v of vers ?? []) {
      verById.set(v.id, { purpose: v.purpose, status: v.status });
    }
  }

  for (const p of rows) {
    const ver = p.business_verification_id
      ? verById.get(p.business_verification_id) ?? null
      : null;
    const eligible = isPubliclyEligibleVerification({
      verificationLevel: Number(p.verification_level ?? 0),
      business_verification_id: p.business_verification_id ?? null,
      verification: ver,
    });
    if (eligible) out.add(p.id);
  }
  return out;
}
