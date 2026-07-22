// Simple in-memory IP rate limiter.
//
// In-memory: persists per warm serverless instance, resets on cold start.
// That's intentional — for low/moderate traffic this is enough, and we
// avoid the overhead of an external rate-limit store. If volume grows,
// swap this for Upstash Redis or Supabase rate-limit table.
//
// Usage:
//   import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
//   const ip = getClientIp(req);
//   if (!checkRateLimit(`hs-search:${ip}`, 30, 60 * 60 * 1000)) {
//     return NextResponse.json({ error: "Too many requests" }, { status: 429 });
//   }

import type { NextRequest } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Returns true if the request is allowed, false if it's over the limit.
 *
 * @param key     unique key for this bucket (e.g. "hs-search:1.2.3.4")
 * @param limit   max requests per window
 * @param windowMs window length in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

/**
 * Extract the client IP from a Next.js request. Falls back through
 * x-forwarded-for → x-real-ip → "unknown".
 *
 * Vercel's proxy populates x-forwarded-for with the real client IP as the
 * first comma-separated value, the same shape Netlify used, so this needed no
 * change in the move between them.
 */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}
