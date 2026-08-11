<?php
// ── api/discord_oauth.php ───────────────────────────────────────────────────
// "Login with Discord" — links the logged-in site account to a Discord
// account via OAuth2 (replaces the old manual "paste your Discord ID" flow).
//
//   GET ?action=start     — redirects the user to Discord's consent screen
//   GET ?action=callback  — exchanges the code, verifies guild membership via
//                           the bot, upserts the integration and redirects
//                           back to the dashboard.
// ─────────────────────────────────────────────────────────────────────────────
define('ROOT', dirname(__DIR__));
session_start(["cookie_secure"=>true,"cookie_httponly"=>true,"cookie_samesite"=>"Lax"]);

require_once ROOT . '/config/config.php';
require_once ROOT . '/core/database.php';
require_once ROOT . '/core/auth.php';
require_once ROOT . '/core/helpers.php';
require_once ROOT . '/core/discord_bot_client.php';

requireLogin();
checkBanned($pdo);

$userId = (int)$_SESSION['user_id'];
$action = $_GET['action'] ?? 'start';

function backToIntegrations(string $status, string $message = ''): void {
    $qs = 'discord=' . urlencode($status) . ($message ? '&discord_msg=' . urlencode($message) : '');
    header('Location: /dashboard?page=integrations&' . $qs);
    exit;
}

// ── Step 1: redirect to Discord's OAuth2 consent screen ───────────────────────
if ($action === 'start') {
    $state = bin2hex(random_bytes(24));
    $_SESSION['discord_oauth_state'] = $state;

    $params = http_build_query([
        'client_id'     => DISCORD_CLIENT_ID,
        'redirect_uri'  => DISCORD_REDIRECT_URI,
        'response_type' => 'code',
        'scope'         => 'identify',
        'state'         => $state,
        'prompt'        => 'consent',
    ]);

    header('Location: https://discord.com/oauth2/authorize?' . $params);
    exit;
}

// ── Step 2: Discord redirects back here with ?code=&state= ────────────────────
if ($action === 'callback') {
    $code  = $_GET['code']  ?? '';
    $state = $_GET['state'] ?? '';

    if (!empty($_GET['error'])) {
        backToIntegrations('error', 'Discord authorization was cancelled.');
    }

    $expectedState = $_SESSION['discord_oauth_state'] ?? '';
    unset($_SESSION['discord_oauth_state']);
    if (!$code || !$state || !$expectedState || !hash_equals($expectedState, $state)) {
        backToIntegrations('error', 'Invalid or expired login attempt. Please try again.');
    }

    // Exchange the authorization code for an access token
    $ch = curl_init('https://discord.com/api/v10/oauth2/token');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query([
            'client_id'     => DISCORD_CLIENT_ID,
            'client_secret' => DISCORD_CLIENT_SECRET,
            'grant_type'    => 'authorization_code',
            'code'          => $code,
            'redirect_uri'  => DISCORD_REDIRECT_URI,
        ]),
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
    ]);
    $tokenRes  = curl_exec($ch);
    $tokenHttp = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $tokenData = json_decode((string)$tokenRes, true);
    if ($tokenHttp !== 200 || empty($tokenData['access_token'])) {
        backToIntegrations('error', 'Could not authenticate with Discord. Please try again.');
    }

    // Fetch the Discord identity
    $ch = curl_init('https://discord.com/api/v10/users/@me');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $tokenData['access_token']],
    ]);
    $meRes  = curl_exec($ch);
    $meHttp = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $me = json_decode((string)$meRes, true);
    if ($meHttp !== 200 || empty($me['id'])) {
        backToIntegrations('error', 'Could not fetch your Discord profile. Please try again.');
    }

    $discordId  = $me['id'];
    $username   = $me['username']    ?? 'Unknown';
    $globalName = $me['global_name'] ?? $username;
    $avatar     = $me['avatar']      ?? null;

    // Must already be a member of the guild — verified through the bot, same as before
    [$memberData, $botErr] = discordBotRequest("/member/{$discordId}");
    if (!$memberData || !$memberData['success'] || empty($memberData['in_guild'])) {
        backToIntegrations('error', 'You must join our Discord server first, then try connecting again.');
    }

    // This Discord account already linked to someone else?
    $taken = $pdo->prepare("SELECT user_id FROM integrations WHERE type='discord' AND discord_user_id=? AND user_id != ?");
    $taken->execute([$discordId, $userId]);
    if ($taken->fetch()) {
        backToIntegrations('error', 'This Discord account is already linked to another profile.');
    }

    // Upsert integration row (mirrors api/integrations.php::connect_discord)
    $exists = $pdo->prepare("SELECT id FROM integrations WHERE user_id=? AND type='discord'");
    $exists->execute([$userId]);
    $row = $exists->fetch();

    if ($row) {
        $pdo->prepare("UPDATE integrations SET discord_user_id=?,discord_username=?,discord_avatar=?,discord_global_name=?,visible=1,updated_at=NOW() WHERE id=?")
            ->execute([$discordId, $username, $avatar, $globalName, (int)$row['id']]);
    } else {
        $pdo->prepare("INSERT INTO integrations (user_id,type,discord_user_id,discord_username,discord_avatar,discord_global_name,visible,created_at,updated_at) VALUES (?,?,?,?,?,?,1,NOW(),NOW())")
            ->execute([$userId, 'discord', $discordId, $username, $avatar, $globalName]);
    }

    // Grant the "cont infected" role — this is the whole point of linking via OAuth
    syncDiscordInfectedRole($discordId, true);

    // Grant the Discord badge on the profile
    setBadge($pdo, $userId, 'discord', true);

    // Sync premium role if the account currently has active premium
    $premiumRow = $pdo->prepare("SELECT is_premium, premium_expires_at FROM users WHERE id=?");
    $premiumRow->execute([$userId]);
    $premiumData = $premiumRow->fetch();
    $hasPremium = $premiumData
        && $premiumData['is_premium'] == 1
        && (is_null($premiumData['premium_expires_at']) || strtotime($premiumData['premium_expires_at']) > time());
    if ($hasPremium) {
        discordBotPost('/assign-premium-role', ['discord_id' => $discordId]);
    }

    // Sync verified role if the account currently has the "verified" badge
    $hasVerified = false;
    foreach (getUserBadges($pdo, $userId, false) as $badge) {
        if ($badge['id'] === 'verified') { $hasVerified = true; break; }
    }
    if ($hasVerified) {
        discordBotPost('/assign-verified-role', ['discord_id' => $discordId]);
    }

    backToIntegrations('connected');
}

backToIntegrations('error', 'Unknown action.');
