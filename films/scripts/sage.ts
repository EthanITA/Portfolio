import type { FilmScript } from "./script.ts";

export default {
  name: "sage",
  duration: 40_000,
  poster: 3000,
  title: { text: "Sage", at: 600, until: 3000 },
  captions: [
    { text: "I want to join the standup", at: 4200, until: 8800 },
    { text: "Understood", at: 9600, until: 11_400 },
    { text: "pay the invoice", at: 30_600, until: 32_400 },
    { text: "Stopped at Pay. It's yours to press.", at: 33_400, until: 35_600 },
  ],
  presses: [
    { keys: "option", at: 3000, until: 9000 },
    { keys: "return", at: 25_200, until: 26_400 },
  ],
  island: [{ at: 36_000, shape: "island", draw: 36_600, y: 0.25 }],
  rig: {
    until: 35_600,
    shots: [
      { at: 3000, duration: 2000, scale: 1.5, anchor: "notch" },
      { at: 22_000, duration: 1800, scale: 1.4, anchor: "card" },
      { at: 30_000, duration: 1800, scale: 1 },
      { at: 32_000, duration: 1800, scale: 1.5, anchor: "pay" },
    ],
  },
  end: { text: "Sage · madong.me/sage", at: 36_800 },
} satisfies FilmScript;
