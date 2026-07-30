// Test double for @/lib/email: record every send, do nothing else.
/* eslint-disable @typescript-eslint/no-explicit-any */

export type SentEmail = { fn: string; to?: string; data?: any };
export const sent: SentEmail[] = [];

export function __resetEmail(): void {
  sent.length = 0;
}

export function sentOf(fn: string): SentEmail[] {
  return sent.filter((e) => e.fn === fn);
}

export async function sendConnectRequest(to: string, data: any): Promise<void> {
  sent.push({ fn: "sendConnectRequest", to, data });
}

export async function sendConnectAccepted(to: string, data: any): Promise<void> {
  sent.push({ fn: "sendConnectAccepted", to, data });
}

/**
 * What the next `sendBrokerageSubmission` returns. Defaults to a real delivery;
 * a test sets it to simulate the desk not being notified (no operator address,
 * or a provider error) so the route's observability can be asserted.
 */
export let __nextBrokerageResult: any = {
  ok: true,
  skipped: false,
  messageId: "mock-msg",
  template: "operator_alert",
};

export function __setNextBrokerageResult(r: any): void {
  __nextBrokerageResult = r;
}

export async function sendBrokerageSubmission(data: any): Promise<any> {
  sent.push({ fn: "sendBrokerageSubmission", data });
  return __nextBrokerageResult;
}

/** Mirrors the real helper: a send counts as delivered only if sent, not skipped. */
export function wasDelivered(result: any): boolean {
  return result?.ok === true && result?.skipped === false;
}

// The listing lifecycle senders. `sendListingReceived` and
// `sendListingDecision` are gone with the manual-approval workflow: the first
// told the member a person would read their listing, and the second announced
// a decision nobody takes any more for the ordinary case (ADR-0013).
export async function sendListingPublished(to: string, data: any): Promise<void> {
  sent.push({ fn: "sendListingPublished", to, data });
}

export async function sendListingNeedsInformation(to: string, data: any): Promise<void> {
  sent.push({ fn: "sendListingNeedsInformation", to, data });
}

export async function sendListingFlaggedAlert(data: any): Promise<void> {
  sent.push({ fn: "sendListingFlaggedAlert", data });
}

export async function sendListingFlaggedNotice(to: string, data: any): Promise<void> {
  sent.push({ fn: "sendListingFlaggedNotice", to, data });
}

export async function sendListingSuspended(to: string, data: any): Promise<void> {
  sent.push({ fn: "sendListingSuspended", to, data });
}

export async function sendListingRejected(to: string, data: any): Promise<void> {
  sent.push({ fn: "sendListingRejected", to, data });
}
