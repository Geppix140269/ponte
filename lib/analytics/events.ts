// Canonical analytics event names (roadmap 4.10). Use these constants only.
export const EVENT = {
  signup_completed: "signup_completed",
  onboarding_completed: "onboarding_completed",
  verify_run: "verify_run",
  discover_used: "discover_used",
  listing_published: "listing_published",
  listing_viewed: "listing_viewed",
  search_performed: "search_performed",
  saved_search_created: "saved_search_created",
  deal_opened: "deal_opened",
  message_sent: "message_sent",
  contact_unlock_accepted: "contact_unlock_accepted",
  deal_stage_changed: "deal_stage_changed",
  settlement_created: "settlement_created",
  settlement_funded: "settlement_funded",
  settlement_released: "settlement_released",
  subscribe_started: "subscribe_started",
  report_filed: "report_filed",
} as const;

export type EventName = (typeof EVENT)[keyof typeof EVENT];
export const ALL_EVENTS: string[] = Object.values(EVENT);
export function isKnownEvent(name: string): boolean { return ALL_EVENTS.includes(name); }
