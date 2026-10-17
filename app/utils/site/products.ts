import type { Product } from "./films";
import type { Beat, Run } from "./text";

export type Flagship = { slug: Product; name: string; text: Run[]; to: string; link: string };

export type Stat = { to: number; before?: string; unit?: string; label: string };

export type Question = { ask: string; answer: Run[] };

export type ProductPage = {
  name: string;
  sub: string;
  lead: Run[];
  beats: { heading: string; line: string; items: Beat[] };
  decides: { heading: string; line: string };
  numbers: Stat[];
  questions: Question[];
  builtWith: string;
  stack: string[];
};

export const flagships: Flagship[] = [
  {
    slug: "sidecar",
    name: "Sidecar",
    text: ["Sidecar sits next to Claude Code. You review what it changed, line by line, and when you comment on a page it built, the comment lands back in the conversation."],
    to: "/sidecar",
    link: "See Sidecar",
  },
  {
    slug: "sage",
    name: "Sage",
    text: ["A Mac assistant in the notch. Hold a key, say what you want in English, Italian or Chinese, and it does the steps, asking before anything it can't undo."],
    to: "/sage",
    link: "See Sage",
  },
  {
    slug: "shell",
    name: "AI Shell",
    text: [
      "Type ",
      { code: "?" },
      " and say what you want. It writes the shell command, runs it when it only looks, and stops with a note before anything that deletes, overwrites or sends data off the machine.",
    ],
    to: "/shell",
    link: "See AI Shell",
  },
];

export const nextFlagship = (slug: Product): Flagship => {
  const at = flagships.findIndex((flagship) => flagship.slug === slug);
  return flagships[(at + 1) % flagships.length]!;
};

export const products: Record<Product, ProductPage> = {
  sidecar: {
    name: "Sidecar",
    sub: "A companion window for Claude Code.",
    lead: [
      "Sidecar sits next to Claude Code and follows the conversation you're in. You review what Claude changed, line by line, and when you comment on a page it built, the comment lands back in the conversation.",
    ],
    beats: {
      heading: "Review, comment, undo.",
      line: "Each one as it looks in the window.",
      items: [
        {
          title: "Review",
          glyph: "review",
          text: ["Approve or reject a line, a hunk, a file or a whole folder. Claude hears about every reject, and ", { code: "⌘Z" }, " takes back your last 50 decisions."],
        },
        {
          title: "Comments",
          glyph: "comments",
          text: ["Select anything on a page Claude built and leave a note. Send it, and it reaches the conversation as your own message."],
        },
        {
          title: "Follows you",
          glyph: "follows",
          text: ["Switch terminal tab or start typing in another session, and Sidecar moves there with you."],
        },
      ],
    },
    decides: { heading: "What the file held before", line: "A hook keeps it before Claude's first edit, so every change can be undone." },
    numbers: [
      { to: 50, label: "decisions back" },
      { to: 1, label: "copy before the first edit" },
      { to: 4, label: "grains: line, hunk, file, folder" },
      { to: 1, unit: " s", label: "to follow your tab" },
    ],
    questions: [
      { ask: "Does it touch my files?", answer: ["It keeps what a file held before Claude's first edit, so every change can be read and undone."] },
      { ask: "How far back?", answer: ["Fifty decisions."] },
      { ask: "Does it follow me?", answer: ["Start typing in another session or switch tab and it moves there with you."] },
      { ask: "Where does a note go?", answer: ["Into the conversation, as your own message."] },
    ],
    builtWith:
      "Nuxt and a small local server, wired into Claude Code through hooks. Before Claude's first edit to a file, a hook keeps what the file held, so every change can be reviewed and undone.",
    stack: ["Nuxt", "Claude Code hooks"],
  },
  sage: {
    name: "Sage",
    sub: "A Mac assistant in the notch.",
    lead: [
      "Hold a key, say what you want, let go. Sage works out what you meant, does the steps one after another, and ticks each one on the island as it finishes.",
    ],
    beats: {
      heading: "Hold, say, watch.",
      line: "Each one as it looks on the island.",
      items: [
        {
          title: "Hold to talk",
          glyph: "talk",
          text: ["Hold right Option and talk. Your words show up live on the island, in English, Italian or Chinese."],
        },
        {
          title: "Steps you can watch",
          glyph: "steps",
          text: ['Say "I want to join the standup" and it finds the event, opens the call and turns your mic and camera off, ticking each step.'],
        },
        {
          title: "Asks first",
          glyph: "asks",
          text: [
            "A step that changes something shows its question and a line that fills over five seconds. A step others would see, that moves money or can't be undone, waits for your yes.",
          ],
        },
        {
          title: "Hands it back",
          glyph: "hands",
          text: ['A Pay or Send button is never pressed for you. Sage outlines it and hands it back: "Stopped at Pay. It\'s yours to press."'],
        },
      ],
    },
    decides: { heading: "Nine buttons it never presses", line: "It outlines them and hands them back." },
    numbers: [
      { to: 3, label: "languages" },
      { to: 5, unit: " s", label: "to say no" },
      { to: 20, unit: " s", label: "on a step that can't be undone" },
      { to: 50, label: "lines of memory" },
    ],
    questions: [
      { ask: "Will it ever press Pay?", answer: ["No. Pay, Send, Buy, Order, Delete, Sign, Push, Publish and Share are outlined and handed back."] },
      { ask: "Which key?", answer: ["Right Option, or right Command, right Control or fn."] },
      { ask: "What if I say nothing?", answer: ["Silence is no. A step others would see waits up to twenty seconds, then stops."] },
      { ask: "Does it remember?", answer: ["Fifty lines, and anything it would do on its own is off until you turn it on."] },
    ],
    builtWith:
      "A native Swift app for the island and the keys, and a Nuxt server that plans each step with Claude. A separate classifier model rates every step before it runs.",
    stack: ["Swift", "Nuxt"],
  },
  shell: {
    name: "AI Shell",
    sub: "Plain words in, a shell command out.",
    lead: [
      "Type ",
      { code: "?" },
      " and say what you want in ordinary words. AI Shell writes the command, and how much happens by itself depends on what the command would do.",
    ],
    beats: {
      heading: "Looks, changes, can't be undone.",
      line: "Each one as it lands on your line.",
      items: [
        { title: "Looks", glyph: "looks", text: ["A command that only reads runs straight away, the way it would if you'd typed it."] },
        {
          title: "Changes",
          glyph: "changes",
          text: ["One that deletes or overwrites lands on your line with a note saying what it would do, and waits for Enter."],
        },
        {
          title: "Can't be undone",
          glyph: "undone",
          text: ["One that's genuinely destructive explains itself and asks first. Saying yes only puts it on your line, so it takes two deliberate acts."],
        },
        {
          title: "One answer from a pipe",
          glyph: "pipe",
          text: [{ code: "ai -p" }, " works like ", { code: "claude -p" }, ". Pipe in a staged diff and get a commit message back."],
        },
      ],
    },
    decides: {
      heading: "A second model rates every command",
      line: "Whether a command is dangerous is never a question put to the model that wrote it.",
    },
    numbers: [
      { to: 25, before: "~", unit: " ms", label: "to start" },
      { to: 0, label: "dependencies" },
      { to: 82, label: "offline tests" },
      { to: 10, unit: " min", label: "of follow-up memory" },
    ],
    questions: [
      { ask: "Does it run anything by itself?", answer: ["Only a command that just looks, the way it would if you'd typed it."] },
      {
        ask: "What leaves the machine?",
        answer: ["Your ask and a little context, with the history redacted of key shapes, auth headers and credentials in URLs."],
      },
      {
        ask: "What if the rating is wrong?",
        answer: [
          "A separate model rates every command, and the one that wrote it never does. When it can't answer, the command is treated as a change and waits. It's a seatbelt, not a locked door. Read what lands on your line.",
        ],
      },
      { ask: "Can I pipe into it?", answer: [{ code: "ai -p" }, " works like ", { code: "claude -p" }, "."] },
    ],
    builtWith:
      "TypeScript for the model calls and a small zsh widget for the Enter key. A separate model rates every command before you see it, so whether a command is dangerous is never a question put to the model that wrote it. The bundle has no dependencies and starts in about 25 milliseconds.",
    stack: ["TypeScript", "zsh"],
  },
};
