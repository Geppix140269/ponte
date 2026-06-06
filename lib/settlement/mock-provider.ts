import type { SettlementProvider, CreateEscrowInput, EscrowState } from "./types";
const store = new Map<string, EscrowState>();
export class MockSettlementProvider implements SettlementProvider {
  readonly source = "mock" as const;
  async createEscrow(input: CreateEscrowInput): Promise<EscrowState> {
    const ref = "esc_mock_" + Math.random().toString(36).slice(2, 10);
    void input;
    const state: EscrowState = { providerRef: ref, status: "draft", heldCents: 0, releasedCents: 0 };
    store.set(ref, state); return state;
  }
  async fundEscrow(ref: string, amountCents: number): Promise<EscrowState> {
    const s = store.get(ref); if (!s) throw new Error("unknown escrow");
    s.heldCents += amountCents; s.status = "funded"; return s;
  }
  async releaseMilestone(ref: string, _seq: number): Promise<EscrowState> {
    const s = store.get(ref); if (!s) throw new Error("unknown escrow"); return s;
  }
  async refund(ref: string, _reason: string): Promise<EscrowState> {
    const s = store.get(ref); if (!s) throw new Error("unknown escrow");
    s.status = "refunded"; s.heldCents = 0; return s;
  }
  async getState(ref: string): Promise<EscrowState> {
    const s = store.get(ref); if (!s) throw new Error("unknown escrow"); return s;
  }
}
