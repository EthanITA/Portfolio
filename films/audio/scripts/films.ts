import { SAGE_SCRIPT } from "../../../app/utils/play/script/sage";
import { SHELL_SCRIPT } from "../../../app/utils/play/script/shell";
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
  | (Base & { sound: "marker" })
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

const typing = (id: string, script: { text: string; at: number[] }, seed: number, marks: string, sheet: string): CueSpec => ({
  id, at: script.at[0] ?? 0, sound: "typing", endMs: script.at.at(-1) ?? 0, presses: script.at, text: script.text, seed, marks, sheet,
});

const marker = (id: string, at: number, marks: string, sheet: string): CueSpec => ({ id, at, sound: "marker", marks, sheet });

const sageCues = (): CueSpec[] => {
  const { moments: m, words } = SAGE_SCRIPT;
  return [
    { id: "option-down", at: m.optionDown, sound: "key", variant: "down", marks: "the right Option key goes down", sheet: "3-9" },
    quiet(whoosh("push-notch", m.optionDown, 1200, "still", "the camera pushes in as the island grows out of the notch", "3-9", 300, 1800)),
    { id: "ask-1", at: m.wordsStart, sound: "voice", voice: "person", text: words.ask.text, marks: "the spoken ask, words appear live", sheet: "3-9" },
    { id: "option-up", at: m.release, sound: "key", variant: "up", marks: "the key is released", sheet: "9-12" },
    { id: "understood", at: m.understood, sound: "voice", voice: "sage", text: "Understood", marks: "Sage says Understood", sheet: "9-12" },
    { id: "step-1", at: m.tick1, sound: "tick", variant: "high", marks: "Found Standup · 9:30 · Google Meet is ticked", sheet: "12-22" },
    { id: "step-2", at: m.tick2, sound: "tick", variant: "high", marks: "Opened the call is ticked", sheet: "12-22" },
    { id: "step-3", at: m.tick3, sound: "tick", variant: "high", marks: "Mic and camera off is ticked", sheet: "12-22" },
    quiet(whoosh("card-in", m.cardIn, 1200, "still", "the camera pushes in on the confirm card Join the call?", "22-30", 300, 1800)),
    { id: "line-fill", at: m.fillStart, sound: "line", durMs: SAGE_SCRIPT.fill, cutMs: m.returnKey - m.fillStart, marks: "the violet line fills and Return cuts it", sheet: "22-30" },
    { id: "return", at: m.returnKey, sound: "click", variant: "soft", marks: "Return is pressed and the line is cut", sheet: "22-30" },
    { id: "joined", at: m.joined + 60, sound: "chime", marks: "it joins the call", sheet: "22-30" },
    { id: "option-down-2", at: m.hold2, sound: "key", variant: "down", marks: "the right Option key goes down again", sheet: "30-36" },
    quiet(whoosh("push-pay", m.hold2, 1200, "still", "the camera pushes in on the second ask", "30-36", 300, 1800)),
    { id: "ask-2", at: m.words2Start, sound: "voice", voice: "person", text: words.second.text, marks: "the second spoken ask", sheet: "30-36" },
    { id: "option-up-2", at: m.release2, sound: "key", variant: "up", marks: "the key is released", sheet: "30-36" },
    quiet(whoosh("scroll-to-pay", m.scrollToPay, 500, "still", "the page scrolls to Pay", "30-36", 350, 1600), -3),
    { id: "stopped", at: m.payOutlined, sound: "thud", marks: "Pay is outlined, stopped at the line", sheet: "30-36" },
    { id: "handback", at: m.handBack + 300, sound: "voice", voice: "sage", text: "Stopped at Pay. It's yours to press.", marks: "Sage hands Pay back", sheet: "30-36" },
    quiet(whoosh("pull-back", 36_000, 600, "still", "the camera pulls back to the end card", "36-40", 1600, 300)),
    { id: "line-end-card", at: 36_400, sound: "line", durMs: 600, marks: "the violet line draws on the end card", sheet: "36-40" },
  ];
};

const shellCues = (): CueSpec[] => {
  const { moments: m, presses } = SHELL_SCRIPT;
  const click = (id: string, at: number, marks: string, sheet: string): CueSpec => ({ id, at, sound: "click", variant: "soft", marks, sheet });
  const output = Array.from({ length: 5 }, (_, i): CueSpec => ({
    id: `out-${i + 1}`, at: m.outputFind + i * 45, sound: "tick", variant: "high", gainDb: -2 * i, marks: `output line ${i + 1}`, sheet: "3-10",
  }));
  return [
    quiet(whoosh("push-ask-1", m.typeFind, 1200, "still", "the camera pushes in on the prompt line", "3-10", 300, 1800)),
    typing("ask-1-typing", presses.find, 21, "the first ask is typed", "3-10"),
    click("enter-1", m.enterFind, "Enter, the spinner starts", "3-10"),
    ...output,
    marker("label-looks", m.outputFind, "label Looks: runs", "3-10"),
    quiet(whoosh("push-ask-2", m.typeDist + 400, 1200, "still", "the camera pushes in on the prompt line", "10-18", 300, 1800)),
    typing("ask-2-typing", presses.dist, 22, "the second ask is typed", "10-18"),
    click("enter-2", m.enterDist, "Enter on the second ask, the spinner starts", "10-18"),
    { id: "caution-note", at: m.stagedDist, sound: "tick", variant: "low", marks: "caution · deletes files lands with rm -r dist on the line", sheet: "10-18" },
    marker("label-changes", m.stagedDist, "label Changes: waits for Enter", "10-18"),
    { ...click("line-cleared", m.killDist, "ctrl U clears the staged rm -r dist from the line", "18-27"), gainDb: -5 },
    typing("ask-3-typing", presses.push, 23, "the third ask is typed", "18-27"),
    quiet(whoosh("push-ask-3", m.typePush + 400, 1200, "still", "the camera pushes in on the prompt line", "18-27", 300, 1800)),
    click("enter-3", m.enterPush, "Enter on the third ask, the spinner starts", "18-27"),
    { id: "danger", at: m.askedPush, sound: "thud", marks: "danger · changes something remote or published, and the y/N prompt", sheet: "18-27" },
    marker("label-danger", m.askedPush, "label Can't be undone: asks first", "18-27"),
    { id: "answer-no", at: m.answerNo, sound: "key", variant: "down", marks: "N answers the prompt and leaves an empty line", sheet: "18-27" },
    marker("screen-clears", m.clear, "the screen clears for the pipe", "27-32"),
    typing("ask-4-typing", presses.pipe, 24, "the pipe is typed", "27-32"),
    quiet(whoosh("push-ask-4", m.typePipe + 500, 1200, "still", "the camera pushes in on the prompt line", "27-32", 300, 1800)),
    click("enter-4", m.enterPipe, "Enter on the pipe", "27-32"),
    { id: "subject-returns", at: m.answerPipe, sound: "chime", marks: "one conventional commit subject comes back", sheet: "27-32" },
    marker("label-pipe", m.answerPipe, "label One answer from a pipe", "27-32"),
    quiet(whoosh("pull-back", m.answerPipe + 900, 900, "still", "the camera pulls back to the end card", "32-35", 1600, 300)),
    { id: "line-end-card", at: m.answerPipe + 1500, sound: "line", durMs: 600, marks: "the violet line draws on the end card", sheet: "32-35" },
  ];
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

// Film fails its build on a missing id, so a silent marker stands in wherever the sound is gone.
export const READ_BY_FILM: Record<FilmName, string[]> = {
  sidecar: ["island-open", "undo", "redo", "artifacts-face", "pull-back", "line-end-card"],
  sage: ["option-down", "option-up", "option-down-2", "option-up-2", "return", "push-notch", "card-in", "push-pay", "pull-back", "line-end-card"],
  shell: [
    "push-ask-1", "push-ask-2", "push-ask-3", "push-ask-4", "enter-1", "enter-2", "enter-3", "enter-4",
    "label-looks", "label-changes", "label-danger", "label-pipe", "line-cleared", "screen-clears", "ask-2-typing-00", "pull-back", "line-end-card",
  ],
};
