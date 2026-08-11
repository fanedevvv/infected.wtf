<?php
/* ── Site ── */
define('SITE_NAME', 'GETFAME.WTF');
define('SITE_URL',  'https://infected.wtf');

/* ── Database ── */
define('DB_HOST', 'localhost');
define('DB_USER', 'getfame');
define('DB_PASS', 'kV2OQTF7Ytmaz7ILYNbV73HcnuogiBG');
define('DB_NAME', 'biolink');

/* ── Paths ── */
define('ROOT_PATH', dirname(__DIR__));
define('VIEWS_PATH', ROOT_PATH . '/views');
define('UPLOADS_PATH', ROOT_PATH . '/uploads');

/* ── Discord Integration (Bot) ── */
define('DISCORD_BOT_TOKEN',     'token');       // Bot token from Discord Developer Portal
define('DISCORD_GUILD_ID',      'guild');       // Your Discord server ID (right-click server → Copy ID)
define('DISCORD_SERVER_INVITE', 'discord server'); // Invite link for your server
define('DISCORD_BOT_URL', 'http://127.0.0.1:4001'); // Internal URL of the discord-bot/ Express API (see discord-bot/.env PORT)
define('DISCORD_BOT_API_KEY', 'DkZsYwH2Igh4zk0LTMY24wFZ'); // Must match discord-bot/.env API_KEY

/* ── Discord OAuth2 ("Login with Discord") ── */
define('DISCORD_CLIENT_ID',     'client_id');     // Application → OAuth2 → Client ID
define('DISCORD_CLIENT_SECRET', 'client_secret'); // Application → OAuth2 → Client Secret
define('DISCORD_REDIRECT_URI',  rtrim(SITE_URL, '/') . '/api/discord_oauth.php?action=callback'); // Must be added under OAuth2 → Redirects

/* ── Discord Role IDs (right-click role in Server Settings → Roles → Copy ID) ── */
define('DISCORD_ROLE_INFECTED', 'role_id'); // Granted automatically when a user links their Discord account
define('DISCORD_ROLE_PREMIUM',  'role_id'); // Granted while the site account has active premium
define('DISCORD_ROLE_VERIFIED', 'role_id'); // Granted while the site account has the "verified" badge

/* EMAIL CRYPTION */
define('EMAIL_ENCRYPTION_KEY',  '6cab05eb8e8efe6aa4bf479d859a2c42'); // 32 bytes → AES-256
define('EMAIL_BLIND_INDEX_KEY', '38a2d6d6003c35302e95e06a03623ede4ec915f0abf440bbaa263d0672bf148e'); // HMAC-SHA256