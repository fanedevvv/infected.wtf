<?php
// ============================================
// INFECTED.WTF — Admin Action API
// All actions go through here with full permission checks
// ============================================
define('ROOT', dirname(__DIR__));
session_start(["cookie_secure"=>true,"cookie_httponly"=>true,"cookie_samesite"=>"Lax"]);

require_once ROOT . '/config/config.php';
require_once ROOT . '/core/database.php';
require_once ROOT . '/core/auth.php';
require_once ROOT . '/core/helpers.php';

header('Content-Type: application/json');

function ok(string $msg = 'Done', array $extra = []): void {
    echo json_encode(array_merge(['success' => true, 'message' => $msg], $extra));
    exit;
}
function err(string $msg, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg]);
    exit;
}

/**
 * Sync premium Discord role for a user.
 * Fetches their linked discord_user_id and calls assign/remove on the bot.
 */
function syncDiscordPremiumRole($pdo, int $userId, bool $hasPremium): void {
    $botUrl = defined('DISCORD_BOT_URL') ? rtrim(DISCORD_BOT_URL, '/') : 'http://localhost:3000';
    $apiKey = defined('DISCORD_BOT_API_KEY') ? DISCORD_BOT_API_KEY : '';

    $intRow = $pdo->prepare("SELECT discord_user_id FROM integrations WHERE user_id=? AND type='discord'");
    $intRow->execute([$userId]);
    $intData = $intRow->fetch();

    if (empty($intData['discord_user_id'])) return; // nu are Discord linkat

    $discordId = $intData['discord_user_id'];
    $endpoint  = $hasPremium ? '/assign-premium-role' : '/remove-premium-role';
    $payload   = json_encode(['discord_id' => $discordId]);

    $ch = curl_init("{$botUrl}{$endpoint}");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 2,  // fire-and-forget — nu blocam PHP-ul
        CURLOPT_CONNECTTIMEOUT => 1,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => [
            "Content-Type: application/json",
            "X-Api-Key: {$apiKey}",
            "User-Agent: BioLink/1.0",
        ],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
    ]);
    curl_exec($ch);
    curl_close($ch);
}

// Must be logged in and at least admin
if (!isLoggedIn()) err('Unauthenticated', 401);
// Allow mods in — they have restricted access enforced per-action
$colsMod = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
if (!in_array('is_mod', $colsMod)) $pdo->exec("ALTER TABLE users ADD COLUMN is_mod TINYINT(1) DEFAULT 0");
$authCheck = $pdo->prepare("SELECT is_admin, is_owner, is_mod FROM users WHERE id=?");
$authCheck->execute([(int)$_SESSION['user_id']]);
$authRow = $authCheck->fetch();
if (!$authRow || (!$authRow['is_admin'] && !$authRow['is_owner'] && !$authRow['is_mod'])) err('Forbidden', 403);

$actorId = (int)$_SESSION['user_id'];

// Fetch actor's role
$actor = $pdo->prepare("SELECT is_admin, is_owner FROM users WHERE id=?");
$actor->execute([$actorId]);
$actorRow = $actor->fetch();
if (!$actorRow) err('Actor not found', 403);

$actorIsOwner = (bool)$actorRow['is_owner'];
$actorIsAdmin = (bool)$actorRow['is_admin'];

// Determine if actor can grant owner role (first 3 owners only)
$canGrantOwner = false;
if ($actorIsOwner) {
    $ownerPos = $pdo->prepare("SELECT COUNT(*)+1 FROM users WHERE is_owner=1 AND id < ?");
    $ownerPos->execute([$actorId]);
    $actorOwnerRank = (int)$ownerPos->fetchColumn();
    $canGrantOwner  = $actorOwnerRank <= 3;
}

// Parse input
$input    = json_decode(file_get_contents('php://input'), true);
$action   = trim($input['action']   ?? ($_POST['action']   ?? ''));
$targetId = (int)($input['target_id'] ?? ($_POST['target_id'] ?? 0));

// ── Actions that don't need a target user ─────────────
if ($action === 'toggle_whitelist') {
    if (!$actorIsOwner) err('Only owners can toggle the whitelist.', 403);
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `site_settings` (
            `id`                INT AUTO_INCREMENT PRIMARY KEY,
            `whitelist_enabled` TINYINT(1) NOT NULL DEFAULT 0,
            `updated_at`        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            `updated_by`        INT DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $existing = $pdo->query("SELECT id, whitelist_enabled FROM site_settings LIMIT 1")->fetch();
    if (!$existing) {
        $pdo->exec("INSERT INTO site_settings (whitelist_enabled, updated_by) VALUES (1, {$actorId})");
        $newState = true;
    } else {
        $newState = !((bool)$existing['whitelist_enabled']);
        $pdo->prepare("UPDATE site_settings SET whitelist_enabled=?, updated_by=? WHERE id=?")
            ->execute([$newState ? 1 : 0, $actorId, $existing['id']]);
    }
    $label = $newState ? 'enabled' : 'disabled';
    ok("Whitelist {$label}.", ['whitelist_enabled' => $newState]);
}

// ── Toggle x2 Tokens Event (Owner only) ───────────────────────────────
if ($action === 'toggle_x2_tokens') {
    if (!$actorIsOwner) err('Only owners can toggle the x2 Tokens event.', 403);

    // Ensure site_settings table has the column
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `site_settings` (
            `id`                 INT AUTO_INCREMENT PRIMARY KEY,
            `whitelist_enabled`  TINYINT(1) NOT NULL DEFAULT 0,
            `x2_tokens_enabled`  TINYINT(1) NOT NULL DEFAULT 0,
            `updated_at`         DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            `updated_by`         INT DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    // Auto-add column if table already existed without it
    $settingsCols = $pdo->query("SHOW COLUMNS FROM site_settings")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('x2_tokens_enabled', $settingsCols)) {
        $pdo->exec("ALTER TABLE site_settings ADD COLUMN x2_tokens_enabled TINYINT(1) NOT NULL DEFAULT 0");
    }

    $existing = $pdo->query("SELECT id, x2_tokens_enabled FROM site_settings LIMIT 1")->fetch();
    if (!$existing) {
        $pdo->exec("INSERT INTO site_settings (x2_tokens_enabled, updated_by) VALUES (1, {$actorId})");
        $newState = true;
    } else {
        $newState = !((bool)$existing['x2_tokens_enabled']);
        $pdo->prepare("UPDATE site_settings SET x2_tokens_enabled=?, updated_by=? WHERE id=?")
            ->execute([$newState ? 1 : 0, $actorId, $existing['id']]);
    }
    $label = $newState ? 'ACTIVATED' : 'deactivated';

    // ── Notify all users when x2 is activated ────────────────────────────
    if ($newState) {
        $allUids = $pdo->query("SELECT id FROM users WHERE email_verified=1 AND banned=0")->fetchAll(PDO::FETCH_COLUMN);
        $stmt = $pdo->prepare("INSERT INTO notifications (user_id, type, title, body, icon) VALUES (?, 'event', ?, ?, 'star')");
        foreach ($allUids as $uid) {
            $stmt->execute([(int)$uid, '⚡ x2 Tokens Event is LIVE!', 'Earn double tokens on every view, pack purchase and referral. Go grind!']);
        }
    }

    ok("x2 Tokens event {$label}!", ['x2_tokens_enabled' => $newState]);
}

// ── CREATE BUNDLE (no target needed) ──────────────────
if ($action === 'create_bundle') {
    if (!$actorIsOwner) err('Only owners can create bundles.', 403);
    $bName        = trim($input['name']         ?? '');
    $bPrice       = (float)($input['price']     ?? 0);
    $bPriceType   = in_array($input['price_type'] ?? '', ['euro','tokens']) ? $input['price_type'] : 'euro';
    $bBadges      = array_values(array_filter((array)($input['badges']  ?? []), fn($v) => is_string($v) && strlen($v) <= 60));
    $bEffects     = array_values(array_filter((array)($input['effects'] ?? []), fn($v) => is_string($v) && strlen($v) <= 60));
    $bPremiumDays = max(0, (int)($input['premium_days'] ?? 0));
    if (!$bName) err('Bundle name is required.');
    if (strlen($bName) > 100) err('Bundle name too long.');
    if ($bPrice < 0) err('Price cannot be negative.');
    $pdo->exec("CREATE TABLE IF NOT EXISTS `bundles` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `name` VARCHAR(100) NOT NULL,
        `price` DECIMAL(8,2) NOT NULL DEFAULT 0,
        `price_type` ENUM('euro','tokens') NOT NULL DEFAULT 'euro',
        `badges` JSON DEFAULT NULL,
        `effects` JSON DEFAULT NULL,
        `premium_days` INT NOT NULL DEFAULT 0,
        `created_by` INT DEFAULT NULL,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $stmt = $pdo->prepare("INSERT INTO bundles (name, price, price_type, badges, effects, premium_days, created_by) VALUES (?,?,?,?,?,?,?)");
    $stmt->execute([$bName, $bPrice, $bPriceType, json_encode($bBadges), json_encode($bEffects), $bPremiumDays, $actorId]);
    ok("Bundle '{$bName}' created.", ['bundle_id' => (int)$pdo->lastInsertId()]);
}

// ── DELETE BUNDLE (no target needed) ──────────────────
if ($action === 'delete_bundle') {
    if (!$actorIsOwner) err('Only owners can delete bundles.', 403);
    $bundleId = (int)($input['bundle_id'] ?? 0);
    if (!$bundleId) err('Invalid bundle ID.');
    $pdo->prepare("DELETE FROM bundles WHERE id=?")->execute([$bundleId]);
    ok('Bundle deleted.');
}

if (!$targetId) err('Invalid target');

// Parse self_edit flag — owners may manage themselves for tokens/badges/premium
$selfEdit = !empty($input['self_edit']);

// Block self-targeting except for owners doing tokens/badges/premium/set_role on themselves
$selfAllowedActions = ['badge_grant','badge_revoke','set_tokens','set_premium'];
if ($targetId === $actorId && !($actorIsOwner && $selfEdit && in_array($action, $selfAllowedActions))) {
    err('Cannot target yourself');
}

// Fetch target user
$tStmt = $pdo->prepare("SELECT id, username, is_admin, is_owner, is_mod, banned FROM users WHERE id=?");
$tStmt->execute([$targetId]);
$target = $tStmt->fetch();
if (!$target) err('Target user not found', 404);

// Skip role-conflict checks when owner is targeting themselves
if ($targetId !== $actorId) {
    // Owners cannot be targeted by anyone except owners
    if ($target['is_owner'] && !$actorIsOwner) {
        err('You cannot target Owner accounts.', 403);
    }
    // Owners cannot ban or delete other owners
    if ($target['is_owner'] && $actorIsOwner && in_array($action, ['ban', 'delete'])) {
        err('Owners cannot ban or delete other Owner accounts.', 403);
    }
    // Admins cannot be targeted by other admins (only by owners)
    if ($target['is_admin'] && !$actorIsOwner) {
        err('Admins cannot target other Admin accounts.', 403);
    }
    // Admins cannot target themselves
    if ($actorIsAdmin && !$actorIsOwner && $targetId === $actorId) {
        err('You cannot perform actions on your own account.', 403);
    }
    // Mods cannot target owners, admins, or other mods — only plain users
    $actorIsModOnly = !$actorIsAdmin && !$actorIsOwner && !empty($authRow['is_mod']);
    if ($actorIsModOnly && ($target['is_owner'] || $target['is_admin'] || !empty($target['is_mod']))) {
        err('Moderators can only ban regular users.', 403);
    }
}

// ── Rate-limit helper ──────────────────────────────────────────────────────────
// Ensures admins table has the rate-limit columns; returns current count in window.
function getRateLimitCount(PDO $pdo, int $actorId, string $actionType): int {
    // Auto-add columns if missing
    $cols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('rl_ban_count',    $cols)) $pdo->exec("ALTER TABLE users ADD COLUMN rl_ban_count    INT DEFAULT 0");
    if (!in_array('rl_ban_window',   $cols)) $pdo->exec("ALTER TABLE users ADD COLUMN rl_ban_window   DATETIME DEFAULT NULL");
    if (!in_array('rl_del_count',    $cols)) $pdo->exec("ALTER TABLE users ADD COLUMN rl_del_count    INT DEFAULT 0");
    if (!in_array('rl_del_window',   $cols)) $pdo->exec("ALTER TABLE users ADD COLUMN rl_del_window   DATETIME DEFAULT NULL");

    $countCol  = $actionType === 'ban' ? 'rl_ban_count'  : 'rl_del_count';
    $windowCol = $actionType === 'ban' ? 'rl_ban_window' : 'rl_del_window';

    // Comparatia ferestrei se face integral in MySQL pentru a evita
    // diferentele de timezone intre PHP si MySQL (bug care reseta contorul la fiecare request).
    // Conditia de fereastra e in WHERE — compatibil cu toate versiunile MariaDB/MySQL.
    $row = $pdo->prepare("
        SELECT {$countCol} AS cnt
        FROM users
        WHERE id=?
          AND {$windowCol} IS NOT NULL
          AND {$windowCol} >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    ");
    $row->execute([$actorId]);
    $rl = $row->fetch();

    if (!$rl) {
        // Fereastra a expirat sau nu exista — resetam
        $pdo->prepare("UPDATE users SET {$countCol}=0, {$windowCol}=NOW() WHERE id=?")->execute([$actorId]);
        return 0;
    }
    return (int)$rl['cnt'];
}

function incrementRateLimit(PDO $pdo, int $actorId, string $actionType): void {
    $countCol = $actionType === 'ban' ? 'rl_ban_count' : 'rl_del_count';
    $pdo->prepare("UPDATE users SET {$countCol}={$countCol}+1 WHERE id=?")->execute([$actorId]);
}

// ── Trimite embed direct pe Discord via Webhook ───────────────────────────────
function notifyBot(string $event, int $actorId, string $actorUsername, string $actorGrade, string $targetUsername, int $targetId, string $targetGrade, string $extra = ''): void {
    $webhookUrl = 'https://discord.com/api/webhooks/1506738451960303646/zY9t3aC9GadvxEyjJQ9Go5ZFHYGgOAUzupgMihMxKWw_8p104B_VImBR-U282XQeP1sU';
    $siteUrl    = defined('SITE_URL') ? rtrim(SITE_URL, '/') : 'https://infected.wtf';

    $isBan    = $event === 'ban';
    $isDelete = $event === 'delete';
    $isUnban  = $event === 'unban';

    // Embed color: ban = orange, delete = red, unban = green
    $color = $isBan ? 16737792 : ($isDelete ? 16711680 : ($isUnban ? 5763719 : 8947848));

    // Title and icon
    $icon  = $isBan ? '🔨' : ($isDelete ? '🗑️' : ($isUnban ? '✅' : '⚙️'));
    $title = $isBan ? "{$icon} User Banned" : ($isDelete ? "{$icon} Account Deleted" : ($isUnban ? "{$icon} User Unbanned" : "{$icon} Admin Action"));

    // Grade labels
    $gradeLabels = [
        'owner' => '👑 Owner',
        'admin' => '🛡️ Admin',
        'mod'   => '🔧 Moderator',
        'user'  => '👤 User',
    ];
    $actorGradeLabel  = $gradeLabels[$actorGrade]  ?? "👤 {$actorGrade}";
    $targetGradeLabel = $gradeLabels[$targetGrade] ?? "👤 {$targetGrade}";

    $adminUrl  = $siteUrl . '/admin?q=' . urlencode($targetUsername);
    $timestamp = date('c'); // ISO 8601

    // Build embed fields
    $fields = [
        [
            'name'   => '👤 Actor (performed by)',
            'value'  => "`@{$actorUsername}` (ID: `{$actorId}`)\nRole: **{$actorGradeLabel}**",
            'inline' => false,
        ],
        [
            'name'   => '🎯 Target (acted upon)',
            'value'  => "`@{$targetUsername}` (ID: `{$targetId}`)\nRole: **{$targetGradeLabel}**",
            'inline' => false,
        ],
        [
            'name'   => '⏰ When',
            'value'  => "<t:" . time() . ":F>",
            'inline' => true,
        ],
    ];

    if (!empty($extra)) {
        $fields[] = [
            'name'   => '📋 Details',
            'value'  => $extra,
            'inline' => false,
        ];
    }

    $payload = json_encode([
        'username'   => 'Infected · Admin Log',
        'avatar_url' => $siteUrl . '/assets/img/logo.png',
        'embeds'     => [[
            'title'     => $title,
            'color'     => $color,
            'fields'    => $fields,
            'footer'    => ['text' => 'Infected · Admin Log'],
            'timestamp' => $timestamp,
        ]],
    ]);

    $ch = curl_init($webhookUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $errno    = curl_errno($ch);
    if ($errno) {
        error_log("[notifyBot] curl error #{$errno}: " . curl_error($ch));
    } else {
        error_log("[notifyBot] webhook OK http={$httpCode} event={$event} actor={$actorUsername}({$actorGrade}) target={$targetUsername}({$targetGrade})");
    }
    curl_close($ch);
}
// ─────────────────────────────────────────────────────────────────────────────

// Fetch actor username for alerts
$actorUsernameRow = $pdo->prepare("SELECT username FROM users WHERE id=?");
$actorUsernameRow->execute([$actorId]);
$actorUsername = (string)($actorUsernameRow->fetchColumn() ?: 'unknown');

switch ($action) {

    // ── BAN (Admin + Owner) ─────────────────────────────
    case 'ban':
        // Check if actor is only a mod — mods can only do temporary bans
        $colsCheckMod = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('is_mod', $colsCheckMod)) $pdo->exec("ALTER TABLE users ADD COLUMN is_mod TINYINT(1) DEFAULT 0");
        $actorModRow = $pdo->prepare("SELECT is_mod FROM users WHERE id=?"); $actorModRow->execute([$actorId]); $actorMod = $actorModRow->fetch();
        $actorIsMod = !$actorIsAdmin && !$actorIsOwner && !empty($actorMod['is_mod']);
        $days = isset($input['days']) ? (int)$input['days'] : 0;
        if ($actorIsMod && $days <= 0) err('Moderators can only issue temporary bans.', 403);

        // ── Rate limiting ─────────────────────────────────
        // Mod: max 3 bans/hour | Admin: max 7 bans/hour | Owner: unlimited
        if (!$actorIsOwner) {
            $banLimit  = $actorIsMod ? 3 : 7;
            $banCount  = getRateLimitCount($pdo, $actorId, 'ban');
            if ($banCount >= $banLimit) {
                err("Rate limit reached: you can only ban {$banLimit} user(s) per hour. Try again later.", 429);
            }
            incrementRateLimit($pdo, $actorId, 'ban');
            $newBanCount = $banCount + 1;
        }
        // Notify bot on every ban (inclusiv owner)
        $actorGrade  = $actorIsOwner ? 'owner' : ($actorIsAdmin ? 'admin' : 'mod');
        $targetGrade = $target['is_owner'] ? 'owner' : ($target['is_admin'] ? 'admin' : (!empty($target['is_mod']) ? 'mod' : 'user'));
        notifyBot('ban', $actorId, $actorUsername, $actorGrade, $target['username'], $targetId, $targetGrade,
            $days > 0 ? "Temporary ({$days}d)" : 'Permanent');
        // ─────────────────────────────────────────────────

        if ($days > 0) {
            $until = date('Y-m-d H:i:s', strtotime("+{$days} days"));
            $pdo->prepare("UPDATE users SET banned=1, ban_until=? WHERE id=?")->execute([$until, $targetId]);
            ok("@{$target['username']} banned for {$days} day(s) (until {$until}).");
        } else {
            $pdo->prepare("UPDATE users SET banned=1, ban_until=NULL WHERE id=?")->execute([$targetId]);
            ok("@{$target['username']} has been permanently banned.");
        }

    case 'unban':
        $pdo->prepare("UPDATE users SET banned=0, ban_until=NULL WHERE id=?")->execute([$targetId]);
        $actorGrade  = $actorIsOwner ? 'owner' : ($actorIsAdmin ? 'admin' : 'mod');
        $targetGrade = $target['is_owner'] ? 'owner' : ($target['is_admin'] ? 'admin' : (!empty($target['is_mod']) ? 'mod' : 'user'));
        notifyBot('unban', $actorId, $actorUsername, $actorGrade, $target['username'], $targetId, $targetGrade);
        ok("@{$target['username']} has been unbanned.");

    // ── DELETE (Admin + Owner) ──────────────────────────
    case 'delete':
        // ── Rate limiting (delete): Admin max 5/hour | Owner: unlimited ──────
        if (!$actorIsOwner) {
            $delCount = getRateLimitCount($pdo, $actorId, 'delete');
            if ($delCount >= 5) {
                err('Rate limit reached: you can only delete 5 account(s) per hour. Try again later.', 429);
            }
            incrementRateLimit($pdo, $actorId, 'delete');
        }
        // ─────────────────────────────────────────────────────────────────────

        // Notify bot on every delete (inclusiv owner)
        $actorGrade  = $actorIsOwner ? 'owner' : ($actorIsAdmin ? 'admin' : 'mod');
        $targetGrade = $target['is_owner'] ? 'owner' : ($target['is_admin'] ? 'admin' : (!empty($target['is_mod']) ? 'mod' : 'user'));
        notifyBot('delete', $actorId, $actorUsername, $actorGrade, $target['username'], $targetId, $targetGrade);

        // Delete user files
        $avatarStmt = $pdo->prepare("SELECT avatar, music_path FROM profiles WHERE user_id=?");
        $avatarStmt->execute([$targetId]);
        $files = $avatarStmt->fetch();
        if ($files) {
            foreach (['avatar', 'music_path'] as $col) {
                if (!empty($files[$col]) && file_exists(ROOT.'/'.$files[$col])) {
                    @unlink(ROOT.'/'.$files[$col]);
                }
            }
        }
        $pdo->prepare("DELETE FROM users WHERE id=?")->execute([$targetId]);
        ok("@{$target['username']} has been deleted permanently.");

    // ── BADGE (Owner only) ──────────────────────────────
    case 'badge_grant':
    case 'badge_revoke':
        if (!$actorIsOwner) err('Only owners can manage badges', 403);
        $badgeId = trim($input['badge_id'] ?? ($_POST['badge_id'] ?? ''));
        // 'discord' si 'booster' sunt automate — nu pot fi acordate/revocate din admin
        $allowed = ['verified', 'champion', 'known', 'rich', 'trapstar', 'the_killer', 'crew', 'billionaire', 'content_creator', 'designer'];
        if (!in_array($badgeId, $allowed)) err('Invalid badge ID');
        $grant = $action === 'badge_grant';
        setBadge($pdo, $targetId, $badgeId, $grant);
        $verb = $grant ? 'granted to' : 'revoked from';
        // Daca e badge-ul 'verified', sincronizam si gradul pe serverul Discord
        if ($badgeId === 'verified') {
            $dRow = $pdo->prepare("SELECT discord_user_id FROM integrations WHERE user_id=? AND type='discord' LIMIT 1");
            $dRow->execute([$targetId]);
            $dData = $dRow->fetch();
            if (!empty($dData['discord_user_id'])) {
                $botUrl  = defined('DISCORD_BOT_URL') ? rtrim(DISCORD_BOT_URL, '/') : 'http://localhost:3000';
                $apiKey  = defined('DISCORD_BOT_API_KEY') ? DISCORD_BOT_API_KEY : '';
                $ep      = $grant ? '/assign-verified-role' : '/remove-verified-role';
                $payload = json_encode(['discord_id' => $dData['discord_user_id']]);
                $ch = curl_init($botUrl . $ep);
                curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>2,CURLOPT_CONNECTTIMEOUT=>1,CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$payload,CURLOPT_HTTPHEADER=>["Content-Type: application/json","X-Api-Key: {$apiKey}"],CURLOPT_SSL_VERIFYPEER=>false,CURLOPT_SSL_VERIFYHOST=>false]);
                curl_exec($ch); curl_close($ch);
            }
        }
        // ── Notify user when badge is granted ────────────────────────────
        if ($grant) {
            pushNotification($pdo, $targetId, 'badge',
                "You received a new badge! 🏅",
                "The '{$badgeId}' badge was granted to your profile by an admin.",
                'badge', '/dashboard/badges'
            );
        }
        ok("Badge '{$badgeId}' {$verb} @{$target['username']}.");

    // ── SET TOKENS (Owner only) ─────────────────────────
    case 'set_tokens':
        if (!$actorIsOwner) err('Only owners can set tokens', 403);
        $tokens = max(0, (int)($input['tokens'] ?? 0));
        $pdo->prepare("UPDATE users SET tokens=? WHERE id=?")->execute([$tokens, $targetId]);
        ok("@{$target['username']} tokens set to {$tokens}.");

    // ── SET PREMIUM (Owner only) ────────────────────────
    case 'set_premium':
        if (!$actorIsOwner) err('Only owners can manage Premium', 403);
        $days = (int)($input['days'] ?? 0);
        if ($days > 0) {
            // Auto-add columns if missing
            $cols2 = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
            if (!in_array('is_premium', $cols2))         $pdo->exec("ALTER TABLE users ADD COLUMN is_premium TINYINT(1) DEFAULT 0");
            if (!in_array('premium_expires_at', $cols2)) $pdo->exec("ALTER TABLE users ADD COLUMN premium_expires_at DATETIME DEFAULT NULL");
            $until = date('Y-m-d H:i:s', strtotime("+{$days} days"));
            $pdo->prepare("UPDATE users SET is_premium=1, premium_expires_at=? WHERE id=?")->execute([$until, $targetId]);
            // ── Sync rol Discord ──────────────────────────────────
            syncDiscordPremiumRole($pdo, $targetId, true);
            // ─────────────────────────────────────────────────────
            ok("Premium granted to @{$target['username']} for {$days} day(s). Expires: {$until}.", ['premium' => true, 'expires_at' => $until]);
        } else {
            // Revoke
            $pdo->prepare("UPDATE users SET is_premium=0, premium_expires_at=NULL WHERE id=?")->execute([$targetId]);
            // ── Sync rol Discord ──────────────────────────────────
            syncDiscordPremiumRole($pdo, $targetId, false);
            // ─────────────────────────────────────────────────────
            ok("Premium revoked from @{$target['username']}.", ['premium' => false]);
        }

    // ── SET ROLE (Owner only) ───────────────────────────
    case 'set_role':
        if (!$actorIsOwner) err('Only owners can change roles', 403);
        $role = trim($input['role'] ?? ($_POST['role'] ?? ''));
        if (!in_array($role, ['user', 'mod', 'admin', 'owner'])) err('Invalid role');
        if ($role === 'owner' && !$canGrantOwner) err('Only the first 3 owners can promote to Owner', 403);
        $isAdminVal = in_array($role, ['admin','owner']) ? 1 : 0;
        $isOwnerVal = $role === 'owner' ? 1 : 0;
        $isModVal   = $role === 'mod' ? 1 : 0;
        // Auto-add is_mod column if not present
        $colsCheck = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('is_mod', $colsCheck)) $pdo->exec("ALTER TABLE users ADD COLUMN is_mod TINYINT(1) DEFAULT 0");
        $pdo->prepare("UPDATE users SET is_admin=?, is_owner=?, is_mod=? WHERE id=?")->execute([$isAdminVal, $isOwnerVal, $isModVal, $targetId]);
        ok("@{$target['username']} role set to {$role}.");

    // ── APPLY BUNDLE (Owner only) ───────────────────────
    case 'apply_bundle':
        if (!$actorIsOwner) err('Only owners can apply bundles.', 403);
        $bundleId  = (int)($input['bundle_id'] ?? 0);
        $targetRaw = trim($input['target'] ?? '');
        if (!$bundleId) err('Invalid bundle ID.');
        if (!$targetRaw) err('Target user is required.');

        // Resolve target: username (@...) or user id (#... or plain int)
        $applyTarget = null;
        if (str_starts_with($targetRaw, '@')) {
            $uname = ltrim($targetRaw, '@');
            $tstmt = $pdo->prepare("SELECT id, username FROM users WHERE username=? LIMIT 1");
            $tstmt->execute([$uname]);
            $applyTarget = $tstmt->fetch();
        } elseif (str_starts_with($targetRaw, '#')) {
            $uid2 = (int)ltrim($targetRaw, '#');
            $tstmt = $pdo->prepare("SELECT id, username FROM users WHERE id=? LIMIT 1");
            $tstmt->execute([$uid2]);
            $applyTarget = $tstmt->fetch();
        } elseif (is_numeric($targetRaw)) {
            $tstmt = $pdo->prepare("SELECT id, username FROM users WHERE id=? LIMIT 1");
            $tstmt->execute([(int)$targetRaw]);
            $applyTarget = $tstmt->fetch();
        } else {
            $tstmt = $pdo->prepare("SELECT id, username FROM users WHERE username=? LIMIT 1");
            $tstmt->execute([$targetRaw]);
            $applyTarget = $tstmt->fetch();
        }
        if (!$applyTarget) err('User not found.');
        $applyUserId = (int)$applyTarget['id'];

        // Load bundle
        $bStmt = $pdo->prepare("SELECT * FROM bundles WHERE id=?");
        $bStmt->execute([$bundleId]);
        $bundle = $bStmt->fetch();
        if (!$bundle) err('Bundle not found.');

        $bundleBadges  = json_decode($bundle['badges']  ?? '[]', true) ?: [];
        $bundleEffects = json_decode($bundle['effects'] ?? '[]', true) ?: [];
        $bundlePremium = (int)$bundle['premium_days'];

        $applied = [];

        // Apply badges
        foreach ($bundleBadges as $badgeId) {
            setBadge($pdo, $applyUserId, $badgeId, true);
            $applied[] = "badge:{$badgeId}";
        }

        // Apply effects — add to purchased_effects in profiles
        if (!empty($bundleEffects)) {
            $pdo->exec("INSERT IGNORE INTO profiles (user_id, purchased_effects) VALUES ({$applyUserId}, '[]')");
            $efStmt = $pdo->prepare("SELECT COALESCE(purchased_effects,'[]') FROM profiles WHERE user_id=?");
            $efStmt->execute([$applyUserId]);
            $owned = json_decode($efStmt->fetchColumn() ?: '[]', true) ?: [];
            foreach ($bundleEffects as $eid) {
                if (!in_array($eid, $owned, true)) { $owned[] = $eid; }
                $applied[] = "effect:{$eid}";
            }
            $pdo->prepare("UPDATE profiles SET purchased_effects=? WHERE user_id=?")
                ->execute([json_encode(array_values($owned)), $applyUserId]);
        }

        // Apply premium
        if ($bundlePremium > 0) {
            $colsPr = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
            if (!in_array('is_premium', $colsPr))         $pdo->exec("ALTER TABLE users ADD COLUMN is_premium TINYINT(1) DEFAULT 0");
            if (!in_array('premium_expires_at', $colsPr)) $pdo->exec("ALTER TABLE users ADD COLUMN premium_expires_at DATETIME DEFAULT NULL");

            // Extend if already premium, else set from now
            $curPrem = $pdo->prepare("SELECT is_premium, premium_expires_at FROM users WHERE id=?");
            $curPrem->execute([$applyUserId]);
            $curPremRow = $curPrem->fetch();
            $base = ($curPremRow && $curPremRow['is_premium'] && !empty($curPremRow['premium_expires_at']))
                ? strtotime($curPremRow['premium_expires_at'])
                : time();
            $until = date('Y-m-d H:i:s', $base + $bundlePremium * 86400);
            $pdo->prepare("UPDATE users SET is_premium=1, premium_expires_at=? WHERE id=?")
                ->execute([$until, $applyUserId]);
            syncDiscordPremiumRole($pdo, $applyUserId, true);
            $applied[] = "premium:{$bundlePremium}d";
        }

        // Notify the user
        pushNotification($pdo, $applyUserId, 'bundle',
            "🎁 You received a bundle: " . $bundle['name'],
            "An owner applied the '{$bundle['name']}' bundle to your account. Check your profile for new rewards!",
            'gift', '/dashboard/badges'
        );

        ok("Bundle '{$bundle['name']}' applied to @{$applyTarget['username']}.", [
            'applied' => $applied,
            'user'    => $applyTarget['username'],
        ]);

    default:
        err('Unknown action');
}