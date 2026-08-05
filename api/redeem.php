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

// ── Auto-create redeem tables if missing ────────────────────────────────────
$pdo->exec("
    CREATE TABLE IF NOT EXISTS `redeem_codes` (
        `id`         INT AUTO_INCREMENT PRIMARY KEY,
        `code`       VARCHAR(40) NOT NULL,
        `tokens`     INT NOT NULL DEFAULT 0,
        `max_uses`   INT NOT NULL DEFAULT 1,
        `uses_count` INT NOT NULL DEFAULT 0,
        `expires_at` DATETIME DEFAULT NULL,
        `active`     TINYINT(1) NOT NULL DEFAULT 1,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `created_by` INT DEFAULT NULL,
        UNIQUE KEY `code` (`code`),
        KEY `idx_redeem_code` (`code`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");
$pdo->exec("
    CREATE TABLE IF NOT EXISTS `redeem_code_uses` (
        `id`         INT AUTO_INCREMENT PRIMARY KEY,
        `code_id`    INT NOT NULL,
        `user_id`    INT NOT NULL,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY `uniq_code_user` (`code_id`,`user_id`),
        KEY `user_id` (`user_id`),
        FOREIGN KEY (`code_id`) REFERENCES `redeem_codes`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
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

// ── POST: redeem a code ─────────────────────────────────────────────────────
if ($action === 'redeem') {
    $code = strtoupper(trim($input['code'] ?? ''));
    if ($code === '') jsonErr('Enter a code.');
    if (strlen($code) > 40) jsonErr('Invalid code.');

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("SELECT * FROM redeem_codes WHERE code=? FOR UPDATE");
        $stmt->execute([$code]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row)                { $pdo->rollBack(); jsonErr('Invalid code.'); }
        if (!$row['active'])      { $pdo->rollBack(); jsonErr('This code is no longer active.'); }
        if ($row['expires_at'] && strtotime($row['expires_at']) < time()) { $pdo->rollBack(); jsonErr('This code has expired.'); }
        if ($row['uses_count'] >= $row['max_uses']) { $pdo->rollBack(); jsonErr('This code has reached its usage limit.'); }

        $already = $pdo->prepare("SELECT 1 FROM redeem_code_uses WHERE code_id=? AND user_id=?");
        $already->execute([$row['id'], $userId]);
        if ($already->fetchColumn()) { $pdo->rollBack(); jsonErr('You already redeemed this code.'); }

        $pdo->prepare("INSERT INTO redeem_code_uses (code_id, user_id) VALUES (?, ?)")->execute([$row['id'], $userId]);
        $pdo->prepare("UPDATE redeem_codes SET uses_count = uses_count + 1 WHERE id=?")->execute([$row['id']]);
        $pdo->prepare("UPDATE users SET tokens = tokens + ? WHERE id=?")->execute([$row['tokens'], $userId]);

        $pdo->commit();
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        if ($e->getCode() === '23000') jsonErr('You already redeemed this code.');
        jsonErr('Something went wrong. Please try again.', 500);
    }

    $newBalance = getUserTokens($pdo, $userId);

    $pdo->prepare("INSERT INTO notifications (user_id, type, title, body, icon) VALUES (?, 'redeem', ?, ?, 'gift')")
        ->execute([$userId, 'Code redeemed!', "+{$row['tokens']} tokens added to your balance"]);

    jsonOk([
        'message'     => "+{$row['tokens']} tokens added!",
        'tokens'      => $newBalance,
        'tokens_added'=> (int)$row['tokens'],
    ]);
}

jsonErr('Unknown action.');
