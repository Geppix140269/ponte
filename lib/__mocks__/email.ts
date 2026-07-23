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

export async function sendListingReceived(to: string, data: any): Promise<void> {
  sent.push({ fn: "sendListingReceived", to, data });
}
