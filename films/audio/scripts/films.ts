import { SAGE_SCRIPT } from "../../../app/utils/play/script/sage";
import { SHELL_SCRIPT } from "../../../app/utils/play/script/shell";
import sageFilm from "../../../films/scripts/sage";
import type { FilmScript } from "../../../films/scripts/script";
import shellFilm from "../../../films/scripts/shell";
import type { ClickVariant, KeyVariant, TickVariant, WhooshDirection } from "./lib/synth";

export type FilmName = "sidecar" | "sage" | "shell";
export type VoiceName = "person" | "sage";

type Base = { id: string; at: number; marks: string; sheet: string; gainDb?: number };

export type CueSpec =
  | (Base & { sound: "key"; variant: KeyVariant })
  | (Base & { sound: "tick"; variant: TickVariant })
  | (Base & { sound: "click"; variant: ClickVariant })
  | (Base & { sound: "chime" })
  | (Base & { sound: "thud" })
  | (Base & { sound: "line"; durMs: number; cutMs?: number })
  | (Base & { sound: "whoosh"; durMs: number; fromHz: number; toHz: number; direction: WhooshDirection })
  | (Base & { sound: "voice"; voice: VoiceName; text: string })
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
};

export const MUSIC_SKELETON =
  "Instrumental ambient underscore for a short product film. Warm, quiet and spacious. Soft analog-style synth pads in D major, a slow sub-bass pulse at 60 beats per minute like a calm heartbeat, and very sparse glass-bell tones that appear once every few bars. No drums, no percussion hits, no vocals, no lyrics, no risers, no impacts, no crescendo, no drop, nothing cinematic or trailer-like. Constant gentle dynamics that stay low in the mix so a voice and small interface sounds can sit on top. It fades in softly, holds steady, and resolves to a single sustained D major chord that rings out and fades to silence.";

export const MUSIC_VARIANT: Record<FilmName, string> = {
  sidecar: "Slightly brighter and more open than a plain pad, with a hint of gentle forward motion.",
  sage: "Sparser in the midrange, with more air and space, leaving a clear lane for a spoken voice.",
  shell: "The driest and most minimal of the family, the pulse a little more present, like a quiet machine at rest.",
};

const whoosh = (id: string, at: number, durMs: number, direction: WhooshDirection, marks: string, sheet: string, fromHz = 350, toHz = 2400): CueSpec => ({
  id, at, sound: "whoosh", durMs, fromHz, toHz, direction, marks, sheet,
});

const quiet = (cue: CueSpec, gainDb = -6): CueSpec => ({ ...cue, gainDb });

const typing = (id: string, script: { text: string; at: number[] }, seed: number, marks: string): CueSpec => ({
  id, at: script.at[0] ?? 0, sound: "typing", endMs: script.at.at(-1) ?? 0, presses: script.at, text: script.text, seed, marks, sheet: "",
});

const MAX_WHOOSH_MS = 1200;

const RANGES = {
  sage: [[0, 3], [3, 9], [9, 12], [12, 22], [22, 30], [30, 36], [36, 40]],
  shell: [[0, 3], [3, 10], [10, 18], [18, 27], [27, 32], [32, 35]],
} as const;

const withSheets = (film: keyof typeof RANGES, cues: CueSpec[]): CueSpec[] =>
  cues.map((cue) => {
    const [from, to] = RANGES[film].find(([start, end]) => cue.at >= start * 1000 && cue.at < end * 1000) ?? RANGES[film].at(-1)!;
    return { ...cue, sheet: `${from}-${to}` };
  });

const camera = (film: FilmScript): CueSpec[] => {
  const seen = new Map<string, number>();
  const last = film.rig.shots.length - 1;
  return film.rig.shots.flatMap((shot, index): CueSpec[] => {
    const durMs = Math.min(shot.duration, MAX_WHOOSH_MS);
    if (shot.anchor) {
      const name = `push-${shot.anchor}`;
      const count = (seen.get(name) ?? 0) + 1;
      seen.set(name, count);
      return [quiet(whoosh(count > 1 ? `${name}-${count}` : name, shot.at, durMs, "still", `the camera pushes in on the ${shot.anchor}`, "", 300, 1800))];
    }
    return index === last && shot.scale < 1 ? [quiet(whoosh("pull-back", shot.at, durMs, "still", "the camera pulls back to the end card", "", 1600, 300))] : [];
  });
};

const endCard = (film: FilmScript): CueSpec => ({
  id: "line-end-card", at: film.island.at(-1)?.draw ?? film.end.at, sound: "line", durMs: 600, marks: "the violet line draws on the end card", sheet: "",
});

const sageCues = (): CueSpec[] => {
  const { moments: m, words, fill } = SAGE_SCRIPT;
  return withSheets("sage", [
    { id: "optionDown", at: m.optionDown, sound: "key", variant: "down", marks: "the right Option key goes down", sheet: "" },
    { id: "ask-1", at: m.wordsStart, sound: "voice", voice: "person", text: words.ask.text, marks: "the spoken ask, words appear live", sheet: "" },
    { id: "release", at: m.release, sound: "key", variant: "up", marks: "the key is released", sheet: "" },
    { id: "understood", at: m.understood, sound: "voice", voice: "sage", text: "Understood", marks: "Sage says Understood", sheet: "" },
    { id: "tick1", at: m.tick1, sound: "tick", variant: "high", marks: "Found Standup · 9:30 · Google Meet is ticked", sheet: "" },
    { id: "tick2", at: m.tick2, sound: "tick", variant: "high", marks: "Opened the call is ticked", sheet: "" },
    { id: "tick3", at: m.tick3, sound: "tick", variant: "high", marks: "Mic and camera off is ticked", sheet: "" },
    { id: "fillStart", at: m.fillStart, sound: "line", durMs: fill, cutMs: m.returnKey - m.fillStart, marks: "the violet line fills and Return cuts it", sheet: "" },
    { id: "returnKey", at: m.returnKey, sound: "click", variant: "soft", marks: "Return is pressed and the line is cut", sheet: "" },
    { id: "joined", at: m.joined + 60, sound: "chime", marks: "it joins the call", sheet: "" },
    { id: "hold2", at: m.hold2, sound: "key", variant: "down", marks: "the right Option key goes down again", sheet: "" },
    { id: "ask-2", at: m.words2Start, sound: "voice", voice: "person", text: words.second.text, marks: "the second spoken ask", sheet: "" },
    { id: "release2", at: m.release2, sound: "key", variant: "up", marks: "the key is released", sheet: "" },
    quiet(whoosh("scrollToPay", m.scrollToPay, 500, "still", "the page scrolls to Pay", "", 350, 1600), -3),
    { id: "payOutlined", at: m.payOutlined, sound: "thud", marks: "Pay is outlined, stopped at the line", sheet: "" },
    { id: "handback", at: m.handBack + 300, sound: "voice", voice: "sage", text: "Stopped at Pay. It's yours to press.", marks: "Sage hands Pay back", sheet: "" },
    ...camera(sageFilm),
    endCard(sageFilm),
  ]);
};

const shellCues = (): CueSpec[] => {
  const { moments: m, presses } = SHELL_SCRIPT;
  const click = (id: string, at: number, marks: string): CueSpec => ({ id, at, sound: "click", variant: "soft", marks, sheet: "" });
  const output = Array.from({ length: 5 }, (_, i): CueSpec => ({
    id: i ? `outputFind-${i + 1}` : "outputFind", at: m.outputFind + i * 45, sound: "tick", variant: "high", gainDb: -2 * i, marks: `the find output, line ${i + 1}`, sheet: "",
  }));
  return withSheets("shell", [
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
    ...camera(shellFilm),
    endCard(shellFilm),
  ]);
};

export const FILMS: Record<FilmName, FilmSpec> = {
  sidecar: {
    name: "sidecar",
    durationMs: 45000,
    music: { source: "synth", take: 1, gainDb: 0, fadeInMs: 1200, fadeOutMs: 3000, startMs: 0 },
    cues: [
      whoosh("island-open", 1200, 700, "still", "the island opens into the title", "0-3"),
      whoosh("sidecar-in", 4000, 600, "rtl", "Sidecar slides in on the right", "3-10"),
      { id: "edit-1", at: 5000, sound: "tick", variant: "high", marks: "first edit lands in the Review list", sheet: "3-10" },
      { id: "edit-2", at: 6400, sound: "tick", variant: "high", marks: "second edit lands in the Review list", sheet: "3-10" },
      { id: "edit-3", at: 7800, sound: "tick", variant: "high", marks: "third edit lands in the Review list", sheet: "3-10" },
      { id: "approve", at: 11000, sound: "click", variant: "approve", marks: "a hunk is approved", sheet: "10-18" },
      { id: "reject-1", at: 12400, sound: "click", variant: "reject", marks: "first line rejected", sheet: "10-18" },
      { id: "reject-2", at: 12900, sound: "click", variant: "reject", marks: "second line rejected", sheet: "10-18" },
      { id: "toast", at: 13400, sound: "tick", variant: "high", marks: "the toast confirms", sheet: "10-18" },
      whoosh("reject-travels", 14200, 500, "rtl", "the reject travels to the terminal", "10-18"),
      { id: "claude-answers", at: 16000, sound: "tick", variant: "low", marks: "Claude answers that it saw the reject", sheet: "10-18" },
      whoosh("artifacts-face", 18000, 1500, "still", "the camera pushes in on the Artifacts face", "18-28"),
      { id: "select", at: 20000, sound: "click", variant: "soft", marks: "a paragraph is selected", sheet: "18-28" },
      { id: "note-typing", at: 21000, sound: "typing", endMs: 22800, text: "make this a chart", seed: 11, marks: "the note is typed", sheet: "18-28" },
      { id: "note-send", at: 23400, sound: "click", variant: "soft", marks: "the note is sent", sheet: "18-28" },
      whoosh("note-arcs", 23600, 1200, "rtl", "the note arcs into the terminal", "18-28"),
      { id: "note-lands", at: 25000, sound: "chime", marks: "the note lands as Marco's own message", sheet: "18-28" },
      { id: "undo", at: 28800, sound: "click", variant: "soft", marks: "cmd Z takes the last decision back", sheet: "28-34" },
      { id: "redo", at: 30400, sound: "click", variant: "soft", marks: "cmd shift Z redoes it", sheet: "28-34" },
      { id: "history-1", at: 31200, sound: "tick", variant: "low", marks: "decision history stacks", sheet: "28-34" },
      { id: "history-2", at: 31600, sound: "tick", variant: "low", marks: "decision history stacks", sheet: "28-34" },
      { id: "history-3", at: 32000, sound: "tick", variant: "low", marks: "decision history stacks", sheet: "28-34" },
      { id: "history-4", at: 32400, sound: "tick", variant: "low", marks: "decision history stacks", sheet: "28-34" },
      whoosh("pull-back", 34000, 3000, "still", "slow pull-back over terminal and island", "34-41", 200, 1200),
      { id: "line-between", at: 36000, sound: "line", durMs: 600, marks: "the violet line between terminal and island draws", sheet: "34-41" },
      { id: "line-end-card", at: 41400, sound: "line", durMs: 600, marks: "the violet line draws on the end card", sheet: "41-45" },
    ],
  },
  sage: {
    name: "sage",
    durationMs: 40000,
    music: { source: "synth", take: 1, gainDb: 0, fadeInMs: 1200, fadeOutMs: 3000, startMs: 0 },
    cues: sageCues(),
  },
  shell: {
    name: "shell",
    durationMs: 35000,
    music: { source: "synth", take: 1, gainDb: 0, fadeInMs: 1200, fadeOutMs: 3000, startMs: 0 },
    cues: shellCues(),
  },
};
