<?php
$loggedIn = isLoggedIn();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= SITE_NAME ?> — Support</title>
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/main.css?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/css/main.css') ?: time() ?>">
    <style>
        body { background: #050507; }
        .support-page { max-width: 820px; margin: 0 auto; padding: 4rem 2rem 6rem; position: relative; z-index: 1; }
        .legal-back { display: inline-flex; align-items: center; gap: .45rem; color: rgba(255,255,255,.4); font-size: .8rem; font-weight: 600; text-decoration: none; margin-bottom: 2.5rem; transition: color .15s; }
        .legal-back:hover { color: rgba(255,255,255,.8); }
        /* Header */
        .support-header { text-align: center; margin-bottom: 3.5rem; }
        .support-badge { display: inline-flex; align-items: center; gap: .5rem; padding: .3rem .85rem; border-radius: 20px; background: rgba(88,101,242,.15); border: 1px solid rgba(88,101,242,.35); color: #7289da; font-size: .72rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 1rem; }
        .support-title { font-family: 'Syne', sans-serif; font-size: clamp(2rem, 6vw, 3rem); font-weight: 800; color: #fff; line-height: 1.1; margin: 0 0 .75rem; }
        .support-sub { font-size: .92rem; color: rgba(255,255,255,.4); line-height: 1.65; max-width: 480px; margin: 0 auto; }
        /* Discord CTA */
        .discord-cta {
            display: flex; align-items: center; gap: 1.5rem;
            background: linear-gradient(135deg, rgba(88,101,242,.18) 0%, rgba(88,101,242,.06) 100%);
            border: 1px solid rgba(88,101,242,.35); border-radius: 20px;
            padding: 2rem 2.2rem; margin-bottom: 2.5rem;
            position: relative; overflow: hidden;
        }
        .discord-cta::before {
            content: ''; position: absolute; inset: 0;
            background: radial-gradient(ellipse at 80% 50%, rgba(88,101,242,.12) 0%, transparent 60%);
            pointer-events: none;
        }
        .discord-icon-wrap {
            width: 72px; height: 72px; border-radius: 18px; flex-shrink: 0;
            background: rgba(88,101,242,.25); border: 1px solid rgba(88,101,242,.4);
            display: flex; align-items: center; justify-content: center;
        }
        .discord-cta-body { flex: 1; }
        .discord-cta-title { font-family: 'Syne', sans-serif; font-size: 1.25rem; font-weight: 800; color: #fff; margin: 0 0 .35rem; }
        .discord-cta-desc { font-size: .85rem; color: rgba(255,255,255,.45); line-height: 1.6; margin: 0 0 1.1rem; }
        .discord-btn {
            display: inline-flex; align-items: center; gap: .6rem;
            padding: .65rem 1.4rem; border-radius: 11px;
            background: #5865f2; color: #fff;
            font-size: .85rem; font-weight: 700; text-decoration: none;
            transition: background .15s, transform .15s, box-shadow .15s;
            box-shadow: 0 4px 20px rgba(88,101,242,.35);
        }
        .discord-btn:hover { background: #4752c4; transform: translateY(-1px); box-shadow: 0 6px 25px rgba(88,101,242,.5); }
        /* Stats row */
        .discord-stats { display: flex; gap: 2rem; margin-top: 1rem; }
        .discord-stat { display: flex; flex-direction: column; gap: .1rem; }
        .discord-stat-val { font-family: 'Syne', sans-serif; font-size: 1.1rem; font-weight: 800; color: #fff; }
        .discord-stat-label { font-size: .7rem; color: rgba(255,255,255,.35); text-transform: uppercase; letter-spacing: .05em; }
        /* Team cards */
        .team-section { margin-bottom: 2.5rem; }
        .team-heading { font-family: 'Syne', sans-serif; font-size: 1rem; font-weight: 700; color: rgba(255,255,255,.6); margin-bottom: 1rem; letter-spacing: .04em; text-transform: uppercase; font-size: .78rem; }
        .team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 1rem; }
        .team-card {
            background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08);
            border-radius: 16px; padding: 1.3rem 1.4rem;
            display: flex; align-items: center; gap: 1rem;
            transition: border-color .2s, background .2s;
        }
        .team-card:hover { border-color: rgba(255,255,255,.16); background: rgba(255,255,255,.05); }
        .team-avatar {
            width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Syne', sans-serif; font-size: 1.3rem; font-weight: 800;
        }
        .team-avatar-cat { background: linear-gradient(135deg, #00d4ff22, #00d4ff11); border: 1px solid rgba(0,212,255,.3); color: #00d4ff; }
        .team-avatar-zeus { background: linear-gradient(135deg, #ff00ff22, #ff00ff11); border: 1px solid rgba(255,0,255,.3); color: #ff66ff; }
        .team-name { font-family: 'Syne', sans-serif; font-size: .98rem; font-weight: 800; color: #fff; margin-bottom: .15rem; }
        .team-role { font-size: .75rem; color: rgba(255,255,255,.35); font-weight: 500; }
        .team-role-badge { display: inline-block; padding: .15rem .55rem; border-radius: 6px; font-size: .65rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; margin-top: .3rem; }
        .role-dev { background: rgba(0,212,255,.12); color: #00d4ff; border: 1px solid rgba(0,212,255,.2); }
        .role-dev-zeus { background: rgba(255,0,255,.12); color: #ff66ff; border: 1px solid rgba(255,0,255,.2); }
        @media (max-width: 560px) {
            .discord-cta { flex-direction: column; text-align: center; }
            .discord-stats { justify-content: center; }
            .team-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
<nav class="navbar">
    <a href="/" class="navbar-brand"><?= SITE_NAME ?></a>
    <div class="navbar-links">
        <a href="https://discord.gg/" target="_blank">Discord</a>
        <a href="/leaderboard">Leaderboard</a>
        <?php if ($loggedIn): ?>
        <a href="/dashboard" class="btn btn-primary btn-sm">Dashboard</a>
        <?php else: ?>
        <a href="/login" class="btn btn-secondary btn-sm">Login</a>
        <a href="/register" class="btn btn-primary btn-sm">Register</a>
        <?php endif; ?>
    </div>
</nav>

<div class="support-page fade-in">
    <a href="/" class="legal-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>
        Back to home
    </a>

    <div class="support-header">
        <div class="support-badge">
            <!-- Discord icon -->
            <svg viewBox="0 0 127.14 96.36" fill="currentColor" width="12" height="12"><path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"/></svg>
            Support
        </div>
        <h1 class="support-title">We're here to help</h1>
        <p class="support-sub">Join our Discord community for the fastest response — our team is active daily and the community is always ready to assist.</p>
    </div>

    <!-- DISCORD CTA -->
    <div class="discord-cta">
        <div class="discord-icon-wrap">
            <svg viewBox="0 0 127.14 96.36" fill="#fff" width="38" height="38"><path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"/></svg>
        </div>
        <div class="discord-cta-body">
            <div class="discord-cta-title">Join the <?= SITE_NAME ?> Discord</div>
            <div class="discord-cta-desc">Get help with your account, report bugs, suggest features, or just hang out with the community. Our developers are active and respond quickly.</div>
            <a href="https://discord.gg/BAEpkJ62VM" target="_blank" rel="noopener" class="discord-btn">
                <svg viewBox="0 0 127.14 96.36" fill="currentColor" width="16" height="16"><path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"/></svg>
                Join Discord Server
            </a>
        </div>
    </div>

    <!-- TEAM -->
    <div class="team-section">
        <div class="team-heading">Meet the Developers</div>
        <div class="team-grid">
            <div class="team-card">
                <div class="team-avatar team-avatar-cat">C</div>
                <div>
                    <div class="team-name">CaTaSiLENT</div>
                    <div class="team-role">Lead Developer</div>
                    <span class="team-role-badge role-dev">Developer</span>
                </div>
            </div>
            <div class="team-card">
                <div class="team-avatar team-avatar-zeus">Z</div>
                <div>
                    <div class="team-name">Zeus</div>
                    <div class="team-role">Developer</div>
                    <span class="team-role-badge role-dev-zeus">Developer</span>
                </div>
            </div>
        </div>
    </div>

</div>

<footer class="site-footer">
    <div class="site-footer-inner">
        <div class="site-footer-left">
            <span class="site-footer-copy"><?= SITE_NAME ?> <?= date('Y') ?> &mdash; All rights reserved</span>
        </div>
        <nav class="site-footer-links">
            <a href="/terms">Terms of Service</a>
            <a href="/privacy">Privacy Policy</a>
            <a href="/support">Support</a>
        </nav>
    </div>
</footer>
<?php include __DIR__ . '/../partials/cookie_banner.php'; ?>
</body>
</html>