<?php
requireLogin(); checkBanned($pdo);
$userId = (int)$_SESSION['user_id'];
if (!isAdmin($pdo) && !isModerator($pdo)) { http_response_code(403); die('403 Forbidden'); }

$meRow = $pdo->prepare("SELECT is_admin, is_owner, is_mod FROM users WHERE id=?");
$meRow->execute([$userId]); $me = $meRow->fetch();
$iAmOwner = (bool)$me['is_owner']; $iAmAdmin = (bool)$me['is_admin']; $iAmMod = (bool)($me['is_mod'] ?? false);

$canGrantOwner = false; $myOwnerRank = 0;
if ($iAmOwner) {
    $ownerPos = $pdo->prepare("SELECT COUNT(*)+1 FROM users WHERE is_owner=1 AND id < ?");
    $ownerPos->execute([$userId]);
    $myOwnerRank   = (int)$ownerPos->fetchColumn();
    $canGrantOwner = $myOwnerRank <= 3;
}

if (isset($_GET['msg'])) { $msg = sanitize($_GET['msg']); $msgType = sanitize($_GET['mt'] ?? 'success'); }
else { $msg = $msgType = ''; }

$profile     = getProfile($pdo, $userId);
$totalUsers     = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE email_verified=1")->fetchColumn();
$totalViews     = (int)$pdo->query("SELECT COALESCE(SUM(views),0) FROM profiles")->fetchColumn();
$totalLinks     = (int)$pdo->query("SELECT COUNT(*) FROM social_links")->fetchColumn();
$bannedCount    = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE banned=1")->fetchColumn();

// ── Whitelist state ────────────────────────────────────────────────────────
$whitelistEnabled = isWhitelistEnabled($pdo);
// ── x2 Tokens event state ─────────────────────────────────────────────────
$x2EventEnabled = false;
$settColsAdmin = $pdo->query("SHOW COLUMNS FROM site_settings")->fetchAll(PDO::FETCH_COLUMN);
if (in_array('x2_tokens_enabled', $settColsAdmin)) {
    $x2SettRow = $pdo->query("SELECT x2_tokens_enabled FROM site_settings LIMIT 1")->fetch();
    $x2EventEnabled = !empty($x2SettRow['x2_tokens_enabled']);
}
$premiumCount   = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE is_premium=1 AND (premium_expires_at IS NULL OR premium_expires_at > NOW())")->fetchColumn();
$verifiedCount  = (int)$pdo->query("SELECT COUNT(*) FROM profiles WHERE badges IS NOT NULL AND badges LIKE '%\"verified\"%'")->fetchColumn();
// tokens_spent column might not exist yet — auto-add
$cols0 = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
if (!in_array('tokens_spent', $cols0)) { $pdo->exec("ALTER TABLE users ADD COLUMN tokens_spent INT DEFAULT 0"); }
$totalTokensSpent = (int)$pdo->query("SELECT COALESCE(SUM(tokens_spent),0) FROM users")->fetchColumn();

$perPage = 10;
$page    = max(1,(int)($_GET['page'] ?? 1));
$search  = trim($_GET['q'] ?? '');
$where   = $search ? "WHERE u.email_verified=1 AND (u.username LIKE ? OR u.email LIKE ?)" : "WHERE u.email_verified=1";
$params  = $search ? ["%{$search}%","%{$search}%"] : [];

$countStmt = $pdo->prepare("SELECT COUNT(*) FROM users u {$where}");
$countStmt->execute($params);
$totalFiltered = (int)$countStmt->fetchColumn();
$totalPages    = max(1,(int)ceil($totalFiltered / $perPage));
$page          = min($page, $totalPages);
$offset        = ($page-1) * $perPage;

// Check which columns exist
$cols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
$hasBanUntil  = in_array('ban_until', $cols);
$hasTokens    = in_array('tokens', $cols);
$hasPremium   = in_array('is_premium', $cols);
$hasPremiumAt = in_array('premium_expires_at', $cols);

// Auto-add missing columns if needed
if (!$hasBanUntil)  { $pdo->exec("ALTER TABLE users ADD COLUMN ban_until DATETIME DEFAULT NULL"); $hasBanUntil = true; }
if (!$hasTokens)    { $pdo->exec("ALTER TABLE users ADD COLUMN tokens INT DEFAULT 0");            $hasTokens   = true; }
if (!$hasPremium)   { $pdo->exec("ALTER TABLE users ADD COLUMN is_premium TINYINT(1) DEFAULT 0"); $hasPremium = true; }
if (!$hasPremiumAt) { $pdo->exec("ALTER TABLE users ADD COLUMN premium_expires_at DATETIME DEFAULT NULL"); $hasPremiumAt = true; }

// Auto-add is_mod if missing
if (!in_array('is_mod', $cols)) { $pdo->exec("ALTER TABLE users ADD COLUMN is_mod TINYINT(1) DEFAULT 0"); }

// ── Bundles table setup + fetch (Owner only) ───────────────────────────────
$pdo->exec("
    CREATE TABLE IF NOT EXISTS `bundles` (
        `id`           INT AUTO_INCREMENT PRIMARY KEY,
        `name`         VARCHAR(100) NOT NULL,
        `price`        DECIMAL(8,2) NOT NULL DEFAULT 0,
        `price_type`   ENUM('euro','tokens') NOT NULL DEFAULT 'euro',
        `badges`       JSON DEFAULT NULL,
        `effects`      JSON DEFAULT NULL,
        `premium_days` INT NOT NULL DEFAULT 0,
        `created_by`   INT DEFAULT NULL,
        `created_at`   DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");
$allBundles = $iAmOwner ? $pdo->query("SELECT * FROM bundles ORDER BY created_at DESC")->fetchAll(PDO::FETCH_ASSOC) : [];

// All available effects (mirrors shop catalog)
$allEffects = [
    'cursor_smoke'     => 'Smoke Trail',
    'cursor_fire'      => 'Fire Trail',
    'cursor_soundwave' => 'Sound Wave',
    'cursor_meteors'   => 'Meteors',
    'cursor_leaves'    => 'Aesthetic Leaves',
    'cursor_water'     => 'Water Trail 3D',
    'cursor_shadow'    => 'Soul Trail',
    'avatar_rocks'     => 'Rock Ring',
    'avatar_crown'     => 'Crown 3D',
    'avatar_bloodrain' => 'Blood Rain',
    'avatar_darkeyes'  => 'Dark Eyes',
    'bg_fallingleaves' => 'Falling Leaves',
    'bg_underwater'    => 'Underwater',
    'bg_gas'           => 'Gas Effect',
    'bg_fireworks'     => 'Fireworks',
    'bg_hell'          => 'Hell Background',
    'bg_shadowworld'   => 'Shadow World',
];

$usersStmt = $pdo->prepare("
    SELECT u.id,u.username,u.email,u.is_admin,u.is_owner,COALESCE(u.is_mod,0) AS is_mod,u.banned,u.ban_until,u.created_at,u.tokens,
           COALESCE(u.is_premium,0) AS is_premium,
           u.premium_expires_at,
           COALESCE(p.views,0) AS views,
           COALESCE(p.badges,'[]') AS badges_json,
           p.avatar,
           (SELECT COUNT(*) FROM social_links sl WHERE sl.user_id=u.id) AS link_count
    FROM users u LEFT JOIN profiles p ON p.user_id=u.id
    {$where} ORDER BY u.id ASC LIMIT {$perPage} OFFSET {$offset}
");
$usersStmt->execute($params);
$users = $usersStmt->fetchAll();

// Badge manager: only these 5
$allBadges = [
    'verified'     => ['name'=>'Verified',     'color'=>'#34d399', 'icon'=>'<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>'],
    'champion'     => ['name'=>'Champion',     'color'=>'#c0c0c0', 'icon'=>'<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2L9.5 6.5 5 5l2 5H4l2.5 4h11L20 10h-3l2-5-4.5 1.5L12 2z" opacity=".9"/><rect x="7" y="19" width="10" height="2" rx="1"/><rect x="8.5" y="16" width="7" height="2.5" rx=".8"/></svg>'],
    'known'        => ['name'=>'Known',        'color'=>'#60a5fa', 'icon'=>'<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>'],
    'rich'         => ['name'=>'Rich',         'color'=>'#fbbf24', 'icon'=>'<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>'],
    'trapstar'     => ['name'=>'Trapstar',     'color'=>'#f97316', 'icon'=>'<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>'],
    'the_killer'   => ['name'=>'The Killer',  'color'=>'#ef4444', 'icon'=>'<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 2C7.58 2 4 5.58 4 10c0 2.84 1.49 5.34 3.73 6.76.18.11.27.31.27.52V19c0 1.1.9 2 2 2v-2h1.5v2h1v-2H14v2c1.1 0 2-.9 2-2v-1.72c0-.21.09-.41.27-.52C18.51 15.34 20 12.84 20 10c0-4.42-3.58-8-8-8zM9 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>'],
    'crew'         => ['name'=>'Crew',         'color'=>'#8b5cf6', 'icon'=>'<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M6.92 5L2 20l5-5h4l8-8-4-4-8 8V7.5L6.92 5zM20 2l2 2-2.5 2.5-2-2L20 2z"/></svg>'],
    'billionaire'  => ['name'=>'Billionaire',  'color'=>'#6aff99', 'icon'=>'<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>'],
    'content_creator' => ['name'=>'Content Creator', 'color'=>'#4ade80', 'icon'=>'<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/><path d="M9 3L7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9zm3 14a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/></svg>'],
    'designer'        => ['name'=>'Designer',        'color'=>'#f472b6', 'icon'=>'<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a1 1 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96a1 1 0 0 0 0-1.41z"/></svg>'],
];

$currentPage = 'admin'; $pageTitle = 'Admin Panel';
$extraCss = '/assets/css/admin.css'; $extraJs = '/assets/js/admin.js';
ob_start();
?>
<div class="admin-header">
    <div>
        <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--accent);margin-bottom:.2rem;display:flex;align-items:center;gap:.35rem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Admin</div>
        <h1 style="font-family:'Syne',sans-serif;font-size:1.5rem;font-weight:800">Admin Panel</h1>
    </div>

    <!-- ── TAB SWITCH ── -->
    <div style="margin-left:auto;display:flex;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:4px;gap:4px;flex-shrink:0">
        <button class="admin-tab-btn active" id="btn-tab-staff" onclick="switchAdminTab('staff')"
                style="display:inline-flex;align-items:center;gap:.45rem;padding:.45rem 1.25rem;border-radius:9px;font-size:.82rem;font-weight:700;border:none;cursor:pointer;transition:all .2s;color:rgba(255,255,255,.45);background:transparent;font-family:'Outfit',sans-serif">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Staff
        </button>
        <?php if ($iAmOwner): ?>
        <button class="admin-tab-btn" id="btn-tab-owner" onclick="switchAdminTab('owner')"
                style="display:inline-flex;align-items:center;gap:.45rem;padding:.45rem 1.25rem;border-radius:9px;font-size:.82rem;font-weight:700;border:none;cursor:pointer;transition:all .2s;color:rgba(255,255,255,.45);background:transparent;font-family:'Outfit',sans-serif">
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style="color:#fbbf24"><path d="M5 16L3 5l5.5 5L12 2l3.5 8L21 5l-2 11H5zm14 3H5v2h14v-2z"/></svg>
            Owner
        </button>
        <?php endif; ?>
    </div>
</div>

<?php if($msg): ?><div class="alert alert-<?= $msgType==='success'?'success':'error' ?>" style="margin-bottom:1.5rem"><?= $msg ?></div><?php endif; ?>

<!-- ═══════════════════════════════════════════
     TAB 1 — STAFF (stats + manage users)
═══════════════════════════════════════════ -->
<div id="panel-tab-staff" class="admin-tab-panel">

<div class="admin-stats">
    <div class="stat-card">
        <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
        <div class="stat-number"><?= number_format($totalUsers) ?></div>
        <div class="stat-label">Accounts Created</div>
    </div>
    <div class="stat-card">
        <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></div>
        <div class="stat-number"><?= number_format($totalViews) ?></div>
        <div class="stat-label">Total Views</div>
    </div>
    <div class="stat-card">
        <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div>
        <div class="stat-number"><?= number_format($totalLinks) ?></div>
        <div class="stat-label">Total Links</div>
    </div>
    <div class="stat-card">
        <div class="stat-icon" style="color:#a78bfa"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
        <div class="stat-number" style="color:#a78bfa"><?= number_format($totalTokensSpent) ?></div>
        <div class="stat-label">Tokens Spent</div>
    </div>
    <div class="stat-card">
        <div class="stat-icon" style="color:#ffd700"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22"><path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.25)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" opacity=".8"/></svg></div>
        <div class="stat-number" style="color:#ffd700"><?= number_format($premiumCount) ?></div>
        <div class="stat-label">Premium Subscribers</div>
    </div>
    <div class="stat-card">
        <div class="stat-icon" style="color:#34d399"><svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg></div>
        <div class="stat-number" style="color:#34d399"><?= number_format($verifiedCount) ?></div>
        <div class="stat-label">Verified Users</div>
    </div>
    <div class="stat-card">
        <div class="stat-icon" style="color:#ff6b6b"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></div>
        <div class="stat-number" style="color:#ff6b6b"><?= number_format($bannedCount) ?></div>
        <div class="stat-label">Banned Accounts</div>
    </div>
</div>

<div class="dash-card">
    <form class="search-wrap" method="get" action="/admin">
        <input type="text" name="q" value="<?= sanitize($search) ?>" placeholder="Search by username or email..." class="form-control">
        <button type="submit" class="btn btn-secondary btn-sm" style="display:inline-flex;align-items:center;gap:.4rem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Search</button>
        <?php if($search): ?><a href="/admin" class="btn btn-secondary btn-sm" style="display:inline-flex;align-items:center;gap:.4rem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Reset</a><?php endif; ?>
    </form>
    <div class="admin-table-wrap">
        <table class="admin-table">
            <thead><tr><th style="color:var(--text-muted);font-size:.75rem">ID</th><th>User</th><th>Email</th><th>Registered</th><th>Views</th><th>Links</th><th>Plan</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
            <?php if(empty($users)): ?><tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem">No users found.</td></tr><?php endif; ?>
            <?php foreach($users as $u):
                $avatarUrl  = !empty($u['avatar']) ? '/'.sanitize($u['avatar']) : '/assets/img/default-avatar.png';
                $userBadges = json_decode($u['badges_json'],true) ?: [];
                $isMe       = (int)$u['id'] === $userId;
                $isActivePremium = !empty($u['is_premium']) && (empty($u['premium_expires_at']) || strtotime($u['premium_expires_at']) > time());
                $editData   = json_encode([
                    'id'                  => (int)$u['id'],
                    'username'            => $u['username'],
                    'avatar'              => !empty($u['avatar']) ? '/'.$u['avatar'] : '/assets/img/default-avatar.png',
                    'is_admin'            => (bool)$u['is_admin'],
                    'is_owner'            => (bool)$u['is_owner'],
                    'is_mod'              => (bool)($u['is_mod'] ?? false),
                    'banned'              => (bool)$u['banned'],
                    'ban_until'           => $u['ban_until'] ?? null,
                    'badges'              => $userBadges,
                    'views'               => (int)$u['views'],
                    'links'               => (int)$u['link_count'],
                    'tokens'              => (int)($u['tokens'] ?? 0),
                    'is_premium'          => (bool)$u['is_premium'],
                    'premium_expires_at'  => $u['premium_expires_at'] ?? null,
                ]);
            ?>
            <tr data-uid="<?= (int)$u['id'] ?>">
                <td style="color:rgba(255,255,255,.3);font-size:.75rem;font-family:'Space Mono',monospace">#<?= (int)$u['id'] ?></td>
                <td><div class="user-info"><img src="<?= $avatarUrl ?>" onerror="this.src='/assets/img/default-avatar.png'" class="user-avatar-sm" alt=""><div class="user-name">@<?= sanitize($u['username']) ?></div></div></td>
                <td style="color:var(--text-muted);font-size:.8rem">—</td>
                <td style="color:var(--text-muted);font-size:.78rem;font-family:'Space Mono',monospace;white-space:nowrap"><?= date('d M Y',strtotime($u['created_at'])) ?></td>
                <td style="font-family:'Space Mono',monospace;font-size:.8rem"><?= number_format($u['views']) ?></td>
                <td style="font-family:'Space Mono',monospace;font-size:.8rem"><?= (int)$u['link_count'] ?></td>
                <td>
                    <?php if($isActivePremium): ?>
                        <span class="badge" style="background:rgba(255,215,0,.15);border:1px solid rgba(255,215,0,.4);color:#ffd700;font-size:.68rem;padding:.2rem .6rem;border-radius:20px;font-weight:800;letter-spacing:.04em;display:inline-flex;align-items:center;gap:.3rem">
                            PREMIUM
                        </span>
                    <?php else: ?>
                        <span class="badge badge-normal" style="font-size:.68rem;padding:.2rem .6rem;border-radius:20px;font-weight:700;letter-spacing:.03em;opacity:.65">FREE</span>
                    <?php endif; ?>
                </td>
                <td>
                    <?php if($u['is_owner']): ?>
                        <span class="badge badge-owner user-status-badge">Owner</span>
                    <?php elseif($u['is_admin']): ?>
                        <span class="badge badge-admin user-status-badge">Admin</span>
                    <?php elseif(!empty($u['is_mod'])): ?>
                        <span class="badge user-status-badge" style="background:rgba(168,85,247,.15);border:1px solid rgba(168,85,247,.4);color:#a855f7;font-size:.68rem;padding:.2rem .6rem;border-radius:20px;font-weight:800;letter-spacing:.04em">Mod</span>
                    <?php else: ?>
                        <span class="badge badge-normal user-status-badge">User</span>
                    <?php endif; ?>
                    <?php if($u['banned']): ?><span class="badge badge-banned">Banned</span><?php endif; ?>
                </td>
                <td>
                    <?php if($isMe && $iAmOwner): ?>
                    <div class="action-btns">
                        <a href="/<?= urlencode($u['username']) ?>" target="_blank" class="btn btn-secondary btn-xs" title="View profile" style="display:inline-flex;align-items:center"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>
                        <button class="btn btn-edit btn-xs" onclick='openEditPanel(<?= htmlspecialchars($editData,ENT_QUOTES) ?>, true)' style="display:inline-flex;align-items:center;gap:.35rem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Self</button>
                    </div>
                    <?php elseif($isMe): ?>
                    <span style="color:var(--text-muted);font-size:.78rem">You</span>
                    <?php elseif($iAmMod && ($u['is_owner'] || $u['is_admin'] || !empty($u['is_mod']))): ?>
                    <div class="action-btns">
                        <a href="/<?= urlencode($u['username']) ?>" target="_blank" class="btn btn-secondary btn-xs" title="View profile" style="display:inline-flex;align-items:center"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>
                        <span style="color:var(--text-muted);font-size:.75rem;font-style:italic">No access</span>
                    </div>
                    <?php elseif($iAmOwner && $u['is_owner']): ?>
                    <div class="action-btns">
                        <a href="/<?= urlencode($u['username']) ?>" target="_blank" class="btn btn-secondary btn-xs" title="View profile" style="display:inline-flex;align-items:center"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>
                        <button class="btn btn-edit btn-xs" onclick='openEditPanel(<?= htmlspecialchars($editData,ENT_QUOTES) ?>)' style="display:inline-flex;align-items:center;gap:.35rem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit</button>
                    </div>
                    <?php elseif($iAmAdmin && !$iAmOwner && ($u['is_owner'] || $u['is_admin'])): ?>
                    <div class="action-btns">
                        <a href="/<?= urlencode($u['username']) ?>" target="_blank" class="btn btn-secondary btn-xs" title="View profile" style="display:inline-flex;align-items:center"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>
                        <span style="color:var(--text-muted);font-size:.75rem;font-style:italic">No access</span>
                    </div>
                    <?php else: ?>
                    <div class="action-btns">
                        <a href="/<?= urlencode($u['username']) ?>" target="_blank" class="btn btn-secondary btn-xs" title="View profile" style="display:inline-flex;align-items:center"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>
                        <button class="btn btn-edit btn-xs" onclick='openEditPanel(<?= htmlspecialchars($editData,ENT_QUOTES) ?>)' style="display:inline-flex;align-items:center;gap:.35rem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit</button>
                    </div>
                    <?php endif; ?>
                </td>
            </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php if($totalPages>1): ?>
    <div class="pagination">
        <a href="/admin?page=<?= max(1,$page-1) ?>&q=<?= urlencode($search) ?>" class="page-btn <?= $page<=1?'disabled':'' ?>">← Prev</a>
        <?php for($i=max(1,$page-2);$i<=min($totalPages,$page+2);$i++): ?><a href="/admin?page=<?= $i ?>&q=<?= urlencode($search) ?>" class="page-btn <?= $i===$page?'active':'' ?>"><?= $i ?></a><?php endfor; ?>
        <a href="/admin?page=<?= min($totalPages,$page+1) ?>&q=<?= urlencode($search) ?>" class="page-btn <?= $page>=$totalPages?'disabled':'' ?>">Next →</a>
    </div>
    <?php endif; ?>
</div>

</div><!-- /panel-tab-staff -->

<!-- ═══════════════════════════════════════════
     TAB 2 — OWNER (Infected Mail, Bundles, Maintenance, x2)
     Vizibil DOAR pentru owners
═══════════════════════════════════════════ -->
<?php if ($iAmOwner): ?>
<div id="panel-tab-owner" class="admin-tab-panel" style="display:none;opacity:0">

<!-- ── Infected Mail Card ──────────────────────────────────────────────── -->
<div class="dash-card" style="margin-bottom:1.5rem;border-color:rgba(168,85,247,.35);background:linear-gradient(160deg,rgba(168,85,247,.05) 0%,rgba(99,102,241,.03) 100%)" id="infected-mail-card">
    <div class="dash-card-header" style="border-bottom:1px solid rgba(255,255,255,.06);padding-bottom:1rem;margin-bottom:1.2rem">
        <span class="dash-card-title" style="display:flex;align-items:center;gap:.6rem">
            <svg viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" width="18" height="18"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
            <span style="color:#a855f7">Infected Mail</span>
            <span style="font-size:.65rem;padding:.2rem .55rem;background:rgba(168,85,247,.15);border:1px solid rgba(168,85,247,.4);border-radius:99px;color:#a855f7;font-weight:700;letter-spacing:.05em">OWNER</span>
        </span>
        <span style="font-size:.78rem;color:rgba(255,255,255,.35)">Send an announcement notification to a group of users</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
        <div style="grid-column:1/-1">
            <label style="font-size:.75rem;color:rgba(255,255,255,.5);font-weight:600;display:block;margin-bottom:.4rem">TITLE</label>
            <input type="text" id="gfm-title" placeholder="e.g. Big Update is here!" maxlength="200"
                   style="width:100%;padding:.6rem .85rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:.85rem;outline:none;box-sizing:border-box;transition:border-color .2s"
                   onfocus="this.style.borderColor='rgba(168,85,247,.5)'" onblur="this.style.borderColor='rgba(255,255,255,.1)'">
        </div>
        <div style="grid-column:1/-1">
            <label style="font-size:.75rem;color:rgba(255,255,255,.5);font-weight:600;display:block;margin-bottom:.4rem">DESCRIPTION</label>
            <textarea id="gfm-body" placeholder="Write the announcement content here..." maxlength="500" rows="3"
                      style="width:100%;padding:.6rem .85rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:.85rem;outline:none;box-sizing:border-box;resize:vertical;font-family:inherit;transition:border-color .2s"
                      onfocus="this.style.borderColor='rgba(168,85,247,.5)'" onblur="this.style.borderColor='rgba(255,255,255,.1)'"></textarea>
        </div>
        <div>
            <label style="font-size:.75rem;color:rgba(255,255,255,.5);font-weight:600;display:block;margin-bottom:.4rem">RECIPIENT</label>
            <select id="gfm-recipient" style="width:100%;padding:.6rem .85rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:.85rem;outline:none;box-sizing:border-box;cursor:pointer;appearance:none;-webkit-appearance:none"
                    onfocus="this.style.borderColor='rgba(168,85,247,.5)'" onblur="this.style.borderColor='rgba(255,255,255,.1)'">
                <option value="all"             style="background:#13131a">🌍 Everyone</option>
                <option value="premium"         style="background:#13131a">⭐ Premium users</option>
                <option value="verified"        style="background:#13131a">✅ Verified users</option>
                <option value="content_creator" style="background:#13131a">🎬 Content Creators</option>
            </select>
        </div>
        <div>
            <label style="font-size:.75rem;color:rgba(255,255,255,.5);font-weight:600;display:block;margin-bottom:.4rem">AUTHOR</label>
            <input type="text" id="gfm-author" placeholder="e.g. Infected Team" maxlength="80" value="Infected Team"
                   style="width:100%;padding:.6rem .85rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:.85rem;outline:none;box-sizing:border-box;transition:border-color .2s"
                   onfocus="this.style.borderColor='rgba(168,85,247,.5)'" onblur="this.style.borderColor='rgba(255,255,255,.1)'">
        </div>
    </div>
    <div style="display:flex;align-items:center;gap:.75rem">
        <button onclick="sendInfectedMail()" id="gfm-send-btn"
                style="display:inline-flex;align-items:center;gap:.5rem;padding:.6rem 1.2rem;background:linear-gradient(135deg,#a855f7,#6366f1);border:none;border-radius:8px;color:#fff;font-size:.85rem;font-weight:700;cursor:pointer;transition:opacity .2s">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
            Send Announcement
        </button>
        <span id="gfm-status" style="font-size:.8rem;min-height:1.2rem"></span>
    </div>
</div>
<script>
async function sendInfectedMail() {
    const title     = document.getElementById('gfm-title').value.trim();
    const body      = document.getElementById('gfm-body').value.trim();
    const recipient = document.getElementById('gfm-recipient').value;
    const author    = document.getElementById('gfm-author').value.trim();
    const statusEl  = document.getElementById('gfm-status');
    const btn       = document.getElementById('gfm-send-btn');

    if (!title || !body) {
        statusEl.textContent = '✗ Title and description are required.';
        statusEl.style.color = '#ff8080';
        return;
    }

    btn.disabled = true;
    btn.style.opacity = '.6';
    statusEl.textContent = 'Sending...';
    statusEl.style.color = 'rgba(255,255,255,.45)';

    try {
        const r = await fetch('/api/notifications.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'infected_mail', title, body, recipient, author})
        });
        const j = await r.json();
        if (j.success) {
            statusEl.textContent = `✓ Sent to ${j.sent} user(s)!`;
            statusEl.style.color = '#4ade80';
            document.getElementById('gfm-title').value  = '';
            document.getElementById('gfm-body').value   = '';
            document.getElementById('gfm-author').value = 'Infected Team';
        } else {
            statusEl.textContent = '✗ ' + (j.error || 'Unknown error');
            statusEl.style.color = '#ff8080';
        }
    } catch(e) {
        statusEl.textContent = '✗ Network error';
        statusEl.style.color = '#ff8080';
    }
    btn.disabled = false;
    btn.style.opacity = '1';
    setTimeout(() => { statusEl.textContent = ''; }, 5000);
}
</script>

<!-- ── Bundles Card ───────────────────────────────────────────────────────── -->
<div class="dash-card" style="margin-bottom:1.5rem;border-color:rgba(16,185,129,.3);background:linear-gradient(160deg,rgba(16,185,129,.05) 0%,rgba(5,150,105,.02) 100%)" id="bundles-card">
    <div class="dash-card-header" style="border-bottom:1px solid rgba(255,255,255,.06);padding-bottom:1rem;margin-bottom:1.4rem">
        <span class="dash-card-title" style="display:flex;align-items:center;gap:.6rem">
            <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" width="18" height="18"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <span style="color:#10b981">Bundles</span>
            <span style="font-size:.65rem;padding:.2rem .55rem;background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.4);border-radius:99px;color:#10b981;font-weight:700;letter-spacing:.05em">OWNER</span>
        </span>
        <span style="font-size:.78rem;color:rgba(255,255,255,.35)">Create reward bundles and apply them to users</span>
    </div>

    <!-- CREATE BUNDLE FORM -->
    <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:1.2rem;margin-bottom:1.4rem">
        <div style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.45);margin-bottom:1rem">Create New Bundle</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.85rem;margin-bottom:.85rem">
            <div style="grid-column:1/-1">
                <label style="font-size:.72rem;color:rgba(255,255,255,.45);font-weight:600;display:block;margin-bottom:.35rem">BUNDLE NAME</label>
                <input type="text" id="b-name" placeholder="e.g. VIP Starter Pack" maxlength="100"
                       style="width:100%;padding:.6rem .85rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:.85rem;outline:none;box-sizing:border-box;transition:border-color .2s"
                       onfocus="this.style.borderColor='rgba(16,185,129,.5)'" onblur="this.style.borderColor='rgba(255,255,255,.1)'">
            </div>
            <div>
                <label style="font-size:.72rem;color:rgba(255,255,255,.45);font-weight:600;display:block;margin-bottom:.35rem">PRICE</label>
                <input type="number" id="b-price" placeholder="0.00" min="0" step="0.01"
                       style="width:100%;padding:.6rem .85rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:.85rem;outline:none;box-sizing:border-box;transition:border-color .2s"
                       onfocus="this.style.borderColor='rgba(16,185,129,.5)'" onblur="this.style.borderColor='rgba(255,255,255,.1)'">
            </div>
            <div>
                <label style="font-size:.72rem;color:rgba(255,255,255,.45);font-weight:600;display:block;margin-bottom:.35rem">CURRENCY</label>
                <select id="b-price-type"
                        style="width:100%;padding:.6rem .85rem;background:rgba(20,20,30,1);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:.85rem;outline:none;box-sizing:border-box;cursor:pointer;appearance:none"
                        onfocus="this.style.borderColor='rgba(16,185,129,.5)'" onblur="this.style.borderColor='rgba(255,255,255,.1)'">
                    <option value="euro" style="background:#13131a">€ Euro</option>
                    <option value="tokens" style="background:#13131a">🪙 Tokens</option>
                </select>
            </div>
            <div>
                <label style="font-size:.72rem;color:rgba(255,255,255,.45);font-weight:600;display:block;margin-bottom:.35rem">PREMIUM DAYS (0 = none)</label>
                <input type="number" id="b-premium-days" placeholder="0" min="0" max="9999" value="0"
                       style="width:100%;padding:.6rem .85rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:.85rem;outline:none;box-sizing:border-box;transition:border-color .2s"
                       onfocus="this.style.borderColor='rgba(16,185,129,.5)'" onblur="this.style.borderColor='rgba(255,255,255,.1)'">
            </div>
        </div>

        <div style="margin-bottom:.85rem">
            <label style="font-size:.72rem;color:rgba(255,255,255,.45);font-weight:600;display:block;margin-bottom:.5rem">BADGES (select to include)</label>
            <div style="display:flex;flex-wrap:wrap;gap:.45rem" id="b-badges-wrap">
                <?php foreach ($allBadges as $bid => $bdata): ?>
                <label style="display:inline-flex;align-items:center;gap:.35rem;padding:.35rem .7rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:8px;cursor:pointer;font-size:.78rem;color:rgba(255,255,255,.65);transition:all .15s;user-select:none"
                       onmouseover="this.style.borderColor='rgba(16,185,129,.3)'" onmouseout="bundleBadgeHover(this)">
                    <input type="checkbox" name="b_badge" value="<?= $bid ?>" style="accent-color:#10b981;width:13px;height:13px">
                    <span style="color:<?= $bdata['color'] ?>"><?= $bdata['icon'] ?></span>
                    <?= $bdata['name'] ?>
                </label>
                <?php endforeach; ?>
            </div>
        </div>

        <div style="margin-bottom:1rem">
            <label style="font-size:.72rem;color:rgba(255,255,255,.45);font-weight:600;display:block;margin-bottom:.5rem">EFFECTS (select to include)</label>
            <div style="display:flex;flex-wrap:wrap;gap:.45rem">
                <?php foreach ($allEffects as $eid => $ename): ?>
                <label style="display:inline-flex;align-items:center;gap:.35rem;padding:.35rem .7rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:8px;cursor:pointer;font-size:.78rem;color:rgba(255,255,255,.65);transition:all .15s;user-select:none"
                       onmouseover="this.style.borderColor='rgba(99,102,241,.4)'" onmouseout="this.style.borderColor='rgba(255,255,255,.09)'">
                    <input type="checkbox" name="b_effect" value="<?= $eid ?>" style="accent-color:#6366f1;width:13px;height:13px">
                    <span style="font-size:.65rem;padding:.1rem .4rem;background:rgba(99,102,241,.15);border-radius:4px;color:#a5b4fc;font-weight:600">
                        <?= strpos($eid,'cursor_')===0 ? 'cursor' : (strpos($eid,'avatar_')===0 ? 'avatar' : 'bg') ?>
                    </span>
                    <?= $ename ?>
                </label>
                <?php endforeach; ?>
            </div>
        </div>

        <div style="display:flex;align-items:center;gap:.75rem">
            <button onclick="bundleCreate()" id="b-create-btn"
                    style="display:inline-flex;align-items:center;gap:.5rem;padding:.6rem 1.2rem;background:linear-gradient(135deg,#10b981,#059669);border:none;border-radius:8px;color:#fff;font-size:.85rem;font-weight:700;cursor:pointer;transition:opacity .2s">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Create Bundle
            </button>
            <span id="b-create-status" style="font-size:.8rem;min-height:1.2rem"></span>
        </div>
    </div>

    <div id="bundles-list">
        <?php if (empty($allBundles)): ?>
        <div style="text-align:center;padding:1.5rem;color:rgba(255,255,255,.3);font-size:.82rem" id="bundles-empty-msg">
            No bundles created yet. Create one above.
        </div>
        <?php else: ?>
        <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.35);margin-bottom:.75rem">
            <?= count($allBundles) ?> bundle(s) created
        </div>
        <div style="display:flex;flex-direction:column;gap:.65rem" id="bundles-items-wrap">
        <?php foreach ($allBundles as $bn): ?>
            <?php
                $bnBadges  = json_decode($bn['badges']  ?? '[]', true) ?: [];
                $bnEffects = json_decode($bn['effects'] ?? '[]', true) ?: [];
                $bnPriceStr = $bn['price_type'] === 'euro' ? '€'.number_format((float)$bn['price'],2) : number_format((float)$bn['price'],0).' tokens';
            ?>
            <div class="bundle-row" data-bundle-id="<?= (int)$bn['id'] ?>"
                 style="display:flex;align-items:center;gap:1rem;padding:.85rem 1rem;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;flex-wrap:wrap">
                <div style="flex:1;min-width:180px">
                    <div style="font-weight:700;font-size:.9rem;color:#fff;margin-bottom:.25rem"><?= sanitize($bn['name']) ?></div>
                    <div style="font-size:.75rem;color:rgba(255,255,255,.45);display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
                        <span style="background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3);border-radius:6px;padding:.1rem .45rem;color:#10b981;font-weight:700"><?= $bnPriceStr ?></span>
                        <?php if ($bn['premium_days'] > 0): ?>
                        <span style="background:rgba(255,215,0,.1);border:1px solid rgba(255,215,0,.3);border-radius:6px;padding:.1rem .45rem;color:#ffd700;font-weight:600">⭐ <?= (int)$bn['premium_days'] ?>d Premium</span>
                        <?php endif; ?>
                        <?php foreach ($bnBadges as $b): ?>
                        <span style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);border-radius:6px;padding:.1rem .45rem;color:#fbbf24;font-size:.7rem">🏅 <?= sanitize($b) ?></span>
                        <?php endforeach; ?>
                        <?php foreach ($bnEffects as $e): ?>
                        <span style="background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);border-radius:6px;padding:.1rem .45rem;color:#a5b4fc;font-size:.7rem">✨ <?= sanitize($e) ?></span>
                        <?php endforeach; ?>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:.5rem;flex-shrink:0">
                    <button onclick="bundleDelete(<?= (int)$bn['id'] ?>, this)"
                            style="display:inline-flex;align-items:center;gap:.4rem;padding:.45rem .75rem;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:8px;color:#ef4444;font-size:.78rem;font-weight:600;cursor:pointer;transition:all .15s"
                            onmouseover="this.style.background='rgba(239,68,68,.18)'" onmouseout="this.style.background='rgba(239,68,68,.08)'">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                    </button>
                </div>
            </div>
        <?php endforeach; ?>
        </div>
        <?php endif; ?>
    </div>
</div>

<!-- Apply Bundle Modal -->
<div id="bundle-apply-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);z-index:9999;align-items:center;justify-content:center">
    <div style="background:#13131a;border:1px solid rgba(16,185,129,.3);border-radius:16px;padding:1.6rem;width:min(420px,92vw);box-shadow:0 20px 60px rgba(0,0,0,.6)">
        <div style="font-size:1rem;font-weight:800;font-family:'Syne',sans-serif;color:#fff;margin-bottom:.35rem">Apply Bundle</div>
        <div style="font-size:.8rem;color:rgba(255,255,255,.45);margin-bottom:1.2rem">
            Applying: <strong id="bam-bundle-name" style="color:#10b981"></strong>
        </div>
        <label style="font-size:.72rem;color:rgba(255,255,255,.45);font-weight:700;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:.4rem">USERNAME OR USER ID</label>
        <input type="text" id="bam-target" placeholder="@username or #1234"
               style="width:100%;padding:.65rem .9rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:.88rem;outline:none;box-sizing:border-box;transition:border-color .2s;margin-bottom:.85rem"
               onfocus="this.style.borderColor='rgba(16,185,129,.5)'" onblur="this.style.borderColor='rgba(255,255,255,.1)'"
               onkeydown="if(event.key==='Enter')bundleApplyConfirm()">
        <div style="display:flex;gap:.75rem;justify-content:flex-end">
            <button onclick="bundleApplyClose()"
                    style="padding:.55rem 1.1rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:rgba(255,255,255,.7);font-size:.82rem;font-weight:600;cursor:pointer">
                Cancel
            </button>
            <button onclick="bundleApplyConfirm()" id="bam-apply-btn"
                    style="display:inline-flex;align-items:center;gap:.4rem;padding:.55rem 1.2rem;background:linear-gradient(135deg,#10b981,#059669);border:none;border-radius:8px;color:#fff;font-size:.82rem;font-weight:700;cursor:pointer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
                Apply Bundle
            </button>
        </div>
        <div id="bam-status" style="font-size:.78rem;min-height:1rem;margin-top:.6rem;text-align:center"></div>
    </div>
</div>

<!-- ── Whitelist / Maintenance Card ─────────────────────────────────────── -->
<div class="dash-card" style="margin-bottom:1.5rem;border-color:<?= $whitelistEnabled ? 'rgba(255,100,100,.3)' : 'rgba(255,255,255,.07)' ?>;transition:border-color .3s" id="whitelist-card">
    <div class="dash-card-header" style="border-bottom:1px solid rgba(255,255,255,.06);padding-bottom:1rem;margin-bottom:1.2rem">
        <span class="dash-card-title" style="display:flex;align-items:center;gap:.6rem">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Whitelist / Maintenance
        </span>
        <span style="font-size:.75rem;color:rgba(255,255,255,.3);font-weight:400">Owner only</span>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:1.5rem;flex-wrap:wrap">
        <div>
            <div style="font-size:.9rem;font-weight:700;margin-bottom:.3rem;color:#fff;display:flex;align-items:center;gap:.4rem">
                Site Status:
                <span id="wl-status-label" style="display:inline-flex;align-items:center;gap:.35rem;color:<?= $whitelistEnabled ? '#ff6b6b' : '#4ade80' ?>">
                    <?php if ($whitelistEnabled): ?>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        Maintenance Mode ON
                    <?php else: ?>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
                        Normal &mdash; Site Open
                    <?php endif; ?>
                </span>
            </div>
            <div style="font-size:.78rem;color:rgba(255,255,255,.38);line-height:1.55">
                When <strong style="color:rgba(255,255,255,.6)">ON</strong>: only Moderators, Admins and Owners can access the site.<br>
                All other visitors see the Maintenance page. Bans are <em>not</em> affected.
            </div>
        </div>
        <button id="wl-toggle-btn"
            data-state="<?= $whitelistEnabled ? 'on' : 'off' ?>"
            onclick="toggleWhitelist()"
            style="flex-shrink:0;display:inline-flex;align-items:center;gap:.45rem;padding:.65rem 1.4rem;border-radius:10px;font-size:.82rem;font-weight:700;cursor:pointer;border:1px solid;transition:all .2s;
                   background:<?= $whitelistEnabled ? 'rgba(74,222,128,.12)' : 'rgba(239,68,68,.12)' ?>;
                   color:<?= $whitelistEnabled ? '#4ade80' : '#ef4444' ?>;
                   border-color:<?= $whitelistEnabled ? 'rgba(74,222,128,.35)' : 'rgba(239,68,68,.35)' ?>">
            <?php if ($whitelistEnabled): ?>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
                Disable Maintenance
            <?php else: ?>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Enable Maintenance
            <?php endif; ?>
        </button>
    </div>
</div>

<!-- ── x2 Tokens Event Card ────────────────────────────────────────────────── -->
<div class="dash-card" style="margin-bottom:1.5rem;border-color:<?= $x2EventEnabled ? 'rgba(255,140,0,.5)' : 'rgba(255,255,255,.07)' ?>;transition:border-color .3s;background:<?= $x2EventEnabled ? 'linear-gradient(160deg,rgba(255,100,0,.07) 0%,rgba(255,140,0,.03) 100%)' : '' ?>" id="x2-card">
    <div class="dash-card-header" style="border-bottom:1px solid rgba(255,255,255,.06);padding-bottom:1rem;margin-bottom:1.2rem">
        <span class="dash-card-title" style="display:flex;align-items:center;gap:.6rem">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="color:#ff9900"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
            x2 Tokens Event
        </span>
        <span style="font-size:.75rem;color:rgba(255,255,255,.3);font-weight:400">Owner only</span>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:1.5rem;flex-wrap:wrap">
        <div>
            <div style="font-size:.9rem;font-weight:700;margin-bottom:.3rem;color:#fff;display:flex;align-items:center;gap:.4rem">
                Status eveniment:
                <span id="x2-status-label" style="color:<?= $x2EventEnabled ? '#ff9900' : 'rgba(255,255,255,.4)' ?>">
                    <?= $x2EventEnabled ? '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style="color:#ff9900;vertical-align:-2px"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg> ACTIVE — x2 Tokens for everyone' : 'Inactive' ?>
                </span>
            </div>
            <div style="font-size:.78rem;color:rgba(255,255,255,.38);line-height:1.55">
                When <strong style="color:rgba(255,255,255,.6)">ACTIVE</strong>: all users receive <strong style="color:#ff9900">double tokens</strong> on pack purchases, profile views and referrals.<br>
                Deactivate the event to return to normal token rates.
            </div>
        </div>
        <button id="x2-toggle-btn"
            data-state="<?= $x2EventEnabled ? 'on' : 'off' ?>"
            onclick="toggleX2Tokens()"
            style="flex-shrink:0;display:inline-flex;align-items:center;gap:.45rem;padding:.65rem 1.4rem;border-radius:10px;font-size:.82rem;font-weight:700;cursor:pointer;border:1px solid;transition:all .2s;
                   background:<?= $x2EventEnabled ? 'rgba(74,222,128,.12)' : 'rgba(255,140,0,.12)' ?>;
                   color:<?= $x2EventEnabled ? '#4ade80' : '#ff9900' ?>;
                   border-color:<?= $x2EventEnabled ? 'rgba(74,222,128,.35)' : 'rgba(255,140,0,.35)' ?>">
            <?php if ($x2EventEnabled): ?>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
                Deactivate x2 Tokens
            <?php else: ?>
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
                Activate x2 Tokens
            <?php endif; ?>
        </button>
    </div>
</div>

</div><!-- /panel-tab-owner -->
<?php endif; ?>

<!-- ═══ EDIT PANEL ═══ -->
<div class="ep-overlay" id="ep-overlay" onclick="closeEditPanel()"></div>
<div class="ep-panel" id="ep-panel">
    <div class="ep-topbar">
        <div class="ep-user-row">
            <img id="ep-avatar" src="" alt="" class="ep-avatar" onerror="this.src='/assets/img/default-avatar.png'">
            <div class="ep-user-meta">
                <div class="ep-username" id="ep-username"></div>
                <div class="ep-email"    id="ep-email"></div>
            </div>
            <div id="ep-role-badge"></div>
        </div>
        <div class="ep-quick-stats" id="ep-quick-stats"></div>
        <button class="ep-close-btn" onclick="closeEditPanel()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
    </div>

    <div class="ep-body">

        <!-- ── BAN ── -->
        <div class="ep-section" id="ep-section-ban">
            <div class="ep-section-head">
                <div class="ep-section-ico" style="background:rgba(239,68,68,.12);color:#ef4444">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                </div>
                <div>
                    <div class="ep-section-title">Ban user</div>
                    <div class="ep-section-sub">Restricts access until manually lifted</div>
                </div>
            </div>

            <div id="ep-ban-ui">
                <p style="font-size:.78rem;color:rgba(255,255,255,.45);margin:0 0 .75rem">Choose ban type:</p>
                <div style="display:flex;gap:1.25rem;margin-bottom:.9rem">
                    <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-size:.83rem;font-weight:600;color:#fff;user-select:none">
                        <input type="radio" name="ep-ban-type" value="permanent" checked
                            style="width:15px;height:15px;accent-color:#ef4444;cursor:pointer"
                            onchange="document.getElementById('ep-ban-days-wrap').style.display='none'">
                        Permanent
                    </label>
                    <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-size:.83rem;font-weight:600;color:#fff;user-select:none">
                        <input type="radio" name="ep-ban-type" value="temporary"
                            style="width:15px;height:15px;accent-color:#ef4444;cursor:pointer"
                            onchange="document.getElementById('ep-ban-days-wrap').style.display='block';document.getElementById('ep-ban-days').focus()">
                        Temporary
                    </label>
                </div>
                <div id="ep-ban-days-wrap" style="display:none;margin-bottom:.9rem">
                    <input type="number" id="ep-ban-days" min="1" max="3650" placeholder="Number of days (e.g. 7)"
                        style="width:100%;padding:.55rem .9rem;font-size:.85rem;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid rgba(239,68,68,.35);color:#fff;outline:none;box-sizing:border-box"
                        onfocus="this.style.borderColor='rgba(239,68,68,.8)'" onblur="this.style.borderColor='rgba(239,68,68,.35)'">
                </div>
                <button onclick="epDoBan()"
                    style="display:inline-flex;align-items:center;gap:.5rem;padding:.55rem 1.35rem;border-radius:10px;font-size:.82rem;font-weight:700;cursor:pointer;border:1px solid rgba(239,68,68,.45);background:rgba(239,68,68,.18);color:#ff8080;transition:all .2s"
                    onmouseover="this.style.background='rgba(239,68,68,.32)';this.style.transform='translateY(-1px)'"
                    onmouseout="this.style.background='rgba(239,68,68,.18)';this.style.transform=''">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    Ban
                </button>
            </div>

            <div id="ep-unban-ui" style="display:none">
                <div style="display:flex;align-items:center;gap:.6rem;padding:.6rem .9rem;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.22);border-radius:10px;margin-bottom:.9rem">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#ff8080" stroke-width="2" width="15" height="15" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    <span id="ep-ban-info-text" style="font-size:.8rem;color:#ff8080;font-weight:600"></span>
                </div>
                <button onclick="epDoUnban()"
                    style="display:inline-flex;align-items:center;gap:.5rem;padding:.55rem 1.35rem;border-radius:10px;font-size:.82rem;font-weight:700;cursor:pointer;border:1px solid rgba(95,239,165,.3);background:rgba(95,239,165,.12);color:#5fefa5;transition:all .2s"
                    onmouseover="this.style.background='rgba(95,239,165,.25)';this.style.transform='translateY(-1px)'"
                    onmouseout="this.style.background='rgba(95,239,165,.12)';this.style.transform=''">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><path d="M20 6L9 17l-5-5"/></svg>
                    Unban
                </button>
            </div>
        </div>

        <?php if(!$iAmMod): ?>
        <div class="ep-section" id="ep-section-delete">
            <div class="ep-section-head">
                <div class="ep-section-ico" style="background:rgba(239,68,68,.1);color:#ff6b6b">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </div>
                <div>
                    <div class="ep-section-title">Delete account</div>
                    <div class="ep-section-sub">Permanent — all data is removed</div>
                </div>
            </div>
            <div class="ep-section-act">
                <button class="btn btn-danger btn-sm" onclick="epDoDelete()" style="display:inline-flex;align-items:center;gap:.4rem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg> Delete permanently</button>
            </div>
        </div>
        <?php endif; ?>

        <?php if($iAmOwner): ?>

        <!-- ── BADGE MANAGER ── -->
        <div class="ep-section">
            <div class="ep-section-head">
                <div class="ep-section-ico" style="background:rgba(251,191,36,.1);color:#fbbf24">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.09 6.26L21 9.27l-5 4.87 1.18 6.88L12 17.77l-5.18 3.25L8 14.14 3 9.27l6.91-1.01L12 2z"/></svg>
                </div>
                <div>
                    <div class="ep-section-title">Badge Manager</div>
                    <div class="ep-section-sub">Grant or revoke badges</div>
                </div>
                <span class="ep-owner-tag">Owner</span>
            </div>
            <div class="ep-badges-grid" id="ep-badges-grid">
                <?php foreach($allBadges as $bid => $b): ?>
                <div class="ep-badge-row" id="epbr-<?= $bid ?>">
                    <div class="ep-badge-ico" style="background:<?= $b['color'] ?>22;color:<?= $b['color'] ?>;border:1px solid <?= $b['color'] ?>44;width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                        <?= $b['icon'] ?>
                    </div>
                    <span class="ep-badge-nm" style="color:<?= $b['color'] ?>"><?= $b['name'] ?></span>
                    <div class="ep-badge-acts">
                        <button class="ep-b-grant" onclick="epBadge('<?= $bid ?>',true)">Grant</button>
                        <button class="ep-b-revoke" onclick="epBadge('<?= $bid ?>',false)">Revoke</button>
                    </div>
                    <div class="ep-badge-owned" id="epbs-<?= $bid ?>" style="display:none">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14" style="color:#5fefa5"><path d="M20 6L9 17l-5-5"/></svg>
                        <span>Owned</span>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>

        <!-- ── SET TOKENS ── -->
        <div class="ep-section">
            <div class="ep-section-head">
                <div class="ep-section-ico" style="background:rgba(0,212,255,.1);color:var(--accent)">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>
                </div>
                <div>
                    <div class="ep-section-title">Set Tokens</div>
                    <div class="ep-section-sub">Set token balance for this user</div>
                </div>
                <span class="ep-owner-tag">Owner</span>
            </div>
            <div style="display:flex;gap:.65rem;align-items:center;margin-top:.25rem">
                <input type="number" id="ep-tokens-input" min="0" max="999999" placeholder="Token amount"
                    style="flex:1;padding:.52rem .85rem;font-size:.85rem;border-radius:10px;background:rgba(0,212,255,.04);border:1px solid rgba(0,212,255,.25);color:#fff;outline:none;transition:border-color .2s"
                    onfocus="this.style.borderColor='rgba(0,212,255,.7)'" onblur="this.style.borderColor='rgba(0,212,255,.25)'">
                <button onclick="epSetTokens()"
                    style="padding:.52rem 1.1rem;border-radius:10px;font-size:.82rem;font-weight:700;cursor:pointer;border:1px solid rgba(0,212,255,.35);background:rgba(0,212,255,.1);color:var(--accent);transition:all .2s;white-space:nowrap"
                    onmouseover="this.style.background='rgba(0,212,255,.2)'" onmouseout="this.style.background='rgba(0,212,255,.1)'">
                    Set tokens
                </button>
            </div>
            <p style="font-size:.75rem;color:rgba(255,255,255,.3);margin-top:.55rem" id="ep-tokens-current"></p>
        </div>

        <!-- ── SET PREMIUM ── -->
        <div class="ep-section">
            <div class="ep-section-head">
                <div class="ep-section-ico" style="background:rgba(255,215,0,.1);color:#ffd700">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2L9.5 8.5H3l5.5 4L6 19l6-4 6 4-2.5-6.5L21 8.5h-6.5L12 2z"/></svg>
                </div>
                <div>
                    <div class="ep-section-title">Set Premium</div>
                    <div class="ep-section-sub">Grant or revoke Premium for this user</div>
                </div>
                <span class="ep-owner-tag">Owner</span>
            </div>

            <div id="ep-premium-status" style="display:flex;align-items:center;gap:.6rem;padding:.55rem .9rem;border-radius:10px;margin-bottom:.85rem;font-size:.8rem;font-weight:600"></div>

            <div id="ep-premium-grant-ui">
                <p style="font-size:.78rem;color:rgba(255,255,255,.4);margin:0 0 .6rem">Duration (days):</p>
                <div style="display:flex;gap:.65rem;align-items:center;margin-bottom:.65rem">
                    <input type="number" id="ep-premium-days" min="1" max="3650" value="30" placeholder="Days (e.g. 30)"
                        style="flex:1;padding:.52rem .85rem;font-size:.85rem;border-radius:10px;background:rgba(255,215,0,.04);border:1px solid rgba(255,215,0,.25);color:#fff;outline:none;transition:border-color .2s;box-sizing:border-box"
                        onfocus="this.style.borderColor='rgba(255,215,0,.7)'" onblur="this.style.borderColor='rgba(255,215,0,.25)'">
                    <button onclick="epGrantPremium()"
                        style="padding:.52rem 1.2rem;border-radius:10px;font-size:.82rem;font-weight:800;cursor:pointer;border:1px solid rgba(255,215,0,.4);background:linear-gradient(135deg,rgba(255,185,0,.2),rgba(255,215,0,.12));color:#ffd700;transition:all .2s;white-space:nowrap;display:inline-flex;align-items:center;gap:.4rem"
                        onmouseover="this.style.background='rgba(255,185,0,.3)'" onmouseout="this.style.background='linear-gradient(135deg,rgba(255,185,0,.2),rgba(255,215,0,.12))'">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2L9.5 8.5H3l5.5 4L6 19l6-4 6 4-2.5-6.5L21 8.5h-6.5L12 2z"/></svg> Grant Premium
                    </button>
                </div>
                <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.3rem">
                    <?php foreach([7,30,90,180,365] as $d): ?>
                    <span onclick="document.getElementById('ep-premium-days').value=<?= $d ?>"
                        style="padding:.22rem .65rem;border-radius:20px;font-size:.72rem;font-weight:700;border:1px solid rgba(255,215,0,.2);background:rgba(255,215,0,.05);color:rgba(255,215,0,.6);cursor:pointer;transition:all .15s"
                        onmouseover="this.style.background='rgba(255,215,0,.15)';this.style.color='#ffd700'"
                        onmouseout="this.style.background='rgba(255,215,0,.05)';this.style.color='rgba(255,215,0,.6)'"><?= $d ?>d</span>
                    <?php endforeach; ?>
                </div>
            </div>

            <div id="ep-premium-revoke-ui" style="display:none;margin-top:.6rem">
                <button onclick="epRevokePremium()"
                    style="display:inline-flex;align-items:center;gap:.5rem;padding:.52rem 1.2rem;border-radius:10px;font-size:.82rem;font-weight:700;cursor:pointer;border:1px solid rgba(239,68,68,.35);background:rgba(239,68,68,.1);color:#ff8080;transition:all .2s"
                    onmouseover="this.style.background='rgba(239,68,68,.22)';this.style.transform='translateY(-1px)'"
                    onmouseout="this.style.background='rgba(239,68,68,.1)';this.style.transform=''">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    Revoke Premium
                </button>
            </div>
        </div>

        <!-- ── MANAGE ROLE ── -->
        <div class="ep-section" id="ep-section-role">
            <div class="ep-section-head">
                <div class="ep-section-ico" style="background:rgba(0,212,255,.1);color:var(--accent)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div>
                    <div class="ep-section-title">Manage Role</div>
                    <div class="ep-section-sub">Set the access level for this account</div>
                </div>
                <span class="ep-owner-tag">Owner</span>
            </div>
            <div class="ep-role-row" id="ep-role-row">
                <!-- Filled dynamically by JS -->
            </div>
            <p class="ep-role-note">
                <?= $canGrantOwner
                    ? "You are owner #{$myOwnerRank} — you can promote to Owner."
                    : "Only the first 3 owners can assign the Owner role." ?>
            </p>
        </div>
        <?php endif; ?>

    </div><!-- /ep-body -->
</div><!-- /ep-panel -->

<!-- Confirm modal -->
<div class="confirm-modal" id="confirm-modal">
    <div class="confirm-box">
        <h3 id="confirm-title">Confirm</h3>
        <p id="confirm-text">Are you sure?</p>
        <div class="confirm-actions">
            <button class="btn btn-secondary" onclick="closeConfirm()">Cancel</button>
            <button class="btn btn-danger" id="confirm-btn" onclick="doConfirm()">Confirm</button>
        </div>
    </div>
</div>

<style>
/* ── Admin Tab Switch ── */
.admin-tab-btn {
    display: inline-flex;
    align-items: center;
    gap: .45rem;
    padding: .45rem 1.25rem;
    border-radius: 9px;
    font-size: .82rem;
    font-weight: 700;
    border: none;
    cursor: pointer;
    transition: all .2s;
    color: rgba(255,255,255,.45);
    background: transparent;
    font-family: 'Outfit', sans-serif;
}
.admin-tab-btn.active {
    background: linear-gradient(135deg, var(--accent), #0099bb);
    color: #000;
    box-shadow: 0 2px 12px rgba(0,212,255,.35);
}
.admin-tab-btn:not(.active):hover {
    color: #fff;
    background: rgba(255,255,255,.08);
}
.admin-tab-panel {
    transition: opacity .3s ease;
}
/* Owner tab button special color when active */
#btn-tab-owner.active {
    background: linear-gradient(135deg, #a855f7, #6366f1);
    color: #fff;
    box-shadow: 0 2px 12px rgba(168,85,247,.35);
}
</style>

<script>
window.EP_IS_MOD          = <?= $iAmMod?'true':'false' ?>;
window.EP_IS_OWNER        = <?= $iAmOwner?'true':'false' ?>;
window.EP_IS_ADMIN        = <?= $iAmAdmin?'true':'false' ?>;
window.EP_CAN_GRANT_OWNER = <?= $canGrantOwner?'true':'false' ?>;
window.EP_CURRENT_PAGE    = <?= $page ?>;
window.EP_ALL_BADGES      = <?= json_encode($allBadges) ?>;
window._bundleApplyId     = 0;

// ── Tab switching ──────────────────────────────────────────────────────────
var _activeAdminTab = 'staff';

function switchAdminTab(tab) {
    if (tab === _activeAdminTab) return;

    var fromPanel = document.getElementById('panel-tab-' + _activeAdminTab);
    var toPanel   = document.getElementById('panel-tab-' + tab);
    if (!toPanel) return;

    // Deactivate old button
    var fromBtn = document.getElementById('btn-tab-' + _activeAdminTab);
    var toBtn   = document.getElementById('btn-tab-' + tab);
    if (fromBtn) fromBtn.classList.remove('active');
    if (toBtn)   toBtn.classList.add('active');

    // Fade out → switch → fade in
    fromPanel.style.opacity = '0';
    setTimeout(function() {
        fromPanel.style.display = 'none';
        toPanel.style.display   = 'block';
        // Force reflow
        toPanel.getBoundingClientRect();
        toPanel.style.opacity = '1';
        _activeAdminTab = tab;
        // Save preference in sessionStorage
        try { sessionStorage.setItem('adminTab', tab); } catch(e) {}
    }, 280);
}

// Restore last tab on page load
(function() {
    try {
        var saved = sessionStorage.getItem('adminTab');
        if (saved && saved !== 'staff') {
            var btn = document.getElementById('btn-tab-' + saved);
            if (btn) {
                // Instant switch on load (no animation)
                document.getElementById('panel-tab-staff').style.display = 'none';
                var target = document.getElementById('panel-tab-' + saved);
                if (target) { target.style.display = 'block'; target.style.opacity = '1'; }
                document.getElementById('btn-tab-staff').classList.remove('active');
                btn.classList.add('active');
                _activeAdminTab = saved;
            }
        }
    } catch(e) {}
})();
</script>
<?php
$pageContent = ob_get_clean();
require VIEWS_PATH . '/layouts/app.php';