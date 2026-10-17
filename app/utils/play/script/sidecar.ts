import { typed, type FeatureBeat, type Key } from "./typed.ts";

export const NOTE = "make this a chart";

const moments = {
  edit1: 4500,
  sideIn: 5000,
  row1: 5500,
  edit2: 6500,
  row2: 7500,
  edit3: 8500,
  row3: 9500,
  acceptHunk: 11_000,
  rejectHunk: 12_500,
  tellStart: 13_000,
  tellLands: 14_000,
  reply: 15_000,
  artifacts: 18_000,
  select: 19_500,
  popover: 20_000,
  typeNote: 20_500,
  addToTray: 22_000,
  send: 23_000,
  noteLands: 24_000,
  review: 28_000,
  undo: 30_000,
  undoAgain: 30_500,
  redo: 31_500,
  redoAgain: 32_000,
  hold: 35_000,
} as const;

const presses = {
  note: typed({ at: moments.typeNote, text: NOTE, every: 58 }),
};

const keys: Key[] = [
  { key: "enter", at: moments.addToTray },
  { key: "cmd Z", at: moments.undo },
  { key: "cmd Z", at: moments.undoAgain },
  { key: "cmd shift Z", at: moments.redo },
  { key: "cmd shift Z", at: moments.redoAgain },
];

const beats: FeatureBeat[] = [
  { id: "review", from: moments.edit3, moment: moments.acceptHunk + 500 },
  { id: "comments", from: moments.artifacts, moment: moments.addToTray - 500 },
  { id: "follows", from: moments.rejectHunk, moment: moments.reply + 1000 },
];

export const SIDECAR_SCRIPT = {
  duration: 45_000,
  still: 17_500,
  // The live loop opens with the window in and the first file's hunks pending, so the first thing seen is a decision to make.
  loop: { from: 5500, to: 41_000 },
  toast: 2200,
  moments,
  presses,
  keys,
  beats,
  beatFrame: { width: 1600, height: 1000 },
} as const;
