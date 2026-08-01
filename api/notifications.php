<?php
session_start(["cookie_secure"=>true,"cookie_httponly"=>true,"cookie_samesite"=>"Lax"]);
define('ROOT', dirname(__DIR__));
require_once ROOT . '/config/config.php';
require_once ROOT . '/core/database.php';
require_once ROOT . '/core/auth.php';
require_once ROOT . '/core/helpers.php';

header('Content-Type: application/json');

if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthenticated']);
    exit;
}

$userId = (int)$_SESSION['user_id'];
$input  = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $input['action'] ?? ($_GET['action'] ?? '');

// ── Auto-create notifications table if missing ─────────────────────────────
$pdo->exec("
    CREATE TABLE IF NOT EXISTS `notifications` (
        `id`         INT AUTO_INCREMENT PRIMARY KEY,
        `user_id`    INT NOT NULL,
        `type`       VARCHAR(50) NOT NULL,
        `title`      VARCHAR(200) NOT NULL,
        `body`       VARCHAR(500) DEFAULT NULL,
        `icon`       VARCHAR(50)  DEFAULT 'bell',
        `link`       VARCHAR(300) DEFAULT NULL,
        `is_read`    TINYINT(1)   NOT NULL DEFAULT 0,
        `created_at` DATETIME     DEFAULT CURRENT_TIMESTAMP,
        INDEX `idx_user_unread` (`user_id`, `is_read`),
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

function jsonOk(array $data): never {
    echo json_encode(['success' => true] + $data);
    exit;
}
function jsonErr(string $msg, int $code = 400): never {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg]);
    exit;
}

// ── GET: fetch latest 5 notifications + unread count ──────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET' || $action === 'list') {
    $stmt = $pdo->prepare("
        SELECT id, type, title, body, icon, link, is_read, created_at,
               UNIX_TIMESTAMP(created_at) AS unix_ts
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 5
    ");
    $stmt->execute([$userId]);
    $notifs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $unread = (int)$pdo->prepare("SELECT COUNT(*) FROM notifications WHERE user_id=? AND is_read=0")->execute([$userId]) ? 
              $pdo->query("SELECT COUNT(*) FROM notifications WHERE user_id={$userId} AND is_read=0")->fetchColumn() : 0;

    // Cleaner unread count
    $cntStmt = $pdo->prepare("SELECT COUNT(*) FROM notifications WHERE user_id=? AND is_read=0");
    $cntStmt->execute([$userId]);
    $unread = (int)$cntStmt->fetchColumn();

    jsonOk(['notifications' => $notifs, 'unread' => $unread]);
}

// ── POST: mark all as read ─────────────────────────────────────────────────
if ($action === 'read_all') {
    $pdo->prepare("UPDATE notifications SET is_read=1 WHERE user_id=?")->execute([$userId]);
    jsonOk(['message' => 'All marked as read']);
}

// ── POST: mark one as read ─────────────────────────────────────────────────
if ($action === 'read_one') {
    $nid = (int)($input['id'] ?? 0);
    if ($nid > 0) {
        $pdo->prepare("UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?")->execute([$nid, $userId]);
    }
    jsonOk(['message' => 'Marked as read']);
}

// ── POST: send infected mail (owner only) ──────────────────────────────────
if ($action === 'infected_mail') {
    // Only owners can use this
    $ownerCheck = $pdo->prepare("SELECT is_owner FROM users WHERE id=?");
    $ownerCheck->execute([$userId]);
    $isOwner = (bool)($ownerCheck->fetchColumn() ?? false);
    if (!$isOwner) jsonErr('Only owners can send Infected mails.', 403);

    $title      = trim($input['title']      ?? '');
    $body       = trim($input['body']       ?? '');
    $recipient  = trim($input['recipient']  ?? ''); // 'all','premium','verified','content_creator'
    $author     = trim($input['author']     ?? 'Infected Team');

    if (!$title || !$body) jsonErr('Title and description are required.');
    $allowed = ['all', 'premium', 'verified', 'content_creator'];
    if (!in_array($recipient, $allowed, true)) jsonErr('Invalid recipient group.');

    // Build WHERE based on recipient group
    if ($recipient === 'all') {
        $targetIds = $pdo->query("SELECT id FROM users WHERE email_verified=1 AND banned=0")->fetchAll(PDO::FETCH_COLUMN);
    } elseif ($recipient === 'premium') {
        $targetIds = $pdo->query("SELECT id FROM users WHERE is_premium=1 AND (premium_expires_at IS NULL OR premium_expires_at > NOW()) AND banned=0")->fetchAll(PDO::FETCH_COLUMN);
    } elseif ($recipient === 'verified') {
        // "verified" badge in profiles.badges JSON
        $rows = $pdo->query("SELECT user_id, badges FROM profiles WHERE badges IS NOT NULL")->fetchAll(PDO::FETCH_ASSOC);
        $targetIds = [];
        foreach ($rows as $r) {
            $b = json_decode($r['badges'] ?? '[]', true) ?: [];
            if (in_array('verified', $b, true)) $targetIds[] = (int)$r['user_id'];
        }
        // Ensure not banned
        if ($targetIds) {
            $placeholders = implode(',', array_fill(0, count($targetIds), '?'));
            $ck = $pdo->prepare("SELECT id FROM users WHERE id IN ({$placeholders}) AND banned=0");
            $ck->execute($targetIds);
            $targetIds = $ck->fetchAll(PDO::FETCH_COLUMN);
        }
    } elseif ($recipient === 'content_creator') {
        $rows = $pdo->query("SELECT user_id, badges FROM profiles WHERE badges IS NOT NULL")->fetchAll(PDO::FETCH_ASSOC);
        $targetIds = [];
        foreach ($rows as $r) {
            $b = json_decode($r['badges'] ?? '[]', true) ?: [];
            if (in_array('content_creator', $b, true)) $targetIds[] = (int)$r['user_id'];
        }
        if ($targetIds) {
            $placeholders = implode(',', array_fill(0, count($targetIds), '?'));
            $ck = $pdo->prepare("SELECT id FROM users WHERE id IN ({$placeholders}) AND banned=0");
            $ck->execute($targetIds);
            $targetIds = $ck->fetchAll(PDO::FETCH_COLUMN);
        }
    }

    if (empty($targetIds)) jsonErr('No users found for that recipient group.');

    // Insert notifications in batch
    $sent = 0;
    $fullBody = $body . ($author ? "\n— {$author}" : '');
    $stmt = $pdo->prepare("INSERT INTO notifications (user_id, type, title, body, icon) VALUES (?, 'announcement', ?, ?, 'megaphone')");
    foreach ($targetIds as $tid) {
        $stmt->execute([(int)$tid, $title, $fullBody]);
        $sent++;
    }

    jsonOk(['sent' => $sent, 'message' => "Announcement sent to {$sent} user(s)."]);
}

// ── POST: delete one notification ─────────────────────────────────────────
if ($action === 'delete_one') {
    $nid = (int)($input['id'] ?? 0);
    if ($nid > 0) {
        $pdo->prepare("DELETE FROM notifications WHERE id=? AND user_id=?")->execute([$nid, $userId]);
    }
    jsonOk(['message' => 'Notification deleted']);
}

jsonErr('Unknown action.');