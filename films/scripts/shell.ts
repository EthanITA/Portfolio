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
    { text: "One answer from a pipe", at: 27_400, until: 31_800 },
  ],
  rig: {
    at: 2400,
    until: 32_000,
    shots: [
      { at: 3200, duration: 1400, scale: 1.35, anchor: "line" },
      { at: 9800, duration: 900, scale: 1.15 },
      { at: 10_700, duration: 1200, scale: 1.35, anchor: "line" },
      { at: 17_800, duration: 900, scale: 1.15 },
      { at: 18_700, duration: 1200, scale: 1.35, anchor: "line" },
      { at: 26_800, duration: 900, scale: 1.15 },
      { at: 27_700, duration: 1200, scale: 1.35, anchor: "line" },
      { at: 31_800, duration: 900, scale: 1 },
    ],
  },
  end: { text: "AI Shell · madong.me/shell", at: 32_400 },
} satisfies FilmScript;
