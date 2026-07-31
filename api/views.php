<?php
require_once __DIR__ . '/../core/database.php'; require_once __DIR__ . '/../core/auth.php'; require_once __DIR__ . '/../core/helpers.php';
/* loaded above */
header('Content-Type: application/json');
$uid = (int)($_GET['uid']??0);
if ($uid) incrementViews($pdo, $uid);
echo json_encode(['ok'=>true]);
