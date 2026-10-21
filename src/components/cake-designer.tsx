"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PRESETS, pathFromPoints, simplify, outlineSvg, type Pt } from "@/lib/cake-shapes";
import { priceCake, PricingError, type CakeConfig } from "@/lib/pricing";
import { tk, weightLabel } from "@/lib/format";
import { api, useAction, Alert, fileToDataUrl } from "./ui";
import { track } from "./analytics";

// ---------- Types ----------
type Opt = { id: string; kind: string; name: string; price: number; meta?: any };
export type DesignerConfig = {
  bases: { id: string; name: string }[];
  weights: { grams: number; label: string }[];
  basePrices: CakeConfig["basePrices"];
  options: Opt[];
  gallery: { id: string; title: string; image: string; minWeightG: number | null; designData: any }[];
  zones: { id: string; name: string; charge: number }[];
  features: Record<string, boolean>;
};
type ImgLayer = { src: string; original?: string; x: number; y: number; scale: number; rotate: number; aspect: number; removeBg: boolean };
type TextLayer = { id: string; text: string; x: number; y: number; size: number; color: string; font: string; rotate: number };
type Shape = { kind: "preset" | "number" | "letter" | "custom"; preset: string; text: string; points: Pt[]; widthIn: number; heightIn: number; flip: boolean };
export type DesignState = {
  v: 1;
  start: "upload" | "gallery" | "text" | "theme";
  galleryId?: string | null;
  theme?: string;
  shape: Shape;
  baseId: string;
  grams: number;
  fillingIds: string[];
  decorationIds: string[];
  extraIds: string[];
  printId: string | null;
  boardId: string | null;
  cream: string;
  accent: string;
  board: { shape: "round" | "square" | "same"; color: string; sizeIn: number };
  image: ImgLayer | null;
  texts: TextLayer[];
  printType: "NONE" | "TOPPER" | "SUGAR" | "WAFFLE";
  printSizeIn: number;
  note: string;
  sendPhotoLater: boolean;
};

const FONTS: Record<string, string> = {
  Classic: "Georgia, 'Times New Roman', serif",
  Script: "'Brush Script MT', 'Segoe Script', cursive",
  Bold: "'Arial Black', Impact, Arial, sans-serif",
  Playful: "'Comic Sans MS', 'Chalkboard SE', cursive",
};
const CREAMS = ["#fff7ee", "#fde2e4", "#f9c6cf", "#ffd6a5", "#cdeac0", "#bde0fe", "#e4c1f9", "#5b3a29", "#ffffff", "#b3161f"];
const THEMES = ["🎂 Happy Birthday", "💍 Wedding", "🧸 Kids cartoon", "⚽ Sports", "🎓 Graduation", "🌸 Floral", "👑 Princess", "🚗 Cars"];
const V = 400; // SVG viewBox size
const uid = () => Math.random().toString(36).slice(2, 9);

const initial = (cfg: DesignerConfig): DesignState => ({
  v: 1,
  start: "upload",
  shape: { kind: "preset", preset: "round", text: "18", points: [], widthIn: 8, heightIn: 8, flip: false },
  baseId: cfg.bases[0]?.id ?? "",
  grams: 1000,
  fillingIds: [],
  decorationIds: [],
  extraIds: [],
  printId: null,
  boardId: cfg.options.find((o) => o.kind === "BOARD")?.id ?? null,
  cream: CREAMS[0],
  accent: "#b3161f",
  board: { shape: "round", color: "#e0b04f", sizeIn: 10 },
  image: null,
  texts: [{ id: uid(), text: "Happy Birthday", x: 0.5, y: 0.78, size: 0.085, color: "#b3161f", font: "Script", rotate: 0 }],
  printType: "NONE",
  printSizeIn: 6,
  note: "",
  sendPhotoLater: false,
});

async function urlToDataUrl(url: string) {
  const b = await (await fetch(url)).blob();
  return new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(b); });
}
const imgAspect = (src: string) => new Promise<number>((res) => { const i = new Image(); i.onload = () => res(i.width / i.height || 1); i.onerror = () => res(1); i.src = src; });

/** Browser fallback background removal: flood-fills from the borders, clearing pixels close to the edge colour. */
async function removeBgLocal(src: string, tolerance = 42): Promise<string> {
  const img = new Image();
  await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = src; });
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  const { width: w, height: h, data } = d;
  const at = (x: number, y: number) => (y * w + x) * 4;
  const corners = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
  const ref = [0, 1, 2].map((k) => corners.reduce((a, i) => a + data[i + k], 0) / 4);
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) stack.push(x, 0, x, h - 1);
  for (let y = 0; y < h; y++) stack.push(0, y, w - 1, y);
  while (stack.length) {
    const y = stack.pop()!, x = stack.pop()!;
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const p = y * w + x;
    if (seen[p]) continue;
    seen[p] = 1;
    const i = p * 4;
    const dist = Math.hypot(data[i] - ref[0], data[i + 1] - ref[1], data[i + 2] - ref[2]);
    if (dist > tolerance) continue;
    data[i + 3] = dist > tolerance * 0.6 ? Math.round(255 * ((dist - tolerance * 0.6) / (tolerance * 0.4))) : 0;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
  ctx.putImageData(d, 0, 0);
  return c.toDataURL("image/png");
}

async function svgToPng(svg: string, size: number, h?: number) {
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await img.decode();
  const c = document.createElement("canvas");
  c.width = size; c.height = h ?? size;
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/png");
}

// ---------- Component ----------
type Mode = "customer" | "pos";
export function CakeDesigner({ config: cfg, mode = "customer", initialGalleryId, loggedIn, onPosSubmit, user }: {
  config: DesignerConfig; mode?: Mode; initialGalleryId?: string; loggedIn?: boolean;
  onPosSubmit?: (payload: any) => Promise<void>;
  user?: { name: string; phone: string } | null;
}) {
  const router = useRouter();
  const [s, setS] = useState<DesignState>(() => initial(cfg));
  const [step, setStep] = useState(0);
  const [sel, setSel] = useState<string | null>(null); // "image" | text id | null
  const [shapeEdit, setShapeEdit] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [traceGuide, setTraceGuide] = useState(true);
  const [snap, setSnap] = useState(true);
  const [selPt, setSelPt] = useState<number | null>(null);
  const [history, setHistory] = useState<Pt[][]>([]);
  const [future, setFuture] = useState<Pt[][]>([]);
  const [bgBusy, setBgBusy] = useState(false);
  const [cust, setCust] = useState({ name: user?.name ?? "", phone: user?.phone ?? "", fulfillment: "DELIVERY", zoneId: cfg.zones[0]?.id ?? "", address: "", deliveryDate: "" });
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<null | { kind: string; id?: string; start: [number, number]; orig: any; drawing?: Pt[] }>(null);
  const a = useAction();
  const startedRef = useRef(false);

  const up = (patch: Partial<DesignState>) => setS((c) => ({ ...c, ...patch }));
  const upShape = (patch: Partial<Shape>) => setS((c) => ({ ...c, shape: { ...c.shape, ...patch } }));
  const byKind = (k: string) => cfg.options.filter((o) => o.kind === k);
  const galleryItem = cfg.gallery.find((g) => g.id === s.galleryId);
  const shapeOpt = useMemo(() => {
    const k = s.shape.kind === "preset" ? (["round", "square", "rectangle"].includes(s.shape.preset) ? "standard" : "shaped") : s.shape.kind;
    return cfg.options.find((o) => o.kind === "SHAPE" && o.meta?.category === k) ?? null;
  }, [s.shape.kind, s.shape.preset, cfg.options]);
  const printOpt = useMemo(() => cfg.options.find((o) => o.kind === "PRINT" && o.meta?.printType === s.printType) ?? null, [s.printType, cfg.options]);
  const zone = cfg.zones.find((z) => z.id === cust.zoneId);

  const price = useMemo(() => {
    try {
      return { ok: true as const, ...priceCake(
        { basePrices: cfg.basePrices, options: cfg.options },
        { baseId: s.baseId, grams: s.grams, fillingIds: s.fillingIds, decorationIds: s.decorationIds, extraIds: s.extraIds, boardId: s.boardId, printId: printOpt?.id ?? null, shapeId: shapeOpt?.id ?? null, minWeightG: galleryItem?.minWeightG ?? null, deliveryCharge: mode === "customer" && cust.fulfillment === "DELIVERY" ? zone?.charge ?? 0 : 0 },
      ) };
    } catch (e) {
      return { ok: false as const, error: e instanceof PricingError ? e.message : "Choose your options" };
    }
  }, [s, cfg, printOpt, shapeOpt, galleryItem, zone, cust.fulfillment, mode]);

  useEffect(() => {
    if (!startedRef.current) { startedRef.current = true; track("custom_cake_started"); }
    if (initialGalleryId) pickGallery(initialGalleryId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- geometry ----------
  const maxIn = Math.max(s.shape.widthIn, s.shape.heightIn);
  const boardScale = Math.min(1.3, Math.max(1.05, s.board.sizeIn / maxIn));
  const cakeMax = Math.min(300, 360 / boardScale);
  const bw = (cakeMax * s.shape.widthIn) / maxIn, bh = (cakeMax * s.shape.heightIn) / maxIn;
  const bx = (V - bw) / 2, by = (V - bh) / 2 - 6;
  const shapePoints = s.shape.kind === "custom" ? s.shape.points : s.shape.kind === "preset" ? PRESETS[s.shape.preset]?.points() ?? [] : [];
  const isText = s.shape.kind === "number" || s.shape.kind === "letter";
  const shapePath = isText ? "" : pathFromPoints(shapePoints, bx, by, bw, bh, s.shape.flip);
  const shapeEl = (props: Record<string, any>) =>
    isText ? (
      <text x={V / 2} y={by + bh / 2} textAnchor="middle" dominantBaseline="central" fontFamily="'Arial Black', Arial, sans-serif" fontWeight={900} fontSize={bh * 0.95} textLength={bw} lengthAdjust="spacingAndGlyphs" {...props}>{s.shape.text || "1"}</text>
    ) : (
      <path d={shapePath} {...props} />
    );

  const toSvg = (e: React.PointerEvent | PointerEvent): [number, number] => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return [p.x, p.y];
  };
  const toShapeUnits = ([x, y]: [number, number]): Pt => {
    let ux = ((x - bx) / bw) * 100, uy = ((y - by) / bh) * 100;
    if (s.shape.flip) ux = 100 - ux;
    if (snap) { ux = Math.round(ux / 5) * 5; uy = Math.round(uy / 5) * 5; }
    return [Math.max(0, Math.min(100, +ux.toFixed(1))), Math.max(0, Math.min(100, +uy.toFixed(1)))];
  };
  const pushHistory = () => { setHistory((h) => [...h.slice(-30), s.shape.points]); setFuture([]); };

  const onDown = (e: React.PointerEvent, kind: string, id?: string) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toSvg(e);
    if (kind === "image" || kind === "text") setSel(kind === "image" ? "image" : id!);
    if (kind === "pt") { setSelPt(Number(id)); pushHistory(); }
    const orig = kind === "image" ? s.image : kind === "text" ? s.texts.find((t) => t.id === id) : kind === "pt" ? s.shape.points[Number(id)] : null;
    drag.current = { kind, id, start: p, orig };
  };
  const onCanvasDown = (e: React.PointerEvent) => {
    if (shapeEdit && drawMode) {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      pushHistory();
      drag.current = { kind: "draw", start: toSvg(e), orig: null, drawing: [toShapeUnits(toSvg(e))] };
    } else setSel(null);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = toSvg(e);
    const dx = (p[0] - d.start[0]) / bw, dy = (p[1] - d.start[1]) / bh;
    if (d.kind === "image" && s.image) up({ image: { ...s.image, x: d.orig.x + dx, y: d.orig.y + dy } });
    else if (d.kind === "text") up({ texts: s.texts.map((t) => (t.id === d.id ? { ...t, x: d.orig.x + dx, y: d.orig.y + dy } : t)) });
    else if (d.kind === "pt") { const np = toShapeUnits(p); upShape({ points: s.shape.points.map((q, i) => (i === Number(d.id) ? np : q)) }); }
    else if (d.kind === "draw" && d.drawing) { d.drawing.push(toShapeUnits(p)); upShape({ kind: "custom", points: [...d.drawing] }); }
  };
  const onUp = () => {
    const d = drag.current;
    if (d?.kind === "draw" && d.drawing && d.drawing.length > 3) {
      const simp = simplify(d.drawing, 1.5);
      upShape({ kind: "custom", points: simp.length >= 3 ? simp : d.drawing });
      setDrawMode(false);
    }
    drag.current = null;
  };
  const addPointOnEdge = (e: React.MouseEvent) => {
    if (!shapeEdit || drawMode || s.shape.kind !== "custom") return;
    const p = toShapeUnits(toSvg(e as unknown as PointerEvent));
    const pts = s.shape.points;
    let best = 0, bestD = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const a1 = pts[i], b1 = pts[(i + 1) % pts.length];
      const dd = Math.hypot(p[0] - a1[0], p[1] - a1[1]) + Math.hypot(p[0] - b1[0], p[1] - b1[1]) - Math.hypot(a1[0] - b1[0], a1[1] - b1[1]);
      if (dd < bestD) { bestD = dd; best = i; }
    }
    pushHistory();
    const np = [...pts];
    np.splice(best + 1, 0, p);
    upShape({ points: np });
  };

  // ---------- actions ----------
  async function pickGallery(id: string) {
    const g = cfg.gallery.find((x) => x.id === id);
    if (!g) return;
    const src = await urlToDataUrl(g.image).catch(() => g.image);
    const aspect = await imgAspect(src);
    const dd = g.designData ?? {};
    setS((c) => ({
      ...c, start: "gallery", galleryId: id,
      image: { src, x: 0.5, y: 0.45, scale: 0.7, rotate: 0, aspect, removeBg: false },
      grams: Math.max(c.grams, g.minWeightG ?? 0),
      ...(dd.shape ? { shape: { ...c.shape, ...dd.shape } } : {}),
      ...(dd.cream ? { cream: dd.cream } : {}),
    }));
  }
  async function onUpload(file?: File) {
    if (!file) return;
    try {
      const src = await fileToDataUrl(file, 1600);
      const aspect = await imgAspect(src);
      up({ start: "upload", galleryId: null, image: { src, original: src, x: 0.5, y: 0.45, scale: 0.62, rotate: 0, aspect, removeBg: false }, sendPhotoLater: false });
      setSel("image");
      track("image_uploaded");
    } catch (e) {
      a.setError((e as Error).message);
    }
  }
  async function toggleRemoveBg(on: boolean) {
    if (!s.image) return;
    if (!on) return up({ image: { ...s.image, src: s.image.original ?? s.image.src, removeBg: false } });
    setBgBusy(true);
    try {
      const base = s.image.original ?? s.image.src;
      let out: string | null = null;
      try {
        const r = await api<{ dataUrl: string | null }>("/api/v1/designs/remove-bg", { body: { image: base } });
        out = r.dataUrl;
      } catch {}
      if (!out) out = await removeBgLocal(base);
      up({ image: { ...s.image, original: base, src: out, removeBg: true } });
    } catch {
      a.setError("Could not remove background automatically. You can continue without it.");
    } finally {
      setBgBusy(false);
    }
  }
  const selText = s.texts.find((t) => t.id === sel);
  const nudge = (dx: number, dy: number) => {
    if (sel === "image" && s.image) up({ image: { ...s.image, x: s.image.x + dx, y: s.image.y + dy } });
    else if (selText) up({ texts: s.texts.map((t) => (t.id === selText.id ? { ...t, x: t.x + dx, y: t.y + dy } : t)) });
  };
  const centerSel = () => {
    if (sel === "image" && s.image) up({ image: { ...s.image, x: 0.5, y: 0.5 } });
    else if (selText) up({ texts: s.texts.map((t) => (t.id === selText.id ? { ...t, x: 0.5 } : t)) });
  };
  const toCustom = () => {
    const pts = s.shape.kind === "preset" ? PRESETS[s.shape.preset].points() : PRESETS.round.points();
    const step = Math.max(1, Math.floor(pts.length / 24));
    pushHistory();
    upShape({ kind: "custom", points: pts.filter((_, i) => i % step === 0) });
    setShapeEdit(true);
  };

  // ---------- export ----------
  function cleanSvg(printOnly: boolean) {
    const node = svgRef.current!.cloneNode(true) as SVGSVGElement;
    node.querySelectorAll("[data-ui]").forEach((n) => n.remove());
    node.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    node.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    if (printOnly) {
      node.querySelectorAll("[data-cake]").forEach((n) => n.remove());
      node.setAttribute("viewBox", `${bx} ${by} ${bw} ${bh}`);
    } else {
      const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bg.setAttribute("width", String(V)); bg.setAttribute("height", String(V)); bg.setAttribute("fill", "#fdf7f1");
      node.insertBefore(bg, node.firstChild);
    }
    return new XMLSerializer().serializeToString(node);
  }
  async function buildPayload() {
    setSel(null); setShapeEdit(false);
    await new Promise((r) => setTimeout(r, 50));
    const preview = await svgToPng(cleanSvg(false), 900);
    const hasArt = !!s.image || s.texts.some((t) => t.text.trim());
    const printW = 1800, printH = Math.round((1800 * bh) / bw);
    const print = hasArt ? await svgToPng(cleanSvg(true), printW, printH) : null;
    const summary = [
      cfg.bases.find((b) => b.id === s.baseId)?.name, weightLabel(s.grams),
      isText ? `${s.shape.kind} "${s.shape.text}"` : s.shape.kind === "custom" ? "custom shape" : PRESETS[s.shape.preset]?.label,
      ...s.fillingIds.map((id) => cfg.options.find((o) => o.id === id)?.name),
    ].filter(Boolean).join(" · ");
    const data = { ...s, image: s.image ? { ...s.image, src: undefined, original: undefined } : null, summary };
    return {
      data,
      preview,
      print,
      original: s.image?.original ?? (s.start === "upload" ? s.image?.src : undefined) ?? null,
      bgRemoved: s.image?.removeBg ? s.image.src : null,
      outlineSvg: outlineSvg({ ...s.shape, preset: s.shape.preset }),
      selection: { baseId: s.baseId, grams: s.grams, fillingIds: s.fillingIds, decorationIds: s.decorationIds, extraIds: s.extraIds, boardId: s.boardId, printType: s.printType, shapeCategory: shapeOpt?.meta?.category ?? null, galleryId: s.galleryId ?? null },
    };
  }
  async function submit() {
    if (!price.ok) return a.setError(price.error);
    if (mode === "pos" && onPosSubmit) return a.run(async () => onPosSubmit(await buildPayload()));
    if (!cust.name.trim() || !cust.phone.trim()) return a.setError("Please enter your name and phone number");
    if (cust.fulfillment === "DELIVERY" && !cust.address.trim()) return a.setError("Please enter the delivery address");
    await a.run(async () => {
      const payload = await buildPayload();
      const r = await api<{ token: string }>("/api/v1/designs", { body: { ...payload, customer: cust, source: sessionStorage.getItem("pp_src") } });
      track("custom_design_submitted", { value: price.total, currency: "BDT" });
      router.push(`/o/${r.token}?new=1`);
    });
  }
  async function saveDraft() {
    await a.run(async () => {
      const payload = await buildPayload();
      await api("/api/v1/designs/save", { body: payload });
    }, "Design saved to your account.");
  }

  // ---------- UI helpers ----------
  const Chip = ({ on, onClick, children, sub }: { on: boolean; onClick: () => void; children: React.ReactNode; sub?: string }) => (
    <button type="button" onClick={onClick} aria-pressed={on} className={`rounded-xl border px-3 py-2 text-left text-sm transition ${on ? "border-brand bg-blush font-semibold text-brand" : "border-line bg-white hover:border-brand/40"}`}>
      {children}{sub && <span className="block text-xs font-normal text-muted">{sub}</span>}
    </button>
  );
  const toggleIn = (key: "fillingIds" | "decorationIds" | "extraIds", id: string, single = false) =>
    setS((c) => ({ ...c, [key]: single ? (c[key].includes(id) ? [] : [id]) : c[key].includes(id) ? c[key].filter((x) => x !== id) : [...c[key], id] }));
  const optPrice = (o: Opt) => (o.price ? `+${tk(o.price)}${o.meta?.perKg ? "/kg" : ""}` : "Free");
  const STEPS = ["Start", "Shape", "Cake", "Style", "Design", mode === "pos" ? "Save" : "Order"];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      {/* ---------- Live preview ---------- */}
      <div className="min-w-0 lg:order-2">
        <div className="card sticky top-20 p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <b>Live preview</b>
            <span className="text-muted">{s.shape.widthIn}″ × {s.shape.heightIn}″ · {weightLabel(s.grams)}</span>
          </div>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${V} ${V}`}
            className={`w-full touch-none select-none rounded-xl bg-[#fdf7f1] ${shapeEdit && drawMode ? "cursor-crosshair" : ""}`}
            onPointerDown={onCanvasDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onDoubleClick={addPointOnEdge}
            role="img"
            aria-label="Cake design preview"
          >
            <defs>
              <clipPath id="cakeClip">{shapeEl({})}</clipPath>
              <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="6" floodOpacity="0.18" /></filter>
            </defs>
            {/* board */}
            <g data-cake="board">
              {s.board.shape === "round" && <ellipse cx={V / 2} cy={by + bh / 2 + 8} rx={(bw * boardScale) / 2 + 8} ry={(bh * boardScale) / 2 + 8} fill={s.board.color} filter="url(#soft)" />}
              {s.board.shape === "square" && <rect x={V / 2 - (bw * boardScale) / 2 - 8} y={by + bh / 2 + 8 - (bh * boardScale) / 2 - 8} width={bw * boardScale + 16} height={bh * boardScale + 16} rx={10} fill={s.board.color} filter="url(#soft)" />}
              {s.board.shape === "same" && <g transform={`translate(${V / 2} ${by + bh / 2 + 8}) scale(${boardScale + 0.05}) translate(${-V / 2} ${-(by + bh / 2)})`}>{shapeEl({ fill: s.board.color, filter: "url(#soft)" })}</g>}
            </g>
            {/* cake body: side + top */}
            <g data-cake="body">
              <g transform="translate(0 12)">{shapeEl({ fill: s.cream, stroke: "rgba(0,0,0,.12)", strokeWidth: 2, style: { filter: "brightness(.88)" } })}</g>
              {shapeEl({ fill: s.cream, stroke: "rgba(0,0,0,.08)", strokeWidth: 1.5 })}
            </g>
            {/* tracing guide */}
            {shapeEdit && traceGuide && s.image && (
              <image data-ui href={s.image.src} x={bx} y={by} width={bw} height={bh} opacity={0.35} preserveAspectRatio="xMidYMid meet" />
            )}
            {/* art layers clipped to cake top */}
            <g clipPath="url(#cakeClip)">
              {s.image && (() => {
                const w = s.image.scale * bw, h = w / s.image.aspect;
                const cx = bx + s.image.x * bw, cy = by + s.image.y * bh;
                return (
                  <image href={s.image.src} x={cx - w / 2} y={cy - h / 2} width={w} height={h} transform={`rotate(${s.image.rotate} ${cx} ${cy})`} preserveAspectRatio="xMidYMid meet"
                    onPointerDown={(e) => !shapeEdit && onDown(e, "image")} style={{ cursor: shapeEdit ? "default" : "move" }} />
                );
              })()}
              {s.texts.map((t) => {
                const cx = bx + t.x * bw, cy = by + t.y * bh, fs = t.size * bw;
                const ls = t.text.split("\n");
                return (
                  <text key={t.id} x={cx} y={cy - ((ls.length - 1) * fs * 1.1) / 2} textAnchor="middle" dominantBaseline="central" fill={t.color} fontFamily={FONTS[t.font]} fontSize={fs} fontWeight={t.font === "Bold" ? 900 : 600}
                    transform={`rotate(${t.rotate} ${cx} ${cy})`} onPointerDown={(e) => !shapeEdit && onDown(e, "text", t.id)} style={{ cursor: shapeEdit ? "default" : "move" }}>
                    {ls.map((l, i) => <tspan key={i} x={cx} dy={i ? fs * 1.1 : 0}>{l}</tspan>)}
                  </text>
                );
              })}
            </g>
            {/* piping border */}
            <g data-cake="deco">{shapeEl({ fill: "none", stroke: s.accent, strokeWidth: 5, strokeDasharray: "1 9", strokeLinecap: "round", opacity: 0.9 })}</g>
            {/* selection box */}
            {sel === "image" && s.image && !shapeEdit && (() => {
              const w = s.image.scale * bw, h = w / s.image.aspect, cx = bx + s.image.x * bw, cy = by + s.image.y * bh;
              return <rect data-ui x={cx - w / 2} y={cy - h / 2} width={w} height={h} fill="none" stroke="#e0b04f" strokeDasharray="5 4" strokeWidth={2} transform={`rotate(${s.image.rotate} ${cx} ${cy})`} pointerEvents="none" />;
            })()}
            {/* shape anchors */}
            {shapeEdit && s.shape.kind === "custom" && !drawMode && (
              <g data-ui>
                {s.shape.points.map(([x, y], i) => (
                  <circle key={i} cx={bx + ((s.shape.flip ? 100 - x : x) / 100) * bw} cy={by + (y / 100) * bh} r={selPt === i ? 8 : 6} fill={selPt === i ? "#b3161f" : "#fff"} stroke="#b3161f" strokeWidth={2} style={{ cursor: "grab" }} onPointerDown={(e) => onDown(e, "pt", String(i))} />
                ))}
              </g>
            )}
            {shapeEdit && snap && <g data-ui pointerEvents="none" opacity={0.25}>{Array.from({ length: 21 }, (_, i) => <line key={i} x1={bx + (i * bw) / 20} x2={bx + (i * bw) / 20} y1={by} y2={by + bh} stroke="#7d665e" strokeWidth={0.5} />)}{Array.from({ length: 21 }, (_, i) => <line key={"h" + i} y1={by + (i * bh) / 20} y2={by + (i * bh) / 20} x1={bx} x2={bx + bw} stroke="#7d665e" strokeWidth={0.5} />)}</g>}
          </svg>
          {(sel === "image" || selText) && !shapeEdit && (
            <div className="mt-3 grid gap-2 rounded-xl bg-cream p-3 text-sm">
              <div className="flex items-center justify-between"><b>{sel === "image" ? "Image" : "Text"} selected</b><button className="text-muted underline" onClick={() => setSel(null)}>Done</button></div>
              <div className="flex flex-wrap items-center gap-1">
                <button className="btn-outline btn-sm" onClick={() => nudge(0, -0.02)} aria-label="Move up">↑</button>
                <button className="btn-outline btn-sm" onClick={() => nudge(0, 0.02)} aria-label="Move down">↓</button>
                <button className="btn-outline btn-sm" onClick={() => nudge(-0.02, 0)} aria-label="Move left">←</button>
                <button className="btn-outline btn-sm" onClick={() => nudge(0.02, 0)} aria-label="Move right">→</button>
                <button className="btn-outline btn-sm" onClick={centerSel}>Center</button>
              </div>
              {sel === "image" && s.image && (
                <>
                  <label className="flex items-center gap-2">Size<input type="range" min={0.15} max={1.6} step={0.01} value={s.image.scale} onChange={(e) => up({ image: { ...s.image!, scale: +e.target.value } })} className="flex-1 accent-brand" /></label>
                  <label className="flex items-center gap-2">Rotate<input type="range" min={-180} max={180} value={s.image.rotate} onChange={(e) => up({ image: { ...s.image!, rotate: +e.target.value } })} className="flex-1 accent-brand" /></label>
                </>
              )}
              {selText && (
                <>
                  <label className="flex items-center gap-2">Size<input type="range" min={0.03} max={0.25} step={0.005} value={selText.size} onChange={(e) => up({ texts: s.texts.map((t) => (t.id === selText.id ? { ...t, size: +e.target.value } : t)) })} className="flex-1 accent-brand" /></label>
                  <label className="flex items-center gap-2">Rotate<input type="range" min={-90} max={90} value={selText.rotate} onChange={(e) => up({ texts: s.texts.map((t) => (t.id === selText.id ? { ...t, rotate: +e.target.value } : t)) })} className="flex-1 accent-brand" /></label>
                </>
              )}
            </div>
          )}
          <p className="mt-2 text-xs text-muted">Preview is an approximation. Final cake may vary slightly due to real-world baking, cream texture, color and decoration limitations.</p>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-blush px-4 py-3">
            <span className="text-sm">Estimated price</span>
            <b className="text-2xl text-brand">{price.ok ? tk(price.total) : "—"}</b>
          </div>
          {!price.ok && <p className="mt-1 text-sm text-red-700">{price.error}</p>}
          {price.ok && (
            <details className="mt-2 text-xs text-muted">
              <summary className="cursor-pointer">Price breakdown</summary>
              <ul className="mt-1 grid gap-0.5">
                {Object.entries(price.breakdown).filter(([, v]) => v).map(([k, v]) => <li key={k} className="flex justify-between capitalize"><span>{k}</span><span>{k === "discount" ? "−" : ""}{tk(v)}</span></li>)}
              </ul>
            </details>
          )}
        </div>
      </div>

      {/* ---------- Steps ---------- */}
      <div className="min-w-0 lg:order-1">
        <ol className="mb-4 flex gap-1 overflow-x-auto pb-1" aria-label="Steps">
          {STEPS.map((t, i) => (
            <li key={t}><button type="button" onClick={() => setStep(i)} className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ${i === step ? "bg-brand text-white" : i < step ? "bg-blush text-brand" : "bg-white text-muted"}`}><span className="grid h-5 w-5 place-items-center rounded-full border border-current text-xs">{i + 1}</span>{t}</button></li>
          ))}
        </ol>

        <div className="card p-5">
          {step === 0 && (
            <div className="grid gap-5">
              <div>
                <h2 className="font-body text-lg font-bold">How would you like to start?</h2>
                <p className="text-sm text-muted">A photo is optional — you can design with text only, pick a previous design, or send the photo later on WhatsApp.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Chip on={s.start === "upload"} onClick={() => up({ start: "upload" })} sub="Photo, logo or character">📷 Upload an image</Chip>
                {cfg.gallery.length > 0 && <Chip on={s.start === "gallery"} onClick={() => up({ start: "gallery" })} sub="Order a similar design">🖼️ Pick from gallery</Chip>}
                <Chip on={s.start === "text"} onClick={() => up({ start: "text", image: null, galleryId: null })} sub="Just colours & writing">✍️ Text only</Chip>
                <Chip on={s.start === "theme"} onClick={() => up({ start: "theme" })} sub="Choose a theme topper">🎉 Theme topper</Chip>
              </div>
              {s.start === "upload" && (
                <div className="grid gap-3">
                  <label className="grid cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line bg-cream p-6 text-center text-sm hover:border-brand">
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => onUpload(e.target.files?.[0])} />
                    <span className="text-2xl">⇪</span>
                    <span className="font-semibold">Click to upload or drag & drop</span>
                    <span className="text-muted">PNG, JPG or WEBP (max 15 MB)</span>
                  </label>
                  {s.image && s.start === "upload" && (
                    <label className="flex items-center justify-between rounded-xl border border-line p-3 text-sm">
                      <span><b>Remove background?</b><br /><span className="text-muted">Good for photos of people or characters</span></span>
                      <span className="flex items-center gap-2">{bgBusy && <span className="text-xs text-muted">Working…</span>}
                        <input type="checkbox" className="h-5 w-5 accent-brand" checked={s.image.removeBg} disabled={bgBusy} onChange={(e) => toggleRemoveBg(e.target.checked)} /></span>
                    </label>
                  )}
                  {s.image && s.start === "upload" && (
                    <div className="grid grid-cols-2 gap-2 text-center text-xs text-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <div><img src={s.image.original ?? s.image.src} alt="Original upload" className="mx-auto h-24 rounded-lg object-contain" />Original</div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <div className="checker rounded-lg"><img src={s.image.src} alt="Result" className="mx-auto h-24 object-contain" />{s.image.removeBg ? "Background removed" : "As uploaded"}</div>
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand" checked={s.sendPhotoLater} onChange={(e) => up({ sendPhotoLater: e.target.checked })} /> I&apos;ll send the photo later via WhatsApp / chat</label>
                </div>
              )}
              {s.start === "gallery" && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {cfg.gallery.map((g) => (
                    <button type="button" key={g.id} onClick={() => pickGallery(g.id)} className={`overflow-hidden rounded-xl border-2 text-left text-xs ${s.galleryId === g.id ? "border-brand" : "border-transparent"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.image} alt="" className="aspect-square w-full object-cover" />
                      <span className="block p-1.5 font-semibold">{g.title}{g.minWeightG ? <span className="block font-normal text-muted">min {weightLabel(g.minWeightG)}</span> : null}</span>
                    </button>
                  ))}
                </div>
              )}
              {s.start === "theme" && (
                <div className="flex flex-wrap gap-2">
                  {THEMES.map((t) => <Chip key={t} on={s.theme === t} onClick={() => up({ theme: t, texts: s.texts.length ? s.texts : [{ id: uid(), text: t.slice(2), x: 0.5, y: 0.5, size: 0.09, color: s.accent, font: "Script", rotate: 0 }] })}>{t}</Chip>)}
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-5">
              <h2 className="font-body text-lg font-bold">Cake shape</h2>
              <div className="flex flex-wrap gap-2">
                {(["preset", "number", "letter", "custom"] as const).filter((k) => k === "preset" || cfg.features.shapeDesigner !== false).map((k) => (
                  <Chip key={k} on={s.shape.kind === k} onClick={() => (k === "custom" ? toCustom() : (upShape({ kind: k, text: k === "number" ? "18" : k === "letter" ? "A" : s.shape.text }), setShapeEdit(false)))}>
                    {{ preset: "Shapes", number: "Number cake", letter: "Letter cake", custom: "Custom / draw" }[k]}
                  </Chip>
                ))}
              </div>
              {s.shape.kind === "preset" && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {Object.entries(PRESETS).map(([k, p]) => (
                    <button type="button" key={k} onClick={() => upShape({ preset: k, widthIn: p.w, heightIn: p.h })} aria-pressed={s.shape.preset === k} className={`grid place-items-center gap-1 rounded-xl border p-2 text-xs ${s.shape.preset === k ? "border-brand bg-blush font-semibold text-brand" : "border-line bg-white"}`}>
                      <svg viewBox="0 0 110 110" className="h-10 w-10"><path d={pathFromPoints(p.points(), 5, 5, 100, (100 * p.h) / p.w)} fill="currentColor" opacity={0.75} /></svg>{p.label}
                    </button>
                  ))}
                </div>
              )}
              {(s.shape.kind === "number" || s.shape.kind === "letter") && (
                <div>
                  <label className="label" htmlFor="shapetext">{s.shape.kind === "number" ? "Number(s)" : "Letter(s) / initials"}</label>
                  <input id="shapetext" className="input text-lg font-bold" maxLength={3} value={s.shape.text}
                    onChange={(e) => { const v = s.shape.kind === "number" ? e.target.value.replace(/\D/g, "") : e.target.value.toUpperCase().replace(/[^A-Z&]/g, ""); upShape({ text: v, widthIn: Math.max(6, 6 * Math.max(1, v.length)), heightIn: 10 }); }} />
                  <p className="mt-1 text-xs text-muted">Multi-digit/letter cakes are made as joined pieces. Our team confirms feasibility.</p>
                </div>
              )}
              {s.shape.kind === "custom" && (
                <div className="grid gap-3 rounded-xl bg-cream p-3 text-sm">
                  <p><b>Shape editor:</b> drag the dots to reshape, double-click an edge to add a point, or draw freehand. Custom shapes are reviewed by our bakers before confirming.</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={shapeEdit ? "btn-primary btn-sm" : "btn-outline btn-sm"} onClick={() => setShapeEdit(!shapeEdit)}>{shapeEdit ? "Editing ✓" : "Edit points"}</button>
                    <button type="button" className={drawMode ? "btn-primary btn-sm" : "btn-outline btn-sm"} onClick={() => { setShapeEdit(true); setDrawMode(!drawMode); }}>✏️ Draw freehand</button>
                    <button type="button" className="btn-outline btn-sm" disabled={!history.length} onClick={() => { setFuture((f) => [s.shape.points, ...f]); upShape({ points: history[history.length - 1] }); setHistory((h) => h.slice(0, -1)); }}>Undo</button>
                    <button type="button" className="btn-outline btn-sm" disabled={!future.length} onClick={() => { setHistory((h) => [...h, s.shape.points]); upShape({ points: future[0] }); setFuture((f) => f.slice(1)); }}>Redo</button>
                    <button type="button" className="btn-outline btn-sm" disabled={selPt == null || s.shape.points.length <= 3} onClick={() => { pushHistory(); upShape({ points: s.shape.points.filter((_, i) => i !== selPt) }); setSelPt(null); }}>Delete point</button>
                    <button type="button" className="btn-outline btn-sm" onClick={() => upShape({ flip: !s.shape.flip })}>Mirror</button>
                    <button type="button" className="btn-outline btn-sm" onClick={toCustom}>Reset</button>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2"><input type="checkbox" className="accent-brand" checked={snap} onChange={(e) => setSnap(e.target.checked)} /> Grid snap</label>
                    {s.image && <label className="flex items-center gap-2"><input type="checkbox" className="accent-brand" checked={traceGuide} onChange={(e) => setTraceGuide(e.target.checked)} /> Use my image as tracing guide</label>}
                  </div>
                  <p className="text-xs text-muted">Start from a preset: {Object.entries(PRESETS).map(([k, p]) => <button key={k} type="button" className="mr-2 underline" onClick={() => { pushHistory(); const pts = p.points(); const st = Math.max(1, Math.floor(pts.length / 24)); upShape({ kind: "custom", points: pts.filter((_, i) => i % st === 0), widthIn: p.w, heightIn: p.h }); }}>{p.label}</button>)}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm"><span className="label">Width (inch)</span><input type="number" min={4} max={30} step={0.5} className="input" value={s.shape.widthIn} onChange={(e) => upShape({ widthIn: Math.max(4, Math.min(30, +e.target.value || 4)) })} /></label>
                <label className="text-sm"><span className="label">Length (inch)</span><input type="number" min={4} max={30} step={0.5} className="input" value={s.shape.heightIn} onChange={(e) => upShape({ heightIn: Math.max(4, Math.min(30, +e.target.value || 4)) })} /></label>
              </div>
              <p className="text-xs text-muted">≈ {(s.shape.widthIn * 2.54).toFixed(0)} × {(s.shape.heightIn * 2.54).toFixed(0)} cm {shapeOpt && shapeOpt.price > 0 && `· Shape surcharge ${tk(shapeOpt.price)}`}</p>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5">
              <div>
                <h2 className="mb-2 font-body text-lg font-bold">Cake base</h2>
                <div className="flex flex-wrap gap-2">{cfg.bases.map((b) => <Chip key={b.id} on={s.baseId === b.id} onClick={() => up({ baseId: b.id })}>{b.name}</Chip>)}</div>
              </div>
              <div>
                <h3 className="label">Weight / size</h3>
                <div className="flex flex-wrap gap-2">
                  {cfg.weights.map((w) => {
                    let p: number | null = null;
                    try { p = priceCake({ basePrices: cfg.basePrices, options: [] }, { baseId: s.baseId, grams: w.grams }).total; } catch {}
                    const tooSmall = !!galleryItem?.minWeightG && w.grams < galleryItem.minWeightG;
                    return <Chip key={w.grams} on={s.grams === w.grams} onClick={() => !tooSmall && up({ grams: w.grams })} sub={tooSmall ? "Not available" : p ? tk(p) : undefined}>{w.label}</Chip>;
                  })}
                </div>
                <label className="mt-2 flex items-center gap-2 text-sm">Custom weight (g)<input type="number" min={250} step={50} className="input !w-28" value={s.grams} onChange={(e) => up({ grams: Math.max(0, +e.target.value || 0) })} /></label>
              </div>
              <div>
                <h3 className="label">Flavour / filling</h3>
                <div className="flex flex-wrap gap-2">{byKind("FILLING").map((o) => <Chip key={o.id} on={s.fillingIds.includes(o.id)} onClick={() => toggleIn("fillingIds", o.id, true)} sub={optPrice(o)}>{o.name}</Chip>)}</div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-5">
              <div>
                <h2 className="mb-2 font-body text-lg font-bold">Cream colour</h2>
                <div className="flex flex-wrap items-center gap-2">
                  {CREAMS.map((c) => <button type="button" key={c} onClick={() => up({ cream: c })} aria-label={`Colour ${c}`} aria-pressed={s.cream === c} className={`h-9 w-9 rounded-full border-2 ${s.cream === c ? "border-brand ring-2 ring-brand/30" : "border-line"}`} style={{ background: c }} />)}
                  <input type="color" value={s.cream} onChange={(e) => up({ cream: e.target.value })} aria-label="Custom cream colour" className="h-9 w-12" />
                </div>
              </div>
              <label className="flex items-center gap-3 text-sm"><span className="label !mb-0">Border / piping colour</span><input type="color" value={s.accent} onChange={(e) => up({ accent: e.target.value })} className="h-9 w-12" /></label>
              <div>
                <h3 className="label">Board</h3>
                <div className="flex flex-wrap gap-2">{byKind("BOARD").map((o) => <Chip key={o.id} on={s.boardId === o.id} onClick={() => up({ boardId: o.id })} sub={optPrice(o)}>{o.name}</Chip>)}</div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <label><span className="label">Shape</span><select className="input" value={s.board.shape} onChange={(e) => up({ board: { ...s.board, shape: e.target.value as any } })}><option value="round">Round</option><option value="square">Square</option><option value="same">Same as cake</option></select></label>
                  <label><span className="label">Size (in)</span><input type="number" min={6} max={36} className="input" value={s.board.sizeIn} onChange={(e) => up({ board: { ...s.board, sizeIn: +e.target.value || 10 } })} /></label>
                  <label><span className="label">Colour</span><input type="color" className="h-[42px] w-full" value={s.board.color} onChange={(e) => up({ board: { ...s.board, color: e.target.value } })} /></label>
                </div>
              </div>
              <div>
                <h3 className="label">Decoration</h3>
                <div className="flex flex-wrap gap-2">{byKind("DECORATION").map((o) => <Chip key={o.id} on={s.decorationIds.includes(o.id)} onClick={() => toggleIn("decorationIds", o.id)} sub={optPrice(o)}>{o.name}</Chip>)}</div>
              </div>
              <div>
                <h3 className="label">Extras</h3>
                <div className="flex flex-wrap gap-2">{byKind("EXTRA").map((o) => <Chip key={o.id} on={s.extraIds.includes(o.id)} onClick={() => toggleIn("extraIds", o.id)} sub={optPrice(o)}>{o.name}</Chip>)}</div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-5">
              <div>
                <h2 className="font-body text-lg font-bold">Design the top</h2>
                <p className="text-sm text-muted">Drag the image and text on the preview. Tap an item to resize, rotate or move it precisely.</p>
              </div>
              {!s.image && <label className="btn-outline w-fit cursor-pointer"><input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => onUpload(e.target.files?.[0])} />Add an image</label>}
              {s.image && <div className="flex flex-wrap gap-2"><button type="button" className="btn-outline btn-sm" onClick={() => setSel("image")}>Select image</button><button type="button" className="btn-outline btn-sm" onClick={() => { up({ image: null }); setSel(null); }}>Remove image</button></div>}
              <div className="grid gap-3">
                <h3 className="label !mb-0">Writing</h3>
                {s.texts.map((t) => (
                  <div key={t.id} className={`grid gap-2 rounded-xl border p-3 ${sel === t.id ? "border-brand" : "border-line"}`}>
                    <textarea rows={2} className="input" value={t.text} maxLength={80} onFocus={() => setSel(t.id)} onChange={(e) => up({ texts: s.texts.map((x) => (x.id === t.id ? { ...x, text: e.target.value } : x)) })} aria-label="Cake text" />
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <select className="input !w-auto !py-1.5" value={t.font} onChange={(e) => up({ texts: s.texts.map((x) => (x.id === t.id ? { ...x, font: e.target.value } : x)) })} aria-label="Font">{Object.keys(FONTS).map((f) => <option key={f}>{f}</option>)}</select>
                      <input type="color" value={t.color} onChange={(e) => up({ texts: s.texts.map((x) => (x.id === t.id ? { ...x, color: e.target.value } : x)) })} aria-label="Text colour" className="h-9 w-10" />
                      <button type="button" className="btn-ghost btn-sm" onClick={() => setSel(t.id)}>Adjust</button>
                      <button type="button" className="btn-ghost btn-sm text-red-700" onClick={() => up({ texts: s.texts.filter((x) => x.id !== t.id) })}>Remove</button>
                    </div>
                  </div>
                ))}
                {s.texts.length < 4 && <button type="button" className="btn-outline btn-sm w-fit" onClick={() => { const id = uid(); up({ texts: [...s.texts, { id, text: "Your text", x: 0.5, y: 0.25 + s.texts.length * 0.15, size: 0.07, color: s.accent, font: "Classic", rotate: 0 }] }); setSel(id); }}>+ Add text line</button>}
              </div>
              {(cfg.features.sugarPrint !== false || cfg.features.wafflePrint !== false) && (
                <div>
                  <h3 className="label">Print type for your image</h3>
                  <div className="flex flex-wrap gap-2">
                    {(["NONE", "TOPPER", "SUGAR", "WAFFLE"] as const).filter((p) => (p !== "WAFFLE" || cfg.features.wafflePrint !== false) && (p !== "SUGAR" || cfg.features.sugarPrint !== false)).map((p) => {
                      const o = cfg.options.find((x) => x.kind === "PRINT" && x.meta?.printType === p);
                      return <Chip key={p} on={s.printType === p} onClick={() => up({ printType: p })} sub={o ? optPrice(o) : undefined}>{{ NONE: "No print", TOPPER: "Cake topper", SUGAR: "Sugar paper", WAFFLE: "Waffle paper" }[p]}</Chip>;
                    })}
                  </div>
                  {s.printType !== "NONE" && <label className="mt-2 flex items-center gap-2 text-sm">Print size (inch)<input type="number" min={2} max={14} step={0.5} className="input !w-24" value={s.printSizeIn} onChange={(e) => up({ printSizeIn: +e.target.value || 6 })} /></label>}
                </div>
              )}
              <div><label className="label" htmlFor="dnote">Note for the baker</label><textarea id="dnote" rows={2} className="input" value={s.note} onChange={(e) => up({ note: e.target.value })} placeholder="Colours, theme details, allergies…" /></div>
            </div>
          )}

          {step === 5 && (
            <div className="grid gap-4">
              <h2 className="font-body text-lg font-bold">{mode === "pos" ? "Save custom order" : "Your details"}</h2>
              {mode === "customer" ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><label className="label" htmlFor="cn">Name *</label><input id="cn" className="input" value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} /></div>
                    <div><label className="label" htmlFor="cp">Phone *</label><input id="cp" className="input" inputMode="tel" placeholder="01XXXXXXXXX" value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} /></div>
                  </div>
                  <div className="flex gap-2">{["DELIVERY", "PICKUP"].map((k) => <Chip key={k} on={cust.fulfillment === k} onClick={() => setCust({ ...cust, fulfillment: k })}>{k === "DELIVERY" ? "Delivery" : "Pickup"}</Chip>)}</div>
                  {cust.fulfillment === "DELIVERY" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div><label className="label" htmlFor="cz">Area</label><select id="cz" className="input" value={cust.zoneId} onChange={(e) => setCust({ ...cust, zoneId: e.target.value })}>{cfg.zones.map((z) => <option key={z.id} value={z.id}>{z.name} — {tk(z.charge)}</option>)}</select></div>
                      <div><label className="label" htmlFor="ca">Address *</label><input id="ca" className="input" value={cust.address} onChange={(e) => setCust({ ...cust, address: e.target.value })} /></div>
                    </div>
                  )}
                  <div><label className="label" htmlFor="cd">Needed by</label><input id="cd" type="datetime-local" className="input" value={cust.deliveryDate} onChange={(e) => setCust({ ...cust, deliveryDate: e.target.value })} /></div>
                  <p className="rounded-xl bg-cream p-3 text-sm">We&apos;ll review your design and send a confirmed quote. You approve it and pay the advance — only then do we start baking.</p>
                </>
              ) : (
                <p className="text-sm text-muted">The design, estimated price and assets will be saved to this custom order. You can share a secure link with the customer.</p>
              )}
              <Alert error={a.error} msg={a.msg} />
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn-primary" disabled={a.busy || !price.ok} onClick={submit}>{a.busy ? "Submitting…" : mode === "pos" ? "Create custom order" : "Submit design for quote"}</button>
                {mode === "customer" && loggedIn && <button type="button" className="btn-outline" disabled={a.busy} onClick={saveDraft}>Save design</button>}
              </div>
            </div>
          )}

          {step < 5 && <Alert error={a.error} />}
          <div className="mt-6 flex justify-between border-t border-line pt-4">
            <button type="button" className="btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>← Back</button>
            {step < 5 && <button type="button" className="btn-primary" onClick={() => { setShapeEdit(false); setDrawMode(false); setStep(step + 1); }}>Next →</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
