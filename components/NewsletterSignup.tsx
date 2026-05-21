"use client";

import { useState } from "react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    // Wired to Resend / Stripe (SB-001) in a later phase.
    setDone(true);
    setEmail("");
  }

  if (done) {
    return (
      <p className="text-sm font-semibold text-gold" role="status">
        Thanks — we&apos;ll be in touch with subscription details.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="flex-1 rounded-md border border-white/25 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-gold"
      />
      <button type="submit" className="btn-gold whitespace-nowrap">
        Subscribe
      </button>
    </form>
  );
}
