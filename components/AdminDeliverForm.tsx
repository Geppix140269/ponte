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

export default function AdminDeliverForm({
  itemId,
  orderId,
}: {
  itemId: string;
  orderId: string;
}) {
  return (
    <form action={deliverItemAction} className="flex items-center gap-2">
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="orderId" value={orderId} />
      <input
        type="file"
        name="file"
        accept="application/pdf"
        required
        className="max-w-[180px] text-[11px] text-gray-2 file:mr-2 file:rounded-full file:border-0 file:bg-navy-700 file:px-3 file:py-1 file:text-[11px] file:uppercase file:text-cream"
        style={{ letterSpacing: "0.18em" }}
      />
      <SubmitButton />
    </form>
  );
}
