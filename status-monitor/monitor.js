#!/usr/bin/env node
// status.infected.wtf — checks every service once a minute, keeps a per-day uptime history and writes a static
// status page that nginx serves directly, so the page stays reachable even when the main Next app is down.
// Runs under pm2 as `infected-status` (see ecosystem.config.cjs). No npm dependencies.

const fs = require("fs");
const path = require("path");
const net = require("net");
const http = require("http");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = process.env.STATUS_OUT_DIR || "/var/www/status.infected.wtf";
const STATE_FILE = process.env.STATUS_STATE_FILE || path.join(__dirname, "state", "history.json");
const INTERVAL_MS = 60_000;
const TIMEOUT_MS = 10_000;
const HISTORY_DAYS = 90;
const SHOW_DAYS = 30;
const SITE = "https://infected.wtf";
const PROBE_FILE = path.join(ROOT, "public", "uploads", "i", "status-probe.png");
// 1×1 transparent PNG used to prove the image host's file serving works end to end.
const PROBE_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

function readEnv() {
  try {
    return Object.fromEntries(
      fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")
        .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2].replace(/^"(.*)"$/, "$1")]),
    );
  } catch {
    return {};
  }
}

const env = readEnv();
const db = (() => {
  try {
    const u = new URL(env.DATABASE_URL);
    return { host: u.hostname, port: Number(u.port) || 3306 };
  } catch {
    return { host: "127.0.0.1", port: 3306 };
  }
})();

/* ───────────── checks ───────────── */

function httpCheck(url, accept = (status) => status >= 200 && status < 400, { method = "GET", bodyTest } = {}) {
  return () => new Promise((resolve) => {
    const lib = url.startsWith("https:") ? https : http;
    const req = lib.request(url, { method, timeout: TIMEOUT_MS, headers: { "User-Agent": "infected-status/1.0", "Cache-Control": "no-cache" } }, (res) => {
      let body = "";
      res.on("data", (c) => { if (body.length < 20000) body += c; });
      res.on("end", () => {
        if (!accept(res.statusCode)) return resolve({ ok: false, detail: `HTTP ${res.statusCode}` });
        if (bodyTest && !bodyTest(body)) return resolve({ ok: false, detail: "unexpected response" });
        resolve({ ok: true });
      });
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (e) => resolve({ ok: false, detail: e.message }));
    req.end();
  });
}

function tcpCheck(host, port, expectBanner) {
  return () => new Promise((resolve) => {
    const sock = net.connect({ host, port });
    const done = (r) => { sock.destroy(); resolve(r); };
    sock.setTimeout(TIMEOUT_MS, () => done({ ok: false, detail: "timeout" }));
    sock.on("error", (e) => done({ ok: false, detail: e.message }));
    sock.on("connect", () => { if (!expectBanner) done({ ok: true }); });
    sock.on("data", (d) => { if (expectBanner) done(expectBanner.test(d.toString()) ? { ok: true } : { ok: false, detail: "bad banner" }); });
  });
}

const GROUPS = [
  {
    name: "Website",
    services: [{ id: "website", name: "infected.wtf", check: httpCheck(`${SITE}/`) }],
  },
  {
    name: "Services",
    services: [
      { id: "biolinks", name: "Biolinks", check: httpCheck(`${SITE}/${env.STATUS_PROBE_PROFILE || "fane"}`) },
      { id: "imagehost", name: "Image host", check: httpCheck(`${SITE}/uploads/i/status-probe.png`) },
      { id: "api", name: "API", check: httpCheck(`${SITE}/api/marketplace`, (s) => s === 200, { bodyTest: (b) => b.includes('"themes"') }) },
      { id: "database", name: "Database", check: tcpCheck(db.host, db.port) },
      // The bot's internal API answers 401 without a key — any HTTP answer means it's alive.
      { id: "discord", name: "Discord bot", check: httpCheck("http://127.0.0.1:4001/", (s) => s > 0) },
      { id: "email", name: "Email delivery", check: tcpCheck("127.0.0.1", 25, /^220/) },
    ],
  },
];
const ALL = GROUPS.flatMap((g) => g.services);

/* ───────────── state ───────────── */

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { days: {}, current: {} };
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  const tmp = `${STATE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state));
  fs.renameSync(tmp, STATE_FILE);
}

const dayKey = (d) => d.toISOString().slice(0, 10);

function record(state, id, ok, now) {
  const key = dayKey(now);
  state.days[key] ??= {};
  const cell = (state.days[key][id] ??= { up: 0, total: 0 });
  cell.total += 1;
  if (ok) cell.up += 1;
}

function prune(state, now) {
  const cutoff = dayKey(new Date(now.getTime() - HISTORY_DAYS * 86400000));
  for (const k of Object.keys(state.days)) if (k < cutoff) delete state.days[k];
}

/* ───────────── page ───────────── */

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function uptime(state, id, days) {
  let up = 0, total = 0;
  for (const d of days) {
    const c = state.days[d]?.[id];
    if (c) { up += c.up; total += c.total; }
  }
  return total ? (up / total) * 100 : null;
}

function fmtPct(p) {
  if (p === null) return "No data";
  return `${p >= 99.995 ? "100" : p.toFixed(2)}% uptime`;
}

function barClass(p) {
  if (p === null) return "none";
  if (p >= 99.5) return "up";
  if (p >= 95) return "partial";
  return "down";
}

function render(state, now) {
  const days = Array.from({ length: SHOW_DAYS }, (_, i) => dayKey(new Date(now.getTime() - (SHOW_DAYS - 1 - i) * 86400000)));
  const downCount = ALL.filter((s) => state.current[s.id] && !state.current[s.id].ok).length;
  const allUp = downCount === 0;
  const headline = allUp ? "All services are online" : downCount === ALL.length ? "All services are down" : "Some services are having issues";

  const pill = (ok) => ok
    ? `<span class="pill ok"><i class="dot ok">${checkSvg}</i>Operational</span>`
    : `<span class="pill bad"><i class="dot bad">${crossSvg}</i>Down</span>`;

  const groupsHtml = GROUPS.map((g) => {
    const groupOk = g.services.every((s) => state.current[s.id]?.ok !== false);
    const rows = g.services.map((s) => {
      const cur = state.current[s.id];
      const ok = cur?.ok !== false;
      const pct = uptime(state, s.id, days);
      const bars = days.map((d) => {
        const c = state.days[d]?.[s.id];
        const p = c ? (c.up / c.total) * 100 : null;
        const label = `${new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })} · ${p === null ? "No data" : `${p >= 99.995 ? "100" : p.toFixed(2)}% uptime`}`;
        return `<span class="bar ${barClass(p)}" title="${esc(label)}" aria-label="${esc(label)}"></span>`;
      }).join("");
      return `
        <div class="svc">
          <div class="svc-head">
            <span class="svc-name"><i class="dot ${ok ? "ok" : "bad"}">${ok ? checkSvg : crossSvg}</i>${esc(s.name)}</span>
            <span class="svc-pct ${ok ? "ok" : "bad"}">${ok ? esc(fmtPct(pct)) : "Down"}</span>
          </div>
          <div class="bars" role="img" aria-label="${esc(s.name)} uptime over the last ${SHOW_DAYS} days">${bars}</div>
          <div class="bars-legend"><span>${SHOW_DAYS} days ago</span><span>Today</span></div>
        </div>`;
    }).join("");
    return `
      <details class="group" open>
        <summary><span class="group-name">${esc(g.name)}</span>${pill(groupOk)}<svg class="chev" viewBox="0 0 24 24" width="18" height="18"><polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor" stroke-width="2"/></svg></summary>
        <div class="group-body">${rows}</div>
      </details>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>INFECTED.WTF Status</title>
<meta name="description" content="${esc(headline)} — live status of infected.wtf services.">
<meta property="og:title" content="INFECTED.WTF Status">
<meta property="og:description" content="${esc(headline)}">
<meta name="theme-color" content="${allUp ? "#10b981" : "#ef4444"}">
<link rel="icon" href="/logo.png">
<style>
:root{--bg:#0f121a;--card:#161a24;--line:rgba(255,255,255,.07);--ink:#f3f4f6;--ink2:rgba(243,244,246,.6);--ok:#10b981;--warn:#f59e0b;--bad:#ef4444;--none:#2a2f3c}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit}
header{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--line)}
header .brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:800}
header .brand img{width:28px;height:28px}
header .brand span{font-size:15px}
.touch{padding:9px 16px;border-radius:12px;border:1px solid var(--line);background:#1b202b;color:var(--ink);text-decoration:none;font-weight:600;font-size:14px}
.touch:hover{background:#222836}
main{max-width:760px;margin:0 auto;padding:56px 18px 64px}
.hero{text-align:center;margin-bottom:40px}
.hero .big{width:62px;height:62px;border-radius:50%;margin:0 auto 18px;display:flex;align-items:center;justify-content:center;background:var(--ok);box-shadow:0 0 0 10px color-mix(in srgb,var(--ok) 18%,transparent)}
.hero .big.bad{background:var(--bad);box-shadow:0 0 0 10px color-mix(in srgb,var(--bad) 18%,transparent)}
.hero .big svg{width:30px;height:30px;color:#08130e}
.hero h1{font-size:clamp(30px,6vw,44px);line-height:1.1;margin:0 0 12px;letter-spacing:-.02em}
.hero p{margin:0;color:var(--ink2);font-size:15px}
.card{background:var(--card);border:1px solid var(--line);border-radius:20px;overflow:hidden}
.group+.group{border-top:1px solid var(--line)}
summary{list-style:none;display:flex;align-items:center;gap:12px;padding:20px 24px;cursor:pointer;user-select:none}
summary::-webkit-details-marker{display:none}
.group-name{font-weight:600;font-size:16px;margin-right:auto}
.chev{color:var(--ink2);transition:transform .2s}
details[open] .chev{transform:rotate(180deg)}
.pill{display:inline-flex;align-items:center;gap:8px;padding:6px 12px 6px 7px;border-radius:999px;background:#232836;font-size:14px;font-weight:500}
.dot{width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.dot svg{width:12px;height:12px;color:#0b1410}
.dot.ok{background:var(--ok)}.dot.bad{background:var(--bad)}.dot.bad svg{color:#1a0b0b}
.group-body{padding:4px 24px 22px}
.svc{padding:14px 0}
.svc+.svc{border-top:1px solid var(--line)}
.svc-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
.svc-name{display:flex;align-items:center;gap:10px;font-weight:600;font-size:16px}
.svc-pct{font-size:14px;font-weight:600;white-space:nowrap}
.svc-pct.ok{color:var(--ok)}.svc-pct.bad{color:var(--bad)}
.bars{display:flex;gap:2px;height:36px}
.bar{flex:1;border-radius:4px;background:var(--none);min-width:3px;transition:filter .15s}
.bar:hover{filter:brightness(1.25)}
.bar.up{background:var(--ok)}.bar.partial{background:var(--warn)}.bar.down{background:var(--bad)}
.bars-legend{display:flex;justify-content:space-between;color:var(--ink2);font-size:13px;margin-top:8px}
.foot{margin-top:28px;text-align:center;color:var(--ink2);font-size:13px}
.foot .legend{display:inline-flex;gap:14px;flex-wrap:wrap;justify-content:center;margin-bottom:10px}
.foot .legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
@media (max-width:520px){summary{padding:18px 16px}.group-body{padding:4px 16px 18px}.bars{height:30px;gap:1px}.bar{border-radius:3px}}
</style>
</head>
<body>
<header>
  <a class="brand" href="${SITE}"><img src="/logo.png" alt=""><span>INFECTED.WTF</span></a>
  <a class="touch" href="${SITE}/support">Get in touch</a>
</header>
<main>
  <section class="hero">
    <div class="big ${allUp ? "" : "bad"}">${allUp ? checkSvg : crossSvg}</div>
    <h1>${esc(headline)}</h1>
    <p>Last updated on <time datetime="${now.toISOString()}" id="updated">${esc(now.toUTCString())}</time></p>
  </section>
  <section class="card">${groupsHtml}</section>
  <div class="foot">
    <div class="legend"><span><i style="background:var(--ok)"></i>Operational</span><span><i style="background:var(--warn)"></i>Partial outage</span><span><i style="background:var(--bad)"></i>Major outage</span><span><i style="background:var(--none)"></i>No data</span></div>
    <div>Checked every minute · <a href="${SITE}">infected.wtf</a></div>
  </div>
</main>
<script>
(function(){
  var t=document.getElementById("updated"),d=new Date(t.getAttribute("datetime"));
  var date=d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  var time=d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZoneName:"short"}).replace(" AM","am").replace(" PM","pm");
  t.textContent=date+" at "+time;
  setTimeout(function(){location.reload()},60000);
})();
</script>
</body>
</html>`;
}

const checkSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
const crossSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

function writePage(html) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmp = path.join(OUT_DIR, ".index.html.tmp");
  fs.writeFileSync(tmp, html);
  fs.renameSync(tmp, path.join(OUT_DIR, "index.html"));
}

function ensureAssets() {
  try {
    fs.mkdirSync(path.dirname(PROBE_FILE), { recursive: true });
    if (!fs.existsSync(PROBE_FILE)) fs.writeFileSync(PROBE_FILE, PROBE_PNG);
  } catch (e) {
    console.error("[status] could not write probe image:", e.message);
  }
  try {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.copyFileSync(path.join(ROOT, "public", "assets", "img", "logo-icon.png"), path.join(OUT_DIR, "logo.png"));
  } catch (e) {
    console.error("[status] could not copy logo:", e.message);
  }
}

async function tick() {
  const now = new Date();
  const state = loadState();
  const results = await Promise.all(ALL.map(async (s) => [s, await s.check().catch((e) => ({ ok: false, detail: e.message }))]));
  for (const [s, r] of results) {
    const prev = state.current[s.id];
    if (prev && prev.ok !== r.ok) console.log(`[status] ${s.name}: ${r.ok ? "back up" : `DOWN (${r.detail})`}`);
    state.current[s.id] = { ok: r.ok, detail: r.detail || null, since: prev && prev.ok === r.ok ? prev.since : now.toISOString() };
    record(state, s.id, r.ok, now);
  }
  prune(state, now);
  saveState(state);
  writePage(render(state, now));
}

ensureAssets();
const loop = () => tick().catch((e) => console.error("[status] tick failed:", e)).finally(() => setTimeout(loop, INTERVAL_MS));
loop();
