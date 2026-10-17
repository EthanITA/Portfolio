export type BoardTask = { id: number; category: "AI" | "USER"; subject: string; status: "done" | "doing" | "todo" };

export const BOARD: BoardTask[] = [
  { id: 4, category: "AI", subject: "Crossfade the sequence frames", status: "done" },
  { id: 5, category: "AI", subject: "Re-render the AI Shell film on fixed anchors", status: "doing" },
  { id: 6, category: "USER", subject: "Look at the sequence on a phone", status: "todo" },
];
