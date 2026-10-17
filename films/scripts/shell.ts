import type { FilmScript } from "./script.ts";

export default {
  name: "shell",
  duration: 35_000,
  poster: 3000,
  title: { text: "AI Shell", at: 600, until: 3000 },
  captions: [
    { text: "Looks: runs", at: 3400, until: 9800 },
    { text: "Changes: waits for Enter", at: 10_400, until: 17_800 },
    { text: "Can't be undone: asks first", at: 18_400, until: 26_800 },
    { text: "One answer from a pipe", at: 27_400, until: 31_400 },
  ],
  presses: [
    { keys: "return", at: 5700, until: 6900 },
    { keys: "return", at: 11_300, until: 12_500 },
    { keys: "return", at: 19_950, until: 21_150 },
    { keys: "return", at: 29_700, until: 30_900 },
  ],
  island: [
    { at: 0, until: 3000, shape: "line", draw: 400 },
    { at: 32_000, shape: "island", draw: 32_600, y: 0.25 },
  ],
  rig: {
    at: 2400,
    until: 31_600,
    shots: [
      { at: 3200, duration: 2000, scale: 1.35, anchor: "line" },
      { at: 9800, duration: 1800, scale: 1 },
      { at: 11_600, duration: 2000, scale: 1.35, anchor: "line" },
      { at: 17_800, duration: 1800, scale: 1 },
      { at: 19_600, duration: 2000, scale: 1.35, anchor: "line" },
      { at: 26_800, duration: 1800, scale: 1 },
      { at: 28_600, duration: 2000, scale: 1.35, anchor: "line" },
    ],
  },
  end: { text: "AI Shell · madong.me/shell", at: 32_800 },
} satisfies FilmScript;
