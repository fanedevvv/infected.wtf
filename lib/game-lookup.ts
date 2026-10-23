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
