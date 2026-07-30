// Where a request to the retired listing composer is sent instead.
//
// `/marketplace/new` rendered the legacy obsidian `ListingForm`, read
// `searchParams.edit`, and was the destination a live transactional email put
// behind "Complete your listing" — while that email passed `id=`, not `edit=`,
// so the page opened a blank form rather than the saved listing named in the
// mail (LB-013). The page no longer renders anything: it redirects here, and
// this function is the whole decision, kept pure so the contract is unit-tested
// without a running server.
//
// The canonical resume destination is the current family-specific Structure
// composer at `/structure?edit=<uuid>` — the same contract `/structure` already
// reads, where ownership is enforced by the query and by RLS and an unreadable
// record fails closed. `/structure` is a real route regardless of the
// `NEXT_PUBLIC_STRUCTURE_JOURNEY` flag, which only governs the landing seam, so
// this redirect reaches the constitutional composer in every deployment state.

/** RFC 4122 canonical form. A listing id is a Postgres uuid. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The parameters the retired page could receive, all optional and untrusted. */
export type LegacyNewListingParams = {
  /** The email's parameter. The defect: the page read `edit`, not this. */
  id?: string | string[] | null;
  /** The board's own edit parameter, and the composer's resume contract. */
  edit?: string | string[] | null;
};

/** The single query value, or null when a key is absent or repeated. */
function one(v: string | string[] | null | undefined): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/**
 * The constitutional destination for a legacy `/marketplace/new` request.
 *
 *   - A valid record id under `id` or `edit` resumes that exact listing at
 *     `/structure?edit=<uuid>`. `edit` is preferred when both are present and
 *     valid, because it is the parameter the page and the board already use;
 *     `id` is honoured because it is the parameter the emails already sent.
 *   - Anything else — no id, a malformed id, an unknown parameter — opens the
 *     Structure entrance fresh at `/structure`. A bad identifier is discarded
 *     rather than forwarded, so a guessed or corrupt value never reaches a
 *     query; the ownership check downstream would refuse it in any case.
 *
 * A legacy `type=offer|requirement|service` is deliberately NOT mapped onto a
 * family or intent. The current taxonomy has no truthful one-to-one for it, and
 * fabricating a family here is exactly the silent misclassification this change
 * exists to stop: the member chooses their family in the composer instead.
 */
export function legacyNewListingTarget(params: LegacyNewListingParams): string {
  const edit = one(params.edit);
  if (edit && UUID.test(edit)) return `/structure?edit=${edit}`;

  const id = one(params.id);
  if (id && UUID.test(id)) return `/structure?edit=${id}`;

  return "/structure";
}
