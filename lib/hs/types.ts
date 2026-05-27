export type HSSchedule = "WCO" | "US_HTS" | "EU_TARIC" | "UK_GTT";

export const SCHEDULE_LABELS: Record<HSSchedule, string> = {
  WCO: "Generic HS-6 (WCO)",
  US_HTS: "United States (HTS)",
  EU_TARIC: "European Union (TARIC)",
  UK_GTT: "United Kingdom (GTT)",
};

export interface HSCode {
  id: number;
  code: string;
  code_clean: string;
  schedule: HSSchedule;
  level: number;
  chapter: string;
  chapter_desc: string;
  heading: string;
  heading_desc: string;
  subheading: string | null;
  subheading_desc: string | null;
  description: string;
  parent_code: string | null;
  notes: string | null;
  unit: string | null;
  hs_version: string;
  is_active: boolean;
}

export interface HSSearchResult extends HSCode {
  similarity: number;
  confidence: "high" | "medium" | "low";
  used_gpt: boolean;
  gpt_explanation?: string;
}

export interface HSSearchRequest {
  query: string;
  schedule?: HSSchedule | null;
  limit?: number;
}

export interface HSSearchResponse {
  results: HSSearchResult[];
  query: string;
  schedule: HSSchedule | null;
  used_gpt: boolean;
}

export interface HSSavedCode {
  id: number;
  user_id: string;
  hs_code_id: number;
  label: string | null;
  notes: string | null;
  created_at: string;
  hs_codes: HSCode;
}

export interface MatchHSCodesRow {
  id: number;
  code: string;
  schedule: HSSchedule;
  level: number;
  chapter: string;
  chapter_desc: string;
  heading: string;
  heading_desc: string;
  description: string;
  unit: string | null;
  similarity: number;
}
