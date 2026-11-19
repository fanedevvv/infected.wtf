// The real invite lives here only; everything on the site links to DISCORD_URL (infected.wtf/discord),
// which redirects to it. DISCORD_INVITE_URL in .env overrides it (restart the site after changing it).
// The default is a permanent invite to #rules owned by the bot, so it never expires or dies with a member.
export const DISCORD_INVITE_TARGET = process.env.DISCORD_INVITE_URL || "https://discord.gg/8RJAhPqssh";
export const DISCORD_URL = "https://infected.wtf/discord";
