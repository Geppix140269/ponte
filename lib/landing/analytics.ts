/**
 * Landing analytics: meaningful events, no personal data.
 *
 * The application has no analytics layer today, so this is deliberately not a
 * vendor. It is the one wiring point where the landing's events are emitted;
 * connect a real sink here later. It dispatches a DOM CustomEvent (so a listener
 * can be attached without touching call sites) and logs in development only.
 *
 * The contract is privacy-first: only route and category metadata is ever
 * passed. Raw objectives, company names and other free text are never recorded
 * here, matching the brief's rule to prefer category metadata over user text.
 */

export type LandingEvent =
  | "voice_started"
  | "voice_denied"
  | "voice_unavailable"
  | "text_started"
  | "intent_submitted"
  | "route_suggested"
  | "route_confirmed"
  | "route_changed"
  | "auth_boundary_reached";

export interface LandingEventMeta {
  /** One of the four routes, never free text. */
  route?: "find" | "structure" | "check" | "investigate";
  /** Coarse category only, never a raw objective. */
  category?: string;
}

export function track(event: LandingEvent, meta: LandingEventMeta = {}): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("ponte:landing", { detail: { event, ...meta } }));
  } catch {
    /* CustomEvent unsupported: analytics is best-effort and never blocks UI. */
  }
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.debug("[landing]", event, meta);
  }
}
