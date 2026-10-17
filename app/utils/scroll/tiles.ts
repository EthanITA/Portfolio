import type { Mesh, PerspectiveCamera, ShaderMaterial, Texture, WebGLRenderer } from "three";

import { MOTION_EASE } from "@cela/design/utils/motion";

import { MANIFEST } from "./manifest.gen";
import { SEQUENCE, type Rect } from "./sequence";

export type Screen = keyof typeof MANIFEST.screens;

export const SCREENS = Object.keys(MANIFEST.screens) as Screen[];

export type Targets = Partial<Record<Screen, Rect>>;

export type TileLayer = {
  setFrame: (bitmap: ImageBitmap) => void;
  setStill: (screen: Screen, bitmap: ImageBitmap) => void;
  resize: (options: { width: number; height: number; fit: Rect }) => void;
  render: (progress: number, targets: Targets) => void;
  readonly lost: boolean;
  dispose: () => void;
};

export type TileOptions = { canvas: HTMLCanvasElement; grid: readonly [number, number]; pixelRatio: number; onLost: () => void };

type Quad = readonly (readonly [number, number])[];

type Tiles = {
  start: number[];
  dest: number[];
  uv: number[];
  motion: number[];
  delays: number[];
};

const FOV = 30;

const vertexShader = /* glsl */ `
uniform vec4 uFit;
uniform vec4 uTarget;
uniform vec2 uView;
uniform float uDepth;
uniform float uLanding;
attribute vec4 aStartTop;
attribute vec4 aStartBottom;
attribute vec4 aDest;
attribute vec4 aUv;
attribute vec4 aMotion;
attribute vec3 aState;
varying vec2 vUv;
varying vec2 vFrameUv;
varying float vAlpha;

vec3 rotate(vec3 v, vec3 axis, float angle) {
  return v * cos(angle) + cross(axis, v) * sin(angle) + axis * dot(axis, v) * (1.0 - cos(angle));
}

void main() {
  vec2 corner = position.xy;
  vec2 startUv = mix(mix(aStartTop.xy, aStartTop.zw, corner.x), mix(aStartBottom.xy, aStartBottom.zw, corner.x), corner.y);
  vec2 start = uFit.xy + startUv * uFit.zw;
  vec3 point;
  if (uLanding > 0.5) {
    vec2 dest = uTarget.xy + mix(aDest.xy, aDest.zw, corner) * uTarget.zw;
    point = vec3(mix(start, dest, aState.x), sin(3.14159265 * aState.x) * uDepth * (0.12 + 0.08 * aMotion.y));
  } else {
    vec2 centreUv = 0.25 * (aStartTop.xy + aStartTop.zw + aStartBottom.xy + aStartBottom.zw);
    vec2 centre = uFit.xy + centreUv * uFit.zw;
    vec3 axis = normalize(vec3(aMotion.y, aMotion.z, 0.35));
    vec3 local = rotate(vec3(start - centre, 0.0), axis, aState.y * aMotion.w * 0.25);
    vec2 drift = (centre - uView * 0.5) * 0.4 + aMotion.yz * uView.y * 0.12;
    point = vec3(centre + local.xy + drift * aState.x, local.z + aState.y * uDepth * 1.3);
  }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(point.x, -point.y, point.z, 1.0);
  vUv = mix(aUv.xy, aUv.zw, corner);
  vFrameUv = startUv;
  vAlpha = aState.z;
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D uMap;
uniform vec2 uMask[12];
uniform vec3 uMasked;
varying vec2 vUv;
varying vec2 vFrameUv;
varying float vAlpha;

float side(vec2 p, vec2 a, vec2 b) {
  vec2 edge = b - a;
  vec2 rel = p - a;
  return edge.x * rel.y - edge.y * rel.x;
}

bool inside(vec2 p, int q) {
  vec2 tl = uMask[q * 4];
  vec2 tr = uMask[q * 4 + 1];
  vec2 bl = uMask[q * 4 + 2];
  vec2 br = uMask[q * 4 + 3];
  return side(p, tl, tr) >= 0.0 && side(p, tr, br) >= 0.0 && side(p, br, bl) >= 0.0 && side(p, bl, tl) >= 0.0;
}

void main() {
  if ((uMasked.x > 0.5 && inside(vFrameUv, 0)) || (uMasked.y > 0.5 && inside(vFrameUv, 1)) || (uMasked.z > 0.5 && inside(vFrameUv, 2))) discard;
  vec4 color = texture2D(uMap, vUv);
  gl_FragColor = vec4(color.rgb, color.a * vAlpha);
}
`;

const random = (seed: number): number => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const bilerp = (quad: Quad, u: number, v: number): [number, number] => {
  const [tl, tr, bl, br] = quad as [readonly [number, number], readonly [number, number], readonly [number, number], readonly [number, number]];
  const top = [tl[0] + (tr[0] - tl[0]) * u, tl[1] + (tr[1] - tl[1]) * u];
  const bottom = [bl[0] + (br[0] - bl[0]) * u, bl[1] + (br[1] - bl[1]) * u];
  return [top[0]! + (bottom[0]! - top[0]!) * v, top[1]! + (bottom[1]! - top[1]!) * v];
};

const centreOf = (quad: Quad): [number, number] => bilerp(quad, 0.5, 0.5);

const nearestScreen = (x: number, y: number): number =>
  Math.min(...SCREENS.map((screen) => Math.hypot((x - centreOf(MANIFEST.screens[screen])[0]) * SEQUENCE.aspect, y - centreOf(MANIFEST.screens[screen])[1])));

const emptyTiles = (): Tiles => ({ start: [], dest: [], uv: [], motion: [], delays: [] });

const pushTile = (tiles: Tiles, { quad, dest, uv, seed }: { quad: Quad; dest: readonly number[]; uv: readonly number[]; seed: number }): void => {
  for (const [u, v] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) tiles.start.push(...bilerp(quad, u, v));
  tiles.dest.push(...dest);
  tiles.uv.push(...uv);
  tiles.motion.push(0, random(seed) * 2 - 1, random(seed + 1) * 2 - 1, random(seed + 2) * 2 - 1);
  tiles.delays.push(nearestScreen(...centreOf(quad)));
};

const buildBackground = ([cols, rows]: readonly [number, number]): Tiles => {
  const tiles = emptyTiles();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const [u0, v0, u1, v1] = [col / cols, row / rows, (col + 1) / cols, (row + 1) / rows];
      const quad: Quad = [[u0, v0], [u1, v0], [u0, v1], [u1, v1]];
      pushTile(tiles, { quad, dest: [0, 0, 0, 0], uv: [u0, v0, u1, v1], seed: row * cols + col });
    }
  }
  return tiles;
};

const buildScreen = (screen: Screen, [cols, rows]: readonly [number, number]): Tiles => {
  const tiles = emptyTiles();
  const quad = MANIFEST.screens[screen];
  const [tl, tr, bl] = quad;
  const subCols = Math.max(2, Math.round((tr[0] - tl[0]) * cols));
  const subRows = Math.max(2, Math.round((bl[1] - tl[1]) * rows));
  for (let row = 0; row < subRows; row++) {
    for (let col = 0; col < subCols; col++) {
      const rect = [col / subCols, row / subRows, (col + 1) / subCols, (row + 1) / subRows] as const;
      const [u0, v0, u1, v1] = rect;
      const sub: Quad = [bilerp(quad, u0, v0), bilerp(quad, u1, v0), bilerp(quad, u0, v1), bilerp(quad, u1, v1)];
      pushTile(tiles, { quad: sub, dest: rect, uv: rect, seed: 1000 + SCREENS.indexOf(screen) * 100 + row * subCols + col });
    }
  }
  return tiles;
};

const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1);

export const createTiles = async ({ canvas, grid, pixelRatio, onLost }: TileOptions): Promise<TileLayer> => {
  const three = await import("three");
  const renderer: WebGLRenderer = new three.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);
  const scene = new three.Scene();
  const camera: PerspectiveCamera = new three.PerspectiveCamera(FOV, 1, 1, 10000);
  let lost = false;
  const handleLost = (event: Event): void => {
    event.preventDefault();
    lost = true;
    onLost();
  };
  canvas.addEventListener("webglcontextlost", handleLost);

  const background = buildBackground(grid);
  const maxDelay = Math.max(...background.delays);
  const blank = new three.Texture();

  const layer = (tiles: Tiles): { mesh: Mesh; material: ShaderMaterial; state: Float32Array; delays: number[] } => {
    const count = tiles.delays.length;
    const geometry = new three.InstancedBufferGeometry();
    geometry.setAttribute("position", new three.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0], 3));
    geometry.setIndex([0, 2, 1, 2, 3, 1]);
    const corners = Float32Array.from(tiles.start);
    const top = new Float32Array(count * 4);
    const bottom = new Float32Array(count * 4);
    for (let index = 0; index < count; index++) {
      top.set(corners.subarray(index * 8, index * 8 + 4), index * 4);
      bottom.set(corners.subarray(index * 8 + 4, index * 8 + 8), index * 4);
    }
    geometry.setAttribute("aStartTop", new three.InstancedBufferAttribute(top, 4));
    geometry.setAttribute("aStartBottom", new three.InstancedBufferAttribute(bottom, 4));
    geometry.setAttribute("aDest", new three.InstancedBufferAttribute(Float32Array.from(tiles.dest), 4));
    geometry.setAttribute("aUv", new three.InstancedBufferAttribute(Float32Array.from(tiles.uv), 4));
    geometry.setAttribute("aMotion", new three.InstancedBufferAttribute(Float32Array.from(tiles.motion), 4));
    const state = new Float32Array(count * 3);
    const stateAttribute = new three.InstancedBufferAttribute(state, 3);
    stateAttribute.setUsage(three.DynamicDrawUsage);
    geometry.setAttribute("aState", stateAttribute);
    geometry.instanceCount = count;
    const mask = SCREENS.flatMap((screen) => MANIFEST.screens[screen].map(([u, v]) => new three.Vector2(u, v)));
    const material = new three.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: three.DoubleSide,
      uniforms: {
        uMap: { value: blank },
        uFit: { value: new three.Vector4() },
        uTarget: { value: new three.Vector4() },
        uView: { value: new three.Vector2() },
        uDepth: { value: 1 },
        uLanding: { value: 0 },
        uMask: { value: mask },
        uMasked: { value: new three.Vector3() },
      },
    });
    const mesh = new three.Mesh(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { mesh, material, state, delays: tiles.delays.map((delay) => (delay / maxDelay) * SEQUENCE.spread) };
  };

  const ground = layer(background);
  const screens = Object.fromEntries(SCREENS.map((screen) => [screen, layer(buildScreen(screen, grid))])) as Record<Screen, ReturnType<typeof layer>>;
  for (const { mesh } of Object.values(screens)) mesh.visible = false;
  const textures: Texture[] = [];

  const texture = (bitmap: ImageBitmap): Texture => {
    const map = new three.Texture(bitmap);
    map.flipY = false;
    map.generateMipmaps = false;
    map.minFilter = three.LinearFilter;
    map.needsUpdate = true;
    renderer.initTexture(map);
    textures.push(map);
    return map;
  };

  const swap = (target: ShaderMaterial, bitmap: ImageBitmap): void => {
    const previous = target.uniforms.uMap!.value as Texture;
    target.uniforms.uMap!.value = texture(bitmap);
    if (previous !== blank) previous.dispose();
  };

  const fly = (state: Float32Array, delays: number[], progress: number): void => {
    delays.forEach((delay, index) => {
      const from = SEQUENCE.breakAt + delay;
      const t = clamp01((progress - from) / (SEQUENCE.flownBy - from));
      state.set([MOTION_EASE.out(t), t, 1 - clamp01((t - 0.55) / 0.45)], index * 3);
    });
  };

  const land = (state: Float32Array, delays: number[], progress: number): void => {
    const fade = 1 - clamp01((progress - SEQUENCE.landAt) / (1 - SEQUENCE.landAt));
    delays.forEach((delay, index) => {
      const from = SEQUENCE.breakAt + delay;
      const t = clamp01((progress - from) / (SEQUENCE.landAt - from));
      state.set([MOTION_EASE.inOut(t), t, fade], index * 3);
    });
  };

  // A cold shader cache links for hundreds of ms; the async compile polls instead of blocking the main thread.
  await renderer.compileAsync(scene, camera);

  return {
    setFrame: (bitmap) => swap(ground.material, bitmap),
    setStill: (screen, bitmap) => {
      swap(screens[screen].material, bitmap);
      screens[screen].mesh.visible = true;
      ground.material.uniforms.uMasked!.value.setComponent(SCREENS.indexOf(screen), 1);
    },
    resize: ({ width, height, fit }) => {
      renderer.setSize(width, height, false);
      const depth = height / 2 / Math.tan((FOV * Math.PI) / 360);
      camera.aspect = width / height;
      camera.position.set(width / 2, -height / 2, depth);
      camera.far = depth * 4;
      camera.updateProjectionMatrix();
      for (const { material } of [ground, ...Object.values(screens)]) {
        material.uniforms.uFit!.value.set(fit.x, fit.y, fit.width, fit.height);
        material.uniforms.uView!.value.set(width, height);
        material.uniforms.uDepth!.value = depth;
      }
    },
    render: (progress, targets) => {
      if (lost) return;
      fly(ground.state, ground.delays, progress);
      ground.mesh.geometry.getAttribute("aState").needsUpdate = true;
      for (const screen of SCREENS) {
        const { material, mesh, state, delays } = screens[screen];
        const target = targets[screen];
        material.uniforms.uLanding!.value = target ? 1 : 0;
        if (target) material.uniforms.uTarget!.value.set(target.x, target.y, target.width, target.height);
        (target ? land : fly)(state, delays, progress);
        mesh.geometry.getAttribute("aState").needsUpdate = true;
      }
      renderer.render(scene, camera);
    },
    get lost() {
      return lost;
    },
    dispose: () => {
      canvas.removeEventListener("webglcontextlost", handleLost);
      for (const { mesh, material } of [ground, ...Object.values(screens)]) {
        mesh.geometry.dispose();
        material.dispose();
      }
      for (const map of textures) map.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
};
