<?php
/* session started by router */
/* loaded by router */;
/* loaded by router */;

require_once __DIR__ . '/../../core/TOTP.php';
if (isLoggedIn()) { redirect('/dashboard'); }

$error   = '';
$banInfo = null;

// ── Rate limit setup ──────────────────────────────────────────────────────────
$rl_ip     = trim(explode(',', $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '')[0]);
$rl_ipHash = hash('sha256', $rl_ip);
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS rate_limits (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        type         VARCHAR(32) NOT NULL,
        ip_hash      VARCHAR(64) NOT NULL,
        attempted_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_rl (type, ip_hash, attempted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    if (mt_rand(1, 100) === 1) {
        $pdo->exec("DELETE FROM rate_limits WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)");
    }
} catch (Exception $e) {}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $login    = trim($_POST['login'] ?? '');
    $password = $_POST['password'] ?? '';
    $remember = isset($_POST['remember']);

    // ── Max 5 încercări per IP per 10 minute ─────────────────────────────────
    try {
        $rlCheck = $pdo->prepare("SELECT COUNT(*) FROM rate_limits WHERE type='login' AND ip_hash=? AND attempted_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)");
        $rlCheck->execute([$rl_ipHash]);
        if ((int)$rlCheck->fetchColumn() >= 5) {
            $error = 'Too many failed login attempts. Please wait 10 minutes and try again.';
            goto end_post;
        }
    } catch (Exception $e) {}

    if (!$login || !$password) {
        $error = 'Please fill in all fields.';
    } else {
        $stmt = $pdo->prepare("SELECT id, username, email, password, banned, ban_until, email_verified, COALESCE(two_fa_enabled,0) AS two_fa_enabled, two_fa_secret FROM users WHERE username=? OR email_blind_index=?");
        $stmt->execute([$login, emailBlindIndex($login)]);
        $user = $stmt->fetch();
        if ($user) { $user['email'] = decryptEmail($user['email']); } // decriptare înainte de orice folosire

        if (!$user || !password_verify($password, $user['password'])) {
            try { $pdo->prepare("INSERT INTO rate_limits (type, ip_hash) VALUES ('login', ?)")->execute([$rl_ipHash]); } catch (Exception $e) {}
            $error = 'Invalid login credentials.';
        } elseif (!(int)$user['email_verified']) {
            $error = 'Please verify your email before signing in. Check your inbox for the verification link.';
        } elseif ($user['banned']) {
            $banUntil    = $user['ban_until'] ?? null;
            $isPermanent = empty($banUntil);
            $daysLeft    = null;
            if (!$isPermanent) {
                $diff     = strtotime($banUntil) - time();
                $daysLeft = max(0, (int)ceil($diff / 86400));
                if ($daysLeft === 0 && $diff > 0) $daysLeft = 1;
            }
            $banInfo = [
                'permanent' => $isPermanent,
                'days_left' => $daysLeft,
                'until'     => $banUntil,
            ];
        } else {
            // ── 2FA check ────────────────────────────────────────────────────
            if ((int)($user['two_fa_enabled'] ?? 0)) {
                $twoFaCode = trim($_POST['two_fa_code'] ?? '');
                if (!$twoFaCode) {
                    $error    = '';
                    $need2FA  = true;
                    $pending2FAUser = $user;
                    goto show_2fa_form;
                }
                $totp = new TOTP($user['two_fa_secret']);
                if (!$totp->verify($twoFaCode)) {
                    $error = 'Invalid 2FA code. Please try again.';
                    $need2FA = true;
                    $pending2FAUser = $user;
                    goto show_2fa_form;
                }
            }

            // ── Check if re-login verification needed (inactive 30+ days) ──
            $lastLoginStmt = $pdo->prepare("SELECT last_login FROM users WHERE id=?");
            $lastLoginStmt->execute([$user['id']]);
            $lastLoginRow  = $lastLoginStmt->fetch();
            $lastLogin     = $lastLoginRow['last_login'] ?? null;
            $needsReVerify = $lastLogin && (time() - strtotime($lastLogin)) > (30 * 86400);

            if ($needsReVerify) {
                // Send re-login verification email and show pending page
                sendReloginVerificationEmail($pdo, $user['id'], $user['email'], $user['username']);
                $reloginEmail = $user['email'];
                goto show_relogin_pending;
            }

            $_SESSION['user_id']  = $user['id'];
            $_SESSION['username'] = $user['username'];
            // Update last_login
            $pdo->prepare("UPDATE users SET last_login=NOW() WHERE id=?")->execute([$user['id']]);

            // ── New login location detection ─────────────────────────────
            $ip         = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
            $ip         = trim(explode(',', $ip)[0]);
            $ipHash     = hash('sha256', $ip . 'biolink_salt');
            $userAgent  = $_SERVER['HTTP_USER_AGENT'] ?? '';
            $deviceType = preg_match('/Mobile|Android|iPhone|iPad/i', $userAgent) ? 'mobile' : 'desktop';
            $browser    = 'Unknown';
            if (str_contains($userAgent, 'Firefox'))       $browser = 'Firefox';
            elseif (str_contains($userAgent, 'Edg'))       $browser = 'Edge';
            elseif (str_contains($userAgent, 'Chrome'))    $browser = 'Chrome';
            elseif (str_contains($userAgent, 'Safari'))    $browser = 'Safari';
            elseif (str_contains($userAgent, 'Opera'))     $browser = 'Opera';

            // Check if this IP+device combo was seen before for this user
            $knownStmt = $pdo->prepare("SELECT id FROM login_history WHERE user_id=? AND ip_hash=? AND device_type=? LIMIT 1");
            $knownStmt->execute([$user['id'], $ipHash, $deviceType]);
            $isNewLocation = !$knownStmt->fetch();

            // Log this login
            // ip_display: afișăm doar primul octet, restul mascat (*.*.*) — pentru UX fără a expune IP-ul complet
            $octets    = explode('.', $ip);
            $ipDisplay = ($octets[0] ?? '***') . '.*.*.*';
            $pdo->prepare("INSERT INTO login_history (user_id, ip_hash, ip_display, device_type, browser, logged_at) VALUES (?,?,?,?,?,NOW())")
                ->execute([$user['id'], $ipHash, $ipDisplay, $deviceType, $browser]);

            // Send email if new location and user has notifications enabled
            if ($isNewLocation) {
                $notifStmt = $pdo->prepare("SELECT login_notify FROM users WHERE id=? LIMIT 1");
                $notifStmt->execute([$user['id']]);
                $notifRow = $notifStmt->fetch();
                if (!$notifRow || (int)($notifRow['login_notify'] ?? 1) === 1) {
                    sendNewLoginEmail($pdo, $user['id'], $user['email'], $user['username'], $browser, $deviceType, $ip);
                }
            }

            // Remember me — 30 days
            if ($remember) {
                $token      = bin2hex(random_bytes(32));
                $tokenHash  = hash('sha256', $token);   // DB stochează doar hash-ul SHA-256
                $expires    = date('Y-m-d H:i:s', strtotime('+30 days'));
                $pdo->prepare("UPDATE users SET remember_token=?, token_expires=? WHERE id=?")->execute([$tokenHash, $expires, $user['id']]);
                setcookie('remember_token', $token, [  // cookie primește tokenul raw
                    'expires'  => time() + 60*60*24*30,
                    'path'     => '/',
                    'secure'   => false,
                    'httponly' => true,
                    'samesite' => 'Lax',
                ]);
            }

            // ── Referral fallback: process if not yet credited ──────────
            try {
                $rfRow = $pdo->prepare("SELECT referred_by FROM users WHERE id=? LIMIT 1");
                $rfRow->execute([$user['id']]);
                $rfData = $rfRow->fetch();
                if ($rfData && !empty($rfData['referred_by'])) {
                    $alreadyRef = $pdo->prepare("SELECT id FROM referrals WHERE referred_id=? LIMIT 1");
                    $alreadyRef->execute([$user['id']]);
                    if (!$alreadyRef->fetch()) {
                        $refInput = $rfData['referred_by'];
                        $refStmt  = $pdo->prepare("SELECT id FROM users WHERE referral_code=? OR username=? LIMIT 1");
                        $refStmt->execute([$refInput, $refInput]);
                        $referrer = $refStmt->fetch();
                        if ($referrer && (int)$referrer['id'] !== (int)$user['id']) {
                            $referrerId = (int)$referrer['id'];
                            $premCheck  = $pdo->prepare("SELECT is_premium, premium_expires_at FROM users WHERE id=?");
                            $premCheck->execute([$referrerId]);
                            $refPremRow = $premCheck->fetch();
                            $refIsPrem  = $refPremRow
                                && (int)$refPremRow['is_premium'] === 1
                                && ($refPremRow['premium_expires_at'] === null || strtotime($refPremRow['premium_expires_at']) > time());
                            $refTokens  = $refIsPrem ? 20 : 10;
                            try {
                                $x2Row = $pdo->query("SELECT x2_tokens_enabled FROM site_settings LIMIT 1")->fetch();
                                if (!empty($x2Row['x2_tokens_enabled'])) $refTokens *= 2;
                            } catch (Exception $ignored) {}
                            $pdo->prepare("UPDATE users SET tokens = tokens + ? WHERE id=?")->execute([$refTokens, $referrerId]);
                            $pdo->prepare("INSERT INTO referrals (referrer_id, referred_id, tokens_given) VALUES (?,?,?)")->execute([$referrerId, $user['id'], $refTokens]);
                            // ── Notify referrer ──────────────────────────────────
                            pushNotification($pdo, $referrerId, 'referral',
                                "New referral! 🎉",
                                "Someone just signed up using your referral link. You earned {$refTokens} tokens!",
                                'users', '/dashboard/referral'
                            );
                        }
                    }
                }
            } catch (Exception $refEx) { /* silent */ }

            redirect('/dashboard');
        }
    }
}
end_post:
?>
<?php show_2fa_form: ?>
<?php show_relogin_pending: ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= SITE_NAME ?> — Login</title>
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Outfit:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/main.css?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/css/main.css') ?: time() ?>">
</head>
<body class="auth-page">
    <canvas id="particle-canvas" style="position:fixed;inset:0;z-index:0;pointer-events:none;"></canvas>
    <div class="auth-card fade-in" style="position:relative;z-index:1;">
        <div class="auth-logo">
            <h1><?= SITE_NAME ?></h1>
            <p>Welcome back!</p>
        </div>

        <?php if (isset($banInfo) && $banInfo): ?>
        <div style="border-radius:12px;border:1px solid rgba(239,68,68,.3);background:rgba(239,68,68,.08);padding:14px 16px;margin-bottom:1.25rem;display:flex;align-items:flex-start;gap:11px;">
          <span style="flex-shrink:0;margin-top:1px;color:#ef4444;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
          </span>
          <div style="font-size:.83rem;line-height:1.55;color:rgba(255,255,255,.75);">
            <strong style="color:#ff8080;display:block;margin-bottom:2px;">Account suspended</strong>
            <?php if ($banInfo['permanent']): ?>
              This is a <strong style="color:#ff6b6b;">permanent ban</strong>. Contact an administrator to appeal.
            <?php elseif ($banInfo['days_left'] !== null): ?>
              <?php if ($banInfo['days_left'] <= 1): ?>
                Your ban expires <strong style="color:#fb923c;">today</strong>.
              <?php elseif ($banInfo['days_left'] <= 7): ?>
                Your ban expires in <strong style="color:#fb923c;"><?= $banInfo['days_left'] ?> day<?= $banInfo['days_left'] > 1 ? 's' : '' ?></strong>.
              <?php else: ?>
                Your ban expires in <strong style="color:#fb923c;"><?= $banInfo['days_left'] ?> days</strong>
                &mdash; on <?= date('M j, Y', strtotime($banInfo['until'])) ?>.
              <?php endif; ?>
            <?php endif; ?>
          </div>
        </div>
        <?php elseif ($error): ?>
        <div class="alert alert-error" style="display:flex;align-items:center;gap:9px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" style="flex-shrink:0;">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <?= sanitize($error) ?>
        </div>
        <?php endif; ?>

        <form method="POST">
            <div class="form-group">
                <label>Username or Email</label>
                <input type="text" name="login" class="form-control"
                    placeholder="username or email"
                    value="<?= sanitize($_POST['login'] ?? '') ?>"
                    autocomplete="username">
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" name="password" class="form-control"
                    placeholder="Your password"
                    autocomplete="current-password">
                <button type="button" onclick="openForgotModal()"
                    style="background:none;border:none;padding:0;margin-top:6px;font-size:.78rem;color:rgba(255,255,255,.35);cursor:pointer;font-family:'Outfit',sans-serif;transition:color .2s;display:block;text-align:right;width:100%;"
                    onmouseover="this.style.color='var(--accent,#00d4ff)'"
                    onmouseout="this.style.color='rgba(255,255,255,.35)'">
                    Forgot your password?
                </button>
            </div>

            <!-- Remember me -->
            <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:1.25rem;">
                <label class="remember-wrap" style="display:flex;align-items:center;gap:0.55rem;cursor:pointer;user-select:none;">
                    <input type="checkbox" name="remember" id="remember" style="display:none">
                    <span class="remember-box" id="remember-box"
                        style="width:18px;height:18px;border-radius:5px;border:1.5px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0;">
                        <svg id="remember-check" viewBox="0 0 12 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                            style="width:10px;height:10px;color:#000;display:none;">
                            <polyline points="1 5 4.5 8.5 11 1"/>
                        </svg>
                    </span>
                    <span style="font-size:0.875rem;color:rgba(240,240,240,0.6);">Remember me for 30 days</span>
                </label>
            </div>

            <button type="submit" class="btn btn-primary btn-full">Sign in</button>
        </form>

        <div class="auth-footer">
            Don't have an account? <a href="/register">Register</a>
        </div>
    </div>

    <script src="/assets/js/login.js?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/js/login.js') ?: time() ?>"></script>
    <script src="/assets/js/particles.js?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/js/particles.js') ?: time() ?>"></script>

    <!-- ── Forgot Password Modal ── -->
    <div id="fp-overlay" onclick="closeForgotIfOutside(event)" style="display:none;position:fixed;inset:0;z-index:999;align-items:center;justify-content:center;padding:1.5rem;background:rgba(5,5,10,.88);backdrop-filter:blur(10px);">
        <div id="fp-modal" style="background:rgba(10,10,22,.98);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:2.25rem 2rem;width:100%;max-width:400px;text-align:center;position:relative;overflow:hidden;animation:fpIn .35s cubic-bezier(.22,1,.36,1) both;">
            <style>
                @keyframes fpIn{from{opacity:0;transform:scale(.93) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}
            </style>
            <!-- top gradient bar -->
            <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--accent,#00d4ff),var(--accent2,#ff00ff),transparent)"></div>
            <!-- close btn -->
            <button onclick="closeForgotModal()" style="position:absolute;top:.9rem;right:.9rem;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:8px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.45);cursor:pointer;font-size:.85rem;transition:all .2s;line-height:1" onmouseover="this.style.background='rgba(255,255,255,.13)';this.style.color='#fff'" onmouseout="this.style.background='rgba(255,255,255,.07)';this.style.color='rgba(255,255,255,.45)'">✕</button>
            <!-- icon -->
            <div style="width:54px;height:54px;border-radius:16px;background:linear-gradient(135deg,rgba(255,0,255,.13),rgba(0,212,255,.13));border:1px solid rgba(0,212,255,.22);display:flex;align-items:center;justify-content:center;margin:0 auto 1.2rem;">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="26" height="26">
                    <defs><linearGradient id="fp-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ff00ff"/><stop offset="100%" stop-color="#00d4ff"/></linearGradient></defs>
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="url(#fp-g)"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="url(#fp-g)"/>
                </svg>
            </div>
            <h2 style="font-family:'Syne',sans-serif;font-size:1.3rem;font-weight:800;margin:0 0 .4rem;color:#fff;">Reset Password</h2>
            <p style="color:rgba(255,255,255,.38);font-size:.82rem;line-height:1.6;margin:0 0 1.4rem;">Enter your email address and we'll send you a link to reset your password.</p>
            <input id="fp-identifier" type="text" placeholder="Email address"
                style="width:100%;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.1);border-radius:12px;padding:.75rem 1rem;color:#fff;font-size:.92rem;font-family:'Outfit',sans-serif;outline:none;box-sizing:border-box;transition:border-color .2s,box-shadow .2s;margin-bottom:1rem;"
                onfocus="this.style.borderColor='rgba(0,212,255,.5)';this.style.boxShadow='0 0 0 3px rgba(0,212,255,.1)'"
                onblur="this.style.borderColor='rgba(255,255,255,.1)';this.style.boxShadow='none'">
            <button id="fp-btn" onclick="submitForgot()"
                style="width:100%;padding:.8rem;background:linear-gradient(135deg,#ff00ff,#00d4ff);border:none;border-radius:12px;color:#fff;font-size:.95rem;font-weight:700;font-family:'Outfit',sans-serif;cursor:pointer;transition:opacity .15s;">
                Send Reset Link
            </button>
            <div id="fp-status" style="margin-top:.9rem;font-size:.82rem;min-height:1.2em;"></div>
        </div>
    </div>



    <?php if (isset($reloginEmail)): ?>
    <!-- ── Re-login verification overlay ── -->
    <div class="modal-overlay" style="position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:1.5rem;background:rgba(5,5,10,0.92);backdrop-filter:blur(10px);">
        <div style="background:rgba(10,10,22,0.98);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:2.25rem 2rem;width:100%;max-width:420px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.7);position:relative;overflow:hidden;animation:modalIn .4s cubic-bezier(.22,1,.36,1) both;">
            <style>@keyframes modalIn{from{opacity:0;transform:scale(.93) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}</style>
            <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--accent),var(--accent2),transparent)"></div>
            <span style="font-family:'Syne',sans-serif;font-size:.8rem;font-weight:800;color:var(--accent);letter-spacing:.1em;margin-bottom:1.25rem;display:block"><?= SITE_NAME ?></span>
            <div style="width:80px;height:80px;border-radius:50%;background:radial-gradient(circle,rgba(0,212,255,.15),rgba(0,212,255,.04));border:1.5px solid rgba(0,212,255,.3);display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h2 style="font-family:'Syne',sans-serif;font-size:1.35rem;font-weight:800;margin-bottom:.45rem;background:linear-gradient(135deg,#fff,rgba(255,255,255,.75));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Security check</h2>
            <p style="color:var(--text-muted);font-size:.84rem;line-height:1.65;margin-bottom:1.4rem;">
                You haven't logged in for over <strong style="color:var(--text)">30 days</strong>.<br>
                We sent a verification link to<br>
                <span style="color:var(--accent);font-weight:600"><?= sanitize($reloginEmail) ?></span><br>
                Click it to access your account.
            </p>
            <p style="font-size:.75rem;color:var(--text-muted);">Didn't get it? <a href="/login" style="color:var(--accent);text-decoration:none;">Try signing in again</a> to resend.</p>
        </div>
    </div>
    <?php endif; ?>

    <?php if (isset($need2FA) && $need2FA): ?>
    <!-- ── 2FA overlay ── -->
    <div style="position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:1.5rem;background:rgba(5,5,10,.92);backdrop-filter:blur(10px);">
        <div style="background:rgba(10,10,22,.98);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:2.25rem 2rem;width:100%;max-width:380px;text-align:center;position:relative;overflow:hidden;animation:mi .4s cubic-bezier(.22,1,.36,1)">
            <style>@keyframes mi{from{opacity:0;transform:scale(.93) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}</style>
            <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#fbbf24,transparent)"></div>
            <div style="width:64px;height:64px;border-radius:50%;background:rgba(251,191,36,.12);border:1.5px solid rgba(251,191,36,.3);display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem">
                <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="1.8" width="28" height="28"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h2 style="font-family:'Syne',sans-serif;font-size:1.2rem;font-weight:800;margin-bottom:.4rem;background:linear-gradient(135deg,#fbbf24,#f59e0b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">Two-Factor Auth</h2>
            <p style="color:var(--text-muted);font-size:.82rem;line-height:1.6;margin-bottom:1.25rem">Open Google Authenticator and enter the 6-digit code for <strong style="color:var(--text)"><?= SITE_NAME ?></strong>.</p>
            <form method="POST">
                <input type="hidden" name="login" value="<?= sanitize($_POST['login'] ?? '') ?>">
                <input type="hidden" name="password" value="<?= htmlspecialchars($_POST['password'] ?? '', ENT_QUOTES) ?>">
                <?php if (isset($_POST['remember'])): ?><input type="hidden" name="remember" value="1"><?php endif; ?>
                <input type="text" name="two_fa_code" placeholder="000000"
                    style="width:100%;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:.85rem;color:#fff;font-size:1.5rem;text-align:center;letter-spacing:.35em;margin-bottom:1rem;box-sizing:border-box"
                    maxlength="6" inputmode="numeric" autocomplete="one-time-code" autofocus>
                <?php if (isset($error) && $error): ?>
                <p style="color:#ff8080;font-size:.78rem;margin-bottom:.85rem">✗ <?= sanitize($error) ?></p>
                <?php endif; ?>
                <button type="submit" style="width:100%;background:linear-gradient(135deg,rgba(251,191,36,.2),rgba(251,191,36,.1));border:1px solid rgba(251,191,36,.35);color:#fbbf24;font-weight:700;font-size:.85rem;padding:.8rem;border-radius:10px;cursor:pointer">
                    Verify Code
                </button>
            </form>
            <p style="margin-top:1rem;font-size:.72rem;color:var(--text-muted)"><a href="/login" style="color:var(--accent);text-decoration:none;">← Back to login</a></p>
        </div>
    </div>
    <?php endif; ?>
<?php include __DIR__ . '/../partials/cookie_banner.php'; ?>
</body>
</html>