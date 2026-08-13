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
  name?: string;
  duration_ms?: number;
  artists?: SpotifyArtist[];
  album?: SpotifyAlbum;
  external_urls?: { spotify?: string };
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
  } | null;
  recentTracks: SpotifyRecentTrack[];
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
  const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
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

  return {
    isPlaying: Boolean(data.is_playing),
    trackName: String(item.name || ""),
    artists: (item.artists || []).map((a) => a.name).filter(Boolean).join(", "),
    albumName: String(item.album?.name || ""),
    albumImage: String(item.album?.images?.[0]?.url || ""),
    trackUrl: String(item.external_urls?.spotify || ""),
    progressMs: Number(data.progress_ms || 0),
    durationMs: Number(item.duration_ms || 0),
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

async function fetchSpotifySnapshot(accessToken: string) {
  const [profile, nowPlaying, recentTracks] = await Promise.all([
    fetchSpotifyProfile(accessToken),
    fetchNowPlaying(accessToken).catch(() => null),
    fetchRecentTracks(accessToken).catch(() => []),
  ]);

  return {
    ...profile,
    nowPlaying,
    recentTracks,
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
    create: { userId: params.userId, type: "spotify", visible: true, data },
    update: { visible: true, data },
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

  await prisma.integration.update({ where: { id: row.id }, data: { data: nextData } });
  return toSpotifyPublicData(nextData);
}
