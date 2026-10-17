import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ISLAND } from "../../app/utils/stage/camera.ts";
import sage from "../scripts/sage.ts";
import { FRAME, WINDOW, type Cut } from "../scripts/script.ts";
import shell from "../scripts/shell.ts";
import sidecar from "../scripts/sidecar.ts";
import { IslandMotion, MOTION, type Box } from "./island.ts";

const CUTS: Cut[] = ["wide", "tall"];

const times = { open: 2000, fold: 30_500, close: 32_000 };

const window = (cut: Cut): Box => ({ x: WINDOW[cut].x + WINDOW[cut].width / 2, y: WINDOW[cut].y + WINDOW[cut].height / 2, width: WINDOW[cut].width, height: WINDOW[cut].height, radius: MOTION.radius });

describe("IslandMotion.pose", () => {
  for (const cut of CUTS) {
    it(`rests as the stage's 2.4-wide pill at the frame centre in the ${cut} cut`, () => {
      const { box, opacity, core, line } = IslandMotion.pose({ ms: 0, cut, times });
      assert.deepEqual([box.x, box.y], [FRAME[cut].width / 2, FRAME[cut].height / 2]);
      assert.equal(box.radius, box.height / 2);
      assert.ok(Math.abs(box.width * IslandMotion.scale({ cut, depth: MOTION.depth.rest }) - ISLAND.width) < 1e-9);
      assert.deepEqual([opacity, core, line], [1, 0, 0]);
    });

    it(`is the window's box, thin and without its core, from the downbeat to the end of the crossfade in the ${cut} cut`, () => {
      for (const ms of [2000, 2150, 2300]) {
        const { box, depth, core } = IslandMotion.pose({ ms, cut, times });
        assert.deepEqual(box, window(cut), String(ms));
        assert.deepEqual([depth, core], [MOTION.depth.open, 0], String(ms));
      }
      assert.equal(IslandMotion.pose({ ms: 2000, cut, times }).opacity, 1);
      assert.equal(IslandMotion.pose({ ms: 2300, cut, times }).opacity, 0);
    });

    it(`fades back in at the window's box over the fold's first 300 ms, then lands at rest with its core on the close in the ${cut} cut`, () => {
      for (const ms of [30_500, 30_650, 30_800]) assert.deepEqual(IslandMotion.pose({ ms, cut, times }).box, window(cut), String(ms));
      assert.deepEqual([IslandMotion.pose({ ms: 30_500, cut, times }).opacity, IslandMotion.pose({ ms: 30_800, cut, times }).opacity], [0, 1]);
      const landed = IslandMotion.pose({ ms: 32_000, cut, times });
      assert.deepEqual([landed.box, landed.depth, landed.core, landed.line], [IslandMotion.rest(cut), MOTION.depth.rest, 1, 0]);
      const settled = IslandMotion.pose({ ms: 32_500, cut, times });
      assert.deepEqual([settled.line, settled.breathe], [1, 1]);
    });
  }

  it("opens over the beat before the downbeat and folds without moving outside its moves", () => {
    const before = IslandMotion.pose({ ms: 1500, cut: "wide", times }).box;
    assert.deepEqual(before, IslandMotion.rest("wide"));
    const halfway = IslandMotion.pose({ ms: 1750, cut: "wide", times }).box;
    assert.ok(halfway.width > before.width && halfway.width < WINDOW.wide.width, String(halfway.width));
    assert.deepEqual(IslandMotion.pose({ ms: 10_000, cut: "wide", times }).opacity, 0);
    assert.deepEqual(IslandMotion.pose({ ms: 99_000, cut: "wide", times }).box, IslandMotion.rest("wide"));
  });

  it("carries Sidecar's title on its core from 500 and lets the core go with the title's exit", () => {
    const carried = IslandMotion.times(sidecar);
    assert.equal(IslandMotion.pose({ ms: 499, cut: "wide", times: carried }).core, 0);
    const up = IslandMotion.pose({ ms: 900, cut: "wide", times: carried });
    assert.deepEqual([up.core, up.box.width, up.box.radius], [1, IslandMotion.rest("wide").width * MOTION.carried.width, IslandMotion.rest("wide").radius]);
    assert.equal(IslandMotion.pose({ ms: 1820, cut: "wide", times: carried }).core, 1);
    assert.equal(IslandMotion.pose({ ms: 2000, cut: "wide", times: carried }).core, 0);
    assert.equal(IslandMotion.pose({ ms: 900, cut: "wide", times: IslandMotion.times(shell) }).core, 0);
  });

  it("gives the same pose for the same ms whatever came before", () => {
    const order = [0, 1750, 31_000, 2100, 500];
    const forward = order.map((ms) => IslandMotion.pose({ ms, cut: "tall", times }));
    const backward = [...order].reverse().map((ms) => IslandMotion.pose({ ms, cut: "tall", times })).reverse();
    assert.deepEqual(forward, backward);
  });
});

describe("IslandMotion.problems", () => {
  it("passes every committed script", () => {
    for (const script of [shell, sage, sidecar]) assert.deepEqual(IslandMotion.problems(IslandMotion.times(script)), [], script.name);
  });

  it("refuses a carry into the open, a fold inside the open's crossfade, and a close with no glide", () => {
    assert.deepEqual(IslandMotion.problems({ carry: 1200, open: 2000, fold: 2200, close: 2500 }), [
      "the title carry at 1200 ms runs into the open at 1500",
      "the fold at 2200 ms starts before the open's crossfade ends at 2300",
      "the close at 2500 ms leaves no glide after the fold's crossfade ends at 2500",
    ]);
  });
});

describe("IslandMotion.endTop", () => {
  it("puts the end card under the island's line and halo, inside the frame", () => {
    for (const cut of CUTS) {
      const rest = IslandMotion.rest(cut);
      const top = IslandMotion.endTop(cut);
      assert.ok(top > rest.y + rest.height / 2 && top < FRAME[cut].height - 96, `${cut} ${top}`);
    }
  });
});
