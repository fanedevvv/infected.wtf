<?php
session_start(["cookie_secure"=>true,"cookie_httponly"=>true,"cookie_samesite"=>"Lax"]);
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/helpers.php';
require_once __DIR__ . '/../core/discord_bot_client.php';

header('Content-Type: application/json');

// NOTE: isLoggedIn() is NOT checked globally here.
// get_presence is a public endpoint (visitors can poll it).
// Write actions (connect, toggle, remove) check auth individually.

$userId = (int)($_SESSION['user_id'] ?? 0);
$action = $_POST['action'] ?? $_GET['action'] ?? '';

function ok(string $m = 'OK', array $extra = []): void {
    echo json_encode(array_merge(['success'=>true,'message'=>$m], $extra)); exit;
}
function err(string $m): void {
    echo json_encode(['success'=>false,'error'=>$m]); exit;
}

/**
 * Thin wrappers kept for call-site compatibility — the real implementation
 * now lives in core/discord_bot_client.php (shared with discord_oauth.php
 * and admin_action.php).
 */
function botRequest(string $path): array { return discordBotRequest($path); }
function botPost(string $path, array $body = []): array { return discordBotPost($path, $body); }

// ── Diagnostic: test bot connectivity (GET or POST, no auth needed) ───────────
if ($action === 'test_bot') {
    $botUrl = defined('DISCORD_BOT_URL') ? DISCORD_BOT_URL : '(nedefinit)';
    [$data, $error] = botRequest('/health');
    echo json_encode([
        'bot_url'    => $botUrl,
        'reachable'  => $data !== null,
        'error'      => $error,
        'response'   => $data,
    ]);
    exit;
}

// ── Get live presence (public — called by profile page visitors) ───────────────
if ($action === 'get_presence') {
    $discordId = trim($_POST['discord_id'] ?? '');
    if (!preg_match('/^\d{17,20}$/', $discordId)) err('Invalid Discord ID.');

    [$data, $error] = botRequest("/presence/{$discordId}");
    if (!$data || !$data['success']) {
        echo json_encode(['success'=>true,'data'=>['status'=>'offline','activities'=>[]]]);
        exit;
    }
    ok('OK', ['data' => $data['data']]);
}

// ── Actions below require authentication ──────────────────────────────────────
if (!$userId) err('Neautentificat.');

// ── Connect Discord ───────────────────────────────────────────────────────────
if ($action === 'connect_discord') {
    $discordId = trim($_POST['discord_id'] ?? '');
    if (!preg_match('/^\d{17,20}$/', $discordId)) err('Invalid Discord ID.');

    // Check if already taken by another user
    $taken = $pdo->prepare("SELECT user_id FROM integrations WHERE type='discord' AND discord_user_id=? AND user_id != ?");
    $taken->execute([$discordId, $userId]);
    if ($taken->fetch()) err('This Discord account is already linked to another profile.');

    // Ask bot to check guild membership + fetch user data
    [$data, $curlError] = botRequest("/member/{$discordId}");

    if (!$data) {
        err('Could not reach the Discord bot. Please try again. (' . ($curlError ?? 'no response') . ')');
    }
    if (!$data['success'] || empty($data['in_guild'])) {
        err('You must join our Discord server first, then try again.');
    }

    $user        = $data['data'];
    $discordUser = $user['id'];
    $username    = $user['username']    ?? 'Unknown';
    $globalName  = $user['global_name'] ?? $username;
    $avatar      = $user['avatar']      ?? null;

    // Upsert integration
    $exists = $pdo->prepare("SELECT id FROM integrations WHERE user_id=? AND type='discord'");
    $exists->execute([$userId]);
    $row = $exists->fetch();

    if ($row) {
        $pdo->prepare("UPDATE integrations SET discord_user_id=?,discord_username=?,discord_avatar=?,discord_global_name=?,visible=1,updated_at=NOW() WHERE id=?")
            ->execute([$discordUser, $username, $avatar, $globalName, (int)$row['id']]);
    } else {
        $pdo->prepare("INSERT INTO integrations (user_id,type,discord_user_id,discord_username,discord_avatar,discord_global_name,visible,created_at,updated_at) VALUES (?,?,?,?,?,?,1,NOW(),NOW())")
            ->execute([$userId, 'discord', $discordUser, $username, $avatar, $globalName]);
    }

    // ── Grant the "cont infected" role — always, as soon as Discord is linked ──
    syncDiscordInfectedRole($discordUser, true);

    // ── Auto-assign premium role if user has active premium ──────────────────
    $premiumRow = $pdo->prepare("SELECT is_premium, premium_expires_at FROM users WHERE id=?");
    $premiumRow->execute([$userId]);
    $premiumData = $premiumRow->fetch();

    $hasPremium = $premiumData
        && $premiumData['is_premium'] == 1
        && (is_null($premiumData['premium_expires_at']) || strtotime($premiumData['premium_expires_at']) > time());

    if ($hasPremium) {
        botPost('/assign-premium-role', ['discord_id' => $discordUser]);
    }

    // ── Grant badge Discord automat ───────────────────────────────────────────
    setBadge($pdo, $userId, 'discord', true);

    // ── Daca userul are badge-ul verified, acorda gradul pe server ────────────
    $verifiedBadges = getUserBadges($pdo, $userId, false);
    $hasVerified = false;
    foreach ($verifiedBadges as $_vb) {
        if ($_vb['id'] === 'verified') { $hasVerified = true; break; }
    }
    if ($hasVerified) {
        botPost('/assign-verified-role', ['discord_id' => $discordUser]);
    }

    ok('Discord connected!');
}

// ── Toggle visibility ─────────────────────────────────────────────────────────
if ($action === 'toggle_visibility') {
    $id = (int)($_POST['id'] ?? 0);
    $stmt = $pdo->prepare("SELECT visible FROM integrations WHERE id=? AND user_id=?");
    $stmt->execute([$id, $userId]);
    $row = $stmt->fetch();
    if (!$row) err('Integration not found.');
    $newVal = $row['visible'] ? 0 : 1;
    $pdo->prepare("UPDATE integrations SET visible=? WHERE id=? AND user_id=?")->execute([$newVal, $id, $userId]);
    ok($newVal ? 'Integration visible on profile.' : 'Integration hidden from profile.');
}

// ── Remove integration ────────────────────────────────────────────────────────
if ($action === 'remove_integration') {
    $id = (int)($_POST['id'] ?? 0);

    // Fetch full row before deleting so we can check server data + remove premium role
    $intRow = $pdo->prepare("SELECT discord_user_id, discord_server_invite FROM integrations WHERE id=? AND user_id=? AND type='discord'");
    $intRow->execute([$id, $userId]);
    $intData = $intRow->fetch();

    // If server data exists on the same row, only clear Discord user fields (don't delete the row)
    if (!empty($intData['discord_server_invite'])) {
        $pdo->prepare("UPDATE integrations SET
            discord_user_id=NULL, discord_username=NULL, discord_avatar=NULL,
            discord_global_name=NULL, visible=1, updated_at=NOW()
            WHERE id=? AND user_id=?")
            ->execute([$id, $userId]);
    } else {
        $pdo->prepare("DELETE FROM integrations WHERE id=? AND user_id=?")->execute([$id, $userId]);
    }

    // Remove premium/verified/infected roles from Discord when integration is unlinked
    if (!empty($intData['discord_user_id'])) {
        botPost('/remove-premium-role', ['discord_id' => $intData['discord_user_id']]);
        botPost('/remove-verified-role', ['discord_id' => $intData['discord_user_id']]);
        syncDiscordInfectedRole($intData['discord_user_id'], false);
    }

    // ── Revoca badge Discord automat ──────────────────────────────────────────
    setBadge($pdo, $userId, 'discord', false);

    ok('Integration removed.');
}

// ── Sync premium role (call after admin changes premium status) ───────────────
// POST api/integrations.php  action=sync_premium_role  (auth required)
if ($action === 'sync_premium_role') {
    $intRow = $pdo->prepare("SELECT discord_user_id FROM integrations WHERE user_id=? AND type='discord'");
    $intRow->execute([$userId]);
    $intData = $intRow->fetch();

    if (!$intData || empty($intData['discord_user_id'])) {
        ok('No Discord linked — nothing to sync.');
    }

    $discordId = $intData['discord_user_id'];

    $premiumRow = $pdo->prepare("SELECT is_premium, premium_expires_at FROM users WHERE id=?");
    $premiumRow->execute([$userId]);
    $premiumData = $premiumRow->fetch();

    $hasPremium = $premiumData
        && $premiumData['is_premium'] == 1
        && (is_null($premiumData['premium_expires_at']) || strtotime($premiumData['premium_expires_at']) > time());

    [$result, $botErr] = $hasPremium
        ? botPost('/assign-premium-role', ['discord_id' => $discordId])
        : botPost('/remove-premium-role', ['discord_id' => $discordId]);

    if ($result && $result['success']) {
        ok($result['message'] ?? 'Role synced.');
    } else {
        err($result['error'] ?? $botErr ?? 'Bot unreachable.');
    }
}

// ── Connect / refresh Discord Server ─────────────────────────────────────────
if ($action === 'connect_discord_server') {
    $invite = trim($_POST['invite'] ?? '');
    if (!preg_match('#^https?://discord\.gg/[a-zA-Z0-9\-]+$#', $invite)) {
        err('Invalid Discord invite link. Use the format: https://discord.gg/your-code');
    }

    // Extract invite code
    preg_match('#discord\.gg/([a-zA-Z0-9\-]+)$#', $invite, $m);
    $code = $m[1];

    // Fetch guild info from Discord Widget API (public, no bot token needed)
    $widgetUrl = "https://discord.com/api/v10/guilds/{$code}/widget.json";
    $ch = curl_init("https://discord.com/api/v10/invites/{$code}?with_counts=true&with_expiration=true");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_HTTPHEADER     => ['User-Agent: BioLink/1.0'],
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $res  = curl_exec($ch);
    $code_http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if (!$res || $code_http !== 200) {
        err('Could not fetch server info. Make sure the invite link is valid and not expired.');
    }

    $data = json_decode($res, true);
    $guild = $data['guild'] ?? null;
    if (!$guild || empty($guild['id'])) {
        err('Could not retrieve server data from Discord.');
    }

    $serverId     = $guild['id'];
    $serverName   = $guild['name']   ?? 'Unknown';
    $serverIcon   = $guild['icon']   ?? null;
    $totalMembers = (int)($data['approximate_member_count'] ?? 0);
    $onlineCount  = (int)($data['approximate_presence_count'] ?? 0);

    // Upsert: one discord server per user
    $exists = $pdo->prepare("SELECT id FROM integrations WHERE user_id=? AND type='discord' LIMIT 1");
    $exists->execute([$userId]);
    $row = $exists->fetch();

    if ($row) {
        $pdo->prepare("UPDATE integrations SET
            discord_server_invite=?, discord_server_id=?, discord_server_name=?,
            discord_server_icon=?, discord_server_online=?, discord_server_total=?,
            discord_server_visible=1, discord_server_updated=NOW(), updated_at=NOW()
            WHERE id=?")
            ->execute([$invite, $serverId, $serverName, $serverIcon, $onlineCount, $totalMembers, (int)$row['id']]);
    } else {
        // No discord user integration yet — create a row with only server data
        $pdo->prepare("INSERT INTO integrations
            (user_id, type, discord_server_invite, discord_server_id, discord_server_name,
             discord_server_icon, discord_server_online, discord_server_total,
             discord_server_visible, discord_server_updated, visible, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,1,NOW(),1,NOW(),NOW())")
            ->execute([$userId, 'discord', $invite, $serverId, $serverName, $serverIcon, $onlineCount, $totalMembers]);
    }

    ok('Discord server connected!', [
        'server_name'   => $serverName,
        'server_icon'   => $serverIcon,
        'server_id'     => $serverId,
        'online'        => $onlineCount,
        'total'         => $totalMembers,
    ]);
}

// ── Toggle Discord Server visibility ──────────────────────────────────────────
if ($action === 'toggle_server_visibility') {
    $id = (int)($_POST['id'] ?? 0);
    $stmt = $pdo->prepare("SELECT discord_server_visible FROM integrations WHERE id=? AND user_id=?");
    $stmt->execute([$id, $userId]);
    $row = $stmt->fetch();
    if (!$row) err('Integration not found.');
    $newVal = $row['discord_server_visible'] ? 0 : 1;
    $pdo->prepare("UPDATE integrations SET discord_server_visible=? WHERE id=? AND user_id=?")
        ->execute([$newVal, $id, $userId]);
    ok($newVal ? 'Discord server visible on profile.' : 'Discord server hidden from profile.');
}

// ── Remove Discord Server ──────────────────────────────────────────────────────
if ($action === 'remove_discord_server') {
    $id = (int)($_POST['id'] ?? 0);
    $stmt = $pdo->prepare("SELECT id FROM integrations WHERE id=? AND user_id=?");
    $stmt->execute([$id, $userId]);
    if (!$stmt->fetch()) err('Integration not found.');

    // Clear only server fields (keep discord user integration if exists)
    $check = $pdo->prepare("SELECT discord_user_id FROM integrations WHERE id=? AND user_id=?");
    $check->execute([$id, $userId]);
    $intRow = $check->fetch();

    if (!empty($intRow['discord_user_id'])) {
        // Row also has a discord user — just clear server fields
        $pdo->prepare("UPDATE integrations SET
            discord_server_invite=NULL, discord_server_id=NULL, discord_server_name=NULL,
            discord_server_icon=NULL, discord_server_online=NULL, discord_server_total=NULL,
            discord_server_visible=1, discord_server_updated=NULL, updated_at=NOW()
            WHERE id=? AND user_id=?")
            ->execute([$id, $userId]);
    } else {
        // Row is server-only — delete the whole row
        $pdo->prepare("DELETE FROM integrations WHERE id=? AND user_id=?")->execute([$id, $userId]);
    }
    ok('Discord server removed.');
}

// ── Refresh Discord Server stats ──────────────────────────────────────────────
if ($action === 'refresh_discord_server') {
    $id = (int)($_POST['id'] ?? 0);
    $stmt = $pdo->prepare("SELECT discord_server_invite FROM integrations WHERE id=? AND user_id=?");
    $stmt->execute([$id, $userId]);
    $row = $stmt->fetch();
    if (!$row || empty($row['discord_server_invite'])) err('No server linked.');

    preg_match('#discord\.gg/([a-zA-Z0-9\-]+)$#', $row['discord_server_invite'], $m);
    $code = $m[1] ?? '';
    if (!$code) err('Invalid invite stored.');

    $ch = curl_init("https://discord.com/api/v10/invites/{$code}?with_counts=true");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_HTTPHEADER     => ['User-Agent: BioLink/1.0'],
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $res = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if (!$res || $http !== 200) err('Could not reach Discord API.');
    $data  = json_decode($res, true);
    $total  = (int)($data['approximate_member_count']  ?? 0);
    $online = (int)($data['approximate_presence_count'] ?? 0);

    $pdo->prepare("UPDATE integrations SET discord_server_online=?, discord_server_total=?, discord_server_updated=NOW() WHERE id=? AND user_id=?")
        ->execute([$online, $total, $id, $userId]);

    ok('Refreshed.', ['online' => $online, 'total' => $total]);
}

err('Unknown action.');