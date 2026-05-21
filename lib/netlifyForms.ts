function encodeFormData(data: Record<string, string>): string {
  return Object.keys(data)
    .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
    .join("&");
}

/**
 * Submits a form to Netlify Forms.
 *
 * Posts URL-encoded data to the static /__forms.html file (which registers the
 * form definitions at build time). Throws if the request fails — note this will
 * always fail in local `next dev` since Netlify's form handler only exists on
 * deployed Netlify infrastructure.
 */
export async function submitNetlifyForm(
  formName: string,
  data: Record<string, string>,
): Promise<void> {
  const res = await fetch("/__forms.html", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: encodeFormData({ "form-name": formName, ...data }),
  });
  if (!res.ok) {
    throw new Error(`Form submission failed with status ${res.status}`);
  }
}
