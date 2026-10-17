import { SAGE_SCRIPT } from "../../app/utils/play/script/sage.ts";
import type { FilmScript } from "./script.ts";

const m = SAGE_SCRIPT.moments;
const LINE = 36_600;

export default {
  name: "sage",
  duration: 40_000,
  poster: 3000,
  title: { text: "Sage", at: 600, until: 3000 },
  captions: [
    { text: "A Mac assistant in the notch.", at: 900, until: m.optionDown - 200 },
    { text: "No app to open. Just hold a key.", at: 3100, until: m.wordsStart - 200 },
    { text: "English, Italian or Chinese.", at: 7800, until: m.understood - 200 },
    { text: "Then it does the steps. One by one.", at: 10_800, until: m.tick1 - 200 },
    { text: "Changing something? It asks. You get five seconds.", at: 22_400, until: m.returnKey - 200 },
    { text: "Return, and you're in.", at: 26_900, until: 28_300 },
    { text: "Money? It stops.", at: 32_000, until: 33_300 },
  ],
  keys: SAGE_SCRIPT.keys,
  island: [{ at: LINE - 600, shape: "island", draw: LINE, y: 0.25 }],
  rules: [],
  rig: {
    until: 36_000,
    shots: [
      { at: 3000, duration: 2000, scale: 1.5, anchor: "notch" },
      { at: 22_000, duration: 1800, scale: 1.4, anchor: "card" },
      { at: 31_600, duration: 1800, scale: 1.5, anchor: "pay" },
      { at: 35_400, duration: 600, scale: 0.96 },
    ],
  },
  end: { text: "Sage · madong.me/sage", at: LINE + 200 },
} satisfies FilmScript;
