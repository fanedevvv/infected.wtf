<?php
/* loaded by router */
if (isLoggedIn()) { redirect('/dashboard'); }

// Domenii email permise (cele mai populare si de incredere)
function isAllowedEmailDomain(string $email): bool {
    $allowed = [
        // Google
        'gmail.com','googlemail.com',
        // Microsoft
        'outlook.com','hotmail.com','hotmail.co.uk','hotmail.fr','hotmail.de','hotmail.es','hotmail.it',
        'live.com','live.co.uk','live.fr','live.de','live.nl','live.be','live.com.ar','live.com.mx',
        'msn.com',
        // Yahoo
        'yahoo.com','yahoo.co.uk','yahoo.fr','yahoo.de','yahoo.es','yahoo.it','yahoo.com.ar',
        'yahoo.com.br','yahoo.com.mx','yahoo.co.jp','yahoo.co.in','yahoo.ca','yahoo.com.au',
        'ymail.com',
        // Apple
        'icloud.com','me.com','mac.com',
        // Proton
        'proton.me','protonmail.com','protonmail.ch',
        // Zoho
        'zoho.com','zohomail.com',
        // AOL / Verizon
        'aol.com','aol.co.uk','aim.com',
        // GMX
        'gmx.com','gmx.net','gmx.de','gmx.at','gmx.ch','gmx.fr',
        // Web.de / T-Online (Germania)
        'web.de','t-online.de','freenet.de',
        // Orange / Wanadoo (Franta)
        'orange.fr','wanadoo.fr','laposte.net',
        // Romanian ISP / populare Romania
        'yahoo.ro','gmail.ro',
        // Alte populare
        'mail.com','email.com',
        'fastmail.com','fastmail.fm','fastmail.net','fastmail.org',
        'tutanota.com','tuta.io',
        'pm.me',
        'hey.com',
        'yandex.com','yandex.ru','yandex.ua',
        'mail.ru','bk.ru','inbox.ru','list.ru',
        'rambler.ru',
        'ukr.net',
        'wp.pl','o2.pl','interia.pl','onet.pl',
        'seznam.cz',
        'post.cz',
        'libero.it','virgilio.it','tin.it',
        'terra.com.br','uol.com.br','bol.com.br','ig.com.br',
        'rediffmail.com',
        'naver.com',
        'daum.net','hanmail.net',
        'qq.com','163.com','126.com','sina.com','sohu.com',
        'btinternet.com','sky.com','ntlworld.com','talktalk.net',
        'virginmedia.com','blueyonder.co.uk',
        'bell.net','rogers.com','shaw.ca','telus.net',
        'bigpond.com','optusnet.com.au','iinet.net.au',
        // Edu & gov (permise generic)
        // Nu le putem lista pe toate, dar domeniile .edu si .gov sunt automat permise mai jos
    ];
    $domain = strtolower(trim(substr($email, strrpos($email, '@') + 1)));
    // Permite automat domenii .edu si .gov
    if (str_ends_with($domain, '.edu') || str_ends_with($domain, '.gov')) return true;
    return in_array($domain, $allowed, true);
}

$error        = '';
$success      = false;
$pendingEmail = '';
$rateLimitMsg = '';
$rateLimitSecs = 0;

// ── Resend verification ──────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['resend_email'])) {
    $resendEmail = trim($_POST['resend_email'] ?? '');
    if (filter_var($resendEmail, FILTER_VALIDATE_EMAIL)) {
        $uStmt = $pdo->prepare("SELECT id, username, email_verified FROM users WHERE email_blind_index = ? LIMIT 1");
        $uStmt->execute([emailBlindIndex($resendEmail)]);
        $uRow = $uStmt->fetch();
        if ($uRow && !(int)$uRow['email_verified']) {
            $lastStmt = $pdo->prepare("SELECT created_at FROM email_verifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1");
            $lastStmt->execute([$uRow['id']]);
            $lastRow  = $lastStmt->fetch();
            $secsLeft = $lastRow ? max(0, 60 - (time() - strtotime($lastRow['created_at']))) : 0;
            if ($secsLeft === 0) {
                sendVerificationEmail($pdo, $uRow['id'], $resendEmail, $uRow['username']);
            }
        }
        $pendingEmail = $resendEmail;
        $success      = true;
    }
}

// ── Registration ─────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !isset($_POST['resend_email'])) {
    $username = trim($_POST['username'] ?? '');
    $email    = trim($_POST['email']    ?? '');
    $password = $_POST['password']      ?? '';
    $confirm  = $_POST['confirm']       ?? '';
    $terms    = isset($_POST['terms']);

    // ── Cloudflare Turnstile verification ────────────────────────────────────
    $turnstileToken    = $_POST['cf-turnstile-response'] ?? '';
    $turnstileSecret   = '0x4AAAAAADVikPvO7DjCxRoVjVFL1BZvyxc'; // <-- înlocuiește cu secretul tău din Cloudflare
    $turnstileValid    = false;
    if ($turnstileToken) {
        $tsIp  = trim(explode(',', $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '')[0]);
        $tsCtx = stream_context_create(['http' => [
            'method'  => 'POST',
            'header'  => 'Content-Type: application/x-www-form-urlencoded',
            'content' => http_build_query(['secret' => $turnstileSecret, 'response' => $turnstileToken, 'remoteip' => $tsIp]),
            'timeout' => 5,
        ]]);
        $tsRes = @file_get_contents('https://challenges.cloudflare.com/turnstile/v0/siteverify', false, $tsCtx);
        if ($tsRes) {
            $tsData = json_decode($tsRes, true);
            $turnstileValid = !empty($tsData['success']);
        }
    }
    if (!$turnstileValid)
        $error = 'Security check failed. Please try again.';
    elseif (!$username || !$email || !$password)
        $error = 'Please fill in all fields.';
    elseif (!validateUsername($username))
        $error = 'Username: 3-30 characters, letters/digits/_ - .';
    elseif (!filter_var($email, FILTER_VALIDATE_EMAIL))
        $error = 'Invalid email address.';
    elseif (!isAllowedEmailDomain($email))
        $error = 'Please use a real email address (Gmail, Outlook, Yahoo, iCloud etc.).';
    elseif (strlen($password) < 8)
        $error = 'Password must be at least 8 characters.';
    elseif ($password !== $confirm)
        $error = 'Passwords do not match.';
    elseif (!$terms)
        $error = 'You must agree to the Terms of Service and Privacy Policy.';
    else {
        // Check if email/username exists
        $chk = $pdo->prepare("SELECT id, email_verified FROM users WHERE username=? OR email_blind_index=?");
        $chk->execute([$username, emailBlindIndex($email)]);
        $existing = $chk->fetch();

        if ($existing) {
            // If account exists but not verified — show rate-limit modal instead of error
            if (!(int)$existing['email_verified']) {
                $lastStmt = $pdo->prepare("SELECT created_at FROM email_verifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1");
                $lastStmt->execute([$existing['id']]);
                $lastRow  = $lastStmt->fetch();
                $secsLeft = $lastRow ? max(0, 60 - (time() - strtotime($lastRow['created_at']))) : 0;
                $rateLimitSecs = $secsLeft;
                $pendingEmail  = $email;
                $rateLimitMsg  = true;
                // Resend only if cooldown passed
                if ($secsLeft === 0) {
                    sendVerificationEmail($pdo, $existing['id'], $email, $username);
                }
            } else {
                $error = 'Username or email already in use.';
            }
        } else {
            // ── Limită maxim 3 conturi per IP ────────────────────────────────
            $regIp     = trim(explode(',', $_SERVER['HTTP_CF_CONNECTING_IP']
                            ?? $_SERVER['HTTP_X_FORWARDED_FOR']
                            ?? $_SERVER['REMOTE_ADDR']
                            ?? '')[0]);
            $regIpHash = hash('sha256', $regIp);

            $ipCountStmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE reg_ip_hash = ?");
            $ipCountStmt->execute([$regIpHash]);
            if ((int)$ipCountStmt->fetchColumn() >= 3) {
                $error = 'Maximum 3 accounts can be registered from the same IP address.';
            } else {

            $hash    = password_hash($password, PASSWORD_BCRYPT);
            $refCode = strtoupper(substr(md5($username . time()), 0, 8));

            // Validate referral code now but save it — tokens are awarded after email verify
            $refInput   = trim($_POST['referral_code'] ?? '');
            $pendingRef = null;
            if ($refInput !== '') {
                $refCheckStmt = $pdo->prepare("SELECT id FROM users WHERE referral_code=? OR username=? LIMIT 1");
                $refCheckStmt->execute([$refInput, $refInput]);
                if ($refCheckStmt->fetch()) {
                    $pendingRef = $refInput; // valid — store for later
                }
            }

            $pdo->beginTransaction();
            try {
                $pdo->prepare("INSERT INTO users (username, email, email_blind_index, password, referral_code, referred_by, email_verified, reg_ip_hash) VALUES (?,?,?,?,?,?,0,?)")
                    ->execute([$username, encryptEmail($email), emailBlindIndex($email), $hash, $refCode, $pendingRef, $regIpHash]);
                $uid = $pdo->lastInsertId();

                $pdo->prepare("INSERT INTO profiles (user_id, display_name, cursor_trail, particle_effect) VALUES (?,?,0,0)")
                    ->execute([$uid, $username]);

                $pdo->commit();
                sendVerificationEmail($pdo, $uid, $email, $username);
                $success      = true;
                $pendingEmail = $email;

            } catch (Exception $e) {
                $pdo->rollBack();
                $error = 'Registration error. Please try again.';
            }

            } // end IP limit check
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= SITE_NAME ?> — Register</title>
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Outfit:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/main.css?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/css/main.css') ?: time() ?>">
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <style>
        /* ── Overlays shared ── */
        .modal-overlay {
            position: fixed; inset: 0; z-index: 1000;
            display: flex; align-items: center; justify-content: center;
            padding: 1.5rem;
            background: rgba(5,5,10,0.92);
            backdrop-filter: blur(10px);
            animation: overlayIn .3s ease both;
        }
        @keyframes overlayIn { from{opacity:0} to{opacity:1} }

        .modal-card {
            background: rgba(10,10,22,0.98);
            border: 1px solid rgba(255,255,255,.1);
            border-radius: 20px;
            padding: 2.25rem 2rem 2rem;
            width: 100%; max-width: 420px;
            text-align: center;
            box-shadow: 0 30px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.04) inset;
            animation: modalIn .4s cubic-bezier(.22,1,.36,1) both;
            position: relative; overflow: hidden;
        }
        .modal-card::before {
            content:''; position:absolute; top:0;left:0;right:0; height:2px;
            background:linear-gradient(90deg,transparent,var(--accent),var(--accent2),transparent);
        }
        @keyframes modalIn {
            from{opacity:0;transform:scale(.93) translateY(20px)}
            to{opacity:1;transform:scale(1) translateY(0)}
        }

        /* ── Envelope modal ── */
        .envelope-wrap { position:relative; width:80px; height:80px; margin:0 auto 1.5rem; }
        .envelope-bg {
            width:80px; height:80px; border-radius:50%;
            background:radial-gradient(circle,rgba(0,212,255,.15) 0%,rgba(0,212,255,.04) 100%);
            border:1.5px solid rgba(0,212,255,.3);
            display:flex; align-items:center; justify-content:center;
            position:relative; animation:envFloat 3s ease-in-out infinite;
        }
        @keyframes envFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        .envelope-bg::before,.envelope-bg::after {
            content:''; position:absolute; inset:0; border-radius:50%;
            border:1.5px solid rgba(0,212,255,.25);
            animation:ping 2.4s ease-out infinite;
        }
        .envelope-bg::after { animation-delay:1.2s; }
        @keyframes ping { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.8);opacity:0} }

        /* ── Rate-limit modal ── */
        .ratelimit-icon {
            width:80px; height:80px; border-radius:50%; margin:0 auto 1.5rem;
            background:radial-gradient(circle,rgba(255,80,80,.15) 0%,rgba(255,80,80,.03) 100%);
            border:1.5px solid rgba(255,80,80,.3);
            display:flex; align-items:center; justify-content:center;
            animation:envFloat 3s ease-in-out infinite;
        }
        .ratelimit-icon::before,.ratelimit-icon::after {
            content:''; position:absolute; inset:0; border-radius:50%;
            border:1.5px solid rgba(255,80,80,.2);
            animation:ping 2.4s ease-out infinite;
        }
        .ratelimit-icon::after { animation-delay:1.2s; }
        .ratelimit-icon { position:relative; }

        .modal-site { font-family:'Syne',sans-serif; font-size:.8rem; font-weight:800; color:var(--accent); letter-spacing:.1em; margin-bottom:1.25rem; display:block; }
        .modal-title {
            font-family:'Syne',sans-serif; font-size:1.35rem; font-weight:800; margin-bottom:.45rem;
            background:linear-gradient(135deg,#fff 0%,rgba(255,255,255,.75) 100%);
            -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }
        .modal-title.red {
            background:linear-gradient(135deg,#ff8080 0%,#ff4444 100%);
            -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }
        .modal-sub { color:var(--text-muted); font-size:.84rem; line-height:1.65; margin-bottom:1.4rem; }
        .modal-sub .hl { color:var(--accent); font-weight:600; word-break:break-all; }
        .modal-sub .hl-red { color:#ff8080; font-weight:600; }

        .verify-checklist {
            list-style:none; text-align:left;
            background:rgba(255,255,255,.03); border:1px solid var(--border);
            border-radius:10px; padding:.85rem 1rem; margin-bottom:1.5rem;
            display:flex; flex-direction:column; gap:.5rem;
        }
        .verify-checklist li { display:flex; align-items:center; gap:.6rem; font-size:.8rem; color:var(--text-muted); }
        .verify-checklist li span.check {
            width:18px; height:18px; border-radius:50%;
            background:rgba(0,212,255,.1); border:1px solid rgba(0,212,255,.25);
            display:flex; align-items:center; justify-content:center; flex-shrink:0;
        }

        /* Countdown bar */
        .countdown-bar-wrap {
            background:rgba(255,80,80,.07); border:1px solid rgba(255,80,80,.18);
            border-radius:10px; padding:.85rem 1rem; margin-bottom:1.4rem; text-align:left;
        }
        .countdown-bar-label {
            font-size:.78rem; color:rgba(255,128,128,.8); margin-bottom:.55rem;
            display:flex; align-items:center; gap:.4rem;
        }
        .countdown-bar-label strong { color:#ff8080; font-variant-numeric:tabular-nums; min-width:2em; }
        .countdown-bar-track {
            height:4px; border-radius:4px;
            background:rgba(255,80,80,.15); overflow:hidden;
        }
        .countdown-bar-fill {
            height:100%; border-radius:4px;
            background:linear-gradient(90deg,#ff5555,#ff8080);
            transition:width .9s linear;
        }

        .resend-wrap { margin-top:.75rem; font-size:.78rem; color:var(--text-muted); }
        .resend-btn {
            background:none; border:none; color:var(--accent);
            font-size:.78rem; font-weight:600; cursor:pointer; padding:0;
            text-decoration:underline; text-underline-offset:2px; transition:opacity .2s;
        }
        .resend-btn:hover{opacity:.75}
        .resend-btn:disabled{opacity:.4;cursor:default;text-decoration:none}

        .modal-btn-row { display:flex; flex-direction:column; gap:.6rem; margin-top:1rem; }

        /* ── Turnstile widget ── */
        .turnstile-wrap {
            display: flex;
            justify-content: center;
            margin-bottom: 1rem;
        }
    </style>
</head>
<body class="auth-page">
    <canvas id="particle-canvas" style="position:fixed;inset:0;z-index:0;pointer-events:none;"></canvas>

    <?php if ($success && !$rateLimitMsg): ?>
    <!-- ── Email sent overlay ── -->
    <div class="modal-overlay" id="verify-overlay">
        <div class="modal-card">
            <span class="modal-site"><?= SITE_NAME ?></span>
            <div class="envelope-wrap">
                <div class="envelope-bg">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>
                </div>
            </div>
            <h2 class="modal-title">Check your inbox</h2>
            <p class="modal-sub">
                We sent a verification link to<br>
                <span class="hl"><?= sanitize($pendingEmail) ?></span><br>
                Click the link to activate your account.
            </p>
            <ul class="verify-checklist">
                <li><span class="check"><svg width="10" height="10" viewBox="0 0 12 10" fill="none" stroke="#00d4ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 5 4.5 8.5 11 1"/></svg></span> Open the email from <strong style="color:var(--text)"><?= SITE_NAME ?></strong></li>
                <li><span class="check"><svg width="10" height="10" viewBox="0 0 12 10" fill="none" stroke="#00d4ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 5 4.5 8.5 11 1"/></svg></span> Click the <strong style="color:var(--text)">Verify My Email</strong> button inside</li>
                <li><span class="check"><svg width="10" height="10" viewBox="0 0 12 10" fill="none" stroke="#00d4ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 5 4.5 8.5 11 1"/></svg></span> Check your <strong style="color:var(--text)">spam / junk</strong> folder if needed</li>
            </ul>
            <div class="resend-wrap">
                Didn't get it?
                <button class="resend-btn" id="resend-btn" disabled>
                    Resend in <span id="resend-timer">60</span>s
                </button>
            </div>
            <form method="POST" id="resend-form" style="display:none">
                <input type="hidden" name="resend_email" value="<?= sanitize($pendingEmail) ?>">
            </form>
        </div>
    </div>
    <script>
    let secs = 60;
    const timerEl = document.getElementById('resend-timer');
    const resendBtn = document.getElementById('resend-btn');
    const iv = setInterval(() => {
        secs--;
        if (secs <= 0) { clearInterval(iv); resendBtn.disabled = false; resendBtn.textContent = 'Resend email'; }
        else { timerEl.textContent = secs; }
    }, 1000);
    resendBtn.addEventListener('click', () => { document.getElementById('resend-form').submit(); });
    </script>
    <?php endif; ?>

    <?php if ($rateLimitMsg): ?>
    <!-- ── Rate-limit / already registered overlay ── -->
    <div class="modal-overlay" id="ratelimit-overlay">
        <div class="modal-card">
            <span class="modal-site"><?= SITE_NAME ?></span>
            <div class="ratelimit-icon">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ff8080" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h2 class="modal-title red">Already registered!</h2>
            <p class="modal-sub">
                An account with <span class="hl-red"><?= sanitize($pendingEmail) ?></span> already exists but is <strong style="color:#ff8080">not verified yet</strong>.<br><br>
                <?php if ($rateLimitSecs > 0): ?>
                    A verification email was recently sent. Please wait before requesting another one.
                <?php else: ?>
                    We just sent you a new verification link. Check your inbox!
                <?php endif; ?>
            </p>

            <?php if ($rateLimitSecs > 0): ?>
            <div class="countdown-bar-wrap">
                <div class="countdown-bar-label">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ff8080" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Wait <strong id="rl-secs"><?= $rateLimitSecs ?></strong>s before resending
                </div>
                <div class="countdown-bar-track">
                    <div class="countdown-bar-fill" id="rl-bar" style="width:<?= round(($rateLimitSecs/60)*100) ?>%"></div>
                </div>
            </div>
            <?php endif; ?>

            <div class="modal-btn-row">
                <?php if ($rateLimitSecs <= 0): ?>
                <a href="/register" class="btn btn-primary btn-full" style="background:linear-gradient(135deg,rgba(255,80,80,.2),rgba(255,80,80,.1));border:1px solid rgba(255,80,80,.35);color:#ff8080">
                    Back to register
                </a>
                <?php else: ?>
                <button id="rl-resend-btn" class="btn btn-primary btn-full" disabled
                    style="background:linear-gradient(135deg,rgba(255,80,80,.2),rgba(255,80,80,.1));border:1px solid rgba(255,80,80,.35);color:#ff8080;opacity:.5">
                    Resend in <span id="rl-btn-timer"><?= $rateLimitSecs ?></span>s
                </button>
                <?php endif; ?>
                <a href="/login" class="btn btn-secondary btn-full">Sign in instead</a>
            </div>

            <form method="POST" id="rl-resend-form" style="display:none">
                <input type="hidden" name="resend_email" value="<?= sanitize($pendingEmail) ?>">
            </form>
        </div>
    </div>
    <?php if ($rateLimitSecs > 0): ?>
    <script>
    let rlSecs = <?= (int)$rateLimitSecs ?>;
    const total = 60;
    const rlSecsEl  = document.getElementById('rl-secs');
    const rlBar     = document.getElementById('rl-bar');
    const rlBtn     = document.getElementById('rl-resend-btn');
    const rlBtnTimer= document.getElementById('rl-btn-timer');
    const rlIv = setInterval(() => {
        rlSecs--;
        if (rlSecs <= 0) {
            clearInterval(rlIv);
            rlBar.style.width = '0%';
            rlBtn.disabled = false;
            rlBtn.style.opacity = '1';
            rlBtnTimer.parentElement.innerHTML = 'Resend verification email';
            if (rlSecsEl) rlSecsEl.textContent = '0';
        } else {
            if (rlSecsEl) rlSecsEl.textContent = rlSecs;
            if (rlBtnTimer) rlBtnTimer.textContent = rlSecs;
            rlBar.style.width = Math.round((rlSecs/total)*100) + '%';
        }
    }, 1000);
    document.getElementById('rl-resend-btn').addEventListener('click', () => {
        if (!document.getElementById('rl-resend-btn').disabled)
            document.getElementById('rl-resend-form').submit();
    });
    </script>
    <?php endif; ?>
    <?php endif; ?>

    <!-- ── Registration form ── -->
    <div class="auth-card fade-in" style="position:relative;z-index:1;">
        <div class="auth-logo">
            <h1><?= SITE_NAME ?></h1>
            <p>Create your free account</p>
        </div>

        <?php if ($error): ?>
        <div class="alert alert-error">⚠ <?= sanitize($error) ?></div>
        <?php endif; ?>

        <form method="POST" id="register-form">
            <div class="form-group">
                <label>Username</label>
                <div class="username-input-wrap">
                    <span class="username-at">@</span>
                    <input type="text" name="username" id="username-input" class="form-control username-field"
                        placeholder="username"
                        value="<?= sanitize($_POST['username'] ?? $_GET['u'] ?? '') ?>"
                        maxlength="30" autocomplete="username">
                </div>
                <div class="username-preview"><?= SITE_NAME ?>/<span id="username-preview-value">username</span></div>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" name="email" class="form-control" placeholder="email@example.com"
                    value="<?= sanitize($_POST['email'] ?? '') ?>" autocomplete="email">
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" name="password" id="password-input" class="form-control" placeholder="Min. 8 characters" autocomplete="new-password">
                <div id="pw-bar-wrap" style="display:none;margin-top:6px;">
                    <div style="height:4px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden;">
                        <div id="pw-bar-fill" style="height:100%;width:0%;border-radius:4px;transition:width .3s,background .3s;"></div>
                    </div>
                    <div id="pw-bar-label" style="font-size:.72rem;margin-top:4px;font-weight:600;letter-spacing:.03em;"></div>
                </div>
            </div>
            <div class="form-group">
                <label>Confirm password</label>
                <input type="password" name="confirm" class="form-control" placeholder="Repeat password" autocomplete="new-password">
            </div>
            <div class="form-group" style="margin-bottom:.85rem">
                <label>Referral Code <span style="color:rgba(255,255,255,.3);font-size:.7em;text-transform:none;letter-spacing:0;font-weight:400">(optional)</span></label>
                <input type="text" name="referral_code" class="form-control"
                    placeholder="Enter referral code or username"
                    value="<?= sanitize($_POST['referral_code'] ?? ($_GET['ref'] ?? '')) ?>"
                    maxlength="20" autocomplete="off" style="font-family:'Space Mono',monospace;letter-spacing:.04em">
            </div>
            <label class="terms-wrap" id="terms-wrap">
                <input type="checkbox" name="terms" id="terms-check" style="display:none">
                <span class="terms-box" id="terms-box">
                    <svg id="terms-check-icon" viewBox="0 0 12 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 5 4.5 8.5 11 1"/></svg>
                </span>
                <span class="terms-text">I AGREE TO THE <a href="/terms" target="_blank">TERMS OF SERVICE</a> AND <a href="/privacy" target="_blank">PRIVACY POLICY</a></span>
            </label>
            <div class="turnstile-wrap">
                <div class="cf-turnstile"
                     data-sitekey="0x4AAAAAADVikD2YYYTsbrFd"
                     data-callback="onTurnstileSuccess"
                     data-expired-callback="onTurnstileExpired"
                     data-theme="dark">
                </div>
            </div>
            <button type="submit" id="register-submit" class="btn btn-primary btn-full" disabled>Create account</button>
        </form>
        <div class="auth-footer">Already have an account? <a href="/login">Sign in</a></div>
    </div>

    <script>
    const usernameInput = document.getElementById('username-input');
    const previewValue  = document.getElementById('username-preview-value');
    usernameInput.addEventListener('input', () => { previewValue.textContent = usernameInput.value.trim() || 'username'; });
    previewValue.textContent = usernameInput.value.trim() || 'username';

    const termsWrap  = document.getElementById('terms-wrap');
    const termsCheck = document.getElementById('terms-check');
    const termsBox   = document.getElementById('terms-box');
    const termsIcon  = document.getElementById('terms-check-icon');
    const submitBtn  = document.getElementById('register-submit');
    let turnstileDone = false;

    function updateSubmitBtn() {
        submitBtn.disabled = !(termsCheck.checked && turnstileDone);
    }

    // Turnstile callbacks
    window.onTurnstileSuccess = function() { turnstileDone = true;  updateSubmitBtn(); };
    window.onTurnstileExpired = function() { turnstileDone = false; updateSubmitBtn(); };

    function syncTerms() {
        if (termsCheck.checked) { termsBox.classList.add('checked'); termsIcon.style.display='block'; }
        else { termsBox.classList.remove('checked'); termsIcon.style.display='none'; }
        updateSubmitBtn();
    }
    termsWrap.addEventListener('click', e => { if(e.target.tagName==='A')return; e.preventDefault(); termsCheck.checked=!termsCheck.checked; syncTerms(); });
    syncTerms();

    // ── Password strength indicator ──────────────────────────────────────────
    (function() {
        const pwInput  = document.getElementById('password-input');
        const barWrap  = document.getElementById('pw-bar-wrap');
        const barFill  = document.getElementById('pw-bar-fill');
        const barLabel = document.getElementById('pw-bar-label');
        function getStrength(pw) {
            let s = 0;
            if (pw.length >= 8)  s++;
            if (pw.length >= 12) s++;
            if (/[A-Z]/.test(pw)) s++;
            if (/[0-9]/.test(pw)) s++;
            if (/[^A-Za-z0-9]/.test(pw)) s++;
            return s;
        }
        const levels = [
            { label: 'Too short',   color: '#ff4444', width: 10  },
            { label: 'Very weak',   color: '#ff6644', width: 20  },
            { label: 'Weak',        color: '#ff9900', width: 40  },
            { label: 'Fair',        color: '#ffcc00', width: 60  },
            { label: 'Strong',      color: '#66dd00', width: 80  },
            { label: 'Very strong', color: '#00e676', width: 100 },
        ];
        pwInput.addEventListener('input', function() {
            const val = pwInput.value;
            if (!val) { barWrap.style.display = 'none'; return; }
            barWrap.style.display = 'block';
            const lvl = levels[Math.min(getStrength(val), levels.length - 1)];
            barFill.style.width      = lvl.width + '%';
            barFill.style.background = lvl.color;
            barLabel.textContent     = lvl.label;
            barLabel.style.color     = lvl.color;
        });
    })();
    window.PARTICLE_ENABLED = true; window.CURSOR_TRAIL_ENABLED = false; window.ACCENT_COLOR = '#00d4ff';
    </script>
    <script src="/assets/js/particles.js?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/js/particles.js') ?: time() ?>"></script>
<?php include __DIR__ . '/../partials/cookie_banner.php'; ?>
</body>
</html>