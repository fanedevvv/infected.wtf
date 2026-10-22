const STEAM_ANDROID_PACKAGE = "com.valvesoftware.android.steam.community";

export function isSteamUrl(url: string): boolean {
  try {
    return /(^|\.)(steamcommunity\.com|steampowered\.com)$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * onClick for Steam links: on Android, open the link inside the Steam app when it's installed.
 * Chrome's intent URL falls back to the normal web page by itself when the app is missing.
 * Other platforms keep the plain https link (iOS hands it to the app via universal links when it can).
 */
export function openSteamInApp(e: React.MouseEvent<HTMLAnchorElement>, url: string) {
  if (!isSteamUrl(url) || !/Android/i.test(navigator.userAgent)) return;
  e.preventDefault();
  const u = new URL(url);
  window.location.href = `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=${STEAM_ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(url)};end`;
}
