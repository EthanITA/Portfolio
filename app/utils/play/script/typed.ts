export type Key = { key: string; at: number; until?: number };

export type Typed = { text: string; at: number[] };

// A fixed jitter per character, so the typing reads human and every render and every cue sheet lands on the same ms.
const JITTER = [0, 6, -4, 9, -7, 3, -2, 8, -6, 5, -9, 2, 7, -3, 4, -8, 1];

export const typed = ({ at, text, every }: { at: number; text: string; every: number }): Typed => ({
  text,
  at: Array.from(text, (_, index) => at + index * every + (index ? (JITTER[index % JITTER.length] ?? 0) : 0)),
});
