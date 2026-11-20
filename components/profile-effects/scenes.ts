/**
 * Scene effects, Discord-style: each one is framed around the profile card. A big intro plays when the profile opens,
 * then a lighter loop keeps going (the dragon keeps coiling around the card, the phoenix hovers on top, koi circle
 * the edges…). Scenes draw in card coordinates (0,0 = card top-left, W×H = card size) and may spill `pad()` px
 * outside it. Everything is plain 2D paths + pre-rendered glow sprites (no shadowBlur, no filters).
 */

type Ctx = CanvasRenderingContext2D;
type V = { x: number; y: number };
type Seg = { x: number; y: number; a: number };
export type Scene = { resize(W: number, H: number): void; update(dt: number): void; draw(ctx: Ctx): void; pad(): number };
export type SceneFactory = (W: number, H: number, small: boolean) => Scene;

const TAU = Math.PI * 2;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const angDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);

function rgba(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const glowCache = new Map<string, HTMLCanvasElement>();
function glowSprite(color: string) {
  let c = glowCache.get(color);
  if (!c) {
    c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, rgba(color, 1));
    gr.addColorStop(0.3, rgba(color, 0.5));
    gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    glowCache.set(color, c);
  }
  return c;
}
function glow(ctx: Ctx, color: string, x: number, y: number, r: number, alpha: number) {
  if (alpha <= 0.002 || r <= 0) return;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
}

/* ---------- shared helpers ---------- */

/** Clockwise path around a rounded rect, starting at the bottom of the left edge (going up). */
class Perim {
  P = 0;
  private parts: { len: number; at: (u: number) => Seg }[] = [];
  constructor(x0: number, y0: number, w: number, h: number, r: number) {
    r = Math.max(2, Math.min(r, w / 2 - 1, h / 2 - 1));
    const line = (ax: number, ay: number, bx: number, by: number) => {
      const a = Math.atan2(by - ay, bx - ax);
      this.parts.push({ len: Math.hypot(bx - ax, by - ay), at: (u) => ({ x: ax + (bx - ax) * u, y: ay + (by - ay) * u, a }) });
    };
    const arc = (cx: number, cy: number, from: number) => {
      this.parts.push({ len: (Math.PI / 2) * r, at: (u) => { const th = from + u * (Math.PI / 2); return { x: cx + Math.cos(th) * r, y: cy + Math.sin(th) * r, a: th + Math.PI / 2 }; } });
    };
    line(x0, y0 + h - r, x0, y0 + r);
    arc(x0 + r, y0 + r, Math.PI);
    line(x0 + r, y0, x0 + w - r, y0);
    arc(x0 + w - r, y0 + r, -Math.PI / 2);
    line(x0 + w, y0 + r, x0 + w, y0 + h - r);
    arc(x0 + w - r, y0 + h - r, 0);
    line(x0 + w - r, y0 + h, x0 + r, y0 + h);
    arc(x0 + r, y0 + h - r, Math.PI / 2);
    this.P = this.parts.reduce((s, p) => s + p.len, 0);
  }
  at(s: number): Seg {
    s = ((s % this.P) + this.P) % this.P;
    for (const p of this.parts) { if (s <= p.len) return p.at(p.len ? s / p.len : 0); s -= p.len; }
    return this.parts[0].at(0);
  }
}

class Trail {
  pts: V[] = [];
  push(p: V, maxLen: number) {
    this.pts.push(p);
    let acc = 0;
    for (let i = this.pts.length - 1; i > 0; i--) {
      acc += Math.hypot(this.pts[i].x - this.pts[i - 1].x, this.pts[i].y - this.pts[i - 1].y);
      if (acc > maxLen) { this.pts.splice(0, i - 1); break; }
    }
  }
  /** n points spaced `spacing` px back along the trail (0 = head), each with its heading. */
  sample(n: number, spacing: number, out: Seg[]) {
    const pts = this.pts;
    if (!pts.length) return;
    let idx = pts.length - 1, acc = 0;
    for (let i = 0; i < n; i++) {
      const target = i * spacing;
      let x = pts[0].x, y = pts[0].y;
      while (idx > 0) {
        const a = pts[idx], b = pts[idx - 1];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (acc + d >= target) { const t = d ? (target - acc) / d : 0; x = a.x + (b.x - a.x) * t; y = a.y + (b.y - a.y) * t; break; }
        acc += d; idx--;
      }
      if (idx === 0) { x = pts[0].x; y = pts[0].y; }
      const s = out[i] || (out[i] = { x, y, a: 0 });
      s.x = x; s.y = y;
    }
    for (let i = 0; i < n; i++) {
      const s = out[i], f = out[Math.max(0, i - 1)], b = out[Math.min(n - 1, i + 1)];
      const dx = i === 0 ? s.x - b.x : f.x - s.x, dy = i === 0 ? s.y - b.y : f.y - s.y;
      s.a = dx * dx + dy * dy > 0.0001 ? Math.atan2(dy, dx) : i ? out[i - 1].a : s.a;
    }
  }
}

type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; s: number; c: string; grow?: number };
function stepSparks(list: Spark[], dt: number, drag = 1.6, lift = 0) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life += dt;
    if (p.life >= p.max) { list.splice(i, 1); continue; }
    p.vx *= 1 - dt * drag; p.vy *= 1 - dt * drag; p.vy -= lift * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
}
function drawSparks(ctx: Ctx, list: Spark[], alpha = 1) {
  for (const p of list) {
    const f = p.life / p.max;
    glow(ctx, p.c, p.x, p.y, p.s * (1 + (p.grow ?? 0) * f), alpha * (1 - f) * Math.min(1, p.life * 8));
  }
}
function burst(list: Spark[], x: number, y: number, n: number, speed: [number, number], size: [number, number], colors: string[], life: [number, number] = [0.6, 1.2]) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), v = rnd(speed[0], speed[1]);
    list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: rnd(life[0], life[1]), s: rnd(size[0], size[1]), c: pick(colors) });
  }
}
function jagged(ax: number, ay: number, bx: number, by: number, rough: number, steps = 9): V[] {
  const pts: V[] = [{ x: ax, y: ay }];
  const nx = -(by - ay), ny = bx - ax, nl = Math.hypot(nx, ny) || 1;
  for (let i = 1; i < steps; i++) {
    const t = i / steps, o = rnd(-rough, rough);
    pts.push({ x: ax + (bx - ax) * t + (nx / nl) * o, y: ay + (by - ay) * t + (ny / nl) * o });
  }
  pts.push({ x: bx, y: by });
  return pts;
}
function strokeBolt(ctx: Ctx, pts: V[], color: string, w: number, alpha: number) {
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.globalAlpha = alpha * 0.35; ctx.strokeStyle = color; ctx.lineWidth = w * 3.2; ctx.stroke();
  ctx.globalAlpha = alpha; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = w; ctx.stroke();
}

/** A row of flickering flame tongues along the card's bottom edge (additive). */
function drawFlames(ctx: Ctx, W: number, H: number, t: number, size: number, colors: [string, string, string], strength = 1) {
  if (strength <= 0.01) return;
  const n = Math.max(6, Math.ceil(W / (size * 1.5)));
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * W, k = i * 1.7;
    const h = size * (1.6 + 0.9 * Math.sin(t * 5.3 + k) + 0.5 * Math.sin(t * 8.1 + k * 2.3)) * strength;
    const sway = Math.sin(t * 3 + k) * size * 0.35, w = size * 0.75;
    glow(ctx, colors[2], x, H - h * 0.2, size * 1.6, 0.35 * strength);
    for (const [c, sc, a] of [[colors[2], 1, 0.75], [colors[1], 0.72, 0.85], [colors[0], 0.42, 0.9]] as [string, number, number][]) {
      ctx.globalAlpha = a * strength; ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(x - w * sc, H + size * 0.3);
      ctx.quadraticCurveTo(x - w * sc * 0.7, H - h * sc * 0.55, x + sway * sc, H - h * sc);
      ctx.quadraticCurveTo(x + w * sc * 0.7, H - h * sc * 0.55, x + w * sc, H + size * 0.3);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = "source-over";
}

/** A stylised oriental cloud (curl puffs). */
function drawCloud(ctx: Ctx, x: number, y: number, s: number, fill: string, line: string, flip = 1) {
  if (s <= 0.5) return;
  const base = ctx.globalAlpha;
  ctx.fillStyle = fill; ctx.strokeStyle = line; ctx.lineWidth = Math.max(1.2, s * 0.08);
  const puffs: [number, number, number][] = [[-1.1, 0.15, 0.6], [-0.4, -0.25, 0.8], [0.45, -0.1, 0.7], [1.1, 0.2, 0.5]];
  ctx.globalAlpha = base * 0.95;
  ctx.beginPath();
  for (const [px, py, r] of puffs) { ctx.moveTo(x + px * s * flip + r * s, y + py * s); ctx.arc(x + px * s * flip, y + py * s, r * s, 0, TAU); }
  ctx.fill();
  ctx.beginPath();
  for (const [px, py, r] of puffs) { ctx.moveTo(x + px * s * flip + r * s * 0.55, y + py * s); ctx.arc(x + px * s * flip, y + py * s, r * s * 0.55, 0, Math.PI * 1.3); }
  ctx.globalAlpha = base * 0.7; ctx.stroke();
  ctx.globalAlpha = base;
}

/* ---------- dragons ---------- */

type DragonTheme = {
  body: string; dark: string; light: string; belly: string; spine: string; horn: string; eye: string; glow: string;
  breath: "fire" | "mist" | "lightning"; breathColors: string[]; decor: "clouds" | "flames" | "storm";
};

export const DRAGONS: Record<string, DragonTheme> = {
  jade: { body: "#1fae62", dark: "#0a4f2c", light: "#8dffbd", belly: "#eef8c8", spine: "#b6ff3b", horn: "#f4eccb", eye: "#fff36b", glow: "#39ff88", breath: "mist", breathColors: ["#f0ffd0", "#9dff6b", "#2fd17a"], decor: "clouds" },
  inferno: { body: "#c8161c", dark: "#560408", light: "#ff8a3d", belly: "#ffd27a", spine: "#ffb000", horn: "#ffe7b0", eye: "#fffbe0", glow: "#ff5a1f", breath: "fire", breathColors: ["#fff6c8", "#ffb02e", "#ff3d12"], decor: "flames" },
  storm: { body: "#2b4fd8", dark: "#0c1a58", light: "#9cc0ff", belly: "#dfe9ff", spine: "#7df9ff", horn: "#eef3ff", eye: "#ffffff", glow: "#5ab0ff", breath: "lightning", breathColors: ["#ffffff", "#9fe8ff", "#5ab0ff"], decor: "storm" },
};

function drawDragon(ctx: Ctx, S: Seg[], N: number, R: number, radius: number[], theme: DragonTheme, t: number, jaw: number) {
  const r = (i: number) => radius[i] * R;
  // clockwise around the card → the left-hand normal (sin a, -cos a) points outwards: that's the dragon's back
  const nx = (i: number) => Math.sin(S[i].a), ny = (i: number) => -Math.cos(S[i].a);
  const dx = (i: number) => Math.cos(S[i].a), dy = (i: number) => Math.sin(S[i].a);

  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < N; i += 3) glow(ctx, theme.glow, S[i].x, S[i].y, r(i) * 3.4, 0.2);
  ctx.globalCompositeOperation = "source-over";

  const leg = (i: number, phase: number, near: boolean) => {
    const ri = R * 0.9, vx = -nx(i), vy = -ny(i), fx = dx(i), fy = dy(i);
    const sw = Math.sin(t * 6 + phase) * 0.55;
    const bx = S[i].x + vx * ri * 0.4 + (near ? 0 : nx(i) * ri * 0.25), by = S[i].y + vy * ri * 0.4 + (near ? 0 : ny(i) * ri * 0.25);
    let ux = vx - fx * 0.5 + fx * sw, uy = vy - fy * 0.5 + fy * sw;
    let ul = Math.hypot(ux, uy) || 1;
    const kx = bx + (ux / ul) * ri * 1.5, ky = by + (uy / ul) * ri * 1.5;
    ux = vx * 0.4 + fx * (0.9 + sw * 0.4); uy = vy * 0.4 + fy * (0.9 + sw * 0.4); ul = Math.hypot(ux, uy) || 1;
    const ex = ux / ul, ey = uy / ul, fx2 = kx + ex * ri * 1.15, fy2 = ky + ey * ri * 1.15;
    ctx.globalAlpha = 1; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = near ? theme.body : theme.dark; ctx.lineWidth = ri * 0.55;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(kx, ky); ctx.lineTo(fx2, fy2); ctx.stroke();
    ctx.strokeStyle = theme.horn; ctx.lineWidth = ri * 0.15;
    ctx.beginPath();
    for (const o of [-0.7, 0, 0.7]) {
      const c = Math.cos(o), s = Math.sin(o), cx = ex * c - ey * s, cy = ex * s + ey * c;
      ctx.moveTo(fx2, fy2); ctx.lineTo(fx2 + cx * ri * 0.5, fy2 + cy * ri * 0.5);
    }
    ctx.stroke();
  };
  const legsAt = [Math.round(N * 0.14), Math.round(N * 0.5)];
  legsAt.forEach((i, k) => leg(i + 2, k * 2 + Math.PI, false));

  ctx.globalAlpha = 1; ctx.fillStyle = theme.spine; ctx.beginPath();
  for (let i = 2; i < N - 2; i++) {
    const ri = r(i), bx = S[i].x + nx(i) * ri * 0.7, by = S[i].y + ny(i) * ri * 0.7;
    const hgt = ri * (i % 2 ? 0.8 : 1.3) * (1 + 0.14 * Math.sin(t * 6 - i * 0.7));
    ctx.moveTo(bx + dx(i) * ri * 0.5, by + dy(i) * ri * 0.5);
    ctx.lineTo(bx + nx(i) * hgt - dx(i) * ri * 0.9, by + ny(i) * hgt - dy(i) * ri * 0.9);
    ctx.lineTo(bx - dx(i) * ri * 0.5, by - dy(i) * ri * 0.5);
  }
  ctx.fill();

  ctx.beginPath();
  for (let i = 0; i < N; i++) { const x = S[i].x + nx(i) * r(i), y = S[i].y + ny(i) * r(i); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  for (let i = N - 1; i >= 0; i--) ctx.lineTo(S[i].x - nx(i) * r(i), S[i].y - ny(i) * r(i));
  ctx.closePath();
  const g = ctx.createLinearGradient(S[0].x, S[0].y, S[N - 1].x, S[N - 1].y);
  g.addColorStop(0, theme.light); g.addColorStop(0.2, theme.body); g.addColorStop(0.75, theme.body); g.addColorStop(1, theme.dark);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = theme.dark; ctx.lineWidth = Math.max(1, R * 0.08); ctx.globalAlpha = 0.6; ctx.stroke();

  ctx.globalAlpha = 0.95; ctx.fillStyle = theme.belly; ctx.beginPath();
  for (let i = 1; i < N - 1; i++) { const x = S[i].x - nx(i) * r(i) * 0.92, y = S[i].y - ny(i) * r(i) * 0.92; if (i > 1) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  for (let i = N - 2; i >= 1; i--) ctx.lineTo(S[i].x - nx(i) * r(i) * 0.28, S[i].y - ny(i) * r(i) * 0.28);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 0.35; ctx.strokeStyle = theme.dark; ctx.lineWidth = 1; ctx.beginPath();
  for (let i = 1; i < N - 1; i++) {
    ctx.moveTo(S[i].x - nx(i) * r(i) * 0.92, S[i].y - ny(i) * r(i) * 0.92);
    ctx.lineTo(S[i].x - nx(i) * r(i) * 0.3, S[i].y - ny(i) * r(i) * 0.3);
  }
  ctx.stroke();

  ctx.globalAlpha = 0.4; ctx.strokeStyle = theme.light; ctx.lineWidth = Math.max(1, R * 0.07); ctx.beginPath();
  for (let i = 1; i < N - 1; i++) {
    const ri = r(i), cx = S[i].x + nx(i) * ri * 0.32, cy = S[i].y + ny(i) * ri * 0.32, a = S[i].a;
    ctx.moveTo(cx + Math.cos(a + Math.PI / 2) * ri * 0.4, cy + Math.sin(a + Math.PI / 2) * ri * 0.4);
    ctx.arc(cx, cy, ri * 0.4, a + Math.PI / 2, a + Math.PI * 1.5);
  }
  ctx.stroke();
  ctx.globalAlpha = 0.55; ctx.lineWidth = Math.max(1, R * 0.12); ctx.beginPath();
  for (let i = 0; i < N - 2; i++) { const x = S[i].x + nx(i) * r(i) * 0.78, y = S[i].y + ny(i) * r(i) * 0.78; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  ctx.stroke();

  legsAt.forEach((i, k) => leg(i, k * 2, true));

  const L = N - 1, tx = S[L].x, ty = S[L].y;
  ctx.globalAlpha = 0.9; ctx.fillStyle = theme.spine;
  for (const k of [-1, 0, 1]) {
    const w = Math.sin(t * 8 + k) * R * 0.5;
    const tipx = tx - dx(L) * R * (2.4 - Math.abs(k) * 0.5) + nx(L) * (k * R * 1.1 + w), tipy = ty - dy(L) * R * (2.4 - Math.abs(k) * 0.5) + ny(L) * (k * R * 1.1 + w);
    ctx.beginPath(); ctx.moveTo(tx + nx(L) * R * 0.25, ty + ny(L) * R * 0.25);
    ctx.quadraticCurveTo(tx - dx(L) * R + nx(L) * R * (k + 0.6), ty - dy(L) * R + ny(L) * R * (k + 0.6), tipx, tipy);
    ctx.quadraticCurveTo(tx - dx(L) * R + nx(L) * R * (k - 0.6), ty - dy(L) * R + ny(L) * R * (k - 0.6), tx - nx(L) * R * 0.25, ty - ny(L) * R * 0.25);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "lighter"; glow(ctx, theme.glow, tx - dx(L) * R, ty - dy(L) * R, R * 2.6, 0.5); ctx.globalCompositeOperation = "source-over";

  ctx.strokeStyle = theme.spine; ctx.lineCap = "round"; ctx.globalAlpha = 0.85;
  for (let i = 0; i < 7; i++) {
    const ri = r(i), bx = S[i].x + nx(i) * ri * 0.55, by = S[i].y + ny(i) * ri * 0.55, w = Math.sin(t * 5 + i * 0.9) * ri * 0.7;
    ctx.lineWidth = ri * (0.28 - i * 0.02);
    ctx.beginPath(); ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + nx(i) * ri * 1.3 - dx(i) * ri * 1.2, by + ny(i) * ri * 1.3 - dy(i) * ri * 1.2,
      bx + nx(i) * (ri * 0.7 + w) - dx(i) * ri * 2.6, by + ny(i) * (ri * 0.7 + w) - dy(i) * ri * 2.6);
    ctx.stroke();
  }

  drawDragonHead(ctx, S[0], R, theme, t, jaw);
}

function drawDragonHead(ctx: Ctx, s: Seg, R: number, theme: DragonTheme, t: number, jaw: number) {
  const h = R * 1.6;
  ctx.save();
  ctx.translate(s.x, s.y); ctx.rotate(s.a);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const horn = (dxo: number, alpha: number, color: string) => {
    ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = h * 0.17;
    ctx.beginPath(); ctx.moveTo(-0.15 * h + dxo, -0.68 * h); ctx.quadraticCurveTo(-0.5 * h + dxo, -1.5 * h, -1.55 * h + dxo, -1.72 * h); ctx.stroke();
    ctx.lineWidth = h * 0.11;
    ctx.beginPath(); ctx.moveTo(-0.55 * h + dxo, -1.28 * h); ctx.quadraticCurveTo(-0.6 * h + dxo, -1.7 * h, -0.85 * h + dxo, -1.95 * h); ctx.stroke();
  };
  horn(0.25 * h, 0.75, theme.dark);

  const whisker = (x0: number, y0: number, ph: number, alpha: number) => {
    ctx.globalAlpha = alpha; ctx.strokeStyle = theme.spine;
    let px = x0, py = y0;
    for (let k = 1; k <= 11; k++) {
      const x = x0 - k * 0.3 * h, y = y0 + k * 0.11 * h + Math.sin(t * 5 - k * 0.55 + ph) * k * 0.035 * h;
      ctx.lineWidth = h * (0.09 - k * 0.005); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
      px = x; py = y;
    }
  };
  whisker(1.55 * h, 0.3 * h, 1.3, 0.6);

  ctx.save();
  ctx.translate(0.15 * h, 0.15 * h); ctx.rotate(jaw);
  ctx.globalAlpha = 1; ctx.fillStyle = "#3a0508";
  ctx.beginPath(); ctx.moveTo(-0.1 * h, -0.1 * h); ctx.lineTo(1.5 * h, -0.08 * h); ctx.lineTo(1.3 * h, 0.2 * h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = theme.body;
  ctx.beginPath(); ctx.moveTo(-0.25 * h, -0.05 * h);
  ctx.quadraticCurveTo(0.8 * h, 0.04 * h, 1.45 * h, 0.0);
  ctx.quadraticCurveTo(1.52 * h, 0.22 * h, 1.25 * h, 0.32 * h);
  ctx.quadraticCurveTo(0.5 * h, 0.55 * h, -0.35 * h, 0.42 * h);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = theme.belly; ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.moveTo(0, 0.3 * h); ctx.quadraticCurveTo(0.7 * h, 0.42 * h, 1.25 * h, 0.3 * h); ctx.quadraticCurveTo(0.6 * h, 0.5 * h, -0.2 * h, 0.4 * h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#ffffff"; ctx.globalAlpha = 1; ctx.beginPath();
  for (let k = 0; k < 4; k++) { const x = 0.45 * h + k * 0.25 * h; ctx.moveTo(x, 0.02 * h); ctx.lineTo(x + 0.06 * h, -0.13 * h); ctx.lineTo(x + 0.12 * h, 0.02 * h); }
  ctx.fill();
  ctx.restore();

  const g = ctx.createLinearGradient(0, -h, 0, 0.4 * h);
  g.addColorStop(0, theme.light); g.addColorStop(0.55, theme.body); g.addColorStop(1, theme.dark);
  ctx.fillStyle = g; ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(-0.65 * h, -0.55 * h);
  ctx.quadraticCurveTo(0.1 * h, -1.02 * h, 0.85 * h, -0.62 * h);
  ctx.quadraticCurveTo(1.25 * h, -0.46 * h, 1.75 * h, -0.42 * h);
  ctx.quadraticCurveTo(2.08 * h, -0.36 * h, 1.97 * h, -0.04 * h);
  ctx.lineTo(1.62 * h, 0.12 * h);
  ctx.quadraticCurveTo(0.9 * h, 0.18 * h, 0.2 * h, 0.24 * h);
  ctx.quadraticCurveTo(-0.4 * h, 0.52 * h, -0.72 * h, 0.2 * h);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = theme.dark; ctx.lineWidth = Math.max(1, h * 0.05); ctx.globalAlpha = 0.6; ctx.stroke();

  ctx.globalAlpha = 1; ctx.fillStyle = "#ffffff"; ctx.beginPath();
  for (const x of [0.75, 1.4]) { ctx.moveTo(x * h, 0.13 * h); ctx.lineTo((x + 0.06) * h, 0.36 * h); ctx.lineTo((x + 0.13) * h, 0.12 * h); }
  ctx.fill();

  ctx.fillStyle = theme.spine; ctx.globalAlpha = 0.95; ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const y = -0.05 * h + k * 0.22 * h, w = Math.sin(t * 6 + k) * 0.08 * h;
    ctx.moveTo(-0.4 * h, y - 0.1 * h); ctx.lineTo(-1.15 * h - k * 0.1 * h, y + 0.12 * h + w); ctx.lineTo(-0.4 * h, y + 0.1 * h);
  }
  ctx.fill();

  ctx.strokeStyle = theme.spine; ctx.lineWidth = h * 0.1; ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.moveTo(0.28 * h, -0.6 * h); ctx.quadraticCurveTo(0.62 * h, -0.78 * h, 0.98 * h, -0.58 * h); ctx.stroke();
  ctx.globalCompositeOperation = "lighter"; glow(ctx, theme.eye, 0.62 * h, -0.42 * h, h * 0.6, 0.65); ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1; ctx.fillStyle = theme.eye;
  ctx.beginPath(); ctx.ellipse(0.62 * h, -0.42 * h, 0.18 * h, 0.11 * h, -0.15, 0, TAU); ctx.fill();
  ctx.fillStyle = "#120404"; ctx.beginPath(); ctx.ellipse(0.65 * h, -0.42 * h, 0.035 * h, 0.1 * h, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = theme.dark; ctx.beginPath(); ctx.arc(1.8 * h, -0.27 * h, 0.05 * h, 0, TAU); ctx.fill();

  horn(0, 1, theme.horn);
  whisker(1.9 * h, -0.12 * h, 0, 0.95);
  ctx.restore();
}

/**
 * Dragon: intro = it shoots in from below the card's bottom-left corner and races around it; loop = it keeps coiling
 * slowly around the card's border, breathing every few seconds, with clouds / flames / storm decor.
 */
export function dragonScene(theme: DragonTheme): SceneFactory {
  return (W, H, small) => {
    const N = small ? 44 : 54;
    let R = 0, spacing = 0, bodyLen = 0, per!: Perim, start: V = { x: 0, y: 0 }, LA = 0;
    const size = () => {
      R = clamp(Math.min(W, H) * 0.05, 8, 19);
      spacing = R * 0.66;
      bodyLen = spacing * (N - 1);
      per = new Perim(-R * 0.35, -R * 0.35, W + R * 0.7, H + R * 0.7, clamp(Math.min(W, H) * 0.09, 12, 34));
      start = { x: -R * 12, y: H + R * 14 };
      const e = per.at(0);
      LA = Math.hypot(e.x - start.x, e.y - start.y);
    };
    size();
    const radius = Array.from({ length: N }, (_, i) => {
      const q = i / (N - 1);
      return q < 0.1 ? 0.78 + (q / 0.1) * 0.22 : 1 - Math.pow((q - 0.1) / 0.9, 1.35) * 0.86;
    });
    const trail = new Trail();
    trail.pts = [start];
    const segs: Seg[] = [];
    const breath: Spark[] = [];
    let t = 0, d = 0, phase = 0, breathing = 0, breathCd = 1.7, jaw = 0.05, flash = 0;
    let bolt: V[] | null = null, boltT = 0, arc: V[] | null = null, arcT = 0, arcCd = 1;
    const clouds = [{ u: 0.02, v: 1.0, s: 1.25, f: 1 }, { u: 0.98, v: 0.9, s: 1, f: -1 }, { u: 0.9, v: 0.02, s: 0.9, f: -1 }, { u: 0.12, v: 0.06, s: 0.75, f: 1 }];

    const mouthOf = (s: Seg): V => {
      const h = R * 1.6, lx = 1.9 * h, ly = 0.12 * h;
      return { x: s.x + Math.cos(s.a) * lx - Math.sin(s.a) * ly, y: s.y + Math.sin(s.a) * lx + Math.cos(s.a) * ly };
    };

    const update = (dt: number) => {
      t += dt;
      const vIdle = Math.max(45, per.P / 15), vIntro = (LA + per.P * 0.85) / 1.6;
      const v = vIdle + (vIntro - vIdle) * Math.exp(-t / 1.1);
      d += v * dt;
      let base: Seg;
      if (d < LA) { const e = per.at(0), q = d / LA; base = { x: start.x + (e.x - start.x) * q, y: start.y + (e.y - start.y) * q, a: Math.atan2(e.y - start.y, e.x - start.x) }; }
      else base = per.at(d - LA);
      phase += dt * (TAU * v) / (bodyLen * 0.5);
      const off = R * 1.1 * (0.5 + 0.5 * Math.sin(phase));
      trail.push({ x: base.x + Math.sin(base.a) * off, y: base.y - Math.cos(base.a) * off }, bodyLen + R * 4);
      trail.sample(N, spacing, segs);

      stepSparks(breath, dt, theme.breath === "fire" ? 1.4 : 1.1, theme.breath === "mist" ? 18 : 30);
      flash = Math.max(0, flash - dt * 2.2);
      if (bolt) { boltT += dt; if (boltT > 0.12) bolt = null; }
      if (arc) { arcT += dt; if (arcT > 0.16) arc = null; }

      const s0 = segs[0];
      breathCd -= dt;
      if (breathCd <= 0 && breathing <= 0) { breathing = theme.breath === "lightning" ? 0.7 : 1.1; breathCd = rnd(3.5, 5.5); }
      if (breathing > 0 && s0) {
        breathing -= dt;
        const m = mouthOf(s0), dir = s0.a;
        const n = Math.max(1, Math.round((small ? 35 : 70) * dt));
        for (let i = 0; i < n; i++) {
          const a = dir + rnd(-0.25, 0.25), sp = theme.breath === "mist" ? rnd(90, 170) : rnd(170, 300);
          breath.push({ x: m.x, y: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: rnd(0.45, 0.8), s: R * rnd(0.5, 0.85), c: pick(theme.breathColors), grow: 2.2 });
        }
        if (theme.breath === "lightning") {
          boltT = 0;
          if (!bolt || Math.random() < 0.35) {
            const Lb = R * rnd(7, 11), a = dir + rnd(-0.15, 0.15);
            bolt = jagged(m.x, m.y, m.x + Math.cos(a) * Lb, m.y + Math.sin(a) * Lb, R * 0.9, 9);
            if (Math.random() < 0.25) flash = 0.5;
          }
        }
      }
      jaw += ((breathing > 0 ? 0.45 : 0.06 + Math.max(0, Math.sin(t * 1.7)) * 0.06) - jaw) * Math.min(1, dt * 10);
      if (theme.breath === "lightning" && segs.length === N) {
        arcCd -= dt;
        if (arcCd <= 0) {
          const i = Math.floor(rnd(3, N * 0.5)), j = Math.min(N - 1, i + Math.floor(rnd(6, 14)));
          arc = jagged(segs[i].x, segs[i].y, segs[j].x, segs[j].y, R * 1.5, 8); arcT = 0; arcCd = rnd(0.6, 1.6);
        }
      }
    };

    const draw = (ctx: Ctx) => {
      if (theme.decor === "flames") drawFlames(ctx, W, H, t, R * 0.9, ["#fff3b0", "#ff9a1f", "#ff3412"], easeOut(t / 1.5));
      if (theme.decor === "storm") {
        ctx.globalAlpha = easeOut(t / 1.2);
        for (const [u, s] of [[0.15, 1.1], [0.5, 1.4], [0.85, 1.15]]) drawCloud(ctx, u * W + Math.sin(t * 0.4 + u * 9) * R, -R * 0.2, R * s * 1.3, "#1d2650", "#6f8fe0");
        ctx.globalAlpha = 1;
      }
      if (segs.length === N) drawDragon(ctx, segs, N, R, radius, theme, t, jaw);
      ctx.globalCompositeOperation = "lighter";
      drawSparks(ctx, breath, 0.9);
      if (bolt) strokeBolt(ctx, bolt, theme.glow, Math.max(1.5, R * 0.14), 1 - boltT / 0.12);
      if (arc) strokeBolt(ctx, arc, theme.glow, Math.max(1.2, R * 0.1), 1 - arcT / 0.16);
      ctx.globalCompositeOperation = "source-over";
      if (theme.decor === "clouds") {
        const show = easeOut((t - 0.3) / 1.2);
        ctx.globalAlpha = show;
        for (const c of clouds) drawCloud(ctx, c.u * W + Math.sin(t * 0.5 + c.u * 7) * R * 0.6, c.v * H + Math.cos(t * 0.6 + c.v * 5) * R * 0.3, R * 1.5 * c.s * show, "#eaffd8", "#5fcf8a", c.f);
      }
      if (flash > 0) { ctx.globalAlpha = flash * 0.3; ctx.fillStyle = theme.glow; ctx.fillRect(0, 0, W, H); }
      ctx.globalAlpha = 1;
    };

    return { resize(w, h) { W = w; H = h; size(); }, update, draw, pad: () => R * 5 };
  };
}

/* ---------- phoenix ---------- */

function drawPhoenix(ctx: Ctx, x: number, y: number, a: number, s: number, f: number, t: number) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(a);
  const span = s * (1.15 + 0.8 * f);
  const wingGrad = ctx.createLinearGradient(0, 0, 0, -s * 2.2);
  wingGrad.addColorStop(0, "#fff1a0"); wingGrad.addColorStop(0.45, "#ff9a1f"); wingGrad.addColorStop(1, "#ff2e12");
  for (const m of [1, -1]) {
    ctx.save(); ctx.scale(1, m);
    const tipx = -0.25 * s + 0.25 * s * f, tipy = -span;
    ctx.beginPath(); ctx.moveTo(0.2 * s, -0.12 * s);
    ctx.quadraticCurveTo(0.55 * s, -span * 0.65, tipx, tipy);
    const rearx = -0.55 * s, reary = -0.1 * s;
    for (let k = 1; k <= 6; k++) {
      const q = k / 6, bx = tipx + (rearx - tipx) * q, by = tipy + (reary - tipy) * q;
      ctx.lineTo(bx - s * 0.45 * (1 - q * 0.6), by + s * 0.05);
      ctx.lineTo(bx, by);
    }
    ctx.closePath();
    ctx.globalAlpha = 0.95; ctx.fillStyle = wingGrad; ctx.fill();
    ctx.globalAlpha = 0.5; ctx.strokeStyle = "#fff6c8"; ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.beginPath(); ctx.moveTo(0.2 * s, -0.12 * s); ctx.quadraticCurveTo(0.55 * s, -span * 0.65, tipx, tipy); ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffcf4a"; ctx.beginPath(); ctx.ellipse(-0.05 * s, 0, 0.6 * s, 0.2 * s, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#fff0a8"; ctx.beginPath(); ctx.arc(0.58 * s, 0, 0.17 * s, 0, TAU); ctx.fill();
  ctx.fillStyle = "#ffb000"; ctx.beginPath(); ctx.moveTo(0.72 * s, -0.07 * s); ctx.lineTo(0.95 * s, 0); ctx.lineTo(0.72 * s, 0.07 * s); ctx.fill();
  ctx.fillStyle = "#ff3412";
  for (let k = 0; k < 3; k++) {
    const w = Math.sin(t * 9 + k) * 0.06 * s;
    ctx.beginPath(); ctx.moveTo(0.55 * s, -0.08 * s); ctx.quadraticCurveTo(0.35 * s, (-0.25 + k * 0.2) * s, (0.05 - k * 0.05) * s, (-0.22 + k * 0.22) * s + w); ctx.quadraticCurveTo(0.35 * s, 0, 0.55 * s, 0.08 * s); ctx.fill();
  }
  ctx.globalCompositeOperation = "lighter"; glow(ctx, "#fff6c8", 0.5 * s, 0, s * 0.9, 0.7); ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

/** Phoenix: intro = rises from below the card with a fire trail and flares at the top; loop = hovers over the card's top edge, tail streamers hanging down, a fire border below. */
export const phoenixScene: SceneFactory = (W, H, small) => {
  let s = 0;
  const size = () => { s = clamp(W * 0.15, 28, 62); };
  size();
  let t = 0, flared = false, emit = 0;
  const embers: Spark[] = [];
  const COLORS = ["#fff1a0", "#ffb02e", "#ff6a1a", "#ff3412"];
  const INTRO = 1.5;
  const pos = (): V => {
    const hx = W / 2, hy = Math.max(s * 0.6, H * 0.08);
    if (t < INTRO) { const q = easeOut(t / INTRO); return { x: hx + Math.sin(q * Math.PI) * W * 0.18, y: H + s * 3 + (hy - H - s * 3) * q }; }
    return { x: hx + Math.sin(t * 1.3) * s * 0.18, y: hy + Math.sin(t * 2.1) * s * 0.12 };
  };
  const update = (dt: number) => {
    t += dt;
    stepSparks(embers, dt, 1.3, 40);
    const p = pos();
    if (!flared && t >= INTRO) { flared = true; burst(embers, p.x, p.y, small ? 40 : 70, [120, 320], [s * 0.12, s * 0.3], COLORS, [0.6, 1.3]); }
    emit += dt * (t < INTRO ? 120 : small ? 20 : 35);
    while (emit >= 1) {
      emit--;
      const k = rnd(0, 1);
      embers.push({ x: p.x + rnd(-s, s) * (t < INTRO ? 0.4 : 1.1), y: p.y + s * 0.5 + k * s * 3.5, vx: rnd(-25, 25), vy: rnd(-50, 0), life: 0, max: rnd(0.6, 1.3), s: s * rnd(0.1, 0.25), c: pick(COLORS) });
    }
  };
  const draw = (ctx: Ctx) => {
    drawFlames(ctx, W, H, t, clamp(W * 0.035, 7, 16), ["#fff3b0", "#ffb02e", "#ff4a12"], easeOut((t - 0.8) / 1.5) * 0.9);
    const p = pos(), a = -Math.PI / 2;
    ctx.globalCompositeOperation = "lighter";
    drawSparks(ctx, embers, 0.95);
    glow(ctx, "#ff8a1a", p.x, p.y, s * 3, 0.35);
    const Nn = 20;
    for (const k of [-1, 0, 1]) {
      const L: V[] = [], Rr: V[] = [];
      for (let i = 0; i < Nn; i++) {
        const f = i / (Nn - 1);
        const off = k * s * 0.7 * f + Math.sin(t * 2.4 - i * 0.35 + k) * s * 0.4 * f;
        const cx = p.x + off, cy = p.y + s * 0.4 + i * s * 0.19, w = s * 0.2 * (1 - f) + 1;
        L.push({ x: cx - w, y: cy }); Rr.push({ x: cx + w, y: cy });
      }
      ctx.beginPath();
      L.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
      for (let i = Rr.length - 1; i >= 0; i--) ctx.lineTo(Rr[i].x, Rr[i].y);
      ctx.closePath();
      const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + s * 4.2);
      g.addColorStop(0, "rgba(255,240,170,.95)"); g.addColorStop(0.4, "rgba(255,140,30,.75)"); g.addColorStop(1, "rgba(255,40,20,0)");
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    drawPhoenix(ctx, p.x, p.y, a, s, Math.sin(t * (t < INTRO ? 9 : 4.2)), t);
    ctx.globalAlpha = 1;
  };
  return { resize(w, h) { W = w; H = h; size(); }, update, draw, pad: () => s * 2 };
};

/* ---------- edge-swimmers: koi, butterflies ---------- */

/** Heading that follows the card's border (clockwise when dir=1), pulling the creature back onto it. */
function borderHeading(x: number, y: number, W: number, H: number, dir: number, offset: number): number {
  const dl = Math.abs(x), dr = Math.abs(x - W), dtp = Math.abs(y), db = Math.abs(y - H);
  const m = Math.min(dl, dr, dtp, db);
  let tx = 0, ty = 0, qx = x, qy = y;
  if (m === dtp) { tx = 1; qy = -offset; }
  else if (m === dr) { ty = 1; qx = W + offset; }
  else if (m === db) { tx = -1; qy = H + offset; }
  else { ty = -1; qx = -offset; }
  const pull = 1 / 45;
  return Math.atan2(ty * dir + (qy - y) * pull, tx * dir + (qx - x) * pull);
}

type KoiPattern = { base: string; fin: string; patches: { i: number; off: number; r: number; c: string }[] };
const KOI: KoiPattern[] = [
  { base: "#fff6ee", fin: "#ffd9c2", patches: [{ i: 1, off: 0, r: 0.5, c: "#ff4a1c" }, { i: 4, off: 0.2, r: 0.55, c: "#ff4a1c" }, { i: 7, off: -0.15, r: 0.4, c: "#ff5a24" }] },
  { base: "#ffb000", fin: "#ffd56b", patches: [{ i: 3, off: 0, r: 0.35, c: "#ffd56b" }] },
  { base: "#f7f3ee", fin: "#e8e2da", patches: [{ i: 1, off: -0.1, r: 0.4, c: "#111111" }, { i: 3, off: 0.2, r: 0.45, c: "#ff3a1a" }, { i: 6, off: -0.2, r: 0.4, c: "#111111" }, { i: 8, off: 0.1, r: 0.3, c: "#ff3a1a" }] },
  { base: "#fffaf5", fin: "#f1ebe4", patches: [{ i: 0, off: 0, r: 0.32, c: "#ff2a1a" }] },
  { base: "#ff5a1f", fin: "#ffad7a", patches: [{ i: 2, off: 0.15, r: 0.45, c: "#fff2e8" }, { i: 6, off: -0.1, r: 0.4, c: "#fff2e8" }] },
];

/** Koi: intro = a splash in the middle of the card and the fish dart out to its edges; loop = they circle the border. */
export const koiScene: SceneFactory = (W, H, small) => {
  let s = 0;
  const size = () => { s = clamp(Math.min(W, H) * 0.075, 14, 30); };
  size();
  const N = 11;
  let t = 0, rippleCd = 0.8;
  const ripples: { x: number; y: number; life: number; big?: boolean }[] = [{ x: W / 2, y: H / 2, life: 0, big: true }, { x: W / 2, y: H / 2, life: -0.25, big: true }];
  const count = small ? 4 : 5;
  const fish = Array.from({ length: count }, (_, k) => {
    const a = (k / count) * TAU + rnd(-0.2, 0.2);
    const f = { x: W / 2, y: H / 2, a, v: rnd(48, 70), ph: rnd(0, 6), dir: k % 2 ? 1 : -1, pat: KOI[k % KOI.length], trail: new Trail(), segs: [] as Seg[], sc: rnd(0.85, 1.15) };
    f.trail.pts = [{ x: W / 2 - Math.cos(a), y: H / 2 - Math.sin(a) }, { x: W / 2, y: H / 2 }];
    return f;
  });

  const update = (dt: number) => {
    t += dt;
    const boost = 1 + 3 * Math.exp(-t / 0.6);
    for (const f of fish) {
      if (t > 0.5) {
        const target = borderHeading(f.x, f.y, W, H, f.dir, s * 0.3);
        f.a += angDiff(target, f.a) * dt * 2.2 + Math.sin(t * 0.9 + f.ph) * dt * 0.5;
      }
      const v = f.v * boost * (1 + 0.2 * Math.sin(t * 1.3 + f.ph));
      f.x += Math.cos(f.a) * v * dt; f.y += Math.sin(f.a) * v * dt;
      f.trail.push({ x: f.x, y: f.y }, s * f.sc * 0.42 * N + 10);
      f.trail.sample(N, s * f.sc * 0.42, f.segs);
    }
    rippleCd -= dt;
    if (rippleCd <= 0) { const f = pick(fish); ripples.push({ x: f.x, y: f.y, life: 0 }); rippleCd = rnd(0.9, 1.8); }
    for (let i = ripples.length - 1; i >= 0; i--) { ripples[i].life += dt; if (ripples[i].life > 2.4) ripples.splice(i, 1); }
  };

  const draw = (ctx: Ctx) => {
    ctx.strokeStyle = "#ffffff";
    for (const r of ripples) {
      if (r.life < 0) continue;
      const q = r.life / 2.4, k = r.big ? 3 : 1;
      ctx.lineWidth = r.big ? 2 : 1.4;
      ctx.globalAlpha = (r.big ? 0.45 : 0.28) * (1 - q);
      ctx.beginPath(); ctx.ellipse(r.x, r.y, s * 3.5 * q * k + 2, s * 2.2 * q * k + 1, 0, 0, TAU); ctx.stroke();
      if (q > 0.2) { ctx.beginPath(); ctx.ellipse(r.x, r.y, s * 2.4 * (q - 0.2) * k + 2, s * 1.5 * (q - 0.2) * k + 1, 0, 0, TAU); ctx.stroke(); }
    }
    for (const f of fish) {
      const S = f.segs;
      if (S.length !== N) continue;
      const sz = s * f.sc;
      const rad = (i: number) => { const q = i / (N - 1); return sz * (q < 0.22 ? 0.4 + (q / 0.22) * 0.16 : 0.56 * (1 - Math.pow((q - 0.22) / 0.78, 1.2) * 0.85)); };
      const nx = (i: number) => -Math.sin(S[i].a), ny = (i: number) => Math.cos(S[i].a);
      const bodyPath = (ox: number, oy: number) => {
        ctx.beginPath();
        ctx.moveTo(S[0].x + Math.cos(S[0].a) * sz * 0.42 + ox, S[0].y + Math.sin(S[0].a) * sz * 0.42 + oy);
        for (let i = 0; i < N; i++) ctx.lineTo(S[i].x + nx(i) * rad(i) + ox, S[i].y + ny(i) * rad(i) + oy);
        for (let i = N - 1; i >= 0; i--) ctx.lineTo(S[i].x - nx(i) * rad(i) + ox, S[i].y - ny(i) * rad(i) + oy);
        ctx.closePath();
      };
      bodyPath(sz * 0.35, sz * 0.6); ctx.globalAlpha = 0.18; ctx.fillStyle = "#000000"; ctx.fill();

      ctx.fillStyle = f.pat.fin; ctx.globalAlpha = 0.6;
      const flap = Math.sin(t * 7 + f.ph);
      for (const m of [1, -1]) {
        const i = 2, ang = S[i].a + m * (2.2 + flap * 0.25);
        ctx.beginPath(); ctx.ellipse(S[i].x + nx(i) * m * rad(i) * 0.8, S[i].y + ny(i) * m * rad(i) * 0.8, sz * 0.5, sz * 0.2, ang, 0, TAU); ctx.fill();
      }
      const L = N - 1, ta = S[L].a + Math.PI + flap * 0.35;
      {
        const tx = S[L].x, ty = S[L].y, P = (a: number, d: number): [number, number] => [tx + Math.cos(ta + a) * sz * d, ty + Math.sin(ta + a) * sz * d];
        ctx.beginPath(); ctx.moveTo(...P(Math.PI / 2, 0.12));
        ctx.quadraticCurveTo(...P(0.5, 0.7), ...P(0.62, 1.35));
        ctx.quadraticCurveTo(...P(0.2, 0.95), ...P(0, 0.75));
        ctx.quadraticCurveTo(...P(-0.2, 0.95), ...P(-0.62, 1.35));
        ctx.quadraticCurveTo(...P(-0.5, 0.7), ...P(-Math.PI / 2, 0.12));
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 0.3; ctx.strokeStyle = f.pat.base; ctx.lineWidth = 1; ctx.beginPath();
        for (const a of [-0.45, -0.2, 0.2, 0.45]) { ctx.moveTo(tx, ty); ctx.lineTo(...P(a, 1.1)); }
        ctx.stroke();
      }

      ctx.globalAlpha = 0.95; bodyPath(0, 0); ctx.fillStyle = f.pat.base; ctx.fill();
      ctx.save(); ctx.clip();
      for (const p of f.pat.patches) {
        const i = Math.min(N - 1, p.i), r = rad(i);
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.ellipse(S[i].x + nx(i) * r * p.off, S[i].y + ny(i) * r * p.off, sz * p.r * 1.3, sz * p.r, S[i].a, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 0.25; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = sz * 0.12;
      ctx.beginPath(); for (let i = 0; i < N - 2; i++) (i ? ctx.lineTo(S[i].x, S[i].y) : ctx.moveTo(S[i].x, S[i].y)); ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 0.9; ctx.fillStyle = "#14110f";
      for (const m of [1, -1]) { ctx.beginPath(); ctx.arc(S[0].x + Math.cos(S[0].a) * sz * 0.18 + nx(0) * m * sz * 0.26, S[0].y + Math.sin(S[0].a) * sz * 0.18 + ny(0) * m * sz * 0.26, sz * 0.06, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  };

  return { resize(w, h) { W = w; H = h; size(); }, update, draw, pad: () => s * 2.2 };
};

type Wing = { inner: string; outer: string; edge: string; spot: string; trail: string };
const WINGS: Wing[] = [
  { inner: "#9eeaff", outer: "#1450d8", edge: "#061a4a", spot: "#ffffff", trail: "#5ab0ff" },
  { inner: "#ffc070", outer: "#ff6a00", edge: "#1a0a00", spot: "#ffffff", trail: "#ffb347" },
  { inner: "#ffe0f6", outer: "#ff4fbf", edge: "#5a0a3a", spot: "#ffffff", trail: "#ff8fd8" },
  { inner: "#f0ffc0", outer: "#7fd11b", edge: "#123000", spot: "#eaffb0", trail: "#b6ff3b" },
];
const wingCache = new Map<Wing, HTMLCanvasElement>();
function wingSprite(w: Wing) {
  let c = wingCache.get(w);
  if (c) return c;
  const S = 64;
  c = document.createElement("canvas"); c.width = S; c.height = S * 2;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(0, S, S * 0.1, 0, S, S * 1.1);
  grad.addColorStop(0, w.inner); grad.addColorStop(0.7, w.outer); grad.addColorStop(1, w.edge);
  g.fillStyle = grad; g.strokeStyle = w.edge; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, S * 0.95); g.bezierCurveTo(S * 0.3, S * 0.1, S * 1.0, -S * 0.02, S * 0.94, S * 0.42); g.bezierCurveTo(S * 0.9, S * 0.8, S * 0.4, S * 1.0, 0, S * 1.0); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(0, S * 1.0); g.bezierCurveTo(S * 0.7, S * 0.95, S * 0.85, S * 1.5, S * 0.45, S * 1.75); g.bezierCurveTo(S * 0.2, S * 1.88, S * 0.05, S * 1.4, 0, S * 1.05); g.fill(); g.stroke();
  g.globalAlpha = 0.35; g.lineWidth = 1.2;
  g.beginPath();
  for (const [x, y] of [[0.8, 0.25], [0.7, 0.6], [0.45, 0.2], [0.6, 1.45], [0.35, 1.6]]) { g.moveTo(2, S); g.lineTo(x * S, y * S); }
  g.stroke();
  g.globalAlpha = 0.95; g.fillStyle = w.spot;
  for (const [x, y, r] of [[0.82, 0.38, 0.05], [0.72, 0.2, 0.04], [0.88, 0.55, 0.035], [0.5, 1.62, 0.04], [0.62, 1.5, 0.03]]) { g.beginPath(); g.arc(x * S, y * S, r * S, 0, TAU); g.fill(); }
  wingCache.set(w, c);
  return c;
}

/** Butterflies: intro = a swarm bursts out of the card's centre; loop = they flutter along its edges and some perch on the top edge. */
export const butterflyScene: SceneFactory = (W, H, small) => {
  let t = 0;
  const trail: Spark[] = [];
  const count = small ? 6 : 8;
  const flies = Array.from({ length: count }, (_, k) => ({
    x: W / 2 + rnd(-10, 10), y: H * 0.35 + rnd(-10, 10), a: (k / count) * TAU + rnd(-0.3, 0.3),
    v: rnd(200, 280), cruise: rnd(50, 80), flap: rnd(0, 6), fs: rnd(13, 18), sz: rnd(15, 22) * (small ? 0.9 : 1), w: WINGS[k % WINGS.length], ph: rnd(0, 6), dot: 0,
    dir: k % 2 ? 1 : -1, perch: 0, perchX: 0,
  }));

  const update = (dt: number) => {
    t += dt;
    stepSparks(trail, dt, 1, 6);
    const perched = flies.filter((b) => b.perch > 0).length;
    for (const b of flies) {
      if (b.perch > 0) {
        b.perch -= dt; b.x = b.perchX; b.y = 0; b.a = -Math.PI / 2;
        b.flap += dt * 1.6;
        if (b.perch <= 0) { b.a = -Math.PI / 2 + rnd(-0.8, 0.8); b.v = b.cruise * 1.5; }
        continue;
      }
      b.v += (b.cruise - b.v) * Math.min(1, dt * 1.4);
      if (t > 0.4) {
        const target = borderHeading(b.x, b.y, W, H, b.dir, 8);
        b.a += angDiff(target, b.a) * dt * 2.6 + Math.sin(t * 1.9 + b.ph) * dt * 2;
      }
      b.x += Math.cos(b.a) * b.v * dt; b.y += (Math.sin(b.a) * b.v + Math.sin(t * 6 + b.ph) * 16) * dt;
      b.flap += dt * b.fs;
      if (t > 3 && perched < 2 && Math.abs(b.y) < 16 && b.x > W * 0.12 && b.x < W * 0.88 && Math.random() < dt * 0.35) { b.perch = rnd(3, 6); b.perchX = b.x; }
      b.dot -= dt;
      if (b.dot <= 0) { b.dot = small ? 0.12 : 0.08; trail.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0, max: 0.9, s: b.sz * 0.22, c: b.w.trail }); }
    }
  };

  const draw = (ctx: Ctx) => {
    ctx.globalCompositeOperation = "lighter"; drawSparks(ctx, trail, 0.7); ctx.globalCompositeOperation = "source-over";
    for (const b of flies) {
      const sp = wingSprite(b.w);
      const open = b.perch > 0 ? 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(b.flap)) : 0.18 + 0.82 * Math.abs(Math.sin(b.flap));
      ctx.save();
      ctx.translate(b.x, b.y); ctx.rotate(b.a + Math.PI / 2);
      ctx.globalAlpha = 0.97;
      for (const m of [1, -1]) { ctx.save(); ctx.scale(m * open, 1); ctx.drawImage(sp, 0, -b.sz, b.sz, b.sz * 2); ctx.restore(); }
      ctx.fillStyle = "#14100c"; ctx.beginPath(); ctx.ellipse(0, 0, b.sz * 0.08, b.sz * 0.55, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#14100c"; ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(0, -b.sz * 0.5); ctx.quadraticCurveTo(-b.sz * 0.15, -b.sz * 0.85, -b.sz * 0.3, -b.sz * 0.95);
      ctx.moveTo(0, -b.sz * 0.5); ctx.quadraticCurveTo(b.sz * 0.15, -b.sz * 0.85, b.sz * 0.3, -b.sz * 0.95); ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };

  return { resize(w, h) { W = w; H = h; }, update, draw, pad: () => 56 };
};

/* ---------- inside the card: aurora, jellyfish ---------- */

/** Aurora: intro = the curtains drop in from the top of the card; loop = they wave over twinkling stars. */
export const auroraScene: SceneFactory = (W, H, small) => {
  let t = 0;
  const RIBBONS = [{ c: "#4fffa8", k: 0 }, { c: "#39d0ff", k: 1 }, { c: "#b14fff", k: 2 }];
  const col = new Map<string, HTMLCanvasElement>();
  const column = (c: string) => {
    let s = col.get(c);
    if (!s) {
      s = document.createElement("canvas"); s.width = 4; s.height = 128;
      const g = s.getContext("2d")!, gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, rgba(c, 0)); gr.addColorStop(0.75, rgba(c, 0.55)); gr.addColorStop(0.93, rgba(c, 1)); gr.addColorStop(1, rgba(c, 0));
      g.fillStyle = gr; g.fillRect(0, 0, 4, 128); col.set(c, s);
    }
    return s;
  };
  let stars: { x: number; y: number; r: number; ph: number }[] = [];
  const seed = () => { stars = Array.from({ length: Math.round(clamp((W * H) / 4000, 20, 70)) }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(0.6, 1.7), ph: rnd(0, 6) })); };
  seed();
  return {
    resize(w, h) { W = w; H = h; seed(); },
    update(dt) { t += dt; },
    draw(ctx) {
      const show = easeOut(t / 1.6), drop = (1 - show) * H * 0.35;
      ctx.fillStyle = "#ffffff";
      for (const s of stars) { ctx.globalAlpha = show * (0.35 + 0.45 * Math.sin(t * 2 + s.ph)); ctx.fillRect(s.x, s.y, s.r, s.r); }
      ctx.globalCompositeOperation = "lighter";
      const step = small ? 6 : 5;
      for (const r of RIBBONS) {
        const sp = column(r.c);
        for (let x = 0; x < W; x += step) {
          const base = H * (0.2 + r.k * 0.08) + Math.sin(x * 0.012 + t * 0.4 + r.k * 1.7) * H * 0.06 + Math.sin(x * 0.03 - t * 0.7 + r.k) * H * 0.02 - drop;
          const hgt = H * (0.2 + 0.08 * Math.sin(x * 0.02 + t * 0.5 + r.k * 2));
          ctx.globalAlpha = 0.34 * (0.55 + 0.45 * Math.sin(x * 0.05 + t * 1.4 + r.k * 3)) * show;
          ctx.drawImage(sp, 1, 0, 2, 128, x, base - hgt, step, hgt);
        }
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    },
    pad: () => 0,
  };
};

/** Jellyfish: intro = a bloom of jellies rushes up through the card; loop = a few drift up slowly. */
export const jellyScene: SceneFactory = (W, H, small) => {
  let t = 0;
  const COLORS = ["#5ff3ff", "#ff6bf0", "#a98bff", "#7dffcf"];
  const base = small ? 3 : 4;
  const make = (y: number, fast: boolean) => {
    const s = rnd(14, 26) * clamp(W / 380, 0.75, 1.3);
    return { x: rnd(0.1, 0.9) * W, y, s, p: rnd(0, 6), c: pick(COLORS), drift: rnd(0, 6), sp: rnd(0.9, 1.4), fast };
  };
  const jellies = [
    ...Array.from({ length: base * 2 }, () => make(H + rnd(10, H * 0.5), true)),
    ...Array.from({ length: base }, () => make(rnd(0.4, 1) * H, false)),
  ];
  return {
    resize(w, h) { W = w; H = h; },
    update(dt) {
      t += dt;
      for (let i = jellies.length - 1; i >= 0; i--) {
        const j = jellies[i];
        j.p += dt * 1.5 * j.sp * (j.fast ? 2.2 : 1);
        const c = Math.pow(Math.max(0, Math.sin(j.p)), 2);
        j.y -= (8 + 55 * c) * dt * (j.s / 22) * (j.fast ? 3.5 : 1);
        j.x += Math.sin(t * 0.4 + j.drift) * 8 * dt;
        if (j.y < -j.s * 5) { if (j.fast) jellies.splice(i, 1); else jellies[i] = make(H + j.s * 2, false); }
      }
    },
    draw(ctx) {
      ctx.globalCompositeOperation = "lighter";
      for (const j of jellies) {
        const c = Math.pow(Math.max(0, Math.sin(j.p)), 2);
        const bw = j.s * (1 - 0.2 * c), bh = j.s * (0.75 + 0.15 * c), x = j.x, y = j.y;
        glow(ctx, j.c, x, y, j.s * 2.6, 0.3);
        ctx.strokeStyle = j.c; ctx.lineCap = "round";
        for (let k = 0; k < 7; k++) {
          const ox = ((k / 6) - 0.5) * bw * 1.6;
          ctx.globalAlpha = 0.45; ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.moveTo(x + ox, y);
          for (let q = 1; q <= 10; q++) ctx.lineTo(x + ox * (1 - q * 0.03) + Math.sin(t * 2.2 - q * 0.6 + k) * j.s * 0.14 * (q / 10), y + q * j.s * (0.3 - 0.08 * c));
          ctx.stroke();
        }
        ctx.lineWidth = j.s * 0.12; ctx.globalAlpha = 0.5;
        for (const m of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(x + m * bw * 0.15, y);
          for (let q = 1; q <= 6; q++) ctx.lineTo(x + m * bw * 0.15 + Math.sin(t * 3 + q + m) * j.s * 0.18, y + q * j.s * 0.28);
          ctx.stroke();
        }
        ctx.globalAlpha = 0.42; ctx.fillStyle = j.c;
        ctx.beginPath(); ctx.moveTo(x - bw, y);
        ctx.bezierCurveTo(x - bw, y - bh * 1.35, x + bw, y - bh * 1.35, x + bw, y);
        for (let k = 1; k <= 6; k++) { const xx = x + bw - (k / 6) * bw * 2; ctx.quadraticCurveTo(xx + bw / 6, y + j.s * 0.14, xx, y); }
        ctx.fill();
        ctx.globalAlpha = 0.85; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.globalAlpha = 0.55; ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.ellipse(x - bw * 0.35, y - bh * 0.7, bw * 0.18, bh * 0.12, -0.5, 0, TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    },
    pad: () => 0,
  };
};

export const SCENES: Record<string, SceneFactory> = {
  jadedragon: dragonScene(DRAGONS.jade),
  infernodragon: dragonScene(DRAGONS.inferno),
  stormdragon: dragonScene(DRAGONS.storm),
  phoenix: phoenixScene,
  koi: koiScene,
  butterflies: butterflyScene,
  aurora: auroraScene,
  jellyfish: jellyScene,
};
