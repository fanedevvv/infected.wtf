<?php
// ── ban_status.php ────────────────────────────────────────────────────────────
// Polled by banned.php every 10s to check if the ban has been lifted.
// Returns {"banned": true/false}
// ─────────────────────────────────────────────────────────────────────────────
define('ROOT', dirname(__DIR__));
require_once ROOT . '/config/config.php';
require_once ROOT . '/core/database.php';

header('Content-Type: application/json');
header('Cache-Control: no-store');

$userId = isset($_GET['uid']) ? (int)$_GET['uid'] : 0;

if (!$userId) {
    echo json_encode(['banned' => true]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT banned, ban_until FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    if (!$row) {
        // User deleted — not banned anymore, redirect them out
        echo json_encode(['banned' => false]);
        exit;
    }

    $isBanned = (bool)$row['banned'];

    // If temp ban — check if it expired
    if ($isBanned && !empty($row['ban_until'])) {
        if (strtotime($row['ban_until']) <= time()) {
            // Expired — auto-unban
            $pdo->prepare("UPDATE users SET banned=0, ban_until=NULL WHERE id=?")->execute([$userId]);
            $isBanned = false;
        }
    }

    echo json_encode(['banned' => $isBanned]);
} catch (Exception $e) {
    echo json_encode(['banned' => true]);
}