import type { FilmScript, Key } from "./script.ts";

// SHELL_SCRIPT's moments and keys from app/utils/play/script/shell.ts on overhaul/play; becomes that import once it lands on feat/overhaul.
const PLAY = {
  moments: { outputFind: 7700, typeDist: 10_300, stagedDist: 13_300, killDist: 18_000, askedPush: 22_000, clear: 26_400, answerPipe: 30_900 },
  keys: [
    { key: "enter", at: 5900 },
    { key: "enter", at: 11_500 },
    { key: "ctrl U", at: 18_000 },
    { key: "enter", at: 20_200 },
    { key: "N", at: 25_000 },
    { key: "enter", at: 29_700 },
  ] satisfies Key[],
};

const m = PLAY.moments;
const LINE = 32_600;

export default {
  name: "shell",
  duration: 35_000,
  poster: 3000,
  title: { text: "AI Shell", at: 600, until: 3000 },
  captions: [
    { text: "Looks: runs", at: m.outputFind, until: m.typeDist - 200 },
    { text: "Changes: waits for Enter", at: m.stagedDist, until: m.killDist - 200 },
    { text: "Can't be undone: asks first", at: m.askedPush, until: m.clear - 200 },
    { text: "One answer from a pipe", at: m.answerPipe, until: LINE },
  ],
  keys: PLAY.keys,
  island: [
    { at: 0, until: 3000, shape: "line", draw: 400 },
    { at: LINE - 600, shape: "island", draw: LINE, y: 0.25 },
  ],
  rules: [],
  rig: {
    at: 2400,
    until: 31_600,
    shots: [
      { at: 3200, duration: 2000, scale: 1.35, anchor: "line" },
      { at: 8400, duration: 1800, scale: 1 },
      { at: 10_700, duration: 2000, scale: 1.35, anchor: "line" },
      { at: 16_000, duration: 1800, scale: 1 },
      { at: 18_700, duration: 2000, scale: 1.35, anchor: "line" },
      { at: 24_800, duration: 1800, scale: 1 },
      { at: 27_400, duration: 2000, scale: 1.35, anchor: "line" },
      { at: 31_000, duration: 600, scale: 0.96 },
    ],
  },
  end: { text: "AI Shell · madong.me/shell", at: LINE + 200 },
} satisfies FilmScript;
