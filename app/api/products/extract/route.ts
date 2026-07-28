import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { MAX_UPLOAD_BYTES, readDocument } from "@/lib/documents/read";
import { extractFromDocument } from "@/lib/products/extract-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Document to deal: one uploaded trade document in, structured sourced facts out.
 *
 *   POST multipart/form-data, field `file`
 *     -> 200 { ok: true, extraction }
 *     -> 200 { ok: false, reason: "blocked",  filename, format, message }
 *     -> 200 { ok: false, reason: "unreadable", filename, message }
 *     -> 429 { ok: false, reason: "rate_limited" }
 *
 * A blocked format and an unreadable file are 200 with `ok: false`, not 4xx.
 * They are journey states the member acts on, not transport errors, and the
 * surface must show the format's name and the two intake methods that still
 * work. Giving them a 4xx invites a generic error handler to swallow the one
 * thing the member needed to read.
 *
 * ## What this route does not do
 *
 * It does not write the file anywhere. There is no storage bucket, retention
 * rule or RLS policy for member trade documents, and creating one is an owner
 * decision recorded in the ExecPlan rather than a side effect of this endpoint.
 * The bytes live for the length of the request; the extraction goes back to the
 * client, which holds it in the intake session.
 *
 * It also does not create, publish or verify anything. The member reviews and
 * confirms first, which is the boundary the whole decision turns on.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  // Tighter than resolution: reading a document is a whole-document model call.
  if (
    !checkRateLimit(`pextract:min:${ip}`, 4, 60 * 1000) ||
    !checkRateLimit(`pextract:hr:${ip}`, 25, 60 * 60 * 1000)
  ) {
    return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({
      ok: false,
      reason: "unreadable",
      filename: file.name,
      message: `The file is larger than ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
    });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const read = readDocument(file.name, bytes);

  if (read.kind === "blocked") {
    return NextResponse.json({
      ok: false,
      reason: "blocked",
      filename: read.filename,
      format: read.format,
      message: read.reason,
    });
  }
  if (read.kind === "failed") {
    return NextResponse.json({
      ok: false,
      reason: "unreadable",
      filename: read.filename,
      message: read.reason,
    });
  }

  const extraction = await extractFromDocument(read);
  return NextResponse.json({ ok: true, extraction });
}
