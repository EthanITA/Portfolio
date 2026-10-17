import { SAGE_SCRIPT } from "../../../app/utils/play/script/sage";
import { SHELL_SCRIPT } from "../../../app/utils/play/script/shell";
import { SIDECAR_SCRIPT } from "../../../app/utils/play/script/sidecar";
import type { Typed } from "../../../app/utils/play/script/typed";
import { HAND_BACK_VOICE_MS, SHEETS, SIDECAR_SEAM_MS, windowsOf } from "./sheets";
import type { ClickVariant, KeyVariant, TickVariant, WhooshDirection } from "./lib/synth";

export type FilmName = "sidecar" | "sage" | "shell";
export type VoiceName = "person" | "sage" | "narrator";

type Base = { id: string; at: number; marks: string; sheet: string; gainDb?: number };

export type CueSpec =
  | (Base & { sound: "key"; variant: KeyVariant })
  | (Base & { sound: "tick"; variant: TickVariant })
  | (Base & { sound: "click"; variant: ClickVariant })
  | (Base & { sound: "chime" })
  | (Base & { sound: "thud" })
  | (Base & { sound: "line"; durMs: number; cutMs?: number })
  | (Base & { sound: "whoosh"; durMs: number; fromHz: number; toHz: number; direction: WhooshDirection })
  | (Base & { sound: "voice"; voice: VoiceName; text: string; from?: number; until?: number; anchor?: { word: string; beatMs: number } })
  | (Base & { sound: "typing"; endMs: number; text: string; seed: number; presses?: number[] });

export type FilmSpec = {
  name: FilmName;
  durationMs: number;
  music: { source: "lyria" | "synth"; take: number; gainDb: number; fadeInMs: number; fadeOutMs: number; startMs: number };
  cues: CueSpec[];
};

export const VOICES: Record<VoiceName, { voice: string; direction: string }> = {
  person: {
    voice: "cedar",
    direction: "A relaxed adult speaking to their Mac at a natural, unhurried conversational pace, plain and a little casual.",
  },
  sage: {
    voice: "marin",
    direction: "A calm, warm assistant voice. Quiet, close to the microphone, unhurried and kind, with no sales energy.",
  },
  narrator: {
    voice: "ash",
    direction:
      "A builder showing a friend what they made last night. Quick, bright and sure of it, close to the microphone, a smile in the voice, a small lift on the last word of each line and a beat of air between lines. Never an announcer, never a movie trailer: no whisper, no breathiness, no uptalk, no stretched vowels.",
  },
};

export const spokenForm = (text: string): string => text.replace(/ \? /g, " a question mark ").replace("⌘Z", "Command Z").replace(/\b50\b/g, "fifty");

export const MUSIC_SKELETON =
  "Instrumental ambient underscore for a short product film. Warm, quiet and spacious. Soft analog-style synth pads in D major, a slow sub-bass pulse at 60 beats per minute like a calm heartbeat, and very sparse glass-bell tones that appear once every few bars. No drums, no percussion hits, no vocals, no lyrics, no risers, no impacts, no crescendo, no drop, nothing cinematic or trailer-like. Constant gentle dynamics that stay low in the mix so a voice and small interface sounds can sit on top. It fades in softly, holds steady, and resolves to a single sustained D major chord that rings out and fades to silence.";

export const MUSIC_VARIANT: Record<FilmName, string> = {
  sidecar: "Slightly brighter and more open than a plain pad, with a hint of gentle forward motion.",
  sage: "Sparser in the midrange, with more air and space, leaving a clear lane for a spoken voice.",
  shell: "The driest and most minimal of the family, the pulse a little more present, like a quiet machine at rest.",
};

const ISLAND_OPEN_MS = 2000;
const LINE_START_MS = 600;

const whoosh = (id: string, at: number, durMs: number, direction: WhooshDirection, marks: string, fromHz = 350, toHz = 2400): CueSpec => ({
  id, at, sound: "whoosh", durMs, fromHz, toHz, direction, marks, sheet: "",
});

const typing = (id: string, script: Typed, seed: number, marks: string): CueSpec => ({
  id, at: script.at[0] ?? 0, sound: "typing", endMs: script.at.at(-1) ?? 0, presses: script.at, text: script.text, seed, marks, sheet: "",
});

const RANGES = {
  sidecar: [[0, 3], [3, 10], [10, 18], [18, 28], [28, 34], [34, 41], [41, 45]],
  sage: [[0, 3], [3, 9], [9, 12], [12, 22], [22, 30], [30, 36], [36, 40]],
  shell: [[0, 3], [3, 10], [10, 18], [18, 27], [27, 32], [32, 35]],
} as const;

const withSheets = (film: keyof typeof RANGES, cues: CueSpec[]): CueSpec[] =>
  cues.map((cue) => {
    const [from, to] = RANGES[film].find(([start, end]) => cue.at >= start * 1000 && cue.at < end * 1000) ?? RANGES[film].at(-1)!;
    return { ...cue, sheet: `${from}-${to}` };
  });

const frame = (film: FilmName): CueSpec[] => [
  { id: "line-start", at: 0, sound: "line", durMs: LINE_START_MS, marks: "the violet line draws under the title", sheet: "" },
  whoosh("islandOpen", ISLAND_OPEN_MS, 500, "still", "the island opens into the product window"),
  { id: "line-end-card", at: SHEETS[film].closeMs, sound: "line", durMs: 600, marks: "the violet line draws on the end card, on the closing hit", sheet: "" },
];

const narratorCues = (film: FilmName, voicesAt: readonly number[]): CueSpec[] => {
  const sheet = SHEETS[film];
  const windows = windowsOf(sheet, voicesAt);
  return sheet.narrator.map(({ text, anchor, beatMs, onsetMs }, i): CueSpec => {
    const last = i === sheet.narrator.length - 1;
    const { fromMs, untilMs } = windows[i]!;
    return {
      id: last ? "narrator-end" : `narrator-${i + 1}`, at: onsetMs, from: fromMs, until: untilMs, anchor: { word: anchor, beatMs }, sound: "voice", voice: "narrator", text,
      marks: last ? "the narrator closes over the end card, spoken only" : `the narrator, line ${i + 1}`, sheet: "",
    };
  });
};

const sageCues = (): CueSpec[] => {
  const { moments: m, words, fill } = SAGE_SCRIPT;
  return withSheets("sage", [
    ...frame("sage"),
    { id: "optionDown", at: m.optionDown, sound: "key", variant: "down", marks: "the right Option key goes down", sheet: "" },
    { id: "ask-1", at: m.wordsStart, sound: "voice", voice: "person", text: words.ask.text, marks: "the spoken ask, words appear live", sheet: "" },
    { id: "release", at: m.release, sound: "key", variant: "up", marks: "the key is released", sheet: "" },
    { id: "understood", at: m.understood, sound: "voice", voice: "sage", text: "Understood", marks: "Sage says Understood", sheet: "" },
    { id: "tick1", at: m.tick1, sound: "tick", variant: "high", marks: "Found Standup · 9:30 · Google Meet is ticked", sheet: "" },
    { id: "tick2", at: m.tick2, sound: "tick", variant: "high", marks: "Opened the call is ticked", sheet: "" },
    { id: "tick3", at: m.tick3, sound: "tick", variant: "high", marks: "Mic and camera off is ticked", sheet: "" },
    { id: "fillStart", at: m.fillStart, sound: "line", durMs: fill, cutMs: m.returnKey - m.fillStart, marks: "the violet line fills and Return cuts it", sheet: "" },
    { id: "returnKey", at: m.returnKey, sound: "click", variant: "soft", marks: "Return is pressed and the line is cut", sheet: "" },
    { id: "joined", at: m.joined, sound: "chime", marks: "it joins the call", sheet: "" },
    { id: "hold2", at: m.hold2, sound: "key", variant: "down", marks: "the right Option key goes down again", sheet: "" },
    { id: "ask-2", at: m.words2Start, sound: "voice", voice: "person", text: words.second.text, marks: "the second spoken ask", sheet: "" },
    { id: "release2", at: m.release2, sound: "key", variant: "up", marks: "the key is released", sheet: "" },
    { id: "payOutlined", at: m.payOutlined, sound: "thud", marks: "Pay is outlined, stopped at the line", sheet: "" },
    { id: "handback", at: HAND_BACK_VOICE_MS, sound: "voice", voice: "sage", text: "Stopped at Pay. It's yours to press.", marks: "Sage hands Pay back", sheet: "" },
    ...narratorCues("sage", [m.wordsStart, m.understood, m.words2Start, HAND_BACK_VOICE_MS]),
  ]);
};

const shellCues = (): CueSpec[] => {
  const { moments: m, presses } = SHELL_SCRIPT;
  const click = (id: string, at: number, marks: string): CueSpec => ({ id, at, sound: "click", variant: "soft", marks, sheet: "" });
  const output = Array.from({ length: 5 }, (_, i): CueSpec => ({
    id: i ? `outputFind-${i + 1}` : "outputFind", at: m.outputFind + i * 45, sound: "tick", variant: "high", gainDb: -2 * i, marks: `the find output, line ${i + 1}`, sheet: "",
  }));
  return withSheets("shell", [
    ...frame("shell"),
    typing("typeFind", presses.find, 21, "the first ask is typed"),
    click("enterFind", m.enterFind, "Enter, the spinner starts"),
    ...output,
    typing("typeDist", presses.dist, 22, "the second ask is typed"),
    click("enterDist", m.enterDist, "Enter on the second ask, the spinner starts"),
    { id: "stagedDist", at: m.stagedDist, sound: "tick", variant: "low", marks: "caution · deletes files lands with rm -r dist on the line", sheet: "" },
    { ...click("killDist", m.killDist, "ctrl U clears the staged rm -r dist from the line"), gainDb: -5 },
    typing("typePush", presses.push, 23, "the third ask is typed"),
    click("enterPush", m.enterPush, "Enter on the third ask, the spinner starts"),
    { id: "askedPush", at: m.askedPush, sound: "thud", marks: "danger · changes something remote or published, and the y/N prompt", sheet: "" },
    { id: "answerNo", at: m.answerNo, sound: "key", variant: "down", marks: "N answers the prompt and leaves an empty line", sheet: "" },
    typing("typePipe", presses.pipe, 24, "the pipe is typed"),
    click("enterPipe", m.enterPipe, "Enter on the pipe"),
    { id: "answerPipe", at: m.answerPipe, sound: "chime", marks: "one conventional commit subject comes back", sheet: "" },
    ...narratorCues("shell", []),
  ]);
};

const sidecarCues = (): CueSpec[] => {
  const { moments: m, presses } = SIDECAR_SCRIPT;
  const click = (id: string, at: number, variant: ClickVariant, marks: string): CueSpec => ({ id, at, sound: "click", variant, marks, sheet: "" });
  const tick = (id: string, at: number, variant: TickVariant, marks: string): CueSpec => ({ id, at, sound: "tick", variant, marks, sheet: "" });
  return withSheets("sidecar", [
    ...frame("sidecar"),
    tick("row1", m.row1, "high", "first edit lands in the Review list"),
    tick("row2", m.row2, "high", "second edit lands in the Review list"),
    tick("row3", m.row3, "high", "third edit lands in the Review list"),
    click("acceptHunk", m.acceptHunk, "approve", "a hunk is approved"),
    click("rejectHunk", m.rejectHunk, "reject", "a hunk is rejected and the toast confirms"),
    tick("tellLands", m.tellLands, "low", "the reject lands in the terminal as a message"),
    tick("reply", m.reply, "low", "Claude answers that it saw the reject"),
    click("select", m.select, "soft", "a paragraph is selected"),
    typing("typeNote", presses.note, 11, "the note is typed"),
    click("addToTray", m.addToTray, "soft", "Enter adds the note to the tray"),
    click("send", m.send, "soft", "the note is sent"),
    whoosh("noteArc", m.send, m.noteLands - m.send, "rtl", "the note arcs into the terminal"),
    { id: "noteLands", at: m.noteLands, sound: "chime", marks: "the note lands as Marco's own message", sheet: "" },
    click("undo", m.undo, "soft", "cmd Z takes back the last decision"),
    tick("undoStacks", m.undo + 100, "low", "the decision history changes"),
    click("undoAgain", m.undoAgain, "soft", "cmd Z takes back the one before"),
    tick("undoAgainStacks", m.undoAgain + 100, "low", "the decision history changes"),
    click("redo", m.redo, "soft", "cmd shift Z redoes it"),
    tick("redoStacks", m.redo + 100, "low", "the decision history changes"),
    click("redoAgain", m.redoAgain, "soft", "cmd shift Z redoes the next one"),
    tick("redoAgainStacks", m.redoAgain + 100, "low", "the decision history changes"),
    { id: "seam", at: SIDECAR_SEAM_MS, sound: "line", durMs: 600, marks: "the violet line between terminal and island draws", sheet: "" },
    ...narratorCues("sidecar", []),
  ]);
};

const music = { source: "synth", take: 1, gainDb: 0, fadeInMs: 60, fadeOutMs: 1000, startMs: 0 } as const;

export const FILMS: Record<FilmName, FilmSpec> = {
  sidecar: { name: "sidecar", durationMs: SHEETS.sidecar.durationMs, music, cues: sidecarCues() },
  sage: { name: "sage", durationMs: SHEETS.sage.durationMs, music, cues: sageCues() },
  shell: { name: "shell", durationMs: SHEETS.shell.durationMs, music, cues: shellCues() },
};
