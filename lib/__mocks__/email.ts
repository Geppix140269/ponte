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

export async function sendBrokerageSubmission(data: any): Promise<void> {
  sent.push({ fn: "sendBrokerageSubmission", data });
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
