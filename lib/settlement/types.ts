// Settlement (escrow / clearing) types and the provider contract.
// Swappable provider, same pattern as the ADAMftd verification layer.

export type TriggerType = "deposit" | "shipment" | "arrival" | "inspection" | "custom";
export type MilestoneStatus = "pending" | "funded" | "ready" | "released" | "refunded" | "disputed";
export type SettlementStatus =
  | "draft" | "funded" | "partially_released" | "released" | "refunded" | "disputed" | "cancelled";

export interface MilestoneSpec {
  label: string;
  pct: number;
  trigger: TriggerType;
  requiredDocType?: string;
}
export interface Milestone extends MilestoneSpec {
  seq: number;
  amountCents: number;
  status: MilestoneStatus;
}
export interface CreateEscrowInput {
  dealId: string;
  currency: string;
  totalCents: number;
  feeBps: number;
  milestones: Milestone[];
  buyerRef?: string;
  sellerRef?: string;
}
export interface EscrowState {
  providerRef: string;
  status: SettlementStatus;
  heldCents: number;
  releasedCents: number;
}
export interface SettlementProvider {
  readonly source: "mock" | "live";
  createEscrow(input: CreateEscrowInput): Promise<EscrowState>;
  fundEscrow(providerRef: string, amountCents: number): Promise<EscrowState>;
  releaseMilestone(providerRef: string, milestoneSeq: number): Promise<EscrowState>;
  refund(providerRef: string, reason: string): Promise<EscrowState>;
  getState(providerRef: string): Promise<EscrowState>;
}
