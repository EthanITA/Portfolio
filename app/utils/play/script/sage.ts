import type { FeatureBeat, Key } from "./typed.ts";

export const ASK = "I want to join the standup";
export const SECOND_ASK = "pay the invoice";

const moments = {
  optionDown: 4500,
  wordsStart: 5500,
  release: 7500,
  understood: 9500,
  goal: 11_000,
  step1: 11_500,
  tick1: 14_000,
  step2: 14_500,
  tick2: 16_000,
  step3: 16_500,
  tick3: 18_000,
  cardIn: 20_000,
  fillStart: 20_500,
  returnKey: 24_000,
  joined: 24_000,
  fold: 26_000,
  hold2: 28_000,
  words2Start: 28_500,
  release2: 30_000,
  pageIn: 30_500,
  scrollToPay: 31_000,
  payOutlined: 32_000,
  handBack: 32_000,
} as const;

// Word starts and lengths of the trimmed takes, as aligned in films/audio/sage/sources/words.json, so the island types with the voice.
const takes = {
  ask: { starts: [0, 70, 280, 470, 840, 910], ms: 1534 },
  second: { starts: [0, 160, 410], ms: 986 },
};

const words = {
  ask: { text: ASK, at: takes.ask.starts.map((ms) => moments.wordsStart + ms) },
  second: { text: SECOND_ASK, at: takes.second.starts.map((ms) => moments.words2Start + ms) },
};

const voice = [
  { line: ASK, at: moments.wordsStart, until: moments.wordsStart + takes.ask.ms },
  { line: SECOND_ASK, at: moments.words2Start, until: moments.words2Start + takes.second.ms },
];

const keys: Key[] = [
  { key: "opt", at: moments.optionDown, until: moments.release },
  { key: "enter", at: moments.returnKey },
  { key: "opt", at: moments.hold2, until: moments.release2 },
];

// The hold trace, the working ring and the countdown fill run through their beats, so those moments are the only motion in frame.
const beats: FeatureBeat[] = [
  { id: "talk", from: moments.optionDown, moment: 7000 },
  { id: "steps", from: moments.goal, moment: moments.cardIn - 1000 },
  { id: "asks", from: moments.cardIn, moment: 23_000 },
  { id: "hands", from: moments.hold2, moment: moments.handBack + 1000 },
];

export const SAGE_SCRIPT = {
  duration: 40_000,
  // Half the countdown line, so the still shows the card waiting on Return.
  still: 23_000,
  // The live loop opens before Option goes down, so the folded island is seen waiting with its hint.
  loop: { from: 2000, to: 36_000 },
  fill: 5000,
  moments,
  words,
  voice,
  keys,
  beats,
} as const;
