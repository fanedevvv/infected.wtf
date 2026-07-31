<?php
/* loaded by router — handles /auth/confirm-action?token=XXX&type=YYY */

$token = trim($_GET['token'] ?? '');
$type  = trim($_GET['type']  ?? '');
$status= 'invalid'; // invalid | expired | success | already
$msg   = '';

$allowedTypes = ['email_change','change_password','delete_account','relogin'];
if ($token && in_array($type, $allowedTypes, true)) {

    if ($type === 'email_change') {
        $stmt = $pdo->prepare("SELECT * FROM email_change_pending WHERE token=? AND expires_at > NOW() LIMIT 1");
        $stmt->execute([$token]);
        $row = $stmt->fetch();
        if (!$row) {
            $usedChk = $pdo->prepare("SELECT id FROM email_change_pending WHERE token=?");
            $usedChk->execute([$token]);
            $status = $usedChk->fetch() ? 'already' : 'invalid';
        } else {
            // Decriptăm new_email din pending (stocat criptat), re-criptăm pentru users + actualizăm blind index
            $plainNewEmail = decryptEmail($row['new_email']);
            $pdo->prepare("UPDATE users SET email=?, email_blind_index=?, email_verified=1 WHERE id=?")
                ->execute([encryptEmail($plainNewEmail), emailBlindIndex($plainNewEmail), $row['user_id']]);
            $pdo->prepare("DELETE FROM email_change_pending WHERE user_id=?")->execute([$row['user_id']]);
            $status = 'success';
            $msg    = 'Your email has been updated to <strong>' . htmlspecialchars($row['new_email']) . '</strong>.';
            $_SESSION['user_id'] = $row['user_id'];
        }
    } else {
        $stmt = $pdo->prepare("SELECT * FROM action_confirmations WHERE token=? AND action_type=? AND expires_at > NOW() AND used=0 LIMIT 1");
        $stmt->execute([$token, $type]);
        $row = $stmt->fetch();
        if (!$row) {
            $usedChk = $pdo->prepare("SELECT id FROM action_confirmations WHERE token=? AND used=1");
            $usedChk->execute([$token]);
            $status = $usedChk->fetch() ? 'already' : 'invalid';
        } else {
            $pdo->prepare("UPDATE action_confirmations SET used=1, used_at=NOW() WHERE id=?")->execute([$row['id']]);

            if ($type === 'change_password') {
                $pdo->prepare("UPDATE users SET password=? WHERE id=?")->execute([$row['payload'], $row['user_id']]);
                $status = 'success';
                $msg    = 'Your password has been changed successfully.';
            } elseif ($type === 'delete_account') {
                $pdo->prepare("DELETE FROM users WHERE id=?")->execute([$row['user_id']]);
                session_destroy();
                $status = 'success';
                $msg    = 'Your account has been permanently deleted.';
            } elseif ($type === 'relogin') {
                // Allow login — update last_login
                $pdo->prepare("UPDATE users SET last_login=NOW() WHERE id=?")->execute([$row['user_id']]);
                $_SESSION['user_id'] = $row['user_id'];
                $uRow = $pdo->prepare("SELECT username FROM users WHERE id=?");
                $uRow->execute([$row['user_id']]);
                $uData = $uRow->fetch();
                $_SESSION['username'] = $uData['username'] ?? '';
                $status = 'success';
                $msg    = 'Identity confirmed. Redirecting to your dashboard…';
            }
        }
    }
}

$typeLabels = [
    'email_change'    => 'Email Change',
    'change_password' => 'Password Change',
    'delete_account'  => 'Account Deletion',
    'relogin'         => 'Identity Verification',
    ''                => 'Action',
];
$typeLabel = $typeLabels[$type] ?? 'Action';
$isDelete  = ($type === 'delete_account');
$isRelogin = ($type === 'relogin');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= SITE_NAME ?> — <?= $typeLabel ?></title>
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
        .ci.danger  { background:radial-gradient(circle,rgba(255,60,60,.18),rgba(255,60,60,.05)); border:1.5px solid rgba(255,60,60,.35); }
        .ci.warning { background:radial-gradient(circle,rgba(255,180,0,.18),rgba(255,180,0,.05)); border:1.5px solid rgba(255,180,0,.35); }
        .ci.success::before { content:''; position:absolute; inset:-8px; border-radius:50%; border:1.5px solid rgba(0,212,255,.25); animation:pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.1);opacity:0} }

        .confirm-title {
            font-family:'Syne',sans-serif; font-size:1.45rem; font-weight:800; margin-bottom:.5rem;
            background:linear-gradient(135deg,#fff,rgba(255,255,255,.7));
            -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }
        .confirm-title.success-text { background:linear-gradient(135deg,var(--accent),#00ffcc); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .confirm-title.danger-text  { background:linear-gradient(135deg,#ff8080,#ff4444); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

        .confirm-desc { color:var(--text-muted); font-size:.88rem; line-height:1.65; margin-bottom:1.75rem; }
        .confirm-desc strong { color:var(--text); }
        .redirect-bar {
            background:rgba(0,212,255,.07); border:1px solid rgba(0,212,255,.15);
            border-radius:8px; padding:.6rem 1rem; font-size:.78rem; color:var(--accent);
            margin-bottom:1.5rem; display:flex; align-items:center; gap:.5rem; justify-content:center;
        }
        .site-logo { font-family:'Syne',sans-serif; font-size:1rem; font-weight:800; color:var(--accent); letter-spacing:.08em; text-decoration:none; display:inline-block; margin-bottom:1.75rem; }
        .divider { height:1px; background:var(--border); margin:1.25rem 0; }
        .btn-row { display:flex; flex-direction:column; gap:.65rem; }
    </style>
</head>
<body>
    <canvas id="particle-canvas" style="position:fixed;inset:0;z-index:0;pointer-events:none;"></canvas>
    <div class="confirm-wrap">
        <div class="confirm-card">
            <a href="/" class="site-logo"><?= SITE_NAME ?></a>

            <?php if ($status === 'success'): ?>
                <?php if ($isDelete): ?>
                    <div class="ci danger">
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ff8080" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                    </div>
                    <h1 class="confirm-title danger-text">Account Deleted</h1>
                    <p class="confirm-desc">Your account and all associated data have been <strong>permanently deleted</strong>. We're sorry to see you go.</p>
                    <div class="btn-row">
                        <a href="/" class="btn btn-secondary btn-full">Go Home</a>
                    </div>
                <?php elseif ($isRelogin): ?>
                    <div class="ci success">
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="7 12 10.5 15.5 17 9"/></svg>
                    </div>
                    <h1 class="confirm-title success-text">Identity Confirmed!</h1>
                    <p class="confirm-desc"><?= $msg ?></p>
                    <div class="redirect-bar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Redirecting in <span id="cd">3</span>s
                    </div>
                    <div class="btn-row">
                        <a href="/dashboard" class="btn btn-primary btn-full">Go to Dashboard →</a>
                    </div>
                    <script>
                    let t=3; const cd=document.getElementById('cd');
                    const iv=setInterval(()=>{ t--; cd.textContent=t; if(t<=0){clearInterval(iv);location.href='/dashboard';} },1000);
                    </script>
                <?php else: ?>
                    <div class="ci success">
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="7 12 10.5 15.5 17 9"/></svg>
                    </div>
                    <h1 class="confirm-title success-text"><?= $typeLabel ?> Confirmed!</h1>
                    <p class="confirm-desc"><?= $msg ?></p>
                    <div class="redirect-bar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Redirecting in <span id="cd">3</span>s
                    </div>
                    <div class="btn-row">
                        <a href="/dashboard/settings" class="btn btn-primary btn-full">Go to Settings →</a>
                    </div>
                    <script>
                    let t=3; const cd=document.getElementById('cd');
                    const iv=setInterval(()=>{ t--; cd.textContent=t; if(t<=0){clearInterval(iv);location.href='/dashboard/settings';} },1000);
                    </script>
                <?php endif; ?>

            <?php elseif ($status === 'already'): ?>
                <div class="ci success">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="7 12 10.5 15.5 17 9"/></svg>
                </div>
                <h1 class="confirm-title success-text">Already Confirmed</h1>
                <p class="confirm-desc">This action was already completed. No changes were made.</p>
                <div class="btn-row">
                    <a href="/dashboard" class="btn btn-primary btn-full">Dashboard</a>
                    <a href="/" class="btn btn-secondary btn-full">Home</a>
                </div>

            <?php else: ?>
                <div class="ci warning">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffb400" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <h1 class="confirm-title">Invalid or Expired Link</h1>
                <p class="confirm-desc">This confirmation link is <strong>invalid or has expired</strong>. Please try the action again from your settings.</p>
                <div class="btn-row">
                    <a href="/dashboard/settings" class="btn btn-primary btn-full">Back to Settings</a>
                    <a href="/" class="btn btn-secondary btn-full">Home</a>
                </div>
            <?php endif; ?>

            <div class="divider"></div>
            <p style="font-size:.75rem;color:var(--text-muted);">Need help? <a href="/support" style="color:var(--accent);text-decoration:none;">Contact Support</a></p>
        </div>
    </div>
    <script>window.PARTICLE_ENABLED=true;window.ACCENT_COLOR='#00d4ff';</script>
    <script src="/assets/js/particles.js?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/js/particles.js') ?: time() ?>"></script>
</body>
</html>