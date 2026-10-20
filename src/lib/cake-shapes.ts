// Cake shape geometry. All shapes are polygons in a 0..100 box so any preset can be edited as a custom outline.
export type Pt = [number, number];

const normalize = (pts: Pt[]): Pt[] => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return pts.map(([x, y]) => [+(((x - minX) / (maxX - minX)) * 100).toFixed(2), +(((y - minY) / (maxY - minY)) * 100).toFixed(2)]);
};
const polar = (n: number, r: (t: number) => number): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return [r(t) * Math.cos(t), r(t) * Math.sin(t)];
  });

export const PRESETS: Record<string, { label: string; w: number; h: number; points: () => Pt[] }> = {
  round: { label: "Round", w: 8, h: 8, points: () => normalize(polar(72, () => 1)) },
  square: {
    label: "Square", w: 8, h: 8,
    points: () => {
      const r = 6, out: Pt[] = [];
      const corners: [number, number, number][] = [[100 - r, 100 - r, 0], [r, 100 - r, 90], [r, r, 180], [100 - r, r, 270]];
      for (const [cx, cy, a0] of corners) for (let k = 0; k <= 6; k++) { const a = ((a0 + k * 15) * Math.PI) / 180; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
      return normalize(out);
    },
  },
  rectangle: { label: "Rectangle", w: 12, h: 8, points: () => PRESETS.square.points() },
  heart: {
    label: "Heart", w: 9, h: 8,
    points: () => normalize(Array.from({ length: 80 }, (_, i) => { const t = (i / 80) * Math.PI * 2; return [16 * Math.sin(t) ** 3, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))] as Pt; })),
  },
  star: {
    label: "Star", w: 9, h: 9,
    points: () => normalize(Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? 0.45 : 1; return [r * Math.cos(a), r * Math.sin(a)] as Pt; })),
  },
  flower: { label: "Flower", w: 9, h: 9, points: () => normalize(polar(96, (t) => 0.78 + 0.22 * Math.cos(6 * t))) },
  crown: { label: "Crown", w: 10, h: 8, points: () => normalize([[5, 95], [5, 30], [27, 58], [50, 12], [73, 58], [95, 30], [95, 95]]) },
  butterfly: {
    label: "Butterfly", w: 10, h: 8,
    points: () => normalize(polar(120, (t) => Math.exp(Math.sin(t + Math.PI / 2)) - 2 * Math.cos(4 * (t + Math.PI / 2)) + 2.6).map(([x, y]) => [y, x] as Pt)),
  },
  jersey: { label: "Jersey / T-shirt", w: 10, h: 10, points: () => normalize([[32, 4], [42, 4], [50, 13], [58, 4], [68, 4], [96, 20], [86, 40], [76, 34], [76, 96], [24, 96], [24, 34], [14, 40], [4, 20]]) },
  car: { label: "Car", w: 12, h: 6, points: () => normalize([[3, 78], [3, 58], [14, 52], [30, 28], [66, 28], [82, 50], [97, 55], [97, 78], [85, 78], [80, 88], [70, 88], [65, 78], [35, 78], [30, 88], [20, 88], [15, 78]]) },
};

export const pathFromPoints = (pts: Pt[], bx: number, by: number, bw: number, bh: number, flip = false) =>
  pts.length < 3 ? "" : "M" + pts.map(([x, y]) => `${(bx + ((flip ? 100 - x : x) / 100) * bw).toFixed(1)} ${(by + (y / 100) * bh).toFixed(1)}`).join(" L") + " Z";

/** Ramer–Douglas–Peucker simplification for freehand drawings. */
export function simplify(pts: Pt[], eps = 1.2): Pt[] {
  if (pts.length < 3) return pts;
  const d = (p: Pt, a: Pt, b: Pt) => {
    const [x, y] = p, [x1, y1] = a, [x2, y2] = b;
    const l = Math.hypot(x2 - x1, y2 - y1) || 1;
    return Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) / l;
  };
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) { const v = d(pts[i], pts[0], pts[pts.length - 1]); if (v > max) { max = v; idx = i; } }
  if (max > eps) return [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)];
  return [pts[0], pts[pts.length - 1]];
}

/** Outline SVG at physical size, usable as a cutting template. */
export function outlineSvg(shape: { kind: string; preset?: string; text?: string; points?: Pt[]; widthIn: number; heightIn: number; flip?: boolean }) {
  const w = shape.widthIn, h = shape.heightIn;
  const vb = `0 0 ${w * 100} ${h * 100}`;
  let body: string;
  if (shape.kind === "number" || shape.kind === "letter") {
    body = `<text x="${w * 50}" y="${h * 50}" text-anchor="middle" dominant-baseline="central" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${h * 95}" textLength="${w * 96}" lengthAdjust="spacingAndGlyphs" fill="none" stroke="#000" stroke-width="4">${escapeXml(shape.text ?? "")}</text>`;
  } else {
    const pts = shape.points?.length ? shape.points : PRESETS[shape.preset ?? "round"].points();
    body = `<path d="${pathFromPoints(pts, 2, 2, w * 100 - 4, h * 100 - 4, shape.flip)}" fill="none" stroke="#000" stroke-width="4" stroke-dasharray="12 6"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}in" height="${h}in" viewBox="${vb}">${body}<text x="10" y="${h * 100 - 10}" font-size="18" font-family="Arial">Pipilika cake outline ${w}in × ${h}in</text></svg>`;
}

export const escapeXml = (s: string) => s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
