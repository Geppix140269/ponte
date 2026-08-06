// Builds the B01-B09 contact sheet: one self-contained HTML file that opens by
// double-click, with every still embedded as a data URL.
//
//   node scripts/build-contact-sheet.mjs
//
// Self-contained because the alternative is a page that only works from inside
// a checkout with the evidence directory intact. This one can be attached to a
// message, opened from a download folder, or read on a machine that has never
// seen the repository, which is what "a page I can look at" has to mean.
//
// It is a VIEWER, not a surface. It carries no design intent, adopts none of
// the bridge system's tokens, and is deliberately plain: anything it did
// stylistically would be read as part of what it is showing.
//
// Rerun it after any evidence run. It reads the directory rather than a list,
// so a still that is missing shows as a stated gap rather than as a hole.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const STILLS = "e2e/evidence/bridge-path";
const OUT = "docs/ponte/design-reference/b01-b09-contact-sheet.html";

/**
 * The walk, in the order it is walked.
 *
 * Written out rather than derived from the filenames, because the ORDER is the
 * claim: this is a journey, and a sheet sorted alphabetically would show nine
 * screens rather than one path. `id` is the design-reference identifier, `state`
 * is which of a surface's states this is, and `slug` matches the capture.
 */
const SIGNED_OUT = [
  ["01-B01-direction", "B01", "Choose deal intent", "Direction: what kind of deal"],
  ["02-B01-family", "B01", "Choose deal intent", "Family: what you are offering"],
  ["03-B01b-empty", "B01b", "Capacity declaration", "Nothing chosen"],
  ["04-B01b-chosen", "B01b", "Capacity declaration", "Principal chosen"],
  ["05-B02-routes", "B02", "Tell Ponte", "Four routes in"],
  ["06-B02-typing", "B02", "Tell Ponte", "Typing, with search"],
  ["07-B02-candidates", "B02", "Tell Ponte", "What Ponte understood"],
  ["08-B03-B05-arrival", "B03-B05", "The listing so far", "On arrival, with the report"],
  ["09-B03-B05-sheet", "B03-B05", "The listing so far", "Correction in place, the sheet"],
  ["10-B03-B05-complete", "B03-B05", "The listing so far", "Every gap closed"],
  ["11-B06-gated", "B06", "Description and assets", "Signed out: upload states its gate"],
  ["12-B07-preview", "B07", "Deal preview", "Three layers, and validity"],
  ["13-B07-identity", "B07", "Deal preview", "Who sees your company"],
  ["14-B08-email", "B08", "Sign in to publish", "The address"],
];

const SIGNED_IN = [
  ["15-B06-open", "B06", "Description and assets", "Signed in: upload is open"],
  ["16-B07-signed-in", "B07", "Deal preview", "Publishing runs the checks"],
  ["17-B09s-checks", "B09s", "Screening", "Checked"],
  ["18-B09-published", "B09", "Submission confirmation", "Live, and the crossing complete"],
];

function dataUrl(file) {
  const path = `${STILLS}/${file}`;
  if (!existsSync(path)) return null;
  return `data:image/png;base64,${readFileSync(path).toString("base64")}`;
}

const escape = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

let embedded = 0;
let missing = 0;

function cell(shell, slug, label) {
  const url = dataUrl(`${shell}-${slug}.png`);
  if (!url) {
    missing++;
    return `<figure class="c gap"><figcaption>${label}</figcaption><div class="none">This still was not captured. The ${shell} walk did not reach this state, so there is nothing here to look at rather than something that failed to load.</div></figure>`;
  }
  embedded++;
  return `<figure class="c"><figcaption>${label}</figcaption><img alt="${escape(label)}" src="${url}"></figure>`;
}

/**
 * The three shells, widest first.
 *
 * 2,560 leads because it is the width the owner works at and the width every
 * proof before this one omitted. Reading left to right is then reading from the
 * screen the page was hardest to get right on to the one it was easiest.
 */
const SHELLS = [
  ["wide", "2560 x 1440"],
  ["desktop", "1440 x 900"],
  ["phone", "390 x 844"],
];

function rows(steps) {
  return steps
    .map(([slug, id, screen, state]) => {
      return `<section class="r">
  <h3><span class="id">${id}</span> ${escape(screen)} <span class="st">${escape(state)}</span></h3>
  <div class="trio">
    ${SHELLS.map(([shell, label]) => cell(shell, slug, label)).join("\n    ")}
  </div>
</section>`;
    })
    .join("\n");
}

const body = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ponte: the listing path B01 to B09, on the bridge</title>
<style>
  body { font: 14px/1.5 -apple-system, system-ui, "Segoe UI", sans-serif; margin: 0; padding: 28px; background: #fff; color: #111; }
  header { max-width: 1500px; margin: 0 auto 34px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  header p { margin: 0 0 6px; color: #444; max-width: 80ch; }
  h2 { max-width: 1500px; margin: 44px auto 6px; font-size: 15px; border-top: 1px solid #ccc; padding-top: 14px; }
  h2 + p { max-width: 1500px; margin: 0 auto 16px; color: #444; }
  .r { max-width: 1500px; margin: 0 auto 30px; }
  .r h3 { font-size: 14px; font-weight: 600; margin: 0 0 8px; }
  .id { display: inline-block; min-width: 62px; font-family: ui-monospace, Consolas, monospace; color: #a06a10; }
  .st { font-weight: 400; color: #666; }
  .trio { display: grid; grid-template-columns: 2.2fr 1.5fr 0.6fr; gap: 16px; align-items: start; }
  @media (max-width: 900px) { .trio { grid-template-columns: 1fr; } }
  .c { margin: 0; }
  figcaption { font-size: 11px; color: #666; margin-bottom: 5px; }
  img { width: 100%; height: auto; display: block; border: 1px solid #ddd; }
  .none { border: 1px dashed #c00; padding: 14px; font-size: 12px; color: #900; }
  footer { max-width: 1500px; margin: 40px auto 0; font-size: 12px; color: #666; border-top: 1px solid #ccc; padding-top: 14px; }
</style>
</head>
<body>
<header>
  <h1>The listing path, B01 to B09, on the bridge</h1>
  <p>Every surface of <code>/publish</code>, walked rather than mounted: one flow holding one record, captured at each state it passes through. Three shells, widest first: 2560 x 1440, 1440 x 900 and 390 x 844. All three are full-page stills of the same walk.</p>
  <p>There is no light and dark pair. The bridge has one ground; the cream is a plane within it rather than a theme.</p>
  <p>This page is a viewer. Nothing about how it looks is part of what it is showing.</p>
</header>

<h2>Signed out</h2>
<p>A visitor with no account. The path adds B08 before the checks, and B06 states its upload gate rather than opening a picker.</p>
${rows(SIGNED_OUT)}

<h2>Signed in, continuing to publication</h2>
<p>The seeded local member, signed in through the real <code>/login</code> code screen. The path drops B08, B06 opens, and publishing runs the checks and writes a listing.</p>
${rows(SIGNED_IN)}

<footer>
  <p>${embedded} stills embedded${missing > 0 ? `, ${missing} stated as missing` : ", none missing"}. Source: <code>e2e/bridge-path.spec.ts</code>, stills in <code>e2e/evidence/bridge-path/</code>. Rebuild with <code>node scripts/build-contact-sheet.mjs</code>.</p>
</footer>
</body>
</html>
`;

writeFileSync(OUT, body, "utf8");
console.log(
  `ok   ${OUT}: ${embedded} stills embedded, ${missing} missing, ${Math.round(body.length / 1024)} KB`,
);
