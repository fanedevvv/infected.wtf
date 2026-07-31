<?php
// ── maintenance_status.php ────────────────────────────────────────────────────
// Public endpoint polled by the maintenance page every 10 seconds.
// Returns {"maintenance": true/false} so the browser can auto-redirect when
// the site comes back online.
// ─────────────────────────────────────────────────────────────────────────────
define('ROOT', dirname(__DIR__));
require_once ROOT . '/config/config.php';
require_once ROOT . '/core/database.php';
require_once ROOT . '/core/auth.php';

header('Content-Type: application/json');
header('Cache-Control: no-store');

try {
    $active = isWhitelistEnabled($pdo);
    echo json_encode(['maintenance' => $active]);
} catch (Exception $e) {
    // If DB is down, assume still in maintenance
    echo json_encode(['maintenance' => true]);
}