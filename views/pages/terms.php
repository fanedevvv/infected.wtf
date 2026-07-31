<?php
$loggedIn = isLoggedIn();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= SITE_NAME ?> — TOS</title>
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/main.css?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/css/main.css') ?: time() ?>">
    <style>
        body { background: #050507; }
        .legal-page { max-width: 760px; margin: 0 auto; padding: 4rem 2rem 6rem; position: relative; z-index: 1; }
        .legal-back { display: inline-flex; align-items: center; gap: .45rem; color: rgba(255,255,255,.4); font-size: .8rem; font-weight: 600; text-decoration: none; margin-bottom: 2.5rem; transition: color .15s; }
        .legal-back:hover { color: rgba(255,255,255,.8); }
        .legal-badge { display: inline-flex; align-items: center; gap: .5rem; padding: .3rem .85rem; border-radius: 20px; background: rgba(0,212,255,.1); border: 1px solid rgba(0,212,255,.25); color: var(--accent,#00d4ff); font-size: .72rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 1rem; }
        .legal-title { font-family: 'Syne', sans-serif; font-size: clamp(1.8rem, 5vw, 2.6rem); font-weight: 800; color: #fff; line-height: 1.1; margin: 0 0 .6rem; }
        .legal-meta { font-size: .8rem; color: rgba(255,255,255,.3); margin-bottom: 2.5rem; }
        .legal-divider { height: 1px; background: rgba(255,255,255,.07); margin: 2.5rem 0; }
        .legal-toc { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 1.2rem 1.5rem; margin-bottom: 2.5rem; }
        .legal-toc-title { font-size: .75rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: rgba(255,255,255,.35); margin-bottom: .75rem; }
        .legal-toc ol { margin: 0; padding-left: 1.2rem; display: flex; flex-direction: column; gap: .35rem; }
        .legal-toc a { font-size: .82rem; color: rgba(255,255,255,.5); text-decoration: none; transition: color .15s; }
        .legal-toc a:hover { color: var(--accent,#00d4ff); }
        .legal-section { margin-bottom: 2.2rem; scroll-margin-top: 80px; }
        .legal-section h2 { font-family: 'Syne', sans-serif; font-size: 1.05rem; font-weight: 700; color: #fff; margin: 0 0 .7rem; display: flex; align-items: center; gap: .5rem; }
        .legal-section h2 .legal-num { width: 26px; height: 26px; border-radius: 7px; background: rgba(0,212,255,.12); border: 1px solid rgba(0,212,255,.2); color: var(--accent,#00d4ff); font-size: .72rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .legal-section p, .legal-section ul, .legal-section ol { font-size: .875rem; color: rgba(255,255,255,.55); line-height: 1.75; margin: 0 0 .75rem; }
        .legal-section ul, .legal-section ol { padding-left: 1.4rem; }
        .legal-section li { margin-bottom: .3rem; }
        .legal-section strong { color: rgba(255,255,255,.8); font-weight: 600; }
        .legal-section a { color: var(--accent,#00d4ff); text-decoration: none; }
        .legal-section a:hover { text-decoration: underline; }
        .legal-highlight { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-left: 3px solid var(--accent,#00d4ff); border-radius: 0 10px 10px 0; padding: .9rem 1.1rem; margin-bottom: .75rem; font-size: .85rem; color: rgba(255,255,255,.55); line-height: 1.7; }
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
    <h1 class="legal-title">Terms of Service</h1>
    <p class="legal-meta">Last updated: <?= date('F j, Y') ?> &nbsp;·&nbsp; Effective immediately</p>

    <div class="legal-highlight">
        By accessing or using <?= SITE_NAME ?> you agree to be bound by these Terms. Please read them carefully before creating an account.
    </div>

    <div class="legal-toc">
        <div class="legal-toc-title">Table of Contents</div>
        <ol>
            <li><a href="#s1">Acceptance of Terms</a></li>
            <li><a href="#s2">Eligibility</a></li>
            <li><a href="#s3">Account Responsibilities</a></li>
            <li><a href="#s4">Acceptable Use</a></li>
            <li><a href="#s5">Content Ownership</a></li>
            <li><a href="#s6">Tokens & Virtual Currency</a></li>
            <li><a href="#s7">Termination</a></li>
            <li><a href="#s8">Disclaimers & Limitations</a></li>
            <li><a href="#s9">Changes to Terms</a></li>
            <li><a href="#s10">Contact</a></li>
        </ol>
    </div>

    <div class="legal-divider"></div>

    <div class="legal-section" id="s1">
        <h2><span class="legal-num">1</span> Acceptance of Terms</h2>
        <p>By registering for or using <?= SITE_NAME ?> ("Service", "Platform", "we", "us"), you agree to these Terms of Service and our <a href="/privacy">Privacy Policy</a>. If you do not agree, please do not use the Service.</p>
    </div>

    <div class="legal-section" id="s2">
        <h2><span class="legal-num">2</span> Eligibility</h2>
        <p>You must be at least 13 years old to use <?= SITE_NAME ?>. By using the Service you represent and warrant that you meet this age requirement and that you have the right, authority and capacity to agree to these Terms.</p>
    </div>

    <div class="legal-section" id="s3">
        <h2><span class="legal-num">3</span> Account Responsibilities</h2>
        <p>You are responsible for:</p>
        <ul>
            <li>Keeping your password confidential and secure.</li>
            <li>All activity that occurs under your account.</li>
            <li>Notifying us immediately of any unauthorized access at <a href="/support">our support page</a>.</li>
            <li>Providing accurate registration information.</li>
        </ul>
        <p>We reserve the right to suspend or terminate accounts that violate these Terms.</p>
    </div>

    <div class="legal-section" id="s4">
        <h2><span class="legal-num">4</span> Acceptable Use</h2>
        <p>You agree <strong>not</strong> to use the Service to:</p>
        <ul>
            <li>Post content that is illegal, abusive, harassing, threatening, or discriminatory.</li>
            <li>Impersonate another person or entity.</li>
            <li>Distribute malware, spam or phishing content via your profile links.</li>
            <li>Attempt to gain unauthorized access to other accounts or our infrastructure.</li>
            <li>Scrape or harvest data from the platform without permission.</li>
            <li>Circumvent any security or access controls.</li>
        </ul>
        <p>Violations may result in immediate account suspension without notice.</p>
    </div>

    <div class="legal-section" id="s5">
        <h2><span class="legal-num">5</span> Content Ownership</h2>
        <p>You retain ownership of any content you upload (avatars, backgrounds, links). By uploading content you grant us a non-exclusive, worldwide, royalty-free license to display it as part of the Service.</p>
        <p>We do not claim ownership of your content and will not sell it to third parties.</p>
    </div>

    <div class="legal-section" id="s6">
        <h2><span class="legal-num">6</span> Tokens &amp; Virtual Currency</h2>
        <p>Tokens are a virtual in-platform currency with <strong>no real-world monetary value</strong>. They cannot be exchanged for cash, transferred between accounts, or refunded. We reserve the right to adjust token balances or pricing at any time.</p>
    </div>

    <div class="legal-section" id="s7">
        <h2><span class="legal-num">7</span> Termination</h2>
        <p>You may delete your account at any time via Dashboard → Settings. We may suspend or terminate your access at any time, for any reason, with or without notice, particularly in cases of Terms violations.</p>
    </div>

    <div class="legal-section" id="s8">
        <h2><span class="legal-num">8</span> Disclaimers &amp; Limitations</h2>
        <p>The Service is provided <strong>"as is"</strong> without warranties of any kind. We are not liable for any indirect, incidental or consequential damages arising from your use of the Service. We do not guarantee uninterrupted availability.</p>
    </div>

    <div class="legal-section" id="s9">
        <h2><span class="legal-num">9</span> Changes to Terms</h2>
        <p>We may update these Terms at any time. Continued use of the Service after changes constitutes your acceptance of the new Terms. We will note the effective date at the top of this page.</p>
    </div>

    <div class="legal-section" id="s10">
        <h2><span class="legal-num">10</span> Contact</h2>
        <p>If you have questions about these Terms, please reach us via the <a href="/support">Support page</a> or join our <a href="https://discord.gg/BAEpkJ62VM" target="_blank" rel="noopener">Discord server</a>.</p>
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