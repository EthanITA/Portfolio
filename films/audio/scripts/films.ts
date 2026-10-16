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
  | (Base & { sound: "typing"; endMs: number; text: string; seed: number });

export type FilmSpec = {
  name: FilmName;
  durationMs: number;
  music: { take: number; gainDb: number; fadeInMs: number; fadeOutMs: number; startMs: number };
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

export const FILMS: Record<FilmName, FilmSpec> = {
  sidecar: {
    name: "sidecar",
    durationMs: 45000,
    music: { take: 1, gainDb: 0, fadeInMs: 1200, fadeOutMs: 3000, startMs: 0 },
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
      whoosh("artifacts-face", 18000, 600, "still", "the Artifacts face shows the page", "18-28"),
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
      whoosh("pull-back", 34000, 3500, "still", "slow pull-back over terminal and island", "34-41", 200, 1200),
      { id: "line-between", at: 36000, sound: "line", durMs: 600, marks: "the violet line between terminal and island draws", sheet: "34-41" },
      { id: "line-end-card", at: 41400, sound: "line", durMs: 600, marks: "the violet line draws on the end card", sheet: "41-45" },
    ],
  },
  sage: {
    name: "sage",
    durationMs: 40000,
    music: { take: 1, gainDb: 0, fadeInMs: 1200, fadeOutMs: 3000, startMs: 0 },
    cues: [
      whoosh("notch-settle", 1000, 900, "still", "the camera settles on the notch before the title", "0-3"),
      { id: "option-down", at: 3000, sound: "key", variant: "down", marks: "the right Option key goes down", sheet: "3-9" },
      whoosh("island-grows", 3030, 240, "still", "the island grows out of the notch in 240 ms", "3-9", 400, 2000),
      { id: "ask-1", at: 4000, sound: "voice", voice: "person", text: "I want to join the standup", marks: "the spoken ask, words appear live", sheet: "3-9" },
      { id: "option-up", at: 9000, sound: "key", variant: "up", marks: "the key is released", sheet: "9-12" },
      { id: "understood", at: 9600, sound: "voice", voice: "sage", text: "Understood", marks: "Sage says Understood", sheet: "9-12" },
      { id: "step-1", at: 13500, sound: "tick", variant: "high", marks: "Found Standup · 9:30 · Google Meet", sheet: "12-22" },
      { id: "step-2", at: 16500, sound: "tick", variant: "high", marks: "Opened the call", sheet: "12-22" },
      { id: "step-3", at: 19500, sound: "tick", variant: "high", marks: "Mic and camera off", sheet: "12-22" },
      whoosh("card-in", 22000, 500, "still", "the confirm card Join the call? appears", "22-30"),
      { id: "line-fill", at: 22400, sound: "line", durMs: 5000, marks: "the violet line fills over 5 s", sheet: "22-30" },
      { id: "return", at: 27600, sound: "click", variant: "soft", marks: "Return is pressed", sheet: "22-30" },
      { id: "joined", at: 28000, sound: "chime", marks: "it joins the call", sheet: "22-30" },
      { id: "ask-2", at: 30400, sound: "voice", voice: "person", text: "pay the invoice", marks: "the second spoken ask", sheet: "30-36" },
      whoosh("scroll-to-pay", 31800, 1200, "still", "the page scrolls to Pay", "30-36"),
      { id: "pay-outline", at: 33200, sound: "line", durMs: 600, marks: "Pay is outlined in violet", sheet: "30-36" },
      { id: "stopped", at: 33700, sound: "thud", marks: "stopped at the line", sheet: "30-36" },
      { id: "handback", at: 34000, sound: "voice", voice: "sage", text: "Stopped at Pay. It's yours to press.", marks: "Sage hands Pay back", sheet: "30-36" },
      { id: "line-end-card", at: 36600, sound: "line", durMs: 600, marks: "the violet line draws on the end card", sheet: "36-40" },
    ],
  },
  shell: {
    name: "shell",
    durationMs: 35000,
    music: { take: 1, gainDb: 0, fadeInMs: 1200, fadeOutMs: 3000, startMs: 0 },
    cues: [
      { id: "ask-1-typing", at: 3400, sound: "typing", endMs: 7600, text: "? find the five biggest files in here, skip node_modules and .git", seed: 21, marks: "the first ask is typed", sheet: "3-10" },
      { id: "enter-1", at: 8000, sound: "click", variant: "soft", marks: "Enter, the command runs straight away", sheet: "3-10" },
      { id: "out-1", at: 8400, sound: "tick", variant: "high", marks: "output line 1", sheet: "3-10" },
      { id: "out-2", at: 8600, sound: "tick", variant: "high", marks: "output line 2", sheet: "3-10" },
      { id: "out-3", at: 8800, sound: "tick", variant: "high", marks: "output line 3", sheet: "3-10" },
      { id: "out-4", at: 9000, sound: "tick", variant: "high", marks: "output line 4", sheet: "3-10" },
      { id: "out-5", at: 9200, sound: "tick", variant: "high", marks: "output line 5", sheet: "3-10" },
      { id: "label-looks", at: 9500, sound: "tick", variant: "low", marks: "label Looks: runs", sheet: "3-10" },
      { id: "ask-2-typing", at: 10600, sound: "typing", endMs: 12400, text: "? delete the dist folder", seed: 22, marks: "the second ask is typed", sheet: "10-18" },
      { id: "enter-2", at: 12800, sound: "click", variant: "soft", marks: "Enter on the second ask", sheet: "10-18" },
      { id: "caution-note-1", at: 13200, sound: "tick", variant: "low", marks: "caution · deletes files lands on the line", sheet: "10-18" },
      { id: "caution-note-2", at: 13340, sound: "tick", variant: "low", marks: "rm -r dist waits on the line", sheet: "10-18" },
      { id: "label-changes", at: 15000, sound: "tick", variant: "low", marks: "label Changes: waits for Enter", sheet: "10-18" },
      { id: "ask-3-typing", at: 18400, sound: "typing", endMs: 20300, text: "? force push my branch over main on origin", seed: 23, marks: "the third ask is typed", sheet: "18-27" },
      { id: "enter-3", at: 20450, sound: "click", variant: "soft", marks: "Enter on the third ask", sheet: "18-27" },
      { id: "danger", at: 20600, sound: "thud", marks: "danger · changes something remote or published", sheet: "18-27" },
      { id: "confirm-prompt", at: 22400, sound: "tick", variant: "low", marks: "put it on your line? [y/N]", sheet: "18-27" },
      { id: "label-danger", at: 24000, sound: "tick", variant: "low", marks: "label Can't be undone: asks first", sheet: "18-27" },
      { id: "ask-4-typing", at: 27400, sound: "typing", endMs: 29400, text: "git show HEAD | ai -p 'Write one concise conventional commit subject for this change.'", seed: 24, marks: "the pipe is typed", sheet: "27-32" },
      { id: "enter-4", at: 29800, sound: "click", variant: "soft", marks: "Enter on the pipe", sheet: "27-32" },
      { id: "subject-returns", at: 31000, sound: "chime", marks: "one conventional commit subject comes back", sheet: "27-32" },
      { id: "line-end-card", at: 32600, sound: "line", durMs: 600, marks: "the violet line draws on the end card", sheet: "32-35" },
    ],
  },
};
