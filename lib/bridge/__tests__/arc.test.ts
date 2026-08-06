// The arc is a circle, and the maths says so rather than the eye.
//
// Run: npx tsx lib/bridge/__tests__/arc.test.ts
//
// A polyline through the same endpoints looks like an arc at a glance. An
// ellipse looks like one until it sits beside a real one. The geometry is
// therefore asserted numerically: every point the component places is checked
// to be exactly one radius from the derived centre.

import assert from "node:assert/strict";

import {
  ARC_METRICS,
  arc,
  arcPoint,
  arcY,
  deckFraction,
  nodeStates,
  ARCH_RATIO,
  riseFor,
  heightFor,
} from "../arc";

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

test("the path is a single A command, never a polyline", () => {
  const geometry = arc(8, 1192, 174, 126);
  // One move, one arc. No L, no C, no Q, and no second A.
  assert.match(geometry.d, /^M [\d.-]+ [\d.-]+ A [\d.-]+ [\d.-]+ 0 0 1 [\d.-]+ [\d.-]+$/);
  assert.equal((geometry.d.match(/A/g) ?? []).length, 1, "more than one arc command");
  for (const command of ["L", "C", "Q", "S", "T"]) {
    assert.ok(!geometry.d.includes(` ${command} `), `the path contains a ${command} command`);
  }
});

test("the two radii in the A command are equal, so it is circular and not elliptical", () => {
  const geometry = arc(0, 900, 200, 90);
  const [rx, ry] = geometry.d.split(" A ")[1].split(" ").slice(0, 2).map(Number);
  assert.equal(rx, ry, "the arc has two different radii, which is an ellipse");
});

test("every point on the arc is exactly one radius from the centre", () => {
  /*
    The definition of a circle, applied to the points the component actually
    places. This is what a polyline would fail: its vertices would sit on the
    circle and everything between them would not.
  */
  const x0 = 8;
  const x1 = 1192;
  const geometry = arc(x0, x1, 174, 126);
  for (let step = 0; step <= 40; step += 1) {
    const t = step / 40;
    const { x, y } = arcPoint(geometry, x0, x1, t);
    const distance = Math.hypot(x - geometry.cx, y - geometry.cy);
    assert.ok(
      Math.abs(distance - geometry.radius) < 1e-6,
      `t=${t} sits ${distance.toFixed(6)} from the centre, radius is ${geometry.radius.toFixed(6)}`,
    );
  }
});

test("the rise is exactly the rise that was asked for", () => {
  const geometry = arc(0, 800, 300, 120);
  const crown = arcY(geometry, 0, 800, 0.5);
  assert.ok(Math.abs((300 - crown) - 120) < 1e-9, `the crown rises ${(300 - crown).toFixed(6)}`);
});

test("the ends land on the baseline", () => {
  const geometry = arc(10, 610, 250, 80);
  assert.ok(Math.abs(arcY(geometry, 10, 610, 0) - 250) < 1e-9, "the left springing is off the baseline");
  assert.ok(Math.abs(arcY(geometry, 10, 610, 1) - 250) < 1e-9, "the right springing is off the baseline");
});

test("the ends do not come back NaN", () => {
  /*
    Floating-point error at t=0 and t=1 can make the term under the square root
    fractionally negative. Unclamped, that is NaN, and an SVG circle at NaN does
    not render: the first and last node would vanish from every arc in the
    product, on some widths and not others.
  */
  for (const width of [317, 390, 768, 901, 1193, 1559]) {
    const geometry = arc(8, width - 8, 174, 126);
    for (const t of [0, 1]) {
      assert.ok(Number.isFinite(arcY(geometry, 8, width - 8, t)), `NaN at t=${t}, width ${width}`);
    }
  }
});

test("a flat or inverted arc is refused rather than emitting Infinity", () => {
  // R = (c^2/4 + h^2) / 2h. At h = 0 that is a division by zero, and a path
  // containing `Infinity` renders as nothing: the screen looks empty rather
  // than broken, which is how it would reach production.
  assert.throws(() => arc(0, 100, 50, 0), /rise must be positive/);
  assert.throws(() => arc(0, 100, 50, -10), /rise must be positive/);
  assert.throws(() => arc(100, 0, 50, 10), /chord must be positive/);
});

test("the three sizes are distinct and only the big two carry labels", () => {
  assert.equal(ARC_METRICS.mini.labels, false, "the mini span carries labels it has no room for");
  assert.equal(ARC_METRICS.hero.labels, true);
  assert.equal(ARC_METRICS.procedure.labels, true);
  const floors = [ARC_METRICS.hero.riseMin, ARC_METRICS.procedure.riseMin, ARC_METRICS.mini.riseMin];
  assert.equal(new Set(floors).size, 3, "two sizes spring from the same rise");
});

/**
 * The arch reads as an arch across the whole range of shells.
 *
 * This is the test the fixed rise would have failed. A 126px rise on the
 * chord a 2,560 screen gives is a 6% rise: a sagging wire, not a span, on the
 * width the owner actually works at. The rise is now a function of the chord,
 * and the property to hold is the RATIO, at every width and not at three.
 */
test("the rise stays an arch from the phone to 2560", () => {
  const hero = ARC_METRICS.hero;
  // The chord each shell actually gives the hero band, gutters and inset taken
  // off: 390 at 22px pad, 1440 at 40px, 2560 capped to the 1840 measure at 72px.
  const chords = [390 - 44 - 16, 1440 - 80 - 16, 1840 - 144 - 16];
  for (const chord of chords) {
    const rise = riseFor(chord, hero);
    const ratio = rise / chord;
    assert.ok(
      ratio >= 0.12,
      `a chord of ${chord} rises ${rise.toFixed(0)}, a ratio of ${ratio.toFixed(3)}: that is a wire, not an arch`,
    );
    assert.ok(ratio <= 0.32, `a chord of ${chord} rises ${rise.toFixed(0)}: that is an aqueduct`);
    // And the band always contains the arch it draws.
    assert.ok(rise < heightFor(rise, hero) - hero.water, "the arch overflows its own band");
  }
});

test("the rise is clamped at both ends and monotonic between them", () => {
  const hero = ARC_METRICS.hero;
  assert.equal(riseFor(10, hero), hero.riseMin, "a tiny chord is not floored");
  assert.equal(riseFor(100_000, hero), hero.riseMax, "a huge chord is not capped");
  assert.ok(riseFor(1400, hero) > riseFor(900, hero), "a longer chord does not rise further");
  // One rule, not three breakpoints: the ratio holds exactly between the clamps.
  assert.ok(Math.abs(riseFor(1200, hero) - 1200 * ARCH_RATIO) < 1e-9);
});

test("node states run done, current, todo, and a finished crossing highlights nothing", () => {
  assert.deepEqual(nodeStates(4, 2), ["done", "done", "current", "todo", "todo"]);
  assert.deepEqual(nodeStates(3, 0), ["current", "todo", "todo", "todo"]);
  // Complete: past the last node, so nothing is "current". A crossing that has
  // arrived should not still be pointing at a step.
  assert.deepEqual(nodeStates(2, 3), ["done", "done", "done"]);
});

test("the deck fraction is the only progress measure, and it is a fraction", () => {
  assert.equal(deckFraction(4, 0), 0);
  assert.equal(deckFraction(4, 2), 0.5);
  assert.equal(deckFraction(4, 4), 1);
  // Never past the end, never before the start, whatever it is handed.
  assert.equal(deckFraction(4, 9), 1);
  assert.equal(deckFraction(4, -2), 0);
  assert.equal(deckFraction(0, 1), 0, "a crossing with no stages divides by zero");
});

console.log(`ok   bridge arc: ${passed} assertions passed`);
