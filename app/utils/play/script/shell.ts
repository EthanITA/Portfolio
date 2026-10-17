import { typed, type Key } from "./typed.ts";

export const ASK_FIND = "? find the five biggest files in here, skip node_modules and .git";
export const ASK_DIST = "? delete the dist folder";
export const ASK_PUSH = "? force push my branch over main on origin";
export const PIPE_LINE = "git show HEAD | ai -p 'Write one concise conventional commit subject for this change.'";

const moments = {
  typeFind: 3200,
  enterFind: 5900,
  outputFind: 7700,
  typeDist: 10_300,
  enterDist: 11_500,
  stagedDist: 13_300,
  killDist: 18_000,
  typePush: 18_300,
  enterPush: 20_200,
  askedPush: 22_000,
  answerNo: 25_000,
  clear: 26_400,
  typePipe: 27_200,
  enterPipe: 29_700,
  answerPipe: 30_900,
} as const;

const presses = {
  find: typed({ at: moments.typeFind, text: ASK_FIND, every: 38 }),
  dist: typed({ at: moments.typeDist, text: ASK_DIST, every: 40 }),
  push: typed({ at: moments.typePush, text: ASK_PUSH, every: 38 }),
  pipe: typed({ at: moments.typePipe, text: PIPE_LINE, every: 26 }),
};

const keys: Key[] = [
  { key: "enter", at: moments.enterFind },
  { key: "enter", at: moments.enterDist },
  { key: "ctrl U", at: moments.killDist },
  { key: "enter", at: moments.enterPush },
  { key: "N", at: moments.answerNo },
  { key: "enter", at: moments.enterPipe },
];

export const SHELL_SCRIPT = {
  duration: 35_000,
  still: 15_500,
  loop: { from: 3000, to: 33_500 },
  moments,
  presses,
  keys,
} as const;
