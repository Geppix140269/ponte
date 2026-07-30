/**
 * The one authority for "where does sign-in send the member". Pure logic: no
 * window, no next/server, no cookies, so the same rules run on the client
 * (`DeskLoginForm`) and on the server (`app/auth/callback`, `app/auth/confirm`)
 * and are unit-tested standalone under tsx.
 *
 * Two rules, and everything else is a rejection:
 *
 *   1. The generic destination is `/opportunities`, the member's own records.
 *      A missing, empty or unsafe target falls back to it rather than guessing.
 *   2. A journey-specific destination is honoured only when it is unmistakably
 *      same-site. Anything that a browser could resolve to another origin — a
 *      protocol-relative `//host`, a backslash trick `/\host`, an absolute URL
 *      to a foreign origin, a control character that could smuggle a second
 *      header — is discarded, not forwarded.
 *
 * `safeNextPath` is the common case: a `?next=` value that is already a path.
 * `safeRedirectTo` additionally accepts a same-ORIGIN absolute URL, because
 * Supabase email confirmation hands the confirm route an absolute `redirect_to`
 * and reducing it to its path is the only place an absolute form is allowed in.
 */

/** The generic post-sign-in destination when no safe journey target is given. */
export const DEFAULT_DESTINATION = "/opportunities";

/** True when the string carries a C0 control character or DEL (0x00-0x1f, 0x7f). */
function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/**
 * True only for an absolute-path reference that stays on this site: it starts
 * with a single `/`, carries no authority a browser could peel off, and holds
 * no control character. Query and hash are preserved, because a member reading
 * a filtered board or a stated objective must come back to exactly that.
 */
function isSafeInternalPath(raw: string | null | undefined): boolean {
  if (typeof raw !== "string" || raw.length === 0) return false;
  // Must be an absolute-path reference. A bare word, a scheme (`javascript:`,
  // `https:`) or a backslash-led value is not one.
  if (raw[0] !== "/") return false;
  // Protocol-relative (`//host`) and the backslash variants (`/\host`,
  // `/\/host`) that browsers normalise to `//host` and resolve off-origin.
  if (raw[1] === "/" || raw[1] === "\\") return false;
  // A backslash anywhere can be normalised to a forward slash by a browser, so
  // it never belongs in a trusted internal path. An honest destination has no
  // need of one; a percent-encoded query value keeps its `%5C`.
  if (raw.includes("\\")) return false;
  // Control characters, including CR/LF and tab, that could break the
  // same-origin assumption or smuggle a second header.
  if (hasControlChar(raw)) return false;
  return true;
}

/**
 * A safe same-site path (path + optional query + hash), or the default. This is
 * the client/`?next=` case: the value is already a path, and only its
 * same-site-ness is in question.
 */
export function safeNextPath(raw: string | null | undefined): string {
  // isSafeInternalPath returning true guarantees `raw` is a non-empty string.
  return isSafeInternalPath(raw) ? (raw as string) : DEFAULT_DESTINATION;
}

/**
 * Like {@link safeNextPath}, but also accepts an absolute URL whose origin is
 * exactly `origin`, reducing it to its path + query + hash. This is the confirm
 * route's case: Supabase confirmation sends an absolute `redirect_to`, and a
 * same-origin one is honoured while a foreign or malformed one is discarded.
 */
export function safeRedirectTo(raw: string | null | undefined, origin: string): string {
  if (isSafeInternalPath(raw)) return raw as string;
  if (typeof raw === "string" && raw.length > 0) {
    try {
      const url = new URL(raw);
      if (url.origin === origin) {
        const path = `${url.pathname}${url.search}${url.hash}`;
        return isSafeInternalPath(path) ? path : DEFAULT_DESTINATION;
      }
    } catch {
      // Not an absolute URL, so it is neither a safe path nor a same-origin URL.
    }
  }
  return DEFAULT_DESTINATION;
}
