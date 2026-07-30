"use client";

/**
 * The last-resort error boundary.
 *
 * A global error replaces the root layout itself, so this file must render its
 * own <html> and <body> and cannot rely on the locale provider, the shared
 * chrome or the app stylesheet being present. It is therefore self-contained and
 * inline-styled, English only (the interface is English by policy), and it still
 * gives the two recoveries the brief requires: reload, or go to the home page.
 * It is intentionally plain; its job is to never be a dead end.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#0a0c11",
          color: "#eef1f5",
          fontFamily:
            "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: "420px", textAlign: "center" }}>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: "13px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#8a93a2",
            }}
          >
            Ponte Trade
          </p>
          <h1 style={{ margin: "0 0 10px", fontSize: "22px", fontWeight: 700 }}>
            Something went wrong
          </h1>
          <p style={{ margin: "0 0 22px", fontSize: "15px", lineHeight: 1.5, color: "#c2ccd8" }}>
            We could not load the page. Your place in Ponte Trade is safe. Try again, or return to
            the home page.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: "44px",
                padding: "10px 18px",
                borderRadius: "12px",
                border: "none",
                background: "#eef1f5",
                color: "#0a0c11",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                minHeight: "44px",
                display: "inline-flex",
                alignItems: "center",
                padding: "10px 18px",
                borderRadius: "12px",
                border: "1px solid #2a313d",
                background: "transparent",
                color: "#eef1f5",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Return to Ponte Trade
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
