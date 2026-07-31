import { expect, test, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

/**
 * The Deal Room surfaces, rendered against a real room.
 *
 * ## Why this is separate from `deal-room-bridge.spec.ts`
 *
 * That spec photographs the state gallery, and says why: at Gate B the
 * `deal_room_*` tables existed in no database, so there was no real room to
 * photograph. It is still the right instrument for the states a single room
 * cannot reach on demand - blocked, paused, read-only, ready to proceed - and it
 * stays.
 *
 * This one covers what it could not: the twelve member surfaces, drawing real
 * rows, read through Row Level Security as the member who owns them. Every
 * defect the surface review of 31 July 2026 found was of a kind that only shows
 * up here - an approver the counterparty could not name, a Bridge that drew one
 * person twice, a room that said "2 participants" to somebody sitting alone.
 * None of them could fail a query, and none of them did.
 *
 * ## What it needs
 *
 *   node scripts/deal-room-live-room.mjs build
 *   PONTE_SITE_PASSWORD=... npx playwright test e2e/deal-room-surfaces.spec.ts
 *   node scripts/deal-room-live-room.mjs remove
 *
 * and a server started with `NEXT_PUBLIC_DEAL_ROOM=on` and a
 * `DEAL_ROOM_ALLOWLIST` containing both profile ids - the builder prints them.
 * The flag is inlined at build time, so it has to be set for the build, not just
 * the process.
 *
 * ## The site access wall
 *
 * Ponte is behind a Basic-auth wall (`middleware.ts`) whose password is not in
 * the repository - only its SHA-256 is. This spec does not try to guess it and
 * does not weaken the gate to get past it. Without `PONTE_SITE_PASSWORD` every
 * request answers 401, and it fails immediately with that sentence rather than
 * filling a directory with screenshots of an error page.
 *
 * ## Both parties, deliberately
 *
 * Several surfaces differ by who is looking, and the difference is where the
 * defects were. The initiator is a room administrator and sees every participant
 * row; the counterparty is not and sees only their own and their workspace's.
 * Capturing only the initiator would have photographed a procedure page that
 * looked perfectly correct while the counterparty's said "A required approver".
 */

const MANIFEST = "e2e/.deal-room-live.json";
const OUT = "docs/codex/audits/deal-room/evidence/live";
const PASSWORD = process.env.PONTE_SITE_PASSWORD;

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 390, height: 844 };

type Manifest = {
  roomId: string;
  subRoomId: string;
  evidenceId: string;
  invitationToken: string;
  owner: { profileId: string; cookies: { name: string; value: string }[] };
  counterparty: { profileId: string; cookies: { name: string; value: string }[] };
};

function manifest(): Manifest {
  if (!existsSync(MANIFEST)) {
    throw new Error(
      `No ${MANIFEST}. Stand a room up first:\n\n` +
        `  PONTE_ALLOW_PRODUCTION_DB=i-understand node scripts/deal-room-live-room.mjs build\n`,
    );
  }
  return JSON.parse(readFileSync(MANIFEST, "utf8")) as Manifest;
}

test.use({ httpCredentials: PASSWORD ? { username: "ponte", password: PASSWORD } : undefined });

test.beforeAll(() => {
  if (!PASSWORD) {
    throw new Error(
      "PONTE_SITE_PASSWORD is not set. Ponte is behind a Basic-auth wall and every\n" +
        "request would answer 401. Supply the password; do not weaken the gate.",
    );
  }
  mkdirSync(OUT, { recursive: true });
});

/** The surfaces, and who should be looking at each. */
function surfaces(m: Manifest) {
  const room = `/en/deal-rooms/${m.roomId}`;
  const workspace = `${room}/workspaces/${m.subRoomId}`;
  return [
    { id: "portfolio", path: "/en/deal-rooms", who: "owner" as const },
    { id: "room-overview", path: room, who: "owner" as const },
    { id: "room-overview-counterparty", path: room, who: "counterparty" as const },
    { id: "procedure", path: `${room}/procedure`, who: "owner" as const },
    // The one that read "A required approver" before 20260731d.
    { id: "procedure-counterparty", path: `${room}/procedure`, who: "counterparty" as const },
    { id: "invitation", path: `${room}/invitation`, who: "owner" as const },
    { id: "activity", path: `${room}/activity`, who: "owner" as const },
    { id: "workspace", path: workspace, who: "owner" as const },
    { id: "workspace-counterparty", path: workspace, who: "counterparty" as const },
    { id: "evidence-list", path: `${workspace}/evidence`, who: "owner" as const },
    { id: "evidence-detail", path: `${workspace}/evidence/${m.evidenceId}`, who: "owner" as const },
    { id: "step", path: `${workspace}/steps/capability_evidence`, who: "owner" as const },
    { id: "blockers", path: `${workspace}/blockers`, who: "owner" as const },
  ];
}

async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  // The Bridge animates on entry; the authored end state is what the evidence
  // is of, and `animations: "disabled"` on the shot finishes it there.
  await page.waitForTimeout(150);
}

/**
 * A screenshot is only evidence if the page rendered.
 *
 * A 401, a 404 from the flag being off, an allowlist miss or an error boundary
 * all produce a perfectly presentable image of nothing. Each is checked for by
 * name so the failure says which one happened.
 */
async function assertRendered(page: Page, path: string): Promise<void> {
  const status = page.url();
  expect(status, `navigation left ${path}`).toContain(path.split("?")[0]);

  const body = (await page.locator("body").innerText()).slice(0, 4000);
  expect(body.length, `${path} rendered an empty body`).toBeGreaterThan(40);
  for (const wrong of ["This page could not be found", "Application error", "Unhandled Runtime Error"]) {
    expect(body, `${path} rendered "${wrong}" - is NEXT_PUBLIC_DEAL_ROOM=on and the profile allowlisted?`).not.toContain(
      wrong,
    );
  }
}

for (const viewport of [
  { name: "desktop", size: DESKTOP },
  { name: "mobile-390", size: MOBILE },
]) {
  test(`Deal Room surfaces against a live room - ${viewport.name}`, async ({ browser }) => {
    const m = manifest();
    const origin = new URL(process.env.PONTE_EVIDENCE_BASE_URL ?? "http://127.0.0.1:3100").origin;

    const contexts = {
      owner: await browser.newContext({
        viewport: viewport.size,
        httpCredentials: { username: "ponte", password: PASSWORD! },
      }),
      counterparty: await browser.newContext({
        viewport: viewport.size,
        httpCredentials: { username: "ponte", password: PASSWORD! },
      }),
    };

    for (const who of ["owner", "counterparty"] as const) {
      await contexts[who].addCookies(
        m[who].cookies.map((cookie) => ({ ...cookie, url: origin, path: "/", sameSite: "Lax" as const })),
      );
    }

    try {
      for (const surface of surfaces(m)) {
        const page = await contexts[surface.who].newPage();
        await page.goto(surface.path, { waitUntil: "domcontentloaded" });
        await settle(page);
        await assertRendered(page, surface.path);
        await page.screenshot({
          path: `${OUT}/${viewport.name}-${surface.id}.png`,
          fullPage: true,
          animations: "disabled",
        });
        await page.close();
      }

      // The invitation landing page, reached the way an invitee reaches it:
      // by presenting the token. Signed out, because they may not have an
      // account yet - so its own context, with no session cookie.
      const anon = await browser.newContext({
        viewport: viewport.size,
        httpCredentials: { username: "ponte", password: PASSWORD! },
      });
      const page = await anon.newPage();
      await page.goto(`/en/deal-rooms/invitation/${m.invitationToken}`, { waitUntil: "domcontentloaded" });
      await settle(page);
      await page.screenshot({
        path: `${OUT}/${viewport.name}-invitation-landing.png`,
        fullPage: true,
        animations: "disabled",
      });
      await anon.close();
    } finally {
      await contexts.owner.close();
      await contexts.counterparty.close();
    }
  });
}
