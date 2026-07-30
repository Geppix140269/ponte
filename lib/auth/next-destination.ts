export const DEFAULT_AUTH_DESTINATION = "/opportunities";

const INTERNAL_ORIGIN = "https://ponte.invalid";

/**
 * Accept only a same-site path. Query strings and hashes are preserved because
 * they can carry a member's stated journey state; protocol-relative, absolute
 * and backslash-based destinations fail closed to the generic member home.
 */
export function safeInternalDestination(
  raw: string | null | undefined,
  fallback = DEFAULT_AUTH_DESTINATION,
): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return fallback;
  }

  try {
    const url = new URL(raw, INTERNAL_ORIGIN);
    if (url.origin !== INTERNAL_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Supabase may return redirect_to as either a path or a same-origin absolute
 * URL. Convert both forms to a safe internal destination.
 */
export function safeAuthRedirectDestination(
  raw: string | null | undefined,
  origin: string,
  fallback = DEFAULT_AUTH_DESTINATION,
): string {
  if (!raw) return fallback;
  if (raw.startsWith("/")) return safeInternalDestination(raw, fallback);

  try {
    const url = new URL(raw);
    if (url.origin !== origin || url.pathname.includes("\\")) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
