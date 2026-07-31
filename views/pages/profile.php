<?php
/* session started by router */
/* loaded by router */
/* loaded by router */

$username = preg_replace('/[^a-zA-Z0-9_\-\.]/', '', $_GET['u'] ?? '');
if (!$username) { http_response_code(404); die('404'); }

$profile = getProfileByUsername($pdo, $username);
if (!$profile) {
    http_response_code(404); ?>
    <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>404</title>
    <link rel="stylesheet" href="/assets/css/main.css?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/css/main.css') ?: time() ?>"></head>
    <body class="auth-page"><div class="auth-card" style="text-align:center">
    <h2 style="font-size:4rem;font-family:'Syne',sans-serif">404</h2>
    <p style="color:var(--text-muted)">@<?= sanitize($username) ?> does not exist.</p>
    <a href="/" class="btn btn-secondary" style="margin-top:1.5rem">Home</a>
    </div></body></html>
<?php exit; }

$isOwner   = isset($_SESSION['user_id']) && (int)$_SESSION['user_id'] === (int)$profile['user_id'];
if (!$isOwner) incrementViews($pdo, $profile['user_id']);

$links       = getSocialLinks($pdo, $profile['user_id']);
$badges      = getProfileBadges($pdo, (int)$profile['user_id']);

// Discord integration (only if visible)
$discordStmt = $pdo->prepare("SELECT * FROM integrations WHERE user_id=? AND type='discord' LIMIT 1");
$discordStmt->execute([(int)$profile['user_id']]);
$discordRow  = $discordStmt->fetch();

// Show Discord account only if visible=1 and has user data
$discordInt = ($discordRow && !empty($discordRow['discord_user_id']) && $discordRow['visible']) ? $discordRow : null;

// Discord Server widget — independent visibility from Discord account
$discordServerInt = null;
if ($discordRow && !empty($discordRow['discord_server_id']) && $discordRow['discord_server_visible']) {
    $discordServerInt = $discordRow;
}
$displayName = $profile['display_name'] ?: $profile['username'];
$accent      = $profile['accent_color']    ?: '#00d4ff';
$accent2     = $profile['secondary_color'] ?: '#ff00ff';
$bgType      = $profile['background_type'] ?: 'particles';
$bgVal       = $profile['background_value'] ?: '#050507';
$isPremium   = !empty($profile['is_premium']) && (empty($profile['premium_expires_at']) || strtotime($profile['premium_expires_at']) > time());
$font        = $profile['profile_font']    ?: 'Syne';
$musicPath   = $profile['music_path'] ?? null;

// Load purchased & active effects
$efStmt = $pdo->prepare("SELECT COALESCE(purchased_effects,'[]'), COALESCE(active_effects,'{}') FROM profiles WHERE user_id=?");
$efStmt->execute([(int)$profile['user_id']]);
$efRow = $efStmt->fetch(PDO::FETCH_NUM);
$purchasedEffects = json_decode($efRow[0] ?? '[]', true) ?: [];
$activeEffects    = json_decode($efRow[1] ?? '{}', true) ?: [];
$activeCursorEffect = $activeEffects['cursor'] ?? '';
$activeAvatarEffect = $activeEffects['avatar'] ?? '';
$activeBgEffect     = $activeEffects['bg']     ?? '';
$cardOpacity   = max(0, min(100, (int)($profile['profile_opacity'] ?? 100))) / 100;
$cardBlur      = max(0, min(100, (int)($profile['profile_blur']   ?? 0)));
$avatarShape   = in_array($profile['avatar_shape'] ?? '', ['square','soft','rounded','circle','eye','diamond','egg'])
                 ? $profile['avatar_shape'] : 'circle';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= sanitize($displayName) ?> — <?= SITE_NAME ?></title>
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon.png">
    <meta name="description" content="<?= sanitize($profile['bio'] ?? '') ?>">

    <!-- Open Graph / Discord / WhatsApp / Telegram embed -->
    <?php
    $ogName   = sanitize($displayName);
    $ogBio    = sanitize(!empty($profile['bio']) ? $profile['bio'] : 'Check out ' . ($profile['username']) . '\'s profile on ' . SITE_NAME);
    // Build absolute avatar URL — avatar stored as relative path e.g. "uploads/avatars/av_1_xxx.jpg"
    if (!empty($profile['avatar'])) {
        $avatarPath = ltrim($profile['avatar'], '/');
        $ogAvatar = rtrim(SITE_URL, '/') . '/' . $avatarPath;
    } else {
        $ogAvatar = rtrim(SITE_URL, '/') . '/assets/img/og-banner.png';
    }
    $ogUrl = rtrim(SITE_URL, '/') . '/' . rawurlencode($profile['username']);
    ?>
    <!-- Open Graph — Discord / WhatsApp / Telegram / Facebook -->
    <meta property="og:type"         content="website">
    <meta property="og:site_name"    content="<?= SITE_NAME ?>">
    <meta property="og:url"          content="<?= $ogUrl ?>">
    <meta property="og:title"        content="<?= $ogName ?> — <?= SITE_NAME ?>">
    <meta property="og:description"  content="<?= $ogBio ?>">
    <meta property="og:image"        content="<?= $ogAvatar ?>">
    <meta property="og:image:type"   content="image/jpeg">
    <meta property="og:image:width"  content="512">
    <meta property="og:image:height" content="512">
    <!-- Twitter / X Card -->
    <meta name="twitter:card"        content="summary">
    <meta name="twitter:title"       content="<?= $ogName ?> — <?= SITE_NAME ?>">
    <meta name="twitter:description" content="<?= $ogBio ?>">
    <meta name="twitter:image"       content="<?= $ogAvatar ?>">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono&family=Outfit:wght@300;400;500;600;700&family=<?= urlencode($font) ?>:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/main.css?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/css/main.css') ?: time() ?>">
    <link rel="stylesheet" href="/assets/css/profile.css?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/css/profile.css') ?: time() ?>">
    <style>
        :root {
            --accent:  <?= sanitize($accent) ?>;
            --accent2: <?= sanitize($accent2) ?>;
            --bg-overlay: rgba(5,5,7,0.85);
            --card-opacity: <?= $cardOpacity ?>;
            --card-blur: <?= $cardBlur ?>px;
        }
        .profile-card {
            background: rgba(6,6,16,calc(0.88 * var(--card-opacity))) !important;
            border-color: rgba(255,255,255,calc(0.07 * var(--card-opacity))) !important;
            box-shadow: 0 16px 50px rgba(0,0,0,calc(0.75 * var(--card-opacity))), 0 0 0 1px rgba(255,255,255,calc(0.04 * var(--card-opacity))) inset !important;
            backdrop-filter: blur(var(--card-blur));
            -webkit-backdrop-filter: blur(var(--card-blur));
        }
        .profile-body { font-family: '<?= sanitize($font) ?>', 'Outfit', sans-serif; }

        /* ── Integrations grid ── */
        .integrations-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: .55rem;
            margin: .65rem auto 0;
            width: 100%;
        }
        .integrations-grid > :only-child {
            grid-column: 1 / -1;
            max-width: 340px;
            margin: 0 auto;
            width: 100%;
        }
        @media(max-width:480px){.integrations-grid{grid-template-columns:1fr}}

        /* ── Discord Integration Card ── */
        .discord-int-card {
            max-width: 100%;
            background: rgba(88,101,242,.08);
            border: 1px solid rgba(88,101,242,.18);
            border-radius: 10px;
            overflow: hidden;
        }
        .dic-header {
            display: flex; align-items: center; gap: .35rem;
            padding: .35rem .75rem;
            background: rgba(88,101,242,.12);
            border-bottom: 1px solid rgba(88,101,242,.15);
            font-size: .62rem; font-weight: 700; color: #5865f2;
            text-transform: uppercase; letter-spacing: .06em;
        }
        .dic-body {
            display: flex; align-items: center; gap: .6rem;
            padding: .55rem .75rem;
        }
        .dic-avatar-wrap { position: relative; flex-shrink: 0; }
        .dic-avatar, .dic-avatar-placeholder {
            width: 36px; height: 36px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
        }
        .dic-avatar { object-fit: cover; }
        .dic-avatar-placeholder { background: rgba(88,101,242,.2); }
        .dic-status-dot {
            position: absolute; bottom: 1px; right: 1px;
            width: 10px; height: 10px; border-radius: 50%;
            border: 2px solid rgba(30,33,36,.95);
            background: #747f8d;
        }
        .dic-status-dot.online  { background: #23a55a; }
        .dic-status-dot.idle    { background: #f0b232; }
        .dic-status-dot.dnd     { background: #ed4245; }
        .dic-info { min-width: 0; flex: 1; text-align: left; }
        .dic-name-row {
            display: flex; align-items: center; gap: .25rem;
            flex-wrap: nowrap; overflow: hidden;
        }
        .dic-name {
            font-size: .78rem; font-weight: 700; color: #fff;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            flex-shrink: 1;
        }
        .dic-badge {
            display: inline-flex; align-items: center; justify-content: center;
            width: 15px; height: 15px; flex-shrink: 0;
            position: relative; cursor: default;
        }
        .dic-badge img {
            width: 15px; height: 15px;
            object-fit: contain;
            filter: drop-shadow(0 1px 2px rgba(0,0,0,.4));
        }
        .dic-badge[title]:hover::after {
            content: attr(title);
            position: absolute; bottom: calc(100% + 5px); left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,.85); color: #fff;
            font-size: .6rem; white-space: nowrap;
            padding: 2px 6px; border-radius: 4px;
            pointer-events: none; z-index: 10;
        }
        .dic-guild-tag {
            display: inline-flex; align-items: center; gap: 3px;
            font-size: .6rem; font-weight: 700;
            background: rgba(88,101,242,.22); color: #c5cdff;
            border: 1px solid rgba(88,101,242,.5);
            border-radius: 5px; padding: 1px 5px 1px 4px;
            white-space: nowrap; flex-shrink: 0;
            letter-spacing: .03em; line-height: 1.2;
        }
        .dic-guild-tag svg { margin-top: 1px; }
        .dic-tag { font-size: .62rem; color: rgba(255,255,255,.38); margin-top: .05rem; }
        .dic-activity {
            margin-top: .2rem;
            font-size: .63rem; color: rgba(255,255,255,.55);
            display: flex; align-items: flex-start; gap: .25rem;
        }
        .dic-activity svg { flex-shrink: 0; margin-top: 2px; }
        .dic-activity-lines { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .dic-activity-main { color: rgba(255,255,255,.65); font-size: .63rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dic-activity-main b { color: rgba(255,255,255,.85); font-weight: 600; }
        .dic-activity-sub { color: rgba(255,255,255,.4); font-size: .58rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dic-album-art {
            flex-shrink: 0; margin-left: auto;
            width: 38px; height: 38px;
            border-radius: 5px; overflow: hidden;
            box-shadow: -2px 0 0 2px rgba(255,255,255,.06), -4px 2px 0 2px rgba(0,0,0,.3);
            position: relative;
        }
        .dic-album-art img { width: 100%; height: 100%; object-fit: cover; display: block; }

        /* ── Discord Server Widget Card ── */
        .discord-server-card {
            max-width: 100%;
            background: rgba(88,101,242,.08);
            border: 1px solid rgba(88,101,242,.18);
            border-radius: 10px;
            overflow: hidden;
            text-decoration: none;
            display: block;
            transition: border-color .25s, transform .2s;
            cursor: pointer;
        }
        .discord-server-card:hover {
            border-color: rgba(88,101,242,.38);
            transform: translateY(-2px);
        }
        .discord-server-card-header {
            display: flex; align-items: center; gap: .35rem;
            padding: .35rem .75rem;
            background: rgba(88,101,242,.12);
            border-bottom: 1px solid rgba(88,101,242,.15);
            font-size: .62rem; font-weight: 700; color: #5865f2;
            text-transform: uppercase; letter-spacing: .06em;
            height: 28px;
        }
        .discord-server-card-header svg { flex-shrink: 0; }
        .dic-header { height: 28px; }
        .discord-server-body {
            display: flex; align-items: center; gap: .6rem;
            padding: .55rem .75rem;
        }
        .discord-server-icon {
            width: 36px; height: 36px; border-radius: 9px;
            overflow: hidden; flex-shrink: 0;
            background: rgba(88,101,242,.2);
            display: flex; align-items: center; justify-content: center;
        }
        .discord-server-icon img { width: 100%; height: 100%; object-fit: cover; }
        .discord-server-info { flex: 1; min-width: 0; text-align: left; }
        .discord-server-name {
            font-size: .78rem; font-weight: 700; color: #fff;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .discord-server-stats {
            display: flex; align-items: center; gap: .5rem;
            margin-top: .15rem; font-size: .62rem;
        }
        .discord-server-online {
            display: flex; align-items: center; gap: .25rem;
            color: #23a55a; font-weight: 600;
        }
        .discord-server-online::before {
            content: '';
            width: 6px; height: 6px; border-radius: 50%;
            background: #23a55a;
            box-shadow: 0 0 4px #23a55a;
            display: inline-block; flex-shrink: 0;
        }
        .discord-server-members {
            color: rgba(255,255,255,.38); font-weight: 500;
            display: flex; align-items: center; gap: .25rem;
        }
        .discord-server-members::before {
            content: '';
            width: 6px; height: 6px; border-radius: 50%;
            background: rgba(255,255,255,.3);
            display: inline-block; flex-shrink: 0;
        }

        /* ── Location tooltip (poza 1 style) ── */
        .location-tooltip-wrap {
            position: relative;
            display: inline-flex;
            align-items: center;
            gap: .35rem;
            cursor: default;
        }
        .location-pill-tooltip {
            position: absolute;
            bottom: calc(100% + 8px);
            left: 50%;
            transform: translateX(-50%);
            background: rgba(20, 20, 28, 0.92);
            color: #fff;
            font-size: .72rem;
            font-weight: 600;
            letter-spacing: .04em;
            padding: 4px 12px;
            border-radius: 20px;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity .18s ease, transform .18s ease;
            transform: translateX(-50%) translateY(4px);
            border: 1px solid rgba(255,255,255,.10);
            backdrop-filter: blur(8px);
            z-index: 10;
        }
        .location-tooltip-wrap:hover .location-pill-tooltip {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        /* ── Views pill (poza 1 style) ── */
        .profile-views-row {
            display: flex;
            justify-content: center;
            margin-bottom: .2rem;
        }
        .profile-views-pill {
            display: inline-flex;
            align-items: center;
            gap: .4rem;
            background: rgba(255,255,255,.06);
            border: 1px solid rgba(255,255,255,.10);
            border-radius: 20px;
            padding: 5px 14px;
            font-size: .85rem;
            font-weight: 600;
            color: rgba(255,255,255,.75);
        }
        .profile-views-pill svg {
            opacity: .7;
            flex-shrink: 0;
        }

        <?php if ($bgType === 'color'): ?>
        #profile-bg { background: <?= sanitize($bgVal) ?>; }
        <?php elseif ($bgType === 'gradient'): ?>
        #profile-bg { background: <?= sanitize($bgVal) ?>; }
        <?php elseif ($bgType === 'image'): ?>
        #profile-bg { background-image: url('/<?= sanitize($bgVal) ?>'); background-size:cover; background-position:center; }
        #profile-bg::after { content:''; position:absolute; inset:0; background:rgba(0,0,0,0.55); }
        <?php else: ?>
        #profile-bg { background: #050507; }
        <?php endif; ?>
    </style>
</head>
<body class="profile-body">

<!-- ══ SPLASH SCREEN ══════════════════════════════════ -->
<div id="splash-screen">
    <div id="splash-text">click to enter<span class="splash-dots">...</span></div>
</div>

<!-- Everything below is hidden until splash is dismissed -->
<div id="profile-content" style="opacity:0;pointer-events:none;">

<div id="profile-bg"></div>

<?php if ($isPremium && $profile['particle_effect']): ?>
<canvas id="particle-canvas"></canvas>
<?php endif; ?>

<?php if ($bgType === 'video' && $bgVal): ?>
<div style="position:fixed;inset:0;z-index:0;overflow:hidden;">
    <video id="bg-video" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;position:absolute;">
        <source src="/<?= sanitize($bgVal) ?>">
    </video>
    <div style="position:absolute;inset:0;background:rgba(0,0,0,0.5);"></div>
</div>
<script>
(function() {
    var vid = document.getElementById('bg-video');
    if (!vid) return;
    // Fallback: force play after user gesture (splash click) in case autoplay is blocked
    function tryPlay() {
        var p = vid.play();
        if (p && typeof p.catch === 'function') {
            p.catch(function() { /* blocked by browser policy */ });
        }
    }
    // Try immediately (works if autoplay allowed)
    tryPlay();
    // Also try on first user interaction (splash screen click)
    document.addEventListener('click', tryPlay, { once: true });
    document.addEventListener('touchstart', tryPlay, { once: true });
})();
</script>
<?php endif; ?>

<!-- Audio element (NOT autoplay — starts on splash click) -->
<?php if ($musicPath): ?>
<audio id="bg-audio" src="/<?= sanitize($musicPath) ?>" loop preload="auto"></audio>
<?php endif; ?>

<!-- Volume widget -->
<?php if ($musicPath): ?>
<div class="vol-widget" id="vol-widget">
    <button class="vol-btn" id="vol-btn" title="Mute / Unmute">
        <svg id="icon-sound" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
        <svg id="icon-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <line x1="23" y1="9" x2="17" y2="15"></line>
            <line x1="17" y1="9" x2="23" y2="15"></line>
        </svg>
    </button>
    <div class="vol-slider-wrap">
        <input type="range" class="vol-slider" id="vol-slider" min="0" max="1" step="0.05" value="0.35">
    </div>
    <?php if ($isOwner): ?>
    <button class="vol-remove-btn" id="vol-remove-btn" title="Remove music" onclick="deleteMusicFromProfile()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
    </button>
    <?php endif; ?>
</div>
<?php endif; ?>

<!-- Edit button (owner) -->
<?php if ($isOwner): ?>
<div class="edit-profile-btn">
    <a href="/dashboard" class="btn btn-secondary btn-sm">✏ Edit</a>
</div>
<?php endif; ?>

<!-- Profile card -->
<div class="profile-wrapper">
<div class="profile-card">

    <div class="avatar-wrapper fade-in avatar-shape-<?= $avatarShape ?>">
        <?php
        $avatarRing = $profile['avatar_ring'] ?? 'none';
        // Exclusivitate: efect cumparat are prioritate fata de avatar_ring
        $hasActiveAvatarEffect = $activeAvatarEffect && in_array($activeAvatarEffect, $purchasedEffects, true);
        if (!$hasActiveAvatarEffect && $isPremium && $avatarRing === 'premium'): ?>
        <div class="avatar-ring-pulse"></div>
        <div class="avatar-ring-shell ring-premium">
            <div class="avatar-ring-spin"></div>
        </div>
        <?php elseif (!$hasActiveAvatarEffect && $avatarRing === 'normal'): ?>
        <div class="avatar-ring-shell ring-normal">
            <div class="avatar-ring-spin"></div>
        </div>
        <?php endif; ?>
        <div class="avatar-ring-inner"></div>
        <img src="<?= $profile['avatar'] ? '/'.sanitize($profile['avatar']) : '/assets/img/default-avatar.png' ?>"
             alt="<?= sanitize($displayName) ?>"
             class="avatar-img"
             onerror="this.src='/assets/img/default-avatar.png'">

        <?php if ($hasActiveAvatarEffect): ?>
        <div class="pav-effect-wrap" data-effect="<?= $activeAvatarEffect ?>">
            <canvas class="pav-canvas" id="pav-canvas"></canvas>
        </div>
        <?php endif; ?>
    </div>

    <?php
$hasChampion = false;
foreach ($badges as $_b) { if ($_b['id'] === 'champion') { $hasChampion = true; break; } }
?>
<div class="profile-username fade-in-d1<?= $hasChampion ? ' champion-name' : '' ?>" id="profile-display-name">
        <?= sanitize($displayName) ?>
    </div>

    <?php if (!empty($badges)): ?>
    <div class="profile-badges fade-in-d1">
        <?php foreach ($badges as $b): ?>
        <?php if ($b['id'] === 'premium'): ?>
        <div class="profile-badge badge-premium" data-label="Premium Member" style="background:linear-gradient(135deg,rgba(255,215,0,.2),rgba(255,160,0,.12));border:1.5px solid rgba(255,215,0,.55);box-shadow:0 0 16px rgba(255,215,0,.4)">
            <svg viewBox="0 0 24 24" fill="none" width="17" height="17" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 0 5px rgba(255,215,0,.9))">
                <path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.3)" stroke="#ffd700" stroke-width="1.8" stroke-linejoin="round"/>
                <path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="#ffd700" stroke-width="1.4" stroke-linejoin="round" opacity=".85"/>
            </svg>
            <span class="badge-tooltip">Premium</span>
        </div>
        <?php else: ?>
        <div class="profile-badge badge-<?= $b['id'] ?>" data-label="<?= htmlspecialchars($b['title']) ?>">
            <?php if ($b['id'] === 'og'): ?>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.09 6.26L21 9.27l-5 4.87 1.18 6.88L12 17.77l-5.18 3.25L8 14.14 3 9.27l6.91-1.01L12 2z"/></svg>
            <?php elseif ($b['id'] === 'views_master'): ?>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
            <?php elseif ($b['id'] === 'verified'): ?>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
            <?php elseif ($b['id'] === 'owner'): ?>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3H5v1h14v-1z"/></svg>
            <?php elseif ($b['id'] === 'admin'): ?>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z"/></svg>
            <?php elseif ($b['id'] === 'known'): ?>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            <?php elseif ($b['id'] === 'rich'): ?>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>
            <?php elseif ($b['id'] === 'trapstar'): ?>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>
            <?php elseif ($b['id'] === 'hall_of_fame'): ?>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H8v2h8v-2h-3v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/></svg>
            <?php elseif ($b['id'] === 'champion'): ?>
            <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L9.5 6.5 5 5l2 5H4l2.5 4h11L20 10h-3l2-5-4.5 1.5L12 2z" opacity=".9"/><rect x="7" y="19" width="10" height="2" rx="1"/><rect x="8.5" y="16" width="7" height="2.5" rx=".8"/></svg>
            <?php elseif ($b['id'] === 'the_killer'): ?>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C7.58 2 4 5.58 4 10c0 2.84 1.49 5.34 3.73 6.76.18.11.27.31.27.52V19c0 1.1.9 2 2 2v-2h1.5v2h1v-2H14v2c1.1 0 2-.9 2-2v-1.72c0-.21.09-.41.27-.52C18.51 15.34 20 12.84 20 10c0-4.42-3.58-8-8-8zM9 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
            <?php elseif ($b['id'] === 'discord'): ?>
            <svg viewBox="0 0 127.14 96.36" fill="currentColor"><path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"/></svg>
            <?php elseif ($b['id'] === 'booster'): ?>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.13 22.19L11.5 18.36C13.07 17.78 14.54 17 15.9 16.09L13.13 22.19M5.64 12.5L1.81 10.87L7.91 8.1C7 9.46 6.22 10.93 5.64 12.5M21.61 2.39C21.61 2.39 16.66.269 11 5.93C8.81 8.12 7.5 10.53 6.65 12.64C6.37 13.39 6.56 14.21 7.11 14.77L9.24 16.89C9.79 17.45 10.61 17.63 11.36 17.35C13.5 16.53 15.88 15.19 18.07 13C23.73 7.34 21.61 2.39 21.61 2.39M14.54 9.46C13.76 8.68 13.76 7.41 14.54 6.63S16.59 5.85 17.37 6.63C18.14 7.41 18.15 8.68 17.37 9.46C16.59 10.24 15.32 10.24 14.54 9.46M8.88 16.53L7.47 15.12L8.88 16.53M6.24 22L9.88 18.36C9.54 18.27 9.21 18.12 8.91 17.91L4.83 22H6.24M2 22H3.41L8.18 17.24L6.76 15.83L2 20.59V22M7 22H8.41L9.5 20.92L8.09 19.5L7 20.59V22Z"/></svg>
            <?php elseif ($b['id'] === 'lover'): ?>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/></svg>
            <?php elseif ($b['id'] === 'fresh'): ?>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-5 8z"/></svg>
            <?php elseif ($b['id'] === 'crew'): ?>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.92 5L2 20l5-5h4l8-8-4-4-8 8V7.5L6.92 5zM20 2l2 2-2.5 2.5-2-2L20 2z"/></svg>
            <?php elseif ($b['id'] === 'billionaire'): ?>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
            <?php elseif ($b['id'] === 'promoter'): ?>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"/></svg>
            <?php elseif ($b['id'] === 'promoter_elite'): ?>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"/></svg>
            <?php elseif ($b['id'] === 'content_creator'): ?>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/><path d="M9 3L7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9zm3 14a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/></svg>
            <?php elseif ($b['id'] === 'designer'): ?>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a1 1 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96a1 1 0 0 0 0-1.41z"/></svg>
            <?php endif; ?>
            <span class="badge-tooltip"><?= htmlspecialchars($b['title']) ?></span>
        </div>
        <?php endif; ?>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>

    <?php if ($profile['bio']): ?>
    <p class="profile-bio fade-in-d1">"<?= sanitize($profile['bio']) ?>"</p>
    <?php endif; ?>

    <?php if ($profile['location']): ?>
    <div class="profile-location fade-in-d2 location-tooltip-wrap">
        <span class="location-pill-tooltip">Location</span>
        <svg viewBox="0 0 24 24" width="13" height="13" fill="#ffffff" xmlns="http://www.w3.org/2000/svg" style="opacity:.6">
            <path d="M12 2C8.686 2 6 4.686 6 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.314-2.686-6-6-6z"/>
            <circle cx="12" cy="8" r="2.2" fill="rgba(5,5,7,0.55)"/>
        </svg>
        <?= sanitize($profile['location']) ?>
    </div>
    <?php endif; ?>

    <?php if (!empty($links)): ?>
    <div class="social-icons fade-in-d3">
        <?php foreach ($links as $link): ?>
        <a href="<?= sanitize($link['url']) ?>" class="social-icon"
           target="_blank" rel="noopener noreferrer"
           data-tooltip="<?= sanitize(ucfirst($link['platform'])) ?>"
           style="--platform-color:<?= getPlatformColor($link['platform']) ?>">
            <?= getPlatformIcon($link['platform']) ?>
        </a>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>

    <?php if (($discordInt && !empty($discordInt['discord_user_id'])) || $discordServerInt): ?>
    <div class="integrations-grid fade-in-d3">
    <?php if ($discordInt && !empty($discordInt['discord_user_id'])): ?>
    <div class="discord-int-card" id="discord-int-card">
        <div class="dic-header">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" width="16" height="16"><path fill="#5865F2" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.14zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z"/></svg>
            <span>Discord</span>
        </div>
        <div class="dic-body">
            <div class="dic-avatar-wrap">
                <?php if (!empty($discordInt['discord_avatar'])): ?>
                <img src="https://cdn.discordapp.com/avatars/<?= htmlspecialchars($discordInt['discord_user_id']) ?>/<?= htmlspecialchars($discordInt['discord_avatar']) ?>.png?size=80"
                     class="dic-avatar" onerror="this.style.display='none'">
                <?php else: ?>
                <div class="dic-avatar-placeholder">
                    <svg viewBox="0 0 24 24" fill="#5865f2" width="22" height="22"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.045.036.059a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                </div>
                <?php endif; ?>
                <div class="dic-status-dot" id="dic-status-dot"></div>
            </div>
            <div class="dic-info" style="min-width:0;flex:1;">
                <div class="dic-name-row">
                    <div class="dic-name" id="dic-name"><?= htmlspecialchars($discordInt['discord_global_name'] ?: $discordInt['discord_username']) ?></div>
                    <!-- Clan tag: shown right after name, before badges — matches Discord UI -->
                    <div class="dic-guild-tag" id="dic-guild-tag" style="display:none;"></div>
                    <!-- Official Discord badges rendered by JS after presence fetch -->
                    <div id="dic-badges-row" style="display:inline-flex;align-items:center;gap:.25rem;"></div>
                </div>
                <div class="dic-tag" id="dic-tag">@<?= htmlspecialchars($discordInt['discord_username']) ?></div>
                <div class="dic-activity" id="dic-activity" style="display:none;"></div>
            </div>
            <!-- Album art (Spotify / rich presence) -->
            <div class="dic-album-art" id="dic-album-art" style="display:none;">
                <img id="dic-album-img" src="" alt="album art" loading="lazy">
            </div>
        </div>
    </div><!-- /.discord-int-card -->
    <?php endif; ?>

    <?php if ($discordServerInt): ?>
    <a href="<?= htmlspecialchars($discordServerInt['discord_server_invite']) ?>" target="_blank" rel="noopener noreferrer" class="discord-server-card">
        <div class="discord-server-card-header">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" width="14" height="14"><path fill="#5865F2" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.14zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z"/></svg>
            Discord Server
        </div>
        <div class="discord-server-body">
            <div class="discord-server-icon">
                <?php if (!empty($discordServerInt['discord_server_icon'])): ?>
                <img src="https://cdn.discordapp.com/icons/<?= htmlspecialchars($discordServerInt['discord_server_id']) ?>/<?= htmlspecialchars($discordServerInt['discord_server_icon']) ?>.png?size=80" alt="Server Icon" onerror="this.style.display='none'">
                <?php else: ?>
                <svg viewBox="0 0 24 24" fill="#5865f2" width="24" height="24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.045.036.059a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                <?php endif; ?>
            </div>
            <div class="discord-server-info">
                <div class="discord-server-name"><?= htmlspecialchars($discordServerInt['discord_server_name'] ?? 'Discord Server') ?></div>
                <div class="discord-server-stats">
                    <span class="discord-server-online" id="srv-online-count"><?= number_format((int)($discordServerInt['discord_server_online'] ?? 0)) ?> online</span>
                    <span class="discord-server-members" id="srv-total-count"><?= number_format((int)($discordServerInt['discord_server_total'] ?? 0)) ?> members</span>
                </div>
            </div>
        </div>
    </a>
    <?php endif; ?>
    </div><!-- /.integrations-grid -->
    <?php endif; ?>
    <div class="fade-in-d4" style="margin-top:.85rem;">
        <div class="profile-views-row">
            <div class="profile-views-pill">
                <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                <?= number_format($profile['views']) ?>
            </div>
        </div>
        <div class="profile-joined">Joined <?= date('d M Y', strtotime($profile['created_at'])) ?></div>
    </div>

</div>
</div>

<?php if (!$isPremium): ?>
<div class="profile-footer"><a href="/">⬡ <?= SITE_NAME ?></a></div>
<?php endif; ?>

</div><!-- /profile-content -->

<script>
window.PARTICLE_ENABLED     = <?= ($isPremium && $profile['particle_effect']) ? 'true' : 'false' ?>;
window.CURSOR_TRAIL_ENABLED = <?= ($isPremium && $profile['cursor_trail']) ? 'true' : 'false' ?>;
<?php if (!empty($profile['cursor_path'])): ?>
window.CUSTOM_CURSOR_URL = '/<?= sanitize($profile['cursor_path']) ?>';
<?php else: ?>
window.CUSTOM_CURSOR_URL = null;
<?php endif; ?>
// Custom cursor is applied after resize in profile.js
window.ACCENT_COLOR          = '<?= sanitize($accent) ?>';
window.MUSIC_PATH            = <?= $musicPath ? "'/".sanitize($musicPath)."'" : 'null' ?>;
window.HAS_VIDEO_BG          = <?= ($bgType==='video' && $bgVal) ? 'true' : 'false' ?>;
window.BG_TYPE               = <?= json_encode($bgType) ?>;
window.TYPING_EFFECT_ENABLED = <?= !empty($profile['typing_effect']) ? 'true' : 'false' ?>;
window.DISPLAY_NAME          = <?= json_encode($displayName) ?>;
window.DISCORD_USER_ID       = <?= !empty($discordInt['discord_user_id']) ? json_encode($discordInt['discord_user_id']) : 'null' ?>;
window.DISCORD_SERVER_INVITE = <?= !empty($discordServerInt['discord_server_invite']) ? json_encode($discordServerInt['discord_server_invite']) : 'null' ?>;

<?php if ($discordServerInt && !empty($discordServerInt['discord_server_invite'])): ?>
// Auto-refresh Discord Server member/online count every 5 minutes
(function() {
    const invite = window.DISCORD_SERVER_INVITE;
    if (!invite) return;
    const code = invite.replace(/.*discord\.gg\//, '');
    async function refreshCounts() {
        try {
            const res  = await fetch('https://discord.com/api/v10/invites/' + code + '?with_counts=true');
            if (!res.ok) return;
            const json = await res.json();
            const online = json.approximate_presence_count;
            const total  = json.approximate_member_count;
            if (online == null || total == null) return;
            const elOnline = document.getElementById('srv-online-count');
            const elTotal  = document.getElementById('srv-total-count');
            if (elOnline) elOnline.textContent = online.toLocaleString() + ' online';
            if (elTotal)  elTotal.textContent  = total.toLocaleString() + ' members';
        } catch(e) { /* silent */ }
    }
    refreshCounts();
    setInterval(refreshCounts, 5 * 60 * 1000);
})();
<?php endif; ?>

// Purchased effects
window.ACTIVE_CURSOR_EFFECT = <?= json_encode($activeCursorEffect) ?>;
window.ACTIVE_AVATAR_EFFECT = <?= json_encode($activeAvatarEffect) ?>;
window.ACTIVE_BG_EFFECT     = <?= json_encode($activeBgEffect) ?>;
window.PURCHASED_EFFECTS    = <?= json_encode($purchasedEffects) ?>;
window.AVATAR_SHAPE         = <?= json_encode($avatarShape) ?>;

if (window.TYPING_EFFECT_ENABLED) {
    const el   = document.getElementById('profile-display-name');
    const text = window.DISPLAY_NAME;
    el.textContent = '';
    const s = document.createElement('style');
    s.textContent = `
        @keyframes tw-blink{0%,100%{opacity:1}50%{opacity:0}}
        .tw-cursor{display:inline-block;width:2px;height:.85em;background:var(--accent,#00d4ff);margin-left:2px;vertical-align:text-bottom;animation:tw-blink .75s step-end infinite}
    `;
    document.head.appendChild(s);
    let i = 0, deleting = false, pause = 0;
    function tick() {
        if (pause > 0) { pause--; setTimeout(tick, 80); return; }
        if (!deleting) {
            el.innerHTML = text.slice(0, ++i) + '<span class="tw-cursor"></span>';
            if (i >= text.length) { pause = 22; deleting = true; }
        } else {
            el.innerHTML = text.slice(0, --i) + '<span class="tw-cursor"></span>';
            if (i <= 0) { pause = 10; deleting = false; }
        }
        setTimeout(tick, deleting ? 55 : 100 + Math.random() * 40);
    }
    setTimeout(tick, 900);
}

async function deleteMusicFromProfile() {
    if (!confirm('Remove music from profile?')) return;
    const fd = new FormData();
    fd.append('action', 'delete_music');
    const res  = await fetch('/api/update_profile.php', { method:'POST', body:fd });
    const json = await res.json();
    if (json.success) location.reload();
    else alert(json.error || 'Eroare');
}
</script>
<script src="/assets/js/particles.js?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/js/particles.js') ?: time() ?>"></script>
<script src="/assets/js/profile.js?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/js/profile.js') ?: time() ?>"></script>

<!-- ═══ PURCHASED EFFECTS ENGINE ═══ -->
<style>
/* Avatar effect canvas overlay */
.pav-effect-wrap {
    position: absolute; left: -12px; right: -12px; bottom: -12px; top: -60px;
    border-radius: 50%; pointer-events: none; z-index: 10; overflow: visible;
}
.pav-canvas { position: absolute; inset: 0; width: 100% !important; height: 100% !important; }

/* Shape-aware clipping — overflow: visible allows crown to show above avatar */
.avatar-shape-circle  .pav-effect-wrap { border-radius: 50%; overflow: visible; }
.avatar-shape-square  .pav-effect-wrap { border-radius: 8px;  overflow: visible; }
.avatar-shape-soft    .pav-effect-wrap { border-radius: 22px; overflow: visible; }
.avatar-shape-rounded .pav-effect-wrap { border-radius: 36px; overflow: visible; }
.avatar-shape-egg     .pav-effect-wrap { border-radius: 50% 50% 50% 50% / 35% 35% 60% 60%; overflow: visible; }
/* Polygon shapes: canvas draws effects directly on the polygon edge via JS */
.avatar-shape-eye     .pav-effect-wrap { border-radius: 0; overflow: visible; }
.avatar-shape-diamond .pav-effect-wrap { border-radius: 0; overflow: visible; }
</style>

<script>
// ── Purchased Effects Engine — called from profile.js after splash dismiss ────
window.initPurchasedEffects = function() {
    const CE = window.ACTIVE_CURSOR_EFFECT;
    const AE = window.ACTIVE_AVATAR_EFFECT;
    const BE = window.ACTIVE_BG_EFFECT;
    const purchased = window.PURCHASED_EFFECTS || [];

    // ── Background effects ──────────────────────────────────────────────────
    if (BE && purchased.includes(BE)) {
        const bgCanvas = document.createElement('canvas');
        bgCanvas.id = 'purchased-bg-canvas';
        // IMPORTANT: do NOT set width/height via CSS % — that resets canvas pixels.
        // Use position:fixed with explicit pixel dimensions, updated on resize.
        bgCanvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:1;opacity:.85;display:block;';
        // Insert AFTER #profile-bg inside #profile-content so the canvas:
        //  1. Inherits the fade-in opacity of #profile-content (not visible before splash click)
        //  2. Stacks on top of #profile-bg (same z-index would lose to later DOM order,
        //     so we use z-index:1 and sit above profile-bg's z-index:0)
        const _profileBg = document.getElementById('profile-bg');
        if (_profileBg && _profileBg.parentNode) {
            _profileBg.parentNode.insertBefore(bgCanvas, _profileBg.nextSibling);
        } else {
            document.body.insertBefore(bgCanvas, document.body.firstChild);
        }
        const bgCtx = bgCanvas.getContext('2d');
        let W, H;
        function resizeBg() {
            W = bgCanvas.width  = window.innerWidth;
            H = bgCanvas.height = window.innerHeight;
            bgCanvas.style.width  = W + 'px';
            bgCanvas.style.height = H + 'px';
        }
        resizeBg();
        window.addEventListener('resize', resizeBg);

        const bgRenderers = {
            bg_fallingleaves: (() => {
                // Persistent leaf seeds so each leaf has its own random personality
                const LEAF_COUNT = 28;
                let seeds = null;
                function initSeeds() {
                    seeds = Array.from({length: LEAF_COUNT}, (_, i) => ({
                        xBase: Math.random(),          // 0..1 of W
                        phase:  Math.random() * 100,   // animation offset
                        speed:  0.18 + Math.random() * 0.32,
                        swayAmp: 35 + Math.random() * 55,
                        swayFreq: 0.018 + Math.random() * 0.022,
                        rotSpeed: (Math.random() < 0.5 ? 1 : -1) * (0.02 + Math.random() * 0.04),
                        sz: 5 + Math.random() * 5,
                        colorIdx: i % 5,
                        swayOff: Math.random() * Math.PI * 2,
                    }));
                }
                // Draw a natural leaf shape (teardrop with midrib)
                function drawLeaf(ctx, sz, color) {
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.moveTo(0, -sz);
                    ctx.bezierCurveTo( sz*0.9, -sz*0.3,  sz*0.9,  sz*0.6,  0,  sz);
                    ctx.bezierCurveTo(-sz*0.9,  sz*0.6, -sz*0.9, -sz*0.3,  0, -sz);
                    ctx.fill();
                    // midrib
                    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
                    ctx.lineWidth = 0.7;
                    ctx.beginPath();
                    ctx.moveTo(0, -sz * 0.85);
                    ctx.lineTo(0,  sz * 0.85);
                    ctx.stroke();
                }
                // Draw aesthetic branch in top-right corner
                function drawBranch(ctx, W, H) {
                    ctx.save();
                    const bx = W * 0.98, by = 0;
                    ctx.translate(bx, by);
                    ctx.strokeStyle = 'rgba(101,163,13,0.55)';
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';
                    // main stem going left-down
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.bezierCurveTo(-W*0.08, H*0.04, -W*0.14, H*0.09, -W*0.22, H*0.13);
                    ctx.stroke();
                    // sub-branches
                    const subs = [
                        {t:0.25, angle:-0.6, len:W*0.055, lw:1.8},
                        {t:0.5,  angle:-0.9, len:W*0.07,  lw:1.6},
                        {t:0.7,  angle:-0.4, len:W*0.04,  lw:1.3},
                        {t:0.85, angle:-1.1, len:W*0.05,  lw:1.2},
                    ];
                    function ptOnCurve(t) {
                        const mt=1-t;
                        return {
                            x: mt*mt*mt*0 + 3*mt*mt*t*(-W*0.08) + 3*mt*t*t*(-W*0.14) + t*t*t*(-W*0.22),
                            y: mt*mt*mt*0 + 3*mt*mt*t*(H*0.04)  + 3*mt*t*t*(H*0.09)  + t*t*t*(H*0.13),
                        };
                    }
                    subs.forEach(s => {
                        const p = ptOnCurve(s.t);
                        ctx.lineWidth = s.lw;
                        ctx.strokeStyle = 'rgba(101,163,13,0.45)';
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p.x + Math.cos(s.angle) * s.len, p.y + Math.sin(s.angle + 1.2) * s.len);
                        ctx.stroke();
                        // small bud leaves on branch tips
                        const leafColors = ['#84cc16','#65a30d','#a3e635'];
                        ctx.save();
                        ctx.translate(p.x + Math.cos(s.angle)*s.len*0.9, p.y + Math.sin(s.angle+1.2)*s.len*0.9);
                        ctx.rotate(s.angle - Math.PI/2);
                        ctx.globalAlpha = 0.7;
                        drawLeaf(ctx, s.lw * 2.5, leafColors[Math.floor(s.t*3)%3]);
                        ctx.restore();
                    });
                    ctx.restore();
                }
                const colors = ['#84cc16','#65a30d','#a3e635','#fbbf24','#86efac'];
                return (ctx, W, H, t) => {
                    ctx.clearRect(0, 0, W, H);
                    if (!seeds) initSeeds();
                    // Draw branch first (background layer)
                    drawBranch(ctx, W, H);
                    // Draw falling leaves
                    for (let i = 0; i < seeds.length; i++) {
                        const s = seeds[i];
                        const prog = ((t * s.speed + s.phase) % 100) / 100;
                        const y = prog * (H + 40) - 20;
                        const x = (s.xBase * W + Math.sin(t * s.swayFreq + s.swayOff) * s.swayAmp + W) % W;
                        const rot = t * s.rotSpeed + s.phase;
                        const fadeIn  = Math.min(1, prog * 12);
                        const fadeOut = Math.min(1, (1 - prog) * 8);
                        const alpha = 0.65 * fadeIn * fadeOut;
                        ctx.save();
                        ctx.globalAlpha = alpha;
                        ctx.translate(x, y);
                        ctx.rotate(rot);
                        drawLeaf(ctx, s.sz, colors[s.colorIdx]);
                        ctx.restore();
                    }
                };
            })(),
            bg_underwater: (() => {
                const BCOUNT=22;let bubbles=null;
                function initBubbles(W){
                    bubbles=Array.from({length:BCOUNT},()=>({
                        x:Math.random()*W, wobbleOff:Math.random()*Math.PI*2,
                        speed:0.25+Math.random()*0.45, r:2.5+Math.random()*5.5,
                        phase:Math.random()*100, popAt:0.07+Math.random()*0.25,
                        popping:false, popT:0, popX:0, popY:0,
                    }));
                }
                return (ctx,W,H,t)=>{
                    ctx.clearRect(0,0,W,H);
                    const g=ctx.createLinearGradient(0,0,0,H);
                    g.addColorStop(0,'rgba(2,78,120,0.28)');g.addColorStop(1,'rgba(0,30,60,0.15)');
                    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
                    for(let j=0;j<5;j++){const rx=(W/5)*j+W/10+Math.sin(t*0.008+j)*30;ctx.save();ctx.globalAlpha=0.04+Math.sin(t*0.01+j)*0.02;ctx.fillStyle='#bae6fd';ctx.beginPath();ctx.moveTo(rx-20,0);ctx.lineTo(rx+20,0);ctx.lineTo(rx+60,H);ctx.lineTo(rx-60,H);ctx.closePath();ctx.fill();ctx.restore();}
                    if(!bubbles) initBubbles(W);
                    for(let i=0;i<bubbles.length;i++){
                        const b=bubbles[i];
                        const prog=((t*b.speed+b.phase)%100)/100;
                        const riseY=H*(1-prog);
                        const bx=(b.x+Math.sin(prog*Math.PI*3+b.wobbleOff)*22+W)%W;
                        if(!b.popping&&prog>=(1-b.popAt)){b.popping=true;b.popT=0;b.popX=bx;b.popY=riseY;}
                        if(b.popping){
                            b.popT++;const pt=b.popT/18;
                            if(pt<=1){
                                const pr=b.r*(1+pt*3);
                                ctx.save();ctx.globalAlpha=(1-pt)*0.55;ctx.strokeStyle='#bae6fd';ctx.lineWidth=1;ctx.beginPath();ctx.arc(b.popX,b.popY,pr,0,Math.PI*2);ctx.stroke();ctx.restore();
                                for(let d=0;d<4;d++){const da=b.wobbleOff+d*Math.PI/2;const dx=b.popX+Math.cos(da)*pr*0.9;const dy=b.popY+Math.sin(da)*pr*0.9;ctx.save();ctx.globalAlpha=(1-pt)*0.5;ctx.fillStyle='#7dd3fc';ctx.beginPath();ctx.arc(dx,dy,Math.max(0.5,b.r*0.22*(1-pt)),0,Math.PI*2);ctx.fill();ctx.restore();}
                            } else {
                                b.x=Math.random()*W;b.wobbleOff=Math.random()*Math.PI*2;b.speed=0.25+Math.random()*0.45;b.r=2.5+Math.random()*5.5;b.phase=Math.random()*100;b.popAt=0.07+Math.random()*0.25;b.popping=false;b.popT=0;
                            }
                        } else {
                            const alpha=prog<0.08?prog/0.08:prog>0.88?(1-prog)/0.12:1;
                            ctx.save();ctx.globalAlpha=alpha*0.55;ctx.strokeStyle='#7dd3fc';ctx.lineWidth=1.2;ctx.shadowColor='#38bdf8';ctx.shadowBlur=6;ctx.beginPath();ctx.arc(bx,riseY,b.r,0,Math.PI*2);ctx.stroke();
                            ctx.globalAlpha=alpha*0.18;ctx.fillStyle='#e0f2fe';ctx.beginPath();ctx.arc(bx-b.r*0.28,riseY-b.r*0.28,b.r*0.38,0,Math.PI*2);ctx.fill();ctx.restore();
                        }
                    }
                };
            })(),
            bg_gas: (ctx,W,H,t) => {
                ctx.clearRect(0,0,W,H);
                const palettes=[['#6d28d9','#7c3aed'],['#4c1d95','#5b21b6'],['#1e1b4b','#312e81']];
                for(let i=0;i<8;i++){
                    const cx=W/2+Math.cos(t*0.006+i*45*Math.PI/180)*W*0.32;
                    const cy=H/2+Math.sin(t*0.008+i*45*Math.PI/180)*H*0.32;
                    const r=W*0.15+Math.sin(t*0.012+i)*W*0.05;
                    const grd=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
                    const [c1,c2]=palettes[i%palettes.length];
                    grd.addColorStop(0,c1+'44');grd.addColorStop(1,'transparent');
                    ctx.save();ctx.globalAlpha=0.6;ctx.fillStyle=grd;
                    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();ctx.restore();
                }
            },
            bg_fireworks: (() => {
                // Self-contained fireworks state — never blocked by frame counter overflow
                const bursts = [];
                const COLORS = ['#ffd700','#f97316','#ef4444','#a78bfa','#34d399','#60a5fa','#f472b6','#facc15'];
                let lastBurst = 0;
                function spawnBurst(W, H) {
                    const x = W * (0.15 + Math.random() * 0.7);
                    const y = H * (0.1  + Math.random() * 0.6);
                    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
                    const count = 28 + Math.floor(Math.random() * 16);
                    const speed = 2.2 + Math.random() * 2.5;
                    const particles = [];
                    for (let i = 0; i < count; i++) {
                        const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
                        const s = speed * (0.5 + Math.random() * 0.8);
                        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.2, life: 1, trail: [] });
                    }
                    bursts.push({ particles, color, life: 1, maxLife: 70 + Math.floor(Math.random() * 30) });
                }
                return (ctx, W, H, t) => {
                    ctx.clearRect(0, 0, W, H);
                    // Spawn a new burst every ~90 frames, max 5 bursts active
                    if (t - lastBurst > 88 + Math.floor(Math.random() * 30) || bursts.length === 0) {
                        if (bursts.length < 5) { spawnBurst(W, H); lastBurst = t; }
                    }
                    // Also sometimes add a second burst offset
                    if (bursts.length < 3 && t - lastBurst > 44) { spawnBurst(W, H); }
                    for (let b = bursts.length - 1; b >= 0; b--) {
                        const burst = bursts[b];
                        burst.life -= 1 / burst.maxLife;
                        if (burst.life <= 0) { bursts.splice(b, 1); continue; }
                        for (let p of burst.particles) {
                            p.trail.push({ x: p.x, y: p.y });
                            if (p.trail.length > 5) p.trail.shift();
                            p.x += p.vx; p.y += p.vy;
                            p.vx *= 0.97; p.vy = p.vy * 0.97 + 0.12; // gravity
                            p.life = burst.life;
                        }
                        for (let p of burst.particles) {
                            if (p.trail.length > 1) {
                                ctx.save();
                                ctx.strokeStyle = burst.color;
                                ctx.lineWidth = 1.2;
                                ctx.globalAlpha = p.life * 0.35;
                                ctx.shadowColor = burst.color; ctx.shadowBlur = 4;
                                ctx.beginPath();
                                ctx.moveTo(p.trail[0].x, p.trail[0].y);
                                for (let pt of p.trail) ctx.lineTo(pt.x, pt.y);
                                ctx.stroke(); ctx.restore();
                            }
                            const sz = Math.max(0.5, 3.5 * p.life);
                            ctx.save();
                            ctx.globalAlpha = p.life * 0.9;
                            ctx.fillStyle = burst.color;
                            ctx.shadowColor = burst.color; ctx.shadowBlur = 10;
                            ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI * 2); ctx.fill();
                            ctx.restore();
                        }
                    }
                };
            })(),
            bg_hell: (ctx,W,H,t) => {
                ctx.clearRect(0,0,W,H);
                const g=ctx.createLinearGradient(0,H,0,0);
                g.addColorStop(0,'rgba(239,68,68,0.3)');g.addColorStop(0.4,'rgba(153,27,27,0.14)');g.addColorStop(1,'transparent');
                ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
                // --- pentagram helper ---
                const penta=(cx,cy,r,rot,alpha,clr)=>{
                    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=clr;ctx.lineWidth=1.2;
                    ctx.shadowColor=clr;ctx.shadowBlur=10;ctx.beginPath();
                    for(let p=0;p<5;p++){const a=rot+p*4*Math.PI/5-Math.PI/2;const x=cx+r*Math.cos(a);const y=cy+r*Math.sin(a);p===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
                    ctx.closePath();ctx.stroke();ctx.restore();
                };
                // --- soul helper ---
                const soul=(cx,cy,sz,alpha,clr)=>{
                    ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=clr;ctx.shadowColor=clr;ctx.shadowBlur=20;
                    ctx.beginPath();ctx.arc(cx,cy,sz,Math.PI,0,false);
                    ctx.lineTo(cx+sz,cy+sz*1.8);
                    ctx.quadraticCurveTo(cx+sz*0.5,cy+sz*1.35,cx,cy+sz*1.6);
                    ctx.quadraticCurveTo(cx-sz*0.5,cy+sz*1.35,cx-sz,cy+sz*1.8);
                    ctx.lineTo(cx-sz,cy);ctx.closePath();ctx.fill();ctx.restore();
                };
                // pentagrams – scatter upper 65%, slow drift + rotation
                for(let i=0;i<8;i++){const sd=i*137.508;const px=(Math.sin(sd)*0.44+0.5)*W;const py=(Math.cos(sd*0.7)*0.28+0.3)*H*0.65;const pr=7+Math.sin(sd*0.3)*5;const rot=t*0.003*(i%2?1:-1)+sd;const a=0.28+Math.sin(t*0.005+sd)*0.13;penta(px,py,pr,rot,a,'#ef4444');}
                // souls rising from bottom – 12 staggered, random spawn positions
                if(!bgRenderers._hellSeeds){bgRenderers._hellSeeds=Array.from({length:12},()=>({xBase:Math.random(),xWobble:Math.random()*Math.PI*2,speed:0.6+Math.random()*0.5,phase:Math.random()*100,sz0:4+Math.random()*3}));}
                for(let i=0;i<12;i++){const s=bgRenderers._hellSeeds[i];const prog=((t*s.speed+s.phase)%100)/100;const x=(s.xBase*W*0.9+W*0.05+Math.sin(prog*Math.PI*4+s.xWobble)*28)%W;const y=H*(1-prog*0.93)+10;const sz=s.sz0+prog*6;const a=prog<0.1?prog*10:prog>0.8?(1-prog)/0.2:0.75;const clr=prog>0.55?'rgba(255,190,190,0.9)':'rgba(255,110,110,0.88)';soul(x,y,sz,a,clr);}
            },
            bg_shadowworld: (ctx,W,H,t) => {
                ctx.clearRect(0,0,W,H);

                // ── Shadow orbs — +15% pronunțare față de original ──
                for(let i=0;i<12;i++){
                    const x=W*0.04+i*(W*0.09)+Math.sin(t*0.005+i*0.7)*W*0.11;
                    const y=H*0.08+((t*0.18+i*9)%100)/100*H*0.88;
                    const r=22+Math.sin(t*0.012+i)*14;
                    const g2=ctx.createRadialGradient(x,y,0,x,y,r);
                    g2.addColorStop(0,'rgba(109,40,217,0.30)');g2.addColorStop(0.5,'rgba(76,29,149,0.18)');g2.addColorStop(1,'transparent');
                    ctx.save();ctx.globalAlpha=1;ctx.fillStyle=g2;
                    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();
                }
                // secondary micro-orbs for depth
                for(let i=0;i<8;i++){
                    const x=W*0.07+i*(W*0.13)+Math.cos(t*0.007+i*1.1)*W*0.07;
                    const y=H*0.15+((t*0.12+i*13)%100)/100*H*0.72;
                    const r=8+Math.sin(t*0.02+i*2)*5;
                    const g2=ctx.createRadialGradient(x,y,0,x,y,r);
                    g2.addColorStop(0,'rgba(139,92,246,0.35)');g2.addColorStop(1,'transparent');
                    ctx.save();ctx.globalAlpha=0.9;ctx.fillStyle=g2;
                    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();
                }

                // ── Background eyes — scattered on sides, NOT on profile border ──
                function drawBgEye(ex,ey,ew,blinkT,hue){
                    const eh=ew*0.38;
                    const blink=Math.max(0,Math.sin(blinkT));
                    const scaleY=blink;
                    if(scaleY<0.02) return; // fully closed — skip draw
                    ctx.save();
                    ctx.translate(ex,ey);
                    ctx.scale(1,scaleY);
                    // glow halo
                    const grd=ctx.createRadialGradient(0,0,ew*0.1,0,0,ew*1.4);
                    grd.addColorStop(0,`hsla(${hue},80%,45%,0.18)`);
                    grd.addColorStop(1,'transparent');
                    ctx.fillStyle=grd;ctx.beginPath();ctx.ellipse(0,0,ew*1.4,eh*1.4,0,0,Math.PI*2);ctx.fill();
                    // iris fill
                    ctx.save();
                    ctx.shadowColor=`hsl(${hue},70%,40%)`;ctx.shadowBlur=10;
                    ctx.fillStyle=`hsl(${hue},60%,22%)`;
                    ctx.beginPath();
                    ctx.moveTo(-ew,0);
                    ctx.bezierCurveTo(-ew,-eh*1.6,ew,-eh*1.6,ew,0);
                    ctx.bezierCurveTo(ew,eh*1.6,-ew,eh*1.6,-ew,0);
                    ctx.fill();ctx.restore();
                    // iris highlight
                    ctx.save();ctx.globalAlpha=0.28;ctx.fillStyle=`hsl(${hue},70%,55%)`;
                    ctx.beginPath();
                    ctx.moveTo(-ew*0.45,0);ctx.bezierCurveTo(-ew*0.45,-eh,ew*0.45,-eh,ew*0.45,0);
                    ctx.bezierCurveTo(ew*0.45,eh,-ew*0.45,eh,-ew*0.45,0);
                    ctx.fill();ctx.restore();
                    // slit pupil
                    ctx.save();ctx.fillStyle='#05000f';
                    ctx.beginPath();
                    ctx.moveTo(0,-eh*0.88);
                    ctx.bezierCurveTo(ew*0.12,-eh*0.35,ew*0.12,eh*0.35,0,eh*0.88);
                    ctx.bezierCurveTo(-ew*0.12,eh*0.35,-ew*0.12,-eh*0.35,0,-eh*0.88);
                    ctx.fill();ctx.restore();
                    // eye outline
                    ctx.save();
                    ctx.strokeStyle=`hsla(${hue},70%,55%,0.65)`;ctx.lineWidth=1;
                    ctx.shadowColor=`hsl(${hue},70%,50%)`;ctx.shadowBlur=7;
                    ctx.beginPath();
                    ctx.moveTo(-ew,0);ctx.bezierCurveTo(-ew,-eh*1.6,ew,-eh*1.6,ew,0);
                    ctx.bezierCurveTo(ew,eh*1.6,-ew,eh*1.6,-ew,0);
                    ctx.stroke();ctx.restore();
                    ctx.restore();
                }

                // Eye positions — left side and right side only, away from center card
                // Each eye: x, y (as fraction of W/H), size, blinkPhase offset, hue
                const eyes=[
                    // left band
                    {fx:0.055, fy:0.18, fs:0.028, ph:0,     hue:270},
                    {fx:0.08,  fy:0.52, fs:0.022, ph:40,    hue:280},
                    {fx:0.045, fy:0.78, fs:0.025, ph:110,   hue:260},
                    {fx:0.13,  fy:0.36, fs:0.018, ph:75,    hue:275},
                    {fx:0.10,  fy:0.68, fs:0.020, ph:155,   hue:265},
                    // right band
                    {fx:0.945, fy:0.22, fs:0.026, ph:30,    hue:280},
                    {fx:0.92,  fy:0.58, fs:0.023, ph:90,    hue:270},
                    {fx:0.955, fy:0.84, fs:0.021, ph:60,    hue:260},
                    {fx:0.875, fy:0.40, fs:0.019, ph:130,   hue:275},
                    {fx:0.90,  fy:0.72, fs:0.024, ph:170,   hue:268},
                ];
                eyes.forEach(({fx,fy,fs,ph,hue})=>{
                    // blink rhythm: eyes blink independently
                    const blinkT=Math.sin((t+ph)*0.022)*Math.PI;
                    ctx.save();ctx.globalAlpha=0.72+Math.sin(t*0.015+ph)*0.18;
                    drawBgEye(fx*W, fy*H, fs*W, blinkT, hue);
                    ctx.restore();
                });

                // Glitch scanlines
                if(Math.sin(t*0.04)>0.75){
                    ctx.save();ctx.globalAlpha=0.07;ctx.strokeStyle='#4c1d95';ctx.lineWidth=1;
                    for(let y=0;y<H;y+=6){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
                    ctx.restore();
                }
                // Vignette
                const vg=ctx.createRadialGradient(W/2,H/2,H*0.18,W/2,H/2,H*0.9);
                vg.addColorStop(0,'transparent');vg.addColorStop(1,'rgba(0,0,0,0.62)');
                ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
            },
        };

        let bgFrame=0;
        if(bgRenderers[BE]) {
            (function bgLoop(){
                bgRenderers[BE](bgCtx,W,H,bgFrame++);
                requestAnimationFrame(bgLoop);
            })();
        }
    }

    // ── Avatar canvas effects ───────────────────────────────────────────────
    const avCanvas = document.getElementById('pav-canvas');
    if (avCanvas && AE && purchased.includes(AE)) {
        const ctx = avCanvas.getContext('2d');
        // Size canvas to actual rendered size
        function sizeAv() {
            const r = avCanvas.getBoundingClientRect();
            avCanvas.width = r.width || 240;
            avCanvas.height = r.height || 240;
        }
        sizeAv();
        const W2 = () => avCanvas.width, H2 = () => avCanvas.height;

        // Canvas offset: pav-effect-wrap has top:-60px, sides/bottom:-12px
        // Avatar center in canvas: cy = 60 + avatarHalfH; R = (H - 60 - 12) / 2
        const PAV_TOP_OFFSET = 60, PAV_EDGE = 12;
        function getAvatarCY(H){ return PAV_TOP_OFFSET + (H - PAV_TOP_OFFSET - PAV_EDGE) / 2; }
        function getAvatarR(H){ return (H - PAV_TOP_OFFSET - PAV_EDGE) / 2 - 2; }

        // ── Shape helpers ──
        const SHAPE = window.AVATAR_SHAPE || 'circle';
        // border-radius in px for rounded-rect shapes; 9999 = circle orbit for clip-path shapes
        const SHAPE_RADIUS = { circle: 9999, square: 8, soft: 22, rounded: 36,
                               egg: 9999, eye: 9999, diamond: 0 };
        const SR = SHAPE_RADIUS[SHAPE] ?? 9999;

        // Shapes that orbit as circle on canvas (clip-path shapes can't be parameterized simply)
        const CIRCLE_ORBIT = new Set(['circle','egg']);

        // ── Polygon definitions (0..1 normalized, same as CSS clip-path) ──
        const SHAPE_POLYGONS = {
            eye:     [[.00,.50],[.10,.30],[.25,.15],[.50,.05],[.75,.15],[.90,.30],[1.0,.50],[.90,.70],[.75,.85],[.50,.95],[.25,.85],[.10,.70]],
            diamond: [[.50,.00],[1.0,.50],[.50,1.00],[.00,.50]],
        };

        // Walk polygon perimeter and return N evenly-spaced points
        function polygonBorderPoints(cx, cy, W, H, polyNorm, n) {
            // Convert normalized polygon to canvas coords
            const poly = polyNorm.map(([px,py]) => ({ x: cx + (px - 0.5)*W, y: cy + (py - 0.5)*H }));
            // Compute segment lengths
            const lens = poly.map((p,i) => {
                const q = poly[(i+1)%poly.length];
                return Math.hypot(q.x-p.x, q.y-p.y);
            });
            const total = lens.reduce((a,b)=>a+b, 0);
            const pts = [];
            for (let i = 0; i < n; i++) {
                let dist = (i/n) * total;
                let si = 0;
                while (si < lens.length-1 && dist > lens[si]) { dist -= lens[si]; si++; }
                const p0 = poly[si], p1 = poly[(si+1)%poly.length];
                const t2 = lens[si] > 0 ? dist/lens[si] : 0;
                const px = p0.x + (p1.x-p0.x)*t2;
                const py = p0.y + (p1.y-p0.y)*t2;
                pts.push({ x: px, y: py, a: Math.atan2(py-cy, px-cx) });
            }
            return pts;
        }

        // Get N evenly-spaced points along the avatar border
        function getBorderPoints(cx, cy, R, n) {
            const pts = [];
            // Polygon shapes: walk their real outline (same coords as CSS clip-path)
            if (SHAPE_POLYGONS[SHAPE]) {
                return polygonBorderPoints(cx, cy, R*2, R*2, SHAPE_POLYGONS[SHAPE], n);
            } else if (CIRCLE_ORBIT.has(SHAPE)) {
                for (let i = 0; i < n; i++) {
                    const a = (i / n) * Math.PI * 2;
                    pts.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, a });
                }
            } else if (SHAPE === 'diamond') {
                // Walk diamond perimeter: top → right → bottom → left
                const side = R * Math.SQRT2;
                const total = side * 4;
                const corners = [
                    { x: cx, y: cy - R },     // top
                    { x: cx + R, y: cy },      // right
                    { x: cx, y: cy + R },      // bottom
                    { x: cx - R, y: cy },      // left
                ];
                for (let i = 0; i < n; i++) {
                    const t = (i / n) * total;
                    const seg = Math.floor(t / side);
                    const p = (t % side) / side;
                    const c0 = corners[seg % 4];
                    const c1 = corners[(seg + 1) % 4];
                    const px = c0.x + (c1.x - c0.x) * p;
                    const py = c0.y + (c1.y - c0.y) * p;
                    pts.push({ x: px, y: py, a: Math.atan2(py - cy, px - cx) });
                }
            } else {
                // Rounded rect: walk the perimeter
                const hw = R, hh = R;
                const cr = Math.min(SR, hw * 0.6);
                const straight = (hw - cr) * 2;
                const arc = cr * Math.PI / 2;
                const total = straight * 4 + arc * 4;
                for (let i = 0; i < n; i++) {
                    const t = (i / n) * total;
                    pts.push(perimPoint(cx, cy, hw, hh, cr, t, total));
                }
            }
            return pts;
        }

        function perimPoint(cx, cy, hw, hh, cr, t) {
            // Walk perimeter of rounded rect clockwise from top-left corner arc
            const s = hw - cr; // straight segment half-length
            const arcLen = cr * Math.PI / 2;
            const segs = [
                { type:'arc', cx: cx-s, cy: cy-hh+cr, r:cr, a0:-Math.PI/2, da:-Math.PI/2 }, // TL
                { type:'line', x0:cx-s, y0:cy-hh, x1:cx+s, y1:cy-hh },                       // top
                { type:'arc', cx: cx+s, cy: cy-hh+cr, r:cr, a0:-Math.PI/2, da: Math.PI/2 },  // TR
                { type:'line', x0:cx+hw, y0:cy-s, x1:cx+hw, y1:cy+s },                        // right
                { type:'arc', cx: cx+s, cy: cy+hh-cr, r:cr, a0: 0,        da: Math.PI/2 },    // BR
                { type:'line', x0:cx+s, y0:cy+hh, x1:cx-s, y1:cy+hh },                        // bottom
                { type:'arc', cx: cx-s, cy: cy+hh-cr, r:cr, a0: Math.PI/2, da: Math.PI/2 },  // BL
                { type:'line', x0:cx-hw, y0:cy+s, x1:cx-hw, y1:cy-s },                        // left
            ];
            const lens = segs.map(sg => sg.type==='arc' ? arcLen : Math.hypot(sg.x1-sg.x0, sg.y1-sg.y0));
            const total2 = lens.reduce((a,b)=>a+b,0);
            let rem = ((t % total2) + total2) % total2;
            for (let i = 0; i < segs.length; i++) {
                if (rem <= lens[i]) {
                    const sg = segs[i], p = rem / lens[i];
                    if (sg.type === 'arc') {
                        const a = sg.a0 + sg.da * p;
                        return { x: sg.cx + Math.cos(a)*sg.r, y: sg.cy + Math.sin(a)*sg.r, a };
                    } else {
                        const a = Math.atan2(sg.y1-sg.y0, sg.x1-sg.x0);
                        return { x: sg.x0+(sg.x1-sg.x0)*p, y: sg.y0+(sg.y1-sg.y0)*p, a };
                    }
                }
                rem -= lens[i];
            }
            return { x: cx, y: cy-hh, a: 0 };
        }

        // Draw shape-aware ring stroke on canvas
        function drawShapeRing(ctx, cx, cy, R, color, lineW, blur, dash) {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = lineW;
            ctx.shadowColor = color;
            ctx.shadowBlur = blur || 0;
            if (dash) ctx.setLineDash(dash);
            ctx.beginPath();
            if (SHAPE_POLYGONS[SHAPE]) {
                // Draw polygon outline matching CSS clip-path
                const poly = SHAPE_POLYGONS[SHAPE];
                poly.forEach(([px,py], i) => {
                    const x = cx + (px - 0.5) * R * 2;
                    const y = cy + (py - 0.5) * R * 2;
                    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                });
                ctx.closePath();
            } else if (CIRCLE_ORBIT.has(SHAPE)) {
                ctx.arc(cx, cy, R, 0, Math.PI * 2);
            } else if (SHAPE === 'diamond') {
                ctx.moveTo(cx,      cy - R);
                ctx.lineTo(cx + R,  cy);
                ctx.lineTo(cx,      cy + R);
                ctx.lineTo(cx - R,  cy);
                ctx.closePath();
            } else {
                const cr = Math.min(SR, R * 0.6);
                const s = R - cr;
                ctx.moveTo(cx - s, cy - R);
                ctx.lineTo(cx + s, cy - R);
                ctx.arcTo(cx + R, cy - R, cx + R, cy - s, cr);
                ctx.lineTo(cx + R, cy + s);
                ctx.arcTo(cx + R, cy + R, cx + s, cy + R, cr);
                ctx.lineTo(cx - s, cy + R);
                ctx.arcTo(cx - R, cy + R, cx - R, cy + s, cr);
                ctx.lineTo(cx - R, cy - s);
                ctx.arcTo(cx - R, cy - R, cx - s, cy - R, cr);
                ctx.closePath();
            }
            ctx.stroke();
            if (dash) ctx.setLineDash([]);
            ctx.restore();
            // Hard reset shadow — ctx.restore() doesn't always clear shadowBlur in all browsers
            ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
        }

        function getEffectR(W, H) { return H ? getAvatarR(H) : W * 0.48; }

        let avDarkEyesCache = null; // cached orbit points for darkeyes effect
        const avRenderers = {
            avatar_rocks: (ctx,W,H,t) => {
                ctx.clearRect(0,0,W,H);
                const cx=W/2, cy=getAvatarCY(H), R=getEffectR(W,H);
                const count = 8;
                // Use getBorderPoints for all shapes — it already handles
                // circle, diamond, and rounded-rect correctly.
                const pts = getBorderPoints(cx, cy, R, count);
                for(let i=0;i<count;i++){
                    const idxF = ((t*0.003*count + i) % count + count) % count;
                    const idxA = Math.floor(idxF);
                    const idxB = (idxA + 1) % count;
                    const frac = idxF - idxA;
                    const pA = pts[idxA], pB = pts[idxB];
                    const px = pA.x + (pB.x - pA.x) * frac;
                    const py = pA.y + (pB.y - pA.y) * frac;
                    const pa = pA.a + (pB.a - pA.a) * frac;
                    const sz=4+Math.sin(i*1.3)*2;
                    ctx.save();ctx.globalAlpha=0.88;ctx.fillStyle=i%2?'#a8a29e':'#78716c';
                    ctx.translate(px,py);ctx.rotate(pa+t*0.02);
                    ctx.beginPath();ctx.ellipse(0,0,sz,sz*0.7,0,0,Math.PI*2);ctx.fill();ctx.restore();
                }
            },
            avatar_crown: (ctx,W,H,t) => {
                ctx.clearRect(0,0,W,H);
                const cx=W/2;
                const bob=Math.sin(t*0.04)*3;
                const baseY=H*0.30-bob;
                const s=W*0.14;

                // glow redus ~40%
                const glowR=s*1.05;
                const pulse=0.12+Math.sin(t*0.05)*0.05;
                const grd=ctx.createRadialGradient(cx,baseY,0,cx,baseY,glowR);
                grd.addColorStop(0,`rgba(255,200,0,${pulse})`);
                grd.addColorStop(1,'transparent');
                ctx.save();ctx.fillStyle=grd;ctx.beginPath();ctx.arc(cx,baseY,glowR,0,Math.PI*2);ctx.fill();ctx.restore();

                // Dimensiuni coroana de rege
                const bH=s*0.3;           // inaltime banda baza
                const bY=baseY+s*0.45;    // top banda baza
                const bL=cx-s, bR=cx+s;
                const lx=cx-s*0.6, rx=cx+s*0.6;
                const cSH=s*1.05, sSH=s*0.68; // spire center/laterale
                const cSW=s*0.27, sSW=s*0.21;

                // gradient metalic
                const mf=ctx.createLinearGradient(cx,bY-cSH,cx,bY+bH);
                mf.addColorStop(0,'rgba(255,240,90,0.95)');
                mf.addColorStop(0.25,'rgba(255,205,20,0.92)');
                mf.addColorStop(0.65,'rgba(200,145,0,0.88)');
                mf.addColorStop(1,'rgba(150,100,0,0.82)');

                ctx.save();
                ctx.shadowColor='#ffc200';ctx.shadowBlur=8;
                ctx.strokeStyle='#b8860b';ctx.lineWidth=1.6;ctx.globalAlpha=0.98;
                ctx.fillStyle=mf;
                ctx.beginPath();
                // contur coroana rege: 3 spire dreptunghiulare cu baza plata
                ctx.moveTo(bL,bY+bH);
                ctx.lineTo(bL,bY);
                ctx.lineTo(lx-sSW/2,bY);
                ctx.lineTo(lx-sSW/2,bY-sSH);
                ctx.lineTo(lx+sSW/2,bY-sSH);
                ctx.lineTo(lx+sSW/2,bY);
                ctx.lineTo(cx-cSW/2,bY);
                ctx.lineTo(cx-cSW/2,bY-cSH);
                ctx.lineTo(cx+cSW/2,bY-cSH);
                ctx.lineTo(cx+cSW/2,bY);
                ctx.lineTo(rx-sSW/2,bY);
                ctx.lineTo(rx-sSW/2,bY-sSH);
                ctx.lineTo(rx+sSW/2,bY-sSH);
                ctx.lineTo(rx+sSW/2,bY);
                ctx.lineTo(bR,bY);
                ctx.lineTo(bR,bY+bH);
                ctx.closePath();
                ctx.fill();ctx.stroke();
                ctx.restore();

                // sheen metalic
                ctx.save();ctx.globalAlpha=0.13;
                const sh=ctx.createLinearGradient(bL,0,bR,0);
                sh.addColorStop(0,'transparent');sh.addColorStop(0.42,'rgba(255,255,220,0.9)');
                sh.addColorStop(0.58,'rgba(255,255,220,0.9)');sh.addColorStop(1,'transparent');
                ctx.fillStyle=sh;ctx.fillRect(bL,bY-cSH,s*2,cSH+bH);ctx.restore();

                // orbs pe varful fiecarei spire
                const orbR=s*0.13;
                [[lx,bY-sSH,'#c084fc','#7e22ce'],
                 [cx,bY-cSH,'#fbbf24','#b45309'],
                 [rx,bY-sSH,'#60a5fa','#1d4ed8']].forEach(([ox,oy,c,gc])=>{
                    ctx.save();
                    ctx.shadowColor=gc;ctx.shadowBlur=10;ctx.globalAlpha=0.97;
                    const og=ctx.createRadialGradient(ox-orbR*0.35,oy-orbR*0.38,orbR*0.08,ox,oy,orbR);
                    og.addColorStop(0,'rgba(255,255,255,0.75)');
                    og.addColorStop(0.35,c);og.addColorStop(1,gc);
                    ctx.fillStyle=og;
                    ctx.beginPath();ctx.arc(ox,oy,orbR,0,Math.PI*2);ctx.fill();
                    ctx.strokeStyle=gc;ctx.lineWidth=0.9;ctx.stroke();
                    ctx.restore();
                });

                // gem central pe banda
                ctx.save();
                ctx.shadowColor='#ff4444';ctx.shadowBlur=8;ctx.globalAlpha=0.92;
                ctx.fillStyle='#f87171';
                const gx=cx,gy=bY+bH*0.5;
                ctx.beginPath();ctx.moveTo(gx,gy-4.5);ctx.lineTo(gx+3.5,gy);ctx.lineTo(gx,gy+4.5);ctx.lineTo(gx-3.5,gy);ctx.closePath();ctx.fill();
                ctx.fillStyle='rgba(255,255,255,0.65)';ctx.shadowBlur=0;
                ctx.beginPath();ctx.arc(gx-0.9,gy-1.4,1.1,0,Math.PI*2);ctx.fill();
                ctx.restore();
            },

            avatar_bloodrain: (ctx,W,H,t) => {
                ctx.clearRect(0,0,W,H);
                const cx=W/2,cy=getAvatarCY(H);
                const R=getEffectR(W,H);

                // ── Inel rosu/visinui/portocaliu ──
                const segments=80;
                if(SHAPE==='circle'){
                    for(let i=0;i<segments;i++){
                        const a1=(i/segments)*Math.PI*2;
                        const a2=((i+1)/segments)*Math.PI*2;
                        const cycle=(i/segments+t*0.004)%1;
                        const hue=cycle<0.5 ? cycle*2*20 : 20-(cycle-0.5)*2*20;
                        const sat=88+Math.sin(cycle*Math.PI*2+t*0.03)*6;
                        const light=20+Math.sin((i/segments)*Math.PI*4+t*0.05)*8;
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(cx,cy,R,a1,a2);
                        ctx.arc(cx,cy,R-5,a2,a1,true);
                        ctx.closePath();
                        ctx.fillStyle='hsl('+hue+','+sat+'%,'+light+'%)';
                        ctx.globalAlpha=0.95;
                        ctx.fill();
                        ctx.restore();
                    }
                } else if(SHAPE_POLYGONS[SHAPE]){
                    // Polygon shape — draw thick animated colored stroke along polygon outline
                    const borderPts = polygonBorderPoints(cx,cy,R*2,R*2,SHAPE_POLYGONS[SHAPE],segments);
                    for(let i=0;i<segments;i++){
                        const p0=borderPts[i], p1=borderPts[(i+1)%segments];
                        const cycle=(i/segments+t*0.004)%1;
                        const hue=cycle<0.5 ? cycle*2*20 : 20-(cycle-0.5)*2*20;
                        const sat=88+Math.sin(cycle*Math.PI*2+t*0.03)*6;
                        const light=20+Math.sin((i/segments)*Math.PI*4+t*0.05)*8;
                        ctx.save();
                        ctx.strokeStyle='hsl('+hue+','+sat+'%,'+light+'%)';
                        ctx.lineWidth=6;
                        ctx.globalAlpha=0.95;
                        ctx.shadowColor='#8b0000';
                        ctx.shadowBlur=8;
                        ctx.beginPath();
                        ctx.moveTo(p0.x,p0.y);
                        ctx.lineTo(p1.x,p1.y);
                        ctx.stroke();
                        ctx.restore();
                    }
                    // outer glow
                    drawShapeRing(ctx,cx,cy,R,'rgba(160,10,10,0.45)',3,16);
                } else {
                    // Rounded rect shapes
                    drawShapeRing(ctx,cx,cy,R,'hsl(0,88%,22%)',7,16);
                    drawShapeRing(ctx,cx,cy,R,'hsl(12,85%,30%)',3,6);
                }
                if(SHAPE==='circle'){
                    // glow rings only for circle (polygon handled above)
                    drawShapeRing(ctx,cx,cy,R,'rgba(160,10,10,0.5)',6,18);
                    drawShapeRing(ctx,cx,cy,R-5,'rgba(200,60,10,0.2)',2,6);
                }

                // ── Picaturi de sange — pronuntat ──
                const dropCount=22;
                const spawnPts = getBorderPoints(cx,cy,R,dropCount*3);
                for(let i=0;i<dropCount;i++){
                    const sp = spawnPts[Math.floor(i/dropCount*spawnPts.length)];
                    if(!sp || sp.y < cy - R*0.25) continue; // jumatatea de jos + laterale
                    const speed=0.9+Math.sin(i*1.3)*0.3;
                    const prog=((t*speed+i*8.7)%100)/100;
                    const maxDrop=H*0.45;
                    const dy=prog*maxDrop;
                    // fade in rapid, fade out lin
                    const op=prog<0.08?prog/0.08:Math.max(0,1-prog*1.1);
                    const thick=3.5*(1-prog*0.35)+0.5;
                    const dropLen=12+Math.sin(i*2.1)*5+prog*8;
                    const dHue=i%4===0?12:i%4===1?4:i%4===2?18:0;
                    const dLight=32+Math.sin(i*0.7)*8; // mai luminos = mai vizibil
                    ctx.save();
                    ctx.globalAlpha=op*0.95;
                    ctx.shadowColor='#cc0000';ctx.shadowBlur=10;
                    // tija principala
                    const grad=ctx.createLinearGradient(sp.x,sp.y+dy,sp.x,sp.y+dy+dropLen);
                    grad.addColorStop(0,'hsl('+dHue+',95%,'+dLight+'%)');
                    grad.addColorStop(1,'hsl('+dHue+',90%,'+Math.max(18,dLight-10)+'%)');
                    ctx.strokeStyle=grad;
                    ctx.lineWidth=thick;ctx.lineCap='round';
                    ctx.beginPath();ctx.moveTo(sp.x,sp.y+dy);ctx.lineTo(sp.x,sp.y+dy+dropLen);ctx.stroke();
                    // blob la capat
                    ctx.fillStyle='hsl('+dHue+',92%,'+dLight+'%)';
                    ctx.shadowBlur=14;
                    ctx.beginPath();ctx.ellipse(sp.x,sp.y+dy+dropLen,thick*1.1,thick*1.7,0,0,Math.PI*2);ctx.fill();
                    // highlight mic (luciu de sange)
                    ctx.globalAlpha=op*0.4;
                    ctx.fillStyle='rgba(255,150,150,0.8)';
                    ctx.shadowBlur=0;
                    ctx.beginPath();ctx.ellipse(sp.x-thick*0.25,sp.y+dy+dropLen-thick*0.4,thick*0.28,thick*0.38,0,0,Math.PI*2);ctx.fill();
                    ctx.restore();
                }
            },
            avatar_darkeyes: (ctx,W,H,t) => {
                // Reset shadow FIRST — shadowBlur accumulates and kills performance if not cleared
                ctx.shadowBlur = 0;
                ctx.shadowColor = 'transparent';
                ctx.clearRect(0,0,W,H);
                const cx=W/2, cy=getAvatarCY(H);
                const R = getEffectR(W,H);

                // ── 1. Orbit ring ──
                drawShapeRing(ctx,cx,cy,R,'rgba(124,58,237,0.41)',1.5,8,[4,6]);
                // Always reset shadow after drawShapeRing
                ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

                // Cache orbit points — recompute only when canvas size changes
                if (!avDarkEyesCache || avDarkEyesCache.W !== W || avDarkEyesCache.H !== H) {
                    avDarkEyesCache = { W, H, pts: getBorderPoints(cx, cy, R, 200) };
                }

                // ── 2. Eye positions ──
                const speed = 0.004;
                const blink1 = Math.max(0, Math.sin(t*0.07)   > 0.96 ? (Math.sin(t*0.07)-0.96)/0.04   : 0);
                const blink2 = Math.max(0, Math.sin(t*0.07+Math.PI) > 0.96 ? (Math.sin(t*0.07+Math.PI)-0.96)/0.04 : 0);
                const orbitPts = avDarkEyesCache.pts;
                const orbitRes = orbitPts.length;
                const idx1 = Math.floor(((t * speed * orbitRes / (Math.PI*2)) % orbitRes + orbitRes) % orbitRes);
                const idx2 = (idx1 + Math.floor(orbitRes/2)) % orbitRes;
                const p1 = orbitPts[idx1], p2 = orbitPts[idx2];

                // ── 3. drawEye — defined outside loop, called twice ──
                function drawEye(ex,ey,angle,blinkProg,scale){
                    const ew = W*0.13*scale;
                    const eh = ew*0.42;
                    const blinkSY = 1-blinkProg*0.97;

                    ctx.save();
                    ctx.translate(ex,ey);
                    ctx.rotate(angle + Math.PI/2);
                    ctx.scale(1, blinkSY);

                    // Halo glow — no shadow, use gradient only
                    const grd=ctx.createRadialGradient(0,0,ew*0.3,0,0,ew*1.3);
                    grd.addColorStop(0,'rgba(124,58,237,0.17)');
                    grd.addColorStop(1,'transparent');
                    ctx.fillStyle=grd;
                    ctx.beginPath();ctx.ellipse(0,0,ew*1.3,eh*1.3,0,0,Math.PI*2);ctx.fill();

                    // Iris — draw shadow once, reset immediately after
                    ctx.save();
                    ctx.shadowColor='#7c3aed'; ctx.shadowBlur=10;
                    ctx.fillStyle='#6d28d9';
                    ctx.beginPath();
                    ctx.moveTo(-ew,0);
                    ctx.bezierCurveTo(-ew,-eh*1.5, ew,-eh*1.5, ew,0);
                    ctx.bezierCurveTo(ew, eh*1.5, -ew, eh*1.5, -ew,0);
                    ctx.fill();
                    ctx.restore(); // clears shadowBlur

                    // Iris center band — no shadow
                    ctx.save();
                    ctx.globalAlpha=0.35;
                    ctx.fillStyle='#a78bfa';
                    ctx.beginPath();
                    ctx.moveTo(-ew*0.5,0);
                    ctx.bezierCurveTo(-ew*0.5,-eh*0.9, ew*0.5,-eh*0.9, ew*0.5,0);
                    ctx.bezierCurveTo(ew*0.5, eh*0.9, -ew*0.5, eh*0.9, -ew*0.5,0);
                    ctx.fill();
                    ctx.restore();

                    // Pupil — shadow then immediately restore
                    const pw=ew*0.13, ph=eh*0.85;
                    ctx.save();
                    ctx.shadowColor='#000'; ctx.shadowBlur=4;
                    ctx.fillStyle='#0a0010';
                    ctx.beginPath();
                    ctx.moveTo(0,-ph);
                    ctx.bezierCurveTo(pw,-ph*0.4, pw,ph*0.4, 0,ph);
                    ctx.bezierCurveTo(-pw,ph*0.4, -pw,-ph*0.4, 0,-ph);
                    ctx.fill();
                    ctx.restore(); // clears shadowBlur

                    // Eyelid outline — shadow then restore
                    ctx.save();
                    ctx.strokeStyle='rgba(109,40,217,0.7)';
                    ctx.lineWidth=1.2;
                    ctx.shadowColor='#7c3aed'; ctx.shadowBlur=6;
                    ctx.beginPath();
                    ctx.moveTo(-ew,0);
                    ctx.bezierCurveTo(-ew,-eh*1.5, ew,-eh*1.5, ew,0);
                    ctx.bezierCurveTo(ew, eh*1.5, -ew, eh*1.5, -ew,0);
                    ctx.stroke();
                    ctx.restore(); // clears shadowBlur

                    ctx.restore(); // end translate/rotate/scale
                    // Hard reset shadow after each eye — belt and suspenders
                    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
                }

                drawEye(p1.x, p1.y, p1.a, blink1, 1);
                drawEye(p2.x, p2.y, p2.a, blink2, 0.85);
                // Final hard reset
                ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
            },
        };

        let avFrame = 0;
        if(avRenderers[AE]) {
            (function avLoop(){
                // Wrap frame counter at a safe large number to avoid float precision loss
                // (idx calcs in darkeyes use modulo but large floats lose precision ~2^53)
                avFrame = (avFrame + 1) % 1000000;
                avRenderers[AE](ctx, W2(), H2(), avFrame);
                requestAnimationFrame(avLoop);
            })();
        }
    }

    // ── Cursor trail effects ────────────────────────────────────────────────
    // Only run if no standard cursor trail active, and on desktop
    if (CE && purchased.includes(CE) && !window.CURSOR_TRAIL_ENABLED && !('ontouchstart' in window)) {
        const isShadow = CE === 'cursor_shadow';
        const particles = [];
        let mx=0,my=0;
        document.addEventListener('mousemove', e=>{ mx=e.clientX; my=e.clientY; });

        const pCanvas = document.createElement('canvas');
        pCanvas.style.cssText='position:fixed;top:0;left:0;pointer-events:none;z-index:9998;display:block;';
        pCanvas.width=innerWidth;pCanvas.height=innerHeight;
        pCanvas.style.width=pCanvas.width+'px';pCanvas.style.height=pCanvas.height+'px';
        document.body.appendChild(pCanvas);
        const pc=pCanvas.getContext('2d');
        window.addEventListener('resize',()=>{
            pCanvas.width=innerWidth;pCanvas.height=innerHeight;
            pCanvas.style.width=pCanvas.width+'px';pCanvas.style.height=pCanvas.height+'px';
        });

        const configs = {
            cursor_smoke:     {count:2, life:60, spd:1.2,  sz:()=>4+Math.random()*6, color:()=>`hsla(0,0%,${60+Math.random()*20}%,`, grow:true},
            cursor_fire:      {count:3, life:40, spd:1.8,  sz:()=>3+Math.random()*5, color:()=>`hsla(${15+Math.random()*30},100%,${50+Math.random()*20}%,`, grow:false},
            cursor_soundwave: {count:1, life:55, spd:0,    sz:()=>2, color:()=>'rgba(0,212,255,', grow:true, ring:true},
            cursor_meteors:   {count:1, life:50, spd:3.5,  sz:()=>2.5, color:()=>'rgba(255,215,0,', grow:false, meteor:true},
            cursor_leaves:    {count:2, life:80, spd:0.9,  sz:()=>5+Math.random()*4, color:()=>`hsl(${100+Math.random()*60},${60+Math.random()*20}%,${40+Math.random()*20}%,`, grow:false, leaf:true},
            cursor_water:     {count:2, life:50, spd:1.5,  sz:()=>3+Math.random()*4, color:()=>'rgba(14,165,233,', grow:false},
            cursor_shadow:    {count:1, life:90, spd:0.5,  sz:()=>4+Math.random()*4, color:()=>'rgba(168,237,255,', grow:false, soul:true},
        };

        const cfg = configs[CE];
        if(cfg) {
            function spawnParticle(){
                for(let k=0;k<cfg.count;k++){
                    const angle=Math.random()*Math.PI*2;
                    const spd=cfg.spd*(0.5+Math.random()*0.5);
                    particles.push({
                        x:mx, y:my,
                        vx: cfg.meteor ? -spd*2.5 : Math.cos(angle)*spd*0.5,
                        vy: cfg.meteor ? -spd     : Math.sin(angle)*spd - (CE==='cursor_fire'?1.5:0) - (cfg.grow?0.2:0),
                        life:cfg.life, maxLife:cfg.life,
                        sz:cfg.sz(), color:cfg.color(),
                        rot:Math.random()*Math.PI*2,
                        rspd:(Math.random()-.5)*0.1,
                    });
                }
            }
            document.addEventListener('mousemove', spawnParticle);

            (function cursorLoop(){
                pc.clearRect(0,0,pCanvas.width,pCanvas.height);
                for(let i=particles.length-1;i>=0;i--){
                    const p=particles[i];
                    p.x+=p.vx; p.y+=p.vy; p.life--;
                    if(p.life<=0){particles.splice(i,1);continue;}
                    const ratio=p.life/p.maxLife;
                    const sz=cfg.grow ? p.sz*(1+ratio*1.5) : p.sz*ratio;
                    const alpha=ratio*(isShadow?0.5:0.85);
                    pc.save();
                    if(cfg.glow){pc.shadowColor='#a8edff';pc.shadowBlur=16;}
                    if(cfg.soul){
                        // Minecraft-style soul: glowing teardrop with eyes + fade trail
                        const sw=p.sz, sh=p.sz*1.4;
                        const wobble=Math.sin(p.life*0.18)*0.25;
                        // glow halo
                        pc.globalAlpha=0.15*ratio;
                        const sg=pc.createRadialGradient(p.x,p.y,0,p.x,p.y,sw*2.5);
                        sg.addColorStop(0,'#a8edff');sg.addColorStop(1,'transparent');
                        pc.fillStyle=sg;pc.beginPath();pc.arc(p.x,p.y,sw*2.5,0,Math.PI*2);pc.fill();
                        // body
                        pc.globalAlpha=0.9*ratio;
                        pc.shadowColor='#7ee8fa';pc.shadowBlur=12;
                        pc.fillStyle='rgba(168,237,255,'+ratio+')';
                        pc.beginPath();pc.ellipse(p.x,p.y,sw,sh,wobble,0,Math.PI*2);pc.fill();
                        // eyes
                        pc.shadowBlur=0;pc.fillStyle='#1a0a2e';pc.globalAlpha=ratio;
                        pc.beginPath();pc.arc(p.x-sw*0.35,p.y-sh*0.15,sw*0.22,0,Math.PI*2);pc.fill();
                        pc.beginPath();pc.arc(p.x+sw*0.35,p.y-sh*0.15,sw*0.22,0,Math.PI*2);pc.fill();
                        // tail dots
                        for(let d=1;d<=3;d++){
                            pc.globalAlpha=(0.4-d*0.1)*ratio;
                            pc.fillStyle='rgba(168,237,255,1)';pc.shadowColor='#7ee8fa';pc.shadowBlur=5;
                            pc.beginPath();pc.arc(p.x+(wobble*d*2),p.y+sh+d*4,Math.max(0.5,sw*0.4-d*0.2),0,Math.PI*2);pc.fill();
                        }
                    } else if(cfg.ring){
                        const rr=p.sz+(1-ratio)*40;
                        pc.globalAlpha=ratio*0.7;pc.strokeStyle=p.color+'0.7)';pc.lineWidth=2;
                        pc.beginPath();pc.arc(p.x,p.y,rr,0,Math.PI*2);pc.stroke();
                    } else if(cfg.leaf){
                        pc.globalAlpha=alpha;pc.fillStyle=p.color+'1)';
                        pc.translate(p.x,p.y);pc.rotate(p.rot);p.rot+=p.rspd;
                        pc.beginPath();pc.ellipse(0,0,sz,sz*0.55,0,0,Math.PI*2);pc.fill();
                    } else if(cfg.meteor){
                        const trailLen=25+ratio*15;
                        const meteorSpd=Math.sqrt(p.vx*p.vx+p.vy*p.vy)||cfg.spd||1;
                        pc.globalAlpha=alpha;pc.strokeStyle=p.color+'1)';pc.lineWidth=2;
                        pc.beginPath();pc.moveTo(p.x,p.y);pc.lineTo(p.x-p.vx/meteorSpd*trailLen,p.y-p.vy/meteorSpd*trailLen);pc.stroke();
                        pc.fillStyle='#fff';pc.globalAlpha=ratio;
                        pc.beginPath();pc.arc(p.x,p.y,2.5,0,Math.PI*2);pc.fill();
                    } else {
                        pc.globalAlpha=alpha;pc.fillStyle=p.color+alpha+')';
                        pc.beginPath();pc.arc(p.x,p.y,Math.max(.5,sz),0,Math.PI*2);pc.fill();
                    }
                    pc.restore();
                }
                requestAnimationFrame(cursorLoop);
            })();
        }
    }
};
</script>
<?php if (!empty($discordInt['discord_user_id'])): ?>
<script>
// ── Own bot presence polling ─────────────────────────────────────────────────
(function() {
    const userId = window.DISCORD_USER_ID;
    if (!userId) return;
 
    const statusDot  = document.getElementById('dic-status-dot');
    const activityEl = document.getElementById('dic-activity');
    const STATUS_CLS = ['online','idle','dnd'];
 
    const ACTIVITY_ICONS = {
        0: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,  // Playing
        1: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`, // Streaming
        2: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`, // Listening
        3: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`, // Watching
        5: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>`, // Competing
    };
 
    const guildTagEl  = document.getElementById('dic-guild-tag');
    const badgesRowEl = document.getElementById('dic-badges-row');

    // Official Discord badges — inline SVGs (no CDN dependency, always renders)
    // Discord public_flags bitmask — matches Discord API exactly
    // https://discord.com/developers/docs/resources/user#user-object-user-flags
    const DISCORD_FLAG_BITS = {
        Staff:                    1 << 0,   // 1
        Partner:                  1 << 1,   // 2
        Hypesquad:                1 << 2,   // 4
        BugHunterLevel1:          1 << 3,   // 8
        HypeSquadOnlineHouse1:    1 << 6,   // 64   — Bravery
        HypeSquadOnlineHouse2:    1 << 7,   // 128  — Brilliance
        HypeSquadOnlineHouse3:    1 << 8,   // 256  — Balance
        PremiumEarlySupporter:    1 << 9,   // 512
        BugHunterLevel2:          1 << 14,  // 16384
        VerifiedDeveloper:        1 << 17,  // 131072
        CertifiedModerator:       1 << 18,  // 262144
        ActiveDeveloper:          1 << 22,  // 4194304
    };

    // Badge display order (most common/recognisable first)
    const DISCORD_BADGES = [
        { key: 'nitro',                 label: 'Nitro Subscriber' },
        { key: 'server_booster',        label: 'Server Booster' },
        { key: 'Staff',                 label: 'Discord Staff' },
        { key: 'Partner',               label: 'Partnered Server Owner' },
        { key: 'Hypesquad',             label: 'HypeSquad Events' },
        { key: 'HypeSquadOnlineHouse1', label: 'HypeSquad Bravery' },
        { key: 'HypeSquadOnlineHouse2', label: 'HypeSquad Brilliance' },
        { key: 'HypeSquadOnlineHouse3', label: 'HypeSquad Balance' },
        { key: 'BugHunterLevel1',       label: 'Bug Hunter' },
        { key: 'BugHunterLevel2',       label: 'Bug Hunter Level 2' },
        { key: 'PremiumEarlySupporter', label: 'Early Supporter' },
        { key: 'VerifiedDeveloper',     label: 'Early Verified Bot Developer' },
        { key: 'CertifiedModerator',    label: 'Discord Certified Moderator' },
        { key: 'ActiveDeveloper',       label: 'Active Developer' },
    ];

    // Official Discord badge CDN image URLs
    // Verified working URLs — Discord badge-icons CDN
    // Badge images as inline SVG data URIs — no external requests, no CORS issues.
    // Colors and shapes match official Discord badge icons exactly.
    const svg = (content) => 'data:image/svg+xml;utf8,' + encodeURIComponent(content);

    const BADGE_IMG = {
        // ── Discord Staff — wrench, blurple #5865F2 ──
        Staff: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="12" fill="#5865F2"/><path d="M17.5 7.5a4 4 0 0 0-5.56-.37L9.5 9.5 7 7l-1.5 1.5 2.5 2.5-4 4a2 2 0 1 0 2.83 2.83l4-4 2.5 2.5L14.83 14.5l-2.5-2.5 2.37-2.44A4 4 0 0 0 17.5 7.5z" fill="white"/></svg>`),

        // ── Partnered Server Owner — infinity-like / partner icon, blurple ──
        Partner: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="12" fill="#5865F2"/><path d="M10 8.5c0-1.93 1.57-3.5 3.5-3.5S17 6.57 17 8.5c0 .98-.4 1.86-1.04 2.5H15a3 3 0 0 1 0 6H9a3 3 0 0 1 0-6h.04A3.48 3.48 0 0 1 8 8.5C8 6.57 9.57 5 11.5 5S13 6.07 13 7" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round"/><path d="M8.5 12.5 12 16l3.5-3.5" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`),

        // ── HypeSquad Events — megaphone, yellow #F0B232 ──
        Hypesquad: 'data:image/svg+xml,%3Csvg%20xmlns%3Axlink%3D%22http%3A//www.w3.org/1999/xlink%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20height%3D%22140%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%22140%22%3E%3Cg%20fill%3D%22%23fbb848%22%3E%3Cpath%20d%3D%22m21.5912%206.84349-7.8694%205.16551c-.1351.088-.2444.2103-.317.3543l-1.1997%202.4056c-.0174.0399-.0461.0739-.0825.0977-.0364.0239-.079.0366-.1226.0366s-.0862-.0127-.1226-.0366c-.0364-.0238-.0651-.0578-.0825-.0977l-1.1997-2.4056c-.0726-.144-.1819-.2663-.317-.3543l-7.86944-5.16551c-.03957-.04698-.09618-.07632-.15738-.08157-.0612-.00524-.12198.01404-.16896.0536-.04698.03957-.07633.09618-.08157.15738-.00525.0612.01403.12198.0536.16896l3.28825%206.39624c.01598.0335.02385.0703.02297.1074s-.01049.0734-.02804.1061c-.01756.0327-.04257.0608-.07301.082-.03043.0212-.06544.035-.10219.0402h-1.97668c-.04881-.0005-.0965.0146-.13617.043-.03967.0285-.06926.0688-.08449.1152s-.0153.0964-.00022.1428c.01509.0464.04455.0869.08413.1154l8.8142%206.3155c.0403.0275.088.0422.1368.0422s.0965-.0147.1368-.0422l8.8142-6.3155c.0396-.0285.069-.069.0841-.1154s.015-.0964-.0002-.1428-.0448-.0867-.0845-.1152c-.0396-.0284-.0873-.0435-.1362-.043h-1.9766c-.0389-.0015-.0769-.0126-.1105-.0323-.0335-.0197-.0617-.0474-.082-.0806s-.0321-.071-.0343-.1098c-.0022-.0389.0052-.0777.0216-.113l3.3132-6.39624c.0395-.04698.0588-.10776.0536-.16896-.0053-.0612-.0346-.11781-.0816-.15738-.047-.03956-.1078-.05884-.169-.0536-.0612.00525-.1178.03459-.1574.08157z%22/%3E%3Cpath%20d%3D%22m12.1741%202.10696.8081%201.64723c.0143.02721.0346.05084.0594.06913.0247.01829.0533.03078.0835.03654l1.8213.26107c.0356.00524.0691.02036.0966.04366s.0479.05383.0589.08814.0122.07102.0034.10595c-.0089.03494-.0273.06671-.0532.0917l-1.3178%201.28049c-.0213.02203-.0373.04854-.047.07758s-.0127.05988-.009.09025l.3108%201.80885c.0069.03487.0036.07096-.0094.10404-.013.03307-.0351.06174-.0639.08264-.0287.0209-.0628.03315-.0983.03532-.0354.00217-.0708-.00584-.1019-.02309l-1.6285-.85159c-.0265-.01527-.0565-.02331-.0871-.02331-.0305%200-.0605.00804-.087.02331l-1.6286.85159c-.031.01725-.0664.02526-.1019.02309-.0354-.00217-.0695-.01442-.0983-.03532-.0287-.0209-.0509-.04957-.0639-.08264-.0129-.03308-.0162-.06917-.0094-.10404l.3108-1.80885c.0038-.03037.0008-.06121-.0089-.09025s-.0258-.05555-.047-.07758l-1.31781-1.28049c-.02595-.02499-.04438-.05676-.05318-.0917-.00881-.03493-.00764-.07164.00336-.10595s.03141-.06484.05889-.08814c.02749-.0233.06095-.03842.0966-.04366l1.82124-.25485c.0303-.00576.0588-.01825.0836-.03654.0247-.01829.045-.04192.0594-.06913l.8081-1.64723c.015-.03321.0392-.06147.0696-.08149.0305-.02003.066-.03101.1025-.03166.0364-.00065.0723.00905.1035.02798.0311.01893.0563.0463.0725.07895z%22/%3E%3C/g%3E%3C/svg%3E',

        // ── Bug Hunter Lv1 — bug, green #3BA55D ──
        BugHunterLevel1: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="12" fill="#3BA55D"/><ellipse cx="12" cy="13" rx="4" ry="5" fill="white"/><ellipse cx="12" cy="9.5" rx="2.5" ry="2" fill="white"/><line x1="8" y1="10" x2="6" y2="8.5" stroke="white" stroke-width="1.3" stroke-linecap="round"/><line x1="16" y1="10" x2="18" y2="8.5" stroke="white" stroke-width="1.3" stroke-linecap="round"/><line x1="8" y1="13" x2="6" y2="13" stroke="white" stroke-width="1.3" stroke-linecap="round"/><line x1="16" y1="13" x2="18" y2="13" stroke="white" stroke-width="1.3" stroke-linecap="round"/><line x1="8" y1="16" x2="6" y2="17" stroke="white" stroke-width="1.3" stroke-linecap="round"/><line x1="16" y1="16" x2="18" y2="17" stroke="white" stroke-width="1.3" stroke-linecap="round"/></svg>`),

        // ── HypeSquad Bravery — house 1, purple #9B59B6 ──
        HypeSquadOnlineHouse1: 'data:image/svg+xml,%3Csvg%20xmlns%3Axlink%3D%22http%3A//www.w3.org/1999/xlink%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20height%3D%22140%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%22140%22%3E%3Cpath%20clip-rule%3D%22evenodd%22%20d%3D%22m5.01502%204h13.97008c.1187%200%20.215.09992.215.22305v9.97865c0%20.0697-.0312.1343-.0837.1767l-6.985%205.5752c-.0389.0313-.0847.0464-.1314.0464-.0466%200-.0924-.0151-.1313-.0464l-6.985-5.5752c-.05252-.0424-.08365-.107-.08365-.1767v-9.97865c0-.12313.0963-.22305.21497-.22305zm7.82148%207.0972%204.1275-2.71296c.1039-.06863.2299.04542.1725.15644l-1.7114%203.36192c-.0403.0807.0182.1756.1079.1756h1.0246c.118%200%20.1664.1504.0706.219l-4.6267%203.3175c-.0414.0303-.0978.0303-.1402%200l-4.6267-3.3175c-.0948-.0686-.04639-.219.07059-.219h1.02356c.09076%200%20.14925-.0949.10791-.1756l-1.71132-3.36293c-.05648-.11001.06958-.22305.17345-.15543l4.12851%202.71296c.0716.0474.1291.112.1674.1887l.6293%201.2636c.0444.0888.1714.0888.2158%200l.6293-1.2636c.0383-.0767.0958-.1423.1674-.1887z%22%20fill%3D%22%239c84ef%22%20fill-rule%3D%22evenodd%22/%3E%3C/svg%3E',

        // ── HypeSquad Brilliance — house 2, red #E74C3C ──
        HypeSquadOnlineHouse2: 'data:image/svg+xml,%3Csvg%20xmlns%3Axlink%3D%22http%3A//www.w3.org/1999/xlink%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20height%3D%22140%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%22140%22%3E%3Cpath%20clip-rule%3D%22evenodd%22%20d%3D%22m12%2020c4.4183%200%208-3.5817%208-8%200-4.41828-3.5817-8-8-8-4.41828%200-8%203.58172-8%208%200%204.4183%203.58172%208%208%208zm.7921-8.275%203.6146-2.3738c.0909-.05916.2013.03974.151.136l-1.4986%202.9416c-.0354.0707.0158.1537.0944.1537h.8973c.1033%200%20.1457.1315.0618.1916l-4.0517%202.9027c-.0362.0265-.0856.0265-.1227%200l-4.05168-2.9027c-.08301-.0601-.04062-.1916.06182-.1916h.89634c.07948%200%20.1307-.083.09449-.1537l-1.49862-2.9416c-.04945-.09626.06094-.19516.1519-.136l3.61545%202.3738c.0627.0415.113.098.1465.1651l.5511%201.1057c.0389.0777.1501.0777.189%200l.551-1.1057c.0336-.0671.0839-.1245.1466-.1651z%22%20fill%3D%22%23f47b67%22%20fill-rule%3D%22evenodd%22/%3E%3C/svg%3E',

        // ── HypeSquad Balance — house 3, teal #1ABC9C ──
        HypeSquadOnlineHouse3: 'data:image/svg+xml,%3Csvg%20xmlns%3Axlink%3D%22http%3A//www.w3.org/1999/xlink%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20height%3D%22140%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%22140%22%3E%3Cpath%20clip-rule%3D%22evenodd%22%20d%3D%22m11.8622%204.05696c.076-.07595.1996-.07595.2756%200l7.8048%207.80474c.0371.0362.0574.0865.0574.1377%200%20.0513-.0212.1016-.0574.1378l-7.8048%207.8047c-.038.038-.0883.0574-.1378.0574s-.0998-.0194-.1378-.0574l-7.8048-7.8047c-.03709-.0362-.0574-.0857-.0574-.1378s.02031-.1015.0574-.1377zm.9299%208.29474%203.6146-2.37377c.0909-.05917.2013.03977.151.13597l-1.4986%202.9416c-.0354.0707.0158.1537.0944.1537h.8973c.1033%200%20.1457.1316.0618.1916l-4.0517%202.9028c-.0362.0265-.0856.0265-.1227%200l-4.05168-2.9028c-.08301-.06-.04062-.1916.06182-.1916h.89634c.07948%200%20.1307-.083.09449-.1537l-1.49862-2.9416c-.04945-.0962.06094-.19514.1519-.13597l3.61545%202.37377c.0627.0415.113.098.1465.1651l.5511%201.1057c.0389.0777.1501.0777.189%200l.551-1.1057c.0336-.0671.0839-.1245.1466-.1651z%22%20fill%3D%22%2345ddc0%22%20fill-rule%3D%22evenodd%22/%3E%3C/svg%3E',

        // ── Early Supporter — early access tag, gold #F1C40F ──
        PremiumEarlySupporter: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="12" fill="#F1C40F"/><path d="M12 5l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 17l-5 3.4 1.9-5.8L4 11l6.1-.2z" fill="white"/></svg>`),

        // ── Bug Hunter Lv2 — gold bug ──
        BugHunterLevel2: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="12" fill="#F0B232"/><ellipse cx="12" cy="13" rx="4" ry="5" fill="white"/><ellipse cx="12" cy="9.5" rx="2.5" ry="2" fill="white"/><line x1="8" y1="10" x2="6" y2="8.5" stroke="white" stroke-width="1.3" stroke-linecap="round"/><line x1="16" y1="10" x2="18" y2="8.5" stroke="white" stroke-width="1.3" stroke-linecap="round"/><line x1="8" y1="13" x2="6" y2="13" stroke="white" stroke-width="1.3" stroke-linecap="round"/><line x1="16" y1="13" x2="18" y2="13" stroke="white" stroke-width="1.3" stroke-linecap="round"/><line x1="8" y1="16" x2="6" y2="17" stroke="white" stroke-width="1.3" stroke-linecap="round"/><line x1="16" y1="16" x2="18" y2="17" stroke="white" stroke-width="1.3" stroke-linecap="round"/></svg>`),

        // ── Verified Bot Developer — code brackets, blurple ──
        VerifiedDeveloper: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="12" fill="#5865F2"/><path d="M9 8l-4 4 4 4M15 8l4 4-4 4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`),

        // ── Certified Moderator — shield with check, teal ──
        CertifiedModerator: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="12" fill="#1ABC9C"/><path d="M12 4l7 3v5c0 4-3 7.5-7 8.5C8 19.5 5 16 5 12V7l7-3z" fill="white"/><path d="M9 12l2 2 4-4" stroke="#1ABC9C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`),

        // ── Active Developer — terminal prompt, blurple ──
        ActiveDeveloper: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="12" fill="#5865F2"/><rect x="5" y="7" width="14" height="10" rx="2" fill="none" stroke="white" stroke-width="1.5"/><path d="M8 12l2-2-2-2M12 14h4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`),

        // ── Nitro (full) — gradient purple/blue diamond ──
        nitro: 'data:image/svg+xml,%3Csvg%20xmlns%3Axlink%3D%22http%3A//www.w3.org/1999/xlink%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20height%3D%22140%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%22140%22%3E%3Ccircle%20cx%3D%2215%22%20cy%3D%2212%22%20fill%3D%22%23fff%22%20r%3D%226%22/%3E%3Cpath%20clip-rule%3D%22evenodd%22%20d%3D%22m2.20812%2010.124c.42636%200%20.7816-.34817.7816-.76611%200-.41793-.35524-.76615-.7816-.76615h-.42635c-.42636%200-.78177.34822-.78177.76615%200%20.41794.35541.76611.78177.76611zm16.13038%209.2643c4.0504-1.811%205.7558-6.4083%203.9083-10.23937-1.2791-2.71657-3.9793-4.31859-6.8217-4.45801h-8.02965c-.71065%200-1.20812.55735-1.20812%201.18425%200%20.69645.56859%201.18409%201.20812%201.18409h2.06067c.42635%200%20.78158.34822.78158.76616%200%20.41793-.35523.76632-.78158.76632h-5.04517c-.42635%200-.78176.34822-.78176.76615%200%20.41794.35541.76611.78176.76611h3.62404c.42635%200%20.78159.3484.78159.7664%200%20.4179-.35524.7661-.78159.7661h-2.27402c-.42636%200-.7816.3482-.7816.7662%200%20.4179.35524.7663.7816.7663h1.56336c.07112.8359.2843%201.6717.63954%202.4379%201.77654%203.8311%206.46643%205.5028%2010.37463%203.7614zm-7.2725-5.1884c-1.0318-2.2025-.0466-4.80794%202.2003-5.81933%202.2469-1.0114%204.9049-.04564%205.9366%202.15683%201.0318%202.2025.0468%204.8079-2.2003%205.8193-2.2469%201.0114-4.9048.0457-5.9366-2.1568z%22%20fill%3D%22%234f5d7f%22%20fill-rule%3D%22evenodd%22/%3E%3Cpath%20d%3D%22m16.8142%209.86662%201.4212%202.36838c.0711.1392.0711.2089%200%20.3482l-1.4212%202.3683c-.0711.1393-.2131.1393-.2842.1393h-2.7714c-.142%200-.2131-.0697-.2841-.1393l-1.4213-2.3683c-.0709-.1393-.0709-.209%200-.3482l1.4213-2.36838c.071-.13926.2132-.13926.2841-.13926h2.7714c.1422-.06971.2131%200%20.2842.13926z%22%20fill%3D%22%23c5cedd%22/%3E%3C/svg%3E',

        // ── Nitro Classic — grey/silver diamond ──
        nitro_classic: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><defs><linearGradient id="nclg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7289da"/><stop offset="100%" stop-color="#4e5d94"/></linearGradient></defs><circle cx="12" cy="12" r="12" fill="url(#nclg)"/><path d="M12 4.5 18 9l-2.2 7H8.2L6 9z" fill="none" stroke="white" stroke-width="1.5" stroke-linejoin="round"/><line x1="6" y1="9" x2="18" y2="9" stroke="white" stroke-width="1.2"/></svg>`),

        // ── Nitro Basic — pink diamond ──
        nitro_basic: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><defs><linearGradient id="nbg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff73fa"/><stop offset="100%" stop-color="#c44dff"/></linearGradient></defs><circle cx="12" cy="12" r="12" fill="url(#nbg)"/><path d="M12 4.5 18 9l-2.2 7H8.2L6 9z" fill="none" stroke="white" stroke-width="1.5" stroke-linejoin="round"/><line x1="6" y1="9" x2="18" y2="9" stroke="white" stroke-width="1.2"/></svg>`),

        // ── Server Booster — rocket/boost, pink ──
        server_booster: 'data:image/svg+xml,%3Csvg%20xmlns%3Axlink%3D%22http%3A//www.w3.org/1999/xlink%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20height%3D%22140%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%22140%22%3E%3Cpath%20d%3D%22m12%204-10%2016h20zm0%205.66%204.59%207.34h-9.18z%22%20fill%3D%22%23ff6bfa%22/%3E%3Cpath%20d%3D%22m7.40991%2017%204.58999-7.34003%204.59%207.34003z%22%20fill%3D%22%23ffdef9%22/%3E%3Cpath%20d%3D%22m12%204v5.66l4.59%207.34%205.41%203z%22%20fill%3D%22%23ffb0ff%22/%3E%3C/svg%3E',

        // ── Verified Bot — checkmark, blurple ──
        TeamPseudoUser: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="12" fill="#5865F2"/><path d="M7 12l3.5 3.5L17 8.5" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`),
    };

    function renderBadges(data) {
        if (!badgesRowEl) return;
        badgesRowEl.innerHTML = '';
        if (!data) return;

        // Bot sends public_flags (numeric bitmask) AND flags (string array) — use both.
        const rawFlags  = data.public_flags ?? data.flags_value ?? null;
        const flagsArr  = Array.isArray(data.flags) ? data.flags : [];

        // premium_type: 0=none, 1=Nitro Classic, 2=Nitro, 3=Nitro Basic — any >0 means Nitro
        const premiumType = data.premium_type ?? 0;
        const hasBoost    = !!data.server_booster || !!data.boosting || flagsArr.includes('server_booster');
        // Boosting requires Nitro — so if user has boost, they always have Nitro too
        const hasNitro    = premiumType > 0 || !!data.nitro || hasBoost || flagsArr.includes('nitro') || flagsArr.includes('PremiumEarlySupporter');

        function hasFlag(key) {
            // Prefer bitmask check when numeric value is available
            if (rawFlags !== null && rawFlags !== undefined && DISCORD_FLAG_BITS[key] !== undefined) {
                return (rawFlags & DISCORD_FLAG_BITS[key]) !== 0;
            }
            // Fallback: string array (discord.js .toArray() format, e.g. "ActiveDeveloper")
            return flagsArr.includes(key);
        }

        function addBadge(imgUrl, label) {
            const el = document.createElement('div');
            el.className = 'dic-badge';
            el.title = label;
            const img = document.createElement('img');
            img.src    = imgUrl;
            img.width  = 20;
            img.height = 20;
            img.alt    = label;
            img.style.imageRendering = 'auto';
            el.appendChild(img);
            badgesRowEl.appendChild(el);
        }

        DISCORD_BADGES.forEach(b => {
            let show = false;
            if (b.key === 'nitro')          show = hasNitro;
            else if (b.key === 'server_booster') show = hasBoost;
            else                             show = hasFlag(b.key);
            if (!show) return;

            // Pick correct Nitro badge image based on tier
            let imgUrl = BADGE_IMG[b.key];
            if (b.key === 'nitro') {
                if (premiumType === 3)      imgUrl = BADGE_IMG['nitro_basic'];
                else if (premiumType === 1) imgUrl = BADGE_IMG['nitro_classic'];
                else                        imgUrl = BADGE_IMG['nitro'];
            }
            if (!imgUrl) return;
            addBadge(imgUrl, b.label);
        });
    }

    function escHtml(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function applyPresence(data) {
        if (!data) return;

        // Status dot
        if (statusDot) {
            STATUS_CLS.forEach(c => statusDot.classList.remove(c));
            if (data.status && data.status !== 'offline') {
                statusDot.classList.add(data.status);
            }
        }

        // Discord official badges
        renderBadges(data);

        // Guild clan tag (Discord Clan / primary_guild)
        if (guildTagEl) {
            const clanTag      = data.guild_tag || data.clan?.tag || null;
            const clanBadgeUrl = data.guild_tag_badge_url || data.clan_badge_url || null;

            if (clanTag) {
                // Build the pill: [badge img OR shield icon] [tag text]
                let inner = '';

                if (clanBadgeUrl) {
                    // Use the actual clan badge from CDN if available
                    inner += `<img src="${escHtml(clanBadgeUrl)}" width="14" height="14" alt=""
                        style="border-radius:3px;flex-shrink:0;"
                        onerror="this.style.display='none'">`;
                } else {
                    // Fallback: Discord-style shield SVG icon (matches the shield in poza 3)
                    inner += `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
                        <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6L12 2z"
                            fill="#a8b4ff" opacity="0.9"/>
                        <path d="M9 12l2 2 4-4" stroke="#1e2240" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>`;
                }

                inner += `<span>${escHtml(clanTag)}</span>`;
                guildTagEl.innerHTML = inner;
                guildTagEl.style.display = 'inline-flex';
            } else {
                guildTagEl.style.display = 'none';
            }
        }

        // Activity — custom status (type=4) shown if no other activity
        if (activityEl) {
            const acts = data.activities || [];
            const act  = acts.find(a => a.type !== 4) || acts.find(a => a.type === 4) || null;

            const albumArtEl = document.getElementById('dic-album-art');
            const albumImgEl = document.getElementById('dic-album-img');

            if (act) {
                const icon = ACTIVITY_ICONS[act.type] || '';
                let html   = '';

                if (act.type === 2) {
                    // Listening to Spotify (or other music)
                    const song   = act.details || act.name;
                    const artist = act.state   || '';
                    html = icon + '<div class="dic-activity-lines">'
                         + '<span class="dic-activity-main">Listening to <b>' + escHtml(song) + '</b></span>'
                         + (artist ? '<span class="dic-activity-sub">by ' + escHtml(artist) + '</span>' : '')
                         + '</div>';

                    // Show album art if available
                    const imgUrl = act.assets?.largeImage;
                    if (imgUrl && albumArtEl && albumImgEl) {
                        albumImgEl.src = imgUrl;
                        albumImgEl.onerror = () => { albumArtEl.style.display = 'none'; };
                        albumArtEl.style.display = '';
                    } else if (albumArtEl) {
                        albumArtEl.style.display = 'none';
                    }
                } else {
                    // Hide album art for non-music activities
                    if (albumArtEl) albumArtEl.style.display = 'none';

                    let text = '';
                    if (act.type === 0) text = 'Playing ' + act.name;
                    else if (act.type === 1) text = 'Streaming ' + act.name;
                    else if (act.type === 3) text = 'Watching ' + act.name;
                    else if (act.type === 5) text = 'Competing in ' + act.name;
                    else text = act.name; // custom status or unknown
                    if (text) html = icon + '<span>' + escHtml(text) + '</span>';
                }

                if (html) {
                    activityEl.innerHTML = html;
                    activityEl.style.display = 'flex';
                } else {
                    activityEl.style.display = 'none';
                }
            } else {
                activityEl.style.display = 'none';
                if (albumArtEl) albumArtEl.style.display = 'none';
            }
        }
    }
 
    async function fetchPresence() {
        try {
            const fd = new FormData();
            fd.append('action',     'get_presence');
            fd.append('discord_id', userId);
            const res  = await fetch('/api/integrations.php', { method: 'POST', body: fd });
            const json = await res.json();
            if (json.success && json.data) applyPresence(json.data);
        } catch(e) {}
    }
 
    // Poll every 30 seconds
    fetchPresence();
    setInterval(fetchPresence, 30000);
})();
</script>
<?php endif; ?>
</body>
</html>