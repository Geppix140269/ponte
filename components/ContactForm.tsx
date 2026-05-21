"use client";

import { useState } from "react";
import { submitNetlifyForm } from "@/lib/netlifyForms";

const services = [
  "Brokering Services",
  "Sourcing Expertise",
  "International Expansion",
  "Cross-Cultural Communication",
  "Agricultural Financing & Investment Advisory",
  "Sustainability & Environmental Consultancy",
  "Market Intelligence & Research",
  "Supply Chain & Logistics Management",
  "Agricultural Project Management",
];

const fieldClass =
  "w-full border border-line bg-white px-4 py-3 text-sm text-navy outline-none transition-colors placeholder:text-gray focus:border-gold";
const labelClass =
  "mb-2 block text-xs font-medium uppercase tracking-wider text-navy";

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(
      new FormData(form).entries(),
    ) as Record<string, string>;

    setStatus("submitting");
    try {
      await submitNetlifyForm("contact", data);
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="border border-line bg-cream p-10">
        <h3 className="text-2xl">Message received</h3>
        <p className="mt-3 text-sm leading-relaxed text-gray">
          Thank you for reaching out to Ponte. A member of our team will respond
          within one business day.
        </p>
      </div>
    );
  }

  return (
    <form
      name="contact"
      method="POST"
      data-netlify="true"
      netlify-honeypot="bot-field"
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <input type="hidden" name="form-name" value="contact" />
      <p hidden>
        <label>
          Don&apos;t fill this out: <input name="bot-field" />
        </label>
      </p>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={labelClass}>
            First Name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            className={fieldClass}
            placeholder="Jane"
          />
        </div>
        <div>
          <label htmlFor="lastName" className={labelClass}>
            Last Name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            className={fieldClass}
            placeholder="Doe"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className={labelClass}>
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className={fieldClass}
          placeholder="jane@company.com"
        />
      </div>

      <div>
        <label htmlFor="company" className={labelClass}>
          Company
        </label>
        <input
          id="company"
          name="company"
          type="text"
          className={fieldClass}
          placeholder="Company Ltd"
        />
      </div>

      <div>
        <label htmlFor="interest" className={labelClass}>
          Area of Interest
        </label>
        <select id="interest" name="interest" className={fieldClass} defaultValue="">
          <option value="" disabled>
            Select a service
          </option>
          {services.map((service) => (
            <option key={service} value={service}>
              {service}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="message" className={labelClass}>
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          className={`${fieldClass} resize-y`}
          placeholder="Tell us about your project or enquiry…"
        />
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="btn-gold w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? "Sending…" : "Send Message"}
      </button>

      {status === "error" && (
        <p className="text-sm text-gray" role="alert">
          Something went wrong sending your message. Please email us directly at{" "}
          <a href="mailto:info@ponte.trade" className="text-gold">
            info@ponte.trade
          </a>
          .
        </p>
      )}
    </form>
  );
}
