"use client";

import { useState } from "react";
import { submitNetlifyForm } from "@/lib/netlifyForms";

type Status = "idle" | "submitting" | "success" | "error";

export default function EmailSignup({
  formName,
  buttonLabel = "Subscribe",
  placeholder = "Enter your email",
  variant = "light",
}: {
  formName: string;
  buttonLabel?: string;
  placeholder?: string;
  variant?: "light" | "dark";
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const onDark = variant === "dark";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("submitting");
    try {
      await submitNetlifyForm(formName, { email });
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p
        className={`text-sm ${onDark ? "text-gold" : "text-navy"}`}
        role="status"
      >
        Thank you — we&apos;ll be in touch.
      </p>
    );
  }

  return (
    <div className="w-full max-w-md">
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-3 sm:flex-row"
      >
        <label htmlFor={`email-${formName}`} className="sr-only">
          Email address
        </label>
        <input
          id={`email-${formName}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          className={`flex-1 border px-4 py-3.5 text-sm outline-none transition-colors ${
            onDark
              ? "border-white/25 bg-white/5 text-white placeholder:text-white/40 focus:border-gold"
              : "border-line bg-white text-navy placeholder:text-gray focus:border-gold"
          }`}
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="btn-gold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "submitting" ? "Sending…" : buttonLabel}
        </button>
      </form>
      {status === "error" && (
        <p
          className={`mt-3 text-xs ${onDark ? "text-white/60" : "text-gray"}`}
          role="alert"
        >
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  );
}
