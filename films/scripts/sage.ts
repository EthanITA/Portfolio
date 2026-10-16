import type { FilmScript } from "./script.ts";

export default {
  name: "sage",
  duration: 40_000,
  poster: 3000,
  title: { text: "Sage", at: 600, until: 3000 },
  captions: [],
  rig: {
    until: 36_000,
    shots: [
      { at: 3000, duration: 1200, scale: 1.5, anchor: "notch" },
      { at: 22_000, duration: 1200, scale: 1.4, anchor: "card" },
      { at: 30_000, duration: 1400, scale: 1.5, anchor: "pay" },
      { at: 36_000, duration: 600, scale: 0.96 },
    ],
  },
  end: { text: "Sage · madong.me/sage", at: 36_400 },
} satisfies FilmScript;
