<?php
/**
 * cookie_consent.php
 * Saves the user's cookie consent decision — cookie + DB (dacă e logat).
 * GET  ?action=get  → returns current consent status
 * POST ?action=set  → sets consent (body: { "consent": "accepted" | "rejected" })
 */
if (session_status() === PHP_SESSION_NONE) session_start([
    'cookie_secure'   => true,
    'cookie_httponly' => true,
    'cookie_samesite' => 'Lax',
]);

require_once __DIR__ . '/../core/database.php';

header('Content-Type: application/json');
header('Cache-Control: no-store');

$action      = $_GET['action'] ?? 'get';
$cookieName  = 'site_cookie_consent';
$cookieExp   = time() + (365 * 24 * 60 * 60);

if ($action === 'set') {
    $data    = json_decode(file_get_contents('php://input'), true) ?? [];
    $consent = $data['consent'] ?? '';

    if (!in_array($consent, ['accepted', 'rejected'], true)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'invalid consent value']);
        exit;
    }

    // Setăm cookie browser
    setcookie($cookieName, $consent, [
        'expires'  => $cookieExp,
        'path'     => '/',
        'secure'   => true,
        'httponly' => false, // JS trebuie să îl citească
        'samesite' => 'Lax',
    ]);

    // Salvăm în DB dacă e logat
    if (!empty($_SESSION['user_id'])) {
        try {
            $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS cookie_consent ENUM('accepted','rejected') DEFAULT NULL");
            $pdo->prepare("UPDATE users SET cookie_consent=? WHERE id=?")
                ->execute([$consent, (int)$_SESSION['user_id']]);
        } catch (Exception $e) {}
    }

    echo json_encode(['ok' => true, 'consent' => $consent]);
    exit;
}

// action === 'get' — DB are prioritate față de cookie
$consent = null;
if (!empty($_SESSION['user_id'])) {
    try {
        $row = $pdo->prepare("SELECT cookie_consent FROM users WHERE id=? LIMIT 1");
        $row->execute([(int)$_SESSION['user_id']]);
        $consent = $row->fetchColumn() ?: null;
    } catch (Exception $e) {}
}
if (!$consent) {
    $consent = $_COOKIE[$cookieName] ?? null;
}

echo json_encode(['ok' => true, 'consent' => $consent]);