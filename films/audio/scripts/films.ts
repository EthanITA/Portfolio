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
  | (Base & { sound: "line"; durMs: number })
  | (Base & { sound: "whoosh"; durMs: number; fromHz: number; toHz: number; direction: WhooshDirection })
  | (Base & { sound: "voice"; voice: VoiceName; text: string })
  | (Base & { sound: "typing"; endMs: number; text: string; seed: number; everyMs?: number });

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

const typed = (id: string, at: number, everyMs: number, text: string, seed: number, marks: string, sheet: string): CueSpec => ({
  id, at, sound: "typing", endMs: at + (text.length - 1) * everyMs, everyMs, text, seed, marks, sheet,
});

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
    cues: [
      { id: "option-down", at: 3000, sound: "key", variant: "down", marks: "the right Option key goes down", sheet: "3-9" },
      quiet(whoosh("push-notch", 3000, 1200, "still", "the camera pushes in as the island grows out of the notch in 240 ms", "3-9", 300, 1800)),
      { id: "ask-1", at: 4100, sound: "voice", voice: "person", text: "I want to join the standup", marks: "the spoken ask, words appear live", sheet: "3-9" },
      { id: "option-up", at: 9000, sound: "key", variant: "up", marks: "the key is released", sheet: "9-12" },
      { id: "understood", at: 9600, sound: "voice", voice: "sage", text: "Understood", marks: "Sage says Understood", sheet: "9-12" },
      quiet(whoosh("island-works", 12000, 240, "still", "the island titles the goal and opens for the steps", "12-22", 400, 2000), -4),
      { id: "step-1-in", at: 12600, sound: "tick", variant: "low", gainDb: -6, marks: "Found Standup · 9:30 · Google Meet appears", sheet: "12-22" },
      { id: "step-1", at: 14500, sound: "tick", variant: "high", marks: "Found Standup · 9:30 · Google Meet is ticked", sheet: "12-22" },
      { id: "step-2-in", at: 15000, sound: "tick", variant: "low", gainDb: -6, marks: "Opened the call appears", sheet: "12-22" },
      { id: "step-2", at: 17000, sound: "tick", variant: "high", marks: "Opened the call is ticked", sheet: "12-22" },
      { id: "step-3-in", at: 17500, sound: "tick", variant: "low", gainDb: -6, marks: "Mic and camera off appears", sheet: "12-22" },
      { id: "step-3", at: 19500, sound: "tick", variant: "high", marks: "Mic and camera off is ticked", sheet: "12-22" },
      quiet(whoosh("card-in", 22000, 1200, "still", "the camera pushes in on the confirm card Join the call?", "22-30", 300, 1800)),
      { id: "line-fill", at: 22300, sound: "line", durMs: 4200, marks: "the violet line fills", sheet: "22-30" },
      { id: "return", at: 26500, sound: "click", variant: "soft", marks: "Return is pressed and the line completes", sheet: "22-30" },
      { id: "joined", at: 26650, sound: "chime", marks: "it joins the call", sheet: "22-30" },
      quiet(whoosh("island-folds", 28400, 200, "still", "the island folds back into the notch", "22-30", 2000, 400), -4),
      { id: "option-down-2", at: 30000, sound: "key", variant: "down", marks: "the right Option key goes down again", sheet: "30-36" },
      quiet(whoosh("push-pay", 30000, 1400, "still", "the camera pushes in on the second ask", "30-36", 300, 1800)),
      { id: "ask-2", at: 30400, sound: "voice", voice: "person", text: "pay the invoice", marks: "the second spoken ask", sheet: "30-36" },
      { id: "option-up-2", at: 31600, sound: "key", variant: "up", marks: "the key is released", sheet: "30-36" },
      quiet(whoosh("scroll-to-pay", 32700, 500, "still", "the page scrolls to Pay", "30-36", 350, 1600), -3),
      { id: "pay-outline", at: 32700, sound: "line", durMs: 500, marks: "the violet line rises into Pay's outline", sheet: "30-36" },
      { id: "stopped", at: 33200, sound: "thud", marks: "Pay is outlined, stopped at the line", sheet: "30-36" },
      { id: "handback", at: 33300, sound: "voice", voice: "sage", text: "Stopped at Pay. It's yours to press.", marks: "Sage hands Pay back", sheet: "30-36" },
      quiet(whoosh("pull-back", 36000, 600, "still", "the camera pulls back to the end card", "36-40", 1600, 300)),
      { id: "line-end-card", at: 36400, sound: "line", durMs: 600, marks: "the violet line draws on the end card", sheet: "36-40" },
    ],
  },
  shell: {
    name: "shell",
    durationMs: 35000,
    music: { source: "synth", take: 1, gainDb: 0, fadeInMs: 1200, fadeOutMs: 3000, startMs: 0 },
    cues: [
      quiet(whoosh("push-ask-1", 3200, 1400, "still", "the camera pushes in on the prompt line", "3-10", 300, 1800)),
      typed("ask-1-typing", 3200, 38, "? find the five biggest files in here, skip node_modules and .git", 21, "the first ask is typed", "3-10"),
      { id: "enter-1", at: 5900, sound: "click", variant: "soft", marks: "Enter, the spinner starts", sheet: "3-10" },
      { id: "out-1", at: 7700, sound: "tick", variant: "high", marks: "the find command and its five output lines land", sheet: "3-10" },
      { id: "label-looks", at: 7850, sound: "tick", variant: "low", marks: "label Looks: runs", sheet: "3-10" },
      quiet(whoosh("push-ask-2", 10700, 1200, "still", "the camera pushes in on the prompt line", "10-18", 300, 1800)),
      typed("ask-2-typing", 10300, 40, "? delete the dist folder", 22, "the second ask is typed", "10-18"),
      { id: "enter-2", at: 11500, sound: "click", variant: "soft", marks: "Enter on the second ask, the spinner starts", sheet: "10-18" },
      { id: "caution-note", at: 13300, sound: "tick", variant: "low", marks: "caution · deletes files lands with rm -r dist on the line", sheet: "10-18" },
      { id: "label-changes", at: 13450, sound: "tick", variant: "low", marks: "label Changes: waits for Enter", sheet: "10-18" },
      { id: "line-cleared", at: 18000, sound: "click", variant: "soft", gainDb: -5, marks: "the staged rm -r dist is cleared from the line", sheet: "18-27" },
      typed("ask-3-typing", 18300, 38, "? force push my branch over main on origin", 23, "the third ask is typed", "18-27"),
      quiet(whoosh("push-ask-3", 18700, 1200, "still", "the camera pushes in on the prompt line", "18-27", 300, 1800)),
      { id: "enter-3", at: 20200, sound: "click", variant: "soft", marks: "Enter on the third ask, the spinner starts", sheet: "18-27" },
      { id: "danger", at: 22000, sound: "thud", marks: "danger · changes something remote or published, and the y/N prompt", sheet: "18-27" },
      { id: "label-danger", at: 22150, sound: "tick", variant: "low", marks: "label Can't be undone: asks first", sheet: "18-27" },
      quiet(whoosh("screen-clears", 27000, 300, "still", "the screen clears for the pipe", "27-32", 1600, 300), -4),
      typed("ask-4-typing", 27200, 26, "git show HEAD | ai -p 'Write one concise conventional commit subject for this change.'", 24, "the pipe is typed", "27-32"),
      quiet(whoosh("push-ask-4", 27700, 1200, "still", "the camera pushes in on the prompt line", "27-32", 300, 1800)),
      { id: "enter-4", at: 29700, sound: "click", variant: "soft", marks: "Enter on the pipe", sheet: "27-32" },
      { id: "subject-returns", at: 30900, sound: "chime", marks: "one conventional commit subject comes back", sheet: "27-32" },
      { id: "label-pipe", at: 31050, sound: "tick", variant: "low", gainDb: -3, marks: "label One answer from a pipe", sheet: "27-32" },
      quiet(whoosh("pull-back", 31800, 900, "still", "the camera pulls back to the end card", "32-35", 1600, 300)),
      { id: "line-end-card", at: 32400, sound: "line", durMs: 600, marks: "the violet line draws on the end card", sheet: "32-35" },
    ],
  },
};
