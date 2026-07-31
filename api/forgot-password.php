<?php
/**
 * api/forgot-password.php
 */
if (session_status() === PHP_SESSION_NONE) session_start([
    'cookie_secure'   => true,
    'cookie_httponly' => true,
    'cookie_samesite' => 'Lax',
]);

require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/helpers.php';

header('Content-Type: application/json');
ob_start();

function fpOk(string $msg): never {
    ob_end_clean();
    echo json_encode(['success' => true, 'message' => $msg]);
    exit;
}
function fpErr(string $msg): never {
    ob_end_clean();
    echo json_encode(['success' => false, 'error' => $msg]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    fpErr('Method not allowed.');
}

$input      = json_decode(file_get_contents('php://input'), true) ?? [];
$identifier = trim($input['email'] ?? $input['identifier'] ?? '');

if (!$identifier) fpErr('Please enter your email address.');
if (!filter_var($identifier, FILTER_VALIDATE_EMAIL)) fpErr('Please enter a valid email address.');

// ── Rate limit IP: max 3 cereri per 15 minute ────────────────────────────────
$fp_ip     = trim(explode(',', $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '')[0]);
$fp_ipHash = hash('sha256', $fp_ip);
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS rate_limits (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        type         VARCHAR(32) NOT NULL,
        ip_hash      VARCHAR(64) NOT NULL,
        attempted_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_rl (type, ip_hash, attempted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $fpRl = $pdo->prepare("SELECT COUNT(*) FROM rate_limits WHERE type='forgot' AND ip_hash=? AND attempted_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)");
    $fpRl->execute([$fp_ipHash]);
    if ((int)$fpRl->fetchColumn() >= 3) {
        fpErr('Too many requests. Please wait 15 minutes before trying again.');
    }
    $pdo->prepare("INSERT INTO rate_limits (type, ip_hash) VALUES ('forgot', ?)")->execute([$fp_ipHash]);
} catch (Exception $e) {}

// ── Găsim userul doar după email ──────────────────────────────────────────────
$stmt = $pdo->prepare(
    "SELECT id, username, email, email_verified, banned
     FROM users
     WHERE email_blind_index = ?
     LIMIT 1"
);
$stmt->execute([emailBlindIndex($identifier)]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
if ($user) { $user['email'] = decryptEmail($user['email']); } // decriptare pentru trimitere email

// Răspuns generic — nu dezvăluim dacă există sau nu contul
$genericOk = 'If that account exists, a reset link has been sent to its email address.';

if (!$user || !(int)$user['email_verified'] || $user['banned']) {
    fpOk($genericOk);
}

// ── Rate-limit: max 1 cerere la 5 minute per user ─────────────────────────────
try {
    $coolStmt = $pdo->prepare(
        "SELECT id FROM password_resets
         WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
         LIMIT 1"
    );
    $coolStmt->execute([$user['id']]);
    if ($coolStmt->fetch()) {
        fpOk($genericOk);
    }
} catch (\Exception $e) {
    // tabela nu există încă
}

// ── Token securizat ───────────────────────────────────────────────────────────
$rawToken  = bin2hex(random_bytes(32));
$tokenHash = hash('sha256', $rawToken);
$expiresAt = date('Y-m-d H:i:s', time() + 3600);

try {
    $pdo->prepare("DELETE FROM password_resets WHERE user_id = ?")->execute([$user['id']]);
    $pdo->prepare(
        "INSERT INTO password_resets (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, NOW())"
    )->execute([$user['id'], $tokenHash, $expiresAt]);
} catch (\Exception $e) {
    fpErr('Password reset table missing. Please run the SQL migration.');
}

// ── Build email folosind _sendMail() din helpers.php ─────────────────────────
$resetUrl  = rtrim(SITE_URL, '/') . '/reset-password?token=' . urlencode($rawToken);
$siteName  = SITE_NAME;
$username  = $user['username'];
$subject   = "Reset your password — {$siteName}";

$html = <<<HTML
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  body{margin:0;padding:0;background:#050507;font-family:'Segoe UI',Arial,sans-serif;color:#f0f0f0}
  .wrap{max-width:480px;margin:40px auto;padding:0 16px}
  .card{background:linear-gradient(160deg,#0a0a16,#0d0d20);border:1px solid rgba(255,255,255,.1);border-radius:20px;overflow:hidden}
  .top-bar{height:3px;background:linear-gradient(135deg,#ff00ff,#00d4ff)}
  .body{padding:40px 36px}
  .logo{font-size:13px;font-weight:800;letter-spacing:.12em;color:#00d4ff;margin-bottom:32px;text-transform:uppercase}
  h1{font-size:22px;font-weight:700;margin:0 0 10px;color:#fff}
  p{font-size:14px;line-height:1.7;color:rgba(240,240,240,.65);margin:0 0 24px}
  .btn{display:inline-block;background:linear-gradient(135deg,#ff00ff,#00d4ff);color:#fff!important;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none}
  .divider{height:1px;background:rgba(255,255,255,.07);margin:28px 0}
  .small{font-size:12px;color:rgba(240,240,240,.35);line-height:1.6}
  .small a{color:#00d4ff;text-decoration:none}
  .footer{background:rgba(255,255,255,.02);padding:20px 36px;text-align:center;font-size:11px;color:rgba(240,240,240,.3)}
</style></head><body>
<div class="wrap"><div class="card">
  <div class="top-bar"></div>
  <div class="body">
    <div class="logo">{$siteName}</div>
    <h1>Reset your password</h1>
    <p>Hey <strong style="color:#fff">{$username}</strong>, we received a request to reset the password for your {$siteName} account. Click the button below to set a new password.</p>
    <a href="{$resetUrl}" class="btn">Reset Password</a>
    <div class="divider"></div>
    <p class="small">This link expires in <strong style="color:rgba(240,240,240,.6)">1 hour</strong>. If you didn't request this, ignore this email — your password won't change.<br><br><a href="{$resetUrl}">{$resetUrl}</a></p>
  </div>
  <div class="footer">&copy; {$siteName}</div>
</div></div></body></html>
HTML;

$plain = "Reset your password — {$siteName}\n\nHi {$username},\n\nClick the link below to reset your password (valid 1 hour):\n{$resetUrl}\n\nIf you didn't request this, ignore this email.\n";

_sendMail($user['email'], $subject, $html, $plain);

fpOk($genericOk);