import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Build 1: every surface of the listing path, photographed.
 *
 * The design director approves design by LOOKING at it. A test list is a claim
 * that the rules hold; a screenshot is the thing the rules are about. This
 * captures all nine surfaces at 390px, in both themes, in both session states,
 * and it drives them by clicking rather than by rendering components in
 * isolation, so what is photographed is what a member would actually meet.
 *
 * ## How to run it
 *
 *   npm run dev:db          # the local stack, seeded
 *   npm run dev:local       # the app against it, on :3000
 *   PONTE_EVIDENCE_BASE_URL=http://localhost:3000 \
 *     npx playwright test e2e/build-1-listing-path.spec.ts
 *
 * ## Why the development server and not the production build
 *
 * Every other evidence spec captures `next start` on :3100, and is right to:
 * evidence should not carry a dev overlay. This one cannot. The signed-in half
 * of the path needs a real session, a real member and a real `hs_codes` table,
 * and the only database that has them is the LOCAL stack. A production build
 * reads `.env.local`, which points at production, so capturing the signed-in
 * half that way would mean pointing the evidence run at real member data to
 * photograph a form.
 *
 * `npm run dev:local` overwrites the production connection details in the child
 * process for exactly this reason. The dev overlay sits outside every clip.
 *
 * ## The site gate
 *
 * No `PONTE_SITE_PASSWORD` here, and the gate is not weakened to manage it:
 * `middleware.ts` exempts loopback in development, and this runs against
 * loopback in development. Against any other host it would 401, which is
 * correct.
 */

const OUT = "e2e/evidence/build-1";
const MAILPIT = process.env.PONTE_MAILPIT_URL ?? "http://127.0.0.1:54324";
const MEMBER = "dev@ponte.local";

/** The reference's design width. The brief also requires 360px, checked separately. */
const FRAME = { width: 390, height: 900 };

type Theme = "light" | "dark";
const THEMES: Theme[] = ["light", "dark"];

test.use({ viewport: FRAME });

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * A screenshot is only evidence if the surface actually rendered.
 *
 * An unhydrated page, an error boundary and a redirect all produce a perfectly
 * presentable image of nothing. Each capture names the screen it expects, so a
 * miss fails here rather than filling a directory with pictures of a 404.
 */
async function shot(page: Page, name: string, screen: string, theme: Theme): Promise<void> {
  const frame = page.locator(".pb");
  await expect(frame, `${name}: the frame never rendered`).toBeVisible();
  await expect(frame, `${name}: expected ${screen}`).toHaveAttribute("data-screen", screen);

  /*
    Every statement, on every capture, checked for the two things that have
    each gone wrong once and could not be seen from the source.

    The FACE: `--f-serif` is defined on `.ponte-desk`, and this route is not
    inside it, so the alias resolved to nothing and `font-family` fell through
    to Inter in silence.

    The COLOUR: `layout.css` carries a global `h1, h2, h3, h4 { color:
    var(--ink) }` from the retired obsidian chrome. The statements rendered at
    rgb(238,241,245) on rgb(242,238,226) - correct markup, correct face, and
    unreadable. The screenshot showed it instantly; nothing in the source did.

    Measured here rather than asserted in a source test, because a source test
    can only see that a token was referenced. This sees what the pixel is.
  */
  const statements = page.locator(".pb .stmt, .pb .r2 h2, .pb .msg h2");
  const count = await statements.count();
  for (let i = 0; i < count; i += 1) {
    const measured = await statements.nth(i).evaluate((node) => {
      const style = getComputedStyle(node);
      // Walk up for the first painted background: a statement usually sits on
      // a transparent parent, and comparing against `rgba(0,0,0,0)` is how a
      // contrast check quietly passes everything.
      let behind: Element | null = node;
      let background = "rgba(0, 0, 0, 0)";
      while (behind) {
        const value = getComputedStyle(behind).backgroundColor;
        if (value && value !== "rgba(0, 0, 0, 0)" && value !== "transparent") {
          background = value;
          break;
        }
        behind = behind.parentElement;
      }
      return { color: style.color, background, family: style.fontFamily, text: node.textContent ?? "" };
    });

    expect(measured.family, `${name}: a statement is not set in the serif`).toMatch(/Playfair/i);

    const channel = (value: string) => {
      const [r, g, b] = (value.match(/[\d.]+/g) ?? ["0", "0", "0"]).map(Number);
      const linear = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
    };
    const a = channel(measured.color);
    const b = channel(measured.background);
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    expect(
      ratio,
      `${name}: "${measured.text.slice(0, 40)}" is ${ratio.toFixed(2)}:1 against its own background (${measured.color} on ${measured.background})`,
    ).toBeGreaterThan(4.5);
  }

  /*
    Nothing shows behind the frame.

    `/publish` is bared from `ChromeGate`, so it supplies its own chrome and
    nothing else paints the page. The app's default `body` background is the
    retired obsidian, and it showed as a dark band under the cream wherever the
    document was taller than the frame. Checked on every capture, because a
    route that renders its own chrome owns its own background and the failure is
    only ever visible at the bottom of a full-page screenshot.
  */
  const behind = await page.evaluate(() => {
    const frameEl = document.querySelector(".pb");
    const shell = frameEl?.parentElement;
    return {
      shellBackground: shell ? getComputedStyle(shell).backgroundColor : "",
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      frameBackground: frameEl ? getComputedStyle(frameEl).backgroundColor : "",
    };
  });
  /*
    Both the shell and the BODY, because a shell 100vh tall does not cover a
    document taller than the viewport, and the strip `globals.css` reserves for
    the mobile bottom bar sits below it. On a bared route there is no bar, so
    that strip was 58px of obsidian under the cream.
  */
  expect(
    behind.shellBackground,
    `${name}: the shell behind the frame is not painted`,
  ).toBe(behind.frameBackground);
  expect(
    behind.bodyBackground,
    `${name}: the body behind the shell is not painted, so it shows at the foot of the page`,
  ).toBe(behind.frameBackground);

  /*
    Nothing inside the frame is taken out of the flow.

    The path has no fixed-position element by design: the correction sheet is
    `absolute` inside the frame, and everything else is flow layout. This
    catches the class of defect where a class name declared in the design
    reference collides with a utility already in the stylesheet.

    It happened once and it was invisible in the source: the reference calls the
    lock chip `.fixed`, Tailwind's `.fixed` is `position: fixed`, and the chip
    left the flow and printed "Fixed" over "Public: anyone browsing Ponte" at
    the head of the most important surface in Set 2. Every rule this build wrote
    applied exactly as written. Only the render showed it.
  */
  // `Array.from`, not a spread: this project's tsc target predates ES2015
  // iterators, so spreading a NodeList is a compile error (TS2802).
  const escaped = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".pb *"))
      .filter((node) => getComputedStyle(node).position === "fixed")
      .map((node) => `${node.tagName.toLowerCase()}.${(node.className || "").toString().trim()}`),
  );
  expect(escaped, `${name}: an element inside the frame is position:fixed`).toEqual([]);

  await page.screenshot({
    path: `${OUT}/${name}-${theme}.png`,
    fullPage: true,
    animations: "disabled",
  });
}

async function setTheme(page: Page, theme: Theme): Promise<void> {
  // `data-theme` on the root is what the layout's own inline script sets and
  // what `publish.css` keys off, so this is the product's mechanism rather than
  // a test-only override.
  await page.evaluate((value) => document.documentElement.setAttribute("data-theme", value), theme);
  await page.waitForTimeout(120);
}

async function freshDraft(page: Page): Promise<void> {
  await page.goto("/publish");
  await page.evaluate(() => window.localStorage.removeItem("ponte.structure.draft.v1"));
  await page.goto("/publish");
  await expect(page.locator(".pb")).toBeVisible();
}

/**
 * Empty the local mailbox.
 *
 * Called before asking for a code, so the newest message is unambiguously the
 * one this run caused. Without it the poll below can read a code from an
 * earlier sign-in that is already spent, and the failure surfaces twenty
 * seconds later as "the login page never navigated", which points at the wrong
 * thing entirely.
 */
async function emptyMailbox(): Promise<void> {
  await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" }).catch(() => undefined);
}

/** The six-digit code, read out of the local mailbox exactly as `dev:code` does. */
async function latestCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await fetch(`${MAILPIT}/api/v1/messages?limit=25`);
    const list = (await response.json()) as {
      messages?: { ID: string; To?: { Address?: string }[] }[];
    };
    const mine = (list.messages ?? []).filter((m) =>
      (m.To ?? []).some((to) => to.Address?.toLowerCase() === MEMBER),
    );
    if (mine.length > 0) {
      const message = await fetch(`${MAILPIT}/api/v1/message/${mine[0].ID}`);
      const body = (await message.json()) as { Text?: string; HTML?: string };
      const code = `${body.Text ?? ""}\n${body.HTML ?? ""}`.match(/\b(\d{6})\b/);
      if (code) return code[1];
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No sign-in code reached ${MAILPIT} for ${MEMBER}.`);
}

async function signIn(page: Page): Promise<void> {
  await emptyMailbox();
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(MEMBER);
  await page.locator('button[type="submit"]').click();

  const code = await latestCode();
  const digits = page.locator('input[aria-label^="Digit"]');
  await expect(digits.first()).toBeVisible();

  /*
    The whole code into the FIRST box, which is the paste path `OtpInput`
    already handles: it spreads the digits and submits on the transition to
    full. Filling the six boxes one at a time sets the last digit without ever
    passing through that transition in a way the effect observes, so the code is
    complete on screen and nothing is ever sent.
  */
  await digits.first().fill(code);
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 });
}

async function signOut(page: Page): Promise<void> {
  await page.goto("/auth/signout");
  await page.context().clearCookies();
}

/* ------------------------------------------------------------------ */
/* The walk                                                            */
/* ------------------------------------------------------------------ */

const row = (page: Page, index: number) => page.locator(".pb .rows .row").nth(index);
const act = (page: Page) => page.locator(".pb .act");

/** B01 and B01b, up to the point where the family is chosen and capacity declared. */
async function walkToTell(page: Page): Promise<void> {
  await page.locator(".pb .dir button").nth(1).click(); // I am offering something
  await row(page, 0).click(); // A product
  await expect(page.locator(".pb")).toHaveAttribute("data-screen", "B01b");
  await row(page, 0).click(); // Principal for my own company
  await act(page).click();
}

/** Resolve a product through the type-it route, and open the fact list. */
async function walkToListing(page: Page): Promise<void> {
  await page.locator(".pb .row").last().click(); // Type it, with search
  await page.locator(".pb .si__f input").fill("gas oil");
  await act(page).click();
  await row(page, 0).click(); // Gasoil 10 ppm (ULSD, EN 590)
  await expect(page.locator(".pb")).toHaveAttribute("data-screen", "B03-B05");
}

async function openFact(page: Page, label: string): Promise<void> {
  await page
    .locator(".pb .fl__i")
    .filter({ has: page.locator(".lab", { hasText: new RegExp(`^${label}$`, "i") }) })
    .first()
    .locator("button")
    .first()
    .click();
  await expect(page.locator(".pb .pick")).toBeVisible();
}

async function pickRow(page: Page, text: string): Promise<void> {
  await page.locator(".pb .pick__b .row").filter({ hasText: text }).first().click();
  await expect(page.locator(".pb .pick")).toHaveCount(0);
}

async function typeAnswer(page: Page, value: string): Promise<void> {
  const field = page.locator(".pb .pick__s input");
  await field.fill(value);
  await field.press("Enter");
  await expect(page.locator(".pb .pick")).toHaveCount(0);
}

/** Fill every decisive fact, so the record can reach the preview and publish. */
async function completeTheFacts(page: Page): Promise<void> {
  await openFact(page, "Incoterms");
  await pickRow(page, "FOB");
  await openFact(page, "Price basis");
  await page.locator(".pb .pick__b .row").first().click();
  await openFact(page, "Validity");
  await pickRow(page, "60 days");
  await openFact(page, "Origin");
  await typeAnswer(page, "Rotterdam");
  await openFact(page, "Destination");
  await typeAnswer(page, "West Africa");
  await openFact(page, "Quantity");
  await pickRow(page, "On request");
  await expect(page.locator(".pb .fl__i--need")).toHaveCount(0);
}

/* ------------------------------------------------------------------ */
/* Signed out: B01, B01b, B02, B03-B05, B06, B07, B08                  */
/* ------------------------------------------------------------------ */

for (const theme of THEMES) {
  test(`signed out, ${theme}`, async ({ page }) => {
    await signOut(page);
    await freshDraft(page);
    await setTheme(page, theme);

    // The retention promise is the one thing that differs by session, so it is
    // asserted here rather than only photographed.
    await expect(page.locator(".pb__f")).toContainText("Saved only in this browser for up to 7 days");

    await shot(page, "01-b01-direction-signed-out", "B01", theme);

    await page.locator(".pb .dir button").nth(1).click();
    await shot(page, "02-b01-family-signed-out", "B01", theme);

    await row(page, 0).click();
    await setTheme(page, theme);
    await shot(page, "03-b01b-capacity-signed-out", "B01b", theme);

    await row(page, 0).click();
    await act(page).click();
    await setTheme(page, theme);
    // The gate a signed-out member meets before any file is held for them.
    await expect(page.locator('.pb .row[data-gated="sign-in"]')).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await shot(page, "04-b02-tell-ponte-signed-out", "B02", theme);

    await walkToListing(page);
    await setTheme(page, theme);
    await shot(page, "05-b03-b05-listing-signed-out", "B03-B05", theme);

    await openFact(page, "Incoterms");
    await page.waitForTimeout(150);
    await page.screenshot({
      path: `${OUT}/06-correction-in-place-signed-out-${theme}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.locator(".pb .pick__h button").click();

    await completeTheFacts(page);
    await act(page).click();
    await setTheme(page, theme);
    await expect(page.locator(".pb .ast__add")).toHaveAttribute("aria-disabled", "true");
    await shot(page, "07-b06-assets-signed-out", "B06", theme);

    await act(page).click();
    await setTheme(page, theme);
    await shot(page, "08-b07-preview-signed-out", "B07", theme);

    await act(page).click();
    await setTheme(page, theme);
    await shot(page, "09-b08-account-gate", "B08", theme);
  });
}

/* ------------------------------------------------------------------ */
/* Signed in: B01, B01b, B02, B03-B05, B06, B07, B09s, B09            */
/* ------------------------------------------------------------------ */

for (const theme of THEMES) {
  test(`signed in, ${theme}`, async ({ page }) => {
    await signIn(page);
    await freshDraft(page);
    await setTheme(page, theme);

    await expect(page.locator(".pb__f")).toContainText("Saved to your account");
    await shot(page, "10-b01-direction-signed-in", "B01", theme);

    await walkToTell(page);
    await setTheme(page, theme);
    // Signed in, the upload route opens rather than explaining why it will not.
    await expect(page.locator(".pb .row").first()).not.toHaveAttribute("aria-disabled", "true");
    await shot(page, "11-b02-tell-ponte-signed-in", "B02", theme);

    await walkToListing(page);
    await setTheme(page, theme);
    await shot(page, "12-b03-b05-listing-signed-in", "B03-B05", theme);

    await completeTheFacts(page);
    await act(page).click();
    await setTheme(page, theme);
    await expect(page.locator(".pb .ast__add")).not.toHaveAttribute("aria-disabled", "true");
    await shot(page, "13-b06-assets-signed-in", "B06", theme);

    await act(page).click();
    await setTheme(page, theme);
    // The exact expiry date, on screen, and not a day count.
    await expect(page.locator(".pb .prose").last()).toContainText(/expires on \d{1,2} \w+ 20\d\d/);
    await shot(page, "14-b07-preview-signed-in", "B07", theme);

    await act(page).click();
    await expect(page.locator(".pb")).toHaveAttribute("data-screen", "B09s");
    await expect(page.locator(".pb")).toHaveAttribute("data-phase", "checked", { timeout: 30_000 });
    await setTheme(page, theme);
    // The label, on screen. Never Approved, Vetted or Reviewed.
    await expect(page.locator(".pb .scr__i .st").first()).toHaveText("Checked");
    await shot(page, "15-b09s-screening-checked", "B09s", theme);

    await act(page).click();
    await setTheme(page, theme);
    await shot(page, "16-b09-published", "B09", theme);
  });
}

/* ------------------------------------------------------------------ */
/* The distribution branch, and the value Set 2's own B01 cannot reach  */
/* ------------------------------------------------------------------ */

for (const theme of THEMES) {
  test(`distribution reaches seek_brands_or_products_to_represent, ${theme}`, async ({ page }) => {
    await signOut(page);
    await freshDraft(page);
    await setTheme(page, theme);

    await page.locator(".pb .dir button").nth(0).click(); // I need something
    await row(page, 2).click(); // Distribution or representation

    // The position question, which is asked ONLY here. Set 2 offers four
    // options that encode direction and position together and resolve to two
    // stored values, leaving this branch's second value unreachable.
    await expect(page.locator(".pb")).toHaveAttribute("data-phase", "position");
    await expect(page.locator(".pb .stmt")).toHaveText("Which side of the arrangement are you on?");
    await shot(page, "17-b01-distribution-position", "B01", theme);

    await page
      .locator(".pb .rows .row")
      .filter({ hasText: "seeking brands or products to represent" })
      .first()
      .click();

    await expect(page.locator(".pb")).toHaveAttribute("data-screen", "B01b");
    await shot(page, "18-b01b-after-distribution", "B01b", theme);

    /*
      The proof. The record now carries the seventh stored value, which is the
      one a member could not reach through the live three-option screen and
      cannot reach through Set 2's own B01 either. Read from the kept draft
      rather than from a URL, because the flow no longer routes through one.
    */
    const kept = await page.evaluate(() => {
      const raw = window.localStorage.getItem("ponte.structure.draft.v1");
      return raw ? (JSON.parse(raw) as { draft?: { draft?: { canonical?: unknown } } }) : null;
    });
    const canonical = kept?.draft?.draft?.canonical as
      | { family?: string; intent?: string }
      | undefined;
    expect(canonical?.family).toBe("distribution");
    expect(canonical?.intent).toBe("seek_brands_or_products_to_represent");
  });
}
