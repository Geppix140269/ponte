/**
 * The composer's draft, kept on the device between visits.
 *
 * ## Why this exists
 *
 * The owner walked the composer on 1 August 2026, reached the end, pressed
 * back, and landed on the entrance:
 *
 *   > it goes back to my home page. So I've lost everything. That is absurd. I
 *   > have to keep you on the platform, the platform has to keep track of how I
 *   > got there. Maybe I want to edit. I want to change what I put there.
 *
 * He is right and the diagnosis is simple: until a record is submitted it lives
 * only in React state. A reload, a stray click, a phone locking, a browser
 * restoring a tab - each one discarded a record that had taken minutes to
 * build. `useUnsavedGuard` warns before a navigation it can see, and cannot see
 * any of those.
 *
 * It matters more now than it did. A visitor may compose an entire opportunity
 * with no account (ADR-0028: nothing is asked for until publication), so for
 * them there is no server row to fall back on. The device is the only place
 * their work can be.
 *
 * ## What it is not
 *
 * It is not a sync engine and it does not replace the saved draft on the
 * server. A signed-in member's `status = 'draft'` row remains the durable copy;
 * this is the copy that survives the gap between typing something and saving
 * it. Where both exist, the SERVER wins, because it is the one the member
 * deliberately saved.
 *
 * It stores commercial facts a member typed about their own goods. It never
 * stores a session, a token, an email address or anything belonging to anybody
 * else, and it is cleared the moment the record is submitted.
 */

/** One version, bumped when the draft shape changes. Old payloads are dropped. */
const VERSION = 1;

/**
 * The default key: the `/structure` composer's own draft, unchanged so every
 * device that already has one keeps reading it back correctly.
 *
 * ## Why every caller needs its OWN key
 *
 * `/publish` (`components/publish/PublishFlow.tsx`) called `keepDraft` and
 * `readKeptDraft<PersistedFlow>()` against this SAME key with no key of its
 * own, because both callers import the same module and neither reads the
 * other's payload shape. Nothing here enforced that they had to agree.
 *
 * `PersistedFlow` is `{ node, draft: StructureDraft, capacity, assets,
 * inferred, clock }`; `/structure` calls `readKeptDraft<StructureDraft>()`
 * expecting `.draft` to BE a `StructureDraft`. A member who opened `/publish`
 * and then reached `/structure` in the same browser - which `B02`'s "Browse
 * categories" route does directly - had `/publish`'s wrapper sitting under
 * this key. `/structure` read it back, treated the wrapper as a flat draft,
 * and `structureDirty` threw on `draft.serviceSubcategories.length`, three
 * layers short of where the array actually lived. Found by walking the
 * REAL path a member walks: `/publish` -> Browse categories -> `/structure`,
 * which a full-page reload of the destination URL alone does not reproduce.
 *
 * The fix is one key per flow, not a shape either module has to know the
 * other's. `keepDraft` and `readKeptDraft` take the key explicitly now;
 * every existing `/structure` call site is unchanged because the parameter
 * defaults to this constant.
 */
const KEY = "ponte.structure.draft.v1";

/** Older than this and it is not offered back. */
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export interface StoredDraft<T> {
  version: number;
  /** Epoch milliseconds. Used only to expire, never displayed. */
  savedAt: number;
  /** The composer's step stack, so a member returns where they left off. */
  stack: string[];
  draft: T;
}

/** Whether this environment can store anything at all. */
function store(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    // Safari in private mode has the API and throws on write. Probing here
    // means every caller below can assume a working store or none.
    const probe = `${KEY}.probe`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Keep the current draft.
 *
 * Never throws. A quota failure, a disabled store or a value that will not
 * serialise all end the same way: the draft is not kept, and the composer
 * carries on working exactly as it did before this module existed. Losing the
 * backup must never cost the member the thing being backed up.
 */
export function keepDraft<T>(draft: T, stack: readonly string[], key: string = KEY): void {
  const s = store();
  if (!s) return;
  try {
    const payload: StoredDraft<T> = {
      version: VERSION,
      savedAt: Date.now(),
      stack: [...stack],
      draft,
    };
    s.setItem(key, JSON.stringify(payload));
  } catch {
    // Deliberately silent. See above.
  }
}

/**
 * The kept draft, or null.
 *
 * Null for every reason a caller would otherwise have to distinguish and does
 * not need to: nothing stored, unreadable, a version this build does not
 * understand, or older than `MAX_AGE_MS`. A stale draft is worse than none,
 * because a member offered a fortnight-old record they have forgotten will
 * assume the product is confused.
 */
export function readKeptDraft<T>(
  key: string = KEY,
  isValid?: (draft: unknown) => draft is T,
): StoredDraft<T> | null {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    if (!parsed || parsed.version !== VERSION) return null;
    if (typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      s.removeItem(key);
      return null;
    }
    if (!parsed.draft || !Array.isArray(parsed.stack)) return null;
    // A payload of the wrong SHAPE is removed, not just refused. It was written
    // by a build or a flow that stored something else here, so it will never
    // become readable, and leaving it in place means the caller meets it again
    // on the next visit. Dropping it is what lets an already-poisoned device
    // heal itself on one load instead of needing its storage cleared by hand.
    if (isValid && !isValid(parsed.draft)) {
      s.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Forget it.
 *
 * Called on a successful submit and when a member discards deliberately. Both
 * are moments where keeping a copy would be the wrong answer: the record now
 * lives on the server, or the member has said they do not want it.
 */
export function forgetDraft(key: string = KEY): void {
  const s = store();
  if (!s) return;
  try {
    s.removeItem(key);
  } catch {
    // Nothing to do, and nothing worth telling anybody.
  }
}

/**
 * `/publish`'s own key. A sibling constant, not a sibling module: the
 * expiry, the probe-before-write and the version guard are the same policy
 * for both flows, and only the STORAGE SLOT needs to differ.
 */
export const PUBLISH_DRAFT_KEY = "ponte.publish.draft.v1";
