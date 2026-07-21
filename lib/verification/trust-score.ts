// Trust score.
//
// Deterministic by design. The AI never sets or influences a number here: it
// only produces evidence that a rule or a human acts on. A score a member
// cannot have explained to them is not worth showing, so every component is
// stored separately and the breakdown is shown on their own profile.
//
// Maximum is 100. Components are additive and capped.

import { createAdminClient } from "@/lib/supabase/server";

export type TrustComponent =
  | "identity"
  | "business"
  | "sanctions_clean"
  | "company_age"
  | "activity_docs"
  | "tenure";

/** Fixed weights. Changing these changes every member's score, so treat it as a release. */
export const POINTS: Record<TrustComponent, number> = {
  identity: 10,
  business: 25,
  sanctions_clean: 20,
  company_age: 10,
  activity_docs: 25,
  tenure: 10, // earned gradually, see tenurePoints
};

export const MAX_SCORE = 100;

/** Up to 10 points, one per two months of membership, so it takes 20 months to max. */
export function tenurePoints(memberSince: Date, now = new Date()): number {
  const months =
    (now.getFullYear() - memberSince.getFullYear()) * 12 +
    (now.getMonth() - memberSince.getMonth());
  return Math.max(0, Math.min(POINTS.tenure, Math.floor(months / 2)));
}

/** Company age is worth points only past three years. */
export function companyAgePoints(incorporationDate?: string | null, now = new Date()): number {
  if (!incorporationDate) return 0;
  const inc = new Date(incorporationDate);
  if (Number.isNaN(inc.getTime())) return 0;
  const years = (now.getTime() - inc.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return years >= 3 ? POINTS.company_age : 0;
}

/**
 * Write one component. Awarding is always the result of a completed check, so
 * this is only ever called from the pipeline or the admin queue, never from a
 * client.
 */
export async function setComponent(
  userId: string,
  component: TrustComponent,
  points: number,
): Promise<void> {
  const capped = Math.max(0, Math.min(POINTS[component], Math.round(points)));
  const sb = createAdminClient();
  const { error } = await sb
    .from("trust_score_components")
    .upsert(
      { user_id: userId, component, points: capped, computed_at: new Date().toISOString() },
      { onConflict: "user_id,component" },
    );
  if (error) throw new Error(`trust component ${component} failed: ${error.message}`);
}

/** Remove a component, for example when a re-screen turns up a new sanctions hit. */
export async function clearComponent(
  userId: string,
  component: TrustComponent,
): Promise<void> {
  const sb = createAdminClient();
  await sb
    .from("trust_score_components")
    .delete()
    .eq("user_id", userId)
    .eq("component", component);
}

export async function getBreakdown(userId: string): Promise<{
  total: number;
  components: { component: TrustComponent; points: number; max: number }[];
}> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("trust_score_components")
    .select("component, points")
    .eq("user_id", userId);

  const found = new Map<string, number>((data ?? []).map((r: any) => [r.component, r.points]));
  const components = (Object.keys(POINTS) as TrustComponent[]).map((component) => ({
    component,
    points: found.get(component) ?? 0,
    max: POINTS[component],
  }));

  const total = Math.min(
    MAX_SCORE,
    components.reduce((n, c) => n + c.points, 0),
  );
  return { total, components };
}
