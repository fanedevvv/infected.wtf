import type { CSSProperties } from "react";

// Avatar shapes. Every shape is inscribed in the avatar's circle, so circular decoration frames
// (and anything else drawn around the avatar) sit on all of them exactly as they do on a circle.

export type AvatarShape = "circle" | "squircle" | "hexagon" | "octagon" | "flower" | "burst" | "pixel" | "blob";

export const AVATAR_SHAPES: { id: AvatarShape; label: string }[] = [
  { id: "circle", label: "Circle" },
  { id: "squircle", label: "Squircle" },
  { id: "hexagon", label: "Hexagon" },
  { id: "octagon", label: "Octagon" },
  { id: "flower", label: "Flower" },
  { id: "burst", label: "Burst" },
  { id: "pixel", label: "Pixel" },
  { id: "blob", label: "Blob" },
];

// Shapes from before this set map to the closest one that still fits a decoration.
const LEGACY: Record<string, AvatarShape> = {
  square: "squircle", soft: "squircle", rounded: "squircle", egg: "circle", eye: "circle",
  diamond: "hexagon", heart: "flower", star: "burst", sun: "burst",
};

const KNOWN = new Set<string>(AVATAR_SHAPES.map((s) => s.id));

export function resolveShape(value: string | null | undefined): AvatarShape {
  const id = value ? (LEGACY[value] ?? value) : "circle";
  return KNOWN.has(id) ? (id as AvatarShape) : "circle";
}

/** A polygon() from a radius function r(θ) in [0, 1] of the avatar's radius. */
function radial(points: number, r: (theta: number) => number, rotate = -Math.PI / 2) {
  const pts: string[] = [];
  for (let i = 0; i < points; i++) {
    const t = rotate + (i / points) * Math.PI * 2;
    const k = r(t);
    pts.push(`${(50 + Math.cos(t) * k * 50).toFixed(2)}% ${(50 + Math.sin(t) * k * 50).toFixed(2)}%`);
  }
  return `polygon(${pts.join(",")})`;
}

/** Superellipse (n = 4), scaled so its corners touch the circle. */
function squircle() {
  const n = 4;
  const corner = Math.pow(0.5, 1 / n) * Math.SQRT2; // distance of the 45° point on the unit superellipse
  const pts: string[] = [];
  for (let i = 0; i < 64; i++) {
    const t = (i / 64) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) / corner;
    const y = Math.sign(s) * Math.pow(Math.abs(s), 2 / n) / corner;
    pts.push(`${(50 + x * 50).toFixed(2)}% ${(50 + y * 50).toFixed(2)}%`);
  }
  return `polygon(${pts.join(",")})`;
}

/** A circle drawn on an 8×8 grid: every cell whose centre is inside the circle. */
function pixel() {
  const N = 8, cell = 100 / N;
  const inside = (col: number, row: number) => Math.hypot(col + 0.5 - N / 2, row + 0.5 - N / 2) <= N / 2;
  // Walk the outline row by row: right edge going down, then left edge coming back up.
  const right: string[] = [], left: string[] = [];
  for (let row = 0; row < N; row++) {
    let first = -1, last = -1;
    for (let col = 0; col < N; col++) if (inside(col, row)) { if (first < 0) first = col; last = col; }
    if (first < 0) continue;
    const y0 = (row * cell).toFixed(2), y1 = ((row + 1) * cell).toFixed(2);
    right.push(`${((last + 1) * cell).toFixed(2)}% ${y0}%`, `${((last + 1) * cell).toFixed(2)}% ${y1}%`);
    left.unshift(`${(first * cell).toFixed(2)}% ${y1}%`, `${(first * cell).toFixed(2)}% ${y0}%`);
  }
  return `polygon(${[...right, ...left].join(",")})`;
}

const CLIP: Record<AvatarShape, string> = {
  circle: "circle(50% at 50% 50%)",
  squircle: squircle(),
  hexagon: radial(6, () => 1),
  octagon: radial(8, () => 1, -Math.PI / 2 + Math.PI / 8),
  flower: radial(96, (t) => 0.9 + 0.1 * Math.cos(8 * t)),
  burst: radial(96, (t) => 0.88 + 0.12 * Math.pow(Math.abs(Math.cos(6 * t)), 3)),
  pixel: pixel(),
  blob: radial(96, (t) => 0.93 + 0.045 * Math.sin(3 * t + 0.6) + 0.025 * Math.cos(5 * t)),
};

/** CSS clip-path for a stored shape value (legacy values included). */
export function shapeClip(value: string | null | undefined) {
  return CLIP[resolveShape(value)];
}

/** Inline style that applies the shape to an `.avatar-wrapper`'s image. */
export function shapeStyle(value: string | null | undefined): CSSProperties {
  return { ["--avatar-clip" as string]: shapeClip(value) };
}
