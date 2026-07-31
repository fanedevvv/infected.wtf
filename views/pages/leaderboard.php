<?php
$loggedIn  = isLoggedIn();
$myUserId  = $loggedIn ? (int)$_SESSION['user_id'] : 0;
$myProfile = $loggedIn ? getProfile($pdo, $myUserId) : null;

// Get user's selected leaderboard region
$myRegionCode = '';
$myRegionName = '';
if ($loggedIn) {
    $regStmt = $pdo->prepare("SELECT leaderboard_region_code, leaderboard_region_name FROM users WHERE id=?");
    $regStmt->execute([$myUserId]);
    $regRow = $regStmt->fetch();
    $myRegionCode = $regRow['leaderboard_region_code'] ?? '';
    $myRegionName = $regRow['leaderboard_region_name'] ?? '';
}

// ── Auto-detect country from IP (always, for local leaderboard filtering) ───────────────
$detectedCountry = '';
$detectedCountryCode = '';
$ip = '';
if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
    $ip = trim($_SERVER['HTTP_CF_CONNECTING_IP']);
} elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $ip = trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
} elseif (!empty($_SERVER['REMOTE_ADDR'])) {
    $ip = trim($_SERVER['REMOTE_ADDR']);
}
if (!empty($_SERVER['HTTP_CF_IPCOUNTRY'])) {
    $detectedCountryCode = strtoupper(substr($_SERVER['HTTP_CF_IPCOUNTRY'], 0, 2));
} elseif ($ip && $ip !== '127.0.0.1' && $ip !== '::1') {
    $geoUrl = "http://ip-api.com/json/{$ip}?fields=countryCode,country";
    $geo = false;
    if (function_exists('curl_init')) {
        $ch = curl_init($geoUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        $geo = curl_exec($ch);
        curl_close($ch);
    }
    if (!$geo) {
        $geo = @file_get_contents($geoUrl);
    }
    if ($geo) {
        $geoData = json_decode($geo, true);
        $detectedCountry     = $geoData['country'] ?? '';
        $detectedCountryCode = $geoData['countryCode'] ?? '';
    }
}
// Numele tarii afisat in badge: din setari > detectat din IP > JS fallback
$badgeRegionName = ($myRegionName && $myRegionCode !== 'XX') ? $myRegionName : $detectedCountry;

// ── Global top 100 ──────────────────────────────────────────────
$topStmt = $pdo->query("
    SELECT u.id, u.username, u.banned,
           COALESCE(p.display_name,'') AS display_name,
           COALESCE(p.avatar,'')       AS avatar,
           COALESCE(p.views,0)         AS views,
           COALESCE(p.badges,'[]')     AS badges_json,
           COALESCE(u.is_premium,0)    AS is_premium,
           u.premium_expires_at
    FROM users u
    JOIN profiles p ON p.user_id = u.id
    WHERE u.banned = 0 AND u.email_verified = 1
    ORDER BY p.views DESC
    LIMIT 100
");
$topUsers = $topStmt->fetchAll();

// ── Local top 100 — filtrat după țara vizitatorului (din IP) ──
if ($detectedCountryCode && $detectedCountryCode !== 'XX') {
    $localStmt = $pdo->prepare("
        SELECT u.id, u.username, u.banned,
               COALESCE(p.display_name,'') AS display_name,
               COALESCE(p.avatar,'')       AS avatar,
               COALESCE(u.is_premium,0)    AS is_premium,
               u.premium_expires_at,
               COALESCE(p.badges,'[]')     AS badges_json,
               COALESCE(p.local_views,0)   AS local_views,
               COALESCE(u.leaderboard_region_name,'') AS region_name
        FROM users u
        JOIN profiles p ON p.user_id = u.id
        WHERE u.banned = 0 AND u.email_verified = 1
          AND u.leaderboard_region_code = ?
        ORDER BY p.local_views DESC
        LIMIT 100
    ");
    $localStmt->execute([$detectedCountryCode]);
} else {
    $localStmt = $pdo->query("
        SELECT u.id, u.username, u.banned,
               COALESCE(p.display_name,'') AS display_name,
               COALESCE(p.avatar,'')       AS avatar,
               COALESCE(u.is_premium,0)    AS is_premium,
               u.premium_expires_at,
               COALESCE(p.badges,'[]')     AS badges_json,
               COALESCE(p.local_views,0)   AS local_views,
               COALESCE(u.leaderboard_region_name,'') AS region_name
        FROM users u
        JOIN profiles p ON p.user_id = u.id
        WHERE u.banned = 0 AND u.email_verified = 1
          AND u.leaderboard_region_code IS NOT NULL
          AND u.leaderboard_region_code != ''
          AND u.leaderboard_region_code != 'XX'
        ORDER BY p.local_views DESC
        LIMIT 100
    ");
}
$localUsers = $localStmt->fetchAll();

// ── My rank (global) ─────────────────────────────────────────────
$myRankGlobal = 0; $myViewsGlobal = 0;
if ($loggedIn) {
    foreach ($topUsers as $i => $u) {
        if ((int)$u['id'] === $myUserId) { $myRankGlobal = $i + 1; $myViewsGlobal = (int)$u['views']; break; }
    }
    if (!$myRankGlobal) {
        $r = $pdo->prepare("SELECT COUNT(*)+1 AS rp,(SELECT COALESCE(views,0) FROM profiles WHERE user_id=?) AS mv FROM profiles p JOIN users u ON u.id=p.user_id WHERE p.views>(SELECT COALESCE(views,0) FROM profiles WHERE user_id=?) AND u.banned=0 AND u.email_verified=1");
        $r->execute([$myUserId,$myUserId]); $row=$r->fetch(); $myRankGlobal=(int)$row['rp']; $myViewsGlobal=(int)$row['mv'];
    }
    // ── Notify user once per day if they are #1 globally ─────────────
    if ($myRankGlobal === 1) {
        $todayKey = date('Y-m-d');
        $alreadyNotified = false;
        try {
            $chk = $pdo->prepare("SELECT id FROM notifications WHERE user_id=? AND type='leaderboard_first' AND DATE(created_at)=? LIMIT 1");
            $chk->execute([$myUserId, $todayKey]);
            $alreadyNotified = (bool)$chk->fetch();
        } catch (Throwable $e) {}
        if (!$alreadyNotified) {
            pushNotification($pdo, $myUserId, 'leaderboard_first',
                '🏆 You\'re #1 on the Leaderboard!',
                'You are currently the top profile on the global leaderboard. Keep it up!',
                'trophy', '/leaderboard'
            );
        }
    }
}

// ── My rank (local) ──────────────────────────────────────────────
$myRankLocal = 0; $myViewsLocal = 0;
if ($loggedIn && $myRegionCode && $myRegionCode !== 'XX') {
    foreach ($localUsers as $i => $u) {
        if ((int)$u['id'] === $myUserId) {
            $myRankLocal  = $i + 1;
            $myViewsLocal = (int)$u['local_views'];
            break;
        }
    }
    // Dacă nu e în top 100, calculăm rank-ul exact
    if (!$myRankLocal) {
        $myLvStmt = $pdo->prepare("SELECT COALESCE(local_views,0) FROM profiles WHERE user_id=?");
        $myLvStmt->execute([$myUserId]);
        $myViewsLocal = (int)$myLvStmt->fetchColumn();
        $myLrStmt = $pdo->prepare("
            SELECT COUNT(*)+1 FROM profiles p
            JOIN users u ON u.id=p.user_id
            WHERE u.leaderboard_region_code IS NOT NULL
              AND u.leaderboard_region_code != ''
              AND u.leaderboard_region_code != 'XX'
              AND COALESCE(p.local_views,0) > ?
              AND u.banned=0 AND u.email_verified=1
        ");
        $myLrStmt->execute([$myViewsLocal]);
        $myRankLocal = (int)$myLrStmt->fetchColumn();
    }
}

// ── Search ───────────────────────────────────────────────────────
$searchQuery  = trim($_GET['q'] ?? '');
$searchResult = null; $searchRank = 0;
if ($searchQuery !== '') {
    $sr = $pdo->prepare("SELECT u.id,u.username,COALESCE(p.display_name,'') AS display_name,COALESCE(p.avatar,'') AS avatar,COALESCE(p.views,0) AS views FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.username=? AND u.banned=0 AND u.email_verified=1 LIMIT 1");
    $sr->execute([$searchQuery]); $searchResult = $sr->fetch();
    if ($searchResult) {
        $srr = $pdo->prepare("SELECT COUNT(*)+1 FROM profiles p JOIN users u ON u.id=p.user_id WHERE p.views>? AND u.banned=0 AND u.email_verified=1");
        $srr->execute([(int)$searchResult['views']]); $searchRank = (int)$srr->fetchColumn();
    }
}
?>
<?php
function lbIsPremium(array $u): bool {
    return !empty($u['is_premium']) && (empty($u['premium_expires_at']) || strtotime($u['premium_expires_at']) > time());
}
function lbPremBadge(): string {
    return '<span class="lb-prem-badge"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.2)" stroke="#ffd700" stroke-width="1.6" stroke-linejoin="round"/><path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="#ffd700" stroke-width="1.3" stroke-linejoin="round" opacity=".75"/></svg></span>';
}
function fmtViews($v): string {
    return $v >= 1000 ? round($v/1000,1).'K' : (string)$v;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= SITE_NAME ?> — Leaderboard</title>
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&family=Space+Mono:wght@400;700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/main.css?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/css/main.css') ?: time() ?>">
    <style>
    :root {
        --accent: #00d4ff;
        --accent2: #ff00ff;
        --bg: #050507;
        --surface: rgba(255,255,255,0.04);
        --surface-hover: rgba(255,255,255,0.08);
        --border: rgba(255,255,255,0.08);
        --text: #f0f0f0;
        --text-muted: rgba(240,240,240,0.5);
        --radius: 14px;
        --radius-sm: 8px;
        --shadow: 0 8px 32px rgba(0,0,0,0.5);
    }
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth}
    body{font-family:'Outfit',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
    ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:var(--bg)}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}::-webkit-scrollbar-thumb:hover{background:var(--accent)}

    .lb-page { padding-top: 73px; }

    /* ── HERO ── */
    .lb-hero { max-width: 900px; margin: 2.5rem auto 1.5rem; padding: 0 1.25rem; }
    .lb-hero-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        margin-bottom: 1.1rem;
    }
    .lb-hero-left {}
    .lb-hero-label { font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:rgba(167,139,250,.7);margin-bottom:.4rem }
    .lb-hero-title { font-family:'Syne',sans-serif;font-size:clamp(1.4rem,4vw,2rem);font-weight:900;color:#fff }

    /* ── TAB SWITCH ── */
    .lb-tab-switch {
        display: flex;
        background: rgba(255,255,255,.06);
        border: 1px solid rgba(255,255,255,.1);
        border-radius: 12px;
        padding: 4px;
        gap: 4px;
        flex-shrink: 0;
    }
    .lb-tab-btn {
        padding: .45rem 1.25rem;
        border-radius: 9px;
        font-size: .82rem;
        font-weight: 700;
        font-family: 'Outfit', sans-serif;
        border: none;
        cursor: pointer;
        transition: all .2s;
        color: rgba(255,255,255,.45);
        background: transparent;
    }
    .lb-tab-btn.active {
        background: linear-gradient(135deg, var(--accent), #0099bb);
        color: #000;
        box-shadow: 0 2px 12px rgba(0,212,255,.35);
    }
    .lb-tab-btn:not(.active):hover { color: #fff; background: rgba(255,255,255,.08); }

    /* ── SEARCH + RANK ROW ── */
    .lb-controls {
        display: flex;
        flex-direction: column;
        gap: .75rem;
    }
    .lb-search-form { display:flex;gap:.5rem;max-width:380px;align-items:center }
    .lb-search-wrap { position:relative;flex:1;min-width:0 }
    .lb-search-icon { position:absolute;left:.75rem;top:50%;transform:translateY(-50%);color:rgba(255,255,255,.3);pointer-events:none }
    .lb-search-input { width:100%;padding:.52rem 1rem .52rem 2.4rem;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#fff;font-size:.85rem;font-family:'Outfit',sans-serif;outline:none;transition:border-color .2s }
    .lb-search-input:focus { border-color:rgba(167,139,250,.6) }
    .lb-search-input::placeholder { color:rgba(255,255,255,.3) }
    .lb-search-btn { padding:.52rem 1rem;border-radius:10px;background:linear-gradient(135deg,var(--accent),#0099bb);color:#000;font-size:.82rem;font-weight:700;border:none;cursor:pointer;font-family:'Outfit',sans-serif;white-space:nowrap;transition:all .2s;flex-shrink:0 }
    .lb-search-btn:hover { filter:brightness(1.1) }
    .lb-search-clear { padding:.5rem .8rem;border-radius:10px;background:rgba(255,255,255,.06);color:var(--text-muted);border:1px solid rgba(255,255,255,.1);font-size:.85rem;cursor:pointer;font-family:'Outfit',sans-serif;flex-shrink:0;text-decoration:none;display:inline-flex;align-items:center }
    .lb-search-clear:hover { background:rgba(255,255,255,.1) }

    /* ── MY RANK INLINE ── */
    .lb-rank-pill {
        display: inline-flex; align-items: center; gap: .6rem;
        background: rgba(0,212,255,.07); border: 1px solid rgba(0,212,255,.2);
        border-radius: 10px; padding: .45rem 1rem;
        font-size: .82rem; max-width: fit-content;
    }
    .lb-rank-pill strong { color: var(--accent); font-family:'Syne',sans-serif; font-size:1rem }

    /* ── CONTENT PANELS with fade transition ── */
    .lb-panel {
        opacity: 1;
        transition: opacity .28s ease;
        pointer-events: auto;
    }
    .lb-panel.fading {
        opacity: 0;
        pointer-events: none;
    }

    /* ── SEARCH RESULT ── */
    .lb-search-result { max-width:900px;margin:0 auto 1.5rem;padding:0 1.25rem }
    .lb-search-found { display:flex;align-items:center;gap:1rem;background:rgba(167,139,250,.07);border:1px solid rgba(167,139,250,.2);border-radius:14px;padding:1rem 1.25rem }
    .lb-search-not-found { text-align:center;padding:1rem;color:rgba(255,255,255,.35);font-size:.88rem;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px }
    .lb-search-rank-badge { font-family:'Syne',sans-serif;font-size:1.6rem;font-weight:900;color:rgba(167,139,250,.9);min-width:48px;text-align:center }
    .lb-search-avatar { width:46px;height:46px;border-radius:12px;object-fit:cover;border:2px solid rgba(255,255,255,.1);flex-shrink:0 }
    .lb-search-link { margin-left:auto;flex-shrink:0 }

    /* ── INFO BANNER (set region / login) ── */
    .lb-info-banner {
        max-width: 900px; margin: 0 auto 1.5rem; padding: 0 1.25rem;
    }
    .lb-info-banner-card {
        background: rgba(0,212,255,.05); border: 1px solid rgba(0,212,255,.18);
        border-radius: 14px; padding: 1rem 1.5rem;
        display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
    }
    .lb-info-banner-card p { font-size:.88rem; color:rgba(255,255,255,.6); flex:1 }
    .lb-info-banner-card a { flex-shrink:0; }

    /* ── PODIUM ── */
    .lb-podium-wrap { max-width:900px;margin:0 auto 2rem;padding:0 1.25rem }
    .lb-podium { display:flex;align-items:flex-end;justify-content:center;gap:1rem }
    .lb-podium-slot { display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform .2s }
    .lb-podium-slot:hover { transform:translateY(-4px) }
    .lb-podium-slot.p1{order:2}.lb-podium-slot.p2{order:1}.lb-podium-slot.p3{order:3}
    .lb-podium-card { border-radius:18px;border:1px solid rgba(255,255,255,.1);overflow:hidden;position:relative;display:flex;flex-direction:column;align-items:center;padding:1.25rem 1rem 1rem;gap:.6rem;transition:border-color .2s }
    .p1 .lb-podium-card { width:200px;background:linear-gradient(160deg,rgba(200,151,10,.18),rgba(200,151,10,.04));border-color:rgba(200,151,10,.35);box-shadow:0 0 30px rgba(200,151,10,.12) }
    .p2 .lb-podium-card { width:170px;background:linear-gradient(160deg,rgba(160,160,160,.14),rgba(160,160,160,.04));border-color:rgba(160,160,160,.25) }
    .p3 .lb-podium-card { width:170px;background:linear-gradient(160deg,rgba(122,79,46,.14),rgba(122,79,46,.04));border-color:rgba(122,79,46,.25) }
    .lb-podium-rank { position:absolute;top:.75rem;right:.75rem;width:24px;height:24px;border-radius:50%;font-family:'Syne',sans-serif;font-size:.75rem;font-weight:900;display:flex;align-items:center;justify-content:center }
    .p1 .lb-podium-rank{background:#c8970a;color:#000}.p2 .lb-podium-rank{background:#8a8a8a;color:#000}.p3 .lb-podium-rank{background:#7a4f2e;color:#fff}
    .lb-podium-avatar { border-radius:14px;object-fit:cover;border:2px solid rgba(255,255,255,.15);display:block;flex-shrink:0 }
    .p1 .lb-podium-avatar{width:90px;height:90px;border-color:rgba(200,151,10,.5)}.p2 .lb-podium-avatar,.p3 .lb-podium-avatar{width:72px;height:72px}
    .lb-podium-name { font-weight:700;font-size:.9rem;color:#fff;text-align:center;line-height:1.3;word-break:break-word }
    .lb-podium-views { display:flex;align-items:center;gap:.35rem;font-family:'Space Mono',monospace;font-size:.8rem;color:rgba(255,255,255,.5) }
    .p1 .lb-podium-views { color:rgba(200,151,10,.8) }

    /* ── TABLE ── */
    .lb-table-wrap { max-width:900px;margin:0 auto 4rem;padding:0 1.25rem }
    .lb-table { width:100%;border-collapse:collapse;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);border-radius:16px;overflow:hidden }
    .lb-table thead tr { background:rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.07) }
    .lb-table th { padding:.85rem 1.25rem;font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.35);text-align:left }
    .lb-table th:last-child { text-align:right }
    .lb-table tbody tr { border-bottom:1px solid rgba(255,255,255,.05);transition:background .15s;cursor:pointer }
    .lb-table tbody tr:last-child { border-bottom:none }
    .lb-table tbody tr:hover { background:rgba(255,255,255,.04) }
    .lb-table tbody tr.is-me { background:rgba(0,212,255,.05) !important;border-left:3px solid rgba(0,212,255,.5) }
    .lb-table td { padding:.85rem 1.25rem;vertical-align:middle }
    .lb-rank-num { font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:900;min-width:36px;text-align:center;color:rgba(255,255,255,.3) }
    .lb-user-cell { display:flex;align-items:center;gap:.85rem }
    .lb-avatar { width:40px;height:40px;border-radius:10px;object-fit:cover;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);flex-shrink:0 }
    .lb-display-name { font-weight:700;font-size:.9rem;color:#fff;line-height:1.3 }
    .lb-username { font-size:.75rem;color:rgba(255,255,255,.4);margin-top:.05rem }
    .lb-views { font-family:'Space Mono',monospace;font-size:.9rem;font-weight:700;color:#fff;text-align:right }

    /* ── Region tag in local table ── */
    .lb-region-tag {
        font-size:.68rem;color:rgba(167,139,250,.7);
        background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.18);
        border-radius:5px;padding:.1rem .45rem;margin-top:.2rem;display:inline-block;
    }

    /* ── Premium badge ── */
    .lb-prem-badge { display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,rgba(255,215,0,.25),rgba(255,160,0,.15));border:1.5px solid rgba(255,215,0,.6);box-shadow:0 0 10px rgba(255,215,0,.35);cursor:default;position:relative;vertical-align:middle }
    .lb-prem-badge svg { filter:drop-shadow(0 0 4px rgba(255,215,0,.8)) }
    .lb-prem-badge-wrap { display:inline-flex;align-items:center;gap:.45rem }
    .lb-prem-badge::after { content:'Premium';position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:rgba(15,12,4,.96);border:1px solid rgba(255,215,0,.35);color:#ffd700;font-size:.72rem;font-weight:700;font-family:'Outfit',sans-serif;white-space:nowrap;padding:.3rem .75rem;border-radius:8px;pointer-events:none;opacity:0;transition:opacity .18s,transform .18s;transform:translateX(-50%) translateY(4px);box-shadow:0 4px 16px rgba(0,0,0,.5);z-index:99 }
    .lb-prem-badge:hover::after { opacity:1;transform:translateX(-50%) translateY(0) }

    /* ── Local region badge ── */
    .lb-local-badge {
        display: inline-flex; align-items: center; gap: .35rem;
        font-size: .72rem; color: rgba(167,139,250,.8);
        background: rgba(167,139,250,.1); border: 1px solid rgba(167,139,250,.2);
        border-radius: 6px; padding: .2rem .55rem; margin-left: .5rem;
        font-weight: 600;
    }

    @media(max-width:700px){
        .lb-hero-top { flex-direction: column; gap: .85rem; }
        .lb-tab-switch { align-self: flex-start; }
        .lb-podium{gap:.6rem}.p1 .lb-podium-card{width:160px}.p2 .lb-podium-card,.p3 .lb-podium-card{width:130px}.p1 .lb-podium-avatar{width:70px;height:70px}.p2 .lb-podium-avatar,.p3 .lb-podium-avatar{width:56px;height:56px}
        .lb-table th:nth-child(3),.lb-table td:nth-child(3){display:none}
    }
    </style>
</head>
<body>

<nav class="navbar">
    <a href="/" class="navbar-brand"><?= SITE_NAME ?></a>
    <div class="navbar-links">
        <a href="https://discord.gg/BAEpkJ62VM" target="_blank">Discord</a>
        <a href="/leaderboard" style="color:#fff;font-weight:600">Leaderboard</a>
        <?php if ($loggedIn): ?>
        <a href="/dashboard" class="btn btn-primary btn-sm">Dashboard</a>
        <?php else: ?>
        <a href="/login"    class="btn btn-secondary btn-sm">Login</a>
        <a href="/register" class="btn btn-primary btn-sm">Register</a>
        <?php endif; ?>
    </div>
</nav>

<div class="lb-page">

<!-- HERO -->
<div class="lb-hero">
    <div class="lb-hero-top">
        <div class="lb-hero-left">
            <div class="lb-hero-label">Hall of Fame</div>
            <div class="lb-hero-title">Views Leaderboard</div>
        </div>
        <!-- TAB BUTTONS -->
        <div class="lb-tab-switch">
            <button class="lb-tab-btn active" id="btn-global" onclick="switchTab('global')">Global</button>
            <button class="lb-tab-btn" id="btn-local" onclick="switchTab('local')">Local</button>
        </div>
    </div>

    <!-- Controls: search + rank pill -->
    <div class="lb-controls">
        <form class="lb-search-form" method="get" action="/leaderboard">
            <div class="lb-search-wrap">
                <svg class="lb-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" name="q" class="lb-search-input" placeholder="Search username…" value="<?= htmlspecialchars($searchQuery) ?>" autocomplete="off">
            </div>
            <button type="submit" class="lb-search-btn">Search</button>
            <?php if ($searchQuery): ?>
            <a href="/leaderboard" class="lb-search-clear">✕</a>
            <?php endif; ?>
        </form>

        <?php if ($loggedIn && !$searchQuery && $myProfile): ?>
        <div id="rank-pill-global" class="lb-rank-pill" style="display:inline-flex">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="color:var(--accent);flex-shrink:0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            You are ranked <strong>#<?= number_format($myRankGlobal) ?></strong> with <?= number_format($myViewsGlobal) ?> global views<?php if($myRankGlobal>100): ?> — Keep growing!<?php endif; ?>
        </div>
        <?php if ($myRegionCode && $myRegionCode !== 'XX'): ?>
        <div id="rank-pill-local" class="lb-rank-pill" style="display:none">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="color:var(--accent);flex-shrink:0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <?php if ($myRankLocal > 0): ?>
            You are ranked <strong>#<?= number_format($myRankLocal) ?></strong> in <?= htmlspecialchars($myRegionName) ?> with <?= number_format($myViewsLocal) ?> local views
            <?php else: ?>
            You have no local views yet in <?= htmlspecialchars($myRegionName) ?>. Keep going!
            <?php endif; ?>
        </div>
        <?php else: ?>
        <div id="rank-pill-local" style="display:none"></div>
        <?php endif; ?>
        <?php endif; ?>
    </div>
</div>

<!-- SEARCH RESULT -->
<?php if ($searchQuery): ?>
<div class="lb-search-result">
    <?php if ($searchResult): ?>
    <div class="lb-search-found">
        <div class="lb-search-rank-badge">#<?= number_format($searchRank) ?></div>
        <img src="<?= $searchResult['avatar'] ? '/'.$searchResult['avatar'] : '/assets/img/default-avatar.png' ?>" class="lb-search-avatar" onerror="this.src='/assets/img/default-avatar.png'" alt="">
        <div>
            <div style="font-weight:700;font-size:.95rem"><?= htmlspecialchars($searchResult['display_name'] ?: $searchResult['username']) ?></div>
            <div style="font-size:.8rem;color:rgba(255,255,255,.4);margin-top:.15rem">@<?= htmlspecialchars($searchResult['username']) ?> · <?= number_format($searchResult['views']) ?> views</div>
        </div>
        <a href="/<?= urlencode($searchResult['username']) ?>" class="btn btn-secondary btn-sm lb-search-link" target="_blank">↗ Profile</a>
    </div>
    <?php else: ?>
    <div class="lb-search-not-found">No user found for "<strong><?= htmlspecialchars($searchQuery) ?></strong>"</div>
    <?php endif; ?>
</div>
<?php endif; ?>

<!-- GLOBAL PANEL -->
<div id="panel-global" class="lb-panel">
    <?php if (!$searchQuery && count($topUsers) >= 1): ?>
    <div class="lb-podium-wrap">
        <div class="lb-podium">
        <?php
        $podiumOrder = [
            ['rank'=>2,'class'=>'p2','user'=>$topUsers[1]??null],
            ['rank'=>1,'class'=>'p1','user'=>$topUsers[0]??null],
            ['rank'=>3,'class'=>'p3','user'=>$topUsers[2]??null],
        ];
        foreach ($podiumOrder as $pod):
            if (!$pod['user']) continue;
            $pu=$pod['user']; $pAvatar=$pu['avatar']?'/'.$pu['avatar']:'/assets/img/default-avatar.png';
            $pName=$pu['display_name']?:$pu['username']; $pViews=fmtViews((int)$pu['views']);
        ?>
        <div class="lb-podium-slot <?= $pod['class'] ?>" onclick="window.open('/<?= urlencode($pu['username']) ?>','_blank')">
            <div class="lb-podium-card">
                <span class="lb-podium-rank"><?= $pod['rank'] ?></span>
                <img src="<?= htmlspecialchars($pAvatar) ?>" onerror="this.src='/assets/img/default-avatar.png'" class="lb-podium-avatar" alt="">
                <div class="lb-podium-name">
                    <?php if(lbIsPremium($pu)): ?><span class="lb-prem-badge-wrap"><?= htmlspecialchars($pName) ?> <?= lbPremBadge() ?></span><?php else: ?><?= htmlspecialchars($pName) ?><?php endif; ?>
                </div>
                <div class="lb-podium-views">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    <?= $pViews ?>
                </div>
            </div>
        </div>
        <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

    <div class="lb-table-wrap">
        <table class="lb-table">
            <thead><tr><th style="width:52px">#</th><th>Profile</th><th style="text-align:right">Views</th></tr></thead>
            <tbody>
            <?php foreach ($topUsers as $i => $u):
                $rank=$i+1; if($rank<=3)continue;
                $isMe=$loggedIn&&(int)$u['id']===$myUserId;
                $avatar=$u['avatar']?'/'.$u['avatar']:'/assets/img/default-avatar.png';
                $name=$u['display_name']?:$u['username'];
            ?>
            <tr class="<?= $isMe?'is-me':'' ?>" onclick="window.open('/<?= urlencode($u['username']) ?>','_blank')">
                <td><span class="lb-rank-num"><?= $rank ?></span></td>
                <td>
                    <div class="lb-user-cell">
                        <img src="<?= htmlspecialchars($avatar) ?>" class="lb-avatar" onerror="this.src='/assets/img/default-avatar.png'" alt="">
                        <div>
                            <div class="lb-display-name" style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap"><span><?= htmlspecialchars($name) ?></span><?php if(lbIsPremium($u)):?><?= lbPremBadge() ?><?php endif; ?><?php if($isMe):?><span style="font-size:.7rem;color:var(--accent);font-weight:600">YOU</span><?php endif;?></div>
                            <div class="lb-username">@<?= htmlspecialchars($u['username']) ?></div>
                        </div>
                    </div>
                </td>
                <td class="lb-views"><?= number_format((int)$u['views']) ?></td>
            </tr>
            <?php endforeach; ?>
            <?php if(empty($topUsers)):?><tr><td colspan="3" style="text-align:center;padding:3rem;color:rgba(255,255,255,.3)">No profiles yet.</td></tr><?php endif;?>
            </tbody>
        </table>
    </div>
</div><!-- /panel-global -->

<!-- LOCAL PANEL — vizibil pentru toată lumea -->
<div id="panel-local" class="lb-panel" style="display:none;opacity:0">

    <!-- Podium (afișat indiferent de starea userului) -->
    <?php if (!$searchQuery && count($localUsers) >= 1): ?>
    <div class="lb-podium-wrap">
        <div id="lb-region-badge-wrap" style="text-align:center;margin-bottom:.85rem;<?= $badgeRegionName ? '' : 'display:none' ?>">
            <span class="lb-local-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span id="lb-region-badge-text"><?= htmlspecialchars($badgeRegionName) ?></span>
                <span id="lb-region-badge-loading" style="display:none;opacity:.5;font-size:.65rem">...</span>
            </span>
        </div>
        <div class="lb-podium">
        <?php
        $lPodiumOrder = [
            ['rank'=>2,'class'=>'p2','user'=>$localUsers[1]??null],
            ['rank'=>1,'class'=>'p1','user'=>$localUsers[0]??null],
            ['rank'=>3,'class'=>'p3','user'=>$localUsers[2]??null],
        ];
        foreach ($lPodiumOrder as $pod):
            if (!$pod['user']) continue;
            $pu=$pod['user']; $pAvatar=$pu['avatar']?'/'.$pu['avatar']:'/assets/img/default-avatar.png';
            $pName=$pu['display_name']?:$pu['username']; $pViews=fmtViews((int)$pu['local_views']);
        ?>
        <div class="lb-podium-slot <?= $pod['class'] ?>" onclick="window.open('/<?= urlencode($pu['username']) ?>','_blank')">
            <div class="lb-podium-card">
                <span class="lb-podium-rank"><?= $pod['rank'] ?></span>
                <img src="<?= htmlspecialchars($pAvatar) ?>" onerror="this.src='/assets/img/default-avatar.png'" class="lb-podium-avatar" alt="">
                <div class="lb-podium-name">
                    <?php if(lbIsPremium($pu)): ?><span class="lb-prem-badge-wrap"><?= htmlspecialchars($pName) ?> <?= lbPremBadge() ?></span><?php else: ?><?= htmlspecialchars($pName) ?><?php endif; ?>
                </div>
                <div class="lb-podium-views">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    <?= $pViews ?>
                </div>
            </div>
        </div>
        <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

    <!-- Banner informativ: depinde de starea userului -->
    <?php if (!$loggedIn): ?>
    <div class="lb-info-banner">
        <div class="lb-info-banner-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22" style="color:var(--accent);flex-shrink:0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <p>Login and set your region in Settings to appear in the Local leaderboard.</p>
            <a href="/login" class="btn btn-primary btn-sm">Login</a>
        </div>
    </div>
    <?php elseif (!$myRegionCode || $myRegionCode === 'XX'): ?>
    <div class="lb-info-banner">
        <div class="lb-info-banner-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22" style="color:var(--accent);flex-shrink:0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <p>Set your region in Settings to appear in the Local leaderboard.</p>
            <a href="/dashboard/settings" class="btn btn-primary btn-sm">Set Region</a>
        </div>
    </div>
    <?php endif; ?>

    <!-- Tabelul local — afișat întotdeauna -->
    <div class="lb-table-wrap">
        <table class="lb-table">
            <thead><tr><th style="width:52px">#</th><th>Profile</th><th style="text-align:right">Local Views</th></tr></thead>
            <tbody>
            <?php if (!empty($localUsers)): ?>
            <?php foreach ($localUsers as $i => $u):
                $rank=$i+1; if($rank<=3)continue;
                $isMe=$loggedIn&&(int)$u['id']===$myUserId;
                $avatar=$u['avatar']?'/'.$u['avatar']:'/assets/img/default-avatar.png';
                $name=$u['display_name']?:$u['username'];
                $regionName = htmlspecialchars($u['region_name'] ?? '');
            ?>
            <tr class="<?= $isMe?'is-me':'' ?>" onclick="window.open('/<?= urlencode($u['username']) ?>','_blank')">
                <td><span class="lb-rank-num"><?= $rank ?></span></td>
                <td>
                    <div class="lb-user-cell">
                        <img src="<?= htmlspecialchars($avatar) ?>" class="lb-avatar" onerror="this.src='/assets/img/default-avatar.png'" alt="">
                        <div>
                            <div class="lb-display-name" style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap"><span><?= htmlspecialchars($name) ?></span><?php if(lbIsPremium($u)):?><?= lbPremBadge() ?><?php endif; ?><?php if($isMe):?><span style="font-size:.7rem;color:var(--accent);font-weight:600">YOU</span><?php endif;?></div>
                            <div class="lb-username">@<?= htmlspecialchars($u['username']) ?></div>
                        </div>
                    </div>
                </td>
                <td class="lb-views"><?= number_format((int)$u['local_views']) ?></td>
            </tr>
            <?php endforeach; ?>
            <?php else: ?>
            <tr><td colspan="3" style="text-align:center;padding:3rem;color:rgba(255,255,255,.3)">No users with a region set yet.</td></tr>
            <?php endif; ?>
            </tbody>
        </table>
    </div>

</div><!-- /panel-local -->

</div><!-- /.lb-page -->

<script>
var _currentTab = 'global';

function switchTab(tab) {
    if (tab === _currentTab) return;

    var fromPanel = document.getElementById('panel-' + _currentTab);
    var toPanel   = document.getElementById('panel-' + tab);
    var fromRank  = document.getElementById('rank-pill-' + _currentTab);
    var toRank    = document.getElementById('rank-pill-' + tab);

    document.getElementById('btn-' + _currentTab).classList.remove('active');
    document.getElementById('btn-' + tab).classList.add('active');

    // Fade out current
    fromPanel.classList.add('fading');

    setTimeout(function() {
        fromPanel.style.display = 'none';
        fromPanel.classList.remove('fading');

        toPanel.style.display = 'block';
        // Force reflow so transition fires
        toPanel.getBoundingClientRect();
        toPanel.style.opacity = '1';

        _currentTab = tab;
    }, 280);

    // Rank pills
    if (fromRank) fromRank.style.display = 'none';
    if (toRank)   setTimeout(function(){ toRank.style.display = 'inline-flex'; }, 310);
}
</script>

<script>
// JS fallback: dacă PHP n-a detectat țara (server blocat), încercăm din browser
(function() {
    var badgeWrap = document.getElementById('lb-region-badge-wrap');
    var badgeText = document.getElementById('lb-region-badge-text');
    var badgeLoading = document.getElementById('lb-region-badge-loading');
    if (!badgeWrap || !badgeText) return;
    if (badgeText.textContent.trim() !== '') return; // PHP a pus deja, gata

    // Arată badge-ul cu loading imediat
    badgeWrap.style.display = 'block';
    if (badgeLoading) badgeLoading.style.display = 'inline';

    function setCountry(name) {
        if (!name) return;
        badgeText.textContent = name;
        if (badgeLoading) badgeLoading.style.display = 'none';
    }

    // Încearcă ip-api.com
    fetch('https://ip-api.com/json/?fields=country')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data && data.country) { setCountry(data.country); return; }
            throw new Error('no country');
        })
        .catch(function() {
            // Fallback ipapi.co
            fetch('https://ipapi.co/json/')
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data && data.country_name) { setCountry(data.country_name); return; }
                    // Dacă ambele eșuează, ascunde badge-ul
                    badgeWrap.style.display = 'none';
                })
                .catch(function() { badgeWrap.style.display = 'none'; });
        });
})();
</script>
<?php include __DIR__ . '/../partials/cookie_banner.php'; ?>
<script>window.PARTICLE_ENABLED = false;</script>
<script src="/assets/js/particles.js?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/js/particles.js') ?: time() ?>"></script>
</body>
</html>