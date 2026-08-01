<?php
/* ── Site ── */
define('SITE_NAME', 'INFECTED.WTF');
define('SITE_URL',  'https://localhost');

/* ── Database ── */
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'biolink');

/* ── Paths ── */
define('ROOT_PATH', dirname(__DIR__));
define('VIEWS_PATH', ROOT_PATH . '/views');
define('UPLOADS_PATH', ROOT_PATH . '/uploads');

/* ── Discord Integration (Bot) ── */
define('DISCORD_BOT_TOKEN',     'token');       // Bot token from Discord Developer Portal
define('DISCORD_GUILD_ID',      'guild');       // Your Discord server ID (right-click server → Copy ID)
define('DISCORD_SERVER_INVITE', 'discord server'); // Invite link for your server
define('DISCORD_BOT_URL', '.');
define('DISCORD_BOT_API_KEY', 'replace-with-your-own-key');

/* EMAIL CRYPTION */
define('EMAIL_ENCRYPTION_KEY',  'replace-with-32-byte-key-for-aes-256'); // 32 bytes → AES-256
define('EMAIL_BLIND_INDEX_KEY', 'replace-with-your-own-hmac-sha256-key');
