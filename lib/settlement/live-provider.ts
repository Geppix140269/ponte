// Live settlement provider — STUB. Implement against the chosen regulated escrow
// / EMI partner at P1. Keep SETTLEMENT_LIVE=false until then.
import type { SettlementProvider, CreateEscrowInput, EscrowState } from "./types";
const NOT_READY = "Live settlement provider not implemented (partner not yet integrated). Keep SETTLEMENT_LIVE=false.";
export class LiveSettlementProvider implements SettlementProvider {
  readonly source = "live" as const;
  async createEscrow(_i: CreateEscrowInput): Promise<EscrowState> { throw new Error(NOT_READY); }
  async fundEscrow(_r: string, _a: number): Promise<EscrowState> { throw new Error(NOT_READY); }
  async releaseMilestone(_r: string, _s: number): Promise<EscrowState> { throw new Error(NOT_READY); }
  async refund(_r: string, _x: string): Promise<EscrowState> { throw new Error(NOT_READY); }
  async getState(_r: string): Promise<EscrowState> { throw new Error(NOT_READY); }
}
