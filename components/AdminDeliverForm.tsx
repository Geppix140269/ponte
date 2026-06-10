"use client";

import { useFormStatus } from "react-dom";
import { deliverItemAction } from "@/app/admin/orders/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-gold px-3 py-1.5 text-xs disabled:opacity-60"
    >
      {pending ? "Delivering…" : "Upload & deliver"}
    </button>
  );
}

/**
 * Admin form to upload a finished report PDF for an order item.
 *
 * Captures:
 *   - The PDF file
 *   - Senior reviewer initials (defaults to GF, optional override)
 *   - Customer organisation (used on the cover page; falls back to email)
 *
 * Server action prepends a branded cover page (Author / Senior Reviewer /
 * Issued / Licensed to / Licence / Watermark ID) and stamps the per-page
 * watermark before uploading to storage.
 */
export default function AdminDeliverForm({
  itemId,
  orderId,
  defaultLicensedTo,
}: {
  itemId: string;
  orderId: string;
  /** Suggested "Licensed to" value, usually the customer's email/name */
  defaultLicensedTo?: string;
}) {
  return (
    <form
      action={deliverItemAction}
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
    >
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="orderId" value={orderId} />
      <input
        type="file"
        name="file"
        accept="application/pdf"
        required
        className="max-w-[200px] text-[11px] text-gray-2 file:mr-2 file:rounded-full file:border-0 file:bg-navy-700 file:px-3 file:py-1 file:text-[11px] file:uppercase file:text-cream"
        style={{ letterSpacing: "0.18em" }}
      />
      <input
        type="text"
        name="reviewerInitials"
        defaultValue="GF"
        maxLength={4}
        placeholder="Reviewer (initials)"
        className="w-[90px] rounded-full border border-white/15 bg-transparent px-3 py-1 text-[11px] text-cream placeholder:text-gray-2/60"
        title="Senior reviewer initials, prints on the PDF cover page"
      />
      <input
        type="text"
        name="licensedTo"
        defaultValue={defaultLicensedTo ?? ""}
        placeholder="Licensed to (organisation)"
        className="min-w-[180px] flex-1 rounded-full border border-white/15 bg-transparent px-3 py-1 text-[11px] text-cream placeholder:text-gray-2/60"
        title="Customer organisation name, prints on the PDF cover page. Falls back to email if blank."
      />
      <SubmitButton />
    </form>
  );
}
