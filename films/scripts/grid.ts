import { SAGE_SCRIPT } from "../../app/utils/play/script/sage.ts";
import { SHELL_SCRIPT } from "../../app/utils/play/script/shell.ts";
import { SIDECAR_SCRIPT } from "../../app/utils/play/script/sidecar.ts";
import { GRID, onBeat, type FilmScript } from "./script.ts";

const MOMENTS: Record<FilmScript["name"], Readonly<Record<string, number>>> = { shell: SHELL_SCRIPT.moments, sage: SAGE_SCRIPT.moments, sidecar: SIDECAR_SCRIPT.moments };

type Mark = [name: string, ms?: number];

// Typed presses and spoken words keep their own pace, so only the marks the picture cuts on are held to the beat.
const marks = (script: FilmScript, moments: Readonly<Record<string, number>>): Mark[] => [
  ["duration", script.duration],
  ["poster", script.poster],
  ["close", script.close],
  ["title.at", script.title.at],
  ["title.until", script.title.until],
  ["end.at", script.end.at],
  ["island.carry", script.island.carry],
  ["rig.at", script.rig.at],
  ["rig.until", script.rig.until],
  ...script.rig.shots.flatMap((shot): Mark[] => [
    [`shot at ${shot.at}`, shot.at],
    [`shot at ${shot.at} duration`, shot.duration],
  ]),
  ...script.rules.map((rule): Mark => [`rule ${rule.anchor}`, rule.at]),
  ...[...script.stops, ...script.waits].flatMap((span): Mark[] => [
    [`stop or wait at ${span.at}`, span.at],
    [`stop or wait until ${span.until}`, span.until],
  ]),
  ...script.keys.flatMap((key): Mark[] => [
    [`key ${key.key} at ${key.at}`, key.at],
    [`key ${key.key} until`, key.until],
  ]),
  ...Object.entries(moments).map(([name, ms]): Mark => [`moment ${name}`, ms]),
];

const offGrid = (script: FilmScript, moments: Readonly<Record<string, number>> = MOMENTS[script.name]): string[] =>
  marks(script, moments).flatMap(([name, ms]) => (!ms || onBeat(ms) ? [] : [`${script.name} ${name} is ${ms} ms, off the ${GRID.beatMs} ms grid`]));

export const Grid = { offGrid };
