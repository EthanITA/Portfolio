import { cuesOf } from "./cues.ts";
import type { FilmScript } from "./script.ts";

const cue = cuesOf("sage");
const line = cue.at("line-end-card");

export default {
  name: "sage",
  duration: 40_000,
  poster: 3000,
  title: { text: "Sage", at: 600, until: 3000 },
  captions: cue.voice(),
  presses: [
    { keys: "option", at: cue.at("option-down"), until: cue.at("option-up") },
    { keys: "return", at: cue.at("return") - 200, until: cue.at("return") + 1000 },
    { keys: "option", at: cue.at("option-down-2"), until: cue.at("option-up-2") },
  ],
  island: [{ at: line - 600, shape: "island", draw: line, y: 0.25 }],
  rig: {
    until: line - 600,
    shots: [
      { at: cue.at("push-notch"), duration: 2000, scale: 1.5, anchor: "notch" },
      { at: cue.at("card-in"), duration: 1800, scale: 1.4, anchor: "card" },
      { at: cue.at("push-pay"), duration: 2200, scale: 1.5, anchor: "pay" },
      { at: cue.at("pull-back"), duration: 600, scale: 0.96 },
    ],
  },
  end: { text: "Sage · madong.me/sage", at: line + 200 },
} satisfies FilmScript;
