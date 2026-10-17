import { compose } from "./build";
import { type CueSpec, FILMS } from "./films";
import { samplesAt } from "./lib/audio";

const film = FILMS.shell;
const original = film.cues;
const total = samplesAt(film.durationMs);
let failures = 0;

const report = (ok: boolean, what: string, detail: string): void => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${what}: ${detail}`);
};

const click: CueSpec = { id: "edge", at: 0, sound: "click", variant: "soft", marks: "edge probe", sheet: "0" };
const tick: CueSpec = { id: "edge", at: 0, sound: "tick", variant: "high", marks: "edge probe", sheet: "0" };

const outcome = async (cues: CueSpec[]): Promise<{ built?: Awaited<ReturnType<typeof compose>>; error?: string }> => {
  film.cues = cues;
  try {
    return { built: await compose("shell", false) };
  } catch (e) {
    return { error: (e as Error).message };
  } finally {
    film.cues = original;
  }
};

const rejects = async (what: string, cues: CueSpec[], pattern: RegExp): Promise<void> => {
  const { built, error } = await outcome(cues);
  report(!built && Boolean(error && pattern.test(error)), what, built ? "composed when it should have thrown" : (error ?? "").slice(0, 100));
};

const atZero = await outcome([click]);
if (atZero.built) {
  const placed = atZero.built.placed[0]!;
  const ui = atZero.built.stems.ui;
  const body = placed.buffer!.l;
  let worst = 0;
  for (let i = 150; i < 600; i++) worst = Math.max(worst, Math.abs(ui.l[i]! - body[i]! * placed.gain));
  report(ui.l[0] === 0 && ui.r[0] === 0, "a cue at 0 ms starts the stem on digital zero", `first sample ${ui.l[0]}`);
  report(worst < 1e-6, "a cue at 0 ms lands on sample 0", `largest difference from the click in samples 150 to 600 is ${worst.toExponential(1)}`);
} else {
  report(false, "a cue at 0 ms composes", atZero.error ?? "");
}

const length = (await outcome([tick])).built?.placed[0]?.buffer?.l.length ?? 0;
const last = film.durationMs - Math.ceil(length / 48);
const atEnd = await outcome([{ ...tick, at: last }]);
if (atEnd.built) {
  const ui = atEnd.built.stems.ui;
  report(ui.l.length === total && ui.l.at(-1) === 0 && ui.r.at(-1) === 0, "a cue ending on the last sample fits and the stem ends on digital zero", `stem ${ui.l.length} of ${total} samples, last ${ui.l.at(-1)}`);
} else {
  report(false, "a cue ending on the last sample fits", atEnd.error ?? "");
}

await rejects("a cue running past the end is an error, not a truncation", [{ ...tick, at: last + 1 }], /does not fit/);
await rejects("a cue at the film duration is refused", [{ ...tick, at: film.durationMs }], /outside/);
await rejects("a cue before 0 is refused", [{ ...tick, at: -1 }], /outside/);
await rejects("duplicate ids are refused", [tick, { ...tick, at: 1000 }], /duplicate/);
await rejects(
  "a typing cue with the wrong number of press times is refused",
  [{ id: "typed", at: 1000, sound: "typing", endMs: 1200, text: "abc", seed: 1, presses: [1000, 1100], marks: "edge probe", sheet: "0" }],
  /press times/,
);

const empty = await outcome([]);
report(Boolean(empty.built) && empty.built!.stems.ui.l.every((v) => v === 0), "a film with no cues composes to silence", empty.built ? `${empty.built.stems.ui.l.length} samples` : (empty.error ?? ""));

console.log(failures ? `\n${failures} edge check(s) failed` : "\nall edge checks passed");
process.exitCode = failures ? 1 : 0;
