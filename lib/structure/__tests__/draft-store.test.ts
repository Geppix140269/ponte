// The composer's device-kept draft.
//
// Run: npx tsx lib/structure/__tests__/draft-store.test.ts
//
// This module exists because a member lost minutes of work by pressing back,
// so the properties worth pinning are the ones that would lose it again:
//
//   1. it never throws, whatever the environment does;
//   2. it refuses a payload it cannot trust rather than handing back rubbish;
//   3. it forgets on demand, because a stale draft offered back is worse than
//      no draft at all.
//
// There is no jsdom here. `localStorage` is stubbed on `globalThis` so the
// module is exercised exactly as a browser would, including the failure modes
// a browser actually has: a store that throws on write, and a store that is
// absent entirely.

import assert from "node:assert/strict";
// A static import is correct here: the module holds no state and reads `window`
// at call time, inside `store()`. Nothing is captured when it loads, so the
// stubs below take effect for every call regardless of import order.
import * as store from "../draft-store";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL  ${name}\n      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

/** A minimal localStorage. `failOn` makes one method throw, as Safari does. */
function fakeStorage(failOn?: "setItem" | "getItem") {
  const map = new Map<string, string>();
  return {
    getItem(k: string) {
      if (failOn === "getItem") throw new Error("denied");
      return map.has(k) ? map.get(k)! : null;
    },
    setItem(k: string, v: string) {
      if (failOn === "setItem") throw new Error("quota");
      map.set(k, v);
    },
    removeItem(k: string) {
      map.delete(k);
    },
    get size() {
      return map.size;
    },
  };
}

function withStorage(storage: unknown, fn: () => void): void {
  const g = globalThis as Record<string, unknown>;
  const hadWindow = "window" in g;
  const before = g.window;
  g.window = { localStorage: storage };
  try {
    fn();
  } finally {
    if (hadWindow) g.window = before;
    else delete g.window;
  }
}

const DRAFT = { product: "Fresh cherries", quantity: 12000, unit: "kg" };

// ---------------------------------------------------------------------------
// The normal path
// ---------------------------------------------------------------------------

test("a kept draft comes back with its facts and its stack", () => {
  withStorage(fakeStorage(), () => {
    store.keepDraft(DRAFT, ["intent", "facts", "preview"]);
    const back = store.readKeptDraft<typeof DRAFT>();
    assert.ok(back, "nothing came back");
    assert.deepEqual(back!.draft, DRAFT);
    assert.deepEqual(back!.stack, ["intent", "facts", "preview"]);
  });
});

test("forgetting means nothing comes back", () => {
  withStorage(fakeStorage(), () => {
    store.keepDraft(DRAFT, ["intent"]);
    store.forgetDraft();
    assert.equal(store.readKeptDraft(), null);
  });
});

// ---------------------------------------------------------------------------
// Never throwing, because the alternative is losing the thing being kept
// ---------------------------------------------------------------------------

test("a store that throws on write costs the member nothing", () => {
  withStorage(fakeStorage("setItem"), () => {
    assert.doesNotThrow(() => store.keepDraft(DRAFT, ["intent"]));
    assert.equal(store.readKeptDraft(), null, "a failed write must not read back");
  });
});

test("a store that throws on read returns null rather than propagating", () => {
  withStorage(fakeStorage("getItem"), () => {
    assert.doesNotThrow(() => store.readKeptDraft());
    assert.equal(store.readKeptDraft(), null);
  });
});

test("no storage at all is not an error", () => {
  withStorage(undefined, () => {
    assert.doesNotThrow(() => store.keepDraft(DRAFT, ["intent"]));
    assert.equal(store.readKeptDraft(), null);
    assert.doesNotThrow(() => store.forgetDraft());
  });
});

test("no window at all is not an error", () => {
  const g = globalThis as Record<string, unknown>;
  const had = "window" in g;
  const before = g.window;
  delete g.window;
  try {
    assert.doesNotThrow(() => store.keepDraft(DRAFT, ["intent"]));
    assert.equal(store.readKeptDraft(), null);
  } finally {
    if (had) g.window = before;
  }
});

// ---------------------------------------------------------------------------
// Refusing what it cannot trust
// ---------------------------------------------------------------------------

test("a payload from another version is not handed back", () => {
  const s = fakeStorage();
  withStorage(s, () => {
    s.setItem("ponte.structure.draft.v1", JSON.stringify({ version: 99, savedAt: Date.now(), stack: [], draft: DRAFT }));
    assert.equal(store.readKeptDraft(), null, "a future version was trusted");
  });
});

test("unparseable content is not handed back", () => {
  const s = fakeStorage();
  withStorage(s, () => {
    s.setItem("ponte.structure.draft.v1", "{not json");
    assert.equal(store.readKeptDraft(), null);
  });
});

test("a payload with no draft or no stack is not handed back", () => {
  const s = fakeStorage();
  withStorage(s, () => {
    s.setItem("ponte.structure.draft.v1", JSON.stringify({ version: 1, savedAt: Date.now(), stack: [] }));
    assert.equal(store.readKeptDraft(), null, "a payload with no draft was trusted");
    s.setItem("ponte.structure.draft.v1", JSON.stringify({ version: 1, savedAt: Date.now(), draft: DRAFT }));
    assert.equal(store.readKeptDraft(), null, "a payload with no stack was trusted");
  });
});

test("a fortnight-old draft is dropped, and dropped from the store too", () => {
  const s = fakeStorage();
  withStorage(s, () => {
    const old = Date.now() - 15 * 24 * 60 * 60 * 1000;
    s.setItem("ponte.structure.draft.v1", JSON.stringify({ version: 1, savedAt: old, stack: ["intent"], draft: DRAFT }));
    assert.equal(store.readKeptDraft(), null, "a stale draft was offered back");
    assert.equal(s.size, 0, "a stale draft was left in the store to be read again");
  });
});

test("a draft just inside the window is still offered back", () => {
  const s = fakeStorage();
  withStorage(s, () => {
    const recent = Date.now() - 13 * 24 * 60 * 60 * 1000;
    s.setItem("ponte.structure.draft.v1", JSON.stringify({ version: 1, savedAt: recent, stack: ["facts"], draft: DRAFT }));
    assert.ok(store.readKeptDraft(), "a draft inside the window was dropped");
  });
});

// The crash a member could not clear by themselves. `/publish` once wrote its
// own wrapper under the composer's key; separating the keys stopped new ones
// being written and could not reach the one already on the device, so the
// composer met it on every visit and threw on the first array it dereferenced.
// The guard has to REMOVE the payload, not merely refuse it, or the next load
// meets exactly the same one.
const looksLikeDraft = (d: unknown): d is { serviceSubcategories: unknown[] } =>
  !!d && typeof d === "object" && Array.isArray((d as Record<string, unknown>).serviceSubcategories);

test("a payload of the wrong shape is dropped, and cleared so it cannot be met again", () => {
  const s = fakeStorage();
  withStorage(s, () => {
    const wrapper = { node: "tell", draft: { serviceSubcategories: [] }, capacity: "principal" };
    s.setItem(
      "ponte.structure.draft.v1",
      JSON.stringify({ version: 1, savedAt: Date.now(), stack: ["tell"], draft: wrapper }),
    );
    assert.equal(
      store.readKeptDraft("ponte.structure.draft.v1", looksLikeDraft),
      null,
      "a foreign shape was handed back",
    );
    assert.equal(s.size, 0, "a foreign shape was left in the store to crash the next load");
  });
});

test("a well-shaped draft still passes the guard", () => {
  const s = fakeStorage();
  withStorage(s, () => {
    s.setItem(
      "ponte.structure.draft.v1",
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        stack: ["facts"],
        draft: { ...DRAFT, serviceSubcategories: [] },
      }),
    );
    assert.ok(
      store.readKeptDraft("ponte.structure.draft.v1", looksLikeDraft),
      "a real draft was discarded by the guard",
    );
  });
});

console.log(`ok   structure draft store: ${passed} assertions passed`);
