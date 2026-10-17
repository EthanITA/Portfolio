import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readSheet, SHEETS, type Spoken } from "../scripts/cues.ts";
import sage from "../scripts/sage.ts";
import { WINDOW, type Cut, type FilmScript } from "../scripts/script.ts";
import shell from "../scripts/shell.ts";
import sidecar from "../scripts/sidecar.ts";
import { Sky, SKY, type Box, type Cap, type Line, type Metrics, type Size, type Widths } from "./sky.ts";

const PX: Record<Size, number> = { "8xl": 96, "6xl": 60, "7xl": 72, "5xl": 48 };

// Plus Jakarta Sans bold averages about 0.55em a letter, close enough to exercise every size and row count.
const measure = (spoken: Spoken): Partial<Record<Size, Widths>> =>
  Object.fromEntries(Object.entries(PX).map(([size, px]) => [size, { words: spoken.words.map((word) => word.text.length * px * 0.55), space: px * 0.25 }]));

const said = (text: string, at: number, anchor?: string): Spoken => {
  const words = text.split(" ").map((word, index) => ({ text: word, startMs: at + index * 250, endMs: at + (index + 1) * 250 }));
  return { text, voice: "narrator", onsetMs: at, endMs: words.at(-1)?.endMs ?? at, words, ...(anchor ? { anchor: { word: anchor, beatMs: at } } : {}) };
};

const planned = ({ lines, cut = "wide", fold = 30_000, end = 45_000, violet = [] }: { lines: Spoken[]; cut?: Cut; fold?: number; end?: number; violet?: string[] }): { lines: Line[]; problems: string[] } =>
  Sky.plan({ lines, measured: lines.map(measure), cut, fold, end, violet });

const rows = (line: Line): string[] => line.rows.map((row) => row.words.map((word) => word.text).join(" "));

const first = ({ text, cut = "wide" }: { text: string; cut?: Cut }): Line => {
  const [line] = planned({ lines: [said(text, 1000), said("That click stays yours.", 20_000)], cut }).lines;
  if (!line) throw new Error(`"${text}" was not planned`);
  return line;
};

const film = ({ script, cut }: { script: FilmScript; cut: Cut }): { lines: Line[]; problems: string[] } => {
  const { sheet } = readSheet({ script, json: SHEETS[script.name] });
  return planned({ lines: sheet.lines, cut, fold: script.rig.until, end: script.duration, violet: script.violet });
};

const named = (lines: Line[], text: string): Line => {
  const line = lines.find((candidate) => candidate.text === text);
  if (!line) throw new Error(`no line "${text}"`);
  return line;
};

describe("Sky.plan", () => {
  it("sets a line on one big row when it fits and on balanced small rows otherwise", () => {
    assert.equal(first({ text: "Or not." }).size, "8xl");
    assert.deepEqual(rows(first({ text: "Or not." })), ["Or not."]);
    assert.equal(first({ text: "No app to open. Just hold a key." }).size, "6xl");
    assert.deepEqual(rows(first({ text: "A companion window for Claude Code.", cut: "tall" })), ["A companion window", "for Claude Code."]);
    assert.deepEqual([first({ text: "A companion window for Claude Code.", cut: "tall" }).rows.length, first({ text: "one two three four five six seven eight nine ten eleven twelve", cut: "tall" }).rows.length], [2, 3]);
  });

  it("breaks at a sentence end whenever the rows fit, and where they come out most equal otherwise", () => {
    assert.deepEqual(rows(first({ text: "No app to open. Just hold a key." })), ["No app to open.", "Just hold a key."]);
    assert.deepEqual(rows(first({ text: "Forget the flags. Type ? and say what you want." })), ["Forget the flags.", "Type ? and say what you want."]);
    assert.deepEqual(rows(first({ text: "Changing something? It asks. You get five seconds." })), ["Changing something? It asks.", "You get five seconds."]);
    assert.deepEqual(rows(first({ text: "A companion window for Claude Code." })), ["A companion window", "for Claude Code."]);
    assert.deepEqual(rows(first({ text: "one two three. four five six seven eight nine ten eleven twelve", cut: "tall" })), ["one two three.", "four five six seven eight", "nine ten eleven twelve"]);
  });

  it("refuses a line that fits no size", () => {
    const { problems } = planned({ lines: [said("Unbreakablecompoundwordthatrunspastthewindow", 1000), said("Done.", 5000)], cut: "tall" });
    assert.deepEqual(problems, ['line "Unbreakablecompoundwordthatrunspastthewindow" fits no tall size inside 624 px']);
  });

  it("enters a word on 0 ms and ripples an anchor from 0", () => {
    assert.deepEqual(Sky.pose({ ms: 0, at: 0, leave: 5000, swell: false }), { opacity: 0, y: SKY.rise, blur: SKY.blur, scale: 1 });
    assert.deepEqual(Sky.pose({ ms: SKY.enter, at: 0, leave: 5000, swell: false }), { opacity: 1, y: 0, blur: 0, scale: 1 });
    const { lines, problems } = planned({ lines: [said("Runs now.", 0, "Runs"), said("That click stays yours.", 4000)] });
    assert.deepEqual(problems, []);
    assert.deepEqual(lines[0]?.rows[0]?.words[0]?.letters?.map((letter) => letter.at), [0, 15, 30, 45]);
  });

  it("places a zero-length word on its start like any other", () => {
    const line = said("A quick word.", 1000);
    const quick = line.words[1];
    if (quick) quick.endMs = quick.startMs;
    const { lines, problems } = planned({ lines: [line, said("That click stays yours.", 5000)] });
    assert.deepEqual(problems, []);
    assert.equal(lines[0]?.rows.flatMap((row) => row.words).find((word) => word.text === "quick")?.at, 1250);
  });

  it("refuses a word that can't be in before the film ends, and takes one in on the last ms", () => {
    const late = planned({ lines: [said("Done.", 1000), said("Too late.", 44_800)] });
    assert.deepEqual(late.problems, ['"late." in "Too late." is in at 45250 ms, after the film ends at 45000']);
    assert.deepEqual(planned({ lines: [said("Done.", 1000), said("Just in.", 44_550)] }).problems, []);
  });

  it("refuses a line that leaves before its words are in, or overlaps the next", () => {
    const { problems } = planned({ lines: [said("Too soon.", 1000), said("Next line.", 1300), said("That click stays yours.", 9000)] });
    assert.deepEqual(problems, ['"Too" in "Too soon." leaves at 1100 ms, before it is in at 1200', '"soon." in "Too soon." leaves at 1120 ms, before it is in at 1450']);
    const folded = planned({ lines: [said("Before the fold.", 1000), said("End.", 2000)], fold: 1000 });
    assert.deepEqual(folded.problems, ['"End." lands at 2000 ms while "Before the fold." is leaving until 2220']);
  });

  for (const cut of ["wide", "tall"] as const) {
    it(`plans every committed sheet in the ${cut} cut with no problem`, () => {
      for (const script of [shell, sage, sidecar]) {
        const { lines, problems } = film({ script, cut });
        assert.deepEqual(problems, [], script.name);
        assert.equal(lines.length, script.lines.length, script.name);
        assert.equal(new Set(lines.map((line) => line.size)).size <= 2, true, script.name);
      }
    });
  }

  it("leaves a line on the next line's first word, the last before the fold at the fold or a beat past its last word, and the end line never", () => {
    const shellLines = film({ script: shell, cut: "wide" }).lines;
    assert.equal(named(shellLines, "Pipe a diff in. A commit message comes out.").leave, 30_500);
    assert.equal(named(shellLines, "Only looks? It runs.").leave, 12_835 - SKY.exit - 3 * SKY.trail);
    assert.equal(named(shellLines, "That click stays yours.").leave, Number.POSITIVE_INFINITY);
    assert.equal(named(film({ script: sage, cut: "wide" }).lines, "Stopped at Pay. It's yours to press.").leave, 35_500);
    assert.equal(named(film({ script: sidecar, cut: "wide" }).lines, "Claude does the work. You decide what lands.").leave, 39_500);
  });

  it("marks the boundary words violet, Sage's hand-back muted, code in chips and the anchor's letters 15 ms apart from its beat", () => {
    const words = (script: FilmScript, text: string) => named(film({ script, cut: "wide" }).lines, text).rows.flatMap((row) => row.words);
    const enter = words(shell, "Changes something? It waits for your Enter.").find((word) => word.text === "Enter.");
    assert.equal(enter?.tone, "violet");
    assert.equal(words(shell, "Forget the flags. Type ? and say what you want.").find((word) => word.text === "?")?.code, true);
    assert.deepEqual(new Set(words(sage, "Stopped at Pay. It's yours to press.").map((word) => word.tone)), new Set(["muted"]));
    const approve = words(sidecar, "Approve a hunk. Reject two lines.")[0];
    assert.equal(approve?.tone, "violet");
    assert.deepEqual(
      approve?.letters?.map((letter) => letter.at),
      [11_000, 11_015, 11_030, 11_045, 11_060, 11_075, 11_090],
    );
    const undo = words(sidecar, "Changed your mind? ⌘Z takes back 50 decisions.").find((word) => word.text === "⌘Z");
    assert.deepEqual([undo?.code, undo?.swell, undo?.letters, undo?.tone, undo?.at], [true, true, undefined, "violet", 30_000]);
  });

  it("centres the end line and keeps every other line on the window's left edge", () => {
    const lines = film({ script: sidecar, cut: "wide" }).lines;
    for (const row of named(lines, "That click stays yours.").rows) assert.equal(row.words[0]?.x, (WINDOW.wide.width - row.width) / 2);
    for (const row of named(lines, "Claude hears about it.").rows) assert.equal(row.words[0]?.x, 0);
  });
});

const METRICS: Record<Size, Metrics> = { "8xl": { em: 96, descent: 20 }, "6xl": { em: 60, descent: 12 }, "7xl": { em: 72, descent: 15 }, "5xl": { em: 48, descent: 10 } };

const ZOOM: Record<Cut, number> = { wide: 3, tall: 2.5 };

const boxed = ({ keys, cut, width = 20 }: { keys: string[]; cut: Cut; width?: number }): Record<string, Box> =>
  Object.fromEntries(keys.map((key) => [key, { width: width * ZOOM[cut] * key.split(" ").length, height: 18 * ZOOM[cut] }]));

const capped = ({ script, cut = "wide" }: { script: FilmScript; cut?: Cut }): { caps: Cap[]; problems: string[] } =>
  Sky.caps({ keys: script.keys, waits: script.waits, lines: film({ script, cut }).lines, metrics: METRICS, boxes: boxed({ keys: [...script.keys, ...script.waits].map((press) => press.key), cut }), cut });

const timing = (cap?: Cap): Partial<Cap> => ({ keys: cap?.keys, at: cap?.at, leave: cap?.leave, dips: cap?.dips, pulses: cap?.pulses });

describe("Sky.caps", () => {
  it("shows a press on its beat and drops it a beat later, and a held key for its hold", () => {
    assert.deepEqual(timing(capped({ script: shell }).caps[0]), { keys: "enter", at: 7000, leave: 7500, dips: [], pulses: [] });
    assert.deepEqual(timing(capped({ script: sage }).caps[0]), { keys: "opt", at: 4500, leave: 7500, dips: [], pulses: [] });
  });

  it("merges touching presses of one key into one cap that dips on each repeat", () => {
    const caps = capped({ script: sidecar }).caps;
    assert.deepEqual(caps.map(timing).slice(1), [
      { keys: "cmd Z", at: 30_000, leave: 31_000, dips: [30_500], pulses: [] },
      { keys: "cmd shift Z", at: 31_500, leave: 32_500, dips: [32_000], pulses: [] },
    ]);
  });

  it("pulses a waiting key on every beat it waits, dips it when pressed, and clears it before the next key lands", () => {
    const enter = capped({ script: sage }).caps.find((cap) => cap.at === 20_500);
    assert.deepEqual(timing(enter), { keys: "enter", at: 20_500, leave: 24_500, dips: [24_000], pulses: [21_000, 21_500, 22_000, 22_500, 23_000, 23_500] });
    const waiting = capped({ script: shell }).caps.find((cap) => cap.at === 14_000);
    assert.deepEqual(timing(waiting), { keys: "enter", at: 14_000, leave: 17_000 - SKY.exit, dips: [], pulses: [14_500, 15_000, 15_500, 16_000, 16_500] });
  });

  for (const cut of ["wide", "tall"] as const) {
    it(`places every committed film's keys in the ${cut} cut with no problem`, () => {
      for (const script of [shell, sage, sidecar]) assert.deepEqual(capped({ script, cut }).problems, [], script.name);
    });
  }

  it("sits on the baseline beside the words, above them when the row is full, and refuses a sky too short to stack", () => {
    const place = ({ text, width }: { text: string; width: number }) =>
      Sky.caps({ keys: [{ key: "enter", at: 1500 }], waits: [], lines: [first({ text, cut: "tall" })], metrics: METRICS, boxes: boxed({ keys: ["enter"], cut: "tall", width }), cut: "tall" });
    assert.equal(place({ text: "Or not.", width: 20 }).caps[0]?.bottom, SKY.pad * 72 + 15);
    assert.equal(place({ text: "Or not.", width: 160 }).caps[0]?.bottom, 72 + SKY.pad * 72 + SKY.gap);
    assert.deepEqual(place({ text: "one two three four five six seven eight nine ten eleven twelve", width: 160 }).problems, [`keycap "enter" at 1500 ms needs 225 px above the line, the tall sky has 174`]);
  });
});

describe("Sky.press", () => {
  const cap: Cap = { keys: "enter", at: 1000, leave: 4000, dips: [3000], pulses: [2000], bottom: 0 };
  it("rests at scale 1, swells 6 percent halfway through a pulse and goes down a depth line on a press without shrinking", () => {
    assert.deepEqual(Sky.press({ ms: 1500, cap }), { opacity: 1, y: 0, blur: 0, scale: 1, down: 0 });
    assert.equal(Sky.press({ ms: 2000, cap }).scale, 1);
    assert.equal(Sky.press({ ms: 2000 + SKY.pulse.over / 2, cap }).scale, SKY.pulse.scale);
    assert.equal(Sky.press({ ms: 2000 + SKY.pulse.over, cap }).scale, 1);
    assert.deepEqual(
      [2999, 3000, 3000 + SKY.dip.over].map((ms) => Sky.press({ ms, cap }).down),
      [0, 1, 0],
    );
    const halfway = Sky.press({ ms: 3000 + SKY.dip.over / 2, cap });
    assert.ok(halfway.down > 0 && halfway.down < 1 && halfway.scale === 1, JSON.stringify(halfway));
    assert.equal(Sky.press({ ms: 4180, cap }).opacity, 0);
  });
});

describe("Sky.pose", () => {
  it("is hidden and low before its start, in place 200 ms after, and gone 180 ms after it leaves", () => {
    assert.deepEqual(Sky.pose({ ms: 0, at: 0, leave: 5000, swell: false }), { opacity: 0, y: SKY.rise, blur: SKY.blur, scale: 1 });
    assert.deepEqual(Sky.pose({ ms: 999, at: 1000, leave: 5000, swell: false }), { opacity: 0, y: SKY.rise, blur: SKY.blur, scale: 1 });
    assert.deepEqual(Sky.pose({ ms: 1200, at: 1000, leave: 5000, swell: false }), { opacity: 1, y: 0, blur: 0, scale: 1 });
    assert.deepEqual(Sky.pose({ ms: 5180, at: 1000, leave: 5000, swell: false }), { opacity: 0, y: -SKY.rise, blur: 0, scale: 1 });
    assert.deepEqual(Sky.pose({ ms: 90_000, at: 1000, leave: 5000, swell: false }), { opacity: 0, y: -SKY.rise, blur: 0, scale: 1 });
    assert.deepEqual(Sky.pose({ ms: 90_000, at: 1000, leave: Number.POSITIVE_INFINITY, swell: false }), { opacity: 1, y: 0, blur: 0, scale: 1 });
  });

  it("swells an anchor from 1.08 on its beat to 1 over 240 ms", () => {
    assert.equal(Sky.pose({ ms: 1000, at: 1000, leave: 5000, swell: true }).scale, SKY.swell);
    assert.equal(Sky.pose({ ms: 1240, at: 1000, leave: 5000, swell: true }).scale, 1);
    const halfway = Sky.pose({ ms: 1100, at: 1000, leave: 5000, swell: true }).scale;
    assert.ok(halfway > 1 && halfway < SKY.swell, String(halfway));
  });

  it("gives the same pose for the same ms whatever came before", () => {
    const forward = [0, 1100, 1150, 5090].map((ms) => Sky.pose({ ms, at: 1000, leave: 5000, swell: true }));
    const backward = [5090, 1150, 1100, 0].map((ms) => Sky.pose({ ms, at: 1000, leave: 5000, swell: true })).reverse();
    assert.deepEqual(forward, backward);
  });
});
