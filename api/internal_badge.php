<?php
/**
 * api/internal_badge.php
 *
 * Endpoint INTERN — apelat de botu Discord (nu de utilizatori).
 * Acordă sau revocă un badge automat (ex: booster) pe baza discord_id.
 *
 * Autentificare: header X-Api-Key = DISCORD_BOT_API_KEY din config.
 *
 * Body JSON:
 *   action     : "grant_badge" | "revoke_badge"
 *   badge_id   : "booster"  (doar badge-uri automate permise)
 *   discord_id : "123456789012345678"
 *   secret     : <aceeaşi cheie API>   (fallback dacă header lipseşte)
 */

define('ROOT', dirname(__DIR__));
require_once ROOT . '/config/config.php';
require_once ROOT . '/core/database.php';
require_once ROOT . '/core/helpers.php';

header('Content-Type: application/json');

function ok(string $msg = 'OK'): void  { echo json_encode(['success'=>true,'message'=>$msg]); exit; }
function err(string $msg, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['success'=>false,'error'=>$msg]);
    exit;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
$expectedKey = defined('DISCORD_BOT_API_KEY') ? DISCORD_BOT_API_KEY : '';
$receivedKey = $_SERVER['HTTP_X_API_KEY'] ?? '';

// Fallback: cheie trimisă şi în body (pentru debug)
if (!$receivedKey) {
    $rawBody = file_get_contents('php://input');
    $bodyArr = json_decode($rawBody, true) ?: [];
    $receivedKey = $bodyArr['secret'] ?? '';
}

if (!$expectedKey || $receivedKey !== $expectedKey) {
    err('Unauthorized', 401);
}

// ── Input ──────────────────────────────────────────────────────────────────────
$rawBody   = file_get_contents('php://input');
$input     = json_decode($rawBody, true) ?: [];
$action    = trim($input['action']     ?? '');
$badgeId   = trim($input['badge_id']  ?? '');
$discordId = trim($input['discord_id'] ?? '');

// Badge-uri pe care botu le poate acorda/revoca automat (fără admin)
$autoAllowed = ['booster'];

if (!in_array($badgeId, $autoAllowed)) {
    err("Badge '{$badgeId}' not allowed for automatic management.");
}

if (!preg_match('/^\d{17,20}$/', $discordId)) {
    err('Invalid discord_id.');
}

// ── Găseşte userul cu discord_id-ul dat ──────────────────────────────────────
$stmt = $pdo->prepare("
    SELECT i.user_id
    FROM integrations i
    WHERE i.type = 'discord'
      AND i.discord_user_id = ?
    LIMIT 1
");
$stmt->execute([$discordId]);
$row = $stmt->fetch();

if (!$row) {
    // Nu e un utilizator al site-ului — ignorăm în tăcere
    ok("No user linked with discord_id={$discordId} — skipped.");
}

$userId = (int)$row['user_id'];

// ── Grant sau revocă badge ────────────────────────────────────────────────────
switch ($action) {

    case 'grant_badge':
        // Verifică dacă userul are deja badge-ul — trimite notificarea DOAR dacă e nou
        $checkStmt = $pdo->prepare("SELECT COALESCE(badges,'[]') FROM profiles WHERE user_id=?");
        $checkStmt->execute([$userId]);
        $existingBadges = json_decode($checkStmt->fetchColumn() ?: '[]', true) ?: [];
        $alreadyHas = in_array($badgeId, $existingBadges);

        setBadge($pdo, $userId, $badgeId, true);

        if (!$alreadyHas) {
            pushNotification(
                $pdo, $userId,
                'badge',
                '🚀 Server Booster badge awarded!',
                'Thanks for boosting our Discord server! The Server Booster badge is now visible on your profile.',
                'star',
                '/dashboard/badges'
            );
        }
        ok("Badge '{$badgeId}' granted to user #{$userId} (discord={$discordId}).");

    case 'revoke_badge':
        setBadge($pdo, $userId, $badgeId, false);
        pushNotification(
            $pdo, $userId,
            'badge',
            'Server Booster badge elimined',
            'Your boost on our Discord server has expired. The badge has been automatically removed from your profile.',
            'bell',
            '/dashboard/badges'
        );
        ok("Badge '{$badgeId}' revoked from user #{$userId} (discord={$discordId}).");

    case 'get_profile_slug':
        // Returnează username-ul (slug) de pe site pentru un discord_id
        // Folosit de botul Discord la anunțul de boost
        $slugStmt = $pdo->prepare("
            SELECT u.username
            FROM integrations i
            INNER JOIN users u ON u.id = i.user_id
            WHERE i.type = 'discord'
              AND i.discord_user_id = ?
            LIMIT 1
        ");
        $slugStmt->execute([$discordId]);
        $slugUsername = $slugStmt->fetchColumn();
        if (!$slugUsername) ok('No user linked — skipped.');
        echo json_encode(['success' => true, 'slug' => $slugUsername]);
        exit;

    case 'list_badge_holders':
        // Returnează lista de discord_id-uri ale userilor care au badge-ul activ
        // Folosit de job-ul periodic de sync din botul Discord
        $holdersStmt = $pdo->prepare("
            SELECT i.discord_user_id
            FROM integrations i
            INNER JOIN profiles p ON p.user_id = i.user_id
            WHERE i.type = 'discord'
              AND i.discord_user_id IS NOT NULL
              AND JSON_CONTAINS(COALESCE(p.badges, '[]'), JSON_QUOTE(?))
        ");
        $holdersStmt->execute([$badgeId]);
        $discordIds = $holdersStmt->fetchAll(PDO::FETCH_COLUMN);
        echo json_encode(['success' => true, 'discord_ids' => $discordIds]);
        exit;

    default:
        err("Unknown action '{$action}'. Use 'grant_badge', 'revoke_badge' or 'list_badge_holders'.");
}