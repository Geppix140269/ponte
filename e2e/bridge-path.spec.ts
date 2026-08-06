import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * The listing path on the bridge, `B01` to `B09`, both shells, signed out and
 * signed in.
 *
 * ## Why this walks rather than visits
 *
 * Nine surfaces, and eight of them cannot be reached by typing a URL: the path
 * is one flow holding one record. A spec that mounted each surface with a
 * fixture would prove that nine components render and would not prove that a
 * member can get from the first to the last, which is the only claim worth
 * making about a journey.
 *
 * ## Why the assertions come BEFORE the shots
 *
 * A screenshot of the wrong screen is still a screenshot. Every capture is
 * preceded by an assertion that the surface is the one named, and the arc is
 * asserted visible on all of them, because the arc silently rendering nothing
 * is the failure this system is most exposed to.
 *
 * There are no light and dark captures here. The bridge has one ground, and the
 * cream is a plane within it rather than a theme: `ADR-0032`.
 */

const OUT = "e2e/evidence/bridge-path";
const MAILPIT = process.env.PONTE_MAILPIT_URL ?? "http://127.0.0.1:54324";
/*
  The seeded local member, from `scripts/seed-dev.mjs`.

  The signed-in walk PUBLISHES a listing, which writes. It therefore runs only
  against the local stack: point `PONTE_EVIDENCE_BASE_URL` at `npm run dev:local`
  and this address receives its code in Mailpit. `.env.local` points at
  production, so the default evidence server must never be used for this half.
*/
const MEMBER = (process.env.PONTE_DEV_MEMBER_EMAIL ?? "dev@ponte.local").toLowerCase();

/**
 * Three shells, and the widest is first-class rather than an afterthought.
 *
 * 2560 is the width the owner actually works at, and every proof before this
 * was 1440 and 390. A composition designed at two widths and photographed at
 * two widths will fail at the third, which is exactly what happened: at a
 * 1,960px span the arch flattened to a 6% rise and read as a sagging wire, and
 * the headline sat in the left third with two thirds of empty ink beside it.
 * Neither was visible in any evidence we had. A proof without 2560 does not
 * count.
 */
const SHELLS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide", width: 2560, height: 1440 },
];

test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

/** The bridge's own cream and bronze, as painted rather than as referenced. */
const CREAM = "rgb(242, 239, 230)"; // #F2EFE6
const BRONZE = "rgb(199, 154, 76)";

/**
 * The surface is the one named, the arc is drawn, and the deck has settled.
 *
 * The colour assertion is here rather than in a source test because a source
 * test cannot see it. `app/globals.css` sets `h1, h2, h3, h4 { color: var(--ink) }`
 * for the retired obsidian canvas, a tag rule beats an inherited colour, and
 * every question on this path was painted rgb(238, 241, 245) while the
 * stylesheet plainly said cream. It read near-white on ink so nothing looked
 * wrong; on the cream plane the same rule is the unreadable-heading defect
 * again. Checking what RESOLVED is the only check that would have caught it.
 */
async function settle(page: Page, screen: string): Promise<void> {
  await expect(page.locator(`.brg[data-screen='${screen}']`)).toBeVisible();
  await expect(page.locator(".brg-arc svg").first()).toBeVisible();

  const painted = await page.evaluate(() => {
    const h1 = document.querySelector(".brg-question");
    const em = document.querySelector(".brg-question em");
    return {
      question: h1 ? getComputedStyle(h1).color : null,
      accent: em ? getComputedStyle(em).color : null,
    };
  });
  expect(painted.question, `${screen}: the question is not painted the bridge cream`).toBe(CREAM);
  if (painted.accent) {
    expect(painted.accent, `${screen}: the accent is not painted the bridge bronze`).toBe(BRONZE);
  }

  // The deck draws over --brg-draw. Let the crossing arrive before capturing.
  await page.waitForTimeout(1900);
}

async function shot(page: Page, shell: string, name: string, screen: string): Promise<void> {
  await settle(page, screen);
  /*
    The pointer off the page before every capture.

    A choice row indents and lights its leading hairline on hover, and the
    pointer sits wherever the last click left it, so a row several screens later
    was captured mid-hover and read as chosen. Evidence has to show the state of
    the screen, not the position of the mouse.
  */
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: `${OUT}/${shell}-${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}

async function freshDraft(page: Page): Promise<void> {
  await page.goto("/publish");
  await page.evaluate(() => window.localStorage.removeItem("ponte.structure.draft.v1"));
  await page.goto("/publish");
}

async function signOut(page: Page): Promise<void> {
  await page.goto("/auth/signout");
  await page.context().clearCookies();
}

/**
 * Empty the local mailbox.
 *
 * Called before asking for a code, so the newest message is unambiguously the
 * one this run caused. Without it the poll below can read a code from an
 * earlier sign-in that is already spent.
 */
async function emptyMailbox(): Promise<void> {
  await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" }).catch(() => undefined);
}

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
    already handles. Filling the six boxes one at a time sets the last digit
    without passing through the transition the effect observes, so the code is
    complete on screen and nothing is ever sent.
  */
  await digits.first().fill(code);
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 });
}

/* ------------------------------------------------------------------ */
/* The walk                                                            */
/* ------------------------------------------------------------------ */

const zone = (page: Page, index: number) => page.locator(".brg-zone").nth(index);
const act = (page: Page) => page.locator(".brg-act").first();

async function openFact(page: Page, label: string): Promise<void> {
  await page
    .locator(".brg-fact")
    .filter({ has: page.locator("b", { hasText: new RegExp(`^${label}$`, "i") }) })
    .first()
    .click();
  await expect(page.locator(".brg-sheet")).toBeVisible();
}

async function pickRow(page: Page, text: string): Promise<void> {
  await page.locator(".brg-sheet .brg-item").filter({ hasText: text }).first().click();
  await expect(page.locator(".brg-sheet")).toHaveCount(0);
}

async function typeAnswer(page: Page, value: string): Promise<void> {
  const field = page.locator(".brg-sheet .brg-field input");
  await field.fill(value);
  await field.press("Enter");
  await expect(page.locator(".brg-sheet")).toHaveCount(0);
}

/** Fill every decisive fact, so the record can reach the preview and publish. */
async function completeTheFacts(page: Page): Promise<void> {
  await openFact(page, "Incoterms");
  await pickRow(page, "FOB");
  await openFact(page, "Price basis");
  await page.locator(".brg-sheet .brg-item").first().click();
  await openFact(page, "Validity");
  await pickRow(page, "60 days");
  await openFact(page, "Origin");
  await typeAnswer(page, "Rotterdam");
  await openFact(page, "Destination");
  await typeAnswer(page, "West Africa");
  await openFact(page, "Quantity");
  await pickRow(page, "On request");
  await expect(page.locator('.brg-fact[data-tier="needed"]')).toHaveCount(0);
}

for (const shell of SHELLS) {
  test(`the path, signed out, ${shell.name}`, async ({ page }) => {
    /*
      Eighteen full-page captures, and at 2560 each one is a 2,560 x 3,000
      raster. The default 60s covers the phone and the desktop and does not
      cover the wide shell, which failed as a timeout inside a settle rather
      than as anything to do with the path.
    */
    test.setTimeout(300_000);
    await page.setViewportSize({ width: shell.width, height: shell.height });
    await signOut(page);
    await freshDraft(page);

    /* B01, three states. */
    await shot(page, shell.name, "01-B01-direction", "B01");
    await zone(page, 1).click(); // I am offering something
    await page.waitForTimeout(700);
    await shot(page, shell.name, "02-B01-family", "B01");

    /* B01b. */
    await zone(page, 0).click(); // A product
    await page.waitForTimeout(700);
    await shot(page, shell.name, "03-B01b-empty", "B01b");
    await zone(page, 0).click(); // Principal for my own company
    await shot(page, shell.name, "04-B01b-chosen", "B01b");
    await act(page).click();

    /* B02, three states. */
    await shot(page, shell.name, "05-B02-routes", "B02");
    await page.locator(".brg-zone").last().click(); // Type it, with search
    await page.locator(".brg-field input").fill("gas oil");
    await shot(page, shell.name, "06-B02-typing", "B02");
    await act(page).click();
    await shot(page, shell.name, "07-B02-candidates", "B02");

    /* B03-B05, on arrival and once the gaps are closed. */
    await zone(page, 0).click(); // Gasoil 10 ppm (ULSD, EN 590)
    await shot(page, shell.name, "08-B03-B05-arrival", "B03-B05");
    await openFact(page, "Incoterms");
    await shot(page, shell.name, "09-B03-B05-sheet", "B03-B05");
    await pickRow(page, "FOB");
    await openFact(page, "Price basis");
    await page.locator(".brg-sheet .brg-item").first().click();
    await openFact(page, "Validity");
    await pickRow(page, "60 days");
    await openFact(page, "Origin");
    await typeAnswer(page, "Rotterdam");
    await openFact(page, "Destination");
    await typeAnswer(page, "West Africa");
    await openFact(page, "Quantity");
    await pickRow(page, "On request");
    await expect(page.locator('.brg-fact[data-tier="needed"]')).toHaveCount(0);
    await shot(page, shell.name, "10-B03-B05-complete", "B03-B05");
    await act(page).click();

    /* B06. Signed out, the upload route states its gate rather than opening. */
    await shot(page, shell.name, "11-B06-gated", "B06");
    await expect(page.locator('.brg-zone[aria-disabled="true"]')).toHaveCount(1);
    await act(page).click();

    /* B07, both states. */
    await shot(page, shell.name, "12-B07-preview", "B07");
    await page.locator(".brg-fact").first().click(); // Company, the one control
    await shot(page, shell.name, "13-B07-identity", "B07");
    await page.locator(".brg-back").click();
    await act(page).click(); // Publish

    /* B08. Signed out, the path adds the gate before the checks. */
    await shot(page, shell.name, "14-B08-email", "B08");
  });

  test(`the path, signed in, through B09, ${shell.name}`, async ({ page }) => {
    /*
      Eighteen full-page captures, and at 2560 each one is a 2,560 x 3,000
      raster. The default 60s covers the phone and the desktop and does not
      cover the wide shell, which failed as a timeout inside a settle rather
      than as anything to do with the path.
    */
    test.setTimeout(300_000);
    await page.setViewportSize({ width: shell.width, height: shell.height });
    await signIn(page);
    await freshDraft(page);

    /*
      Waits on the SCREEN, not on the clock.

      A press indents the chosen row and lets the next question rise into the
      space over 420ms before the state changes, so a fixed 700ms pause is
      enough on a production build and not always enough on a dev server. That
      is how this walk failed once at the capacity control: the surface had not
      arrived, the row clicked belonged to the previous question, and the
      failure surfaced two steps later as an action that would not enable.
    */
    // And the first click waits for the surface to be interactive, not merely
    // present: the markup is server-rendered, so a press before hydration is
    // swallowed and the walk carries on against a screen that never moved.
    await settle(page, "B01");
    await zone(page, 1).click(); // I am offering something
    await expect(page.locator(".brg[data-screen='B01'][data-phase='family']")).toBeVisible();
    await zone(page, 0).click(); // A product
    await expect(page.locator(".brg[data-screen='B01b']")).toBeVisible();
    await zone(page, 0).click(); // Principal
    await expect(page.locator(".brg[data-screen='B01b'][data-phase='principal']")).toBeVisible();
    await act(page).click();

    await expect(page.locator(".brg[data-screen='B02']")).toBeVisible();
    await page.locator(".brg-zone").last().click(); // Type it, with search
    await page.locator(".brg-field input").fill("gas oil");
    await act(page).click();
    await zone(page, 0).click();
    await expect(page.locator(".brg[data-screen='B03-B05']")).toBeVisible();
    await completeTheFacts(page);
    await act(page).click();

    /* B06, signed in: the upload route is open. */
    await shot(page, shell.name, "15-B06-open", "B06");
    await expect(page.locator('.brg-zone[aria-disabled="true"]')).toHaveCount(0);
    await act(page).click();

    /* B07, and this time publishing runs the checks rather than meeting a gate. */
    await shot(page, shell.name, "16-B07-signed-in", "B07");
    await act(page).click();

    /* B09s, and then B09. */
    await shot(page, shell.name, "17-B09s-checks", "B09s");
    await expect(page.locator(".brg-perimeter")).toBeVisible();
    // The action is available only when every check is settled and clear.
    await expect(act(page)).not.toHaveAttribute("aria-disabled", "true", { timeout: 30_000 });
    await act(page).click();

    await shot(page, shell.name, "18-B09-published", "B09");
    // The crossing is complete: the deck is whole and no node is outstanding.
    await expect(page.locator(".brg-arc__node--todo")).toHaveCount(0);
    await expect(page.locator(".brg-back")).toHaveCount(0);
  });
}
