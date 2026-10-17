import { SIDECAR_SCRIPT } from "../../app/utils/play/script/sidecar.ts";
import { GRID, type FilmScript } from "./script.ts";

const LINE = 41_000;
const SEAM = 37_000;
const FOLD = 39_500;

export default {
  name: "sidecar",
  duration: 45_000,
  poster: 3000,
  close: LINE,
  title: { text: "Sidecar", at: 500, until: 2000, tone: "inverse" },
  lines: [
    "A companion window for Claude Code.",
    "No scrolling diffs. Each change lands in your list.",
    "Approve a hunk. Reject two lines.",
    "Claude hears about it.",
    "It built a page? Select anything on it.",
    "Send a note. It lands in the conversation.",
    "Changed your mind? ⌘Z takes back 50 decisions.",
    "Claude does the work. You decide what lands.",
    "That click stays yours.",
  ],
  violet: ["Approve", "Reject", "⌘Z", "You", "decide", "yours"],
  keys: SIDECAR_SCRIPT.keys,
  island: [
    { at: 0, until: 3000, shape: "island", open: 1000 },
    { at: LINE - 600, shape: "island", draw: LINE, y: 0.25 },
  ],
  rules: [{ anchor: "seam", at: SEAM }],
  stops: [{ at: SEAM, until: FOLD }],
  rig: {
    at: 2000,
    until: FOLD,
    shots: [
      { at: 10_000, duration: 1000, scale: 1.5, anchor: "hunks" },
      { at: 16_000, duration: 1000, scale: 1 },
      { at: 20_000, duration: 1000, scale: 1.4, anchor: "note" },
      { at: 23_000, duration: 1000, scale: 1 },
      { at: 28_500, duration: 1000, scale: 1.4, anchor: "history" },
      { at: 35_000, duration: 2000, scale: 0.9 },
    ],
  },
  end: { text: "Sidecar · madong.me/sidecar", at: LINE + GRID.beatMs },
} satisfies FilmScript;
