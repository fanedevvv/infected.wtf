<?php
// ============================================
// Badge Settings API — toggle visibility & save order
// ============================================
define('ROOT', dirname(__DIR__));
session_start(["cookie_secure"=>true,"cookie_httponly"=>true,"cookie_samesite"=>"Lax"]);

require_once ROOT . '/config/config.php';
require_once ROOT . '/core/database.php';
require_once ROOT . '/core/auth.php';
require_once ROOT . '/core/helpers.php';

header('Content-Type: application/json');

function ok(array $extra = []): void { echo json_encode(array_merge(['success'=>true], $extra)); exit; }
function err(string $msg, int $code = 400): void { http_response_code($code); echo json_encode(['success'=>false,'error'=>$msg]); exit; }

if (!isLoggedIn()) err('Unauthenticated', 401);

$userId = (int)$_SESSION['user_id'];
$input  = json_decode(file_get_contents('php://input'), true) ?? [];
$action = trim($input['action'] ?? '');

// Base allowed badge IDs (user-controllable)
$allowedIds = ['premium','og','views_master','verified','hall_of_fame','champion','known','rich','trapstar','the_killer',
               'lover','fresh','crew','billionaire','content_creator','designer'];

// Add owner/admin to allowed IDs only if the user actually has the role
$roleStmt = $pdo->prepare("SELECT is_owner, is_admin FROM users WHERE id=?");
$roleStmt->execute([$userId]);
$roleRow = $roleStmt->fetch();
if (!empty($roleRow['is_owner'])) $allowedIds[] = 'owner';
if (!empty($roleRow['is_admin'])) $allowedIds[] = 'admin';

// Add discord if user has Discord integration connected
$discordStmt = $pdo->prepare("SELECT 1 FROM integrations WHERE user_id=? AND type='discord' LIMIT 1");
$discordStmt->execute([$userId]);
if ($discordStmt->fetchColumn()) $allowedIds[] = 'discord';

// Add booster if user has it in profiles.badges JSON
$boosterStmt = $pdo->prepare("SELECT COALESCE(badges,'[]') FROM profiles WHERE user_id=?");
$boosterStmt->execute([$userId]);
$boosterBadges = json_decode($boosterStmt->fetchColumn() ?: '[]', true) ?: [];
if (in_array('booster', $boosterBadges)) $allowedIds[] = 'booster';
// content_creator is already in $allowedIds statically; no extra check needed

// Add promoter / promoter_elite based on referral count (2-in-1: elite replaces regular at 20)
$refCountSt = $pdo->prepare("SELECT COUNT(*) FROM referrals WHERE referrer_id=?");
$refCountSt->execute([$userId]);
$refCountVal = (int)$refCountSt->fetchColumn();
if ($refCountVal >= 20) {
    $allowedIds[] = 'promoter_elite';
    $allowedIds[] = 'promoter'; // keep promoter in allowed for order/hidden ops
} elseif ($refCountVal >= 10) {
    $allowedIds[] = 'promoter';
}

switch ($action) {

    case 'toggle_hidden':
        $badgeId = trim($input['badge_id'] ?? '');
        $hidden  = !empty($input['hidden']);
        if (!in_array($badgeId, $allowedIds)) err('Invalid badge ID');
        setBadgeHidden($pdo, $userId, $badgeId, $hidden);
        ok(['hidden' => $hidden]);

    case 'save_order':
        $order = $input['order'] ?? [];
        if (!is_array($order)) err('Invalid order');
        // allowedIds already includes owner/admin if user has the role
        $order = array_values(array_filter($order, fn($b) => in_array($b, $allowedIds)));
        saveBadgeOrder($pdo, $userId, $order);
        ok();

    default:
        err('Unknown action');
}