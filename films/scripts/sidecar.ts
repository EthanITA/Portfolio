import type { FilmScript } from "./script.ts";

export default {
  name: "sidecar",
  duration: 45_000,
  poster: 3000,
  title: { text: "Sidecar", at: 1200, until: 3000, tone: "inverse" },
  captions: [
    { text: "A companion window for Claude Code.", at: 1800, until: 3000 },
    { text: "Claude does the work. You decide what lands.", at: 34_600, until: 40_600 },
  ],
  presses: [
    { keys: "cmd z", at: 28_800, until: 30_000 },
    { keys: "cmd shift z", at: 31_300, until: 32_500 },
  ],
  island: [
    { at: 0, until: 3000, shape: "island", open: 1000 },
    { at: 40_800, shape: "island", draw: 41_400, y: 0.25 },
  ],
  rig: {
    at: 3000,
    until: 40_400,
    shots: [
      { at: 0, duration: 0, scale: 0.96 },
      { at: 3000, duration: 900, scale: 1 },
      { at: 10_000, duration: 2000, scale: 1.5, anchor: "review" },
      { at: 14_500, duration: 1800, scale: 1 },
      { at: 18_000, duration: 2200, scale: 1.5, anchor: "artifacts" },
      { at: 24_500, duration: 1800, scale: 1 },
      { at: 28_200, duration: 1800, scale: 1.4, anchor: "history" },
      { at: 34_000, duration: 3000, scale: 0.9 },
    ],
  },
  end: { text: "Sidecar · madong.me/sidecar", at: 41_600 },
} satisfies FilmScript;
