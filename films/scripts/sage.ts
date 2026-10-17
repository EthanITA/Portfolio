import { SAGE_SCRIPT } from "../../app/utils/play/script/sage.ts";
import { GRID, type FilmScript } from "./script.ts";

const LINE = 36_000;
const FOLD = 34_500;

export default {
  name: "sage",
  duration: 40_000,
  poster: 3000,
  close: LINE,
  title: { text: "Sage", at: 500, until: 2000 },
  lines: [
    "A Mac assistant in the notch.",
    "No app to open. Just hold a key.",
    "Three languages, live.",
    "Then it does the steps. One by one.",
    "Changing something? It asks. You get five seconds.",
    "Return, and you're in.",
    "Money? It stops.",
    "Stopped at Pay. It's yours to press.",
    "That click stays yours.",
  ],
  violet: ["asks", "Return", "stops", "yours"],
  keys: SAGE_SCRIPT.keys,
  waits: [{ key: "enter", at: SAGE_SCRIPT.moments.fillStart, until: SAGE_SCRIPT.moments.returnKey }],
  island: [{ at: LINE - 600, shape: "island", draw: LINE, y: 0.25 }],
  rules: [],
  stops: [{ at: SAGE_SCRIPT.moments.payOutlined, until: FOLD }],
  rig: {
    at: 2000,
    until: FOLD,
    shots: [
      { at: 4500, duration: 1000, scale: 1.5, anchor: "notch" },
      { at: 20_500, duration: 1000, scale: 1.4, anchor: "card" },
      { at: 26_000, duration: 1000, scale: 1 },
      { at: 32_500, duration: 1000, scale: 1.5, anchor: "pay" },
    ],
  },
  end: { text: "Sage · madong.me/sage", at: LINE + GRID.beatMs },
} satisfies FilmScript;
