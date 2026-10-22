import { prisma } from "@/lib/prisma";

type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
};

type SpotifyImage = { url?: string };
type SpotifyArtist = { name?: string };
type SpotifyAlbum = { name?: string; images?: SpotifyImage[] };
type SpotifyTrack = {
  type?: "track" | "episode";
  name?: string;
  duration_ms?: number;
  artists?: SpotifyArtist[];
  album?: SpotifyAlbum;
  external_urls?: { spotify?: string };
  // Podcast episodes carry their own images and the show instead of album/artists.
  images?: SpotifyImage[];
  show?: { name?: string; publisher?: string; images?: SpotifyImage[] };
};

type SpotifyNowPlayingResponse = {
  is_playing?: boolean;
  progress_ms?: number;
  item?: SpotifyTrack | null;
};

type SpotifyRecentResponse = {
  items?: Array<{ track?: SpotifyTrack | null; played_at?: string }>;
};

export type SpotifyRecentTrack = {
  trackName: string;
  artists: string;
  albumImage: string;
  playedAt: string;
  trackUrl: string;
};

export type SpotifyTopTrack = {
  trackName: string;
  artists: string;
  albumImage: string;
  trackUrl: string;
};

export type SpotifyPublicData = {
  spotifyUserId: string;
  displayName: string;
  profileUrl: string;
  avatarUrl: string;
  nowPlaying: {
    isPlaying: boolean;
    trackName: string;
    artists: string;
    albumName: string;
    albumImage: string;
    trackUrl: string;
    progressMs: number;
    durationMs: number;
    /** When progressMs was read (ms epoch), so viewers can extrapolate the bar accurately. */
    syncedAt?: number;
  } | null;
  recentTracks: SpotifyRecentTrack[];
  topTracks: SpotifyTopTrack[];
  lastSyncAt: string;
};

type SpotifyStoredData = SpotifyPublicData & {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

function spotifyBasicAuthHeader() {
  const clientId = process.env.SPOTIFY_CLIENT_ID || "";
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "";
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return `Basic ${auth}`;
}

function getSpotifyRedirectUri() {
  const siteUrl = (process.env.SITE_URL || "https://infected.wtf").replace(/\/$/, "");
  return `${siteUrl}/api/integrations/spotify/callback`;
}

async function spotifyTokenRequest(params: URLSearchParams): Promise<SpotifyTokenResponse> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: spotifyBasicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const json = (await res.json().catch(() => ({}))) as SpotifyTokenResponse & { error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || "Spotify token exchange failed.");
  }
  return json;
}

export async function exchangeSpotifyCode(code: string) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getSpotifyRedirectUri(),
  });
  return spotifyTokenRequest(params);
}

export async function refreshSpotifyToken(refreshToken: string) {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  return spotifyTokenRequest(params);
}

async function fetchSpotifyProfile(accessToken: string) {
  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "BioLink/1.0",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Unable to fetch Spotify profile.");
  const json = (await res.json()) as {
    id?: string;
    display_name?: string;
    external_urls?: { spotify?: string };
    images?: SpotifyImage[];
  };
  return {
    spotifyUserId: String(json.id || ""),
    displayName: String(json.display_name || "Spotify"),
    profileUrl: String(json.external_urls?.spotify || ""),
    avatarUrl: String(json.images?.[0]?.url || ""),
  };
}

async function fetchNowPlaying(accessToken: string): Promise<SpotifyPublicData["nowPlaying"]> {
  // Without additional_types, podcasts come back with item=null and look like "nothing playing".
  const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "BioLink/1.0",
    },
    cache: "no-store",
  });

  if (res.status === 204) return null;
  if (!res.ok) throw new Error("Unable to fetch now playing.");

  const data = (await res.json()) as SpotifyNowPlayingResponse;
  const item = data.item;
  if (!item?.name) return null;
  const episode = item.type === "episode";

  return {
    isPlaying: Boolean(data.is_playing),
    trackName: String(item.name || ""),
    artists: episode ? String(item.show?.publisher || item.show?.name || "") : (item.artists || []).map((a) => a.name).filter(Boolean).join(", "),
    albumName: String((episode ? item.show?.name : item.album?.name) || ""),
    albumImage: String((episode ? item.images?.[0]?.url || item.show?.images?.[0]?.url : item.album?.images?.[0]?.url) || ""),
    trackUrl: String(item.external_urls?.spotify || ""),
    progressMs: Number(data.progress_ms || 0),
    durationMs: Number(item.duration_ms || 0),
    syncedAt: Date.now(),
  };
}

async function fetchRecentTracks(accessToken: string): Promise<SpotifyRecentTrack[]> {
  const res = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=5", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "BioLink/1.0",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Unable to fetch recent tracks.");
  const data = (await res.json()) as SpotifyRecentResponse;

  return (data.items || [])
    .map((item) => {
      const track = item.track;
      if (!track?.name) return null;
      return {
        trackName: String(track.name || ""),
        artists: (track.artists || []).map((a) => a.name).filter(Boolean).join(", "),
        albumImage: String(track.album?.images?.[0]?.url || ""),
        playedAt: String(item.played_at || ""),
        trackUrl: String(track.external_urls?.spotify || ""),
      };
    })
    .filter((item): item is SpotifyRecentTrack => Boolean(item));
}

async function fetchTopTracks(accessToken: string): Promise<SpotifyTopTrack[]> {
  const res = await fetch("https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=5", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "BioLink/1.0",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Unable to fetch top tracks.");
  const data = (await res.json()) as { items?: SpotifyTrack[] };

  return (data.items || [])
    .map((track) => {
      if (!track?.name) return null;
      return {
        trackName: String(track.name || ""),
        artists: (track.artists || []).map((a) => a.name).filter(Boolean).join(", "),
        albumImage: String(track.album?.images?.[0]?.url || ""),
        trackUrl: String(track.external_urls?.spotify || ""),
      };
    })
    .filter((item): item is SpotifyTopTrack => Boolean(item));
}

async function fetchSpotifySnapshot(accessToken: string) {
  const [profile, nowPlaying, recentTracks, topTracks] = await Promise.all([
    fetchSpotifyProfile(accessToken),
    fetchNowPlaying(accessToken).catch(() => null),
    fetchRecentTracks(accessToken).catch(() => []),
    fetchTopTracks(accessToken).catch(() => []),
  ]);

  return {
    ...profile,
    nowPlaying,
    recentTracks,
    topTracks,
    lastSyncAt: new Date().toISOString(),
  };
}

function parseStoredData(raw: unknown): Partial<SpotifyStoredData> {
  if (!raw) return {};
  if (typeof raw === "object") return raw as Partial<SpotifyStoredData>;
  if (typeof raw !== "string") return {};
  try {
    const parsed = JSON.parse(raw) as Partial<SpotifyStoredData>;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export function toSpotifyPublicData(data: Partial<SpotifyStoredData>): SpotifyPublicData | null {
  if (!data.spotifyUserId) return null;
  return {
    spotifyUserId: data.spotifyUserId,
    displayName: data.displayName || "Spotify",
    profileUrl: data.profileUrl || "",
    avatarUrl: data.avatarUrl || "",
    nowPlaying: data.nowPlaying || null,
    recentTracks: Array.isArray(data.recentTracks) ? data.recentTracks : [],
    topTracks: Array.isArray(data.topTracks) ? data.topTracks : [],
    lastSyncAt: data.lastSyncAt || new Date(0).toISOString(),
  };
}

export async function saveSpotifyAuthAndSnapshot(params: {
  userId: number;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}) {
  const snapshot = await fetchSpotifySnapshot(params.accessToken);
  const data: SpotifyStoredData = {
    ...snapshot,
    accessToken: params.accessToken,
    refreshToken: params.refreshToken,
    expiresAt: Date.now() + params.expiresIn * 1000,
  };

  await prisma.integration.upsert({
    where: { userId_type: { userId: params.userId, type: "spotify" } },
    create: { userId: params.userId, type: "spotify", visible: true, data: JSON.stringify(data) },
    update: { visible: true, data: JSON.stringify(data) },
  });

  return toSpotifyPublicData(data);
}

export async function refreshSpotifyIntegrationForUser(userId: number, force = false): Promise<SpotifyPublicData | null> {
  const row = await prisma.integration.findUnique({ where: { userId_type: { userId, type: "spotify" } } });
  if (!row?.data) return null;

  const stored = parseStoredData(row.data);
  const refreshToken = String(stored.refreshToken || "");
  if (!refreshToken) return toSpotifyPublicData(stored);

  const lastSyncMs = stored.lastSyncAt ? new Date(stored.lastSyncAt).getTime() : 0;
  if (!force && lastSyncMs && Date.now() - lastSyncMs < 45_000) {
    return toSpotifyPublicData(stored);
  }

  let accessToken = String(stored.accessToken || "");
  let expiresAt = Number(stored.expiresAt || 0);
  let nextRefreshToken = refreshToken;

  if (!accessToken || !expiresAt || Date.now() > expiresAt - 20_000) {
    const refreshed = await refreshSpotifyToken(refreshToken);
    accessToken = refreshed.access_token;
    expiresAt = Date.now() + refreshed.expires_in * 1000;
    if (refreshed.refresh_token) nextRefreshToken = refreshed.refresh_token;
  }

  const snapshot = await fetchSpotifySnapshot(accessToken);
  const nextData: SpotifyStoredData = {
    ...stored,
    ...snapshot,
    accessToken,
    refreshToken: nextRefreshToken,
    expiresAt,
  } as SpotifyStoredData;

  await prisma.integration.update({ where: { id: row.id }, data: { data: JSON.stringify(nextData) } });
  return toSpotifyPublicData(nextData);
}

const nowPlayingChecked = new Map<number, number>();

/**
 * Just the current track, for the live card on profiles (polled by visitors). Throttled to one Spotify call
 * per user every 10s; the rest of the snapshot (recent/top tracks) keeps its slower refresh.
 */
export async function refreshSpotifyNowPlaying(userId: number): Promise<SpotifyPublicData["nowPlaying"] | undefined> {
  const row = await prisma.integration.findUnique({ where: { userId_type: { userId, type: "spotify" } } });
  if (!row?.data || !row.visible) return undefined;
  const stored = parseStoredData(row.data);
  if (Date.now() - (nowPlayingChecked.get(userId) ?? 0) < 10_000 || !stored.refreshToken) return stored.nowPlaying ?? null;
  nowPlayingChecked.set(userId, Date.now());

  let accessToken = String(stored.accessToken || "");
  let expiresAt = Number(stored.expiresAt || 0);
  let refreshToken = String(stored.refreshToken);
  try {
    if (!accessToken || !expiresAt || Date.now() > expiresAt - 20_000) {
      const refreshed = await refreshSpotifyToken(refreshToken);
      accessToken = refreshed.access_token;
      expiresAt = Date.now() + refreshed.expires_in * 1000;
      if (refreshed.refresh_token) refreshToken = refreshed.refresh_token;
    }
    const nowPlaying = await fetchNowPlaying(accessToken);
    await prisma.integration.update({
      where: { id: row.id },
      data: { data: JSON.stringify({ ...stored, nowPlaying, accessToken, refreshToken, expiresAt }) },
    });
    return nowPlaying;
  } catch {
    return stored.nowPlaying ?? null;
  }
}
