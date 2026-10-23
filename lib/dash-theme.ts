// Dashboard look (dark/light + accent colour), stored in cookies so the server can render it without a flash.
export const DASH_THEME_COOKIE = "dash_theme";
export const DASH_ACCENT_COOKIE = "dash_accent";
export const DEFAULT_DASH_ACCENT = "#7c3aed";

export type DashMode = "dark" | "light";

export const DASH_ACCENT_PRESETS = [
  "#f43f5e", "#7c3aed", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444",
  "#a855f7", "#ec4899", "#14b8a6", "#f97316", "#84cc16", "#94a3b8",
];

export function normalizeDashMode(v: string | null | undefined): DashMode {
  return v === "light" ? "light" : "dark";
}

export function normalizeAccent(v: string | null | undefined): string {
  return v && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : DEFAULT_DASH_ACCENT;
}

/** Applies the theme to <html>; the dashboard-only CSS hooks off these classes. */
export function applyDashTheme(mode: DashMode, accent: string) {
  const root = document.documentElement;
  root.classList.add("dash-active");
  root.classList.toggle("dash-light", mode === "light");
  const custom = accent !== DEFAULT_DASH_ACCENT;
  root.classList.toggle("dash-custom-accent", custom);
  if (custom) root.style.setProperty("--dash-accent", accent);
  else root.style.removeProperty("--dash-accent");
}

export function clearDashTheme() {
  const root = document.documentElement;
  root.classList.remove("dash-active", "dash-light", "dash-custom-accent");
  root.style.removeProperty("--dash-accent");
}

export function saveDashThemeCookies(mode: DashMode, accent: string) {
  const age = 60 * 60 * 24 * 365;
  document.cookie = `${DASH_THEME_COOKIE}=${mode}; path=/; max-age=${age}; samesite=lax`;
  document.cookie = `${DASH_ACCENT_COOKIE}=${encodeURIComponent(accent)}; path=/; max-age=${age}; samesite=lax`;
  // The server copy is the reliable one: it's stored on the account and re-sets the cookies via Set-Cookie.
  return fetch("/api/dash-theme", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, accent }),
  }).catch(() => undefined);
}
