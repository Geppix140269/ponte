"use client";

import { useState } from "react";
import {
  confirmDeliveryAction,
  capturePaymentAction,
  voidAuthorizationAction,
} from "@/app/admin/orders/actions";

interface Props {
  orderId: string;
  statusV2: string;
  captureMethod: string | null;
  confirmedDeliveryAt: string | null;
  captureDeadlineAt: string | null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

export default function AdminOrderControls({
  orderId,
  statusV2,
  captureMethod,
  confirmedDeliveryAt,
  captureDeadlineAt,
}: Props) {
  const isManual = captureMethod === "manual";
  const isAuthorized = statusV2 === "authorized";
  const isConfirmed = statusV2 === "confirmed";
  const canCapture = isManual && (isAuthorized || isConfirmed);
  const canVoid = isManual && (isAuthorized || isConfirmed);

  // Default the confirm-delivery picker to today's date
  const defaultDate =
    confirmedDeliveryAt?.slice(0, 10) ??
    new Date().toISOString().slice(0, 10);

  const [confirmedBusy, setConfirmedBusy] = useState(false);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [voidBusy, setVoidBusy] = useState(false);

  // Compute time remaining on the Stripe auth window
  let deadlineLabel = "-";
  let deadlineUrgent = false;
  if (captureDeadlineAt) {
    const ms = new Date(captureDeadlineAt).getTime() - Date.now();
    const hoursLeft = Math.floor(ms / 3600000);
    deadlineUrgent = hoursLeft < 24;
    if (ms < 0) deadlineLabel = "EXPIRED";
    else if (hoursLeft < 24) deadlineLabel = `${hoursLeft}h left`;
    else deadlineLabel = `${Math.floor(hoursLeft / 24)}d left`;
  }

  return (
    <div className="mt-4 rounded-md border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center gap-4 text-[11px] uppercase text-gray-2"
           style={{ letterSpacing: "0.18em" }}>
        <span>
          STATUS:{" "}
          <span className={`${statusV2 === "voided" ? "text-negative" : "text-cream"}`}>
            {statusV2}
          </span>
        </span>
        <span>
          METHOD:{" "}
          <span className="text-cream">{captureMethod ?? "automatic"}</span>
        </span>
        {isManual && (isAuthorized || isConfirmed) && (
          <span>
            DEADLINE:{" "}
            <span className={deadlineUrgent ? "text-negative" : "text-gold"}>
              {deadlineLabel}
            </span>
          </span>
        )}
        {confirmedDeliveryAt && (
          <span>
            CONFIRMED:{" "}
            <span className="text-cream">{fmtDate(confirmedDeliveryAt)}</span>
          </span>
        )}
      </div>

      {isManual && (isAuthorized || isConfirmed) && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
          <form
            action={async (fd) => {
              setConfirmedBusy(true);
              await confirmDeliveryAction(fd);
              setConfirmedBusy(false);
            }}
            className="flex items-center gap-2"
          >
            <input type="hidden" name="orderId" value={orderId} />
            <label className="field-label whitespace-nowrap !mb-0">
              Delivery by
            </label>
            <input
              type="date"
              name="confirmedDelivery"
              defaultValue={defaultDate}
              className="field !py-2"
            />
            <button
              type="submit"
              disabled={confirmedBusy}
              className="btn-ghost-light !px-4 !py-2 text-[12px]"
            >
              {confirmedBusy ? "..." : "Confirm"}
            </button>
          </form>

          {canCapture && (
            <form
              action={async (fd) => {
                if (!confirm("Capture payment? Customer will be charged.")) return;
                setCaptureBusy(true);
                await capturePaymentAction(fd);
                setCaptureBusy(false);
              }}
            >
              <input type="hidden" name="orderId" value={orderId} />
              <button
                type="submit"
                disabled={captureBusy}
                className="btn-gold !px-4 !py-2 text-[12px] whitespace-nowrap"
              >
                {captureBusy ? "Capturing..." : "Capture payment"}
              </button>
            </form>
          )}

          {canVoid && (
            <form
              action={async (fd) => {
                if (!confirm("Void authorization? Customer will NOT be charged. This cannot be undone.")) return;
                setVoidBusy(true);
                await voidAuthorizationAction(fd);
                setVoidBusy(false);
              }}
            >
              <input type="hidden" name="orderId" value={orderId} />
              <button
                type="submit"
                disabled={voidBusy}
                className="!px-4 !py-2 text-[12px] whitespace-nowrap rounded-full text-negative border border-negative/40 hover:bg-negative/10"
              >
                {voidBusy ? "Voiding..." : "Void"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
