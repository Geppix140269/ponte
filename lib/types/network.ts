// TypeScript row types for the trade-network tables (Phase 1 schema).
// Mirror of supabase/migrations/20260604_broker_network_phase1.sql.

export type AccountType = "buyer" | "seller" | "trader" | "enterprise";
export type Plan = "free" | "starter" | "pro" | "enterprise";
export type VerificationLevel =
  | "unverified" | "email_verified" | "phone_verified" | "company_verified" | "fully_verified";
export type RiskCategory = "low" | "medium" | "high" | "blocked";

// profiles, extended (store fields omitted for brevity except those reused)
export interface NetworkProfile {
  id: string;
  full_name: string | null;
  company: string | null;
  country: string | null;
  role: "customer" | "admin";
  account_type: AccountType | null;
  plan: Plan;
  verified_trader: boolean;
  organization_id: string | null;
  trust_score: number;
  verification_level: VerificationLevel;
  verification_tier: number;
  risk_category: RiskCategory;
  completed_deals: number;
  title: string | null;
  languages: string[] | null;
  commodities: string[] | null;
  regions_served: string[] | null;
  years_active: number | null;
  typical_deal_size: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface Organization {
  id: string;
  name: string;
  website: string | null;
  registration_number: string | null;
  vat_number: string | null;
  country: string | null;
  industry: string | null;
  owner_id: string | null;
  name_normalized: string | null;
  domain_normalized: string | null;
  verification_level: VerificationLevel;
  trust_score: number;
  risk_category: RiskCategory;
  created_at: string;
  updated_at: string;
}

export type ListingType = "offer" | "request";
export type ListingStatus = "active" | "paused" | "closed";
export type ModerationStatus = "pending" | "approved" | "flagged" | "rejected";

export interface Listing {
  id: string;
  owner_id: string;
  organization_id: string | null;
  listing_type: ListingType;
  commodity: string;
  hs_code: string | null;
  origin_country: string | null;
  destination_country: string | null;
  quantity: number | null;
  unit: string | null;
  incoterms: string | null;
  loading_port: string | null;
  price_cents: number | null;
  currency: string;
  price_on_request: boolean;
  specifications: string | null;
  status: ListingStatus;
  moderation_status: ModerationStatus;
  moderation_reasons: string[] | null;
  created_at: string;
  updated_at: string;
}

export type DealStage = "enquiry" | "offer" | "negotiation" | "closed" | "cancelled";

export interface Deal {
  id: string;
  listing_id: string | null;
  initiator_id: string;
  counterparty_id: string | null;
  stage: DealStage;
  title: string | null;
  contact_unlocked: boolean;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  deal_id: string;
  sender_id: string;
  body: string;
  contains_contact_info: boolean;
  created_at: string;
}

export type VerificationKind = "email" | "phone" | "company" | "id" | "trade_reference";
export type VerificationRequestStatus = "pending" | "approved" | "rejected";

export interface Verification {
  id: string;
  profile_id: string | null;
  organization_id: string | null;
  level: VerificationKind;
  status: VerificationRequestStatus;
  document_paths: string[] | null;
  reviewer_id: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrustScoreEvent {
  id: string;
  profile_id: string | null;
  organization_id: string | null;
  delta: number;
  reason: string;
  new_score: number;
  created_by: string | null;
  created_at: string;
}

export type ReportTargetType = "user" | "listing" | "deal";
export type ReportStatus = "open" | "investigating" | "resolved" | "dismissed";

export interface UserReport {
  id: string;
  reporter_id: string | null;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlockedEntity {
  id: string;
  entity_type: "user" | "organization" | "domain" | "email";
  value: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export interface FraudFlag {
  id: string;
  subject_type: "user" | "organization" | "listing" | "deal";
  subject_id: string;
  flag_type: string;
  severity: "low" | "medium" | "high";
  detail: string | null;
  status: "open" | "reviewed" | "cleared";
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Notification {
  id: string;
  profile_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export type AdamftdCheckStatus = "match" | "partial_match" | "no_match" | "manual_review";

export interface AdamftdVerificationCheck {
  id: string;
  requester_id: string | null;
  organization_id: string | null;
  listing_id: string | null;
  company_name: string;
  country: string | null;
  commodity: string | null;
  hs_code: string | null;
  claimed_role: string | null;
  status: AdamftdCheckStatus;
  confidence_score: number | null;
  result_summary: string | null;
  signals: Record<string, boolean> | null;
  cache_key: string | null;
  source: "mock" | "live";
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Trust score rules (spec). Central constant for the Phase 4 engine. ----
export const TRUST_SCORE_RULES = {
  initial: 40,
  min: 0,
  max: 100,
  increase: {
    email_verified: 5,
    phone_verified: 5,
    company_verified: 15,
    id_verified: 15,
    trade_reference: 10,
    completed_deal: 10,
  },
  decrease: {
    user_report: -10,
    verification_rejected: -20,
    suspicious_activity: -10,
    admin_warning: -20,
    suspension: -50,
  },
  blockedScore: 0,
} as const;

// ---- Subscription plan limits (spec). Enforced in Phase 2. ----
export const PLAN_LIMITS: Record<Plan, {
  activeListings: number | "unlimited";
  activeDeals: number | "unlimited";
  documentUploads: boolean;
  adamftdChecksPerMonth: number | "custom";
}> = {
  free:       { activeListings: 2,           activeDeals: 2,           documentUploads: false, adamftdChecksPerMonth: 0 },
  starter:    { activeListings: 10,          activeDeals: 5,           documentUploads: true,  adamftdChecksPerMonth: 1 },
  pro:        { activeListings: "unlimited", activeDeals: "unlimited", documentUploads: true,  adamftdChecksPerMonth: 10 },
  enterprise: { activeListings: "unlimited", activeDeals: "unlimited", documentUploads: true,  adamftdChecksPerMonth: "custom" },
};
