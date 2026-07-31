<?php
$loggedIn = isLoggedIn();
$myProfile = null;
if ($loggedIn) {
    $myProfile = getProfile($pdo, (int)$_SESSION['user_id']);
}

$totalUsers = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE email_verified=1")->fetchColumn();
$totalViews = (int)$pdo->query("SELECT COALESCE(SUM(views),0) FROM profiles")->fetchColumn();
$totalPremium = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE is_premium=1 AND email_verified=1 AND (premium_expires_at IS NULL OR premium_expires_at > NOW())")->fetchColumn();

$marqueeStmt = $pdo->query("
    SELECT u.username, p.display_name, p.avatar
    FROM profiles p JOIN users u ON u.id = p.user_id
    WHERE u.banned = 0 AND u.email_verified = 1
    ORDER BY u.created_at DESC LIMIT 24
");
$marqueeUsers = $marqueeStmt->fetchAll();

// Spotlight: top user by global views
$spotlightStmt = $pdo->query("
    SELECT u.id, u.username, u.is_premium,
           COALESCE(p.display_name,'') AS display_name,
           COALESCE(p.avatar,'')       AS avatar,
           COALESCE(p.bio,'')          AS bio,
           COALESCE(p.views,0)         AS views
    FROM profiles p
    JOIN users u ON u.id = p.user_id
    WHERE u.banned = 0 AND u.email_verified = 1
    ORDER BY p.views DESC
    LIMIT 1
");
$spotlightUser = $spotlightStmt->fetch();

function fmtNum(int $n): string {
    if ($n >= 1000000) return round($n/1000000,1).'M';
    if ($n >= 1000)    return floor($n/100)/10 .'K';
    return (string)$n;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= SITE_NAME ?> — Home</title>
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon.png">

    <!-- Open Graph / Discord / WhatsApp / Telegram embed -->
    <meta property="og:type"        content="website">
    <meta property="og:site_name"   content="<?= SITE_NAME ?>">
    <meta property="og:url"         content="<?= SITE_URL ?>">
    <meta property="og:title"       content="<?= SITE_NAME ?> — Create Your Free Biolink">
    <meta property="og:description" content="Your free biolink page. Customize your profile, show your Discord status, add links and more. Claim your username now!">
    <meta property="og:image"       content="<?= SITE_URL ?>/assets/img/og-banner.png">
    <meta property="og:image:width"  content="1280">
    <meta property="og:image:height" content="640">
    <!-- Twitter Card -->
    <meta name="twitter:card"        content="summary_large_image">
    <meta name="twitter:title"       content="<?= SITE_NAME ?> — Create Your Free Biolink">
    <meta name="twitter:description" content="Your free biolink page. Customize your profile, show your Discord status, add links and more.">
    <meta name="twitter:image"       content="<?= SITE_URL ?>/assets/img/og-banner.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <!-- Fonts load only after cookie consent (see bottom of page) -->
    <link rel="stylesheet" href="/assets/css/main.css?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/css/main.css') ?: time() ?>">
    <style>
    *{box-sizing:border-box}
    /* ── Hero ── */
    .hero{text-align:center;padding:7rem 1rem 3rem;position:relative;z-index:1}
    @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
    .hero h1{font-family:'Syne',sans-serif;font-size:clamp(1.6rem,4vw,3rem);font-weight:900;line-height:1.08;margin:0 0 .35rem;color:#fff;letter-spacing:-.02em}
    .hero h1 em{font-style:normal;background:linear-gradient(135deg,#ff00ff 0%,#00d4ff 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:gradMove 5s linear infinite}
    @keyframes gradMove{to{background-position:200% center}}
    .hero-sub{color:rgba(255,255,255,.38);font-size:clamp(1.1rem,3vw,1.55rem);font-family:'Syne',sans-serif;font-weight:700;margin:0 0 1.8rem;letter-spacing:-.01em}
    .hero p{color:rgba(255,255,255,.42);font-size:.97rem;max-width:440px;margin:0 auto 2.2rem;line-height:1.65}
    .hero-claim{display:flex;align-items:center;gap:0;max-width:400px;margin:0 auto 1.2rem;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.13);border-radius:14px;overflow:hidden;transition:border-color .2s,box-shadow .2s}
    .hero-claim:focus-within{border-color:rgba(0,212,255,.5);box-shadow:0 0 0 3px rgba(0,212,255,.1)}
    .hero-claim-prefix{padding:0 .6rem 0 1.1rem;color:rgba(255,255,255,.3);font-size:1rem;font-weight:600;user-select:none;flex-shrink:0}
    .hero-claim input{flex:1;background:none;border:none;outline:none;padding:.85rem .4rem;color:#fff;font-size:.95rem;font-family:'Outfit',sans-serif}
    .hero-claim input::placeholder{color:rgba(255,255,255,.22)}
    .hero-claim-btn{padding:.7rem 1.3rem;margin:.35rem .35rem .35rem 0;background:linear-gradient(135deg,#ff00ff,#00d4ff);border:none;border-radius:10px;color:#fff;font-size:.85rem;font-weight:700;cursor:pointer;white-space:nowrap;transition:opacity .15s,transform .15s;font-family:'Outfit',sans-serif}
    .hero-claim-btn:hover{opacity:.88;transform:scale(1.03)}
    .hero-perks{display:flex;align-items:center;justify-content:center;gap:1.4rem;flex-wrap:wrap;margin-bottom:2rem}
    .hero-perk{display:flex;align-items:center;gap:.4rem;font-size:.75rem;color:rgba(255,255,255,.35);font-weight:500}
    .hero-perk svg{color:rgba(0,212,255,.7)}
    .hero-perk-dot{width:3px;height:3px;border-radius:50%;background:rgba(255,255,255,.2)}
    .hero-btns{display:flex;align-items:center;justify-content:center;gap:1rem;flex-wrap:wrap;margin-top:2rem}

    /* ── Combined Trust + Marquee + Spotlight Frame ── */
    .combined-frame{position:relative;z-index:1;max-width:860px;margin:3rem auto 0;padding:0 1rem}
    .combined-inner{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.09);border-radius:22px;overflow:hidden;backdrop-filter:blur(20px)}

    /* Trust row */
    .trust-card{background:rgba(255,255,255,.025);padding:2.5rem 3rem;display:flex;align-items:center;justify-content:center;gap:3.5rem;flex-wrap:wrap;border-bottom:1px solid rgba(255,255,255,.07)}
    .trust-headline{font-family:'Syne',sans-serif;font-size:1.6rem;font-weight:800;color:#fff;line-height:1.3}
    .trust-headline span{color:rgba(255,255,255,.35)}
    .trust-stats{display:flex;gap:3rem}
    .trust-stat-label{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.35);margin-bottom:.3rem}
    .trust-stat-val{font-family:'Syne',sans-serif;font-size:2.2rem;font-weight:900;color:#fff}

    /* Marquee row */
    .marquee-wrap{overflow:hidden;padding:.85rem 0;border-bottom:1px solid rgba(255,255,255,.07)}
    .marquee-track{display:flex;gap:1rem;width:max-content;animation:marqueeScroll 30s linear infinite}
    .marquee-track:hover{animation-play-state:paused}
    @keyframes marqueeScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
    .marquee-card{display:flex;align-items:center;gap:.75rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:.6rem 1rem;white-space:nowrap;text-decoration:none;transition:border-color .2s,background .2s;flex-shrink:0}
    .marquee-card:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.2)}
    .marquee-avatar{width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.12);background:#111;flex-shrink:0}
    .marquee-name{font-size:.83rem;font-weight:700;color:#fff}
    .marquee-slug{font-size:.7rem;color:rgba(255,255,255,.4)}
    .marquee-fade-l{position:absolute;left:0;top:0;bottom:0;width:80px;background:linear-gradient(to right,rgba(13,13,18,1),transparent);z-index:2;pointer-events:none}
    .marquee-fade-r{position:absolute;right:0;top:0;bottom:0;width:80px;background:linear-gradient(to left,rgba(13,13,18,1),transparent);z-index:2;pointer-events:none}

    /* Spotlight row — inside combined frame */
    .spotlight-inline{position:relative;padding:1.6rem 2.5rem;display:flex;align-items:center;gap:2rem;flex-wrap:wrap;overflow:hidden;background:rgba(255,215,0,.025)}
    .spotlight-inline::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 15% 50%,rgba(255,215,0,.055) 0%,transparent 65%);pointer-events:none}
    .spotlight-inline-glow{position:absolute;top:-50px;left:-50px;width:180px;height:180px;background:radial-gradient(circle,rgba(255,215,0,.1) 0%,transparent 70%);pointer-events:none;border-radius:50%}
    .spotlight-inline-label{font-size:.62rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,215,0,.6);display:flex;align-items:center;gap:.35rem;margin-bottom:.45rem}
    .spotlight-inline-label::before{content:'';width:22px;height:1px;background:rgba(255,215,0,.3)}
    .spotlight-inline-avatar-wrap{position:relative;flex-shrink:0}
    .spotlight-inline-avatar{width:72px;height:72px;border-radius:50%;object-fit:cover;border:2.5px solid rgba(255,215,0,.45);box-shadow:0 0 18px rgba(255,215,0,.2)}
    .spotlight-inline-ring{position:absolute;inset:-4px;border-radius:50%;border:1.5px solid rgba(255,215,0,.25);animation:spotlight-pulse 2.5s ease-in-out infinite}
    .spotlight-inline-info{flex:1;min-width:0}
    .spotlight-inline-badge-row{display:flex;align-items:center;gap:.5rem;margin-bottom:.35rem}
    .spotlight-inline-live{display:inline-flex;align-items:center;gap:.3rem;font-size:.6rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#ffd700;background:rgba(255,215,0,.1);border:1px solid rgba(255,215,0,.22);border-radius:99px;padding:.18rem .55rem}
    .spotlight-inline-dot{width:5px;height:5px;border-radius:50%;background:#ffd700;animation:spotlight-blink 1.2s ease-in-out infinite}
    .spotlight-inline-name{font-family:'Syne',sans-serif;font-size:1.25rem;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .spotlight-inline-handle{font-size:.78rem;color:rgba(255,255,255,.38);margin-top:.1rem}
    .spotlight-inline-bio{font-size:.8rem;color:rgba(255,255,255,.45);margin-top:.4rem;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
    .spotlight-inline-cta{display:inline-flex;align-items:center;gap:.35rem;padding:.46rem 1rem;border-radius:9px;font-size:.75rem;font-weight:700;text-decoration:none;background:rgba(255,215,0,.09);border:1px solid rgba(255,215,0,.22);color:#ffd700;transition:all .2s;margin-top:.65rem;white-space:nowrap}
    .spotlight-inline-cta:hover{background:rgba(255,215,0,.17);border-color:rgba(255,215,0,.42)}
    .spotlight-inline-stats{display:flex;flex-direction:column;align-items:flex-end;gap:.2rem;flex-shrink:0;text-align:right;margin-left:auto}
    .spotlight-inline-views-num{font-family:'Syne',sans-serif;font-size:2rem;font-weight:900;color:#ffd700;line-height:1}
    .spotlight-inline-views-label{font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,215,0,.45)}
    .spotlight-inline-rank{font-size:.7rem;color:rgba(255,255,255,.28);margin-top:.25rem}
    .spotlight-empty-inline{text-align:center;color:rgba(255,255,255,.22);font-size:.85rem;padding:1.5rem}
    @media(max-width:600px){.spotlight-inline{flex-direction:column;align-items:flex-start}.spotlight-inline-stats{align-items:flex-start;text-align:left;margin-left:0}}

    /* ── Features ── */
    .features-section{padding:5rem 1rem 4rem;max-width:1100px;margin:0 auto;position:relative;z-index:1}
    .features-intro{text-align:center;margin-bottom:3.5rem}
    .features-intro-label{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:var(--accent,#00d4ff);margin-bottom:.75rem;display:flex;align-items:center;justify-content:center;gap:.5rem}
    .features-intro-label::before,.features-intro-label::after{content:'';height:1px;width:32px;background:rgba(0,212,255,.3)}
    .features-intro h2{font-family:'Syne',sans-serif;font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:900;color:#fff;line-height:1.15;margin-bottom:.85rem}
    .features-intro h2 span{color:rgba(255,255,255,.25)}
    .features-intro p{font-size:.9rem;color:rgba(255,255,255,.4);line-height:1.65;max-width:500px;margin:0 auto}
    .features-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.07) 30%,rgba(255,255,255,.07) 70%,transparent);margin-bottom:3rem}
    .features-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0}
    .feat-item{padding:1.5rem 1.6rem;border-right:1px solid rgba(255,255,255,.06);transition:background .2s}
    .feat-item:last-child{border-right:none}
    .feat-item:hover{background:rgba(255,255,255,.03)}
    .feat-item-top{display:flex;align-items:center;gap:.65rem;margin-bottom:.6rem}
    .feat-icon{width:30px;height:30px;border-radius:8px;background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--accent,#00d4ff)}
    .feat-icon svg{width:14px;height:14px}
    .feat-title{font-family:'Syne',sans-serif;font-size:.88rem;font-weight:800;color:#fff}
    .feat-desc{font-size:.78rem;color:rgba(255,255,255,.38);line-height:1.6;padding-left:0}
    .features-grid-row2{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:1px solid rgba(255,255,255,.06);margin-top:0}
    .features-grid-row2 .feat-item{border-top:none}


    /* ── PRICING ── */
    .pricing-section{padding:4rem 1rem 2rem;max-width:1080px;margin:0 auto;position:relative;z-index:1}
    .pricing-heading-label{display:flex;align-items:center;justify-content:center;gap:.5rem;font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:.9rem}
    .pricing-heading-label::before,.pricing-heading-label::after{content:'';height:1px;width:32px;background:rgba(0,212,255,.3)}
    .pricing-heading{font-family:'Syne',sans-serif;font-size:clamp(1.6rem,3vw,2.2rem);font-weight:900;color:#fff;text-align:center;margin-bottom:.5rem}
    .pricing-sub{font-size:.88rem;color:rgba(255,255,255,.38);text-align:center;margin-bottom:2.5rem}
    .pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.2rem;align-items:start}
    .pricing-card{border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:1.6rem 1.5rem;background:rgba(255,255,255,.03);position:relative;display:flex;flex-direction:column;gap:1rem}
    .pricing-card:hover{border-color:rgba(255,255,255,.15)}
    @keyframes floatSlow{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
    @keyframes floatBig{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
    .pricing-card{transition:border-color .2s;will-change:transform}
    .pricing-card:not(.featured):not(.verified-card){animation:floatSlow 6s ease-in-out infinite}
    .pricing-card.featured{border-color:rgba(255,215,0,.3);background:rgba(255,215,0,.05);animation:floatBig 6s ease-in-out infinite}
    .pricing-card.verified-card{border-color:rgba(52,211,153,.25);background:rgba(52,211,153,.04);animation:floatSlow 6s ease-in-out infinite}
    .pricing-badge{position:absolute;top:-11px;left:50%;transform:translateX(-50%);font-size:.65rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:.28rem .85rem;border-radius:99px;white-space:nowrap}
    .pricing-badge.hot{background:rgba(255,215,0,.12);border:1px solid rgba(255,215,0,.35);color:#ffd700}
    .pricing-badge.extra{background:rgba(52,211,153,.15);border:1px solid rgba(52,211,153,.35);color:#34d399}
    .pricing-plan-top{display:flex;align-items:center;gap:.75rem}
    .pricing-plan-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .pricing-plan-icon.free-ico{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.6)}
    .pricing-plan-icon.prem-ico{background:rgba(255,215,0,.1);border:1px solid rgba(255,215,0,.25);color:#ffd700}
    .pricing-plan-icon.verif-ico{background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.2);color:#34d399}
    .pricing-plan-name{font-family:'Syne',sans-serif;font-size:1rem;font-weight:800;color:#fff}
    .pricing-plan-tagline{font-size:.75rem;color:rgba(255,255,255,.35);margin-top:.1rem}
    .pricing-price-block{padding:.75rem 0 .5rem;border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06)}
    .pricing-price{font-family:'Syne',sans-serif;font-size:2rem;font-weight:900;color:#fff;display:flex;align-items:baseline;gap:.15rem}
    .pricing-price sup{font-size:1rem;font-weight:700;margin-top:.2rem}
    .pricing-price-note{font-size:.72rem;color:rgba(255,255,255,.3);margin-top:.2rem}
    .pricing-perks-label{font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.3)}
    .pricing-perks{display:flex;flex-direction:column;gap:.45rem}
    .pricing-perk{display:flex;align-items:flex-start;gap:.55rem;font-size:.8rem;color:rgba(255,255,255,.65);line-height:1.45}
    .pricing-perk-ico{flex-shrink:0;margin-top:.1rem}
    .pricing-perk-ico.green{color:#34d399}
    .pricing-perk-ico.gold{color:#ffd700}
    .pricing-perk-ico.blue{color:#60a5fa}
    .pricing-perk-ico.muted{color:rgba(255,255,255,.2)}
    .pricing-perk.disabled{color:rgba(255,255,255,.2)}
    .pricing-cta{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;padding:.7rem 1rem;border-radius:10px;font-size:.82rem;font-weight:700;cursor:pointer;text-decoration:none;transition:all .2s;border:none;width:100%;font-family:'Outfit',sans-serif}
    .pricing-cta.free-btn{background:rgba(255,255,255,.07);color:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.1)}
    .pricing-cta.free-btn:hover{background:rgba(255,255,255,.12);color:#fff}
    .pricing-cta.prem-btn{background:linear-gradient(135deg,#ffd700,#ff9900);color:#0a0806;border:none;font-weight:800}
    .pricing-cta.prem-btn:hover{opacity:.88}
    .pricing-cta.verif-btn{background:rgba(52,211,153,.1);color:#34d399;border:1px solid rgba(52,211,153,.2)}
    .pricing-cta.verif-btn:hover{background:rgba(52,211,153,.18)}

    /* ── SPOTLIGHT (removed — now embedded in combined frame above) ── */
    @media(max-width:750px){
        .pricing-grid{grid-template-columns:1fr}
        .pricing-card.featured{order:-1}
    }

    /* ── FAQ ── */
    .faq-section{padding:3rem 1rem 6rem;max-width:720px;margin:0 auto;position:relative;z-index:1}
    .faq-heading{font-family:'Syne',sans-serif;font-size:1.6rem;font-weight:800;color:#fff;margin-bottom:1.75rem;text-align:center}
    .faq-item{border:1px solid rgba(255,255,255,.08);border-radius:12px;margin-bottom:.75rem;overflow:hidden;background:rgba(255,255,255,.03);transition:border-color .2s}
    .faq-item.open{border-color:rgba(255,255,255,.18);background:rgba(255,255,255,.05)}
    .faq-q{display:flex;align-items:center;justify-content:space-between;padding:1.1rem 1.25rem;cursor:pointer;user-select:none;font-size:.92rem;font-weight:600;color:rgba(255,255,255,.85);gap:1rem}
    .faq-q:hover{color:#fff}
    .faq-toggle{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .2s,transform .2s}
    .faq-item.open .faq-toggle{background:rgba(255,255,255,.12);transform:rotate(45deg)}
    .faq-a{max-height:0;overflow:hidden;transition:max-height .3s ease,padding .3s ease;font-size:.85rem;color:rgba(255,255,255,.45);line-height:1.65;padding:0 1.25rem}
    .faq-item.open .faq-a{max-height:200px;padding:0 1.25rem 1.1rem}

    @media(max-width:700px){
        .features-grid,.features-grid-row2{grid-template-columns:1fr 1fr}.feat-item{border-right:none;border-bottom:1px solid rgba(255,255,255,.06)}.feat-item:nth-child(odd){border-right:1px solid rgba(255,255,255,.06)}
        .trust-card{flex-direction:column;gap:1.5rem;border-radius:20px 20px 0 0}
        .trust-stats{gap:2rem}
        .combined-frame{padding:0 .5rem}
    }

    /* Floating navbar — controlat 100% din JS de mai jos */
    </style>
</head>
<body>
<canvas id="particle-canvas" style="position:fixed;inset:0;z-index:0;pointer-events:none;"></canvas>

<nav class="navbar">
    <a href="/" class="navbar-brand"><?= SITE_NAME ?></a>
    <div class="navbar-links">
        <a href="https://discord.gg/BAEpkJ62VM" target="_blank">Discord</a>
        <a href="/leaderboard">Leaderboard</a>
        <?php if ($loggedIn): ?>
        <a href="/dashboard" class="btn btn-primary btn-sm">Dashboard</a>
        <?php else: ?>
        <a href="/login" class="btn btn-secondary btn-sm">Login</a>
        <a href="/register" class="btn btn-primary btn-sm">Register</a>
        <?php endif; ?>
    </div>
</nav>

<!-- HERO -->
<div class="hero fade-in">
    <h1>One prolfile.<br><em>Endless indentity.</em></h1>

    <?php if (!$loggedIn): ?>
    <div class="hero-claim">
        <span class="hero-claim-prefix">@</span>
        <input type="text" id="hero-username" placeholder="yourname" maxlength="30" autocomplete="off"
               onkeydown="if(event.key==='Enter') claimUsername()">
        <button class="hero-claim-btn" onclick="claimUsername()">Claim</button>
    </div>
    <div class="hero-perks">
        <span class="hero-perk">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
            Free forever
        </span>
        <span class="hero-perk-dot"></span>
        <span class="hero-perk">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            Ready in 2 minutes
        </span>
        <span class="hero-perk-dot"></span>
        <span class="hero-perk">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            No credit card
        </span>
    </div>
    <?php endif; ?>

    <div class="hero-btns">
        <?php if ($loggedIn): ?>
        <a href="/dashboard" class="btn btn-primary">Go to Dashboard</a>
        <a href="/<?= urlencode($myProfile['username']) ?>" class="btn btn-secondary">Open my profile</a>
        <?php else: ?>
        <a href="/register" class="btn btn-primary">Get started free</a>
        <a href="/login" class="btn btn-secondary">Sign in</a>
        <?php endif; ?>
    </div>
</div>
<script>
function claimUsername() {
    const val = document.getElementById('hero-username').value.trim();
    if (val) window.location.href = '/register?u=' + encodeURIComponent(val);
    else window.location.href = '/register';
}
</script>

<!-- COMBINED FRAME: Trust + Marquee + Spotlight -->
<div class="combined-frame fade-in">
<div class="combined-inner">

    <!-- Trust row -->
    <div class="trust-card">
        <div class="trust-headline">
            More than <span><?= fmtNum($totalUsers) ?></span><br>people use <?= SITE_NAME ?>.
        </div>
        <div class="trust-stats">
            <div>
                <div class="trust-stat-label">Users</div>
                <div class="trust-stat-val"><?= fmtNum($totalUsers) ?></div>
            </div>
            <div>
                <div class="trust-stat-label">Profile Views</div>
                <div class="trust-stat-val"><?= fmtNum($totalViews) ?></div>
            </div>
            <div>
                <div class="trust-stat-label" style="color:rgba(255,215,0,.7)">Subscribers</div>
                <div class="trust-stat-val" style="color:#ffd700"><?= fmtNum($totalPremium) ?></div>
            </div>
        </div>
    </div>

    <!-- Marquee row -->
    <?php if (!empty($marqueeUsers)): ?>
    <div class="marquee-wrap">
        <div style="position:relative">
            <div class="marquee-fade-l"></div>
            <div class="marquee-fade-r"></div>
            <div class="marquee-track">
                <?php
                $doubled = array_merge($marqueeUsers, $marqueeUsers);
                foreach ($doubled as $u):
                    $avatar = !empty($u['avatar']) ? '/'.$u['avatar'] : '/assets/img/default-avatar.png';
                    $name   = sanitize($u['display_name'] ?: $u['username']);
                ?>
                <a href="/<?= urlencode($u['username']) ?>" class="marquee-card" target="_blank">
                    <img src="<?= $avatar ?>" onerror="this.src='/assets/img/default-avatar.png'" class="marquee-avatar" alt="">
                    <div>
                        <div class="marquee-name"><?= $name ?></div>
                        <div class="marquee-slug">/<?= sanitize($u['username']) ?></div>
                    </div>
                </a>
                <?php endforeach; ?>
            </div>
        </div>
    </div>
    <?php endif; ?>

    <!-- Spotlight row -->
    <?php if (!empty($spotlightUser)):
        $spAvatar  = !empty($spotlightUser['avatar']) ? '/'.$spotlightUser['avatar'] : '/assets/img/default-avatar.png';
        $spName    = sanitize($spotlightUser['display_name'] ?: $spotlightUser['username']);
        $spHandle  = sanitize($spotlightUser['username']);
        $spBio     = sanitize($spotlightUser['bio']);
        $spViews   = (int)$spotlightUser['views'];
        $spPremium = (bool)$spotlightUser['is_premium'];
    ?>
    <div class="spotlight-inline">
        <div class="spotlight-inline-glow"></div>

        <div class="spotlight-inline-avatar-wrap">
            <div class="spotlight-inline-ring"></div>
            <img src="<?= $spAvatar ?>" onerror="this.src='/assets/img/default-avatar.png'" class="spotlight-inline-avatar" alt="">
        </div>

        <div class="spotlight-inline-info">
            <div class="spotlight-inline-label">
                Spotlight
            </div>
            <div class="spotlight-inline-badge-row">
                <span class="spotlight-inline-live">
                    <span class="spotlight-inline-dot"></span>
                    #1 Global
                </span>
                <?php if ($spPremium): ?>
                <span style="display:inline-flex;align-items:center;gap:.3rem;font-size:.6rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#ffd700;background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.2);border-radius:99px;padding:.18rem .55rem">
                    <svg viewBox="0 0 24 24" fill="none" width="9" height="9" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.3)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
                    Premium
                </span>
                <?php endif; ?>
            </div>
            <div class="spotlight-inline-name"><?= $spName ?></div>
            <div class="spotlight-inline-handle">/<?= $spHandle ?></div>
            <?php if ($spBio): ?>
            <div class="spotlight-inline-bio"><?= $spBio ?></div>
            <?php endif; ?>
            <a href="/<?= urlencode($spHandle) ?>" class="spotlight-inline-cta" target="_blank">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                View Profile
            </a>
        </div>

        <div class="spotlight-inline-stats">
            <div class="spotlight-inline-views-num"><?= fmtNum($spViews) ?></div>
            <div class="spotlight-inline-views-label">Profile Views</div>
            <div class="spotlight-inline-rank">Global #1</div>
        </div>
    </div>
    <?php else: ?>
    <div class="spotlight-empty-inline">No profiles yet — be the first!</div>
    <?php endif; ?>

</div><!-- /.combined-inner -->
</div><!-- /.combined-frame -->

<!-- FEATURES -->
<section class="features-section fade-in">
    <div class="features-intro">
        <div class="features-intro-label">Simple &amp; Intuitive</div>
        <h2>Build a clean profile page <span>without the clutter.</span></h2>
        <p>Everything you need in one place — badges, music, links and analytics, ready in minutes.</p>
    </div>
    <div class="features-divider"></div>
    <div class="features-grid">
        <div class="feat-item">
            <div class="feat-item-top">
                <div class="feat-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.09 6.26L21 9.27l-5 4.87 1.18 6.88L12 17.77l-5.18 3.25L8 14.14 3 9.27l6.91-1.01L12 2z"/></svg>
                </div>
                <div class="feat-title">Badges &amp; Shop</div>
            </div>
            <div class="feat-desc">Unlock showcase badges and spend your tokens on exclusive profile items.</div>
        </div>
        <div class="feat-item">
            <div class="feat-item-top">
                <div class="feat-icon" style="background:rgba(255,0,255,.08);border-color:rgba(255,0,255,.15);color:var(--accent2,#ff00ff)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </div>
                <div class="feat-title">Colors &amp; Effects</div>
            </div>
            <div class="feat-desc">Customize fonts, title effects and background visuals to match your style.</div>
        </div>
        <div class="feat-item">
            <div class="feat-item-top">
                <div class="feat-icon" style="background:rgba(255,180,0,.08);border-color:rgba(255,180,0,.15);color:#fbbf24">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                </div>
                <div class="feat-title">Avatars &amp; Media</div>
            </div>
            <div class="feat-desc">Upload your own avatar, background and audio to stand out instantly.</div>
        </div>
        <div class="feat-item">
            <div class="feat-item-top">
                <div class="feat-icon" style="background:rgba(95,239,165,.08);border-color:rgba(95,239,165,.15);color:#5fefa5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                </div>
                <div class="feat-title">Analytics</div>
            </div>
            <div class="feat-desc">Track views, clicks and countries from a simple, readable dashboard.</div>
        </div>
    </div>
</section>

<!-- PRICING -->
<section class="pricing-section fade-in">
    <div class="pricing-heading-label">Pricing</div>
    <div class="pricing-heading">One-Time Payment, Lifetime Access</div>
    <div class="pricing-sub">Pay once, enjoy forever — no subscriptions, no hidden fees.</div>

    <div class="pricing-grid">

        <!-- FREE -->
        <div class="pricing-card">
            <div class="pricing-plan-top">
                <div class="pricing-plan-icon free-ico">
                    <!-- same icon as 'og' badge (grid/dice) -->
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm2 4a1 1 0 100 2 1 1 0 000-2zm10 0a1 1 0 100 2 1 1 0 000-2zm-5 5a1 1 0 100 2 1 1 0 000-2zM7 16a1 1 0 100 2 1 1 0 000-2zm10 0a1 1 0 100 2 1 1 0 000-2z"/></svg>
                </div>
                <div>
                    <div class="pricing-plan-name">Free Plan</div>
                    <div class="pricing-plan-tagline">Your biolink starts here.</div>
                </div>
            </div>
            <div class="pricing-price-block">
                <div class="pricing-price"><sup>€</sup>0</div>
                <div class="pricing-price-note">Free for everyone</div>
            </div>
            <div class="pricing-perks-label">Features</div>
            <div class="pricing-perks">
                <div class="pricing-perk"><span class="pricing-perk-ico green"><svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg></span> Unlimited links</div>
                <div class="pricing-perk"><span class="pricing-perk-ico green"><svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg></span> Profile Analytics</div>
                <div class="pricing-perk"><span class="pricing-perk-ico green"><svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg></span> Basic customizations</div>
                <div class="pricing-perk disabled"><span class="pricing-perk-ico muted"><svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></span> Extra customizations</div>
                <div class="pricing-perk disabled"><span class="pricing-perk-ico muted"><svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></span> Premium features</div>
            </div>
            <a href="/register" class="pricing-cta free-btn">Get Started</a>
        </div>

        <!-- PREMIUM -->
        <div class="pricing-card featured">
            <div class="pricing-badge hot">Most Popular</div>
            <div class="pricing-plan-top">
                <div class="pricing-plan-icon prem-ico">
                    <!-- same SVG as premium badge from badges.php -->
                    <svg viewBox="0 0 24 24" fill="none" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.25)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" opacity=".8"/></svg>
                </div>
                <div>
                    <div class="pricing-plan-name">Premium Plan</div>
                    <div class="pricing-plan-tagline">Unlock the full biolink experience.</div>
                </div>
            </div>
            <div class="pricing-price-block">
                <div class="pricing-price"><sup>€</sup>7</div>
                <div class="pricing-price-note">Lifetime · one-time payment</div>
            </div>
            <div class="pricing-perks-label">Features</div>
            <div class="pricing-perks">
                <div class="pricing-perk"><span class="pricing-perk-ico gold"><svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg></span> Full Analytics dashboard</div>
                <div class="pricing-perk"><span class="pricing-perk-ico gold"><svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M6.5 3C4.6 3 3 4.6 3 6.5c0 5.3 7.5 13.5 9 13.5S21 11.8 21 6.5C21 4.6 19.4 3 17.5 3c-1.2 0-2.2.6-2.9 1.5C14.8 3.6 13.5 3 12 3s-2.8.6-3.5 1.5C7.7 3.6 6.7 3 6.5 3z" opacity=".6"/><path d="M12 3c1.5 0 2.8.6 3.6 1.5C14.8 3.6 13.7 3 12.5 3H12zm0 0c-1.5 0-2.8.6-3.6 1.5C9.2 3.6 10.3 3 11.5 3H12z"/><path d="M12 2a5 5 0 100 10A5 5 0 0012 2zm0 8a3 3 0 110-6 3 3 0 010 6z"/></svg></span> Exclusive Diamond badge</div>
                <div class="pricing-perk"><span class="pricing-perk-ico gold"><svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 2L9.5 8.5H3l5.5 4L6 19l6-4 6 4-2.5-6.5L21 8.5h-6.5L12 2z"/></svg></span> Visual Effects access</div>
                <div class="pricing-perk"><span class="pricing-perk-ico gold"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg></span> Golden 3D avatar ring</div>
                <div class="pricing-perk"><span class="pricing-perk-ico gold"><svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg></span> Double referral rewards (20 tokens)</div>
                <div class="pricing-perk"><span class="pricing-perk-ico gold"><svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg></span> 5 tokens per profile view (vs 3)</div>
                <div class="pricing-perk"><span class="pricing-perk-ico gold"><svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg></span> Priority support</div>
                <div class="pricing-perk"><span class="pricing-perk-ico gold"><svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.59 13L12 10.41 7.41 15 6 13.59l4.59-4.59L6 4.41 7.41 3 12 7.59 16.59 3 18 4.41l-4.59 4.59L18 13.59 16.59 15z"/></svg></span> Remove watermark from profile</div>
            </div>
            <a href="/shop" class="pricing-cta prem-btn">
                <svg viewBox="0 0 24 24" fill="none" width="14" height="14" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.25)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" opacity=".8"/></svg>
                Learn more
            </a>
        </div>

        <!-- VERIFIED -->
        <div class="pricing-card verified-card">
            <div class="pricing-badge extra">Extra</div>
            <div class="pricing-plan-top">
                <div class="pricing-plan-icon verif-ico">
                    <!-- same SVG as verified badge from badges.php -->
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                </div>
                <div>
                    <div class="pricing-plan-name">Verified Profile</div>
                    <div class="pricing-plan-tagline">Stand out with an official badge.</div>
                </div>
            </div>
            <div class="pricing-price-block">
                <div class="pricing-price"><sup>€</sup>5</div>
                <div class="pricing-price-note">One-time · permanent</div>
            </div>
            <div class="pricing-perks-label">Features</div>
            <div class="pricing-perks">
                <div class="pricing-perk"><span class="pricing-perk-ico green"><svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg></span> Official green checkmark badge</div>
                <div class="pricing-perk"><span class="pricing-perk-ico green"><svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg></span> Visible on your public profile</div>
                <div class="pricing-perk"><span class="pricing-perk-ico green"><svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg></span> Permanent — one-time purchase</div>
                <div class="pricing-perk"><span class="pricing-perk-ico green"><svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg></span> Builds trust with your audience</div>
            </div>
            <a href="/shop" class="pricing-cta verif-btn">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                Learn more
            </a>
        </div>

    </div>
</section>

<!-- FAQ -->
<section class="faq-section fade-in">
    <div class="faq-heading">Frequently Asked Questions</div>

    <?php
    $faqs = [
        ["What is ".SITE_NAME."?",         SITE_NAME." is a modern bio link platform built for creators and communities. One link that holds everything — your socials, your story, your brand."],
        ["Is ".SITE_NAME." free?",          "Yes, completely free. No credit card required. Create your profile in seconds and start sharing it right away. You can start for free and upgrade to Premium anytime"],
        ["How fast is setup?",              "Under 2 minutes. Pick a username, add your links, upload an avatar — and you're live."],
        ["Can I customize my profile?",     "Absolutely. You can change fonts, background, accent colors, add visual effects, music, and even upload a custom cursor."],
        ["What links can I add?",           "Any platform — Instagram, Discord, Steam, Spotify, TikTok, YouTube, GitHub, your own website, and many more."],
        ["What are tokens?",                "Tokens are the in-platform currency. Earn or receive them to unlock exclusive perks in the shop."],
    ];
    foreach ($faqs as $i => $faq):
    ?>
    <div class="faq-item" id="faq-<?= $i ?>">
        <div class="faq-q" onclick="toggleFaq(<?= $i ?>)">
            <span><?= htmlspecialchars($faq[0]) ?></span>
            <div class="faq-toggle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
        </div>
        <div class="faq-a"><?= htmlspecialchars($faq[1]) ?></div>
    </div>
    <?php endforeach; ?>
</section>

<script>
function toggleFaq(i) {
    const item = document.getElementById('faq-' + i);
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
}
</script>
<script>window.PARTICLE_ENABLED=true;window.CURSOR_TRAIL_ENABLED=false;window.ACCENT_COLOR='#00d4ff';</script>
<script src="/assets/js/particles.js?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/js/particles.js') ?: time() ?>"></script>

<script>
// ── Floating Navbar on Scroll — stiluri inline (bat orice CSS) ──────────
(function () {
    var nav = document.querySelector('.navbar');
    if (!nav) return;

    var EASE = '.5s cubic-bezier(.4,0,.2,1)';
    var TRANSITION = [
        'top '           + EASE,
        'width '         + EASE,
        'max-width '     + EASE,
        'border-radius ' + EASE,
        'background '    + EASE,
        'backdrop-filter ' + EASE,
        'border-color '  + EASE,
        'box-shadow '    + EASE
    ].join(', ');

    // Stare initiala — setata direct pe element, bate orice CSS extern
    function applyBase() {
        nav.style.cssText = [
            'position:fixed',
            'top:0',
            'left:50%',
            'right:auto',
            'transform:translateX(-50%)',
            'z-index:999',
            'width:100%',
            'max-width:100%',
            'background:transparent',
            'backdrop-filter:none',
            '-webkit-backdrop-filter:none',
            'border:1px solid transparent',
            'box-shadow:none',
            'border-radius:0',
            'transition:' + TRANSITION
        ].join(';');
    }

    function onScroll() {
        if (window.scrollY > 60) {
            // Floating — centrat, mic, blur
            nav.style.top            = '14px';
            nav.style.width          = 'calc(100% - 2.5rem)';
            nav.style.maxWidth       = '780px';
            nav.style.borderRadius   = '18px';
            nav.style.background     = 'rgba(10,10,16,0.85)';
            nav.style.backdropFilter = 'blur(20px) saturate(160%)';
            nav.style.webkitBackdropFilter = 'blur(20px) saturate(160%)';
            nav.style.border         = '1px solid rgba(255,255,255,.13)';
            nav.style.boxShadow      = '0 8px 48px rgba(0,0,0,.55)';
        } else {
            // Normal — transparent, full width
            nav.style.top            = '0';
            nav.style.width          = '100%';
            nav.style.maxWidth       = '100%';
            nav.style.borderRadius   = '0';
            nav.style.background     = 'transparent';
            nav.style.backdropFilter = 'none';
            nav.style.webkitBackdropFilter = 'none';
            nav.style.border         = '1px solid transparent';
            nav.style.boxShadow      = 'none';
        }
    }

    applyBase();
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
})();
</script>

<!-- FOOTER -->
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