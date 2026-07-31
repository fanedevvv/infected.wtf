<?php
session_start(["cookie_secure"=>true,"cookie_httponly"=>true,"cookie_samesite"=>"Lax"]);
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/helpers.php';

header('Content-Type: application/json');

function ok(string $m = 'OK', array $extra = []): void {
    echo json_encode(array_merge(['success' => true, 'message' => $m], $extra));
    exit;
}
function err(string $m, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $m]);
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
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_CONNECTTIMEOUT => 5,
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

if (!isLoggedIn()) err('Not authenticated.', 401);

$userId = (int)$_SESSION['user_id'];

// Ban check
$banCheck = $pdo->prepare("SELECT banned FROM users WHERE id=?");
$banCheck->execute([$userId]);
$banRow = $banCheck->fetch();
if (!$banRow || (int)$banRow['banned'] === 1) {
    session_destroy();
    err('Your account has been suspended.', 403);
}

// Load sender profile (needed for gift notifications)
$profileStmt = $pdo->prepare("SELECT u.username, COALESCE(p.display_name,'') AS display_name FROM users u LEFT JOIN profiles p ON p.user_id=u.id WHERE u.id=?");
$profileStmt->execute([$userId]);
$profile = $profileStmt->fetch(PDO::FETCH_ASSOC) ?: ['username' => 'Someone', 'display_name' => ''];

// Read JSON body (the front-end posts JSON)
$raw   = file_get_contents('php://input');
$input = json_decode($raw, true) ?: [];
$action = $input['action'] ?? ($_POST['action'] ?? '');

// Shop catalog (must match shop.php view)
$shopItems = [
    'fresh'      => ['name' => 'Fresh',      'price' => 50,   'badge_id' => 'fresh'],
    'lover'      => ['name' => 'Lover',      'price' => 300,  'badge_id' => 'lover'],
    'known'      => ['name' => 'Known',      'price' => 250,  'badge_id' => 'known'],
    'rich'       => ['name' => 'Rich',       'price' => 500,  'badge_id' => 'rich'],
    'trapstar'   => ['name' => 'Trapstar',   'price' => 1000, 'badge_id' => 'trapstar'],
    'the_killer' => ['name' => 'The Killer', 'price' => 1500, 'badge_id' => 'the_killer'],
];

// Effects catalog — keyed by effect_id
$effectItems = [
    // Cursor effects
    'cursor_smoke'      => ['name' => 'Smoke Trail',      'price' => 200,  'type' => 'cursor'],
    'cursor_fire'       => ['name' => 'Fire Trail',        'price' => 300,  'type' => 'cursor'],
    'cursor_soundwave'  => ['name' => 'Sound Wave',        'price' => 400,  'type' => 'cursor'],
    'cursor_meteors'    => ['name' => 'Meteors',           'price' => 500,  'type' => 'cursor'],
    'cursor_leaves'     => ['name' => 'Aesthetic Leaves',  'price' => 600,  'type' => 'cursor'],
    'cursor_water'      => ['name' => 'Water Trail 3D',    'price' => 800,  'type' => 'cursor'],
    'cursor_shadow'     => ['name' => 'Soul Trail',       'price' => 1000, 'type' => 'cursor'],
    // Avatar effects
    'avatar_rocks'      => ['name' => 'Rock Ring',         'price' => 100,  'type' => 'avatar'],
    'avatar_crown'      => ['name' => 'Crown 3D',          'price' => 350,  'type' => 'avatar'],
    'avatar_bloodrain'  => ['name' => 'Blood Rain',        'price' => 550,  'type' => 'avatar'],
    'avatar_darkeyes'   => ['name' => 'Dark Eyes',         'price' => 900,  'type' => 'avatar'],
    // Background effects
    'bg_fallingleaves'  => ['name' => 'Falling Leaves',    'price' => 150,  'type' => 'bg'],
    'bg_underwater'     => ['name' => 'Underwater',        'price' => 250,  'type' => 'bg'],
    'bg_gas'            => ['name' => 'Gas Effect',        'price' => 300,  'type' => 'bg'],
    'bg_fireworks'      => ['name' => 'Fireworks',         'price' => 400,  'type' => 'bg'],
    'bg_hell'           => ['name' => 'Hell Background',   'price' => 500,  'type' => 'bg'],
    'bg_shadowworld'    => ['name' => 'Shadow World',      'price' => 1000, 'type' => 'bg'],
];

// ── Buy Effect ─────────────────────────────────────────
if ($action === 'buy_effect') {
    $effectId = (string)($input['effect_id'] ?? $_POST['effect_id'] ?? '');
    if (!isset($effectItems[$effectId])) err('Invalid effect.');

    $effect = $effectItems[$effectId];
    $price  = (int)$effect['price'];

    try {
        $pdo->beginTransaction();

        $s = $pdo->prepare("SELECT tokens FROM users WHERE id=? FOR UPDATE");
        $s->execute([$userId]);
        $tokens = (int)($s->fetchColumn() ?? 0);

        $s2 = $pdo->prepare("SELECT COALESCE(purchased_effects,'[]') FROM profiles WHERE user_id=? FOR UPDATE");
        $s2->execute([$userId]);
        $owned = json_decode($s2->fetchColumn() ?: '[]', true) ?: [];

        if (in_array($effectId, $owned, true)) { $pdo->rollBack(); err('Already owned.'); }
        if ($tokens < $price)                  { $pdo->rollBack(); err('Not enough tokens.'); }

        $pdo->prepare("UPDATE users SET tokens=tokens-?, tokens_spent=COALESCE(tokens_spent,0)+? WHERE id=?")
            ->execute([$price, $price, $userId]);

        $owned[] = $effectId;
        $pdo->prepare("UPDATE profiles SET purchased_effects=? WHERE user_id=?")
            ->execute([json_encode(array_values($owned)), $userId]);

        $pdo->commit();
        ok('Effect purchased!', ['tokens' => $tokens - $price, 'effect_id' => $effectId]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        err('Server error.', 500);
    }
}

// ── Buy action ─────────────────────────────────────────
if ($action === 'buy') {
    $itemId = (string)($input['item_id'] ?? $_POST['item_id'] ?? '');

    if (!isset($shopItems[$itemId])) err('Invalid item.');

    $item     = $shopItems[$itemId];
    $badgeId  = $item['badge_id'];
    $price    = (int)$item['price'];

    try {
        $pdo->beginTransaction();

        // Lock the user row to avoid race conditions on tokens
        $s = $pdo->prepare("SELECT tokens FROM users WHERE id=? FOR UPDATE");
        $s->execute([$userId]);
        $tokens = (int)($s->fetchColumn() ?? 0);

        // Get current owned badges (also lock the profile row)
        $s2 = $pdo->prepare("SELECT COALESCE(badges, '[]') FROM profiles WHERE user_id=? FOR UPDATE");
        $s2->execute([$userId]);
        $owned = json_decode($s2->fetchColumn() ?: '[]', true) ?: [];

        if (in_array($badgeId, $owned, true)) {
            $pdo->rollBack();
            err('You already own this badge.');
        }
        if ($tokens < $price) {
            $pdo->rollBack();
            err('Not enough tokens.');
        }

        // Deduct tokens and track spent
        $pdo->prepare("UPDATE users SET tokens = tokens - ?, tokens_spent = COALESCE(tokens_spent,0) + ? WHERE id = ?")
            ->execute([$price, $price, $userId]);

        // Add badge
        $owned[] = $badgeId;
        $pdo->prepare("UPDATE profiles SET badges = ? WHERE user_id = ?")
            ->execute([json_encode(array_values($owned)), $userId]);

        $pdo->commit();

        $newBalance = $tokens - $price;
        ok('Badge purchased successfully!', [
            'tokens'   => $newBalance,
            'badge_id' => $badgeId,
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        err('Server error. Please try again.', 500);
    }
}

// ── Gift Effect ────────────────────────────────────────
if ($action === 'gift_effect') {
    $effectId = (string)($input['effect_id'] ?? '');
    $targetId = (int)($input['target_id'] ?? 0);

    if (!isset($effectItems[$effectId])) err('Invalid effect.');
    if ($targetId <= 0 || $targetId === $userId) err('Invalid recipient.');

    $effect = $effectItems[$effectId];
    $price  = (int)$effect['price'];

    // Check recipient exists and is not banned
    $tr = $pdo->prepare("SELECT id, username, banned FROM users WHERE id=?");
    $tr->execute([$targetId]);
    $target = $tr->fetch();
    if (!$target) err('User not found.');
    if ($target['banned']) err('Cannot gift to a banned user.');

    // Pre-check: already owns?
    $preCheck = $pdo->prepare("SELECT COALESCE(purchased_effects,'[]') FROM profiles WHERE user_id=?");
    $preCheck->execute([$targetId]);
    $preOwned = json_decode($preCheck->fetchColumn() ?: '[]', true) ?: [];
    if (in_array($effectId, $preOwned, true)) {
        err("@{$target['username']} already owns the {$effect['name']} effect.");
    }

    try {
        $pdo->beginTransaction();

        $s = $pdo->prepare("SELECT tokens FROM users WHERE id=? FOR UPDATE");
        $s->execute([$userId]);
        $myTokens = (int)($s->fetchColumn() ?? 0);

        if ($myTokens < $price) { $pdo->rollBack(); err('Not enough tokens.'); }

        $s2 = $pdo->prepare("SELECT COALESCE(purchased_effects,'[]') FROM profiles WHERE user_id=? FOR UPDATE");
        $s2->execute([$targetId]);
        $targetOwned = json_decode($s2->fetchColumn() ?: '[]', true) ?: [];

        if (in_array($effectId, $targetOwned, true)) { $pdo->rollBack(); err("@{$target['username']} already owns this effect."); }

        $pdo->prepare("UPDATE users SET tokens=tokens-?, tokens_spent=COALESCE(tokens_spent,0)+? WHERE id=?")->execute([$price, $price, $userId]);

        $targetOwned[] = $effectId;
        $pdo->prepare("UPDATE profiles SET purchased_effects=? WHERE user_id=?")->execute([json_encode(array_values($targetOwned)), $targetId]);

        $pdo->commit();

        $senderName = $profile['display_name'] ?: $profile['username'] ?? 'Someone';
        pushNotification($pdo, $targetId, 'gift',
            "You received a gift! 🎁",
            "@{$senderName} gifted you the {$effect['name']} effect.",
            'gift', '/dashboard/effects'
        );

        ok("Effect gifted to @{$target['username']} successfully!", [
            'tokens' => $myTokens - $price,
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        err('Server error. Please try again.', 500);
    }
}


if ($action === 'gift') {
    // Gift is available for all users (no premium required)
    $itemId   = (string)($input['item_id'] ?? '');
    $targetId = (int)($input['target_id'] ?? 0);

    if (!isset($shopItems[$itemId])) err('Invalid item.');
    if ($targetId <= 0 || $targetId === $userId) err('Invalid recipient.');

    $item    = $shopItems[$itemId];
    $badgeId = $item['badge_id'];
    $price   = (int)$item['price'];

    // Check recipient exists and is not banned
    $tr = $pdo->prepare("SELECT id, username, banned FROM users WHERE id=?");
    $tr->execute([$targetId]);
    $target = $tr->fetch();
    if (!$target) err('User not found.');
    if ($target['banned']) err('Cannot gift to a banned user.');

    // Pre-check: does recipient already own this badge? (friendly message, no token deduction)
    $preCheck = $pdo->prepare("SELECT COALESCE(badges,'[]') FROM profiles WHERE user_id=?");
    $preCheck->execute([$targetId]);
    $preOwned = json_decode($preCheck->fetchColumn() ?: '[]', true) ?: [];
    if (in_array($badgeId, $preOwned, true)) {
        err("@{$target['username']} already owns the {$item['name']} badge.");
    }

    try {
        $pdo->beginTransaction();

        // Lock sender tokens
        $s = $pdo->prepare("SELECT tokens FROM users WHERE id=? FOR UPDATE");
        $s->execute([$userId]);
        $myTokens = (int)($s->fetchColumn() ?? 0);

        if ($myTokens < $price) {
            $pdo->rollBack();
            err('Not enough tokens.');
        }

        // Check recipient doesn't already own badge (double-check inside transaction)
        $s2 = $pdo->prepare("SELECT COALESCE(badges,'[]') FROM profiles WHERE user_id=? FOR UPDATE");
        $s2->execute([$targetId]);
        $targetOwned = json_decode($s2->fetchColumn() ?: '[]', true) ?: [];
        if (in_array($badgeId, $targetOwned, true)) {
            $pdo->rollBack();
            err("@{$target['username']} already owns the {$item['name']} badge.");
        }

        // Deduct tokens from sender and track spent
        $pdo->prepare("UPDATE users SET tokens = tokens - ?, tokens_spent = COALESCE(tokens_spent,0) + ? WHERE id=?")->execute([$price, $price, $userId]);

        // Add badge to recipient
        $targetOwned[] = $badgeId;
        $pdo->prepare("UPDATE profiles SET badges=? WHERE user_id=?")->execute([json_encode(array_values($targetOwned)), $targetId]);

        $pdo->commit();

        // ── Notify recipient ──────────────────────────────────────────────
        $senderName = $profile['display_name'] ?: $profile['username'] ?? 'Someone';
        pushNotification($pdo, $targetId, 'gift',
            "You received a gift! 🎁",
            "@{$senderName} gifted you the {$item['name']} badge.",
            'gift', '/dashboard/badges'
        );

        $newBalance = $myTokens - $price;
        ok("Badge gifted to @{$target['username']} successfully!", [
            'tokens' => $newBalance,
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        err('Server error. Please try again.', 500);
    }
}

// ── Search users action ────────────────────────────────
if ($action === 'search_users') {
    $q = trim($input['q'] ?? '');
    if (strlen($q) < 2) ok('OK', ['users' => []]);

    $s = $pdo->prepare("
        SELECT u.id, u.username, COALESCE(p.avatar,'') AS avatar
        FROM users u
        LEFT JOIN profiles p ON p.user_id = u.id
        WHERE u.username LIKE ? AND u.id != ? AND u.banned = 0
        ORDER BY u.username ASC
        LIMIT 8
    ");
    $s->execute(['%' . $q . '%', $userId]);
    $users = $s->fetchAll(PDO::FETCH_ASSOC);

    // Prepend slash to avatar path
    foreach ($users as &$u) {
        $u['avatar'] = $u['avatar'] ? '/' . $u['avatar'] : '/assets/img/default-avatar.png';
    }

    ok('OK', ['users' => $users]);
}

// ── Buy Premium action ────────────────────────────────
if ($action === 'buy_premium') {
    // This endpoint is called after a successful real-money payment (Stripe/PayPal webhook).
    // For now it also supports a direct activation (admin or payment callback).
    $secret = $input['secret'] ?? '';
    // Simple shared secret validation — replace with proper payment webhook verification
    if ($secret !== (defined('PREMIUM_SECRET') ? PREMIUM_SECRET : 'changeme_premium_secret')) {
        err('Invalid payment token.', 403);
    }
    $targetId = (int)($input['user_id'] ?? $userId);
    $days = max(1, (int)($input['days'] ?? 30));
    try {
        $pdo->prepare("UPDATE users SET is_premium=1, premium_expires_at=DATE_ADD(NOW(), INTERVAL ? DAY) WHERE id=?")->execute([$days, $targetId]);
        // ── Sync rol Discord ──────────────────────────────────
        syncDiscordPremiumRole($pdo, $targetId, true);
        // ─────────────────────────────────────────────────────
        ok('Premium activated!', ['expires_in_days' => $days]);
    } catch(Throwable $e) {
        err('Server error.', 500);
    }
}

// ── Activate Premium with tokens (1 day = 100 tokens) ─
if ($action === 'buy_premium_tokens') {
    $days = max(1, (int)($input['days'] ?? 30));
    $cost = $days * 100; // 100 tokens per day

    try {
        $pdo->beginTransaction();
        $s = $pdo->prepare("SELECT tokens FROM users WHERE id=? FOR UPDATE");
        $s->execute([$userId]);
        $myTokens = (int)($s->fetchColumn() ?? 0);
        if ($myTokens < $cost) {
            $pdo->rollBack();
            err("Not enough tokens. You need {$cost} tokens for {$days} day(s). You have {$myTokens}.");
        }
        $pdo->prepare("UPDATE users SET tokens=tokens-?, tokens_spent=COALESCE(tokens_spent,0)+?, is_premium=1, premium_expires_at=DATE_ADD(COALESCE(premium_expires_at, NOW()), INTERVAL ? DAY) WHERE id=?")->execute([$cost, $cost, $days, $userId]);
        $pdo->commit();
        // ── Sync rol Discord ──────────────────────────────────
        syncDiscordPremiumRole($pdo, $userId, true);
        // ─────────────────────────────────────────────────────
        ok("Premium activated for {$days} day(s)!", ['tokens' => $myTokens - $cost, 'days' => $days]);
    } catch(Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        err('Server error.', 500);
    }
}

// ── Gift Premium with tokens (Premium-only) ───────────────────────
if ($action === 'gift_premium_tokens') {
    // Only premium users can gift premium with tokens
    $premCheck = $pdo->prepare("SELECT is_premium, premium_expires_at FROM users WHERE id=?");
    $premCheck->execute([$userId]);
    $premRow = $premCheck->fetch();
    $isPremium = $premRow && (int)$premRow['is_premium'] === 1 && ($premRow['premium_expires_at'] === null || strtotime($premRow['premium_expires_at']) > time());
    if (!$isPremium) err('Gifting Premium with tokens requires an active Premium subscription.');

    $targetId = (int)($input['target_id'] ?? 0);
    $days     = max(1, (int)($input['days'] ?? 30));
    $cost     = $days * 100; // 100 tokens per day

    if ($targetId <= 0 || $targetId === $userId) err('Invalid recipient.');

    // Check recipient exists and is not banned
    $tr = $pdo->prepare("SELECT id, username, banned FROM users WHERE id=?");
    $tr->execute([$targetId]);
    $target = $tr->fetch();
    if (!$target) err('User not found.');
    if ($target['banned']) err('Cannot gift to a banned user.');

    try {
        $pdo->beginTransaction();

        // Lock sender tokens
        $s = $pdo->prepare("SELECT tokens FROM users WHERE id=? FOR UPDATE");
        $s->execute([$userId]);
        $myTokens = (int)($s->fetchColumn() ?? 0);

        if ($myTokens < $cost) {
            $pdo->rollBack();
            err("Not enough tokens. You need {$cost} tokens for {$days} day(s). You have {$myTokens}.");
        }

        // Deduct tokens from sender
        $pdo->prepare("UPDATE users SET tokens = tokens - ? WHERE id=?")->execute([$cost, $userId]);

        // Add premium days to recipient (extend if already premium)
        $pdo->prepare("UPDATE users SET is_premium=1, premium_expires_at=DATE_ADD(COALESCE(premium_expires_at, NOW()), INTERVAL ? DAY) WHERE id=?")->execute([$days, $targetId]);

        $pdo->commit();
        // ── Sync rol Discord pentru destinatar ────────────────
        syncDiscordPremiumRole($pdo, $targetId, true);
        // ─────────────────────────────────────────────────────

        $newBalance = $myTokens - $cost;
        // ── Notify recipient ──────────────────────────────────────────────
        $senderNameP = $profile['display_name'] ?: $profile['username'] ?? 'Someone';
        pushNotification($pdo, $targetId, 'gift',
            "You received Premium! ⭐",
            "@{$senderNameP} gifted you {$days} day(s) of Premium.",
            'gift', '/dashboard/settings'
        );
        ok("Premium gifted to @{$target['username']} for {$days} day(s)!", [
            'tokens' => $newBalance,
            'days'   => $days,
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        err('Server error. Please try again.', 500);
    }
}

// ── Grant Verified Badge (called by admin after payment confirmation) ──
if ($action === 'grant_verified') {
    // Only admins can call this action
    $adminCheck = $pdo->prepare("SELECT is_admin FROM users WHERE id=?");
    $adminCheck->execute([$userId]);
    $adminRow = $adminCheck->fetch();
    if (!$adminRow || !(int)$adminRow['is_admin']) err('Unauthorized.', 403);

    $targetId = (int)($input['target_id'] ?? 0);
    if ($targetId <= 0) err('Invalid user ID.');

    try {
        $pdo->beginTransaction();
        $s = $pdo->prepare("SELECT COALESCE(badges,'[]') FROM profiles WHERE user_id=? FOR UPDATE");
        $s->execute([$targetId]);
        $owned = json_decode($s->fetchColumn() ?: '[]', true) ?: [];
        if (in_array('verified', $owned, true)) {
            $pdo->rollBack();
            err('User already has the verified badge.');
        }
        $owned[] = 'verified';
        $pdo->prepare("UPDATE profiles SET badges=? WHERE user_id=?")->execute([json_encode(array_values($owned)), $targetId]);
        $pdo->commit();
        ok('Verified badge granted successfully!');
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        err('Server error.', 500);
    }
}

// ── Buy Token Pack (real money — confirmed by admin/webhook) ──────────
if ($action === 'buy_token_pack') {
    // Shared secret validation — replace with proper payment webhook
    $secret = $input['secret'] ?? '';
    if ($secret !== (defined('PREMIUM_SECRET') ? PREMIUM_SECRET : 'changeme_premium_secret')) {
        err('Invalid payment token.', 403);
    }

    $targetId = (int)($input['user_id'] ?? $userId);
    $packId   = (string)($input['pack_id'] ?? '');

    $tokenPacks = [
        'pack_150'  => ['tokens' => 150, 'bonus' => 0,   'price' => '€0.99'],
        'pack_450'  => ['tokens' => 450, 'bonus' => 0,   'price' => '€2.99'],
        'pack_700'  => ['tokens' => 700, 'bonus' => 70,  'price' => '€4.99'],
        'pack_1500' => ['tokens' => 1500,'bonus' => 150, 'price' => '€8.99'],
        'pack_2000' => ['tokens' => 2000,'bonus' => 250, 'price' => '€9.99'],
    ];

    if (!isset($tokenPacks[$packId])) err('Invalid pack.');

    $pack = $tokenPacks[$packId];

    // Check x2 event
    $x2Row = $pdo->query("SELECT x2_tokens_enabled FROM site_settings LIMIT 1")->fetch();
    $multiplier = (!empty($x2Row['x2_tokens_enabled'])) ? 2 : 1;

    $totalTokens = ($pack['tokens'] + $pack['bonus']) * $multiplier;

    try {
        $pdo->prepare("UPDATE users SET tokens = tokens + ? WHERE id=?")->execute([$totalTokens, $targetId]);
        ok("Token pack credited!", [
            'tokens_added' => $totalTokens,
            'x2_active'    => $multiplier === 2,
            'pack'         => $packId,
        ]);
    } catch (Throwable $e) {
        err('Server error.', 500);
    }
}

// ── Helper: ensure purchased_bundles column exists ─────────────────────────
function ensurePurchasedBundlesCol(PDO $pdo): void {
    static $done = false;
    if ($done) return;
    $cols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('purchased_bundles', $cols)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN purchased_bundles JSON DEFAULT NULL");
    }
    $done = true;
}

function userOwnsBundle(PDO $pdo, int $userId, int $bundleId): bool {
    ensurePurchasedBundlesCol($pdo);
    $s = $pdo->prepare("SELECT COALESCE(purchased_bundles,'[]') FROM users WHERE id=?");
    $s->execute([$userId]);
    $owned = json_decode($s->fetchColumn() ?: '[]', true) ?: [];
    return in_array($bundleId, $owned, true);
}

function markBundleOwned(PDO $pdo, int $userId, int $bundleId): void {
    ensurePurchasedBundlesCol($pdo);
    $s = $pdo->prepare("SELECT COALESCE(purchased_bundles,'[]') FROM users WHERE id=? FOR UPDATE");
    $s->execute([$userId]);
    $owned = json_decode($s->fetchColumn() ?: '[]', true) ?: [];
    if (!in_array($bundleId, $owned, true)) {
        $owned[] = $bundleId;
        $pdo->prepare("UPDATE users SET purchased_bundles=? WHERE id=?")->execute([json_encode(array_values($owned)), $userId]);
    }
}

// ── Buy Bundle (tokens only) ───────────────────────────────────────────────
if ($action === 'buy_bundle') {
    $bundleId = (int)($input['bundle_id'] ?? 0);
    if (!$bundleId) err('Invalid bundle.');

    // Load bundle
    try {
        $bStmt = $pdo->prepare("SELECT * FROM bundles WHERE id=?");
        $bStmt->execute([$bundleId]);
        $bundle = $bStmt->fetch();
    } catch (Throwable $e) { err('Bundle not found.'); }

    if (!$bundle) err('Bundle not found.');
    if ($bundle['price_type'] !== 'tokens') err('This bundle requires a payment — please contact support.');

    // One-time purchase check
    if (userOwnsBundle($pdo, $userId, $bundleId)) err('You already own this bundle.');

    $price = (int)$bundle['price'];

    try {
        $pdo->beginTransaction();

        // Check tokens
        $tokStmt = $pdo->prepare("SELECT tokens FROM users WHERE id=? FOR UPDATE");
        $tokStmt->execute([$userId]);
        $tokens = (int)($tokStmt->fetchColumn() ?? 0);
        if ($tokens < $price) { $pdo->rollBack(); err('Not enough tokens.'); }

        // Deduct tokens
        $pdo->prepare("UPDATE users SET tokens=tokens-?, tokens_spent=COALESCE(tokens_spent,0)+? WHERE id=?")
            ->execute([$price, $price, $userId]);

        // Apply badges
        $bnBadges = json_decode($bundle['badges'] ?? '[]', true) ?: [];
        foreach ($bnBadges as $badgeId) {
            setBadge($pdo, $userId, $badgeId, true);
        }

        // Apply effects
        $bnEffects = json_decode($bundle['effects'] ?? '[]', true) ?: [];
        if (!empty($bnEffects)) {
            $pdo->exec("INSERT IGNORE INTO profiles (user_id, purchased_effects) VALUES ({$userId}, '[]')");
            $efStmt = $pdo->prepare("SELECT COALESCE(purchased_effects,'[]') FROM profiles WHERE user_id=?");
            $efStmt->execute([$userId]);
            $owned = json_decode($efStmt->fetchColumn() ?: '[]', true) ?: [];
            foreach ($bnEffects as $eid) {
                if (!in_array($eid, $owned, true)) { $owned[] = $eid; }
            }
            $pdo->prepare("UPDATE profiles SET purchased_effects=? WHERE user_id=?")
                ->execute([json_encode(array_values($owned)), $userId]);
        }

        // Apply premium
        $bnPremium = (int)$bundle['premium_days'];
        if ($bnPremium > 0) {
            $colsPr = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
            if (!in_array('is_premium', $colsPr))         $pdo->exec("ALTER TABLE users ADD COLUMN is_premium TINYINT(1) DEFAULT 0");
            if (!in_array('premium_expires_at', $colsPr)) $pdo->exec("ALTER TABLE users ADD COLUMN premium_expires_at DATETIME DEFAULT NULL");
            $curRow = $pdo->prepare("SELECT is_premium, premium_expires_at FROM users WHERE id=?");
            $curRow->execute([$userId]);
            $curPrem = $curRow->fetch();
            $base = ($curPrem && $curPrem['is_premium'] && !empty($curPrem['premium_expires_at']))
                ? strtotime($curPrem['premium_expires_at'])
                : time();
            $until = date('Y-m-d H:i:s', $base + $bnPremium * 86400);
            $pdo->prepare("UPDATE users SET is_premium=1, premium_expires_at=? WHERE id=?")
                ->execute([$until, $userId]);
        }

        $pdo->commit();

        // Mark bundle as owned (one-time purchase tracking)
        markBundleOwned($pdo, $userId, $bundleId);

        // Send notification
        pushNotification($pdo, $userId, 'bundle',
            "🎁 Bundle purchased: " . $bundle['name'],
            "You successfully purchased the '{$bundle['name']}' bundle. Enjoy your rewards!",
            'gift', '/dashboard/badges'
        );

        ok("Bundle purchased!", ['tokens' => $tokens - $price]);

    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        err('Server error.', 500);
    }
}

// ── Gift Bundle ───────────────────────────────────────────────────────────
if ($action === 'gift_bundle') {
    $bundleId = (int)($input['bundle_id'] ?? 0);
    $targetId = (int)($input['target_id'] ?? 0);
    if (!$bundleId) err('Invalid bundle.');
    if ($targetId <= 0 || $targetId === $userId) err('Invalid recipient.');

    // Load bundle
    try {
        $bStmt = $pdo->prepare("SELECT * FROM bundles WHERE id=?");
        $bStmt->execute([$bundleId]);
        $bundle = $bStmt->fetch();
    } catch (Throwable $e) { err('Bundle not found.'); }

    if (!$bundle) err('Bundle not found.');
    if ($bundle['price_type'] !== 'tokens') err('This bundle requires a payment — please contact support.');

    // Check recipient
    $tr = $pdo->prepare("SELECT id, username, banned FROM users WHERE id=?");
    $tr->execute([$targetId]);
    $target = $tr->fetch();
    if (!$target) err('User not found.');
    if ($target['banned']) err('Cannot gift to a banned user.');

    // Check if recipient already owns bundle
    if (userOwnsBundle($pdo, $targetId, $bundleId)) err("@{$target['username']} already owns this bundle.");

    $price = (int)$bundle['price'];

    try {
        $pdo->beginTransaction();

        // Lock sender tokens
        $s = $pdo->prepare("SELECT tokens FROM users WHERE id=? FOR UPDATE");
        $s->execute([$userId]);
        $myTokens = (int)($s->fetchColumn() ?? 0);
        if ($myTokens < $price) { $pdo->rollBack(); err('Not enough tokens.'); }

        // Deduct tokens
        $pdo->prepare("UPDATE users SET tokens=tokens-?, tokens_spent=COALESCE(tokens_spent,0)+? WHERE id=?")->execute([$price, $price, $userId]);

        // Apply badges to recipient
        $bnBadges = json_decode($bundle['badges'] ?? '[]', true) ?: [];
        foreach ($bnBadges as $badgeId) {
            setBadge($pdo, $targetId, $badgeId, true);
        }

        // Apply effects to recipient
        $bnEffects = json_decode($bundle['effects'] ?? '[]', true) ?: [];
        if (!empty($bnEffects)) {
            $pdo->exec("INSERT IGNORE INTO profiles (user_id, purchased_effects) VALUES ({$targetId}, '[]')");
            $efStmt = $pdo->prepare("SELECT COALESCE(purchased_effects,'[]') FROM profiles WHERE user_id=?");
            $efStmt->execute([$targetId]);
            $owned = json_decode($efStmt->fetchColumn() ?: '[]', true) ?: [];
            foreach ($bnEffects as $eid) {
                if (!in_array($eid, $owned, true)) $owned[] = $eid;
            }
            $pdo->prepare("UPDATE profiles SET purchased_effects=? WHERE user_id=?")->execute([json_encode(array_values($owned)), $targetId]);
        }

        // Apply premium to recipient
        $bnPremium = (int)$bundle['premium_days'];
        if ($bnPremium > 0) {
            $colsPr = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
            if (!in_array('is_premium', $colsPr))         $pdo->exec("ALTER TABLE users ADD COLUMN is_premium TINYINT(1) DEFAULT 0");
            if (!in_array('premium_expires_at', $colsPr)) $pdo->exec("ALTER TABLE users ADD COLUMN premium_expires_at DATETIME DEFAULT NULL");
            $curRow = $pdo->prepare("SELECT is_premium, premium_expires_at FROM users WHERE id=?");
            $curRow->execute([$targetId]);
            $curPrem = $curRow->fetch();
            $base = ($curPrem && $curPrem['is_premium'] && !empty($curPrem['premium_expires_at']))
                ? strtotime($curPrem['premium_expires_at'])
                : time();
            $until = date('Y-m-d H:i:s', $base + $bnPremium * 86400);
            $pdo->prepare("UPDATE users SET is_premium=1, premium_expires_at=? WHERE id=?")->execute([$until, $targetId]);
        }

        $pdo->commit();

        // Mark bundle as owned by recipient
        markBundleOwned($pdo, $targetId, $bundleId);

        // Notify recipient
        $senderName = $profile['display_name'] ?: ($profile['username'] ?? 'Someone');
        pushNotification($pdo, $targetId, 'gift',
            "You received a bundle gift! 🎁",
            "@{$senderName} gifted you the '{$bundle['name']}' bundle.",
            'gift', '/dashboard/badges'
        );

        ok("Bundle gifted to @{$target['username']} successfully!", ['tokens' => $myTokens - $price]);

    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        err('Server error.', 500);
    }
}

err('Unknown action.');