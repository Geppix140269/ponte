import { describe, it, expect } from "vitest";
import { canTransition, nextStages, isTerminal, isSuccessfulClose } from "@/lib/network/deal-stages";

describe("deal stage transitions", () => {
  it("follows the forward ladder", () => {
    expect(canTransition("enquiry", "offer")).toBe(true);
    expect(canTransition("offer", "negotiation")).toBe(true);
    expect(canTransition("negotiation", "closed")).toBe(true);
  });
  it("allows cancel from any live stage", () => {
    expect(canTransition("enquiry", "cancelled")).toBe(true);
    expect(canTransition("offer", "cancelled")).toBe(true);
    expect(canTransition("negotiation", "cancelled")).toBe(true);
  });
  it("rejects skips and backward moves", () => {
    expect(canTransition("enquiry", "closed")).toBe(false);
    expect(canTransition("enquiry", "negotiation")).toBe(false);
    expect(canTransition("negotiation", "offer")).toBe(false);
  });
  it("terminal stages allow nothing", () => {
    expect(nextStages("closed")).toHaveLength(0);
    expect(nextStages("cancelled")).toHaveLength(0);
    expect(isTerminal("closed")).toBe(true);
    expect(isTerminal("enquiry")).toBe(false);
  });
  it("successful close only from negotiation", () => {
    expect(isSuccessfulClose("negotiation", "closed")).toBe(true);
    expect(isSuccessfulClose("enquiry", "closed")).toBe(false);
    expect(isSuccessfulClose("negotiation", "cancelled")).toBe(false);
  });
});
