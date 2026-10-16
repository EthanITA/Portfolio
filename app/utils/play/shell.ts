import type { Beat, Channel, Reel, Visitor } from "./reel";

import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";

export type Folder = "design" | "shell";

export type Tier = "caution" | "danger" | "safe";

export type ShellRow = {
  id: number;
  text: string;
  folder?: Folder;
  tier?: Tier;
  label?: { text: string; channel: string };
};

export type ShellPhase = "asking" | "idle" | "running" | "spinning";

export type RecordKey = keyof typeof RECORDS;

export type ShellState = {
  rows: ShellRow[];
  folder: Folder;
  line: string;
  phase: ShellPhase;
  spin: number;
  blink: number;
  pending?: RecordKey;
  staged?: Tier;
  nextId: number;
};

type Asked = { tier: Tier; reason?: string; command: string; output?: string[] };
type Piped = { line: string; folder: Folder; output: string[] };

const LABEL = {
  safe: "Looks: runs",
  caution: "Changes: waits for Enter",
  danger: "Can't be undone: asks first",
  pipe: "One answer from a pipe",
} as const;

const PIPE_LINE = "git show HEAD | ai -p 'Write one concise conventional commit subject for this change.'";

const RECORDS = {
  find: {
    tier: "safe",
    command: "find . -type d \\( -name node_modules -o -name .git \\) -prune -o -type f -exec stat -f '%z %N' {} + | sort -rn | head -5",
    output: ["49163 ./pnpm-lock.yaml", "31710 ./dist/ai.mjs", "18337 ./README.md", "9732 ./docs/ux-flows.md", "5821 ./src/guardrail.ts"],
  },
  dist: { tier: "caution", reason: "deletes files", command: "rm -r dist" },
  push: { tier: "danger", reason: "changes something remote or published", command: "git push --force origin HEAD:main" },
  commit: {
    tier: "caution",
    reason: "sends data off this machine",
    command: `git commit -m "$(git diff --cached | ai -p 'Write one concise conventional commit subject for these staged changes.')"`,
  },
  pipe: { line: PIPE_LINE, folder: "design", output: ["feat(state-message): delay loading message fade-in to prevent flashes"] },
} satisfies Record<string, Asked | Piped>;

const KEYWORDS: Record<RecordKey, string[]> = {
  find: ["find", "biggest", "largest", "big", "files", "size", "sizes", "heaviest", "five", "top"],
  dist: ["delete", "remove", "rm", "dist", "folder", "clean"],
  push: ["push", "force", "origin", "main", "branch", "overwrite"],
  commit: ["commit", "staged", "stage", "message"],
  pipe: ["pipe", "subject", "summarize", "show"],
};

export const UNKNOWN = "This playground replays real recordings. Try one of the five asks.";

export const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export const SPIN_FRAME_MS = 90;

const SPIN_MS = 1500;

const RUN_MS = 1200;

const isPiped = (record: Asked | Piped): record is Piped => "line" in record;

export const Shell = {
  initial: (): ShellState => ({ rows: [], folder: "shell", line: "", phase: "idle", spin: 0, blink: 0, nextId: 1 }),

  match(line: string): RecordKey | undefined {
    const text = line.trim().toLowerCase();
    if (!text.startsWith("?")) return text.includes("ai -p") || text.startsWith("git show") ? "pipe" : undefined;
    const words = text.slice(1).split(/[^a-z0-9.]+/).filter(Boolean);
    let best: RecordKey | undefined;
    let score = 0;
    for (const key of Object.keys(KEYWORDS) as RecordKey[]) {
      const hits = KEYWORDS[key].filter((word) => words.includes(word)).length;
      if (hits > score) {
        best = key;
        score = hits;
      }
    }
    return best;
  },

  push(state: ShellState, row: Omit<ShellRow, "id">): ShellRow {
    const added = { ...row, id: state.nextId };
    state.nextId += 1;
    state.rows.push(added);
    return added;
  },

  // Exactly what the zsh widget does with a record once the model has answered, demo and visitor alike.
  resolve(state: ShellState, key: RecordKey, channel: string): ShellRow | undefined {
    const record: Asked | Piped = RECORDS[key];
    const asked = state.line;
    state.pending = undefined;
    state.spin = 0;
    if (isPiped(record)) {
      state.phase = "idle";
      const [first, ...rest] = record.output;
      const labelled = first ? Shell.push(state, { text: first, label: { text: LABEL.pipe, channel } }) : undefined;
      for (const text of rest) Shell.push(state, { text });
      return labelled;
    }
    Shell.push(state, { folder: state.folder, text: asked });
    state.line = "";
    if (record.tier === "safe") {
      state.phase = "idle";
      const run = Shell.push(state, { folder: state.folder, text: record.command, tier: "safe", label: { text: LABEL.safe, channel } });
      for (const text of record.output ?? []) Shell.push(state, { text });
      return run;
    }
    const note = Shell.push(state, { text: `${record.tier} · ${record.reason}`, tier: record.tier, label: { text: LABEL[record.tier], channel } });
    if (record.tier === "caution") {
      state.phase = "idle";
      state.line = record.command;
      state.staged = "caution";
      return note;
    }
    Shell.push(state, { text: record.command });
    state.phase = "asking";
    state.pending = key;
    return note;
  },

  answer(state: ShellState, yes: boolean): void {
    const key = state.pending;
    state.phase = "idle";
    state.pending = undefined;
    const record: Asked | Piped | undefined = key ? RECORDS[key] : undefined;
    state.line = yes && record && !isPiped(record) ? record.command : "";
    state.staged = yes ? "danger" : undefined;
  },

  accept(state: ShellState): void {
    Shell.push(state, { folder: state.folder, text: state.line });
    state.line = "";
    state.staged = undefined;
  },

  enter(state: ShellState): RecordKey | "empty" | "unknown" {
    const line = state.line.trim();
    if (!line || line === "?" || state.staged) return "empty";
    const key = Shell.match(line);
    if (!key) return "unknown";
    state.pending = key;
    state.phase = key === "pipe" ? "running" : "spinning";
    if (key === "pipe") {
      Shell.push(state, { folder: state.folder, text: state.line });
      state.line = "";
    }
    return key;
  },
};

const typing = (at: number, text: string, every: number): Beat<ShellState> => ({
  at,
  every,
  steps: text.length,
  apply: (state, step) => {
    state.line = text.slice(0, step);
  },
});

const spinning = (at: number, key: RecordKey, until: number): Beat<ShellState> => ({
  at,
  every: SPIN_FRAME_MS,
  steps: Math.ceil((until - at) / SPIN_FRAME_MS),
  apply: (state, step) => {
    state.phase = "spinning";
    state.pending = key;
    state.spin = (step - 1) % SPINNER.length;
  },
});

const blinking = (at: number): Beat<ShellState> => ({
  at,
  every: 530,
  steps: 200,
  apply: (state, step) => {
    state.blink = (step - 1) % 2;
  },
});

const at = (ms: number, apply: (state: ShellState) => void): Beat<ShellState> => ({ at: ms, apply: (state) => apply(state) });

const label = (name: string, ms: number): Channel => ({ name, at: ms, from: 0, to: 1, duration: MOTION_DURATION.base, ease: MOTION_EASE.out });

const ASK_FIND = "? find the five biggest files in here, skip node_modules and .git";
const ASK_DIST = "? delete the dist folder";
const ASK_PUSH = "? force push my branch over main on origin";

export const SHELL_REEL: Reel<ShellState> = {
  duration: 35_000,
  loop: { from: 3000, to: 33_500 },
  still: 15_500,
  initial: Shell.initial,
  beats: [
    blinking(0),
    typing(3200, ASK_FIND, 38),
    spinning(5900, "find", 7700),
    at(7700, (state) => Shell.resolve(state, "find", "lbl-find")),
    blinking(7700),
    typing(10_300, ASK_DIST, 40),
    spinning(11_500, "dist", 13_300),
    at(13_300, (state) => Shell.resolve(state, "dist", "lbl-dist")),
    blinking(13_300),
    at(18_000, (state) => {
      state.line = "";
      state.staged = undefined;
    }),
    typing(18_300, ASK_PUSH, 38),
    spinning(20_200, "push", 22_000),
    at(22_000, (state) => Shell.resolve(state, "push", "lbl-push")),
    blinking(22_000),
    at(27_000, (state) => {
      state.rows = [];
      state.folder = "design";
      state.line = "";
      state.phase = "idle";
      state.pending = undefined;
    }),
    typing(27_200, PIPE_LINE, 26),
    at(29_700, (state) => {
      Shell.enter(state);
    }),
    at(30_900, (state) => Shell.resolve(state, "pipe", "lbl-pipe")),
    blinking(30_900),
  ],
  channels: [label("lbl-find", 7700), label("lbl-dist", 13_300), label("lbl-push", 22_000), label("lbl-pipe", 30_900)],
};

export type ShellToy = Visitor<ShellState> & {
  key: (event: KeyboardEvent) => void;
  submit: () => void;
};

export type ShellToyOptions = {
  tween: (name: string, value: [number, number]) => void;
};

export const shellToy = (state: ShellState, { tween }: ShellToyOptions): ShellToy => {
  let spinner: ReturnType<typeof setInterval> | undefined;
  let answer: ReturnType<typeof setTimeout> | undefined;

  const stopSpin = (): void => {
    clearInterval(spinner);
    clearTimeout(answer);
    spinner = undefined;
    answer = undefined;
  };

  const land = (key: RecordKey): void => {
    stopSpin();
    const row = Shell.resolve(state, key, `lbl${state.nextId}`);
    if (row?.label) {
      row.label.channel = `lbl${row.id}`;
      tween(row.label.channel, [0, 1]);
    }
  };

  const wait = (key: RecordKey, ms: number): void => {
    stopSpin();
    if (state.phase === "spinning") spinner = setInterval(() => (state.spin = (state.spin + 1) % SPINNER.length), SPIN_FRAME_MS);
    answer = setTimeout(() => land(key), ms);
  };

  const submit = (): void => {
    if (state.phase === "spinning" || state.phase === "running") return;
    if (state.phase === "asking") {
      Shell.answer(state, false);
      return;
    }
    const outcome = Shell.enter(state);
    if (outcome === "empty") {
      Shell.accept(state);
      return;
    }
    if (outcome === "unknown") {
      Shell.push(state, { folder: state.folder, text: state.line });
      Shell.push(state, { text: UNKNOWN });
      state.line = "";
      return;
    }
    wait(outcome, outcome === "pipe" ? RUN_MS : SPIN_MS);
  };

  const key = (event: KeyboardEvent): void => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (state.phase === "asking") {
      if (event.key.length !== 1 && event.key !== "Enter") return;
      event.preventDefault();
      Shell.answer(state, event.key === "y" || event.key === "Y");
      return;
    }
    if (event.key === "Escape") {
      if (state.phase !== "spinning") return;
      event.preventDefault();
      stopSpin();
      state.phase = "idle";
      state.pending = undefined;
      return;
    }
    if (state.phase !== "idle") return;
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
      return;
    }
    if (event.target instanceof HTMLInputElement) return;
    if (event.key === "Backspace") {
      event.preventDefault();
      state.line = state.line.slice(0, -1);
      state.staged = undefined;
      return;
    }
    if (event.key.length === 1) {
      event.preventDefault();
      state.line += event.key;
      state.staged = undefined;
    }
  };

  return {
    adopt: (adopted) => {
      if (adopted.phase === "spinning" && adopted.pending) wait(adopted.pending, SPIN_MS / 2);
      if (adopted.phase === "running" && adopted.pending) wait(adopted.pending, RUN_MS / 2);
    },
    stop: stopSpin,
    key,
    submit,
  };
};
