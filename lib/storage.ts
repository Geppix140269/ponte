import { createAdminClient } from "@/lib/supabase/server";

export const REPORTS_BUCKET = "ponte-reports";
export const DOWNLOAD_TTL_SECONDS = 60 * 60 * 72; // 72h

// Upload a finished report PDF to the private reports bucket (service role).
export async function uploadReport(
  path: string,
  file: File | Blob,
): Promise<{ error: string | null }> {
  const sb = createAdminClient();
  const { error } = await sb.storage.from(REPORTS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: "application/pdf",
  });
  return { error: error?.message ?? null };
}

// Create a time-limited signed download URL for a stored report.
export async function createSignedUrl(
  path: string,
  expiresIn = DOWNLOAD_TTL_SECONDS,
): Promise<string | null> {
  const sb = createAdminClient();
  const { data } = await sb.storage
    .from(REPORTS_BUCKET)
    .createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}
