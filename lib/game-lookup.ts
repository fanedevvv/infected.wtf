async function fetchJson(url: string, init?: RequestInit, timeoutMs = 6000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function lookupRoblox(username: string) {
  const resolveData = (await fetchJson("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
  })) as { data?: { id: number; name: string; displayName: string }[] } | null;
  const match = resolveData?.data?.[0];
  if (!match) return null;

  const thumbData = (await fetchJson(
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${match.id}&size=150x150&format=Png&isCircular=false`
  )) as { data?: { imageUrl: string }[] } | null;
  const avatarUrl = thumbData?.data?.[0]?.imageUrl || "";

  return { userId: match.id, username: match.name, displayName: match.displayName, avatarUrl };
}

export async function lookupMinecraft(username: string) {
  const data = (await fetchJson(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`)) as
    | { id: string; name: string }
    | null;
  if (!data?.id) return null;
  return { uuid: data.id, username: data.name, avatarUrl: `https://crafatar.com/avatars/${data.id}?size=100&overlay` };
}

export async function lookupGithub(username: string) {
  const data = (await fetchJson(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: { "User-Agent": "infected.wtf", Accept: "application/vnd.github+json" },
  })) as { login?: string; name?: string; avatar_url?: string; html_url?: string; public_repos?: number; followers?: number } | null;
  if (!data?.login) return null;
  return {
    username: data.login,
    name: data.name || data.login,
    avatarUrl: data.avatar_url || "",
    profileUrl: data.html_url || `https://github.com/${data.login}`,
    publicRepos: data.public_repos ?? 0,
    followers: data.followers ?? 0,
  };
}

export async function lookupPinterest(url: string) {
  const data = (await fetchJson(`https://www.pinterest.com/oembed.json?url=${encodeURIComponent(url)}`)) as
    | { title?: string; author_name?: string; author_url?: string; thumbnail_url?: string }
    | null;
  if (!data?.title) return null;
  return {
    title: data.title,
    authorName: data.author_name || "",
    profileUrl: data.author_url || url,
    thumbnailUrl: data.thumbnail_url || "",
    url,
  };
}

export async function lookupYoutube(url: string) {
  if (!/^https:\/\/(www\.)?youtube\.com\/(@|channel\/|c\/|user\/)/i.test(url)) return null;
  let html: string | null = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: controller.signal, cache: "no-store" });
    clearTimeout(timer);
    if (res.ok) html = await res.text();
  } catch {
    html = null;
  }
  if (!html) return null;

  const title = html.match(/<meta property="og:title" content="([^"]*)"/)?.[1];
  const image = html.match(/<meta property="og:image" content="([^"]*)"/)?.[1];
  const canonicalUrl = html.match(/<meta property="og:url" content="([^"]*)"/)?.[1];
  if (!title) return null;

  return {
    name: title.replace(/&amp;/g, "&"),
    avatarUrl: image || "",
    channelUrl: canonicalUrl || url,
  };
}

export async function lookupMcServer(host: string) {
  const cleanHost = host.trim().replace(/^https?:\/\//, "").split("/")[0];
  if (!cleanHost || !/^[a-zA-Z0-9.\-:]+$/.test(cleanHost)) return null;
  const data = (await fetchJson(`https://api.mcsrvstat.us/3/${encodeURIComponent(cleanHost)}`)) as
    | { online: boolean; players?: { online: number; max: number }; motd?: { clean: string[] }; icon?: string }
    | null;
  if (!data) return null;
  return {
    host: cleanHost,
    online: !!data.online,
    playersOnline: data.players?.online ?? 0,
    playersMax: data.players?.max ?? 0,
    motd: data.motd?.clean?.[0] || "",
    icon: data.icon || "",
  };
}

/* ── SA:MP / open.mp server status (UDP query protocol, opcode "i") ───────────────────────────────── */

export type SampServerInfo = {
  host: string; // what the user entered, normalised to host:port
  ip: string;
  port: number;
  online: boolean;
  passworded: boolean;
  players: number;
  maxPlayers: number;
  hostname: string;
  gamemode: string;
  language: string;
  /** 128px PNG data URI: the open.mp logo, else the server website's icon (lib/samp-logo.ts). Refreshed daily. */
  logo?: string;
  logoCheckedAt?: number;
};

// Servers are queried straight from our box, so never let a user point it at our own network.
export function isPublicIPv4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = p;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  return true;
}

// Server names are usually Windows-1250/1252, newer open.mp servers send UTF-8.
function decodeSampString(buf: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf).trim();
  } catch {
    try { return new TextDecoder("windows-1250").decode(buf).trim(); } catch { return buf.toString("latin1").trim(); }
  }
}

function parseSampInfo(msg: Buffer): Omit<SampServerInfo, "host" | "ip" | "port" | "online"> | null {
  // 11-byte echo of our request header, then: u8 password, u16 players, u16 max, u32+str hostname, u32+str gamemode, u32+str language
  if (msg.length < 11 + 5 || msg.toString("latin1", 0, 4) !== "SAMP" || msg[10] !== 0x69) return null;
  let o = 11;
  const passworded = msg.readUInt8(o) === 1; o += 1;
  const players = msg.readUInt16LE(o); o += 2;
  const maxPlayers = msg.readUInt16LE(o); o += 2;
  const str = () => {
    if (o + 4 > msg.length) throw new Error("short");
    const len = msg.readUInt32LE(o); o += 4;
    if (len > 512 || o + len > msg.length) throw new Error("bad length");
    const s = decodeSampString(msg.subarray(o, o + len)); o += len;
    return s;
  };
  try {
    return { passworded, players, maxPlayers, hostname: str(), gamemode: str(), language: str() };
  } catch {
    return null;
  }
}

/**
 * Live status of a SA:MP / open.mp server. Accepts "host", "host:port" or "samp://host:port" (default port 7777).
 * Returns null when the address is invalid or private; a valid address that doesn't answer comes back offline
 * (like the Minecraft card), so a server that's down for a restart can still be added.
 */
export async function lookupSampServer(input: string, timeoutMs = 2500): Promise<SampServerInfo | null> {
  const raw = input.trim().replace(/^samp:\/\//i, "").replace(/^https?:\/\//i, "").split("/")[0];
  const m = /^([a-zA-Z0-9.-]{1,253})(?::(\d{1,5}))?$/.exec(raw);
  if (!m) return null;
  const hostName = m[1].toLowerCase();
  const port = m[2] ? Number(m[2]) : 7777;
  if (port < 1 || port > 65535) return null;

  const { lookup } = await import("node:dns/promises");
  let ip: string;
  try {
    ip = (await lookup(hostName, { family: 4 })).address;
  } catch {
    return null;
  }
  if (!isPublicIPv4(ip)) return null;

  const ask = () => sampQuery(ip, port, "i", timeoutMs / 2);

  // UDP can drop a packet — one retry inside the overall timeout.
  const msg = (await ask()) ?? (await ask());
  const info = msg ? parseSampInfo(msg) : null;
  const host = m[2] ? `${hostName}:${port}` : hostName;
  if (!info) return { host, ip, port, online: false, passworded: false, players: 0, maxPlayers: 0, hostname: "", gamemode: "", language: "" };
  return { host, ip, port, online: true, ...info };
}

/** One SA:MP query packet ("i" info, "r" rules, "o" open.mp extras) → the raw reply, or null on timeout. */
export async function sampQuery(ip: string, port: number, opcode: "i" | "r" | "o", timeoutMs: number): Promise<Buffer | null> {
  const req = Buffer.alloc(11);
  req.write("SAMP", 0, "latin1");
  ip.split(".").forEach((n, i) => req.writeUInt8(Number(n), 4 + i));
  req.writeUInt16LE(port, 8);
  req.write(opcode, 10, "latin1");
  const dgram = await import("node:dgram");
  return new Promise<Buffer | null>((resolve) => {
    const sock = dgram.createSocket("udp4");
    const done = (v: Buffer | null) => { clearTimeout(timer); try { sock.close(); } catch {} resolve(v); };
    const timer = setTimeout(() => done(null), timeoutMs);
    sock.on("error", () => done(null));
    sock.on("message", (msg, rinfo) => {
      if (rinfo.address === ip && rinfo.port === port && msg.length >= 11 && msg.toString("latin1", 10, 11) === opcode) done(msg);
    });
    sock.send(req, port, ip, (err) => { if (err) done(null); });
  });
}
