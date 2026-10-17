import type { EasingParam } from "animejs";
import type { Beat, Channel, Reel, Visitor } from "./reel";
import type { Typed } from "./script/typed";

import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import { toRaw } from "vue";
import { SIDECAR_SCRIPT } from "./script/sidecar";

export type Face = "artifacts" | "review";

export type Verdict = "accepted" | "pending" | "rejected";

export type DiffLine = { mark: "add" | "remove" | "same"; line: number; text: string };

export type Hunk = { id: string; lines: DiffLine[]; verdict: Verdict };

export type ReviewFile = { path: string; hunks: Hunk[] };

export type TermRow = { id: number; kind: "claude" | "result" | "told" | "tool" | "turn"; text: string; about?: string };

export type Decision = { label: string; about: string; isReject: boolean; changes: { hunk: string; from: Verdict; to: Verdict }[] };

export type Block = "lead" | "sub" | "title";

export type Flight = { id: number; kind: "note" | "told"; text: string; lands: string[]; about?: string };

export type Toast = { id: number; text: string; tone: "neutral" | "success" };

export type SidecarState = {
  shown: boolean;
  face: Face;
  files: ReviewFile[];
  selected?: string;
  rows: TermRow[];
  toast?: Toast;
  undo: Decision[];
  redo: Decision[];
  confirming?: string;
  spot?: string;
  composing: boolean;
  draft: string;
  tray: string[];
  flight?: Flight;
  nextId: number;
};

export type TreeRow = { kind: "dir" | "file"; path: string; name: string; depth: number; files: string[] };

type Edit = { path: string; result: string; hunks: { id: string; lines: DiffLine[] }[] };

const same = (line: number, text: string): DiffLine => ({ mark: "same", line, text });
const add = (line: number, text: string): DiffLine => ({ mark: "add", line, text });
const remove = (line: number, text: string): DiffLine => ({ mark: "remove", line, text });

const TOY_LINE = "A toy version that matches words. Sage and AI Shell ask a separate model to rate every step, never the one that wrote it.";

// Real lines of this repo's own pages, so the review shows the site reviewing itself.
const EDITS = {
  index: {
    path: "app/pages/index.vue",
    result: "Updated app/pages/index.vue with 4 additions and 2 removals",
    hunks: [
      {
        id: "index-149",
        lines: [
          same(148, `    <section class="line wrap" aria-labelledby="line-title">`),
          remove(149, `      <h2 id="line-title" class="heading">One rule runs through all three.</h2>`),
          add(149, `      <h2 id="line-title" v-enter.words class="heading">One rule runs through all three.</h2>`),
        ],
      },
      {
        id: "index-154",
        lines: [same(153, "      </SiteMount>"), remove(154, `      <p class="small">${TOY_LINE}</p>`), add(154, `      <p v-enter class="small">${TOY_LINE}</p>`)],
      },
      {
        id: "index-174",
        lines: [
          same(173, `      <h2 id="standard-title" v-enter.words class="heading">How I work</h2>`),
          add(
            174,
            `      <p v-enter class="body">Agents write a lot of my code. I wrote the rules they work under, I review what they ship, and nothing goes out under my name that I can't explain.</p>`,
          ),
          add(175, `      <span v-enter.line class="rule" aria-hidden="true" />`),
        ],
      },
    ],
  },
  sidecar: {
    path: "app/pages/sidecar.vue",
    result: "Updated app/pages/sidecar.vue with 1 addition",
    hunks: [{ id: "sidecar-46", lines: [same(45, `    name="Sidecar"`), add(46, `    sub="A companion window for Claude Code."`)] }],
  },
  css: {
    path: "app/assets/css/main.css",
    result: "Updated app/assets/css/main.css with 3 additions",
    hunks: [
      {
        id: "css-28",
        lines: [
          same(26, "}"),
          same(27, ""),
          add(28, "@utility status-dot {"),
          add(29, "  @apply breathe size-2 shrink-0 rounded-full bg-primary;"),
          add(30, "}"),
        ],
      },
    ],
  },
} satisfies Record<string, Edit>;

export type EditKey = keyof typeof EDITS;

const EDIT_ORDER: EditKey[] = ["index", "sidecar", "css"];

export const BLOCKS: Record<Block, string> = {
  title: "Sidecar",
  sub: "A companion window for Claude Code.",
  lead: "Sidecar sits next to Claude Code and follows the conversation you're in. You review what Claude changed, line by line, and when you comment on a page it built, the comment lands back in the conversation.",
};

const HISTORY_CAP = 50;

const { moments: m, presses, toast: TOAST_MS } = SIDECAR_SCRIPT;

const TELL_MS = m.tellStart - m.rejectHunk;

const REPLY_MS = m.reply - m.tellLands;

const FLY_MS = { told: m.tellLands - m.tellStart, note: m.noteLands - m.send } as const;

const LAND_STAGGER_MS = 320;

const basename = (path: string): string => path.slice(path.lastIndexOf("/") + 1);

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? "" : "s"}`;

const commonDir = (paths: string[]): string => {
  const [first = "", ...rest] = paths.map((path) => path.slice(0, path.lastIndexOf("/")));
  let common = first;
  for (const dir of rest) while (common && dir !== common && !dir.startsWith(`${common}/`)) common = common.slice(0, common.lastIndexOf("/"));
  return common;
};

// The product's own wording for the undo stack: "rejecting lines 174-175 of app/pages/index.vue".
const spanOf = (lines: number[]): string => {
  const sorted = [...lines].sort((a, b) => a - b);
  if (sorted.length === 1) return `line ${sorted[0]}`;
  const isRun = sorted.every((line, index) => !index || line === (sorted[index - 1] ?? 0) + 1);
  return isRun ? `lines ${sorted[0]}-${sorted.at(-1)}` : `lines ${sorted.join(", ")}`;
};

const filesOf = (paths: string[]): string => {
  const [only] = paths;
  if (paths.length === 1 && only) return only;
  const where = commonDir(paths);
  return `${paths.length} files${where ? ` in ${where}/` : ""}`;
};

const whatOf = (paths: string[], dir: string): string => {
  const [only] = paths;
  if (paths.length === 1 && only) return basename(only);
  return `${plural(paths.length, "file")} in ${basename(dir || commonDir(paths))}/`;
};

const hunkOf = (state: SidecarState, id: string): { file: ReviewFile; hunk: Hunk } | undefined => {
  for (const file of state.files) {
    const hunk = file.hunks.find((one) => one.id === id);
    if (hunk) return { file, hunk };
  }
  return undefined;
};

const setVerdicts = (state: SidecarState, decision: Decision, way: "from" | "to"): void => {
  for (const change of decision.changes) {
    const found = hunkOf(state, change.hunk);
    if (found) found.hunk.verdict = change[way];
  }
};

type Node = { name: string; path: string; dirs: Map<string, Node>; files: string[] };

const walkTree = (node: Node, depth: number, out: TreeRow[]): void => {
  for (const dir of [...node.dirs.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    let shown = dir;
    let name = dir.name;
    // A folder holding only one folder shows as one row, the way the product's tree compacts it.
    while (!shown.files.length && shown.dirs.size === 1) {
      const [only] = shown.dirs.values();
      if (!only) break;
      shown = only;
      name = `${name}/${only.name}`;
    }
    const start = out.length;
    out.push({ kind: "dir", path: shown.path, name: `${name}/`, depth, files: [] });
    walkTree(shown, depth + 1, out);
    const row = out[start];
    if (row) row.files = out.slice(start + 1).flatMap((one) => (one.kind === "file" ? [one.path] : []));
  }
  for (const file of [...node.files].sort()) out.push({ kind: "file", path: file, name: basename(file), depth, files: [file] });
};

export const Sidecar = {
  initial: (): SidecarState => ({
    shown: false,
    face: "review",
    files: [],
    rows: [],
    undo: [],
    redo: [],
    composing: false,
    draft: "",
    tray: [],
    nextId: 1,
  }),

  id(state: SidecarState): number {
    const id = state.nextId;
    state.nextId += 1;
    return id;
  },

  row(state: SidecarState, row: Omit<TermRow, "id">): void {
    state.rows.push({ ...row, id: Sidecar.id(state) });
  },

  toast(state: SidecarState, text: string, tone: Toast["tone"] = "neutral"): void {
    state.toast = { id: Sidecar.id(state), text, tone };
  },

  tree(files: ReviewFile[]): TreeRow[] {
    const root: Node = { name: "", path: "", dirs: new Map(), files: [] };
    for (const { path } of files) {
      let node = root;
      for (const part of path.split("/").slice(0, -1)) {
        const next = node.dirs.get(part) ?? { name: part, path: node.path ? `${node.path}/${part}` : part, dirs: new Map(), files: [] };
        node.dirs.set(part, next);
        node = next;
      }
      node.files.push(path);
    }
    const out: TreeRow[] = [];
    walkTree(root, 0, out);
    return out;
  },

  channelOf: (path: string): string => `f${EDIT_ORDER.findIndex((key) => EDITS[key].path === path)}`,

  pendingFiles(state: SidecarState, paths: string[]): string[] {
    return state.files.filter((file) => paths.includes(file.path) && file.hunks.some((hunk) => hunk.verdict === "pending")).map((file) => file.path);
  },

  edited(state: SidecarState, key: EditKey): boolean {
    return state.rows.some((row) => row.kind === "tool" && row.text === `Update(${EDITS[key].path})`);
  },

  edit(state: SidecarState, key: EditKey): void {
    Sidecar.row(state, { kind: "tool", text: `Update(${EDITS[key].path})` });
    Sidecar.row(state, { kind: "result", text: EDITS[key].result });
  },

  land(state: SidecarState, key: EditKey): void {
    const { path, hunks } = EDITS[key];
    if (state.files.some((file) => file.path === path)) return;
    state.files.push({ path, hunks: hunks.map((hunk) => ({ ...hunk, lines: [...hunk.lines], verdict: "pending" })) });
    state.selected ??= path;
  },

  record(state: SidecarState, decision: Decision): void {
    setVerdicts(state, decision, "to");
    state.undo.push(decision);
    if (state.undo.length > HISTORY_CAP) state.undo.shift();
    state.redo = [];
    state.confirming = undefined;
  },

  hunk(state: SidecarState, id: string, isAccept: boolean): Decision | undefined {
    const found = hunkOf(state, id);
    if (!found || found.hunk.verdict !== "pending") return undefined;
    const added = found.hunk.lines.filter((line) => line.mark === "add").map((line) => line.line);
    const removed = found.hunk.lines.filter((line) => line.mark === "remove").map((line) => line.line);
    const which = added.length ? spanOf(added) : `the removed original ${spanOf(removed)}`;
    const decision: Decision = {
      label: `${isAccept ? "accepting" : "rejecting"} ${which} of ${found.file.path}`,
      about: basename(found.file.path),
      isReject: !isAccept,
      changes: [{ hunk: id, from: "pending", to: isAccept ? "accepted" : "rejected" }],
    };
    Sidecar.record(state, decision);
    Sidecar.toast(state, isAccept ? "Accepted the hunk" : "Rejected the hunk, Claude is told");
    return decision;
  },

  // A file, a folder or "*" for everything; rejecting takes a second press because it throws work away.
  under(state: SidecarState, path: string, isAccept: boolean): Decision | undefined {
    const listed = state.files.map((file) => file.path);
    const scope = path === "*" ? listed : listed.filter((one) => one === path || one.startsWith(`${path}/`));
    const paths = Sidecar.pendingFiles(state, scope);
    if (!paths.length) return undefined;
    if (!isAccept && state.confirming !== path) {
      state.confirming = path;
      return undefined;
    }
    const decision: Decision = {
      label: `${isAccept ? "approving" : "rejecting"} ${filesOf(paths)}`,
      about: whatOf(paths, path === "*" ? "" : path),
      isReject: !isAccept,
      changes: state.files
        .filter((file) => paths.includes(file.path))
        .flatMap((file) => file.hunks.filter((hunk) => hunk.verdict === "pending"))
        .map((hunk) => ({ hunk: hunk.id, from: "pending", to: isAccept ? "accepted" : "rejected" })),
    };
    Sidecar.record(state, decision);
    const what = path === "*" ? "everything" : decision.about;
    Sidecar.toast(state, isAccept ? `Approved ${what}` : `Rejected ${what}, Claude is told`);
    return decision;
  },

  undo(state: SidecarState): void {
    const decision = state.undo.pop();
    if (!decision) return;
    setVerdicts(state, decision, "from");
    state.redo.push(decision);
    state.confirming = undefined;
    Sidecar.toast(state, `Undid ${decision.label}`);
  },

  redo(state: SidecarState): void {
    const decision = state.redo.pop();
    if (!decision) return;
    setVerdicts(state, decision, "to");
    state.undo.push(decision);
    state.confirming = undefined;
    Sidecar.toast(state, `Redid ${decision.label}`);
  },

  tell(state: SidecarState, decision: Decision): void {
    Sidecar.landFlight(state);
    state.flight = { id: Sidecar.id(state), kind: "told", text: decision.label, lands: [decision.label], about: decision.about };
  },

  landFlight(state: SidecarState): void {
    const flight = state.flight;
    if (!flight) return;
    state.flight = undefined;
    for (const text of flight.lands) Sidecar.row(state, { kind: flight.kind === "told" ? "told" : "turn", text, about: flight.about });
  },

  reply(state: SidecarState, about: string): void {
    Sidecar.row(state, { kind: "claude", text: `Saw the reject on ${about}. Reworking it.` });
  },

  open(state: SidecarState, spot: string): void {
    state.spot = spot;
    state.composing = true;
    state.draft = "";
    state.confirming = undefined;
  },

  cancel(state: SidecarState): void {
    state.composing = false;
    state.draft = "";
    state.spot = undefined;
  },

  save(state: SidecarState): void {
    const note = state.draft.trim();
    if (!note) return;
    state.tray.push(note);
    state.draft = "";
    state.composing = false;
  },

  send(state: SidecarState): void {
    if (!state.tray.length) return;
    Sidecar.landFlight(state);
    const [first = ""] = state.tray;
    state.flight = { id: Sidecar.id(state), kind: "note", text: state.tray.length === 1 ? first : plural(state.tray.length, "note"), lands: [...state.tray] };
    state.tray = [];
    state.spot = undefined;
    Sidecar.toast(state, "Sent to Claude", "success");
  },
};

export type Motion = { name: string; from: number; to: number; duration: number; ease: EasingParam };

const flip = (out: Motion[], name: string, was: boolean, is: boolean, duration: number = MOTION_DURATION.fast, ease: EasingParam = MOTION_EASE.out): void => {
  if (was !== is) out.push({ name, from: was ? 1 : 0, to: is ? 1 : 0, duration, ease });
};

// Every change of state that moves on screen, so the demo's timeline and the visitor's tweens are one list.
export const motionOf = (before: SidecarState, after: SidecarState): Motion[] => {
  const out: Motion[] = [];
  flip(out, "side", before.shown, after.shown, MOTION_DURATION.moderate, MOTION_EASE.standard);
  flip(out, "face", before.face === "artifacts", after.face === "artifacts", MOTION_DURATION.base, MOTION_EASE.standard);
  flip(out, "spot", !!before.spot, !!after.spot);
  flip(out, "pop", before.composing, after.composing);
  flip(out, "tray", before.tray.length > 0, after.tray.length > 0);
  // One channel per flight, so a visitor's second send never fights the first one's tween.
  if (after.flight && after.flight.id !== before.flight?.id) out.push({ name: `fly${after.flight.id}`, from: 0, to: 1, duration: FLY_MS[after.flight.kind], ease: MOTION_EASE.inOut });
  const rows = new Set(before.rows.map((row) => row.id));
  for (const row of after.rows) if (!rows.has(row.id)) out.push({ name: `t${row.id}`, from: 0, to: 1, duration: MOTION_DURATION.base, ease: MOTION_EASE.out });
  const files = new Set(before.files.map((file) => file.path));
  for (const file of after.files) if (!files.has(file.path)) out.push({ name: Sidecar.channelOf(file.path), from: 0, to: 1, duration: MOTION_DURATION.base, ease: MOTION_EASE.out });
  for (const file of after.files) {
    for (const hunk of file.hunks) {
      const was = hunkOf(before, hunk.id)?.hunk.verdict ?? "pending";
      if (was === "pending" && hunk.verdict !== "pending") out.push({ name: `v-${hunk.id}`, from: 0, to: 1, duration: MOTION_DURATION.base, ease: MOTION_EASE.out });
    }
  }
  return out;
};

const at = (ms: number, apply: (state: SidecarState) => void): Beat<SidecarState> => ({ at: ms, apply: (state) => apply(state) });

const typing = ({ text, at: presses }: Typed): Beat<SidecarState>[] =>
  presses.map((ms, index) => at(ms, (state) => (state.draft = text.slice(0, index + 1))));

const beats: Beat<SidecarState>[] = [
  at(m.edit1, (state) => Sidecar.edit(state, "index")),
  at(m.sideIn, (state) => (state.shown = true)),
  at(m.row1, (state) => Sidecar.land(state, "index")),
  at(m.edit2, (state) => Sidecar.edit(state, "sidecar")),
  at(m.row2, (state) => Sidecar.land(state, "sidecar")),
  at(m.edit3, (state) => Sidecar.edit(state, "css")),
  at(m.row3, (state) => Sidecar.land(state, "css")),
  at(m.acceptHunk, (state) => Sidecar.hunk(state, "index-149", true)),
  at(m.rejectHunk, (state) => Sidecar.hunk(state, "index-174", false)),
  at(m.tellStart, (state) => {
    const decision = state.undo.at(-1);
    if (decision) Sidecar.tell(state, decision);
  }),
  at(m.tellLands, Sidecar.landFlight),
  at(m.reply, (state) => Sidecar.reply(state, "index.vue")),
  at(m.artifacts, (state) => (state.face = "artifacts")),
  at(m.select, (state) => (state.spot = "lead")),
  at(m.popover, (state) => (state.composing = true)),
  ...typing(presses.note),
  at(m.addToTray, Sidecar.save),
  at(m.send, Sidecar.send),
  at(m.noteLands, Sidecar.landFlight),
  at(m.review, (state) => (state.face = "review")),
  at(m.undo, Sidecar.undo),
  at(m.redo, Sidecar.redo),
];

const derive = (): Channel[] => {
  const channels: Channel[] = [];
  const state = Sidecar.initial();
  const toasts: number[] = [];
  for (const beat of [...beats].sort((a, b) => a.at - b.at)) {
    const before = structuredClone(state);
    beat.apply(state, 0);
    for (const motion of motionOf(before, state)) channels.push({ ...motion, at: beat.at });
    if (state.toast && state.toast.id !== before.toast?.id) toasts.push(beat.at);
  }
  toasts.forEach((ms, index) => {
    const previous = toasts[index - 1] ?? Number.NEGATIVE_INFINITY;
    const next = toasts[index + 1] ?? Number.POSITIVE_INFINITY;
    if (previous + TOAST_MS <= ms) channels.push({ name: "toast", at: ms, from: 0, to: 1, duration: MOTION_DURATION.base, ease: MOTION_EASE.out });
    if (next > ms + TOAST_MS) channels.push({ name: "toast", at: ms + TOAST_MS, from: 1, to: 0, duration: MOTION_DURATION.fast, ease: MOTION_EASE.out });
  });
  return channels;
};

export const SIDECAR_REEL: Reel<SidecarState> = {
  duration: SIDECAR_SCRIPT.duration,
  loop: SIDECAR_SCRIPT.loop,
  still: SIDECAR_SCRIPT.still,
  initial: Sidecar.initial,
  beats,
  channels: derive(),
};

export type SidecarToy = Visitor<SidecarState> & {
  hunk: (id: string, isAccept: boolean) => void;
  under: (path: string, isAccept: boolean) => void;
  select: (path: string) => void;
  face: (face: Face) => void;
  spot: (block: Block) => void;
  draft: (text: string) => void;
  save: () => void;
  cancel: () => void;
  send: () => void;
  undo: () => void;
  redo: () => void;
  escape: () => boolean;
  key: (event: KeyboardEvent) => void;
};

export type SidecarToyOptions = {
  tween: (name: string, value: number | [number, number], options?: { duration?: number; ease?: EasingParam }) => void;
};

export const sidecarToy = (state: SidecarState, { tween }: SidecarToyOptions): SidecarToy => {
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let landTimer: ReturnType<typeof setTimeout> | undefined;

  const later = (ms: number, run: () => void): ReturnType<typeof setTimeout> => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      run();
    }, ms);
    timers.add(timer);
    return timer;
  };

  const hideToast = (ms: number): void => {
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = later(ms, () => tween("toast", 0, { duration: MOTION_DURATION.fast }));
  };

  const act = (change: (live: SidecarState) => void): void => {
    const before = structuredClone(toRaw(state));
    change(state);
    for (const motion of motionOf(before, state)) tween(motion.name, [motion.from, motion.to], { duration: motion.duration, ease: motion.ease });
    if (state.toast && state.toast.id !== before.toast?.id) {
      tween("toast", 1, { duration: MOTION_DURATION.base });
      hideToast(TOAST_MS);
    }
    const known = new Set(before.rows.map((row) => row.id));
    for (const row of state.rows) {
      const about = row.about;
      if (known.has(row.id) || row.kind !== "told" || !about) continue;
      later(REPLY_MS, () => act((live) => Sidecar.reply(live, about)));
    }
    const flight = state.flight;
    if (flight && flight.id !== before.flight?.id) {
      if (landTimer) clearTimeout(landTimer);
      landTimer = later(FLY_MS[flight.kind], () => act(Sidecar.landFlight));
    }
  };

  const told = (decision: Decision | undefined): void => {
    if (!decision?.isReject) return;
    later(TELL_MS, () => act((live) => Sidecar.tell(live, decision)));
  };

  const hunk = (id: string, isAccept: boolean): void => {
    let decision: Decision | undefined;
    act((live) => {
      decision = Sidecar.hunk(live, id, isAccept);
      if (decision?.isReject) Sidecar.open(live, id);
    });
    told(decision);
  };

  const under = (path: string, isAccept: boolean): void => {
    let decision: Decision | undefined;
    act((live) => (decision = Sidecar.under(live, path, isAccept)));
    told(decision);
  };

  const escape = (): boolean => {
    if (state.composing) {
      act(Sidecar.cancel);
      return true;
    }
    if (state.confirming) {
      act((live) => (live.confirming = undefined));
      return true;
    }
    return false;
  };

  const send = (): void => {
    act((live) => {
      if (live.composing) Sidecar.save(live);
      Sidecar.send(live);
    });
  };

  const undo = (): void => act(Sidecar.undo);
  const redo = (): void => act(Sidecar.redo);
  const save = (): void => act(Sidecar.save);

  const key = (event: KeyboardEvent): void => {
    const isMod = event.metaKey || event.ctrlKey;
    const inField = event.target instanceof HTMLTextAreaElement;
    const pressed = event.key.toLowerCase();
    if (isMod && pressed === "enter") {
      event.preventDefault();
      send();
      return;
    }
    if (isMod && (pressed === "z" || pressed === "y")) {
      if (inField) return;
      event.preventDefault();
      if (pressed === "y" || event.shiftKey) redo();
      else undo();
      return;
    }
    if (event.key === "Escape") {
      if (escape()) event.preventDefault();
      return;
    }
    if (event.key === "Enter" && inField && !event.shiftKey) {
      event.preventDefault();
      save();
    }
  };

  return {
    // The visitor gets the whole review, so edits the demo had not reached yet land now, one after another.
    adopt: (adopted) => {
      if (!adopted.shown) act((live) => (live.shown = true));
      EDIT_ORDER.filter((edit) => !Sidecar.edited(adopted, edit)).forEach((edit, index) => {
        later(index * LAND_STAGGER_MS, () => act((live) => Sidecar.edit(live, edit)));
        later(index * LAND_STAGGER_MS + LAND_STAGGER_MS / 2, () => act((live) => Sidecar.land(live, edit)));
      });
      EDIT_ORDER.filter((edit) => Sidecar.edited(adopted, edit)).forEach((edit) => act((live) => Sidecar.land(live, edit)));
      if (adopted.toast) hideToast(TOAST_MS / 2);
      const last = adopted.rows.at(-1);
      if (last?.kind === "told" && last.about) {
        const about = last.about;
        later(REPLY_MS, () => act((live) => Sidecar.reply(live, about)));
      }
    },
    stop: () => {
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
    },
    hunk,
    under,
    select: (path) => act((live) => (live.selected = path)),
    face: (face) =>
      act((live) => {
        if (live.composing) Sidecar.cancel(live);
        live.face = face;
      }),
    spot: (block) => act((live) => Sidecar.open(live, block)),
    draft: (text) => {
      state.draft = text;
    },
    save,
    cancel: () => act(Sidecar.cancel),
    send,
    undo,
    redo,
    escape,
    key,
  };
};
