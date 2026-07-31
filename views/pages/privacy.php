<?php
$loggedIn = isLoggedIn();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= SITE_NAME ?> — Privacy Policy</title>
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/main.css?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/css/main.css') ?: time() ?>">
    <style>
        body { background: #050507; }
        .legal-page { max-width: 760px; margin: 0 auto; padding: 4rem 2rem 6rem; position: relative; z-index: 1; }
        .legal-back { display: inline-flex; align-items: center; gap: .45rem; color: rgba(255,255,255,.4); font-size: .8rem; font-weight: 600; text-decoration: none; margin-bottom: 2.5rem; transition: color .15s; }
        .legal-back:hover { color: rgba(255,255,255,.8); }
        .legal-badge { display: inline-flex; align-items: center; gap: .5rem; padding: .3rem .85rem; border-radius: 20px; background: rgba(255,0,255,.1); border: 1px solid rgba(255,0,255,.25); color: #ff66ff; font-size: .72rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 1rem; }
        .legal-title { font-family: 'Syne', sans-serif; font-size: clamp(1.8rem, 5vw, 2.6rem); font-weight: 800; color: #fff; line-height: 1.1; margin: 0 0 .6rem; }
        .legal-meta { font-size: .8rem; color: rgba(255,255,255,.3); margin-bottom: 2.5rem; }
        .legal-divider { height: 1px; background: rgba(255,255,255,.07); margin: 2.5rem 0; }
        .legal-toc { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 1.2rem 1.5rem; margin-bottom: 2.5rem; }
        .legal-toc-title { font-size: .75rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: rgba(255,255,255,.35); margin-bottom: .75rem; }
        .legal-toc ol { margin: 0; padding-left: 1.2rem; display: flex; flex-direction: column; gap: .35rem; }
        .legal-toc a { font-size: .82rem; color: rgba(255,255,255,.5); text-decoration: none; transition: color .15s; }
        .legal-toc a:hover { color: #ff66ff; }
        .legal-section { margin-bottom: 2.2rem; scroll-margin-top: 80px; }
        .legal-section h2 { font-family: 'Syne', sans-serif; font-size: 1.05rem; font-weight: 700; color: #fff; margin: 0 0 .7rem; display: flex; align-items: center; gap: .5rem; }
        .legal-section h2 .legal-num { width: 26px; height: 26px; border-radius: 7px; background: rgba(255,0,255,.12); border: 1px solid rgba(255,0,255,.2); color: #ff66ff; font-size: .72rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .legal-section p, .legal-section ul, .legal-section ol { font-size: .875rem; color: rgba(255,255,255,.55); line-height: 1.75; margin: 0 0 .75rem; }
        .legal-section ul, .legal-section ol { padding-left: 1.4rem; }
        .legal-section li { margin-bottom: .3rem; }
        .legal-section strong { color: rgba(255,255,255,.8); font-weight: 600; }
        .legal-section a { color: #ff66ff; text-decoration: none; }
        .legal-section a:hover { text-decoration: underline; }
        .legal-highlight { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-left: 3px solid #ff66ff; border-radius: 0 10px 10px 0; padding: .9rem 1.1rem; margin-bottom: .75rem; font-size: .85rem; color: rgba(255,255,255,.55); line-height: 1.7; }
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

<div class="legal-page fade-in">
    <a href="/" class="legal-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>
        Back to home
    </a>
    <h1 class="legal-title">Privacy Policy</h1>
    <p class="legal-meta">Last updated: <?= date('F j, Y') ?> &nbsp;·&nbsp; We take your privacy seriously</p>

    <div class="legal-highlight">
        This policy explains what data <?= SITE_NAME ?> collects, how it is used, and your rights regarding that data.
    </div>

    <div class="legal-toc">
        <div class="legal-toc-title">Table of Contents</div>
        <ol>
            <li><a href="#p1">Information We Collect</a></li>
            <li><a href="#p2">How We Use Your Information</a></li>
            <li><a href="#p3">Data Storage & Security</a></li>
            <li><a href="#p4">Cookies</a></li>
            <li><a href="#p5">Third-Party Services</a></li>
            <li><a href="#p6">Your Rights</a></li>
            <li><a href="#p7">Data Retention</a></li>
            <li><a href="#p8">Children's Privacy</a></li>
            <li><a href="#p9">Changes to This Policy</a></li>
            <li><a href="#p10">Contact</a></li>
        </ol>
    </div>

    <div class="legal-divider"></div>

    <div class="legal-section" id="p1">
        <h2><span class="legal-num">1</span> Information We Collect</h2>
        <p><strong>Account data:</strong> username, email address, and hashed password when you register.</p>
        <p><strong>Profile data:</strong> display name, bio, location, avatar, background, links, and any other content you choose to add to your profile.</p>
        <p><strong>Usage data:</strong> IP address hashes (not raw IPs) used to count unique profile views, browser type and general device information.</p>
        <p><strong>Cookies:</strong> session tokens and a "remember me" cookie for persistent login.</p>
    </div>

    <div class="legal-section" id="p2">
        <h2><span class="legal-num">2</span> How We Use Your Information</h2>
        <ul>
            <li>To provide and maintain the Service (account access, profile display).</li>
            <li>To count unique profile views and provide analytics to profile owners.</li>
            <li>To process token transactions within the platform.</li>
            <li>To detect, prevent and respond to fraud or abuse.</li>
            <li>To send important service-related communications (if applicable).</li>
        </ul>
        <p>We do <strong>not</strong> sell your data, serve third-party ads, or share your personal information with advertisers.</p>
    </div>

    <div class="legal-section" id="p3">
        <h2><span class="legal-num">3</span> Data Storage &amp; Security</h2>
        <p>Your data is stored on secured servers. Passwords are stored as <strong>bcrypt hashes</strong> — we never store plaintext passwords. IP addresses used for view counting are stored as one-way hashes and cannot be reversed.</p>
        <p>While we implement security best practices, no system is 100% secure. We cannot guarantee absolute security of your data.</p>
    </div>

    <div class="legal-section" id="p4">
        <h2><span class="legal-num">4</span> Cookies</h2>
        <p>We use only essential cookies:</p>
        <ul>
            <li><strong>Session cookie</strong> — keeps you logged in during a browser session.</li>
            <li><strong>remember_token</strong> — a persistent cookie set only if you choose "Remember me" at login.</li>
        </ul>
        <p>We do not use tracking, advertising, or analytics cookies.</p>
    </div>

    <div class="legal-section" id="p5">
        <h2><span class="legal-num">5</span> Third-Party Services</h2>
        <p>We load fonts from <strong>Google Fonts</strong> (fonts.googleapis.com). This may log your IP address per Google's own privacy policy. No other third-party services are embedded on the platform.</p>
        <p>Links you add to your profile point to external sites. We are not responsible for their privacy practices.</p>
    </div>

    <div class="legal-section" id="p6">
        <h2><span class="legal-num">6</span> Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
            <li><strong>Access</strong> — view all information stored in your profile via the dashboard.</li>
            <li><strong>Correction</strong> — update your username, email and profile data at any time.</li>
            <li><strong>Deletion</strong> — permanently delete your account and all associated data via Dashboard → Settings.</li>
        </ul>
        <p>For requests that cannot be fulfilled through the dashboard, contact us via <a href="/support">Support</a>.</p>
    </div>

    <div class="legal-section" id="p7">
        <h2><span class="legal-num">7</span> Data Retention</h2>
        <p>We retain your data as long as your account is active. When you delete your account, all personal data (username, email, profile, uploaded files) is permanently removed from our systems within 24 hours. Anonymized aggregate statistics may be retained.</p>
    </div>

    <div class="legal-section" id="p8">
        <h2><span class="legal-num">8</span> Children's Privacy</h2>
        <p>The Service is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such data, please <a href="/support">contact us</a> immediately.</p>
    </div>

    <div class="legal-section" id="p9">
        <h2><span class="legal-num">9</span> Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. The effective date at the top of this page will reflect the latest revision. Continued use of the Service after changes constitutes your acceptance of the updated policy.</p>
    </div>

    <div class="legal-section" id="p10">
        <h2><span class="legal-num">10</span> Contact</h2>
        <p>For privacy-related questions or data requests, please visit our <a href="/support">Support page</a> or join our <a href="https://discord.gg/BAEpkJ62VM" target="_blank" rel="noopener">Discord server</a>.</p>
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