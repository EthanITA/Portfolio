import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { VIOLET, VioletLine, type LineOptions } from "./line.ts";

const FILM: Omit<LineOptions, "ms"> = { anchors: [4000], stops: [{ at: 14_000, until: 17_000 }], fold: 30_500, close: 32_000 };

const at = (ms: number) => VioletLine.pose({ ms, ...FILM });

describe("VioletLine.pose", () => {
  it("draws across in the first half second", () => {
    assert.equal(at(0).draw, 0);
    assert.equal(at(VIOLET.draw).draw, 1);
    assert.ok(at(250).draw > 0.5 && at(250).draw < 1, String(at(250).draw));
  });

  it("pulses from full to 60 percent over 400 ms on every beat until the close", () => {
    for (const beat of [0, 500, 9000, 31_500]) {
      assert.equal(at(beat).glow, 1, String(beat));
      assert.equal(at(beat + 400).glow, VIOLET.pulse.low, String(beat));
      assert.equal(at(beat + 499).glow, VIOLET.pulse.low, String(beat));
    }
    assert.equal(at(32_200).glow, 1);
  });

  it("flares to 1.8 times its height and back over 500 ms on an anchor beat", () => {
    assert.equal(at(4000).height, 1);
    assert.equal(at(4250).height, VIOLET.flare.height);
    assert.equal(at(4500).height, 1);
    assert.equal(at(3999).height, 1);
  });

  it("stays bright and thicker for a stop, easing in and out over 180 ms", () => {
    assert.deepEqual([at(13_999).weight, at(14_180).weight, at(16_999).weight, at(17_180).weight], [1, VIOLET.stop.weight, VIOLET.stop.weight, 1]);
    assert.equal(at(15_450).glow, 1);
    assert.ok(at(14_090).weight > 1 && at(14_090).weight < VIOLET.stop.weight);
  });

  it("fades out over the fold and stays gone, whatever was seeked before", () => {
    assert.equal(at(30_500).opacity, 1);
    assert.equal(at(32_000).opacity, 0);
    assert.equal(at(40_000).opacity, 0);
    const forward = [0, 4250, 14_090, 31_000].map(at);
    const backward = [31_000, 14_090, 4250, 0].map(at).reverse();
    assert.deepEqual(forward, backward);
  });
});
