import { SAGE_SCRIPT } from "../../app/utils/play/script/sage.ts";
import type { FilmScript } from "./script.ts";

const LINE = 36_600;

export default {
  name: "sage",
  duration: 40_000,
  poster: 3000,
  title: { text: "Sage", at: 600, until: 3000 },
  captions: [],
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
