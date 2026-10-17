import { SHELL_SCRIPT } from "../../app/utils/play/script/shell.ts";
import { GRID, type FilmScript } from "./script.ts";

const LINE = 32_000;

export default {
  name: "shell",
  duration: 35_000,
  poster: 3000,
  close: LINE,
  title: { text: "AI Shell", at: 500, until: 2000 },
  lines: [
    "Forget the flags. Type ? and say what you want.",
    "Only looks? It runs.",
    "Changes something? It waits for your Enter.",
    "Or not.",
    "Can't be undone? It asks first.",
    "Pipe a diff in. A commit message comes out.",
    "That click stays yours.",
  ],
  violet: ["Enter", "not", "asks", "yours"],
  keys: SHELL_SCRIPT.keys,
  island: [
    { at: 0, until: 3000, shape: "line", draw: 400 },
    { at: LINE - 600, shape: "island", draw: LINE, y: 0.25 },
  ],
  rules: [],
  rig: {
    at: 2000,
    until: 30_500,
    shots: [
      { at: 4000, duration: 1000, scale: 1.35, anchor: "command" },
      { at: 7000, duration: 1000, scale: 1 },
      { at: 12_000, duration: 1000, scale: 1.35, anchor: "command" },
      { at: 24_500, duration: 1000, scale: 1 },
      { at: 28_000, duration: 1000, scale: 1.35, anchor: "command" },
    ],
  },
  end: { text: "AI Shell · madong.me/shell", at: LINE + GRID.beatMs },
} satisfies FilmScript;
