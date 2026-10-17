import { typed, type FeatureBeat, type Key } from "./typed.ts";

export const ASK_FIND = "? find the five biggest files in here, skip node_modules and .git";
export const ASK_DIST = "? delete the dist folder";
export const ASK_PUSH = "? force push my branch over main on origin";
export const PIPE_LINE = "git show HEAD | ai -p 'Write one concise conventional commit subject for this change.'";

const moments = {
  typeFind: 4000,
  enterFind: 7000,
  outputFind: 9000,
  typeDist: 10_500,
  enterDist: 12_000,
  stagedDist: 14_000,
  killDist: 17_000,
  typePush: 17_500,
  enterPush: 19_500,
  askedPush: 21_000,
  answerNo: 24_000,
  clear: 24_500,
  typePipe: 25_000,
  enterPipe: 27_500,
  answerPipe: 29_000,
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

// Each moment sits in a 300 ms window where the caret is on and nothing else moves, since the caret blinks every 530 ms.
const beats: FeatureBeat[] = [
  { id: "looks", from: moments.typeFind, moment: moments.outputFind },
  { id: "changes", from: moments.typeDist, moment: 15_100 },
  { id: "undone", from: moments.typePush, moment: moments.askedPush },
  { id: "pipe", from: moments.typePipe, moment: moments.answerPipe },
];

export const SHELL_SCRIPT = {
  duration: 35_000,
  still: 15_500,
  // The live loop opens two seconds before the first keystroke, so the idle prompt is seen waiting.
  loop: { from: 2000, to: 32_000 },
  moments,
  presses,
  keys,
  beats,
  // The terminal's beat stills are shot whole at this size, where its long lines wrap the way a narrow window wraps them.
  beatFrame: { width: 560, height: 350 },
} as const;
