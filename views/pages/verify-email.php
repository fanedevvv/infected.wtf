<?php
/* Loaded by router — handles /auth/verify-email?token=XXX */

$token  = trim($_GET['token'] ?? '');
$status = 'invalid'; // invalid | expired | already | success

if ($token !== '') {
    $stmt = $pdo->prepare("
        SELECT ev.*, u.id AS user_id, u.username, u.email
        FROM email_verifications ev
        JOIN users u ON u.id = ev.user_id
        WHERE ev.token = ? AND ev.used = 0
        LIMIT 1
    ");
    $stmt->execute([$token]);
    $row = $stmt->fetch();

    if (!$row) {
        // Token not found — was either invalid or already used and deleted
        $status = 'invalid';
    } elseif (strtotime($row['expires_at']) < time()) {
        $status = 'expired';
    } else {
        // ── Activate account ──────────────────────────────
        $pdo->beginTransaction();
        try {
            // Mark user as verified
            $pdo->prepare("UPDATE users SET email_verified = 1 WHERE id = ?")->execute([$row['user_id']]);
            // Delete token after use (cleanup)
            $pdo->prepare("DELETE FROM email_verifications WHERE token = ?")->execute([$token]);
            $pdo->commit();
            $status = 'success';

            // ── Process referral now that email is verified ──
            try {
                $refRow = $pdo->prepare("SELECT referred_by FROM users WHERE id = ? LIMIT 1");
                $refRow->execute([$row['user_id']]);
                $refData = $refRow->fetch();
                if ($refData && !empty($refData['referred_by'])) {
                    $refInput = $refData['referred_by'];
                    $refStmt  = $pdo->prepare("SELECT id FROM users WHERE referral_code=? OR username=? LIMIT 1");
                    $refStmt->execute([$refInput, $refInput]);
                    $referrer = $refStmt->fetch();
                    if ($referrer && (int)$referrer['id'] !== (int)$row['user_id']) {
                        $referrerId = (int)$referrer['id'];
                        $premCheck  = $pdo->prepare("SELECT is_premium, premium_expires_at FROM users WHERE id=?");
                        $premCheck->execute([$referrerId]);
                        $refPremRow = $premCheck->fetch();
                        $refIsPrem  = $refPremRow
                            && (int)$refPremRow['is_premium'] === 1
                            && ($refPremRow['premium_expires_at'] === null || strtotime($refPremRow['premium_expires_at']) > time());
                        $refTokens  = $refIsPrem ? 20 : 10;
                        // x2 tokens event (safe — column may not exist on older installs)
                        try {
                            $x2Row = $pdo->query("SELECT x2_tokens_enabled FROM site_settings LIMIT 1")->fetch();
                            if (!empty($x2Row['x2_tokens_enabled'])) $refTokens *= 2;
                        } catch (Exception $ignored) {}
                        // Check not already credited (safety — unique constraint on referred_id)
                        $alreadyStmt = $pdo->prepare("SELECT id FROM referrals WHERE referred_id=? LIMIT 1");
                        $alreadyStmt->execute([$row['user_id']]);
                        if (!$alreadyStmt->fetch()) {
                            $pdo->prepare("UPDATE users SET tokens = tokens + ? WHERE id=?")->execute([$refTokens, $referrerId]);
                            $pdo->prepare("INSERT INTO referrals (referrer_id, referred_id, tokens_given) VALUES (?,?,?)")->execute([$referrerId, $row['user_id'], $refTokens]);

                            // ── Auto-award Promoter badge ─────────────────────────
                            $refCount = (int)$pdo->query("SELECT COUNT(*) FROM referrals WHERE referrer_id={$referrerId}")->fetchColumn();
                            $profBadges = json_decode($pdo->query("SELECT COALESCE(badges,'[]') FROM profiles WHERE user_id={$referrerId}")->fetchColumn() ?: '[]', true) ?: [];
                            if ($refCount >= 20) {
                                // Upgrade to promoter_elite: remove promoter, add promoter_elite
                                $profBadges = array_values(array_filter($profBadges, fn($b) => $b !== 'promoter'));
                                if (!in_array('promoter_elite', $profBadges)) $profBadges[] = 'promoter_elite';
                                $pdo->prepare("UPDATE profiles SET badges=? WHERE user_id=?")->execute([json_encode($profBadges), $referrerId]);
                            } elseif ($refCount >= 10) {
                                // Award promoter (gray) if not already has it or elite
                                if (!in_array('promoter', $profBadges) && !in_array('promoter_elite', $profBadges)) {
                                    $profBadges[] = 'promoter';
                                    $pdo->prepare("UPDATE profiles SET badges=? WHERE user_id=?")->execute([json_encode($profBadges), $referrerId]);
                                }
                            }
                            // ─────────────────────────────────────────────────────
                            // ── Notify referrer ──────────────────────────────────
                            pushNotification($pdo, $referrerId, 'referral',
                                "New referral! 🎉",
                                "Someone just signed up using your referral link. You earned {$refTokens} tokens!",
                                'users', '/dashboard/referral'
                            );
                        }
                    }
                }
            } catch (Exception $refEx) { /* referral failed silently — account already activated */ }

            // Auto-login
            $_SESSION['user_id']  = $row['user_id'];
            $_SESSION['username'] = $row['username'];
        } catch (Exception $e) {
            $pdo->rollBack();
            $status = 'invalid';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= SITE_NAME ?> — Email Verification</title>
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Outfit:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/main.css?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/css/main.css') ?: time() ?>">
    <style>
        /* ── Verify page ── */
        .verify-wrap {
            display: flex;
            min-height: 100vh;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            background: var(--bg);
            position: relative;
            overflow: hidden;
        }

        /* Animated glow blobs */
        .verify-wrap::before,
        .verify-wrap::after {
            content: '';
            position: fixed;
            border-radius: 50%;
            filter: blur(120px);
            opacity: .12;
            pointer-events: none;
            animation: blobFloat 8s ease-in-out infinite alternate;
        }
        .verify-wrap::before {
            width: 500px; height: 500px;
            background: var(--accent);
            top: -150px; right: -100px;
        }
        .verify-wrap::after {
            width: 400px; height: 400px;
            background: var(--accent2);
            bottom: -100px; left: -100px;
            animation-delay: -4s;
        }
        @keyframes blobFloat {
            from { transform: translate(0,0) scale(1); }
            to   { transform: translate(30px, 20px) scale(1.1); }
        }

        .verify-card {
            position: relative;
            z-index: 1;
            background: rgba(8,8,20,0.85);
            border: 1px solid var(--glass-border);
            backdrop-filter: blur(24px);
            border-radius: 20px;
            padding: 2.5rem 2rem;
            width: 100%;
            max-width: 420px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05) inset;
            animation: cardIn .5s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes cardIn {
            from { opacity:0; transform: translateY(28px) scale(.97); }
            to   { opacity:1; transform: translateY(0) scale(1); }
        }

        .verify-icon {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.25rem;
            font-size: 2rem;
            position: relative;
        }
        .verify-icon.success {
            background: radial-gradient(circle, rgba(0,212,255,.18) 0%, rgba(0,212,255,.05) 100%);
            border: 1.5px solid rgba(0,212,255,.35);
            box-shadow: 0 0 30px rgba(0,212,255,.2);
        }
        .verify-icon.error {
            background: radial-gradient(circle, rgba(255,60,60,.18) 0%, rgba(255,60,60,.05) 100%);
            border: 1.5px solid rgba(255,60,60,.35);
        }
        .verify-icon.warning {
            background: radial-gradient(circle, rgba(255,180,0,.18) 0%, rgba(255,180,0,.05) 100%);
            border: 1.5px solid rgba(255,180,0,.35);
        }

        /* Pulse ring for success */
        .verify-icon.success::before {
            content: '';
            position: absolute;
            inset: -8px;
            border-radius: 50%;
            border: 1.5px solid rgba(0,212,255,.25);
            animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: .6; }
            50%       { transform: scale(1.1); opacity: 0; }
        }

        .verify-title {
            font-family: 'Syne', sans-serif;
            font-size: 1.45rem;
            font-weight: 800;
            margin-bottom: .5rem;
            background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,.7) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .verify-title.success-text {
            background: linear-gradient(135deg, var(--accent) 0%, #00ffcc 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .verify-desc {
            color: var(--text-muted);
            font-size: .88rem;
            line-height: 1.65;
            margin-bottom: 1.75rem;
        }
        .verify-desc strong {
            color: var(--text);
        }

        .redirect-bar {
            background: rgba(0,212,255,.07);
            border: 1px solid rgba(0,212,255,.15);
            border-radius: 8px;
            padding: .6rem 1rem;
            font-size: .78rem;
            color: var(--accent);
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: .5rem;
            justify-content: center;
        }

        .redirect-bar .countdown {
            font-weight: 700;
            font-variant-numeric: tabular-nums;
            min-width: 1.2em;
            display: inline-block;
        }

        .verify-actions {
            display: flex;
            flex-direction: column;
            gap: .65rem;
        }

        .site-logo {
            font-family: 'Syne', sans-serif;
            font-size: 1rem;
            font-weight: 800;
            color: var(--accent);
            letter-spacing: .08em;
            text-decoration: none;
            display: inline-block;
            margin-bottom: 1.75rem;
        }
        .divider {
            height: 1px;
            background: var(--border);
            margin: 1.25rem 0;
        }
    </style>
</head>
<body>
    <canvas id="particle-canvas" style="position:fixed;inset:0;z-index:0;pointer-events:none;"></canvas>
    <div class="verify-wrap">
        <div class="verify-card">
            <a href="/" class="site-logo"><?= SITE_NAME ?></a>

            <?php if ($status === 'success'): ?>

                <div class="verify-icon success"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="7 12 10.5 15.5 17 9"/></svg></div>
                <h1 class="verify-title success-text">Email Verified!</h1>
                <p class="verify-desc">
                    Your account is now <strong>active</strong>.<br>
                    Welcome aboard — let's build your profile!
                </p>
                <div class="redirect-bar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Redirecting to dashboard in <span class="countdown" id="cd">3</span>s
                </div>
                <div class="verify-actions">
                    <a href="/dashboard" class="btn btn-primary btn-full">Go to Dashboard →</a>
                </div>
                <script>
                    let t = 3;
                    const cd = document.getElementById('cd');
                    const iv = setInterval(() => {
                        t--;
                        cd.textContent = t;
                        if (t <= 0) { clearInterval(iv); location.href = '/dashboard'; }
                    }, 1000);
                </script>

            <?php elseif ($status === 'already'): ?>

                <div class="verify-icon success"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="7 12 10.5 15.5 17 9"/></svg></div>
                <h1 class="verify-title success-text">Already Verified</h1>
                <p class="verify-desc">
                    This email was already confirmed. You can sign in to your account now.
                </p>
                <div class="verify-actions">
                    <a href="/login" class="btn btn-primary btn-full">Sign In</a>
                    <a href="/" class="btn btn-secondary btn-full">Home</a>
                </div>

            <?php elseif ($status === 'expired'): ?>

                <div class="verify-icon warning"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffb400" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
                <h1 class="verify-title">Link Expired</h1>
                <p class="verify-desc">
                    The verification link is <strong>no longer valid</strong> (links expire after 24 hours).<br>
                    Register again to get a new link.
                </p>
                <div class="verify-actions">
                    <a href="/register" class="btn btn-primary btn-full">Register Again</a>
                    <a href="/login" class="btn btn-secondary btn-full">Sign In</a>
                </div>

            <?php else: /* invalid */ ?>

                <div class="verify-icon error"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ff5555" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
                <h1 class="verify-title">Invalid Link</h1>
                <p class="verify-desc">
                    This verification link is <strong>invalid or doesn't exist</strong>.<br>
                    Make sure you copied the full link from the email.
                </p>
                <div class="verify-actions">
                    <a href="/register" class="btn btn-primary btn-full">Create New Account</a>
                    <a href="/login" class="btn btn-secondary btn-full">Sign In</a>
                </div>

            <?php endif; ?>

            <div class="divider"></div>
            <p style="font-size:.75rem;color:var(--text-muted);">
                Need help? <a href="/support" style="color:var(--accent);text-decoration:none;">Contact Support</a>
            </p>
        </div>
    </div>
    <script>
        window.PARTICLE_ENABLED = true;
        window.CURSOR_TRAIL_ENABLED = false;
        window.ACCENT_COLOR = '#00d4ff';
    </script>
    <script src="/assets/js/particles.js?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/js/particles.js') ?: time() ?>"></script>
</body>
</html>