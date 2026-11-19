import { isPublicIPv4, sampQuery } from "./game-lookup";

/**
 * A SA:MP / open.mp server's logo, found automatically (the classic SA:MP protocol has no icon, unlike Minecraft):
 *  1. the logo an open.mp server publishes in its "o" query reply (config.json → "logo"), else
 *  2. the icon of the website the server advertises in its "weburl" rule.
 * The image is downloaded here and stored as a small PNG, so profile visitors never load anything from the
 * server owner's hosts.
 */

/** open.mp "o" reply: u32-prefixed strings — discord link, light banner, dark banner, logo. */
function parseOpenMpExtras(msg: Buffer): { discord: string; bannerLight: string; bannerDark: string; logo: string } {
  let o = 11;
  const str = () => {
    if (o + 4 > msg.length) return "";
    const len = msg.readUInt32LE(o);
    o += 4;
    if (len > 1024 || o + len > msg.length) {
      o = msg.length;
      return "";
    }
    const v = msg.toString("utf8", o, o + len).trim();
    o += len;
    return v;
  };
  return { discord: str(), bannerLight: str(), bannerDark: str(), logo: str() };
}

/** "r" reply: u16 count, then u8-prefixed key/value pairs. */
function parseSampRules(msg: Buffer): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    let o = 11;
    const n = msg.readUInt16LE(o);
    o += 2;
    for (let i = 0; i < n && o < msg.length; i++) {
      const kl = msg[o++];
      const k = msg.toString("latin1", o, o + kl);
      o += kl;
      const vl = msg[o++];
      const v = msg.toString("latin1", o, o + vl);
      o += vl;
      out[k] = v;
    }
  } catch {}
  return out;
}

/**
 * GET a public http(s) URL with SSRF guards: public IPv4 only (checked again on every redirect), standard web
 * ports, a size cap and a shared deadline. Returns the body, or null.
 */
async function safeFetch(url: string, maxBytes: number, deadline: number): Promise<{ body: Buffer; url: string } | null> {
  const { lookup } = await import("node:dns/promises");
  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    let u: URL;
    try {
      u = new URL(current);
    } catch {
      return null;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.port && !["80", "443", "8080", "8443"].includes(u.port)) return null;
    try {
      if (!isPublicIPv4((await lookup(u.hostname, { family: 4 })).address)) return null;
    } catch {
      return null;
    }
    const left = deadline - Date.now();
    if (left <= 0) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), left);
    try {
      const res = await fetch(u, { redirect: "manual", signal: ctrl.signal, headers: { "User-Agent": "infected.wtf-preview/1.0", Accept: "*/*" } });
      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        current = new URL(location, u).toString();
        continue;
      }
      if (!res.ok || !res.body) return null;
      if (Number(res.headers.get("content-length") || 0) > maxBytes) return null;
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
        size += chunk.length;
        if (size > maxBytes) return null;
        chunks.push(Buffer.from(chunk));
      }
      return { body: Buffer.concat(chunks), url: u.toString() };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

/** Any image (PNG/JPG/WebP/GIF/SVG, or the PNG frames inside an .ico) → 128px PNG data URI. */
async function toLogoDataUri(buf: Buffer): Promise<string | null> {
  const sharp = (await import("sharp")).default;
  let input = buf;
  // .ico: take the largest embedded PNG (BMP-only icons are skipped).
  if (buf.length > 6 && buf.readUInt16LE(0) === 0 && buf.readUInt16LE(2) === 1) {
    let best: Buffer | null = null;
    const count = buf.readUInt16LE(4);
    for (let i = 0; i < count; i++) {
      const e = 6 + i * 16;
      if (e + 16 > buf.length) break;
      const size = buf.readUInt32LE(e + 8);
      const off = buf.readUInt32LE(e + 12);
      const part = buf.subarray(off, off + size);
      if (part.length > 8 && part.readUInt32BE(0) === 0x89504e47 && (!best || part.length > best.length)) best = part;
    }
    if (!best) return null;
    input = best;
  }
  try {
    const meta = await sharp(input, { failOn: "none" }).metadata();
    if (!meta.width || !meta.height || meta.width < 16 || meta.height < 16) return null;
    const png = await sharp(input, { failOn: "none", animated: false })
      .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    // Reject blank renders (e.g. an emoji favicon with no emoji font here, or a fully transparent image).
    const { channels } = await sharp(png).ensureAlpha().stats();
    const alpha = channels[channels.length - 1];
    const flat = channels.slice(0, -1).every((c) => c.max - c.min < 8);
    if (alpha.max < 16 || flat) return null;
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Icon links a page advertises, best first (apple-touch-icon is usually the crispest square logo), then /favicon.ico. */
function siteIconCandidates(html: string, base: string): string[] {
  const found: { href: string; score: number }[] = [];
  // Match whole quoted attributes so an inline data: SVG icon (which contains "<" and ">") stays in one piece.
  for (const tag of html.slice(0, 200_000).match(/<link\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi) || []) {
    const rel = (/rel\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1] || "").toLowerCase();
    const href = /href\s*=\s*"([^"]+)"/i.exec(tag)?.[1] ?? /href\s*=\s*'([^']+)'/i.exec(tag)?.[1];
    if (!href || !rel.includes("icon")) continue;
    const size = Number(/sizes\s*=\s*["'](\d+)x\d+/i.exec(tag)?.[1] || 0);
    try {
      found.push({ href: new URL(href, base).toString(), score: (rel.includes("apple-touch-icon") ? 1000 : 0) + size });
    } catch {}
  }
  found.sort((a, b) => b.score - a.score);
  const list = found.map((f) => f.href);
  try {
    list.push(new URL("/favicon.ico", base).toString());
  } catch {}
  return [...new Set(list)].slice(0, 5);
}

/** The server's logo as a PNG data URI, or null if neither source gives an image within ~6 seconds. */
export async function resolveSampLogo(ip: string, port: number): Promise<string | null> {
  if (!isPublicIPv4(ip)) return null;
  const deadline = Date.now() + 6000;
  const tryImage = async (url: string) => {
    // Inline icons (data:image/...) are decoded here — nothing to download.
    const inline = /^data:image\/[a-z0-9.+-]+(;base64)?,(.*)$/is.exec(url);
    if (inline) {
      const body = inline[1] ? Buffer.from(inline[2], "base64") : Buffer.from(decodeURIComponent(inline[2]), "utf8");
      return body.length <= 512 * 1024 ? toLogoDataUri(body) : null;
    }
    const r = await safeFetch(url, 3 * 1024 * 1024, deadline);
    return r ? toLogoDataUri(r.body) : null;
  };

  const extras = await sampQuery(ip, port, "o", 1500);
  const logoUrl = extras ? parseOpenMpExtras(extras).logo : "";
  if (logoUrl) {
    const logo = await tryImage(logoUrl);
    if (logo) return logo;
  }

  const rulesMsg = await sampQuery(ip, port, "r", 1500);
  let web = rulesMsg ? parseSampRules(rulesMsg).weburl || "" : "";
  // The stock weburl points at SA:MP / open.mp themselves, not at the server's own site.
  if (!web || /(^|\.)(sa-mp\.(com|mp)|open\.mp)$/i.test(web.replace(/^https?:\/\//i, "").split("/")[0])) return null;
  if (!/^https?:\/\//i.test(web)) web = `https://${web}`;
  const page = await safeFetch(web, 1024 * 1024, deadline);
  if (!page) return null;
  for (const candidate of siteIconCandidates(page.body.toString("utf8"), page.url)) {
    if (Date.now() > deadline) break;
    const logo = await tryImage(candidate);
    if (logo) return logo;
  }
  return null;
}

/** Refresh the stored logo at most once a day. */
export const SAMP_LOGO_TTL_MS = 24 * 60 * 60 * 1000;
