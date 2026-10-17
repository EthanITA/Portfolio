import type { Key } from "./typed";

export const ASK = "I want to join the standup";
export const SECOND_ASK = "pay the invoice";

const word = (at: number, text: string, every: number): number[] => text.split(" ").map((_, index) => at + index * every);

const moments = {
  optionDown: 3000,
  wordsStart: 5800,
  release: 8600,
  understood: 9600,
  goal: 12_000,
  step1: 12_600,
  tick1: 14_500,
  step2: 15_000,
  tick2: 17_000,
  step3: 17_500,
  tick3: 19_500,
  cardIn: 22_000,
  fillStart: 22_300,
  returnKey: 26_500,
  joined: 26_500,
  fold: 28_400,
  hold2: 30_000,
  words2Start: 30_400,
  release2: 31_600,
  pageIn: 32_400,
  scrollToPay: 32_700,
  payOutlined: 33_200,
  handBack: 33_200,
} as const;

const words = {
  ask: { text: ASK, at: word(moments.wordsStart, ASK, 300) },
  second: { text: SECOND_ASK, at: word(moments.words2Start, SECOND_ASK, 400) },
};

const voice = [
  { line: ASK, at: moments.wordsStart, until: 7600 },
  { line: SECOND_ASK, at: moments.words2Start, until: moments.release2 },
];

const keys: Key[] = [
  { key: "opt", at: moments.optionDown, until: moments.release },
  { key: "enter", at: moments.returnKey },
  { key: "opt", at: moments.hold2, until: moments.release2 },
];

export const SAGE_SCRIPT = {
  duration: 40_000,
  still: 24_800,
  loop: { from: 3000, to: 37_500 },
  fill: 5000,
  moments,
  words,
  voice,
  keys,
} as const;
