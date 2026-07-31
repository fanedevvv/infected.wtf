<?php
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/helpers.php';

header('Content-Type: application/json');

$profileUserId = (int)($_POST['uid']   ?? 0);
$linkId        = (int)($_POST['lid']   ?? 0);
$linkTitle     = trim($_POST['title']  ?? '');
$linkUrl       = trim($_POST['url']    ?? '');

if (!$profileUserId || !$linkId) {
    echo json_encode(['ok' => false, 'error' => 'missing params']);
    exit;
}

$ip      = trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0')[0]);
$ipHash  = hash('sha256', $ip . date('Y-m-d'));
$today   = date('Y-m-d');

// Sanitize
$linkTitle = substr(strip_tags($linkTitle), 0, 200);
$linkUrl   = substr(strip_tags($linkUrl),   0, 500);

try {
    $stmt = $pdo->prepare("
        INSERT INTO link_clicks (profile_user_id, link_id, link_title, link_url, ip_hash, clicked_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$profileUserId, $linkId, $linkTitle, $linkUrl, $ipHash, $today]);
    echo json_encode(['ok' => true]);
} catch (Exception $e) {
    // Tabelul link_clicks poate sa nu existe inca — fail silently
    echo json_encode(['ok' => false, 'error' => 'db error']);
}