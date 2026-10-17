export type Narrated = { readonly text: string; readonly anchor: string; readonly beatMs: number; readonly onsetMs: number };

export type Sheet = {
  readonly durationMs: number;
  readonly closeMs: number;
  readonly breakdown: readonly [fromMs: number, toMs: number];
  readonly stabsMs: readonly number[];
  readonly narrator: readonly Narrated[];
};

export const BREATH_MS = 150;
export const SAGE_CLEAR_MS = 200;
const LEAD_ROOM_MS = 800;
const TAIL_ROOM_MS = 300;

export type Window = { fromMs: number; untilMs: number };

export const windowsOf = ({ narrator, durationMs }: Pick<Sheet, "narrator" | "durationMs">, voicesAt: readonly number[]): Window[] =>
  narrator.map((line, i) => {
    const next = narrator[i + 1];
    const voice = voicesAt.filter((at) => at > line.onsetMs).sort((a, b) => a - b)[0];
    const limits = [next ? next.onsetMs - BREATH_MS : durationMs - TAIL_ROOM_MS, ...(voice ? [voice - SAGE_CLEAR_MS] : [])];
    return { fromMs: Math.max(0, line.onsetMs - LEAD_ROOM_MS), untilMs: Math.min(...limits) };
  });

export const SHELL_MOMENTS = {
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

export const SAGE_MOMENTS = {
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
  handBackVoice: 33_000,
} as const;

export const SIDECAR_MOMENTS = {
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
  redo: 31_500,
  hold: 35_000,
  seam: 37_000,
} as const;

const m = { shell: SHELL_MOMENTS, sage: SAGE_MOMENTS, sidecar: SIDECAR_MOMENTS };

export const SHEETS = {
  shell: {
    durationMs: 35_000,
    closeMs: 32_000,
    breakdown: [m.shell.askedPush, m.shell.answerNo],
    stabsMs: [m.shell.answerPipe],
    narrator: [
      { text: "Forget the flags. Type ? and say what you want.", anchor: "Type", beatMs: 4000, onsetMs: 2800 },
      { text: "Only looks? It runs.", anchor: "runs", beatMs: 9000, onsetMs: 7900 },
      { text: "Changes something? It waits for your Enter.", anchor: "waits", beatMs: 14_000, onsetMs: 12_900 },
      { text: "Or not.", anchor: "not", beatMs: 17_000, onsetMs: 16_600 },
      { text: "Can't be undone? It asks first.", anchor: "asks", beatMs: 21_000, onsetMs: 20_000 },
      { text: "Pipe a diff in. A commit message comes out.", anchor: "out", beatMs: 29_000, onsetMs: 26_000 },
      { text: "That click stays yours.", anchor: "yours", beatMs: 33_500, onsetMs: 32_500 },
    ],
  },
  sage: {
    durationMs: 40_000,
    closeMs: 36_000,
    breakdown: [m.sage.payOutlined, 34_000],
    stabsMs: [m.sage.tick1, m.sage.tick2, m.sage.tick3, m.sage.returnKey],
    narrator: [
      { text: "A Mac assistant in the notch.", anchor: "notch", beatMs: 2000, onsetMs: 600 },
      { text: "No app to open. Just hold a key.", anchor: "hold", beatMs: 4500, onsetMs: 2800 },
      { text: "Three languages, live.", anchor: "Three", beatMs: 7500, onsetMs: 7500 },
      { text: "Then it does the steps. One by one.", anchor: "steps", beatMs: 11_500, onsetMs: 10_600 },
      { text: "Changing something? It asks. You get five seconds.", anchor: "asks", beatMs: 20_000, onsetMs: 18_600 },
      { text: "Return, and you're in.", anchor: "Return", beatMs: 24_000, onsetMs: 24_000 },
      { text: "Money? It stops.", anchor: "stops", beatMs: 32_000, onsetMs: 31_200 },
      { text: "That click stays yours.", anchor: "yours", beatMs: 38_000, onsetMs: 37_000 },
    ],
  },
  sidecar: {
    durationMs: 45_000,
    closeMs: 41_000,
    breakdown: [35_000, m.sidecar.seam],
    stabsMs: [m.sidecar.tellLands, m.sidecar.noteLands],
    narrator: [
      { text: "A companion window for Claude Code.", anchor: "Claude", beatMs: 2000, onsetMs: 700 },
      { text: "No scrolling diffs. Each change lands in your list.", anchor: "lands", beatMs: 5500, onsetMs: 3400 },
      { text: "Approve a hunk. Reject two lines.", anchor: "Approve", beatMs: 11_000, onsetMs: 11_000 },
      { text: "Claude hears about it.", anchor: "hears", beatMs: 14_000, onsetMs: 13_600 },
      { text: "It built a page? Select anything on it.", anchor: "Select", beatMs: 19_500, onsetMs: 18_000 },
      { text: "Send a note. It lands in the conversation.", anchor: "Send", beatMs: 23_000, onsetMs: 23_000 },
      { text: "Changed your mind? ⌘Z takes back 50 decisions.", anchor: "⌘Z", beatMs: 30_000, onsetMs: 28_500 },
      { text: "Claude does the work. You decide what lands.", anchor: "You", beatMs: 37_000, onsetMs: 35_400 },
      { text: "That click stays yours.", anchor: "yours", beatMs: 43_000, onsetMs: 42_000 },
    ],
  },
} as const satisfies Record<string, Sheet>;
