import type { Color } from "three";

import { CanvasTexture, Group, Mesh, PlaneGeometry, SRGBColorSpace } from "three";

import { slab } from "./island";
import type { Stage } from "./island";

export type ChipOptions = { text: string; size: number; maxWidth: number; lines?: number };

export type Chip = {
  group: Group;
  width: number;
  height: number;
  set: (o: { opacity: number; tint: number; check: boolean; outline: number; glass: Color; success: Color }) => void;
  dispose: () => void;
};

const PX = 420;

let mono = "";

const fontStack = (): string => (mono ||= getComputedStyle(document.documentElement).getPropertyValue("--mono").trim() || "monospace");

const canvas2d = (width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D | undefined] => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));
  // A CPU-backed canvas uploads to WebGL without the GPU readback stall Chrome warns about.
  return [canvas, canvas.getContext("2d", { willReadFrequently: true }) ?? undefined];
};

const wrap = (context: CanvasRenderingContext2D, text: string, width: number, lines: number): string[] => {
  const words = text.trim().split(/\s+/);
  const rows: string[] = [];
  let row = "";
  for (const word of words) {
    const next = row ? `${row} ${word}` : word;
    if (context.measureText(next).width <= width || !row) row = next;
    else {
      rows.push(row);
      row = word;
    }
  }
  rows.push(row);
  if (rows.length <= lines) return rows;
  const kept = rows.slice(0, lines);
  let last = `${kept[lines - 1]} ${rows.slice(lines).join(" ")}`;
  while (last.length > 1 && context.measureText(`${last}…`).width > width) last = last.slice(0, -1);
  kept[lines - 1] = `${last.trimEnd()}…`;
  return kept;
};

const texture = (canvas: HTMLCanvasElement): CanvasTexture => {
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  return map;
};

let checkCanvas: HTMLCanvasElement | undefined;

const checkMark = (): HTMLCanvasElement => {
  if (checkCanvas) return checkCanvas;
  const [canvas, context] = canvas2d(96, 96);
  if (context) {
    context.fillStyle = "#fff";
    context.beginPath();
    context.arc(48, 48, 46, 0, Math.PI * 2);
    context.fill();
    context.globalCompositeOperation = "destination-out";
    context.lineWidth = 10;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(28, 50);
    context.lineTo(42, 64);
    context.lineTo(68, 34);
    context.stroke();
  }
  checkCanvas = canvas;
  return canvas;
};

export const createChip = (stage: Stage, { text, size, maxWidth, lines = 2 }: ChipOptions): Chip => {
  const font = `500 ${Math.round(size * PX)}px ${fontStack()}`;
  const pad = size * 0.9;
  const [, measure] = canvas2d(1, 1);
  if (measure) measure.font = font;
  const rows = measure ? wrap(measure, text, (maxWidth - pad * 2) * PX, lines) : [text];
  const textWidth = measure ? Math.max(...rows.map((row) => measure.measureText(row).width)) / PX : text.length * size * 0.6;
  const lineHeight = size * 1.45;
  const width = Math.min(maxWidth, textWidth + pad * 2);
  const height = rows.length * lineHeight + pad * 1.2;
  const radius = Math.min(height / 2, size * 1.6);

  const [labelCanvas, context] = canvas2d(width * PX, height * PX);
  if (context) {
    context.font = font;
    context.fillStyle = "#fff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    rows.forEach((row, i) => context.fillText(row, (width * PX) / 2, ((height / 2 + (i - (rows.length - 1) / 2) * lineHeight) * PX)));
  }

  const group = new Group();
  const glassMaterial = stage.material("glass");
  glassMaterial.thickness = 0.08;
  glassMaterial.transparent = true;
  const glass = new Mesh(slab({ width, height, depth: 0.06, radius }), glassMaterial);

  const outlineMaterial = stage.material("line");
  const outline = new Mesh(slab({ width: width + 0.05, height: height + 0.05, depth: 0.02, radius: radius + 0.025 }), outlineMaterial);
  outline.position.z = -0.03;

  const labelMaterial = stage.material("ink");
  const labelMap = texture(labelCanvas);
  labelMaterial.map = labelMap;
  const label = new Mesh(new PlaneGeometry(width, height), labelMaterial);
  label.position.z = 0.032;

  const checkMaterial = stage.material("ink");
  const checkMap = texture(checkMark());
  checkMaterial.map = checkMap;
  const check = new Mesh(new PlaneGeometry(size * 1.3, size * 1.3), checkMaterial);
  check.position.set(width / 2 - size * 0.2, height / 2 + size * 0.1, 0.04);

  group.add(outline, glass, label, check);

  const set = ({ opacity, tint, check: checked, outline: ring, glass: tone, success }: { opacity: number; tint: number; check: boolean; outline: number; glass: Color; success: Color }): void => {
    group.visible = opacity > 0.001;
    glassMaterial.opacity = opacity;
    glassMaterial.color.copy(tone).lerp(success, tint * 0.35);
    labelMaterial.opacity = opacity;
    outline.visible = ring > 0.001;
    outlineMaterial.opacity = ring * opacity;
    check.visible = checked;
    checkMaterial.color.copy(success);
    checkMaterial.opacity = opacity * tint;
  };

  const dispose = (): void => {
    group.removeFromParent();
    [glass, outline, label, check].forEach((mesh) => mesh.geometry.dispose());
    labelMap.dispose();
    checkMap.dispose();
    stage.discard(glassMaterial, outlineMaterial, labelMaterial, checkMaterial);
  };

  return { group, width, height, set, dispose };
};
