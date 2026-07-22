"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/icons";
import AccountGate from "@/components/AccountGate";

/**
 * Request to connect, with the gate attached.
 *
 * The gate is not checked for up front. The button simply tries the action,
 * and a 401 is what opens it. That ordering is the whole point of the trigger
 * map: an anonymous visitor gets to press the button and mean it, and only
 * then is asked who they are. Checking auth first would put a "sign in to
 * respond" wall where the action should be, which is the pattern this
 * replaced.
 *
 * After sign-in the gate calls back into `send` and the request goes through
 * without the member touching the button again.
 */
export default function InterestButton({ refCode }: { refCode: string }) {
  const t = useTranslations("marketplace.interest");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [gateOpen, setGateOpen] = useState(false);
  // Guards a double press. This is a ref rather than the `disabled` attribute
  // because disabling the button blurs it, and a blurred trigger is a trigger
  // the gate cannot hand focus back to when it closes. The keyboard user ends
  // up at the top of the document instead of where they were.
  const inFlight = useRef(false);

  const send = useCallback(async () => {
    setStatus("sending");
    const res = await fetch("/api/marketplace/interest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ref: refCode }),
    });

    if (res.status === 401) {
      // Not signed in. Keep the intent, open the gate, and let it finish.
      setStatus("idle");
      setGateOpen(true);
      return;
    }
    if (!res.ok) {
      setStatus("error");
      throw new Error(t("failed"));
    }
    setStatus("sent");
  }, [refCode, t]);

  async function onClick() {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await send();
    } catch {
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }

  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-label text-cyan">
        <Icon name="check" size={14} /> {t("sent")}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-busy={status === "sending"}
        className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-label text-lime hover:text-ink aria-[busy=true]:opacity-60"
      >
        {status === "sending"
          ? t("sending")
          : status === "error"
            ? t("failed")
            : t("request")}
        <Icon name="chevron" size={14} />
      </button>

      <AccountGate
        open={gateOpen}
        context="inquiry"
        onClose={() => setGateOpen(false)}
        onComplete={send}
      />
    </>
  );
}
