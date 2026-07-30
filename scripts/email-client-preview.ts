// Render Ponte's email under the transformations real clients apply.
//
//   npm run email:clients             HTML frames only, into .email-preview/
//   npm run email:clients:capture     also capture committed PNG evidence
//
// The HTML frames go to .email-preview/clients/ (git-ignored). The PNGs go to
// docs/codex/audits/email/evidence/ and ARE committed, because Constitution
// section 21 asks for rendered evidence on a pull request that changes what a
// member sees, and a screenshot from somebody's machine is not reproducible.
//
// WHAT THIS IS, AND WHAT IT IS NOT
// -------------------------------
// This is NOT a render by Gmail, Yahoo or Outlook. Those three can only be
// obtained by delivering a message to a real mailbox in each and looking at it,
// which is a production action with a real recipient and is recorded as an owner
// step in `docs/launch/LAUNCH-BLOCKERS.md`. Nothing in this repository can
// produce it and this script does not claim to.
//
// What it is: the same document rendered under each client's DOCUMENTED
// limitations, applied as explicit transformations, so that a layout which
// depends on a feature one of them removes fails here rather than in somebody's
// inbox. Each profile below names the transformation and why the client makes
// it. A profile is a hypothesis about a client, and it is written down so it can
// be corrected when the real render disagrees with it.
//
// The transformations are deliberately destructive rather than approximate. The
// question worth answering before a send is "does this email survive losing the
// thing this client takes away", and the honest way to ask it is to take the
// thing away.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { authEmail } from "../lib/email/auth-templates";
import { renderTransactionalEmail } from "../lib/email/render";
import { auditEmailHtml, formatFindings } from "../lib/email/audit";

const OUT = join(".email-preview", "clients");

type Profile = {
  key: string;
  label: string;
  /** Why this client does this. Printed into the index beside the frame. */
  basis: string;
  width: number;
  transform: (html: string) => string;
};

/** Remove the head stylesheet, which is what a client that drops <head> does. */
const stripStyleBlock = (html: string) =>
  html.replace(/<style[\s\S]*?<\/style>/gi, "<!-- style block removed by this profile -->");

/** Drop a declaration by property name from every inline style attribute. */
const dropDeclaration = (html: string, property: string) =>
  html.replace(/style="([^"]*)"/g, (_m, css: string) => {
    const kept = css
      .split(";")
      .filter((d) => d.trim() !== "" && d.split(":")[0].trim().toLowerCase() !== property)
      .join(";");
    return `style="${kept}"`;
  });

const PROFILES: Profile[] = [
  {
    key: "gmail-webmail-desktop",
    label: "Gmail — webmail, desktop",
    basis:
      "Gmail supports a <style> block in webmail, so the media query survives. " +
      "It rewrites nothing structural here. This is the most forgiving of the " +
      "three and is the profile the design was drawn for.",
    width: 900,
    transform: (html) => html,
  },
  {
    key: "gmail-app-non-google-account",
    label: "Gmail — app, non-Google account (GANGA)",
    basis:
      "The Gmail apps strip <head>, and with it the <style> block, for a mailbox " +
      "that is not a Google account. Every layout-critical declaration therefore " +
      "has to be inline, and the mobile media query is not available at all — so " +
      "this frame shows the email at phone width with no responsive padding.",
    width: 390,
    transform: stripStyleBlock,
  },
  {
    key: "yahoo-mail",
    label: "Yahoo Mail",
    basis:
      "Yahoo Mail moves the message into its own document and does not honour a " +
      "<style> block reliably; it also historically rewrote `display:none` on a " +
      "preheader, which is why the preheader is left visible in this frame rather " +
      "than hidden. If the preheader reads as body copy here, it will read that " +
      "way in Yahoo.",
    width: 700,
    transform: (html) =>
      stripStyleBlock(html).replace("display:none;max-height:0;overflow:hidden;", ""),
  },
  {
    key: "outlook-windows-word-engine",
    label: "Outlook — Windows desktop, Word rendering engine",
    basis:
      "Outlook on Windows renders with Word: no media queries, no `max-width` on " +
      "a table, no `border-radius`, and `mso-hide:all` hides the preheader. The " +
      "card therefore has square corners and takes the width the outer table " +
      "gives it, which is what this frame shows. Nothing about the email may " +
      "depend on a rounded corner to be legible.",
    width: 700,
    transform: (html) => {
      let out = stripStyleBlock(html);
      out = dropDeclaration(out, "border-radius");
      out = dropDeclaration(out, "max-width");
      // mso-hide:all removes the preheader entirely.
      out = out.replace(/<div style="display:none[\s\S]*?<\/div>/i, "");
      return out;
    },
  },
];

/** The two documents worth checking: the auth email, and the worst-case body. */
function documents(): { name: string; subject: string; html: string }[] {
  const auth = authEmail();
  const incomplete = renderTransactionalEmail({
    template: "listing_needs_information",
    data: {
      identity: { name: null, company: null, email: "trader@example.com" },
      listing: {
        ref: "PT-0417",
        id: "8f2c1a44-0000-4000-8000-000000000002",
        title:
          "Sustainably sourced Robusta green coffee beans, screen 18, moisture " +
          "below 12.5 per cent, EUDR-compliant documentation available",
        quantity: "500-1,000 MT",
      },
      blockingIssues: [
        "Complete your business verification. Ponte publishes member opportunities from verified businesses only.",
        "State the quantity, or that it is negotiable or available on request.",
        "Add the unit for the quantity you stated.",
        "State your payment terms, or that they are to be agreed.",
        "State how long this listing stays open.",
        "State your role in this trade.",
        "Accept the listing declaration confirming the information is accurate and that you are authorised to submit it.",
      ],
    } as never,
  });

  return [
    { name: "auth-otp", subject: auth.subject, html: auth.html },
    {
      // The template as Supabase RENDERS it, which is the only version a member
      // ever sees. It matters as its own frame because `{{ .Token }}` is eleven
      // characters and a code is six: a preview of the placeholder can wrap on a
      // phone while the real email does not, and — far worse — could fit while
      // the real one overflows. Six digits at this size and tracking is the
      // measurement that counts, so it is captured rather than reasoned about.
      name: "auth-otp-as-delivered",
      subject: auth.subject,
      html: auth.html.replace("{{ .Token }}", "042917"),
    },
    { name: "listing-needs-information", subject: incomplete.subject, html: incomplete.html },
  ];
}

const EVIDENCE = join("docs", "codex", "audits", "email", "evidence");

/**
 * Capture each frame at its profile width.
 *
 * `fullPage`, because an email is read by scrolling and a clipped capture of the
 * top of a card proves the header and nothing else. Animations are irrelevant
 * here (an email has none) but the wait for fonts is not: a capture taken before
 * Georgia resolves shows the fallback and misreports the type.
 */
async function capture(
  frames: { file: string; html: string; width: number }[],
): Promise<void> {
  const { chromium } = await import("@playwright/test");
  mkdirSync(EVIDENCE, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const frame of frames) {
      const page = await browser.newPage({
        viewport: { width: frame.width, height: 900 },
        deviceScaleFactor: 1,
      });
      await page.setContent(frame.html, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      const png = `${frame.file.replace(/\.html$/, "")}.png`;
      await page.screenshot({ path: join(EVIDENCE, png), fullPage: true });
      await page.close();
      console.log(`  captured ${join(EVIDENCE, png)}`);
    }
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  process.env.NEXT_PUBLIC_APP_URL = "https://ponte.trade";
  mkdirSync(OUT, { recursive: true });

  const rows: string[] = [];
  const frames: { file: string; html: string; width: number }[] = [];
  let failures = 0;

  for (const doc of documents()) {
    for (const profile of PROFILES) {
      const html = profile.transform(doc.html);
      const file = `${doc.name}--${profile.key}.html`;
      writeFileSync(join(OUT, file), html, "utf8");
      frames.push({ file, html, width: profile.width });

      // A profile that removes a stylesheet must not be able to produce a
      // document that no longer parses. If it can, the email was depending on
      // that stylesheet for its structure.
      const findings = auditEmailHtml(html);
      if (findings.length) {
        failures += findings.length;
        console.error(`FAIL  ${file}\n${formatFindings(findings)}`);
      }

      rows.push(
        `<section>` +
        `<h3>${doc.name} — ${profile.label}</h3>` +
        `<p class="basis">${profile.basis}</p>` +
        `<p class="meta">Subject: <code>${doc.subject}</code> · frame ${profile.width}px · ` +
        `<a href="${file}">open the source</a> · ` +
        `${findings.length === 0 ? "parses clean" : `<strong>${findings.length} finding(s)</strong>`}</p>` +
        `<iframe src="${file}" width="${profile.width}" height="900" loading="lazy"></iframe>` +
        `</section>`,
      );
      console.log(`${file}  ${profile.width}px  ${findings.length === 0 ? "clean" : "FINDINGS"}`);
    }
  }

  writeFileSync(
    join(OUT, "index.html"),
    `<!DOCTYPE html><meta charset="utf-8"><title>Ponte email — client compatibility</title>
<style>
body{font:14px/1.6 system-ui,sans-serif;margin:32px;max-width:1000px;color:#0F0F0E;background:#FCFBF7}
h1{font:400 26px/1.25 Georgia,serif;margin:0 0 4px}
.lede{color:#3A3733;margin:0 0 24px}
.warn{background:#F2EFE6;border:1px solid #D5CEBC;border-radius:9px;padding:16px;margin:0 0 32px}
section{margin:0 0 40px;padding-top:24px;border-top:1px solid #E5DFD2}
h3{font:600 15px/1.4 system-ui;margin:0 0 6px}
.basis{color:#6E6A61;font-size:13px;margin:0 0 8px}
.meta{color:#6E6A61;font-size:12px;margin:0 0 12px}
code{background:#F2EFE6;padding:1px 5px;border-radius:4px}
iframe{border:1px solid #D5CEBC;background:#fff;max-width:100%}
</style>
<h1>Ponte email — client compatibility previews</h1>
<p class="lede">Fixtures only. No production data, no member data.</p>
<div class="warn"><strong>These are not renders by Gmail, Yahoo or Outlook.</strong>
Each frame is the same document with that client's documented limitations applied
as an explicit transformation, so a layout that depends on a feature the client
removes fails here instead of in somebody's inbox. A real render in each of the
three requires delivering a message to a real mailbox and looking at it, which is
an owner action recorded in <code>docs/launch/LAUNCH-BLOCKERS.md</code> and is not
satisfied by anything on this page.</div>
${rows.join("\n")}`,
    "utf8",
  );

  console.log(`\n${rows.length} frames. Open ${join(OUT, "index.html")}`);

  if (process.argv.includes("--capture")) {
    console.log(`\nCapturing evidence into ${EVIDENCE}`);
    await capture(frames);
  }

  if (failures) {
    console.error(`\n${failures} finding(s) across the degraded documents.`);
    process.exitCode = 1;
  }
}

main();
