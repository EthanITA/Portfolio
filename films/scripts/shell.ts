import { cuesOf } from "./cues.ts";
import type { FilmScript } from "./script.ts";

const cue = cuesOf("shell");
const line = cue.at("line-end-card");
const enter = (id: string): { keys: string; at: number; until: number } => ({ keys: "return", at: cue.at(id) - 200, until: cue.at(id) + 1000 });

export default {
  name: "shell",
  duration: 35_000,
  poster: 3000,
  title: { text: "AI Shell", at: 600, until: 3000 },
  captions: [
    { text: "Looks: runs", at: cue.at("label-looks"), until: cue.at("ask-2-typing-00") - 200 },
    { text: "Changes: waits for Enter", at: cue.at("label-changes"), until: cue.at("line-cleared") - 200 },
    { text: "Can't be undone: asks first", at: cue.at("label-danger"), until: cue.at("screen-clears") - 200 },
    { text: "One answer from a pipe", at: cue.at("label-pipe"), until: line },
  ],
  presses: [enter("enter-1"), enter("enter-2"), enter("enter-3"), enter("enter-4")],
  island: [
    { at: 0, until: 3000, shape: "line", draw: 400 },
    { at: line - 600, shape: "island", draw: line, y: 0.25 },
  ],
  rig: {
    at: 2400,
    until: line - 800,
    shots: [
      { at: cue.at("push-ask-1"), duration: 2000, scale: 1.35, anchor: "line" },
      { at: 8400, duration: 1800, scale: 1 },
      { at: cue.at("push-ask-2"), duration: 2000, scale: 1.35, anchor: "line" },
      { at: 16_000, duration: 1800, scale: 1 },
      { at: cue.at("push-ask-3"), duration: 2000, scale: 1.35, anchor: "line" },
      { at: 24_800, duration: 1800, scale: 1 },
      { at: cue.at("push-ask-4"), duration: 2000, scale: 1.35, anchor: "line" },
      { at: cue.at("pull-back"), duration: 600, scale: 0.96 },
    ],
  },
  end: { text: "AI Shell · madong.me/shell", at: line + 200 },
} satisfies FilmScript;
