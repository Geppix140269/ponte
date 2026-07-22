"use client";

import { useEffect, useRef, useState } from "react";

const LENGTH = 6;

/**
 * Six boxes for the code from the sign-in email.
 *
 * The whole point of this component is that a member never has to think about
 * it: it takes focus on mount, accepts a pasted code in one go, moves itself
 * along as digits arrive, and submits on its own when the sixth lands. Nobody
 * should have to press a button after typing a code they were just sent.
 *
 * It is one input per digit rather than one field, because that is what the
 * design shows and because on a phone it makes each target thumb sized. The
 * cost is that every keyboard behaviour has to be handled by hand, which is
 * what most of the code below is.
 */
export default function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  invalid = false,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  onComplete: (code: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  label: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [focused, setFocused] = useState<number | null>(null);
  const digits = value.padEnd(LENGTH, " ").slice(0, LENGTH).split("");

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  // Fires once, on the transition to full. Without the guard, a re-render
  // while the request is in flight would submit the same code twice.
  const submitted = useRef(false);
  useEffect(() => {
    if (value.length === LENGTH && !submitted.current) {
      submitted.current = true;
      onComplete(value);
    }
    if (value.length < LENGTH) submitted.current = false;
  }, [value, onComplete]);

  function setDigit(index: number, digit: string) {
    const next = value.padEnd(LENGTH, " ").split("");
    next[index] = digit;
    onChange(next.join("").replace(/ +$/, "").trimEnd());
  }

  function handleChange(index: number, raw: string) {
    const only = raw.replace(/\D/g, "");
    if (!only) return;

    // A paste lands in one box as the whole code. Spread it rather than
    // taking the first character, which is what a naive handler does and is
    // maddening when the code came from a password manager.
    if (only.length > 1) {
      const merged = (value.slice(0, index) + only).replace(/\D/g, "").slice(0, LENGTH);
      onChange(merged);
      refs.current[Math.min(merged.length, LENGTH - 1)]?.focus();
      return;
    }

    setDigit(index, only);
    if (index < LENGTH - 1) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index].trim()) {
        // Clear this box and stay: deleting a wrong digit should not also
        // move the cursor, or correcting one character costs two keystrokes.
        onChange(value.slice(0, index));
      } else if (index > 0) {
        onChange(value.slice(0, index - 1));
        refs.current[index - 1]?.focus();
      }
      return;
    }
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      refs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < LENGTH - 1) {
      e.preventDefault();
      refs.current[index + 1]?.focus();
    }
  }

  return (
    <div>
      <span className="sr-only" id="otp-label">
        {label}
      </span>
      <div className="flex gap-2" role="group" aria-labelledby="otp-label" dir="ltr">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            // One-time-code lets iOS and Android offer the code straight from
            // the notification, which removes the trip to the mail app.
            autoComplete={i === 0 ? "one-time-code" : "off"}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={LENGTH}
            value={d.trim()}
            disabled={disabled}
            aria-label={`${label} ${i + 1}`}
            aria-invalid={invalid || undefined}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => {
              setFocused(i);
              e.target.select();
            }}
            onBlur={() => setFocused(null)}
            className="mono h-14 w-full rounded-xl border bg-white/5 text-center text-[22px] tabular-nums text-cream transition-colors focus:outline-none disabled:opacity-50"
            style={{
              borderColor: invalid
                ? "rgba(224,122,95,0.7)"
                : focused === i
                  ? "var(--gold)"
                  : "rgba(255,255,255,0.14)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
