/**
 * Scene effects: hand-drawn (procedural) creatures that fly over the profile — dragons, a phoenix, koi, butterflies,
 * an aurora and jellyfish. Everything is drawn on the one effect canvas with plain 2D paths and pre-rendered glow
 * sprites (no shadowBlur, no filters), so even the big ones stay cheap on phones.
 */

type Ctx = CanvasRenderingContext2D;
type V = { x: number; y: number };
type Seg = { x: number; y: number; a: number };
export type Scene = { resize(W: number, H: number): void; update(dt: number): void; draw(ctx: Ctx): void; probe?: () => V | undefined };
export type SceneFactory = (W: number, H: number, small: boolean) => Scene;

const TAU = Math.PI * 2;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const angDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

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

/* ---------- shared: a curved pass across the screen + a body that follows the head ---------- */

class Pass {
  p: V[];
  len = 0;
  u = 0;
  side: 1 | -1;
  constructor(W: number, H: number, margin: number) {
    const vertical = H > W * 1.15 ? Math.random() < 0.55 : Math.random() < 0.12;
    const up = Math.random() < 0.5;
    let a: V, b: V, c1: V, c2: V;
    if (!vertical) {
      a = { x: -margin, y: rnd(0.15, 0.85) * H };
      b = { x: W + margin, y: rnd(0.15, 0.85) * H };
      c1 = { x: W * rnd(0.25, 0.4), y: (up ? rnd(-0.1, 0.25) : rnd(0.75, 1.1)) * H };
      c2 = { x: W * rnd(0.6, 0.75), y: (up ? rnd(0.75, 1.1) : rnd(-0.1, 0.25)) * H };
    } else {
      a = { x: rnd(0.15, 0.85) * W, y: -margin };
      b = { x: rnd(0.15, 0.85) * W, y: H + margin };
      c1 = { y: H * rnd(0.25, 0.4), x: (up ? rnd(-0.15, 0.25) : rnd(0.75, 1.15)) * W };
      c2 = { y: H * rnd(0.6, 0.75), x: (up ? rnd(0.75, 1.15) : rnd(-0.15, 0.25)) * W };
    }
    if (Math.random() < 0.5) { [a, b] = [b, a]; [c1, c2] = [c2, c1]; }
    this.p = [a, c1, c2, b];
    this.side = vertical ? (Math.random() < 0.5 ? 1 : -1) : b.x > a.x ? 1 : -1;
    let prev = this.at(0);
    for (let i = 1; i <= 40; i++) { const q = this.at(i / 40); this.len += Math.hypot(q.x - prev.x, q.y - prev.y); prev = q; }
  }
  private at(u: number): V {
    const [a, b, c, d] = this.p, m = 1 - u;
    return {
      x: m * m * m * a.x + 3 * m * m * u * b.x + 3 * m * u * u * c.x + u * u * u * d.x,
      y: m * m * m * a.y + 3 * m * m * u * b.y + 3 * m * u * u * c.y + u * u * u * d.y,
    };
  }
  deriv(u: number): V {
    u = Math.min(1, u);
    const [a, b, c, d] = this.p, m = 1 - u;
    return {
      x: 3 * m * m * (b.x - a.x) + 6 * m * u * (c.x - b.x) + 3 * u * u * (d.x - c.x),
      y: 3 * m * m * (b.y - a.y) + 6 * m * u * (c.y - b.y) + 3 * u * u * (d.y - c.y),
    };
  }
  point(u: number): V {
    if (u <= 1) return this.at(u);
    const d = this.deriv(1), m = Math.hypot(d.x, d.y) || 1, e = this.p[3];
    return { x: e.x + (d.x / m) * (u - 1) * this.len, y: e.y + (d.y / m) * (u - 1) * this.len };
  }
  /** Move the head `dist` px along the path; returns the head with a sideways wave applied. */
  advance(dist: number, waveAmp: number, wavePhase: number): V {
    const d = this.deriv(this.u), m = Math.hypot(d.x, d.y) || 1;
    this.u += dist / (this.u < 1 ? m : this.len);
    const base = this.point(this.u), d2 = this.deriv(this.u), m2 = Math.hypot(d2.x, d2.y) || 1;
    const w = Math.sin(wavePhase) * waveAmp;
    return { x: base.x - (d2.y / m2) * w, y: base.y + (d2.x / m2) * w };
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

/* ---------- dragons ---------- */

type DragonTheme = {
  body: string; dark: string; light: string; belly: string; spine: string; horn: string; eye: string; glow: string;
  breath: "fire" | "mist" | "lightning"; breathColors: string[];
};

export const DRAGONS: Record<string, DragonTheme> = {
  jade: { body: "#1fae62", dark: "#0a4f2c", light: "#8dffbd", belly: "#eef8c8", spine: "#b6ff3b", horn: "#f4eccb", eye: "#fff36b", glow: "#39ff88", breath: "mist", breathColors: ["#f0ffd0", "#9dff6b", "#2fd17a"] },
  inferno: { body: "#c8161c", dark: "#560408", light: "#ff8a3d", belly: "#ffd27a", spine: "#ffb000", horn: "#ffe7b0", eye: "#fffbe0", glow: "#ff5a1f", breath: "fire", breathColors: ["#fff6c8", "#ffb02e", "#ff3d12"] },
  storm: { body: "#2b4fd8", dark: "#0c1a58", light: "#9cc0ff", belly: "#dfe9ff", spine: "#7df9ff", horn: "#eef3ff", eye: "#ffffff", glow: "#5ab0ff", breath: "lightning", breathColors: ["#ffffff", "#9fe8ff", "#5ab0ff"] },
};

export function dragonScene(theme: DragonTheme): SceneFactory {
  return (W0, H0, small) => {
    let W = W0, H = H0;
    const N = small ? 40 : 50;
    let R = 0, spacing = 0, bodyLen = 0, speed = 0;
    const size = () => {
      R = clamp(Math.min(W, H) * 0.03, 9, 22);
      spacing = R * 0.66;
      bodyLen = spacing * (N - 1);
      speed = clamp(Math.max(W, H) * 0.36, 300, 720);
    };
    size();
    const radius = new Array<number>(N).fill(0).map((_, i) => {
      const t = i / (N - 1);
      return t < 0.1 ? 0.78 + (t / 0.1) * 0.22 : 1 - Math.pow((t - 0.1) / 0.9, 1.35) * 0.86;
    });
    let pass: Pass | null = null;
    let wait = 0.15;
    let t = 0, wave = 0;
    const trail = new Trail();
    const segs: Seg[] = [];
    const breath: Spark[] = [];
    let breathing = 0, breathCd = rnd(0.6, 1.2), jaw = 0.05, flash = 0;
    let bolt: V[] | null = null, boltT = 0;
    let arc: V[] | null = null, arcT = 0, arcCd = 1;

    const start = () => {
      pass = new Pass(W, H, R * 7);
      trail.pts = [];
      breathCd = rnd(0.5, 1.1);
    };

    const head = () => segs[0];
    const onScreen = (p: V, m = 0) => p.x > -m && p.x < W + m && p.y > -m && p.y < H + m;
    const mouth = (): V => {
      const s = head(), h = R * 1.6, side = pass?.side ?? 1;
      const lx = 1.9 * h, ly = 0.12 * h * side;
      return { x: s.x + Math.cos(s.a) * lx - Math.sin(s.a) * ly, y: s.y + Math.sin(s.a) * lx + Math.cos(s.a) * ly };
    };

    const update = (dt: number) => {
      t += dt;
      stepSparks(breath, dt, theme.breath === "fire" ? 1.4 : 1.1, theme.breath === "mist" ? 18 : 30);
      flash = Math.max(0, flash - dt * 2.2);
      if (bolt) { boltT += dt; if (boltT > 0.12) bolt = null; }
      if (arc) { arcT += dt; if (arcT > 0.16) arc = null; }
      if (!pass) { wait -= dt; if (wait <= 0) start(); else return; }
      const p = pass!;
      wave += dt * (TAU * speed) / (bodyLen * 0.62);
      const h = p.advance(speed * dt, R * 1.5, wave);
      trail.push(h, bodyLen + R * 4);
      trail.sample(N, spacing, segs);

      const s0 = head();
      const visible = onScreen(s0, -R * 2);
      breathCd -= dt;
      if (visible && breathCd <= 0 && breathing <= 0) { breathing = theme.breath === "lightning" ? 0.7 : 1.1; breathCd = rnd(2.2, 3.4); }
      if (breathing > 0) {
        breathing -= dt;
        const m = mouth(), dir = s0.a;
        const rate = small ? 40 : 90;
        const n = Math.max(1, Math.round(rate * dt));
        for (let i = 0; i < n; i++) {
          const a = dir + rnd(-0.22, 0.22), v = theme.breath === "mist" ? rnd(140, 260) : rnd(260, 480);
          breath.push({ x: m.x, y: m.y, vx: Math.cos(a) * v + Math.cos(dir) * speed * 0.4, vy: Math.sin(a) * v + Math.sin(dir) * speed * 0.4, life: 0, max: rnd(0.45, 0.85), s: R * rnd(0.5, 0.9), c: pick(theme.breathColors), grow: 2.4 });
        }
        if (theme.breath === "lightning") {
          boltT = 0;
          if (!bolt || Math.random() < 0.35) {
            const L = R * rnd(9, 15), a = dir + rnd(-0.15, 0.15);
            bolt = jagged(m.x, m.y, m.x + Math.cos(a) * L, m.y + Math.sin(a) * L, R * 1.1, 10);
            if (Math.random() < 0.25) flash = 0.5;
          }
        }
      }
      jaw += ((breathing > 0 ? 0.45 : 0.06 + Math.max(0, Math.sin(t * 1.7)) * 0.06) - jaw) * Math.min(1, dt * 10);
      if (theme.breath === "lightning" && visible) {
        arcCd -= dt;
        if (arcCd <= 0) {
          const i = Math.floor(rnd(3, N * 0.5)), j = Math.min(N - 1, i + Math.floor(rnd(6, 14)));
          arc = jagged(segs[i].x, segs[i].y, segs[j].x, segs[j].y, R * 1.6, 8); arcT = 0; arcCd = rnd(0.5, 1.4);
        }
      }
      if (p.u > 1 && !onScreen(segs[N - 1], R * 4) && !onScreen(s0, R * 4)) { pass = null; wait = rnd(6, 10); }
    };

    const drawDragon = (ctx: Ctx) => {
      const p = pass!, side = p.side, S = segs;
      const r = (i: number) => radius[i] * R;
      const nx = (i: number) => Math.sin(S[i].a) * side, ny = (i: number) => -Math.cos(S[i].a) * side;
      const dx = (i: number) => Math.cos(S[i].a), dy = (i: number) => Math.sin(S[i].a);

      // soft aura
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < N; i += 3) glow(ctx, theme.glow, S[i].x, S[i].y, r(i) * 3.4, 0.2);
      ctx.globalCompositeOperation = "source-over";

      const leg = (i: number, phase: number, near: boolean) => {
        const ri = R * 0.9, vx = -nx(i), vy = -ny(i), fx = dx(i), fy = dy(i);
        const sw = Math.sin(t * 7 + phase) * 0.55;
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

      // dorsal spines
      ctx.globalAlpha = 1; ctx.fillStyle = theme.spine; ctx.beginPath();
      for (let i = 2; i < N - 2; i++) {
        const ri = r(i), bx = S[i].x + nx(i) * ri * 0.7, by = S[i].y + ny(i) * ri * 0.7;
        const hgt = ri * (i % 2 ? 0.8 : 1.3) * (1 + 0.14 * Math.sin(t * 6 - i * 0.7));
        ctx.moveTo(bx + dx(i) * ri * 0.5, by + dy(i) * ri * 0.5);
        ctx.lineTo(bx + nx(i) * hgt - dx(i) * ri * 0.9, by + ny(i) * hgt - dy(i) * ri * 0.9);
        ctx.lineTo(bx - dx(i) * ri * 0.5, by - dy(i) * ri * 0.5);
      }
      ctx.fill();

      // body
      ctx.beginPath();
      for (let i = 0; i < N; i++) { const x = S[i].x + nx(i) * r(i), y = S[i].y + ny(i) * r(i); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      for (let i = N - 1; i >= 0; i--) ctx.lineTo(S[i].x - nx(i) * r(i), S[i].y - ny(i) * r(i));
      ctx.closePath();
      const g = ctx.createLinearGradient(S[0].x, S[0].y, S[N - 1].x, S[N - 1].y);
      g.addColorStop(0, theme.light); g.addColorStop(0.2, theme.body); g.addColorStop(0.75, theme.body); g.addColorStop(1, theme.dark);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = theme.dark; ctx.lineWidth = Math.max(1, R * 0.08); ctx.globalAlpha = 0.6; ctx.stroke();

      // belly plates
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

      // scales + highlight
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

      // tail flame
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

      // mane
      ctx.strokeStyle = theme.spine; ctx.lineCap = "round"; ctx.globalAlpha = 0.85;
      for (let i = 0; i < 7; i++) {
        const ri = r(i), bx = S[i].x + nx(i) * ri * 0.55, by = S[i].y + ny(i) * ri * 0.55, w = Math.sin(t * 5 + i * 0.9) * ri * 0.7;
        ctx.lineWidth = ri * (0.28 - i * 0.02);
        ctx.beginPath(); ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + nx(i) * ri * 1.3 - dx(i) * ri * 1.2, by + ny(i) * ri * 1.3 - dy(i) * ri * 1.2,
          bx + nx(i) * (ri * 0.7 + w) - dx(i) * ri * 2.6, by + ny(i) * (ri * 0.7 + w) - dy(i) * ri * 2.6);
        ctx.stroke();
      }

      drawHead(ctx, S[0], side);
    };

    const drawHead = (ctx: Ctx, s: Seg, side: number) => {
      const h = R * 1.6;
      ctx.save();
      ctx.translate(s.x, s.y); ctx.rotate(s.a); ctx.scale(1, side);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      const horn = (dxo: number, alpha: number, color: string) => {
        ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = h * 0.17;
        ctx.beginPath(); ctx.moveTo(-0.15 * h + dxo, -0.68 * h); ctx.quadraticCurveTo(-0.5 * h + dxo, -1.5 * h, -1.55 * h + dxo, -1.72 * h); ctx.stroke();
        ctx.lineWidth = h * 0.11;
        ctx.beginPath(); ctx.moveTo(-0.55 * h + dxo, -1.28 * h); ctx.quadraticCurveTo(-0.6 * h + dxo, -1.7 * h, -0.85 * h + dxo, -1.95 * h); ctx.stroke();
      };
      horn(0.25 * h, 0.75, theme.dark);

      // whisker (far)
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

      // lower jaw
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

      // skull
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

      // fangs
      ctx.globalAlpha = 1; ctx.fillStyle = "#ffffff"; ctx.beginPath();
      for (const x of [0.75, 1.4]) { ctx.moveTo(x * h, 0.13 * h); ctx.lineTo((x + 0.06) * h, 0.36 * h); ctx.lineTo((x + 0.13) * h, 0.12 * h); }
      ctx.fill();

      // cheek frills
      ctx.fillStyle = theme.spine; ctx.globalAlpha = 0.95; ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const y = -0.05 * h + k * 0.22 * h, w = Math.sin(t * 6 + k) * 0.08 * h;
        ctx.moveTo(-0.4 * h, y - 0.1 * h); ctx.lineTo(-1.15 * h - k * 0.1 * h, y + 0.12 * h + w); ctx.lineTo(-0.4 * h, y + 0.1 * h);
      }
      ctx.fill();

      // brow + eye
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
    };

    return {
      probe: () => segs[0],
      resize(w, h) { W = w; H = h; size(); },
      update,
      draw(ctx) {
        if (pass && segs.length === N) drawDragon(ctx);
        ctx.globalCompositeOperation = "lighter";
        drawSparks(ctx, breath, 0.9);
        if (bolt) strokeBolt(ctx, bolt, theme.glow, Math.max(1.5, R * 0.14), 1 - boltT / 0.12);
        if (arc) strokeBolt(ctx, arc, theme.glow, Math.max(1.2, R * 0.1), 1 - arcT / 0.16);
        ctx.globalCompositeOperation = "source-over";
        if (flash > 0) { ctx.globalAlpha = flash * 0.35; ctx.fillStyle = theme.glow; ctx.fillRect(0, 0, W, H); }
        ctx.globalAlpha = 1;
      },
    };
  };
}

/* ---------- phoenix ---------- */

export const phoenixScene: SceneFactory = (W0, H0, small) => {
  let W = W0, H = H0, s = 0, speed = 0;
  const size = () => { s = clamp(Math.min(W, H) * 0.09, 34, 80); speed = clamp(Math.max(W, H) * 0.4, 340, 800); };
  size();
  const N = 26;
  let pass: Pass | null = null, wait = 0.15, t = 0, wave = 0, emit = 0;
  const trail = new Trail();
  const segs: Seg[] = [];
  const embers: Spark[] = [];
  const COLORS = ["#fff1a0", "#ffb02e", "#ff6a1a", "#ff3412"];

  const update = (dt: number) => {
    t += dt;
    stepSparks(embers, dt, 1.2, 40);
    if (!pass) { wait -= dt; if (wait <= 0) { pass = new Pass(W, H, s * 4); trail.pts = []; } else return; }
    wave += dt * 2.4;
    const h = pass.advance(speed * dt, s * 0.7, wave);
    trail.push(h, s * 0.38 * N + s);
    trail.sample(N, s * 0.38, segs);
    emit += dt * (small ? 45 : 100);
    while (emit >= 1) {
      emit--;
      const i = Math.floor(rnd(0, N));
      const g = segs[i];
      if (!g) break;
      embers.push({ x: g.x + rnd(-s, s) * 0.5, y: g.y + rnd(-s, s) * 0.5, vx: rnd(-40, 40), vy: rnd(-60, 10), life: 0, max: rnd(0.7, 1.5), s: s * rnd(0.12, 0.3), c: pick(COLORS) });
    }
    const tail = segs[N - 1];
    if (pass.u > 1 && tail && (tail.x < -s * 6 || tail.x > W + s * 6 || tail.y < -s * 6 || tail.y > H + s * 6)) { pass = null; wait = rnd(5, 8); }
  };

  const draw = (ctx: Ctx) => {
    ctx.globalCompositeOperation = "lighter";
    drawSparks(ctx, embers, 0.95);
    if (!pass || segs.length !== N) { ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; return; }
    const S = segs, h0 = S[0];
    glow(ctx, "#ff8a1a", h0.x, h0.y, s * 4, 0.55);

    // tail streamers
    for (const k of [-1, 0, 1]) {
      ctx.beginPath();
      const pts: V[] = [], pts2: V[] = [];
      for (let i = 0; i < N; i++) {
        const f = i / (N - 1), a = S[i].a, nx = -Math.sin(a), ny = Math.cos(a);
        const off = k * s * 0.9 * f + Math.sin(t * 6 - i * 0.45 + k) * s * 0.35 * f;
        const w = s * 0.2 * (1 - f) + 1;
        pts.push({ x: S[i].x + nx * (off + w), y: S[i].y + ny * (off + w) });
        pts2.push({ x: S[i].x + nx * (off - w), y: S[i].y + ny * (off - w) });
      }
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      for (let i = pts2.length - 1; i >= 0; i--) ctx.lineTo(pts2[i].x, pts2[i].y);
      ctx.closePath();
      const g = ctx.createLinearGradient(S[0].x, S[0].y, S[N - 1].x, S[N - 1].y);
      g.addColorStop(0, "rgba(255,240,170,.95)"); g.addColorStop(0.4, "rgba(255,140,30,.75)"); g.addColorStop(1, "rgba(255,40,20,0)");
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";

    // bird
    ctx.save();
    ctx.translate(h0.x, h0.y); ctx.rotate(h0.a);
    const f = Math.sin(t * 7), span = s * (1.15 + 0.8 * f);
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
    ctx.globalAlpha = 1;
  };

  return { resize(w, h) { W = w; H = h; size(); }, update, draw };
};

/* ---------- wandering creatures (koi, butterflies) ---------- */

function steer(x: number, y: number, a: number, W: number, H: number, margin: number, avoid: number): number {
  let fx = Math.cos(a), fy = Math.sin(a);
  if (x < margin) fx += 1.6; else if (x > W - margin) fx -= 1.6;
  if (y < margin) fy += 1.6; else if (y > H - margin) fy -= 1.6;
  if (avoid) {
    const dx = (x - W / 2) / (W * 0.28), dy = (y - H / 2) / (H * 0.3), d = dx * dx + dy * dy;
    if (d < 1) { const l = Math.sqrt(d) || 1; fx += (dx / l) * avoid; fy += (dy / l) * avoid; }
  }
  return Math.atan2(fy, fx);
}

type KoiPattern = { base: string; fin: string; patches: { i: number; off: number; r: number; c: string }[] };
const KOI: KoiPattern[] = [
  { base: "#fff6ee", fin: "#ffd9c2", patches: [{ i: 1, off: 0, r: 0.5, c: "#ff4a1c" }, { i: 4, off: 0.2, r: 0.55, c: "#ff4a1c" }, { i: 7, off: -0.15, r: 0.4, c: "#ff5a24" }] },
  { base: "#ffb000", fin: "#ffd56b", patches: [{ i: 3, off: 0, r: 0.35, c: "#ffd56b" }] },
  { base: "#f7f3ee", fin: "#e8e2da", patches: [{ i: 1, off: -0.1, r: 0.4, c: "#111111" }, { i: 3, off: 0.2, r: 0.45, c: "#ff3a1a" }, { i: 6, off: -0.2, r: 0.4, c: "#111111" }, { i: 8, off: 0.1, r: 0.3, c: "#ff3a1a" }] },
  { base: "#fffaf5", fin: "#f1ebe4", patches: [{ i: 0, off: 0, r: 0.32, c: "#ff2a1a" }] },
  { base: "#ff5a1f", fin: "#ffad7a", patches: [{ i: 2, off: 0.15, r: 0.45, c: "#fff2e8" }, { i: 6, off: -0.1, r: 0.4, c: "#fff2e8" }] },
];

export const koiScene: SceneFactory = (W0, H0, small) => {
  let W = W0, H = H0, s = 0;
  const size = () => { s = clamp(Math.min(W, H) * 0.042, 17, 36); };
  size();
  const N = 11;
  let t = 0, rippleCd = 0.4;
  const ripples: { x: number; y: number; life: number }[] = [];
  const fish = Array.from({ length: small ? 3 : 5 }, (_, k) => {
    const x = rnd(0.05, 0.95) * W, y = (k % 2 ? rnd(0.05, 0.25) : rnd(0.75, 0.95)) * H;
    const f = { x, y, a: rnd(0, TAU), v: rnd(45, 70), ph: rnd(0, 6), pat: KOI[k % KOI.length], trail: new Trail(), segs: [] as Seg[], sc: rnd(0.85, 1.2) };
    for (let i = 20; i >= 0; i--) f.trail.pts.push({ x: x - Math.cos(f.a) * i * 4, y: y - Math.sin(f.a) * i * 4 });
    return f;
  });

  const update = (dt: number) => {
    t += dt;
    for (const f of fish) {
      const target = steer(f.x, f.y, f.a, W, H, s * 3, 1.3);
      f.a += angDiff(target, f.a) * dt * 1.4 + Math.sin(t * 0.8 + f.ph) * dt * 0.5;
      const v = f.v * (1 + 0.25 * Math.sin(t * 1.3 + f.ph));
      f.x += Math.cos(f.a) * v * dt; f.y += Math.sin(f.a) * v * dt;
      f.trail.push({ x: f.x, y: f.y }, s * f.sc * 0.42 * N + 10);
      f.trail.sample(N, s * f.sc * 0.42, f.segs);
    }
    rippleCd -= dt;
    if (rippleCd <= 0) {
      const f = pick(fish);
      ripples.push(Math.random() < 0.6 ? { x: f.x, y: f.y, life: 0 } : { x: rnd(0, W), y: rnd(0, H), life: 0 });
      rippleCd = rnd(0.8, 1.8);
    }
    for (let i = ripples.length - 1; i >= 0; i--) { ripples[i].life += dt; if (ripples[i].life > 2.4) ripples.splice(i, 1); }
  };

  const draw = (ctx: Ctx) => {
    ctx.lineWidth = 1.4; ctx.strokeStyle = "#ffffff";
    for (const r of ripples) {
      const q = r.life / 2.4;
      ctx.globalAlpha = 0.28 * (1 - q);
      ctx.beginPath(); ctx.ellipse(r.x, r.y, s * 3.5 * q + 2, s * 2 * q + 1, 0, 0, TAU); ctx.stroke();
      if (q > 0.2) { ctx.beginPath(); ctx.ellipse(r.x, r.y, s * 2.4 * (q - 0.2) + 2, s * 1.4 * (q - 0.2) + 1, 0, 0, TAU); ctx.stroke(); }
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
      // shadow on the "pond floor"
      bodyPath(sz * 0.35, sz * 0.6); ctx.globalAlpha = 0.16; ctx.fillStyle = "#000000"; ctx.fill();

      // fins
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
        ctx.stroke(); ctx.globalAlpha = 0.6;
      }

      // body + patches
      ctx.globalAlpha = 0.92; bodyPath(0, 0); ctx.fillStyle = f.pat.base; ctx.fill();
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

  return { resize(w, h) { W = w; H = h; size(); }, update, draw };
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

export const butterflyScene: SceneFactory = (W0, H0, small) => {
  let W = W0, H = H0;
  let t = 0;
  const trail: Spark[] = [];
  const flies = Array.from({ length: small ? 6 : 11 }, (_, k) => ({
    x: W / 2 + rnd(-20, 20), y: H * 0.42 + rnd(-20, 20), a: (k / (small ? 6 : 11)) * TAU + rnd(-0.3, 0.3),
    v: rnd(320, 460), cruise: rnd(55, 95), flap: rnd(0, 6), fs: rnd(13, 18), sz: rnd(18, 28) * (small ? 0.9 : 1), w: WINGS[k % WINGS.length], ph: rnd(0, 6), dot: 0,
  }));

  const update = (dt: number) => {
    t += dt;
    stepSparks(trail, dt, 1, 6);
    for (const b of flies) {
      b.v += (b.cruise - b.v) * Math.min(1, dt * 1.6);
      const target = steer(b.x, b.y, b.a, W, H, 40, 0.6);
      b.a += angDiff(target, b.a) * dt * 1.2 + Math.sin(t * 1.7 + b.ph) * dt * 1.6;
      const bob = Math.sin(t * 6 + b.ph) * 18;
      b.x += Math.cos(b.a) * b.v * dt; b.y += (Math.sin(b.a) * b.v + bob) * dt;
      b.flap += dt * b.fs;
      b.dot -= dt;
      if (b.dot <= 0) { b.dot = small ? 0.14 : 0.08; trail.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0, max: 0.9, s: b.sz * 0.25, c: b.w.trail }); }
    }
  };

  const draw = (ctx: Ctx) => {
    ctx.globalCompositeOperation = "lighter"; drawSparks(ctx, trail, 0.7); ctx.globalCompositeOperation = "source-over";
    for (const b of flies) {
      const sp = wingSprite(b.w), open = 0.18 + 0.82 * Math.abs(Math.sin(b.flap));
      ctx.save();
      ctx.translate(b.x, b.y); ctx.rotate(b.a + Math.PI / 2);
      ctx.globalAlpha = 0.95;
      for (const m of [1, -1]) {
        ctx.save(); ctx.scale(m * open, 1);
        ctx.drawImage(sp, 0, -b.sz, b.sz, b.sz * 2);
        ctx.restore();
      }
      ctx.fillStyle = "#14100c"; ctx.beginPath(); ctx.ellipse(0, 0, b.sz * 0.08, b.sz * 0.55, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#14100c"; ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(0, -b.sz * 0.5); ctx.quadraticCurveTo(-b.sz * 0.15, -b.sz * 0.85, -b.sz * 0.3, -b.sz * 0.95);
      ctx.moveTo(0, -b.sz * 0.5); ctx.quadraticCurveTo(b.sz * 0.15, -b.sz * 0.85, b.sz * 0.3, -b.sz * 0.95); ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };

  return { resize(w, h) { W = w; H = h; }, update, draw };
};

/* ---------- aurora ---------- */

export const auroraScene: SceneFactory = (W0, H0, small) => {
  let W = W0, H = H0, t = 0, fade = 0;
  const RIBBONS = [
    { c: "#4fffa8", k: 0 }, { c: "#39d0ff", k: 1 }, { c: "#b14fff", k: 2 },
  ];
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
  const seed = () => { stars = Array.from({ length: small ? 30 : 70 }, () => ({ x: rnd(0, W), y: rnd(0, H * 0.6), r: rnd(0.5, 1.6), ph: rnd(0, 6) })); };
  seed();
  return {
    resize(w, h) { W = w; H = h; seed(); },
    update(dt) { t += dt; fade = Math.min(1, fade + dt * 0.6); },
    draw(ctx) {
      ctx.fillStyle = "#ffffff";
      for (const s of stars) { ctx.globalAlpha = fade * (0.35 + 0.45 * Math.sin(t * 2 + s.ph)); ctx.fillRect(s.x, s.y, s.r, s.r); }
      ctx.globalCompositeOperation = "lighter";
      const step = small ? 10 : 9;
      for (const r of RIBBONS) {
        const sp = column(r.c);
        for (let x = -step; x < W + step; x += step) {
          const base = H * (0.16 + r.k * 0.07) + Math.sin(x * 0.0035 + t * 0.32 + r.k * 1.7) * H * 0.07 + Math.sin(x * 0.011 - t * 0.55 + r.k) * H * 0.022;
          const hgt = H * (0.2 + 0.1 * Math.sin(x * 0.006 + t * 0.4 + r.k * 2));
          const a = 0.3 * (0.55 + 0.45 * Math.sin(x * 0.018 + t * 1.4 + r.k * 3)) * fade;
          ctx.globalAlpha = a;
          ctx.drawImage(sp, 1, 0, 2, 128, x, base - hgt, step, hgt);
        }
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    },
  };
};

/* ---------- jellyfish ---------- */

export const jellyScene: SceneFactory = (W0, H0, small) => {
  let W = W0, H = H0, t = 0;
  const COLORS = ["#5ff3ff", "#ff6bf0", "#a98bff", "#7dffcf"];
  const make = (initial: boolean) => {
    const s = rnd(20, 40) * (small ? 0.8 : 1);
    return { x: rnd(0.05, 0.95) * W, y: initial ? rnd(0.3, 1.1) * H : H + s * 4, s, p: rnd(0, 6), c: pick(COLORS), drift: rnd(0, 6), sp: rnd(0.9, 1.4) };
  };
  const jellies = Array.from({ length: small ? 4 : 7 }, () => make(true));
  return {
    resize(w, h) { W = w; H = h; },
    update(dt) {
      t += dt;
      jellies.forEach((j, i) => {
        j.p += dt * 1.5 * j.sp;
        const c = Math.pow(Math.max(0, Math.sin(j.p)), 2);
        j.y -= (8 + 55 * c) * dt * (j.s / 25);
        j.x += Math.sin(t * 0.4 + j.drift) * 8 * dt;
        if (j.y < -j.s * 5) jellies[i] = make(false);
      });
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
          for (let q = 1; q <= 10; q++) {
            const yy = y + q * j.s * (0.3 - 0.08 * c), xx = x + ox * (1 - q * 0.03) + Math.sin(t * 2.2 - q * 0.6 + k) * j.s * 0.14 * (q / 10);
            ctx.lineTo(xx, yy);
          }
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
