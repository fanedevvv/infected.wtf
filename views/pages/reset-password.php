<?php
/**
 * views/pages/reset-password.php
 * Ruta: /reset-password?token=XXXX
 * Arată formularul de setare parolă nouă dacă tokenul e valid.
 */

if (isLoggedIn()) { redirect('/dashboard'); }

$rawToken = trim($_GET['token'] ?? '');
$status   = 'form';   // form | invalid | expired | success
$resetRow = null;
$formError = '';

// ── Validăm tokenul ───────────────────────────────────────────────────────────
if (!$rawToken) {
    $status = 'invalid';
} else {
    $tokenHash = hash('sha256', $rawToken);
    try {
        $stmt = $pdo->prepare(
            "SELECT pr.id, pr.user_id, pr.expires_at, u.username, u.email
             FROM password_resets pr
             JOIN users u ON u.id = pr.user_id
             WHERE pr.token_hash = ?
             LIMIT 1"
        );
        $stmt->execute([$tokenHash]);
        $resetRow = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (\Exception $e) {
        $status = 'invalid';
    }

    if ($status !== 'invalid') {
        if (!$resetRow) {
            $status = 'invalid';
        } elseif (strtotime($resetRow['expires_at']) < time()) {
            $pdo->prepare("DELETE FROM password_resets WHERE id = ?")->execute([$resetRow['id']]);
            $status = 'expired';
        }
    }
}

// ── Procesăm formularul de resetare ──────────────────────────────────────────
if ($status === 'form' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $newPw  = $_POST['new_password']     ?? '';
    $confPw = $_POST['confirm_password'] ?? '';

    if (strlen($newPw) < 6) {
        $formError = 'Password must be at least 6 characters.';
    } elseif ($newPw !== $confPw) {
        $formError = 'Passwords do not match.';
    } else {
        $hash = password_hash($newPw, PASSWORD_DEFAULT);
        $pdo->prepare("UPDATE users SET password = ? WHERE id = ?")->execute([$hash, $resetRow['user_id']]);
        $pdo->prepare("DELETE FROM password_resets WHERE user_id = ?")->execute([$resetRow['user_id']]);
        $status = 'success';
    }
}

$typeLabel = 'Reset Password';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= SITE_NAME ?> — Reset Password</title>
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Outfit:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/main.css?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/css/main.css') ?: time() ?>">
    <style>
        .confirm-wrap {
            display:flex; min-height:100vh; align-items:center; justify-content:center;
            padding:1.5rem; background:var(--bg); position:relative; overflow:hidden;
        }
        .confirm-wrap::before,.confirm-wrap::after {
            content:''; position:fixed; border-radius:50%; filter:blur(120px); opacity:.1; pointer-events:none;
            animation:blobFloat 8s ease-in-out infinite alternate;
        }
        .confirm-wrap::before { width:500px;height:500px;background:var(--accent);top:-150px;right:-100px; }
        .confirm-wrap::after  { width:400px;height:400px;background:var(--accent2);bottom:-100px;left:-100px;animation-delay:-4s; }
        @keyframes blobFloat { from{transform:translate(0,0) scale(1)} to{transform:translate(30px,20px) scale(1.1)} }

        .confirm-card {
            position:relative; z-index:1;
            background:rgba(8,8,20,0.85);
            border:1px solid var(--glass-border);
            backdrop-filter:blur(24px);
            border-radius:20px; padding:2.5rem 2rem;
            width:100%; max-width:420px; text-align:center;
            box-shadow:0 20px 60px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.05) inset;
            animation:cardIn .5s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes cardIn { from{opacity:0;transform:translateY(28px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }

        .ci {
            width:72px; height:72px; border-radius:50%;
            display:flex; align-items:center; justify-content:center;
            margin:0 auto 1.25rem; position:relative;
        }
        .ci.success { background:radial-gradient(circle,rgba(0,212,255,.18),rgba(0,212,255,.05)); border:1.5px solid rgba(0,212,255,.35); box-shadow:0 0 30px rgba(0,212,255,.2); }
        .ci.warning { background:radial-gradient(circle,rgba(255,180,0,.18),rgba(255,180,0,.05)); border:1.5px solid rgba(255,180,0,.35); }
        .ci.lock    { background:radial-gradient(circle,rgba(255,0,255,.15),rgba(0,212,255,.1)); border:1.5px solid rgba(0,212,255,.28); }
        .ci.success::before { content:''; position:absolute; inset:-8px; border-radius:50%; border:1.5px solid rgba(0,212,255,.25); animation:pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.1);opacity:0} }

        .confirm-title {
            font-family:'Syne',sans-serif; font-size:1.45rem; font-weight:800; margin-bottom:.5rem;
            background:linear-gradient(135deg,#fff,rgba(255,255,255,.7));
            -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }
        .confirm-title.success-text { background:linear-gradient(135deg,var(--accent),#00ffcc); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

        .confirm-desc { color:var(--text-muted); font-size:.88rem; line-height:1.65; margin-bottom:1.5rem; }
        .confirm-desc strong { color:var(--text); }

        .site-logo { font-family:'Syne',sans-serif; font-size:1rem; font-weight:800; color:var(--accent); letter-spacing:.08em; text-decoration:none; display:inline-block; margin-bottom:1.75rem; }
        .divider { height:1px; background:var(--border); margin:1.25rem 0; }
        .btn-row { display:flex; flex-direction:column; gap:.65rem; }

        /* Form styles — matching main.css patterns */
        .rp-field { text-align:left; margin-bottom:1rem; }
        .rp-label { display:block; font-size:.75rem; font-weight:600; color:var(--text-muted); margin-bottom:.4rem; text-transform:uppercase; letter-spacing:.06em; }
        .rp-input {
            width:100%; background:rgba(255,255,255,.06); border:1.5px solid rgba(255,255,255,.1);
            border-radius:12px; padding:.75rem 1rem; color:#fff; font-size:.92rem;
            font-family:'Outfit',sans-serif; outline:none; box-sizing:border-box;
            transition:border-color .2s, box-shadow .2s;
        }
        .rp-input:focus { border-color:rgba(0,212,255,.5); box-shadow:0 0 0 3px rgba(0,212,255,.1); }
        .rp-input::placeholder { color:rgba(255,255,255,.2); }

        .rp-error {
            background:rgba(255,80,80,.08); border:1px solid rgba(255,80,80,.25);
            border-radius:10px; padding:.65rem .9rem; color:#ff8080;
            font-size:.82rem; margin-bottom:1rem; text-align:left;
            display:flex; align-items:center; gap:.5rem;
        }

        /* Strength bar */
        .pw-strength { height:3px; border-radius:3px; margin-top:.4rem; background:rgba(255,255,255,.07); overflow:hidden; }
        .pw-strength-bar { height:100%; border-radius:3px; transition:width .3s, background .3s; width:0%; }

        .redirect-bar {
            background:rgba(0,212,255,.07); border:1px solid rgba(0,212,255,.15);
            border-radius:8px; padding:.6rem 1rem; font-size:.78rem; color:var(--accent);
            margin-bottom:1.5rem; display:flex; align-items:center; gap:.5rem; justify-content:center;
        }
    </style>
</head>
<body>
    <canvas id="particle-canvas" style="position:fixed;inset:0;z-index:0;pointer-events:none;"></canvas>
    <div class="confirm-wrap">
        <div class="confirm-card">
            <a href="/" class="site-logo"><?= SITE_NAME ?></a>

            <?php if ($status === 'invalid'): ?>
                <div class="ci warning">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffb400" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                </div>
                <h1 class="confirm-title">Invalid or Expired Link</h1>
                <p class="confirm-desc">This password reset link is <strong>invalid or has already been used</strong>. Please request a new one.</p>
                <div class="btn-row">
                    <a href="/login" class="btn btn-primary btn-full">Request New Link</a>
                    <a href="/" class="btn btn-secondary btn-full">Home</a>
                </div>

            <?php elseif ($status === 'expired'): ?>
                <div class="ci warning">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffb400" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                </div>
                <h1 class="confirm-title">Link Expired</h1>
                <p class="confirm-desc">This reset link has <strong>expired</strong> (valid for 1 hour). Please go back and request a new one.</p>
                <div class="btn-row">
                    <a href="/login" class="btn btn-primary btn-full">Request New Link</a>
                    <a href="/" class="btn btn-secondary btn-full">Home</a>
                </div>

            <?php elseif ($status === 'success'): ?>
                <div class="ci success">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/><polyline points="7 12 10.5 15.5 17 9"/>
                    </svg>
                </div>
                <h1 class="confirm-title success-text">Password Reset!</h1>
                <p class="confirm-desc">Your password has been changed successfully. You can now sign in with your new password.</p>
                <div class="redirect-bar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Redirecting to login in <span id="cd">3</span>s
                </div>
                <div class="btn-row">
                    <a href="/login" class="btn btn-primary btn-full">Sign In →</a>
                </div>
                <script>
                let t=3; const cd=document.getElementById('cd');
                const iv=setInterval(()=>{ t--; cd.textContent=t; if(t<=0){clearInterval(iv);location.href='/login';} },1000);
                </script>

            <?php else: /* form */ ?>
                <div class="ci lock">
                    <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="32" height="32">
                        <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ff00ff"/><stop offset="100%" stop-color="#00d4ff"/></linearGradient></defs>
                        <rect x="3" y="11" width="18" height="11" rx="2" stroke="url(#lg)"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="url(#lg)"/>
                    </svg>
                </div>
                <h1 class="confirm-title">Set New Password</h1>
                <p class="confirm-desc">
                    Setting a new password for
                    <strong><?= sanitize($resetRow['username']) ?></strong>
                </p>

                <?php if ($formError): ?>
                <div class="rp-error">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <?= sanitize($formError) ?>
                </div>
                <?php endif; ?>

                <form method="POST">
                    <div class="rp-field">
                        <label class="rp-label">New Password</label>
                        <input class="rp-input" type="password" name="new_password"
                               placeholder="At least 6 characters"
                               autocomplete="new-password"
                               oninput="checkStrength(this.value)" required>
                        <div class="pw-strength"><div class="pw-strength-bar" id="pw-bar"></div></div>
                    </div>
                    <div class="rp-field">
                        <label class="rp-label">Confirm Password</label>
                        <input class="rp-input" type="password" name="confirm_password"
                               placeholder="Repeat new password"
                               autocomplete="new-password" required>
                    </div>
                    <button type="submit" class="btn btn-primary btn-full" style="margin-top:.25rem">
                        Set New Password
                    </button>
                </form>

                <div class="divider"></div>
                <p style="font-size:.75rem;color:var(--text-muted)">
                    <a href="/login" style="color:var(--accent);text-decoration:none">← Back to Login</a>
                </p>
            <?php endif; ?>

            <?php if ($status === 'form' || $status === 'invalid' || $status === 'expired'): ?>
            <div class="divider"></div>
            <p style="font-size:.75rem;color:var(--text-muted);">Need help? <a href="/support" style="color:var(--accent);text-decoration:none;">Contact Support</a></p>
            <?php endif; ?>
        </div>
    </div>

    <script>
    function checkStrength(pw) {
        const bar = document.getElementById('pw-bar');
        if (!bar) return;
        let score = 0;
        if (pw.length >= 6)  score++;
        if (pw.length >= 10) score++;
        if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        const colors = ['#ff4444','#ff8c00','#ffd700','#34d399','#00d4ff'];
        const widths  = ['20%','40%','60%','80%','100%'];
        bar.style.width      = pw.length ? widths[Math.min(score,4)] : '0%';
        bar.style.background = pw.length ? colors[Math.min(score,4)] : 'transparent';
    }
    </script>
    <script>window.PARTICLE_ENABLED=true;window.ACCENT_COLOR='#00d4ff';</script>
    <script src="/assets/js/particles.js?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/js/particles.js') ?: time() ?>"></script>
</body>
</html>