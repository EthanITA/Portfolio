import type { FilmScript } from "./script.ts";

export default {
  name: "sidecar",
  duration: 45_000,
  poster: 3000,
  title: { text: "Sidecar", at: 1000, until: 3000 },
  captions: [
    { text: "A companion window for Claude Code.", at: 1600, until: 3000 },
    { text: "Claude does the work. You decide what lands.", at: 34_600, until: 40_600 },
  ],
  rig: {
    at: 2600,
    until: 41_000,
    shots: [
      { at: 0, duration: 0, scale: 0.96 },
      { at: 2600, duration: 900, scale: 1 },
      { at: 10_000, duration: 1400, scale: 1.4, anchor: "review" },
      { at: 14_500, duration: 1400, scale: 1.2, anchor: "terminal" },
      { at: 18_000, duration: 1500, scale: 1.5, anchor: "artifacts" },
      { at: 24_500, duration: 1600, scale: 1.1 },
      { at: 28_200, duration: 1400, scale: 1.4, anchor: "history" },
      { at: 34_000, duration: 3000, scale: 0.9 },
      { at: 41_000, duration: 600, scale: 0.86 },
    ],
  },
  end: { text: "Sidecar · madong.me/sidecar", at: 41_400 },
} satisfies FilmScript;
