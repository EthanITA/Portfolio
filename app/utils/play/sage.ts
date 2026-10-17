import type { EasingParam } from "animejs";
import type { Beat, Channel, Drawn, Reel, Visitor } from "./reel";

import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import { SAGE_SCRIPT } from "./script/sage";

export type Slot = "asking" | "confirming" | "heard" | "hidden" | "needsYou" | "stopped" | "working";

export type Look = "askingBack" | "done" | "listening" | "needsYou" | "thinking" | "waiting" | "working";

export type Step = { text: string; done: boolean };

export type Card = { question: string; detail: string };

export type SageState = {
  slot: Slot;
  look: Look;
  words: string;
  live: boolean;
  tag: string;
  route?: string;
  goal?: string;
  steps: Step[];
  card?: Card;
  title?: string;
  page: boolean;
  outlined: boolean;
  held: boolean;
};

export type Size = { w: number; h: number; r: number };

export const UNDERSTOOD = "Understood";
export const GOAL = "Join the standup";
export const STEPS = ["Found Standup · 9:30 · Google Meet", "Opened the call", "Mic and camera off"];
export const CARD: Card = { question: "Join the call?", detail: "Standup · 9:30 · Google Meet" };
export const HAND_BACK = "Stopped at Pay. It's yours to press.";
export const YOURS = "It's yours.";
export const UNKNOWN = "I only know the standup and the invoice here. Try one of those.";

export const NOTCH: Size = { w: 196, h: 32, r: 12 };

const OPEN_R = 24;
const TOP = NOTCH.h + 8;
const BOTTOM = 16;
const HEADER = 22;
const ROW = 14;
const GAP = 10;
const TWO_LINES = 40;

const WIDTH: Record<Exclude<Slot, "hidden">, number> = {
  heard: 420,
  working: 460,
  confirming: 460,
  asking: 460,
  needsYou: 540,
  stopped: 260,
};

// Every row has a fixed height, so a state's island size is known without measuring the DOM.
export const sizeOf = (state: Pick<SageState, "slot" | "steps">): Size => {
  const shown = Math.min(3, state.steps.length);
  const stack = (rows: number[]): number => TOP + rows.reduce((sum, row) => sum + row, 0) + GAP * (rows.length - 1) + BOTTOM;
  switch (state.slot) {
    case "hidden":
      return NOTCH;
    case "heard":
      return { w: WIDTH.heard, h: stack([HEADER, ROW, ...Array<number>(shown).fill(ROW)]), r: OPEN_R };
    case "working":
      return { w: WIDTH.working, h: stack([HEADER, ...Array<number>(shown).fill(ROW)]), r: OPEN_R };
    case "confirming":
      return { w: WIDTH.confirming, h: stack([HEADER, ROW, ROW]), r: OPEN_R };
    case "asking":
      return { w: WIDTH.asking, h: stack([TWO_LINES]), r: OPEN_R };
    case "needsYou":
      return { w: WIDTH.needsYou, h: stack([HEADER]), r: OPEN_R };
    case "stopped":
      return { w: WIDTH.stopped, h: stack([HEADER]), r: OPEN_R };
  }
};

const GAP_DEG: Record<Look, number> = {
  waiting: 40,
  listening: 40,
  thinking: 40,
  working: 40,
  askingBack: 60,
  needsYou: 0,
  done: 40,
};

const SPIN_MS: Partial<Record<Look, number>> = { thinking: 1200, working: 2400 };

export const RING = {
  arcPath: "[data-ring-arc]",
  tailPath: "[data-ring-tail]",
  headPath: "[data-ring-head]",
  head: `${20 / 360} ${100 / 360}`,
  spin: SPIN_MS,
  draw: (gap: number): string => `${gap / 720} ${1 - gap / 720}`,
  tail: (gap: number): string => (gap ? `${1 - gap / 720} ${1 - gap / 720 + 6 / 360}` : "1 1"),
  gap: (look: Look): number => GAP_DEG[look],
};

const ITALIAN = ["voglio", "paga", "pagare", "fattura", "entra", "riunione", "chiamata", "invia", "elimina", "compra", "la", "il", "di"];

export const Sage = {
  initial: (): SageState => ({ slot: "hidden", look: "waiting", words: "", live: false, tag: "EN", steps: [], page: false, outlined: false, held: false }),

  tagOf(words: string): string {
    if (/[㐀-鿿]/.test(words)) return "ZH";
    const tokens = words.toLowerCase().split(/\s+/);
    return tokens.some((token) => ITALIAN.includes(token)) && tokens.length > 1 ? "IT" : "EN";
  },

  route(words: string): "pay" | "standup" | "unknown" {
    const text = words.toLowerCase();
    if (/\b(pay|send|delete|buy|push|paga|pagare|invia|elimina|compra)\b|付|删|买/.test(text)) return "pay";
    if (/\b(join|call|meet|meeting|standup|stand-up|entra|riunione|chiamata)\b|会议|加入/.test(text)) return "standup";
    return "unknown";
  },

  listen(state: SageState): void {
    state.slot = "heard";
    state.look = "listening";
    state.live = true;
    state.words = "";
    state.tag = "EN";
    state.route = undefined;
    state.goal = undefined;
    state.steps = [];
    state.card = undefined;
    state.title = undefined;
    state.held = true;
  },

  release(state: SageState): void {
    state.held = false;
    state.live = false;
    state.look = "thinking";
  },

  work(state: SageState): void {
    state.slot = "working";
    state.look = "working";
    state.goal = GOAL;
    state.steps = [];
  },

  confirm(state: SageState): void {
    state.slot = "confirming";
    state.look = "askingBack";
    state.card = CARD;
  },

  handBack(state: SageState): void {
    state.slot = "needsYou";
    state.look = "needsYou";
    state.title = HAND_BACK;
    state.outlined = true;
  },

  askBack(state: SageState): void {
    state.slot = "asking";
    state.look = "askingBack";
    state.title = UNKNOWN;
  },

  stop(state: SageState): void {
    state.slot = "stopped";
    state.look = "waiting";
    state.title = YOURS;
    state.card = undefined;
  },

  fold(state: SageState): void {
    state.slot = "hidden";
    state.look = "waiting";
    state.held = false;
    state.live = false;
  },
};

const at = (ms: number, apply: (state: SageState) => void): Beat<SageState> => ({ at: ms, apply: (state) => apply(state) });

const speaking = ({ text, at: arrivals }: { text: string; at: readonly number[] }): Beat<SageState>[] => {
  const words = text.split(" ");
  return arrivals.map((ms, index) => ({
    at: ms,
    apply: (state) => {
      state.words = words.slice(0, index + 1).join(" ");
      state.tag = Sage.tagOf(state.words);
    },
  }));
};

const tick = (index: number) => (state: SageState) => {
  const step = state.steps[index];
  if (step) step.done = true;
};

const step = (index: number) => (state: SageState) => {
  state.steps.push({ text: STEPS[index] ?? "", done: false });
};

const { moments: m, words } = SAGE_SCRIPT;

const beats: Beat<SageState>[] = [
  at(m.optionDown, Sage.listen),
  ...speaking(words.ask),
  at(m.release, Sage.release),
  at(m.understood, (state) => (state.route = UNDERSTOOD)),
  at(m.goal, Sage.work),
  at(m.step1, step(0)),
  at(m.tick1, tick(0)),
  at(m.step2, step(1)),
  at(m.tick2, tick(1)),
  at(m.step3, step(2)),
  at(m.tick3, tick(2)),
  at(m.cardIn, Sage.confirm),
  at(m.joined, (state) => (state.look = "done")),
  at(m.fold, Sage.fold),
  at(m.hold2, Sage.listen),
  ...speaking(words.second),
  at(m.release2, Sage.release),
  at(m.pageIn, (state) => (state.page = true)),
  at(m.handBack, Sage.handBack),
];

export const FILL_MS = SAGE_SCRIPT.fill;

// Walks the beats once and turns every change of size, look and step into its tween, so the timing lives only in the beats.
const derive = (): { channels: Channel[]; drawn: Drawn[] } => {
  const channels: Channel[] = [];
  const drawn: Drawn[] = [];
  const state = Sage.initial();
  let size = sizeOf(state);
  let slot = state.slot;
  let look = state.look;
  let lookAt = 0;
  let turn = 0;
  let gap = RING.gap(look);
  let steps: Step[] = [];
  const tween = (name: string, ms: number, from: number, to: number, duration: number, ease: EasingParam = MOTION_EASE.out): void => {
    channels.push({ name, at: ms, from, to, duration, ease });
  };
  const ring = (ms: number, to: number, duration: number = MOTION_DURATION.fast, ease: EasingParam = MOTION_EASE.out): void => {
    drawn.push({ selector: RING.arcPath, at: ms, from: RING.draw(gap), to: RING.draw(to), duration, ease });
    drawn.push({ selector: RING.tailPath, at: ms, from: RING.tail(gap), to: RING.tail(to), duration, ease });
    gap = to;
  };
  const spinUntil = (ms: number): void => {
    const period = RING.spin[look];
    if (!period) return;
    const to = turn - (360 * (ms - lookAt)) / period;
    tween("turn", lookAt, turn, to, ms - lookAt, "linear");
    turn = to;
  };

  ring(0, gap, 1);
  drawn.push({ selector: RING.headPath, at: 0, from: RING.head, to: RING.head, duration: 1 });
  tween("idle", 0, 0.4, 0.4, 1);
  tween("fill", 0, 0, 0, 1);

  for (const beat of [...beats].sort((a, b) => a.at - b.at)) {
    beat.apply(state, beat.steps ?? 0);
    const next = sizeOf(state);
    if (next.w !== size.w || next.h !== size.h || next.r !== size.r) {
      const folding = state.slot === "hidden";
      const duration = folding ? MOTION_DURATION.fast : MOTION_DURATION.moderate;
      const ease = folding ? MOTION_EASE.out : MOTION_EASE.standard;
      tween("iw", beat.at, size.w, next.w, duration, ease);
      tween("ih", beat.at, size.h, next.h, duration, ease);
      tween("ir", beat.at, size.r, next.r, duration, ease);
      if (slot === "hidden") tween("idle", beat.at, 0.4, 0, MOTION_DURATION.fast);
      if (folding) tween("idle", beat.at + MOTION_DURATION.fast, 0, 0.4, MOTION_DURATION.slow);
      size = next;
    }
    if (state.slot !== slot) {
      if (state.slot !== "hidden") tween("ic", beat.at + (slot === "hidden" ? 0 : 150), 0, 1, MOTION_DURATION.fast);
      slot = state.slot;
    }
    state.steps.forEach((step, index) => {
      if (!steps[index]) tween(`st${index}`, beat.at, 0, 1, MOTION_DURATION.base);
      if (step.done && !steps[index]?.done) tween(`tk${index}`, beat.at, 0, 1, MOTION_DURATION.fast);
    });
    steps = state.steps.map((step) => ({ ...step }));
    if (state.look !== look) {
      spinUntil(beat.at);
      if (look === "listening") tween("flat", beat.at, 0, 1, MOTION_DURATION.fast);
      if (state.look === "listening") tween("flat", beat.at, 1, 0, 1);
      if (state.look === "done") {
        tween("turn", beat.at, turn, turn - 180, 180, MOTION_EASE.out);
        ring(beat.at, 0, 180);
        tween("turn", beat.at + 720, turn - 180, turn - 360, 480, MOTION_EASE.inOut);
        drawn.push({ selector: RING.arcPath, at: beat.at + 720, from: RING.draw(0), to: RING.draw(40), duration: 480, ease: MOTION_EASE.inOut });
        drawn.push({ selector: RING.tailPath, at: beat.at + 720, from: RING.tail(0), to: RING.tail(40), duration: 480, ease: MOTION_EASE.inOut });
        turn -= 360;
        gap = 40;
      } else if (RING.gap(state.look) !== gap) {
        ring(beat.at, RING.gap(state.look));
      }
      look = state.look;
      lookAt = beat.at;
    }
  }

  const listening = [
    [m.optionDown, m.release],
    [m.hold2, m.release2],
  ] as const;
  for (const [from, to] of listening) {
    tween("trace", from, 0, 1, to - from, "linear");
    for (let ms = from + 1; ms + 360 <= to; ms += 360) {
      tween("voice", ms, 0.35, 1, 180, MOTION_EASE.inOut);
      tween("voice", ms + 180, 1, 0.35, 180, MOTION_EASE.inOut);
    }
  }

  const filled = (m.returnKey - m.fillStart) / FILL_MS;
  tween("fill", m.fillStart, 0, filled, m.returnKey - m.fillStart, "linear");
  tween("fill", m.returnKey, filled, 1, MOTION_DURATION.fast);
  tween("page", m.pageIn, 0, 1, MOTION_DURATION.slow, MOTION_EASE.standard);
  tween("scroll", m.scrollToPay, 0, 1, 500, MOTION_EASE.inOut);
  tween("pay", m.payOutlined, 0, 1, MOTION_DURATION.fast);
  return { channels, drawn };
};

const derived = derive();

export const SAGE_REEL: Reel<SageState> = {
  duration: SAGE_SCRIPT.duration,
  loop: SAGE_SCRIPT.loop,
  still: SAGE_SCRIPT.still,
  initial: Sage.initial,
  beats,
  channels: derived.channels,
  drawn: derived.drawn,
};

export type SageToy = Visitor<SageState> & {
  keydown: (event: KeyboardEvent) => void;
  keyup: (event: KeyboardEvent) => void;
  press: () => void;
  lift: () => void;
  type: (text: string) => void;
  run: () => void;
  escape: () => boolean;
};

export type SageToyOptions = {
  tween: (name: string, value: number | [number, number], options?: { duration?: number; ease?: EasingParam }) => void;
  draw: (selector: string, to: string, options?: { duration?: number }) => void;
  turn: () => number;
};

const HOLD_MS = 150;

// Option rewrites event.key on a Mac (⌥A is å), so letters come from the physical key; AZERTY gets QWERTY letters, a toy's trade.
export const characterOf = (event: KeyboardEvent): string | undefined => {
  if (/^Key[A-Z]$/.test(event.code)) {
    const letter = event.code.slice(3).toLowerCase();
    return event.shiftKey ? letter.toUpperCase() : letter;
  }
  if (/^Digit\d$/.test(event.code)) return event.code.slice(5);
  return event.code === "Space" ? " " : undefined;
};

export const sageToy = (state: SageState, { tween, draw, turn }: SageToyOptions): SageToy => {
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let holding: ReturnType<typeof setTimeout> | undefined;
  let spinning: (() => void) | undefined;
  let fillStart = 0;

  const later = (ms: number, run: () => void): void => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      run();
    }, ms);
    timers.add(timer);
  };

  const clear = (): void => {
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    clearTimeout(holding);
    holding = undefined;
  };

  const resize = (from: Size): void => {
    const to = sizeOf(state);
    if (to.w === from.w && to.h === from.h && to.r === from.r) return;
    const folding = state.slot === "hidden";
    const options = { duration: folding ? MOTION_DURATION.fast : MOTION_DURATION.moderate, ease: folding ? MOTION_EASE.out : MOTION_EASE.standard };
    tween("iw", [from.w, to.w], options);
    tween("ih", [from.h, to.h], options);
    tween("ir", [from.r, to.r], options);
    if (from.w === NOTCH.w && !folding) tween("idle", [0.4, 0], { duration: MOTION_DURATION.fast });
    if (folding) tween("idle", [0, 0.4], { duration: MOTION_DURATION.slow });
  };

  const change = (apply: () => void): void => {
    const from = sizeOf(state);
    const slot = state.slot;
    const look = state.look;
    apply();
    resize(from);
    if (state.slot !== slot && state.slot !== "hidden") tween("ic", [0, 1], { duration: MOTION_DURATION.fast });
    if (state.look !== look) setLook(look);
  };

  const setLook = (was: Look): void => {
    spinning?.();
    spinning = undefined;
    if (was === "listening") tween("flat", [0, 1], { duration: MOTION_DURATION.fast });
    draw(RING.arcPath, RING.draw(RING.gap(state.look)));
    draw(RING.tailPath, RING.tail(RING.gap(state.look)));
    const period = RING.spin[state.look];
    if (period) {
      let alive = true;
      const step = (): void => {
        if (!alive) return;
        const from = turn();
        tween("turn", [from, from - 360], { duration: period, ease: "linear" });
        later(period, step);
      };
      step();
      spinning = () => {
        alive = false;
      };
    }
    if (state.look === "done") {
      const from = turn();
      tween("turn", [from, from - 180], { duration: 180 });
      draw(RING.arcPath, RING.draw(0));
      draw(RING.tailPath, RING.tail(0));
      later(720, () => {
        tween("turn", [from - 180, from - 360], { duration: 480, ease: MOTION_EASE.inOut });
        draw(RING.arcPath, RING.draw(40), { duration: 480 });
        draw(RING.tailPath, RING.tail(40), { duration: 480 });
      });
    }
  };

  const listen = (): void => {
    clear();
    change(() => {
      Sage.listen(state);
      state.page = false;
      state.outlined = false;
    });
    tween("page", [0, 0], { duration: 1 });
    tween("pay", [0, 0], { duration: 1 });
    tween("trace", [0, 0], { duration: 1 });
    tween("flat", [1, 0], { duration: 1 });
    tween("fill", [0, 0], { duration: 1 });
  };

  const voice = (): void => {
    tween("voice", [1, 0.35], { duration: 360, ease: MOTION_EASE.out });
    tween("trace", Math.min(1, state.words.length / 40), { duration: MOTION_DURATION.fast });
  };

  const steps = (index: number): void => {
    if (index >= STEPS.length) {
      later(900, () => change(() => Sage.confirm(state)));
      later(900, startFill);
      return;
    }
    change(() => state.steps.push({ text: STEPS[index] ?? "", done: false }));
    tween(`st${index}`, [0, 1]);
    later(900, () => {
      const step = state.steps[index];
      if (step) step.done = true;
      tween(`tk${index}`, [0, 1], { duration: MOTION_DURATION.fast });
      later(400, () => steps(index + 1));
    });
  };

  const startFill = (): void => {
    fillStart = performance.now();
    tween("fill", [0, 1], { duration: FILL_MS, ease: "linear" });
    later(FILL_MS, run);
  };

  const run = (): void => {
    if (state.slot !== "confirming" || state.look === "done") return;
    clear();
    const filled = Math.min(1, (performance.now() - fillStart) / FILL_MS);
    tween("fill", [filled, 1], { duration: MOTION_DURATION.fast });
    change(() => (state.look = "done"));
    later(1900, () => change(() => Sage.fold(state)));
  };

  const release = (): void => {
    clearTimeout(holding);
    holding = undefined;
    if (!state.held) return;
    const words = state.words.trim();
    if (!words) {
      change(() => Sage.fold(state));
      return;
    }
    change(() => Sage.release(state));
    const route = Sage.route(words);
    if (route === "standup") {
      later(600, () => change(() => (state.route = UNDERSTOOD)));
      later(1600, () => {
        change(() => Sage.work(state));
        later(600, () => steps(0));
      });
      return;
    }
    if (route === "pay") {
      later(800, () => {
        state.page = true;
        tween("page", [0, 1], { duration: MOTION_DURATION.slow, ease: MOTION_EASE.standard });
        tween("scroll", [0, 1], { duration: 500, ease: MOTION_EASE.inOut });
      });
      later(1600, () => {
        change(() => Sage.handBack(state));
        tween("pay", [0, 1], { duration: MOTION_DURATION.fast });
      });
      return;
    }
    later(700, () => change(() => Sage.askBack(state)));
  };

  const press = (): void => {
    if (holding || state.held) return;
    holding = setTimeout(() => {
      holding = undefined;
      listen();
    }, HOLD_MS);
  };

  const type = (text: string): void => {
    if (!state.held) return;
    state.words = text;
    state.tag = Sage.tagOf(text);
    voice();
  };

  return {
    // The demo's goal is not the visitor's, so it folds rather than running on under them.
    adopt: (adopted) => {
      if (["heard", "working", "confirming"].includes(adopted.slot)) later(400, () => change(() => Sage.fold(adopted)));
    },
    stop: () => {
      clear();
      spinning?.();
    },
    keydown: (event) => {
      if (event.code === "AltRight") {
        event.preventDefault();
        if (!event.repeat) press();
        return;
      }
      if (event.key === "Enter" && state.slot === "confirming") {
        event.preventDefault();
        run();
        return;
      }
      if (!state.held || event.metaKey || event.ctrlKey) return;
      if (event.key === "Backspace") {
        event.preventDefault();
        type(state.words.slice(0, -1));
        return;
      }
      const character = characterOf(event);
      if (!character) return;
      event.preventDefault();
      type(state.words + character);
    },
    keyup: (event) => {
      if (event.code === "AltRight") release();
    },
    press,
    lift: release,
    type,
    run,
    escape: () => {
      if (state.slot === "hidden" && !holding) return false;
      clear();
      if (state.slot === "confirming" && state.look !== "done") {
        change(() => Sage.stop(state));
        tween("fill", 0, { duration: MOTION_DURATION.fast });
        later(1800, () => change(() => Sage.fold(state)));
        return true;
      }
      change(() => Sage.fold(state));
      return true;
    },
  };
};
