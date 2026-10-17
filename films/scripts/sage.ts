import type { FilmScript, Key } from "./script.ts";

// SAGE_SCRIPT's keys from app/utils/play/script/sage.ts on overhaul/play; becomes that import once it lands on feat/overhaul.
const PLAY = {
  keys: [
    { key: "opt", at: 3000, until: 8600 },
    { key: "enter", at: 26_500 },
    { key: "opt", at: 30_000, until: 31_600 },
  ] satisfies Key[],
};

const LINE = 36_600;

export default {
  name: "sage",
  duration: 40_000,
  poster: 3000,
  title: { text: "Sage", at: 600, until: 3000 },
  captions: [],
  keys: PLAY.keys,
  island: [{ at: LINE - 600, shape: "island", draw: LINE, y: 0.25 }],
  rules: [],
  rig: {
    until: 36_000,
    shots: [
      { at: 3000, duration: 2000, scale: 1.5, anchor: "notch" },
      { at: 22_000, duration: 1800, scale: 1.4, anchor: "card" },
      { at: 30_000, duration: 2200, scale: 1.5, anchor: "pay" },
      { at: 35_400, duration: 600, scale: 0.96 },
    ],
  },
  end: { text: "Sage · madong.me/sage", at: LINE + 200 },
} satisfies FilmScript;
