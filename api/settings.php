<?php
if (session_status() === PHP_SESSION_NONE) session_start(["cookie_secure"=>true,"cookie_httponly"=>true,"cookie_samesite"=>"Lax"]);

require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/helpers.php';
require_once __DIR__ . '/../core/TOTP.php';

header('Content-Type: application/json');
ob_start();

function sOk(string $msg, array $extra = []): never {
    ob_end_clean();
    echo json_encode(array_merge(['success'=>true,'message'=>$msg], $extra));
    exit;
}
function sErr(string $msg): never {
    ob_end_clean();
    echo json_encode(['success'=>false,'error'=>$msg]);
    exit;
}

$input  = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $input['action'] ?? '';

// ── Actions that don't require login ──────────────────────────────────────────
if ($action === 'switch_account') {
    $token = trim($input['token'] ?? '');
    if (!$token) sErr('Invalid token.');
    // Hash-uim token-ul primit — DB stochează SHA-256, nu tokenul raw
    $tokenHash = hash('sha256', $token);
    $stmt = $pdo->prepare("SELECT id, username, banned, email_verified FROM users WHERE switch_token=? AND switch_token_expires > NOW() LIMIT 1");
    $stmt->execute([$tokenHash]);
    $u = $stmt->fetch();
    if (!$u) sErr('Switch token expired. Please re-add this account.');
    if ($u['banned']) sErr('This account is banned.');
    if (!$u['email_verified']) sErr('This account is not verified.');
    // Rotate switch token — DB primește hash-ul, clientul primește raw
    $newToken     = bin2hex(random_bytes(32));
    $newTokenHash = hash('sha256', $newToken);
    $newExpires   = date('Y-m-d H:i:s', strtotime('+30 days'));
    $pdo->prepare("UPDATE users SET switch_token=?, switch_token_expires=? WHERE id=?")->execute([$newTokenHash, $newExpires, $u['id']]);
    // Destroy old session cleanly and start fresh
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
    session_start(['cookie_secure'=>true,'cookie_httponly'=>true,'cookie_samesite'=>'Lax']);
    session_regenerate_id(true);
    $_SESSION['user_id']  = (int)$u['id'];
    $_SESSION['username'] = $u['username'];
    sOk('Switched.', ['username' => $u['username'], 'new_token' => $newToken]);
}

if ($action === 'verify_account_credentials') {
    $login = trim($input['login'] ?? '');
    $pw    = $input['password'] ?? '';
    $stmt  = $pdo->prepare("SELECT id, username, password, banned, email_verified FROM users WHERE username=? OR email=? LIMIT 1");
    $stmt->execute([$login, $login]);
    $u = $stmt->fetch();
    if (!$u || !password_verify($pw, $u['password'])) sErr('Invalid credentials.');
    if ($u['banned'])          sErr('This account is banned.');
    if (!$u['email_verified']) sErr('This account is not verified.');
    // Generate switch token — DB primește SHA-256, clientul primește raw
    $token      = bin2hex(random_bytes(32));
    $tokenHash  = hash('sha256', $token);
    $expires    = date('Y-m-d H:i:s', strtotime('+30 days'));
    $pdo->prepare("UPDATE users SET switch_token=?, switch_token_expires=? WHERE id=?")->execute([$tokenHash, $expires, $u['id']]);
    sOk('Credentials valid.', ['username' => $u['username'], 'switch_token' => $token]);  // raw pentru client
}

// ── All other actions require login ───────────────────────────────────────────
if (!isLoggedIn()) sErr('Not logged in.');
$userId = (int)$_SESSION['user_id'];
$stmt   = $pdo->prepare("SELECT * FROM users WHERE id=?");
$stmt->execute([$userId]);
$user   = $stmt->fetch();
if (!$user) sErr('User not found.');
$user['email'] = decryptEmail($user['email']); // decriptare la început — folosit în tot fișierul

// Generate/refresh a switch token for the currently logged-in user
if ($action === 'get_my_switch_token') {
    // DB primește SHA-256, clientul (localStorage) primește raw
    $token      = bin2hex(random_bytes(32));
    $tokenHash  = hash('sha256', $token);
    $expires    = date('Y-m-d H:i:s', strtotime('+30 days'));
    $pdo->prepare("UPDATE users SET switch_token=?, switch_token_expires=? WHERE id=?")->execute([$tokenHash, $expires, $userId]);
    $avStmt = $pdo->prepare("SELECT avatar FROM profiles WHERE user_id=? LIMIT 1");
    $avStmt->execute([$userId]);
    $av = $avStmt->fetchColumn();
    sOk('Token generated.', ['switch_token' => $token, 'username' => $user['username'], 'avatar' => $av ?: null]);  // raw pentru client
}

// ── 2FA check helper: if 2FA enabled, verify code before sensitive actions ────
function require2FA(array $user, array $input): void {
    if (!(int)($user['two_fa_enabled'] ?? 0)) return;
    $code = trim($input['two_fa_code'] ?? '');
    if (!$code) sErr('2FA code required. Please enter your authenticator code.');
    $totp = new TOTP($user['two_fa_secret']);
    if (!$totp->verify($code)) sErr('Invalid 2FA code.');
}

// ── Change Username ────────────────────────────────────────────────────────────
if ($action === 'change_username') {
    require2FA($user, $input);
    $newUsername = trim($input['username'] ?? '');
    if (!preg_match('/^[a-zA-Z0-9_]{3,30}$/', $newUsername))
        sErr('Username must be 3–30 characters: letters, numbers, underscores only.');
    if ($newUsername === $user['username']) sErr('That\'s already your current username.');
    if (!empty($user['username_changed_at'])) {
        $secsLeft = (7*86400) - (time() - strtotime($user['username_changed_at']));
        if ($secsLeft > 0) sErr('You can change your username again in ' . (int)ceil($secsLeft/86400) . ' day(s).');
    }
    $chk = $pdo->prepare("SELECT id FROM users WHERE username=? AND id!=?");
    $chk->execute([$newUsername, $userId]);
    if ($chk->fetch()) sErr('This username is already taken.');
    $pdo->prepare("UPDATE users SET username=?, username_changed_at=NOW() WHERE id=?")->execute([$newUsername, $userId]);
    sOk('Username updated successfully!', ['new_username' => $newUsername]);
}

// ── Change Email ───────────────────────────────────────────────────────────────
if ($action === 'change_email') {
    require2FA($user, $input);
    $newEmail = trim(strtolower($input['email'] ?? ''));
    $password = $input['password'] ?? '';
    if (!filter_var($newEmail, FILTER_VALIDATE_EMAIL)) sErr('Invalid email address.');
    if (!password_verify($password, $user['password']))  sErr('Incorrect current password.');
    if ($user['email'] === $newEmail)                    sErr('That\'s already your current email.'); // $user['email'] deja decriptat
    // Unicitate prin blind index (emailul e criptat în DB cu IV random → nu se poate compara direct)
    $chk = $pdo->prepare("SELECT id FROM users WHERE email_blind_index=? AND id!=?");
    $chk->execute([emailBlindIndex($newEmail), $userId]);
    if ($chk->fetch()) sErr('This email is already in use.');
    $token   = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', strtotime('+24 hours'));
    $pdo->prepare("DELETE FROM email_change_pending WHERE user_id=?")->execute([$userId]);
    // new_email stocat criptat în pending; blind index salvat separat pentru confirmare
    $pdo->prepare("INSERT INTO email_change_pending (user_id, new_email, token, expires_at) VALUES (?,?,?,?)")->execute([$userId, encryptEmail($newEmail), $token, $expires]);
    sendEmailChangeVerification($pdo, $userId, $newEmail, $user['username'], $token);
    sOk('Verification email sent to ' . $newEmail . '. Click the link to confirm.');
}

// ── Change Password ────────────────────────────────────────────────────────────
if ($action === 'change_password') {
    require2FA($user, $input);
    $cur  = $input['current_password'] ?? '';
    $new  = $input['new_password'] ?? '';
    $conf = $input['confirm_password'] ?? '';
    if (!password_verify($cur, $user['password'])) sErr('Incorrect current password.');
    if (strlen($new) < 6)   sErr('New password must be at least 6 characters.');
    if ($new !== $conf)      sErr('Passwords do not match.');
    $token   = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));
    $newHash = password_hash($new, PASSWORD_DEFAULT);
    $pdo->prepare("DELETE FROM action_confirmations WHERE user_id=? AND action_type='change_password'")->execute([$userId]);
    $pdo->prepare("INSERT INTO action_confirmations (user_id, action_type, payload, token, expires_at) VALUES (?,?,?,?,?)")->execute([$userId, 'change_password', $newHash, $token, $expires]);
    sendActionConfirmEmail($pdo, $userId, $user['email'], $user['username'], 'change_password', $token);
    sOk('Confirmation email sent to ' . $user['email'] . '. Click the link to confirm.');
}

// ── Delete Account ─────────────────────────────────────────────────────────────
if ($action === 'delete_account') {
    require2FA($user, $input);
    $password = $input['password'] ?? '';
    if (!password_verify($password, $user['password'])) sErr('Incorrect password.');
    $token   = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));
    $pdo->prepare("DELETE FROM action_confirmations WHERE user_id=? AND action_type='delete_account'")->execute([$userId]);
    $pdo->prepare("INSERT INTO action_confirmations (user_id, action_type, payload, token, expires_at) VALUES (?,?,?,?,?)")->execute([$userId, 'delete_account', '', $token, $expires]);
    sendActionConfirmEmail($pdo, $userId, $user['email'], $user['username'], 'delete_account', $token);
    sOk('Confirmation email sent. Click the link in the email to permanently delete your account.');
}

// ── 2FA: Init setup (generate secret + QR) ────────────────────────────────────
if ($action === 'setup_2fa_init') {
    $secret = TOTP::generateSecret();
    $totp   = new TOTP($secret);
    $label  = $user['email'];
    $issuer = SITE_NAME;
    $uri    = $totp->getQRUri($label, $issuer);
    sOk('QR generated.', ['secret' => $secret, 'otp_uri' => $uri]);
}

// ── 2FA: Confirm setup ────────────────────────────────────────────────────────
if ($action === 'setup_2fa_confirm') {
    $secret = trim($input['secret'] ?? '');
    $code   = trim($input['code'] ?? '');
    if (!$secret || !$code) sErr('Missing data.');
    $totp = new TOTP($secret);
    if (!$totp->verify($code)) sErr('Invalid code. Make sure your phone clock is correct.');
    $pdo->prepare("UPDATE users SET two_fa_secret=?, two_fa_enabled=1 WHERE id=?")->execute([$secret, $userId]);
    sOk('2FA enabled successfully!');
}

// ── 2FA: Disable ─────────────────────────────────────────────────────────────
if ($action === 'disable_2fa') {
    $code = trim($input['code'] ?? '');
    if (!$code) sErr('Enter your 6-digit authenticator code.');
    $totp = new TOTP($user['two_fa_secret']);
    if (!$totp->verify($code)) sErr('Invalid code.');
    $pdo->prepare("UPDATE users SET two_fa_secret=NULL, two_fa_enabled=0 WHERE id=?")->execute([$userId]);
    sOk('2FA disabled.');
}

if ($action === 'set_region') {
    $code = strtoupper(trim($input['region_code'] ?? ''));
    $name = trim($input['region_name'] ?? '');
    if (strlen($code) !== 2 || !ctype_alpha($code)) sErr('Invalid region code.');
    if ($name === '') sErr('Invalid region name.');

    // Salvează regiunea
    $pdo->prepare("UPDATE users SET leaderboard_region_code=?, leaderboard_region_name=? WHERE id=?")->execute([$code, $name, $userId]);

    // Calcul retroactiv: numără toate views primite din țara respectivă din views_log
    $retro = $pdo->prepare("
        SELECT COUNT(*) AS cnt
        FROM views_log
        WHERE profile_user_id = ? AND country_code = ?
    ");
    $retro->execute([$userId, $code]);
    $localCount = (int)($retro->fetchColumn() ?? 0);

    // Salvează în profiles.local_views
    $pdo->prepare("UPDATE profiles SET local_views = ? WHERE user_id = ?")->execute([$localCount, $userId]);

    sOk('Region saved.', ['local_views' => $localCount]);
}

sErr('Unknown action.');