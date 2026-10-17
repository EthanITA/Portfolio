import { typed, type Key } from "./typed.ts";

export const NOTE = "make this a chart";

const moments = {
  edit1: 3400,
  sideIn: 3600,
  row1: 3900,
  edit2: 5400,
  row2: 5900,
  edit3: 7400,
  row3: 7900,
  acceptHunk: 10_600,
  rejectHunk: 12_800,
  tellStart: 13_400,
  tellLands: 14_200,
  reply: 15_200,
  artifacts: 18_000,
  select: 19_500,
  popover: 20_300,
  typeNote: 20_600,
  addToTray: 22_000,
  send: 22_800,
  noteLands: 24_000,
  review: 28_000,
  undo: 29_000,
  redo: 31_500,
  hold: 34_000,
} as const;

const presses = {
  note: typed({ at: moments.typeNote, text: NOTE, every: 58 }),
};

const keys: Key[] = [
  { key: "enter", at: moments.addToTray },
  { key: "cmd Z", at: moments.undo },
  { key: "cmd shift Z", at: moments.redo },
];

export const SIDECAR_SCRIPT = {
  duration: 45_000,
  still: 17_500,
  // The live loop opens with the window in and the first file's hunks pending, so the first thing seen is a decision to make.
  loop: { from: 3900, to: 36_000 },
  toast: 2200,
  moments,
  presses,
  keys,
} as const;
