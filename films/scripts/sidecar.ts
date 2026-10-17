import { SIDECAR_SCRIPT } from "../../app/utils/play/script/sidecar.ts";
import type { FilmScript } from "./script.ts";

const LINE = 41_400;

export default {
  name: "sidecar",
  duration: 45_000,
  poster: 3000,
  title: { text: "Sidecar", at: 1200, until: 3000, tone: "inverse" },
  captions: [
    { text: "A companion window for Claude Code.", at: 1800, until: 3000 },
    { text: "Claude does the work. You decide what lands.", at: 34_600, until: LINE - 800 },
  ],
  keys: SIDECAR_SCRIPT.keys,
  island: [
    { at: 0, until: 3000, shape: "island", open: 1000 },
    { at: LINE - 600, shape: "island", draw: LINE, y: 0.25 },
  ],
  rules: [{ anchor: "seam", at: 36_000 }],
  rig: {
    at: 3000,
    until: LINE - 1000,
    shots: [
      { at: 0, duration: 0, scale: 0.96 },
      { at: 3000, duration: 900, scale: 1 },
      { at: 10_000, duration: 2000, scale: 1.5, anchor: "hunks" },
      { at: 14_500, duration: 1800, scale: 1 },
      { at: 18_800, duration: 2000, scale: 1.4, anchor: "note" },
      { at: 24_500, duration: 1800, scale: 1 },
      { at: 28_200, duration: 1800, scale: 1.4, anchor: "history" },
      { at: 34_000, duration: 3000, scale: 0.9 },
    ],
  },
  end: { text: "Sidecar · madong.me/sidecar", at: LINE + 200 },
} satisfies FilmScript;
