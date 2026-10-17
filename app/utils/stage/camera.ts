export type Vec3 = readonly [number, number, number];
export type CameraPreset = { fov: number; position: Vec3; target: Vec3 };

export const STAGE_CAMERA = {
  hero: { fov: 28, position: [0, 0.63, 6], target: [0, 0, 0] },
  line: { fov: 28, position: [0, 2.2, 9.4], target: [0, 0, -0.4] },
  fence: { fov: 28, position: [0, 1.15, 10.5], target: [0, 0.3, 0] },
} as const satisfies Record<string, CameraPreset>;

// Fraction from the top of the frame where a point on the floor's centre line lands, for a camera that only pitches.
export const floorFraction = (preset: CameraPreset, z: number, y = 0): number => {
  const [, cy, cz] = preset.position;
  const [, ty, tz] = preset.target;
  const pitch = Math.atan2(cy - ty, cz - tz);
  const ry = y - cy;
  const rz = z - cz;
  const depth = -ry * Math.sin(pitch) - rz * Math.cos(pitch);
  const up = ry * Math.cos(pitch) - rz * Math.sin(pitch);
  return (1 - up / (depth * Math.tan((preset.fov * Math.PI) / 360))) / 2;
};
