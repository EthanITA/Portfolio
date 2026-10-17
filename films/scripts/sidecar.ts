import { cuesOf } from "./cues.ts";
import type { FilmScript } from "./script.ts";

const cue = cuesOf("sidecar");
const line = cue.at("line-end-card");

export default {
  name: "sidecar",
  duration: 45_000,
  poster: 3000,
  title: { text: "Sidecar", at: cue.at("island-open"), until: 3000, tone: "inverse" },
  captions: [
    { text: "A companion window for Claude Code.", at: 1800, until: 3000 },
    { text: "Claude does the work. You decide what lands.", at: 34_600, until: line - 800 },
  ],
  presses: [
    { keys: "cmd z", at: cue.at("undo") - 200, until: cue.at("undo") + 1000 },
    { keys: "cmd shift z", at: cue.at("redo") - 200, until: cue.at("redo") + 1000 },
  ],
  island: [
    { at: 0, until: 3000, shape: "island", open: cue.at("island-open") - 200 },
    { at: line - 600, shape: "island", draw: line, y: 0.25 },
  ],
  rig: {
    at: 3000,
    until: line - 1000,
    shots: [
      { at: 0, duration: 0, scale: 0.96 },
      { at: 3000, duration: 900, scale: 1 },
      { at: 10_000, duration: 2000, scale: 1.5, anchor: "review" },
      { at: 14_500, duration: 1800, scale: 1 },
      { at: cue.at("artifacts-face"), duration: 2200, scale: 1.5, anchor: "artifacts" },
      { at: 24_500, duration: 1800, scale: 1 },
      { at: 28_200, duration: 1800, scale: 1.4, anchor: "history" },
      { at: cue.at("pull-back"), duration: 3000, scale: 0.9 },
    ],
  },
  end: { text: "Sidecar · madong.me/sidecar", at: line + 200 },
} satisfies FilmScript;
