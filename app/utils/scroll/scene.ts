import type { Texture } from "three";

import { MOTION_EASE } from "@cela/design/utils/motion";
import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, TextureLoader, Vector3 } from "three";

import { breath, createIsland, createLine, createStage, ISLAND, slab, STAGE_CAMERA } from "~/utils/stage/island";

import { sequencePath } from "./frames";
import { SEQUENCE, type Theme } from "./sequence";
import { SCREENS, type Screen } from "./tiles";

export type Quads = Record<Screen, [number, number][]>;

export type SequenceScene = {
  duration: number;
  seek: (ms: number) => void;
  ready: () => Promise<void>;
  quads: () => Quads;
  dispose: () => void;
};

const at = (progress: number): number => (progress / SEQUENCE.breakAt) * SEQUENCE.filmMs;

const SHOT = {
  open: [at(0.12), at(0.3)],
  dolly: [at(0.12), at(0.45)],
  split: [at(0.15), at(0.36)],
  stills: [at(0.3), at(0.42)],
  line: [at(0.45), at(0.55)],
  drift: [at(0.45), at(0.7)],
} as const;

const PANEL = { width: 3.2, height: 2, depth: 0.08, radius: 0.14, y: 0.21, z: -0.9 } as const;
const SCREEN = { width: 0.88, height: 0.55, depth: 0.04, radius: 0.04, face: 0.84, y: 0.21, turn: (8 * Math.PI) / 180 } as const;
const PLACES: Record<Screen, { x: number; z: number; turn: number; lag: number }> = {
  sidecar: { x: -1.05, z: -0.22, turn: 1, lag: 0 },
  sage: { x: 0, z: 0, turn: 0, lag: 80 },
  shell: { x: 1.05, z: 0.22, turn: -1, lag: 160 },
};
const LINE = { length: 5, y: -ISLAND.height / 2 - ISLAND.lineGap, lead: 160 } as const;
const CAMERA = { fov: STAGE_CAMERA.hero.fov, end: { y: 0.8, z: 4.2, target: 0.21 }, drift: 0.3 } as const;

const held = breath(SHOT.open[0]);

const span = ([from, to]: readonly [number, number], ms: number): number => Math.min(Math.max((ms - from) / (to - from), 0), 1);
const mix = (from: number, to: number, t: number): number => from + (to - from) * t;

const placeholder = (theme: Theme): Texture => {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1000;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = theme === "dark" ? "#18181b" : "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};

export const createSequenceScene = ({ canvas, theme }: { canvas: HTMLCanvasElement; theme: Theme }): SequenceScene => {
  const stage = createStage({ canvas, camera: STAGE_CAMERA.hero, film: true, frame: SEQUENCE.aspect });
  stage.resize(canvas.clientWidth, canvas.clientHeight);
  const island = createIsland(stage);
  stage.scene.add(island.group);

  const line = createLine(stage, { length: LINE.length });
  line.group.position.y = LINE.y;
  stage.scene.add(line.group);

  const third = (ISLAND.width * ISLAND.core) / 3;
  const coreHeight = ISLAND.height * ISLAND.core;
  const coreDepth = ISLAND.depth * ISLAND.core;
  const loader = new TextureLoader();

  const screens = SCREENS.map((screen, index) => {
    const body = new Mesh(slab({ width: third, height: coreHeight, depth: coreDepth, radius: SCREEN.radius }), stage.material("core"));
    const face = new Mesh(
      new PlaneGeometry(SCREEN.face, SCREEN.face / 1.6),
      new MeshBasicMaterial({ map: placeholder(theme), toneMapped: false, transparent: true, opacity: 0 }),
    );
    body.add(face);
    body.visible = false;
    stage.scene.add(body);
    const load = loader
      .loadAsync(sequencePath(`${theme}/screens/${screen}-1600`, "avif"))
      .then((texture) => {
        texture.colorSpace = SRGBColorSpace;
        face.material.map?.dispose();
        face.material.map = texture;
        face.material.needsUpdate = true;
      })
      .catch(() => {});
    return { screen, body, face, from: (index - 1) * third, load };
  });

  const reshape = (mesh: Mesh, o: { width: number; height: number; depth: number; radius: number }): void => {
    const key = [o.width, o.height, o.depth, o.radius].map((value) => value.toFixed(4)).join();
    if (mesh.userData.key === key) return;
    mesh.geometry.dispose();
    mesh.geometry = slab(o);
    mesh.userData.key = key;
  };

  const seek = (ms: number): void => {
    const open = MOTION_EASE.inOut(span(SHOT.open, ms));
    const dolly = MOTION_EASE.inOut(span(SHOT.dolly, ms));
    const drift = MOTION_EASE.out(span(SHOT.drift, ms));
    const rest = ms < SHOT.open[0];

    island.pose({ ms: rest ? ms : SHOT.open[0], draw: rest ? 1 : 0 });
    if (!rest) island.body.scale.setScalar(mix(1 + 0.012 * held, 1, open));
    island.body.position.set(0, mix(0, PANEL.y, open), mix(0, PANEL.z, open));
    reshape(island.glass, {
      width: mix(ISLAND.width, PANEL.width, open),
      height: mix(ISLAND.height, PANEL.height, open),
      depth: mix(ISLAND.depth, PANEL.depth, open),
      radius: mix(ISLAND.radius, PANEL.radius, open),
    });
    island.glass.material.thickness = mix(0.3, PANEL.depth, open);
    const splitting = ms >= SHOT.split[0];
    island.core.visible = !splitting;

    for (const { screen, body, face, from } of screens) {
      const place = PLACES[screen];
      const t = MOTION_EASE.inOut(span([SHOT.split[0] + place.lag, SHOT.split[1] + place.lag], ms));
      body.visible = splitting;
      body.position.set(mix(from, place.x, t), mix(0, SCREEN.y, t), mix(0, place.z, t) + Math.sin(Math.PI * t) * 0.35);
      body.rotation.y = place.turn * SCREEN.turn * t;
      const depth = mix(coreDepth, SCREEN.depth, t);
      reshape(body, { width: mix(third, SCREEN.width, t), height: mix(coreHeight, SCREEN.height, t), depth, radius: SCREEN.radius });
      face.position.z = depth / 2 + 0.002;
      face.material.opacity = span(SHOT.stills, ms);
      face.visible = face.material.opacity > 0;
    }

    const left = MOTION_EASE.inOut(span([SHOT.line[0], SHOT.line[1] - LINE.lead], ms));
    const right = MOTION_EASE.inOut(span([SHOT.line[0] + LINE.lead, SHOT.line[1]], ms));
    const a = mix(-ISLAND.line / 2, -LINE.length / 2, left);
    const b = mix(ISLAND.line / 2, LINE.length / 2, right);
    line.group.visible = !rest;
    line.group.scale.x = (b - a) / LINE.length;
    line.group.position.x = (a + b) / 2;
    line.set({ opacity: mix(1 - 0.3 * held, 1, open) });

    const x = CAMERA.drift * (dolly - drift);
    const { position, target } = STAGE_CAMERA.hero;
    stage.aim({
      fov: CAMERA.fov,
      position: [x, mix(position[1], CAMERA.end.y, dolly), mix(position[2], CAMERA.end.z, dolly)],
      target: [x, mix(target[1], CAMERA.end.target, dolly), target[2]],
    });
    stage.render();
  };

  const quads = (): Quads => {
    seek(SEQUENCE.filmMs);
    stage.scene.updateMatrixWorld(true);
    const half = [SCREEN.face / 2, SCREEN.face / 1.6 / 2] as const;
    return Object.fromEntries(
      screens.map(({ screen, face }) => [
        screen,
        [
          [-half[0], half[1]],
          [half[0], half[1]],
          [-half[0], -half[1]],
          [half[0], -half[1]],
        ].map(([x, y]) => {
          const point = face.localToWorld(new Vector3(x, y, 0)).project(stage.camera);
          return [Number(((point.x + 1) / 2).toFixed(5)), Number(((1 - point.y) / 2).toFixed(5))] as [number, number];
        }),
      ]),
    ) as Quads;
  };

  return {
    duration: SEQUENCE.filmMs,
    seek,
    ready: async () => {
      await Promise.all(screens.map(({ load }) => load));
    },
    quads,
    dispose: () => {
      for (const { face } of screens) {
        face.material.map?.dispose();
        face.material.dispose();
        face.geometry.dispose();
      }
      stage.dispose();
    },
  };
};
