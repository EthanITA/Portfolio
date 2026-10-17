import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Grid } from "./grid.ts";
import sage from "./sage.ts";
import shell from "./shell.ts";
import sidecar from "./sidecar.ts";

describe("Grid.offGrid", () => {
  it("passes every committed script, its play moments, keys and camera", () => {
    for (const script of [shell, sage, sidecar]) assert.deepEqual(Grid.offGrid(script), [], script.name);
  });

  it("refuses a camera move, a key, a stop or a moment off the beat", () => {
    const moved = { ...shell, rig: { ...shell.rig, shots: [{ at: 4100, duration: 900, scale: 1.2 }] }, keys: [{ key: "enter", at: 7000, until: 7250 }], stops: [{ at: 14_000, until: 16_900 }] };
    assert.deepEqual(Grid.offGrid(moved, { typeFind: 4000, enterFind: 7010 }), [
      "shell shot at 4100 is 4100 ms, off the 500 ms grid",
      "shell shot at 4100 duration is 900 ms, off the 500 ms grid",
      "shell stop or wait until 16900 is 16900 ms, off the 500 ms grid",
      "shell key enter until is 7250 ms, off the 500 ms grid",
      "shell moment enterFind is 7010 ms, off the 500 ms grid",
    ]);
  });
});
