<?php
// $pageTitle, $currentPage, $pageContent must be set before including this
$profile = $profile ?? getProfile($pdo, (int)$_SESSION['user_id']);
$accent  = $profile['accent_color'] ?: '#00d4ff';
$accent2 = $profile['secondary_color'] ?: '#ff00ff';
$_notifUnread = getUnreadNotifCount($pdo, (int)$_SESSION['user_id']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= SITE_NAME ?> — <?= sanitize($pageTitle ?? 'Dashboard') ?></title>
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/main.css?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/css/main.css') ?: time() ?>">
    <link rel="stylesheet" href="/assets/css/dashboard.css?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/css/dashboard.css') ?: time() ?>">
    <?php if (!empty($extraCss)): ?><link rel="stylesheet" href="<?= $extraCss ?>?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].$extraCss) ?: time() ?>"><?php endif; ?>
    <style>:root{--accent:<?= sanitize($accent) ?>;--accent2:<?= sanitize($accent2) ?>}</style>
    <?php if (!empty($extraHead)): ?><?= $extraHead ?><?php endif; ?>
    <?php if (!empty($profile['is_premium'])): ?>
    <style>
    .navbar-user-name {
        background: linear-gradient(90deg,#7a5c00 0%,#c8960c 15%,#ffd700 28%,#fff4a3 38%,#ffe566 48%,#ffd700 55%,#e8b800 65%,#fff8c0 75%,#d4a800 85%,#ffd700 92%,#a07000 100%) !important;
        background-size: 200% auto !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        color: transparent !important;
        animation: premiumChroma 3s linear infinite !important;
        filter: drop-shadow(0 0 6px rgba(255,215,0,0.55));
    }
    @keyframes premiumChroma {
        0%   { background-position: 0% center; }
        100% { background-position: 200% center; }
    }
    </style>
    <?php endif; ?>
</head>
<body class="dashboard-page">
<nav class="navbar">
    <div class="navbar-left">
        <button class="sidebar-toggle" id="sidebar-toggle" onclick="toggleSidebar()" aria-label="Toggle sidebar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="20" height="20">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
        </button>
        <a href="/dashboard" class="navbar-brand-mobile"><?= SITE_NAME ?></a>
        <div class="navbar-mobile-quickbtns">
            <button class="navbar-quickbtn" onclick="openRedeemModal()" title="Redeem Code" aria-label="Redeem Code">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
            </button>
            <a href="/<?= urlencode($profile['username']) ?>" target="_blank" class="navbar-quickbtn" title="Open Profile" aria-label="Open Profile">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
        </div>
    </div>
    <div style="display:flex;align-items:center;gap:.75rem">
        <!-- ── Notification Bell ── -->
        <div class="navbar-bell-wrap" id="navbar-bell-wrap" style="position:relative">
            <button class="navbar-bell-btn" id="navbar-bell-btn" onclick="toggleNotifPanel()" title="Notifications" aria-label="Notifications" style="position:relative;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:rgba(255,255,255,.75);transition:all .2s;flex-shrink:0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <?php if ($_notifUnread > 0): ?>
                <span id="notif-badge" class="notif-badge"><?= min($_notifUnread, 99) ?></span>
                <?php else: ?>
                <span id="notif-badge" class="notif-badge" style="display:none">0</span>
                <?php endif; ?>
            </button>
            <!-- Notification Dropdown Panel -->
            <div id="notif-panel" style="display:none;position:absolute;top:calc(100% + 10px);right:0;width:320px;background:#13131a;border:1px solid rgba(255,255,255,.1);border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.6);z-index:9998;overflow:hidden">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:.9rem 1rem .7rem;border-bottom:1px solid rgba(255,255,255,.06)">
                    <span style="font-size:.9rem;font-weight:700;color:#fff">Notifications</span>
                    <button onclick="markAllNotifsRead()" id="notif-read-all-btn" style="font-size:.72rem;color:var(--accent,#00d4ff);background:none;border:none;cursor:pointer;padding:0;opacity:.8">Mark all read</button>
                </div>
                <div id="notif-list" style="max-height:280px;overflow-y:auto">
                    <div style="text-align:center;color:rgba(255,255,255,.3);font-size:.8rem;padding:1.5rem 1rem" id="notif-empty">Loading...</div>
                </div>
                <div style="padding:.6rem 1rem;border-top:1px solid rgba(255,255,255,.06);text-align:center">
                    <span style="font-size:.72rem;color:rgba(255,255,255,.3)">Last 5 notifications</span>
                </div>
            </div>
        </div>
        <a href="/dashboard/shop" class="navbar-tokens" title="Go to Shop">
            <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15" style="color:var(--accent)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>
            <span><?= number_format(getUserTokens($pdo, (int)$_SESSION['user_id'])) ?></span>
        </a>
        <div class="navbar-user-wrap" id="navbar-user-wrap">
        <!-- dropdown menu -->
        <div class="navbar-user-menu" id="navbar-user-menu">
            <a href="/<?= urlencode($profile['username']) ?>" target="_blank" class="navbar-menu-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                My Profile
            </a>
            <a href="#" class="navbar-menu-item" onclick="openNavbarAccounts();return false;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Manage Accounts
            </a>
            <a href="/dashboard/settings" class="navbar-menu-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Settings
            </a>
            <div style="height:1px;background:rgba(255,255,255,.07);margin:.2rem 0"></div>
            <a href="/logout" class="navbar-menu-item navbar-menu-logout">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Logout
            </a>
        </div>
        <!-- trigger card -->
        <div class="navbar-user-card" id="navbar-user-card" onclick="toggleNavbarMenu()">
            <img src="/<?= sanitize($profile['avatar'] ?: 'assets/img/default-avatar.png') ?>"
                 onerror="this.src='/assets/img/default-avatar.png'"
                 class="navbar-user-avatar" alt="">
            <div class="navbar-user-info">
                <span class="navbar-user-name"><?= sanitize($profile['display_name'] ?: $profile['username']) ?></span>
                <span class="navbar-user-sub">Profile</span>
            </div>
        </div>
    </div>
    </div>
</nav>
<script>
function toggleNavbarMenu() {
    const menu = document.getElementById('navbar-user-menu');
    const isOpen = menu.style.display === 'flex';
    menu.style.display = isOpen ? 'none' : 'flex';
    menu.style.flexDirection = 'column';
}
document.addEventListener('click', function(e) {
    const card = document.getElementById('navbar-user-card');
    const menu = document.getElementById('navbar-user-menu');
    if (!menu || !card) return;
    if (!card.contains(e.target) && !menu.contains(e.target)) {
        menu.style.display = 'none';
    }
});

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar) return;
    if (window.innerWidth >= 992) {
        document.body.classList.toggle('sidebar-collapsed');
    } else {
        const isOpen = sidebar.classList.contains('sidebar-open');
        if (isOpen) {
            sidebar.classList.remove('sidebar-open');
            overlay && overlay.classList.remove('active');
            document.body.classList.remove('mobile-sidebar-open');
        } else {
            sidebar.classList.add('sidebar-open');
            overlay && overlay.classList.add('active');
            document.body.classList.add('mobile-sidebar-open');
        }
    }
}
</script>
<div class="dashboard-layout" style="padding-top:65px;">
    <?php require VIEWS_PATH . '/partials/sidebar.php'; ?>
    <main class="dashboard-main">
        <?= $pageContent ?>
    </main>
</div>
<div id="toast-container" class="toast-container"></div>

<!-- Mobile Bottom Navigation -->
<nav class="mobile-bottom-nav">
    <div class="mobile-nav-scroll">
        <?php
        $__isAdmin = function_exists('isAdmin') && isAdmin($pdo);
        $__isOwner = function_exists('isOwner') && isOwner($pdo);
        if ($__isAdmin): ?>
        <a href="/admin" class="mobile-nav-item <?= $currentPage==='admin'?'active':'' ?>">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span><?= $__isOwner ? 'Owner' : 'Admin' ?></span>
        </a>
        <?php endif; ?>
        <a href="/dashboard" class="mobile-nav-item <?= $currentPage==='dashboard-home'?'active':'' ?>">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            <span>Home</span>
        </a>
        <a href="/dashboard/links" class="mobile-nav-item <?= $currentPage==='links'?'active':'' ?>">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            <span>Links</span>
        </a>
        <a href="/dashboard/customize" class="mobile-nav-item <?= $currentPage==='profile-info'?'active':'' ?>">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Style</span>
        </a>
        <a href="/dashboard/analytics" class="mobile-nav-item <?= $currentPage==='analytics'?'active':'' ?>">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            <span>Stats</span>
        </a>
        <a href="/dashboard/badges" class="mobile-nav-item <?= $currentPage==='badges'?'active':'' ?>">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
            <span>Badges</span>
        </a>
        <a href="/dashboard/effects" class="mobile-nav-item <?= $currentPage==='effects'?'active':'' ?>">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>Effects</span>
        </a>
        <a href="/dashboard/referral" class="mobile-nav-item <?= $currentPage==='referral'?'active':'' ?>">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>Referral</span>
        </a>
        <a href="/dashboard/shop" class="mobile-nav-item <?= $currentPage==='shop'?'active':'' ?>">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            <span>Shop</span>
        </a>
    </div>
</nav>

<!-- ── Redeem Code Modal (Navbar — mobile quick action) ── -->
<div id="redeem-code-modal" onclick="if(event.target===this)closeRedeemModal()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;align-items:center;justify-content:center;backdrop-filter:blur(4px)">
    <div style="background:#13131a;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:1.5rem;width:min(360px,95vw);position:relative;box-shadow:0 24px 60px rgba(0,0,0,.5)">
        <button onclick="closeRedeemModal()" style="position:absolute;top:.9rem;right:.9rem;background:rgba(255,255,255,.06);border:none;color:#aaa;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;line-height:1">✕</button>
        <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.2rem">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2" width="20" height="20"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
            <div style="font-size:1.05rem;font-weight:700;color:#fff">Redeem Code</div>
        </div>
        <div style="font-size:.8rem;color:var(--text-muted,#888);margin-bottom:1.1rem">Enter a code to claim free tokens.</div>
        <input type="text" id="redeem-code-input" placeholder="e.g. WELCOME-2025" maxlength="40"
               style="width:100%;padding:.7rem .9rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:.9rem;outline:none;box-sizing:border-box;text-transform:uppercase;letter-spacing:.03em"
               onkeydown="if(event.key==='Enter')submitRedeemCode()">
        <button onclick="submitRedeemCode()" id="redeem-code-btn"
                style="margin-top:.85rem;width:100%;padding:.65rem 1rem;background:linear-gradient(135deg,#ec4899,#a855f7);border:none;border-radius:8px;color:#fff;font-size:.85rem;font-weight:700;cursor:pointer">
            Redeem
        </button>
        <div id="redeem-code-status" style="text-align:center;font-size:.8rem;min-height:1.2rem;margin-top:.6rem"></div>
    </div>
</div>
<script>
window.openRedeemModal = function() {
    document.getElementById('redeem-code-input').value = '';
    document.getElementById('redeem-code-status').textContent = '';
    document.getElementById('redeem-code-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('redeem-code-input').focus(), 80);
};
window.closeRedeemModal = function() {
    document.getElementById('redeem-code-modal').style.display = 'none';
};
window.submitRedeemCode = async function() {
    const code     = document.getElementById('redeem-code-input').value.trim();
    const statusEl = document.getElementById('redeem-code-status');
    const btn      = document.getElementById('redeem-code-btn');
    if (!code) { statusEl.textContent = '✗ Enter a code.'; statusEl.style.color = '#ff8080'; return; }

    btn.disabled = true; btn.style.opacity = '.6';
    statusEl.textContent = 'Checking...'; statusEl.style.color = 'rgba(255,255,255,.5)';

    try {
        const r = await fetch('/api/redeem.php', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'redeem', code })
        });
        const j = await r.json();
        if (j.success) {
            statusEl.textContent = '✓ ' + j.message; statusEl.style.color = '#34d399';
            if (typeof showToast === 'function') showToast(j.message, 'success');
            setTimeout(() => { window.location.reload(); }, 1100);
        } else {
            statusEl.textContent = '✗ ' + (j.error || 'Invalid code'); statusEl.style.color = '#ff8080';
            btn.disabled = false; btn.style.opacity = '1';
        }
    } catch(e) {
        statusEl.textContent = '✗ Network error'; statusEl.style.color = '#ff8080';
        btn.disabled = false; btn.style.opacity = '1';
    }
};
</script>

<!-- ── Manage Accounts Modal (Navbar) ── -->
<div id="navbar-accounts-modal" onclick="if(event.target===this)closeNavbarAccounts()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(4px)">
    <div style="background:#13131a;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:1.5rem;width:min(420px,95vw);max-height:80vh;overflow-y:auto;position:relative;box-shadow:0 24px 60px rgba(0,0,0,.5)">
        <button onclick="closeNavbarAccounts()" style="position:absolute;top:.9rem;right:.9rem;background:rgba(255,255,255,.06);border:none;color:#aaa;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;line-height:1">✕</button>
        <div style="font-size:1.05rem;font-weight:700;color:#fff;margin-bottom:.2rem">Manage Accounts</div>
        <div style="font-size:.8rem;color:var(--text-muted,#888);margin-bottom:1.1rem">Switch between multiple accounts</div>

        <!-- Current account -->
        <div id="nba-current-account" style="display:flex;align-items:center;gap:.75rem;padding:.65rem .75rem;background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.15);border-radius:10px;margin-bottom:.5rem">
            <div id="nba-cur-avatar" style="width:38px;height:38px;border-radius:50%;flex-shrink:0;overflow:hidden;background:rgba(0,212,255,.15);display:flex;align-items:center;justify-content:center;color:#00d4ff;font-size:.9rem;font-weight:700">
                <?php if ($profile && !empty($profile['avatar'])): ?>
                <img src="/<?= sanitize($profile['avatar']) ?>" alt="" style="width:38px;height:38px;object-fit:cover;display:block" onerror="this.style.display='none'">
                <?php else: ?>
                <?= strtoupper(substr($profile['username'] ?? 'U', 0, 1)) ?>
                <?php endif; ?>
            </div>
            <div>
                <div style="font-size:.85rem;font-weight:600;color:#fff">@<?= sanitize($profile['username'] ?? '') ?></div>
                <div style="font-size:.7rem;color:#34d399">● Active account</div>
            </div>
        </div>

        <!-- Saved accounts list -->
        <div id="navbar-saved-accounts-list"></div>

        <button onclick="openNavbarAddAccount()" style="margin-top:.75rem;width:100%;padding:.6rem 1rem;background:linear-gradient(135deg,var(--accent,#00d4ff),var(--accent2,#ff00ff));border:none;border-radius:8px;color:#fff;font-size:.82rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:.4rem">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add an account
        </button>
        <p style="font-size:.7rem;color:var(--text-muted,#666);margin-top:.55rem;text-align:center">Accounts are saved locally in your browser.</p>
    </div>
</div>

<!-- ── Add Account Modal (from Navbar) ── -->
<div id="navbar-add-account-modal" onclick="if(event.target===this)closeNavbarAddAccount()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;align-items:center;justify-content:center;backdrop-filter:blur(4px)">
    <div style="background:#13131a;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:1.5rem;width:min(380px,95vw);position:relative;box-shadow:0 24px 60px rgba(0,0,0,.5)">
        <button onclick="closeNavbarAddAccount()" style="position:absolute;top:.9rem;right:.9rem;background:rgba(255,255,255,.06);border:none;color:#aaa;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;line-height:1">✕</button>
        <div style="font-size:1.05rem;font-weight:700;color:#fff;margin-bottom:.2rem">Add Account</div>
        <div style="font-size:.8rem;color:var(--text-muted,#888);margin-bottom:1.1rem">Log in to another account. You can switch between them anytime.</div>
        <div style="display:flex;flex-direction:column;gap:.75rem">
            <input type="text" id="navbar-add-acc-login" placeholder="Username or email" style="width:100%;padding:.65rem .9rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:.85rem;outline:none;box-sizing:border-box">
            <input type="password" id="navbar-add-acc-pw" placeholder="Password" style="width:100%;padding:.65rem .9rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:.85rem;outline:none;box-sizing:border-box">
            <button onclick="navbarAddAccount()" style="width:100%;padding:.65rem 1rem;background:linear-gradient(135deg,var(--accent,#00d4ff),var(--accent2,#ff00ff));border:none;border-radius:8px;color:#fff;font-size:.85rem;font-weight:600;cursor:pointer">
                Log In & Save Account
            </button>
            <div id="navbar-status-add-account" style="text-align:center;font-size:.8rem;min-height:1rem"></div>
        </div>
    </div>
</div>

<script>
// ── Navbar Manage Accounts ────────────────────────────────────────────────────
(function() {
const NBA_KEY = 'bf_saved_accounts';
const NBA_CUR = '<?= addslashes(sanitize($profile['username'] ?? '')) ?>';

function nbaGet() {
    try { return JSON.parse(localStorage.getItem(NBA_KEY) || '[]'); } catch(e) { return []; }
}

window.openNavbarAccounts = function() {
    document.getElementById('navbar-user-menu').style.display = 'none';
    nbaRender();
    document.getElementById('navbar-accounts-modal').style.display = 'flex';
};
window.closeNavbarAccounts = function() {
    document.getElementById('navbar-accounts-modal').style.display = 'none';
};
window.openNavbarAddAccount = function() {
    document.getElementById('navbar-accounts-modal').style.display = 'none';
    document.getElementById('navbar-status-add-account').textContent = '';
    document.getElementById('navbar-add-acc-login').value = '';
    document.getElementById('navbar-add-acc-pw').value = '';
    document.getElementById('navbar-add-account-modal').style.display = 'flex';
};
window.closeNavbarAddAccount = function() {
    document.getElementById('navbar-add-account-modal').style.display = 'none';
    openNavbarAccounts();
};

function nbaRender() {
    const all = nbaGet().filter(a => a.username !== NBA_CUR);
    const el  = document.getElementById('navbar-saved-accounts-list');
    if (!el) return;
    if (!all.length) { el.innerHTML = ''; return; }
    el.innerHTML = all.map(a => {
        const avatarHtml = a.avatar
            ? `<img src="${a.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.style.display='none';this.parentElement.textContent='${a.username.charAt(0).toUpperCase()}'">` 
            : a.username.charAt(0).toUpperCase();
        const safeU = a.username.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        return `<div style="display:flex;align-items:center;gap:.75rem;padding:.65rem .75rem;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;margin-bottom:.4rem">
            <div style="width:38px;height:38px;border-radius:50%;flex-shrink:0;overflow:hidden;background:rgba(99,102,241,.15);display:flex;align-items:center;justify-content:center;color:#818cf8;font-size:.9rem;font-weight:700">${avatarHtml}</div>
            <div style="flex:1">
                <div style="font-size:.85rem;font-weight:600;color:#fff">@${a.username}</div>
                <div style="font-size:.7rem;color:var(--text-muted,#888)">Saved account</div>
            </div>
            <div style="display:flex;gap:.4rem">
                <button onclick="nbaSwitch('${safeU}')" style="padding:.3rem .7rem;border-radius:6px;border:1px solid rgba(0,212,255,.35);background:rgba(0,212,255,.08);color:#00d4ff;font-size:.75rem;cursor:pointer;font-weight:600">Switch</button>
                <button onclick="nbaRemove('${safeU}')" style="padding:.3rem .7rem;border-radius:6px;border:1px solid rgba(255,80,80,.3);background:rgba(255,80,80,.07);color:#ff8080;font-size:.75rem;cursor:pointer">Remove</button>
            </div>
        </div>`;
    }).join('');
}

window.navbarAddAccount = async function() {
    const login = document.getElementById('navbar-add-acc-login').value.trim();
    const pw    = document.getElementById('navbar-add-acc-pw').value;
    const el    = document.getElementById('navbar-status-add-account');
    if (!login || !pw) { el.textContent = '✗ Fill in all fields'; el.style.color = '#ff8080'; return; }
    el.textContent = 'Logging in...'; el.style.color = '#aaa';
    try {
        const r = await fetch('/api/settings.php', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ action:'verify_account_credentials', login, password:pw })
        });
        const j = await r.json();
        if (j.success) {
            const accounts = nbaGet();
            if (j.username === NBA_CUR || accounts.find(a => a.username === j.username)) {
                el.textContent = '✗ Account already added'; el.style.color = '#ff8080'; return;
            }
            accounts.push({ username:j.username, token:j.switch_token, avatar:j.avatar||null });
            localStorage.setItem(NBA_KEY, JSON.stringify(accounts));
            el.textContent = '✓ Account saved!'; el.style.color = '#34d399';
            setTimeout(() => closeNavbarAddAccount(), 900);
        } else {
            el.textContent = '✗ ' + (j.error||'Invalid credentials'); el.style.color = '#ff8080';
        }
    } catch(e) { el.textContent = '✗ Network error'; el.style.color = '#ff8080'; }
};

window.nbaSwitch = async function(username) {
    const accounts = nbaGet();
    let idx = accounts.findIndex(a => a.username === username);
    if (idx < 0) return;
    try {
        const me = await fetch('/api/settings.php', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'get_my_switch_token'}) });
        const mj = await me.json();
        if (mj.success) {
            const ex = accounts.findIndex(a => a.username === mj.username);
            const entry = { username:mj.username, token:mj.switch_token, avatar:mj.avatar||null };
            if (ex>=0) accounts[ex]=entry; else accounts.push(entry);
            const ni = accounts.findIndex(a => a.username === username);
            if (ni>=0) idx=ni;
        }
    } catch(e) {}
    try {
        const r = await fetch('/api/settings.php', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'switch_account', token:accounts[idx].token}) });
        const j = await r.json();
        if (j.success) {
            if (j.new_token) accounts[idx] = {...accounts[idx], token:j.new_token};
            localStorage.setItem(NBA_KEY, JSON.stringify(accounts));
            if (typeof showToast==='function') showToast('Switching to @'+username+'...','success');
            setTimeout(() => { window.location.href='/dashboard'; }, 800);
        } else {
            if (typeof showToast==='function') showToast(j.error||'Switch failed','error');
            accounts.splice(idx,1);
            localStorage.setItem(NBA_KEY, JSON.stringify(accounts));
            nbaRender();
        }
    } catch(e) { if (typeof showToast==='function') showToast('Network error','error'); }
};

window.nbaRemove = function(username) {
    const accounts = nbaGet();
    const i = accounts.findIndex(a => a.username === username);
    if (i<0) return;
    accounts.splice(i,1);
    localStorage.setItem(NBA_KEY, JSON.stringify(accounts));
    nbaRender();
};
})();
</script>

<?php if (!empty($extraJs)): ?>
<script src="<?= $extraJs ?>?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].$extraJs) ?: time() ?>"></script>
<?php else: ?>
<script src="/assets/js/dashboard.js?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/js/dashboard.js') ?: time() ?>"></script>
<?php endif; ?>

<style>
/* ── Notification Bell ────────────────────────────────────── */
.notif-badge {
    position:absolute;top:-5px;right:-5px;
    background:linear-gradient(135deg,var(--accent,#00d4ff),var(--accent2,#ff00ff));
    color:#fff;font-size:.6rem;font-weight:800;
    min-width:16px;height:16px;border-radius:99px;
    display:flex;align-items:center;justify-content:center;
    padding:0 3px;line-height:1;
    box-shadow:0 0 0 2px #0d0d14;
    pointer-events:none;
}
.navbar-bell-btn:hover { background:rgba(255,255,255,.1)!important; color:#fff!important; }
.notif-item {
    display:flex;align-items:flex-start;gap:.65rem;
    padding:.7rem 1rem;border-bottom:1px solid rgba(255,255,255,.04);
    cursor:pointer;transition:background .15s;
}
.notif-item:hover { background:rgba(255,255,255,.04); }
.notif-item.unread { background:rgba(0,212,255,.04); }
.notif-item.unread .notif-item-title { color:#fff; }
.notif-item-icon {
    width:32px;height:32px;border-radius:8px;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;font-size:.9rem;
}
.notif-item-title { font-size:.8rem;font-weight:600;color:rgba(255,255,255,.8);line-height:1.3;margin-bottom:.15rem; }
.notif-item-body  { font-size:.72rem;color:rgba(255,255,255,.45);line-height:1.35; }
.notif-item-time  { font-size:.67rem;color:rgba(255,255,255,.25);margin-top:.2rem; }
</style>

<script>
// ── Notifications ─────────────────────────────────────────────────────────
(function() {
const ICON_MAP = {
    bell:         { svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>', bg: 'rgba(0,212,255,.12)', color: '#00d4ff' },
    gift:         { svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>', bg: 'rgba(255,0,255,.12)', color: '#ff00ff' },
    eye:          { svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>', bg: 'rgba(99,102,241,.12)', color: '#818cf8' },
    trophy:       { svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="8 21 12 21 16 21"/><line x1="12" y1="17" x2="12" y2="21"/><path d="M7 4H4v7a5 5 0 0 0 5 5h6a5 5 0 0 0 5-5V4h-3"/><rect x="7" y="2" width="10" height="5" rx="1"/></svg>', bg: 'rgba(251,191,36,.12)', color: '#fbbf24' },
    badge:        { svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>', bg: 'rgba(74,222,128,.12)', color: '#4ade80' },
    users:        { svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', bg: 'rgba(52,211,153,.12)', color: '#34d399' },
    megaphone:    { svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>', bg: 'rgba(249,115,22,.12)', color: '#f97316' },
    star:         { svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>', bg: 'rgba(168,85,247,.12)', color: '#a855f7' },
};

function timeAgo(n) {
    // unix_ts is seconds since epoch UTC (set by UNIX_TIMESTAMP() in DB query with UTC connection)
    // Multiply by 1000 for JS milliseconds — browser auto-converts to visitor local timezone
    const ts = n.unix_ts ? parseInt(n.unix_ts) * 1000 : Date.parse(n.created_at.replace(' ', 'T') + 'Z');
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// Safe notif store — avoids passing objects through onclick HTML attributes
const _notifMap = {};

function renderNotifList(notifs) {
    const el = document.getElementById('notif-list');
    if (!notifs || !notifs.length) {
        el.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,.3);font-size:.8rem;padding:1.5rem 1rem">No notifications yet</div>';
        return;
    }
    notifs.forEach(n => { _notifMap[n.id] = n; });
    el.innerHTML = notifs.map(n => {
        const ico = ICON_MAP[n.icon] || ICON_MAP.bell;
        return `<div class="notif-item ${n.is_read == 0 ? 'unread' : ''}" data-id="${n.id}" onclick="openNotifModal(${n.id})">
            <div class="notif-item-icon" style="background:${ico.bg};color:${ico.color}">${ico.svg}</div>
            <div style="flex:1;min-width:0">
                <div class="notif-item-title">${escHtml(n.title)}</div>
                ${n.body ? `<div class="notif-item-body">${escHtml(n.body)}</div>` : ''}
                <div class="notif-item-time">${timeAgo(n)}</div>
            </div>
            ${n.is_read == 0 ? '<div style="width:7px;height:7px;border-radius:50%;background:var(--accent,#00d4ff);flex-shrink:0;margin-top:4px"></div>' : ''}
        </div>`;
    }).join('');
}

// ── Notification Modal ────────────────────────────────────────────────────
window.openNotifModal = function(id) {
    const n = _notifMap[id];
    if (!n) return;

    // Mark as read
    fetch('/api/notifications.php', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({action:'read_one', id: n.id})
    }).catch(()=>{});

    const ico = ICON_MAP[n.icon] || ICON_MAP.bell;
    document.getElementById('notif-modal-icon').style.background = ico.bg;
    document.getElementById('notif-modal-icon').style.color = ico.color;
    document.getElementById('notif-modal-icon').innerHTML = ico.svg;
    document.getElementById('notif-modal-title').textContent = n.title;
    document.getElementById('notif-modal-body').textContent = n.body || '';
    document.getElementById('notif-modal-body').style.display = n.body ? '' : 'none';
    document.getElementById('notif-modal-time').textContent = timeAgo(n);
    document.getElementById('notif-modal-link-btn').style.display = n.link ? '' : 'none';
    document.getElementById('notif-modal-link-btn').onclick = () => { window.location.href = n.link; };
    document.getElementById('notif-modal-delete-btn').onclick = () => deleteNotif(n.id);
    document.getElementById('notif-modal').style.display = 'flex';

    // Mark item as read in list UI
    const item = document.querySelector('.notif-item[data-id="' + n.id + '"]');
    if (item) {
        item.classList.remove('unread');
        const dot = item.querySelector('div[style*="border-radius:50%"]');
        if (dot) dot.remove();
    }
};

window.closeNotifModal = function() {
    document.getElementById('notif-modal').style.display = 'none';
    loadNotifs();
};

window.deleteNotif = async function(id) {
    try {
        await fetch('/api/notifications.php', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({action:'delete_one', id})
        });
    } catch(e){}
    closeNotifModal();
};

function escHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function updateBadge(count) {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

async function loadNotifs() {
    try {
        const r = await fetch('/api/notifications.php?action=list');
        const j = await r.json();
        if (j.success) {
            renderNotifList(j.notifications);
            updateBadge(j.unread);
        }
    } catch(e) {
        document.getElementById('notif-list').innerHTML = '<div style="text-align:center;color:rgba(255,255,255,.3);font-size:.8rem;padding:1.5rem 1rem">Could not load</div>';
    }
}

window.toggleNotifPanel = function() {
    const panel = document.getElementById('notif-panel');
    const isOpen = panel.style.display !== 'none';
    if (isOpen) {
        panel.style.display = 'none';
    } else {
        panel.style.display = 'block';
        loadNotifs();
    }
};

window.markAllNotifsRead = async function() {
    try {
        await fetch('/api/notifications.php', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({action:'read_all'})
        });
    } catch(e) {}
    updateBadge(0);
    loadNotifs();
};

// Close panel when clicking outside
document.addEventListener('click', function(e) {
    const wrap = document.getElementById('navbar-bell-wrap');
    const panel = document.getElementById('notif-panel');
    if (!wrap || !panel) return;
    if (!wrap.contains(e.target)) panel.style.display = 'none';
});

// Poll for new notifications every 60s
setInterval(async function() {
    try {
        const r = await fetch('/api/notifications.php?action=list');
        const j = await r.json();
        if (j.success) updateBadge(j.unread);
    } catch(e) {}
}, 60000);
})();
</script>
<!-- ── Notification Detail Modal ─────────────────────────────────────── -->
<div id="notif-modal" style="display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);align-items:center;justify-content:center;padding:1rem" onclick="if(event.target===this)closeNotifModal()">
    <div style="background:#13131a;border:1px solid rgba(255,255,255,.12);border-radius:18px;width:100%;max-width:380px;padding:1.5rem;box-shadow:0 30px 80px rgba(0,0,0,.7);position:relative">
        <button onclick="closeNotifModal()" style="position:absolute;top:.9rem;right:.9rem;background:rgba(255,255,255,.08);border:none;border-radius:8px;color:rgba(255,255,255,.5);cursor:pointer;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:1rem;line-height:1;transition:all .15s" onmouseover="this.style.background='rgba(255,255,255,.15)';this.style.color='#fff'" onmouseout="this.style.background='rgba(255,255,255,.08)';this.style.color='rgba(255,255,255,.5)'">✕</button>
        <div style="display:flex;align-items:center;gap:.9rem;margin-bottom:1rem">
            <div id="notif-modal-icon" style="width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
                <div id="notif-modal-title" style="font-size:.95rem;font-weight:700;color:#fff;line-height:1.3"></div>
                <div id="notif-modal-time" style="font-size:.7rem;color:rgba(255,255,255,.3);margin-top:.2rem"></div>
            </div>
        </div>
        <div id="notif-modal-body" style="font-size:.82rem;color:rgba(255,255,255,.6);line-height:1.5;margin-bottom:1.2rem;padding:.75rem 1rem;background:rgba(255,255,255,.04);border-radius:10px;border:1px solid rgba(255,255,255,.06)"></div>
        <div style="display:flex;gap:.6rem">
            <button id="notif-modal-link-btn" style="flex:1;padding:.6rem 1rem;background:var(--accent,#00d4ff);color:#000;border:none;border-radius:10px;font-size:.82rem;font-weight:700;cursor:pointer;transition:all .15s" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">View →</button>
            <button id="notif-modal-delete-btn" style="padding:.6rem 1rem;background:rgba(255,80,80,.1);color:#ff5050;border:1px solid rgba(255,80,80,.2);border-radius:10px;font-size:.82rem;font-weight:600;cursor:pointer;transition:all .15s" onmouseover="this.style.background='rgba(255,80,80,.2)'" onmouseout="this.style.background='rgba(255,80,80,.1)'">🗑 Delete</button>
        </div>
    </div>
</div>
<script>
// ── Interceptor global fetch — adaugă automat X-Requested-With la toate requesturile API ──
(function() {
    const _origFetch = window.fetch;
    window.fetch = function(input, init) {
        init = init || {};
        init.headers = init.headers || {};
        if (init.headers instanceof Headers) {
            init.headers.set('X-Requested-With', 'XMLHttpRequest');
        } else {
            init.headers['X-Requested-With'] = 'XMLHttpRequest';
        }
        return _origFetch.call(this, input, init);
    };
    const _origOpen = XMLHttpRequest.prototype.open;
    const _origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function() {
        this._url = arguments[1];
        return _origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function() {
        try { this.setRequestHeader('X-Requested-With', 'XMLHttpRequest'); } catch(e) {}
        return _origSend.apply(this, arguments);
    };
})();
</script>
</body>
</html>