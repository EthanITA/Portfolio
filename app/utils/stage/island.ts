import type { Material } from "three";

import { MOTION_DURATION, MOTION_EASE } from "@cela/design/utils/motion";
import {
  ACESFilmicToneMapping,
  CanvasTexture,
  Color,
  DirectionalLight,
  ExtrudeGeometry,
  Fog,
  Group,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  Shape,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Texture,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

import type { CameraPreset } from "./camera";
import { HALO_HEIGHT, ISLAND } from "./camera";
import { currentTheme } from "./theme";
import type { StageTheme } from "./theme";

export { ISLAND, STAGE_CAMERA } from "./camera";
export type { CameraPreset, Vec3 } from "./camera";
export type { StageTheme };

export type Palette = {
  theme: StageTheme;
  canvas: Color;
  ink: Color;
  border: Color;
  primary: Color;
  primarySoft: Color;
  success: Color;
  glass: Color;
  env: number;
};

type Rgba = [number, number, number, number];

let probe: CanvasRenderingContext2D | undefined;

const rgba = (value: string): Rgba => {
  probe ??= document.createElement("canvas").getContext("2d") ?? undefined;
  if (!probe) return [0, 0, 0, 1];
  probe.fillStyle = "#000";
  probe.fillStyle = value.trim();
  const normal = String(probe.fillStyle);
  const hex = (at: number): number => Number.parseInt(normal.slice(at, at + 2), 16);
  if (normal.startsWith("#")) return [hex(1), hex(3), hex(5), 1];
  const [r = 0, g = 0, b = 0, a = 1] = normal.match(/[\d.]+/g)?.map(Number) ?? [];
  return [r, g, b, a];
};

const over = ([r, g, b, a]: Rgba, [br, bg, bb]: Rgba): Rgba => [r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a), 1];

const srgb = ([r, g, b]: Rgba): Color => new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace);

export const readPalette = (): Palette => {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string): Rgba => rgba(style.getPropertyValue(name));
  const canvas = token("--canvas");
  const theme = currentTheme();
  return {
    theme,
    canvas: srgb(canvas),
    ink: srgb(over(token("--ink"), canvas)),
    border: srgb(over(token("--border-strong"), canvas)),
    primary: srgb(over(token("--primary"), canvas)),
    primarySoft: srgb(over(token("--primary-soft"), canvas)),
    success: srgb(over(token("--success"), canvas)),
    glass: srgb(over(token("--glass-liquid-bg"), [255, 255, 255, 1])),
    env: theme === "dark" ? 0.6 : 1,
  };
};

const mixPalette = (from: Palette, to: Palette, t: number): Palette => ({
  theme: to.theme,
  canvas: to.canvas.clone(),
  ink: from.ink.clone().lerp(to.ink, t),
  border: from.border.clone().lerp(to.border, t),
  primary: from.primary.clone().lerp(to.primary, t),
  primarySoft: from.primarySoft.clone().lerp(to.primarySoft, t),
  success: from.success.clone().lerp(to.success, t),
  glass: from.glass.clone().lerp(to.glass, t),
  env: from.env + (to.env - from.env) * t,
});

type Materials = {
  glass: MeshPhysicalMaterial;
  core: MeshStandardMaterial;
  line: MeshStandardMaterial;
  halo: SpriteMaterial;
  ink: MeshBasicMaterial;
  border: MeshBasicMaterial;
  grid: LineBasicMaterial;
};

export type Role = keyof Materials;

// The island is a dark shape in the product, so its core keeps the light theme's ink in both themes.
const CORE_INK = "#17151e";

let glowTexture: CanvasTexture | undefined;

const glow = (): CanvasTexture => {
  if (glowTexture) return glowTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  // A CPU-backed canvas uploads to WebGL without the GPU readback stall Chrome warns about.
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context) {
    const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.35, "rgba(255,255,255,0.35)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.setTransform(1, 0, 0, 0.25, 0, 0);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
  }
  glowTexture = new CanvasTexture(canvas);
  glowTexture.colorSpace = SRGBColorSpace;
  return glowTexture;
};

const make: { [R in Role]: () => Materials[R] } = {
  glass: () =>
    new MeshPhysicalMaterial({
      transmission: 1,
      thickness: 0.3,
      roughness: 0.12,
      ior: 1.45,
      clearcoat: 0.6,
      clearcoatRoughness: 0.08,
      attenuationDistance: 1.2,
    }),
  core: () => new MeshStandardMaterial({ color: CORE_INK, roughness: 0.9 }),
  line: () => new MeshStandardMaterial({ color: 0x000000, emissiveIntensity: 2, roughness: 1, transparent: true }),
  halo: () => new SpriteMaterial({ map: glow(), opacity: 0.3, depthWrite: false }),
  ink: () => new MeshBasicMaterial({ transparent: true, depthWrite: false }),
  border: () => new MeshBasicMaterial({ transparent: true, depthWrite: false }),
  grid: () => new LineBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false }),
};

const paint = (material: Material, role: Role, palette: Palette): void => {
  if (role === "glass" && material instanceof MeshPhysicalMaterial) {
    material.color.copy(palette.glass);
    material.attenuationColor.copy(palette.primarySoft);
  } else if (role === "line" && material instanceof MeshStandardMaterial) material.emissive.copy(palette.primary);
  else if (role === "halo" && material instanceof SpriteMaterial) material.color.copy(palette.primary);
  else if (role === "ink" && material instanceof MeshBasicMaterial) material.color.copy(palette.ink);
  else if (role === "border" && material instanceof MeshBasicMaterial) material.color.copy(palette.border);
  else if (role === "grid" && material instanceof LineBasicMaterial) material.color.copy(palette.border);
};

export const slab = (o: { width: number; height: number; depth: number; radius: number }): ExtrudeGeometry => {
  const bevel = Math.min(0.06, o.depth / 3);
  const w = o.width - bevel * 2;
  const h = o.height - bevel * 2;
  const r = Math.max(0.001, Math.min(o.radius - bevel, w / 2, h / 2));
  const shape = new Shape();
  shape.absarc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0, false);
  shape.absarc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2, false);
  shape.absarc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI, false);
  shape.absarc(-w / 2 + r, -h / 2 + r, r, Math.PI, Math.PI * 1.5, false);
  const geometry = new ExtrudeGeometry(shape, {
    depth: o.depth - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 24,
  });
  geometry.center();
  return geometry;
};

export type StageOptions = {
  canvas: HTMLCanvasElement;
  camera: CameraPreset;
  film?: boolean;
  mobile?: boolean;
  frame?: number;
  fog?: readonly [near: number, far: number];
};

export type Stage = {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  readonly palette: Palette;
  material: <R extends Role>(role: R) => Materials[R];
  discard: (...materials: Material[]) => void;
  aim: (preset: CameraPreset) => void;
  setPalette: (next: Palette, instant?: boolean) => Promise<StageTheme>;
  advance: (dt: number) => boolean;
  resize: (width: number, height: number) => void;
  warm: () => Promise<void>;
  render: () => void;
  dispose: () => void;
};

const nextTask = (): Promise<void> => new Promise((done) => setTimeout(done));

const assemble = ({ canvas, camera: preset, film, mobile, frame = 16 / 9, fog: depth }: StageOptions): Stage & { light: () => void } => {
  // Asked for here so a device without WebGL2 throws quietly to the poster, where three would log a console error first.
  const context = canvas.getContext("webgl2", { antialias: true, preserveDrawingBuffer: film });
  if (!context) throw new Error("WebGL2 unavailable");
  const renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: true, preserveDrawingBuffer: film });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;

  let palette = readPalette();
  const scene = new Scene();
  // Opaque in the exact --canvas colour: with a transparent clear, three's transmission pass refracts a fixed half-white backdrop.
  const background = palette.canvas.clone();
  scene.background = background;
  const fog = depth && new Fog(palette.canvas.clone(), ...depth);
  if (fog) scene.fog = fog;

  let pmrem: PMREMGenerator | undefined;
  let environment: Texture | undefined;
  const light = (): void => {
    pmrem = new PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    environment = pmrem.fromScene(room, 0.04).texture;
    room.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      node.geometry.dispose();
      [node.material].flat().forEach((m) => m.dispose());
    });
    scene.environment = environment;
  };
  scene.environmentIntensity = palette.env;

  const key = new DirectionalLight(0xffffff, 1.1);
  key.position.set(-3, 4, 3);
  scene.add(key);

  const camera = new PerspectiveCamera(preset.fov, frame, 0.1, 40);
  let fov: number = preset.fov;

  const aim = (next: CameraPreset): void => {
    fov = next.fov;
    camera.position.set(...next.position);
    camera.lookAt(...next.target);
  };
  aim(preset);

  const tracked = new Map<Material, Role>();
  const material = <R extends Role>(role: R): Materials[R] => {
    const created = make[role]();
    tracked.set(created, role);
    paint(created, role, palette);
    return created;
  };

  const discard = (...materials: Material[]): void => {
    materials.forEach((m) => {
      tracked.delete(m);
      m.dispose();
    });
  };

  const applyPalette = (): void => {
    background.copy(palette.canvas);
    fog?.color.copy(palette.canvas);
    scene.environmentIntensity = palette.env;
    tracked.forEach((role, m) => paint(m, role, palette));
  };

  let lerp: { from: Palette; to: Palette; t: number; done: (theme: StageTheme) => void } | undefined;

  const settle = (): void => {
    lerp?.done(lerp.to.theme);
    lerp = undefined;
  };

  const setPalette = (next: Palette, instant?: boolean): Promise<StageTheme> => {
    settle();
    if (instant) {
      palette = next;
      applyPalette();
      return Promise.resolve(next.theme);
    }
    const from = palette;
    palette = mixPalette(from, next, 0);
    applyPalette();
    return new Promise((done) => (lerp = { from, to: next, t: 0, done }));
  };

  const advance = (dt: number): boolean => {
    if (!lerp) return false;
    lerp.t = Math.min(1, lerp.t + dt / MOTION_DURATION.base);
    palette = mixPalette(lerp.from, lerp.to, MOTION_EASE.out(lerp.t));
    applyPalette();
    if (lerp.t === 1) settle();
    return !!lerp;
  };

  // Cover framing: past the reference aspect the vertical fov narrows, so the canvas crops like an object-fit: cover poster.
  const resize = (width: number, height: number): void => {
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    const half = Math.tan((fov * Math.PI) / 360);
    camera.aspect = aspect;
    camera.fov = aspect > frame ? (Math.atan((half * frame) / aspect) * 360) / Math.PI : fov;
    camera.updateProjectionMatrix();
  };

  // Without the parallel-compile extension compileAsync logs a THREE warning, and a plain compile still links off the main thread.
  const warm = async (): Promise<void> => {
    if (renderer.extensions.has("KHR_parallel_shader_compile")) await renderer.compileAsync(scene, camera);
    else renderer.compile(scene, camera);
    await nextTask();
  };

  const render = (): void => {
    if (!canvas.width || !canvas.height) return;
    renderer.render(scene, camera);
  };

  const dispose = (): void => {
    settle();
    scene.traverse((node) => {
      if (node instanceof Mesh || node instanceof Sprite) node.geometry.dispose();
    });
    tracked.forEach((_, m) => m.dispose());
    tracked.clear();
    environment?.dispose();
    pmrem?.dispose();
    renderer.dispose();
    // Browsers cap live contexts at 16 and keep a detached one until GC, so page round trips would evict the oldest with a warning.
    if (!context.isContextLost()) renderer.forceContextLoss();
  };

  return {
    renderer,
    scene,
    camera,
    get palette() {
      return palette;
    },
    material,
    discard,
    aim,
    setPalette,
    advance,
    resize,
    warm,
    render,
    dispose,
    light,
  };
};

export const createStage = (options: StageOptions): Stage => {
  const stage = assemble(options);
  stage.light();
  return stage;
};

// A live scene boots while the visitor reads, so the environment's cube render and blur get a task of their own.
export const openStage = async (options: StageOptions): Promise<Stage> => {
  const stage = assemble(options);
  await nextTask();
  stage.light();
  await nextTask();
  return stage;
};

export const breath = (ms: number): number => {
  const cycle = MOTION_DURATION.breathe;
  const phase = (((ms % cycle) + cycle) % cycle) / cycle;
  return MOTION_EASE.inOut(phase < 0.5 ? phase * 2 : 2 - phase * 2);
};

export type VioletLine = {
  group: Group;
  bar: Mesh<PlaneGeometry, MeshStandardMaterial>;
  set: (o: { opacity?: number; intensity?: number; draw?: number }) => void;
  dispose: () => void;
};

export const createLine = (stage: Stage, o: { length: number; thickness?: number }): VioletLine => {
  const group = new Group();
  const reveal = new Group();
  const bar = new Mesh(new PlaneGeometry(o.length, o.thickness ?? 0.02), stage.material("line"));
  const halo = new Sprite(stage.material("halo"));
  halo.scale.set(o.length * 1.35, HALO_HEIGHT, 1);
  halo.position.z = -0.01;
  reveal.add(halo, bar);
  group.add(reveal);
  const set = ({ opacity = 1, intensity = 2, draw = 1 }: { opacity?: number; intensity?: number; draw?: number }): void => {
    bar.material.opacity = opacity;
    bar.material.emissiveIntensity = intensity;
    halo.material.opacity = 0.3 * opacity;
    reveal.visible = draw > 0;
    reveal.scale.x = Math.max(draw, 0.0001);
    reveal.position.x = (-(1 - draw) * o.length) / 2;
  };
  const dispose = (): void => {
    group.removeFromParent();
    bar.geometry.dispose();
    halo.geometry.dispose();
    stage.discard(bar.material, halo.material);
  };
  return { group, bar, set, dispose };
};

export type Island = {
  group: Group;
  body: Group;
  glass: Mesh<ExtrudeGeometry, MeshPhysicalMaterial>;
  core: Mesh<ExtrudeGeometry, MeshStandardMaterial>;
  pose: (o: { ms: number; broken?: boolean; draw?: number; scale?: number; breathe?: number }) => void;
};

export const createIsland = (stage: Stage): Island => {
  const group = new Group();
  const body = new Group();
  const glass = new Mesh(slab(ISLAND), stage.material("glass"));
  const k = ISLAND.core;
  const core = new Mesh(
    slab({ width: ISLAND.width * k, height: ISLAND.height * k, depth: ISLAND.depth * k, radius: ISLAND.radius * k }),
    stage.material("core"),
  );
  body.add(core, glass);

  const y = -ISLAND.height / 2 - ISLAND.lineGap;
  const whole = createLine(stage, { length: ISLAND.line });
  whole.group.position.y = y;
  const dash = 0.45;
  const gap = 0.3;
  const dashes = [-1, 1].map((side) => {
    const line = createLine(stage, { length: dash });
    line.group.position.set((side * (dash + gap)) / 2, y, 0);
    return line;
  });
  group.add(body, whole.group, ...dashes.map((d) => d.group));

  const pose = ({ ms, broken, draw = 1, scale = 1, breathe = 1 }: { ms: number; broken?: boolean; draw?: number; scale?: number; breathe?: number }): void => {
    const b = breath(ms) * breathe;
    body.scale.setScalar(scale * (1 + 0.012 * b));
    const opacity = 1 - 0.3 * b;
    whole.set({ opacity, draw: broken ? 0 : draw });
    dashes.forEach((d) => d.set({ opacity, draw: broken ? draw : 0 }));
  };
  pose({ ms: 0 });

  return { group, body, glass, core, pose };
};
