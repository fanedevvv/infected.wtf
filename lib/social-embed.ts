// Variables a custom social-embed title/description can reference — resolved
// the same way on the live preview card (client) and the real embed (server).
export const EMBED_VARIABLES = [
  { token: "{{username}}", desc: "Profile handle" },
  { token: "{{displayName}}", desc: "Display name" },
  { token: "{{bio}}", desc: "Profile bio" },
  { token: "{{views}}", desc: "Profile view count" },
] as const;

export type EmbedVarData = { username: string; displayName: string; bio: string; views: number };

export function applyEmbedVariables(text: string, data: EmbedVarData): string {
  return text
    .replace(/\{\{username\}\}/g, data.username)
    .replace(/\{\{displayName\}\}/g, data.displayName)
    .replace(/\{\{bio\}\}/g, data.bio)
    .replace(/\{\{views\}\}/g, data.views.toLocaleString());
}

export const EMBED_COLOR_MODES = ["page", "custom", "none"] as const;
export type EmbedColorMode = (typeof EMBED_COLOR_MODES)[number];
