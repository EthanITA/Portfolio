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
