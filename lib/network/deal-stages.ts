// Pure 5-stage deal lifecycle state machine. No I/O.
import type { DealStage } from "@/lib/types/network";

export const DEAL_STAGES: DealStage[] = ["enquiry", "offer", "negotiation", "closed", "cancelled"];

// Forward ladder, plus cancel from any live stage. Closed/cancelled are terminal.
const TRANSITIONS: Record<DealStage, DealStage[]> = {
  enquiry: ["offer", "cancelled"],
  offer: ["negotiation", "cancelled"],
  negotiation: ["closed", "cancelled"],
  closed: [],
  cancelled: [],
};

export function nextStages(from: DealStage): DealStage[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransition(from: DealStage, to: DealStage): boolean {
  return nextStages(from).includes(to);
}

export function isTerminal(stage: DealStage): boolean {
  return stage === "closed" || stage === "cancelled";
}

// A deal counts as successfully completed only when it reaches "closed".
export function isSuccessfulClose(from: DealStage, to: DealStage): boolean {
  return to === "closed" && canTransition(from, to);
}
