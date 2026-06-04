// Pure mutual-acceptance contact gate + message masking. Direct contact details
// stay hidden until BOTH parties accept. No I/O (masking reuses contact-mask).
import { maskContactInfo } from "@/lib/network/contact-mask";

export function computeContactUnlocked(
  initiatorAccepted: boolean,
  counterpartyAccepted: boolean,
): boolean {
  return Boolean(initiatorAccepted && counterpartyAccepted);
}

// Render a message body: shown verbatim once contact is unlocked, otherwise any
// contact details are masked out.
export function renderMessageBody(body: string, contactUnlocked: boolean): string {
  if (contactUnlocked) return body;
  return maskContactInfo(body).masked;
}

// Whose acceptance flag does this participant control?
export function acceptanceColumnFor(
  role: "initiator" | "counterparty",
): "initiator_accepted_contact" | "counterparty_accepted_contact" {
  return role === "initiator" ? "initiator_accepted_contact" : "counterparty_accepted_contact";
}
