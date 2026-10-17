export type Vec3 = readonly [number, number, number];
export type CameraPreset = { fov: number; position: Vec3; target: Vec3 };

export const STAGE_CAMERA = {
  hero: { fov: 28, position: [0, 0.63, 6], target: [0, 0, 0] },
  line: { fov: 28, position: [0, 2.2, 9.4], target: [0, 0, -0.4] },
  fence: { fov: 28, position: [0, 1.45, 10.5], target: [0, 0.35, 0] },
} as const satisfies Record<string, CameraPreset>;

// Pitch-only cameras keep a fixed vertical fov, so both values are in frame heights and CSS can place labels before three loads.
export const toScreen = (preset: CameraPreset, [x, y, z]: Vec3): { top: number; side: number } => {
  const [cx, cy, cz] = preset.position;
  const [, ty, tz] = preset.target;
  const pitch = Math.atan2(cy - ty, cz - tz);
  const ry = y - cy;
  const rz = z - cz;
  const depth = -ry * Math.sin(pitch) - rz * Math.cos(pitch);
  const up = ry * Math.cos(pitch) - rz * Math.sin(pitch);
  const reach = 2 * depth * Math.tan((preset.fov * Math.PI) / 360);
  return { top: 0.5 - up / reach, side: (x - cx) / reach };
};

// Node and the browser disagree in the last bits of tan and atan, which would make prerendered style vars a hydration mismatch.
export const hydrationSafe = (value: number): number => Math.round(value * 1e6) / 1e6;

export const ISLAND = { width: 2.4, height: 0.56, depth: 0.2, radius: 0.28, core: 0.86, lineGap: 0.12, line: 1.2 } as const;
export const HALO_HEIGHT = 0.32;

export const restAt = (hero: CameraPreset, { distance, right, up }: { distance: number; right: number; up: number }): CameraPreset => {
  const height = 2 * distance * Math.tan((hero.fov * Math.PI) / 360);
  const slope = (hero.position[1] - hero.target[1]) / (hero.position[2] - hero.target[2]);
  const target: Vec3 = [-right * height, hero.target[1] - up * height, 0];
  return { fov: hero.fov, position: [target[0], target[1] + distance * slope, distance], target };
};

// Fixed rather than measured from the layout, so one poster per breakpoint matches the first frame; wide clears the 32 px gutter from 1024 px up.
export const HERO_REST = { wide: { distance: 9, right: 0.56, up: 0 }, narrow: { distance: 12, right: 0, up: 0.257 } } as const;

const phoneRest = restAt(STAGE_CAMERA.hero, HERO_REST.narrow);
// The glass's front edge and the halo's foot are the island's outermost geometry, so the hero copy can clear it before three loads.
export const PHONE_REST_BAND = {
  top: hydrationSafe(toScreen(phoneRest, [0, ISLAND.height / 2, ISLAND.depth / 2]).top),
  bottom: hydrationSafe(toScreen(phoneRest, [0, -ISLAND.height / 2 - ISLAND.lineGap - HALO_HEIGHT / 2, 0]).top),
} as const;

const wideRest = restAt(STAGE_CAMERA.hero, HERO_REST.wide);
// One share of the hero's width holds at every wide aspect, because the wide rest always shows the frame's whole width.
export const WIDE_REST_LEFT = hydrationSafe(0.5 + (toScreen(wideRest, [-ISLAND.width / 2, 0, 0]).side * 9) / 16);
