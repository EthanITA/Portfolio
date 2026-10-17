import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";
import { readSheet, SHEETS } from "./cues.ts";
import sage from "./sage.ts";
import { GRID, type FilmScript } from "./script.ts";
import shell from "./shell.ts";
import sidecar from "./sidecar.ts";

type Line = { stem: string; voice: string; text: string; onsetMs: number; endMs: number; words: { text: string; startMs: number; endMs: number }[]; anchor?: { word: string; beatMs: number } };

type Fixture = { durationMs: number; mixSha256?: string; bed: { grid: Record<string, number>; closeMs: number; accents: { atMs: number; kind: string }[] }; cues: Line[] };

const WORD = 250;
const MIX = "5e1f".repeat(16);

// Each line starts on a beat with its first word as the anchor, so a fresh fixture passes and every test breaks exactly one thing.
const fixture = (script: FilmScript): Fixture => ({
  durationMs: script.duration,
  mixSha256: MIX,
  bed: { grid: { ...GRID, beats: script.duration / GRID.beatMs }, closeMs: script.close, accents: [{ atMs: 4000, kind: "clap" }, { atMs: script.close, kind: "close" }] },
  cues: script.lines.map((text, index) => {
    const onsetMs = 1000 + index * 4000;
    const words = text.split(" ").map((word, position) => ({ text: word, startMs: onsetMs + position * WORD, endMs: onsetMs + (position + 1) * WORD }));
    return { stem: "voice", voice: "narrator", text, onsetMs, endMs: words.at(-1)?.endMs ?? onsetMs, words, anchor: { word: words[0]?.text ?? "", beatMs: onsetMs } };
  }),
});

const problems = (script: FilmScript, change: (sheet: Fixture) => void = () => {}): string[] => {
  const sheet = fixture(script);
  change(sheet);
  return readSheet({ script, json: sheet, mixSha256: MIX }).problems;
};

const line = (sheet: Fixture, index: number): Line => {
  const found = sheet.cues[index];
  if (!found) throw new Error(`the fixture has no line ${index}`);
  return found;
};

const one = (found: string[], pattern: RegExp): void => {
  assert.equal(found.length, 1, found.join("\n"));
  assert.match(found[0] ?? "", pattern);
};

describe("readSheet", () => {
  it("accepts a sheet that matches each film", () => {
    for (const script of [shell, sage, sidecar]) assert.deepEqual(problems(script), []);
  });

  it("accepts every committed cues.json against the sha256 of its own mix.wav", async () => {
    for (const script of [shell, sage, sidecar]) {
      const mixSha256 = createHash("sha256")
        .update(await readFile(join(import.meta.dirname, "../audio", script.name, "mix.wav")))
        .digest("hex");
      const { sheet, problems: found } = readSheet({ script, json: SHEETS[script.name], mixSha256 });
      assert.deepEqual(found, [], script.name);
      assert.equal(sheet.lines.length, script.lines.length, script.name);
    }
  });

  it("refuses a sheet measured on another mix, or on none it names", () => {
    one(
      problems(shell, (sheet) => {
        sheet.mixSha256 = "0".repeat(64);
      }),
      /mixSha256 is 0{64}, while the mix\.wav beside it hashes to (5e1f){16}/,
    );
    one(
      problems(shell, (sheet) => {
        delete sheet.mixSha256;
      }),
      /mixSha256 is undefined/,
    );
  });

  it("refuses a sheet on another grid", () => {
    one(
      problems(shell, (sheet) => {
        sheet.bed.grid.bpm = 108;
      }),
      /bed\.grid\.bpm is 108/,
    );
  });

  it("refuses a sheet measured on another length", () => {
    one(
      problems(shell, (sheet) => {
        sheet.durationMs = 34_000;
      }),
      /durationMs is 34000/,
    );
  });

  it("takes a close within 20 ms of the film's and refuses one further off", () => {
    assert.deepEqual(
      problems(shell, (sheet) => {
        sheet.bed.closeMs += 15;
        sheet.bed.accents = sheet.bed.accents.map((accent) => (accent.kind === "close" ? { ...accent, atMs: accent.atMs + 15 } : accent));
      }),
      [],
    );
    assert.match(
      problems(shell, (sheet) => {
        sheet.bed.closeMs += 300;
      }).join("\n"),
      /bed\.closeMs is 32300/,
    );
  });

  it("needs a close accent on the close", () => {
    one(
      problems(sage, (sheet) => {
        sheet.bed.accents = sheet.bed.accents.filter((accent) => accent.kind !== "close");
      }),
      /no "close" accent/,
    );
  });

  it("refuses a line the sheet never speaks, speaks twice or makes up", () => {
    one(
      problems(sidecar, (sheet) => {
        sheet.cues.splice(2, 1);
      }),
      /"Approve a hunk\. Reject two lines\." has 0 voice cues/,
    );
    assert.match(
      problems(sidecar, (sheet) => {
        sheet.cues.push({ ...line(sheet, 8), onsetMs: 44_000, endMs: 44_900, words: [], anchor: undefined });
      }).join("\n"),
      /"That click stays yours\." has 2 voice cues/,
    );
    assert.match(
      problems(sage, (sheet) => {
        line(sheet, 2).text = "English, Italian or Chinese.";
      }).join("\n"),
      /"English, Italian or Chinese\." is none of the film's lines/,
    );
  });

  it("refuses words in their spoken form instead of the line as written", () => {
    one(
      problems(shell, (sheet) => {
        const first = line(sheet, 0);
        const at = first.words.findIndex((word) => word.text === "?");
        const mark = first.words[at];
        if (mark) first.words.splice(at, 1, ...["a", "question", "mark"].map((text) => ({ ...mark, text })));
      }),
      /words reading "Forget the flags\. Type a question mark and say what you want\."/,
    );
  });

  it("refuses a line without words", () => {
    assert.match(
      problems(shell, (sheet) => {
        line(sheet, 3).words = [];
      }).join("\n"),
      /"Or not\." has no words/,
    );
  });

  it("takes a word at 0 ms, a zero-length word and a word ending on the film's last ms", () => {
    assert.deepEqual(
      problems(shell, (sheet) => {
        const first = line(sheet, 0);
        first.onsetMs = 0;
        first.words = first.words.map((word, index) => ({ ...word, startMs: index * WORD, endMs: index === 1 ? index * WORD : (index + 1) * WORD }));
        first.endMs = first.words.at(-1)?.endMs ?? 0;
        first.anchor = { word: "Forget", beatMs: 0 };
        const last = line(sheet, 6);
        last.endMs = shell.duration;
        const end = last.words.at(-1);
        if (end) end.endMs = shell.duration;
      }),
      [],
    );
  });

  it("refuses a line past the film's end", () => {
    assert.match(
      problems(shell, (sheet) => {
        const last = line(sheet, 6);
        last.endMs = shell.duration + 500;
        const end = last.words.at(-1);
        if (end) end.endMs = shell.duration + 500;
      }).join("\n"),
      /outside the film's 0 to 35000/,
    );
  });

  it("refuses a word outside its take by more than a frame, and words out of order", () => {
    one(
      problems(sage, (sheet) => {
        line(sheet, 0).onsetMs += 40;
      }),
      /"A" at 1000 to 1250 ms, outside its take 1040/,
    );
    assert.deepEqual(
      problems(sage, (sheet) => {
        line(sheet, 0).onsetMs += 10;
      }),
      [],
    );
    assert.match(
      problems(sage, (sheet) => {
        const words = line(sheet, 1).words;
        const [first, second] = words;
        if (first && second) [first.startMs, second.startMs] = [second.startMs, first.startMs];
      }).join("\n"),
      /"app" at 5000 ms, before "No" at 5250/,
    );
  });

  it("anchors a word up to 30 ms before its beat, matched without punctuation", () => {
    assert.deepEqual(
      problems(shell, (sheet) => {
        const fourth = line(sheet, 3);
        fourth.words = [
          { text: "Or", startMs: 13_000, endMs: 13_250 },
          { text: "not.", startMs: 13_480, endMs: 13_730 },
        ];
        fourth.endMs = 13_730;
        fourth.anchor = { word: "not", beatMs: 13_500 };
      }),
      [],
    );
  });

  it("refuses an anchor off the beat, late, too early or on no word", () => {
    assert.match(
      problems(sidecar, (sheet) => {
        const first = line(sheet, 0);
        if (first.anchor) first.anchor.beatMs += 250;
      }).join("\n"),
      /at 1250 ms, off the 500 ms beat/,
    );
    one(
      problems(sidecar, (sheet) => {
        const first = line(sheet, 0);
        if (first.anchor) first.anchor.beatMs -= 500;
      }),
      /starts "A" at 1000 ms, not within 30 ms before its beat at 500/,
    );
    one(
      problems(sidecar, (sheet) => {
        const first = line(sheet, 0);
        if (first.anchor) first.anchor.beatMs += 500;
      }),
      /starts "A" at 1000 ms, not within 30 ms before its beat at 1500/,
    );
    one(
      problems(sidecar, (sheet) => {
        const first = line(sheet, 0);
        if (first.anchor) first.anchor.word = "Sidecar";
      }),
      /anchors "Sidecar", which is not one of its words/,
    );
  });

  it("refuses lines that overlap", () => {
    one(
      problems(shell, (sheet) => {
        line(sheet, 1).onsetMs = 3000;
      }),
      /"Only looks\? It runs\." starts at 3000 ms, before "Forget the flags\. Type \? and say what you want\." ends at 3500/,
    );
  });

  it("leaves a voice that speaks no line out, and reads Sage's hand-back as a line in its own voice", () => {
    const handBack = "Stopped at Pay. It's yours to press.";
    const sheet = fixture(sage);
    sheet.cues.push({ stem: "voice", voice: "person", text: "I want to join the standup", onsetMs: 5800, endMs: 7700, words: [] });
    const cue = sheet.cues.find((item) => item.text === handBack);
    if (cue) cue.voice = "sage";
    const { sheet: read, problems: found } = readSheet({ script: sage, json: sheet, mixSha256: MIX });
    assert.deepEqual(found, []);
    assert.equal(read.lines.find((item) => item.text === handBack)?.voice, "sage");
    assert.equal(read.lines.length, sage.lines.length);
  });

  it("refuses a narrator cue that speaks no line", () => {
    one(
      problems(shell, (sheet) => {
        sheet.cues.push({ stem: "voice", voice: "narrator", text: "Meet AI Shell.", onsetMs: 33_000, endMs: 33_500, words: [] });
      }),
      /narrator cue "Meet AI Shell\." is none of the film's lines/,
    );
  });
});
