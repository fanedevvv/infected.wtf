<?php
function isLoggedIn(): bool {
    return isset($_SESSION['user_id']);
}
function requireLogin(): void {
    if (!isLoggedIn()) { header('Location: /login'); exit; }
}
function checkBanned(PDO $pdo): void {
    if (!isLoggedIn()) return;
    $s = $pdo->prepare("SELECT banned, ban_until FROM users WHERE id=?");
    $s->execute([(int)$_SESSION['user_id']]);
    $row = $s->fetch();
    if (!$row || $row['banned']) {
        $until = (!empty($row['ban_until'])) ? urlencode($row['ban_until']) : 'permanent';
        $uid   = (int)$_SESSION['user_id'];
        session_destroy();
        header('Location: /banned?u=' . $until . '&uid=' . $uid);
        exit;
    }
}
function redirect(string $path): void {
    header('Location: ' . $path); exit;
}
function isAdmin(PDO $pdo): bool {
    if (!isLoggedIn()) return false;
    $s = $pdo->prepare("SELECT is_admin, is_owner FROM users WHERE id=?");
    $s->execute([(int)$_SESSION['user_id']]);
    $row = $s->fetch();
    return $row && ($row['is_admin'] || $row['is_owner']);
}
function isOwner(PDO $pdo): bool {
    if (!isLoggedIn()) return false;
    $s = $pdo->prepare("SELECT is_owner FROM users WHERE id=?");
    $s->execute([(int)$_SESSION['user_id']]);
    return (bool)$s->fetchColumn();
}
function isModerator(PDO $pdo): bool {
    if (!isLoggedIn()) return false;
    $s = $pdo->prepare("SELECT is_mod, is_admin, is_owner FROM users WHERE id=?");
    $s->execute([(int)$_SESSION['user_id']]);
    $row = $s->fetch();
    return $row && ($row['is_mod'] || $row['is_admin'] || $row['is_owner']);
}

// ── Whitelist / Maintenance ───────────────────────────────────────────────────
function isStaff(PDO $pdo): bool {
    if (!isLoggedIn()) return false;
    $s = $pdo->prepare("SELECT is_mod, is_admin, is_owner FROM users WHERE id=?");
    $s->execute([(int)$_SESSION['user_id']]);
    $row = $s->fetch();
    return $row && ($row['is_mod'] || $row['is_admin'] || $row['is_owner']);
}

function isWhitelistEnabled(PDO $pdo): bool {
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS site_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            whitelist_enabled TINYINT(1) NOT NULL DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            updated_by INT DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $row = $pdo->query("SELECT whitelist_enabled FROM site_settings LIMIT 1")->fetch();
        if (!$row) {
            $pdo->exec("INSERT INTO site_settings (whitelist_enabled) VALUES (0)");
            return false;
        }
        return (bool)$row['whitelist_enabled'];
    } catch (Exception $e) {
        return false;
    }
}

function checkWhitelist(PDO $pdo, string $uri): void {
    $exempt = ['login', 'logout', 'banned', 'auth/verify-email', 'auth/confirm-action'];
    if (in_array($uri, $exempt, true) || $uri === 'maintenance') return;
    if (!isWhitelistEnabled($pdo)) return;
    if (isStaff($pdo)) return;
    // Allow OG/social crawlers to fetch pages for embed previews
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    if (preg_match('/Discordbot|facebookexternalhit|WhatsApp|Twitterbot|Slackbot|TelegramBot|LinkedInBot|Pinterest|Googlebot|bingbot/i', $ua)) return;
    header('Location: /maintenance'); exit;
}