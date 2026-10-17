import type { Beat, Channel, Reel, Visitor } from "./reel";
import type { Typed } from "./script/typed";

import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import { PIPE_LINE, SHELL_SCRIPT } from "./script/shell";

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

const VERBS = ["delete", "remove", "rm", "erase", "wipe", "clean", "push", "force", "overwrite"];

const KEYWORDS: Record<RecordKey, Record<string, number>> = {
  find: { find: 2, biggest: 2, largest: 2, heaviest: 2, big: 1, files: 1, size: 1, sizes: 1, five: 1, top: 1 },
  dist: { delete: 3, remove: 3, rm: 3, erase: 3, wipe: 3, clean: 3, dist: 2, folder: 1 },
  push: { push: 3, force: 3, overwrite: 3, origin: 1, main: 1, branch: 1 },
  commit: { commit: 2, staged: 2, stage: 1, message: 1 },
  pipe: { pipe: 2, subject: 1, summarize: 1, show: 1 },
};

const RISK: Record<RecordKey, number> = { push: 2, dist: 1, commit: 1, pipe: 0, find: 0 };

export const UNKNOWN = "This playground replays real recordings. Try one of the five asks.";

const BRAILLE = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const DOT_AT: [number, number][] = [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 0],
  [1, 1],
  [1, 2],
  [0, 3],
  [1, 3],
];

// The widget's braille frames as dot positions, drawn because few fonts carry braille and each system substitutes its own.
export const SPINNER: [number, number][][] = BRAILLE.map((frame) => DOT_AT.filter((_, bit) => ((frame.codePointAt(0) ?? 0x2800) - 0x2800) & (1 << bit)));

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
    // Fails closed like the real guardrail, so a destructive ask can never replay as the safe run.
    const destructive = words.some((word) => VERBS.includes(word));
    let best: RecordKey | undefined;
    let score = 0;
    for (const key of Object.keys(KEYWORDS) as RecordKey[]) {
      if (destructive && !RISK[key]) continue;
      const hits = words.reduce((sum, word) => sum + (KEYWORDS[key][word] ?? 0), 0);
      if (hits > score || (hits === score && hits > 0 && best && RISK[key] > RISK[best])) {
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

const typing = ({ text, at: presses }: Typed): Beat<ShellState>[] =>
  presses.map((ms, index) => ({
    at: ms,
    apply: (state) => {
      state.line = text.slice(0, index + 1);
    },
  }));

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

const { moments: m, presses } = SHELL_SCRIPT;

export const SHELL_REEL: Reel<ShellState> = {
  duration: SHELL_SCRIPT.duration,
  loop: SHELL_SCRIPT.loop,
  still: SHELL_SCRIPT.still,
  initial: Shell.initial,
  beats: [
    blinking(0),
    ...typing(presses.find),
    spinning(m.enterFind, "find", m.outputFind),
    at(m.outputFind, (state) => Shell.resolve(state, "find", "lbl-find")),
    blinking(m.outputFind),
    ...typing(presses.dist),
    spinning(m.enterDist, "dist", m.stagedDist),
    at(m.stagedDist, (state) => Shell.resolve(state, "dist", "lbl-dist")),
    blinking(m.stagedDist),
    at(m.killDist, (state) => {
      state.line = "";
      state.staged = undefined;
    }),
    ...typing(presses.push),
    spinning(m.enterPush, "push", m.askedPush),
    at(m.askedPush, (state) => Shell.resolve(state, "push", "lbl-push")),
    blinking(m.askedPush),
    at(m.answerNo, (state) => Shell.answer(state, false)),
    blinking(m.answerNo),
    at(m.clear, (state) => {
      state.rows = [];
      state.folder = "design";
      state.line = "";
      state.phase = "idle";
      state.pending = undefined;
    }),
    ...typing(presses.pipe),
    at(m.enterPipe, (state) => {
      Shell.enter(state);
    }),
    at(m.answerPipe, (state) => Shell.resolve(state, "pipe", "lbl-pipe")),
    blinking(m.answerPipe),
  ],
  channels: [label("lbl-find", m.outputFind), label("lbl-dist", m.stagedDist), label("lbl-push", m.askedPush), label("lbl-pipe", m.answerPipe)],
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
