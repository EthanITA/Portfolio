import { SHELL_SCRIPT } from "../../app/utils/play/script/shell.ts";
import type { FilmScript } from "./script.ts";

const m = SHELL_SCRIPT.moments;
const LINE = 32_600;
const FADE = 31_600;

export default {
  name: "shell",
  duration: 35_000,
  poster: 3000,
  title: { text: "AI Shell", at: 600, until: 3000 },
  captions: [
    { text: "Looks: runs", at: m.outputFind, until: m.typeDist - 200 },
    { text: "Changes: waits for Enter", at: m.stagedDist, until: m.killDist - 200 },
    { text: "Can't be undone: asks first", at: m.askedPush, until: m.clear - 200 },
    { text: "One answer from a pipe", at: m.enterPipe, until: FADE },
  ],
  keys: SHELL_SCRIPT.keys,
  island: [
    { at: 0, until: 3000, shape: "line", draw: 400 },
    { at: LINE - 600, shape: "island", draw: LINE, y: 0.25 },
  ],
  rules: [],
  rig: {
    at: 2400,
    until: FADE,
    shots: [
      { at: 3200, duration: 2000, scale: 1.35, anchor: "command" },
      { at: 8400, duration: 1800, scale: 1 },
      { at: 10_700, duration: 2000, scale: 1.35, anchor: "command" },
      { at: 16_000, duration: 1800, scale: 1 },
      { at: 18_700, duration: 2000, scale: 1.35, anchor: "command" },
      { at: 24_800, duration: 1800, scale: 1 },
      { at: 31_000, duration: 600, scale: 0.96 },
    ],
  },
  end: { text: "AI Shell · madong.me/shell", at: LINE + 200 },
} satisfies FilmScript;
