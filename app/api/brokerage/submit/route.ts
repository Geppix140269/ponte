import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendBrokerageSubmission, type BrokerageSubmissionType } from "@/lib/email";
import { sendTelegramOpsMessage, escapeMd } from "@/lib/telegram";

const TYPES: BrokerageSubmissionType[] = ["offer", "requirement", "network"];

function clean(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`brokerage:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real users never fill this field.
  if (clean(body.website, 10)) {
    return NextResponse.json({ ok: true });
  }

  const type = clean(body.type, 20) as BrokerageSubmissionType;
  const data = {
    type,
    name: clean(body.name, 120),
    company: clean(body.company, 160),
    email: clean(body.email, 200),
    country: clean(body.country, 80),
    product: clean(body.product, 200) || undefined,
    volume: clean(body.volume, 120) || undefined,
    details: clean(body.details, 2000),
  };

  if (
    !TYPES.includes(type) ||
    !data.name ||
    !data.company ||
    !data.country ||
    !data.details ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
  ) {
    return NextResponse.json(
      { error: "Please complete all required fields." },
      { status: 400 },
    );
  }

  try {
    await sendBrokerageSubmission(data);
  } catch {
    return NextResponse.json(
      { error: "Could not send your submission. Please email deals@ponte.trade directly." },
      { status: 502 },
    );
  }

  // Best-effort ops ping, never blocks the response.
  sendTelegramOpsMessage(
    `📨 *${escapeMd(type.toUpperCase())}* from ${escapeMd(data.company)} \\(${escapeMd(data.country)}\\) · ${escapeMd(data.email)}`,
    { parseMode: "MarkdownV2" },
  ).catch(() => {});

  return NextResponse.json({ ok: true });
}
