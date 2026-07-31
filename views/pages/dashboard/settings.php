<?php
requireLogin(); checkBanned($pdo);
$userId  = (int)$_SESSION['user_id'];
$profile = getProfile($pdo, $userId);

$stmt = $pdo->prepare("SELECT username, email, username_changed_at, COALESCE(login_notify,1) AS login_notify, COALESCE(two_fa_enabled,0) AS two_fa_enabled FROM users WHERE id=?");
$stmt->execute([$userId]);
$userData = $stmt->fetch();

// Username cooldown
$canChangeUsername = true;
$usernameNextChange = null;
if (!empty($userData['username_changed_at'])) {
    $secondsSince = time() - strtotime($userData['username_changed_at']);
    $secondsLeft  = (7 * 86400) - $secondsSince;
    if ($secondsLeft > 0) {
        $canChangeUsername  = false;
        $daysLeft           = (int)ceil($secondsLeft / 86400);
        if ($daysLeft > 7) $daysLeft = 7;
        $usernameNextChange = $daysLeft;
    }
}

// Multi-account: load sessions stored in cookie
$savedAccounts = json_decode($_COOKIE['saved_accounts'] ?? '[]', true) ?: [];

// Login sessions (last 10)
$sessStmt = $pdo->prepare("SELECT id, ip_display, browser, device_type, logged_at FROM login_history WHERE user_id=? ORDER BY logged_at DESC LIMIT 10");
$sessStmt->execute([$userId]);
$loginSessions = $sessStmt->fetchAll();

// Pre-generate 2FA secret server-side (avoids AJAX issues with Cloudflare)
if (!$userData['two_fa_enabled']) {
    require_once ROOT_PATH . '/core/TOTP.php';
    $twofa_secret  = TOTP::generateSecret();
    $twofa_totp    = new TOTP($twofa_secret);
    $twofa_email   = decryptEmail($userData['email']);
    $twofa_uri     = $twofa_totp->getQRUri($twofa_email, defined('SITE_NAME') ? SITE_NAME : 'BioLink');
} else {
    $twofa_secret = '';
    $twofa_uri    = '';
}

$currentPage = 'settings';
$pageTitle   = 'Settings';
ob_start();
?>

<div class="section-header">
    <h2>Settings</h2>
    <p>Manage your account information and security.</p>
</div>

<style>
/* ── Settings v2 layout ── */
.settings-v2 {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    max-width: 700px;
}

.sv2-section {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
}

.sv2-section-header {
    display: flex;
    align-items: center;
    gap: .85rem;
    padding: 1.1rem 1.4rem;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    user-select: none;
    transition: background .2s;
}
.sv2-section-header:hover { background: rgba(255,255,255,.03); }

.sv2-icon {
    width: 36px; height: 36px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
}

.sv2-title { font-size: .9rem; font-weight: 700; color: var(--text); }
.sv2-sub   { font-size: .75rem; color: var(--text-muted); margin-top: .1rem; }

.sv2-chevron {
    margin-left: auto;
    color: var(--text-muted);
    transition: transform .25s;
    flex-shrink: 0;
}
.sv2-section.open .sv2-chevron { transform: rotate(180deg); }

.sv2-body {
    display: none;
    padding: 1.25rem 1.4rem;
    flex-direction: column;
    gap: .85rem;
}
.sv2-section.open .sv2-body { display: flex; }

/* Inputs */
.sv2-input {
    width: 100%;
    background: rgba(255,255,255,.05);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: .7rem 1rem;
    color: var(--text);
    font-size: .85rem;
    transition: border .2s;
    box-sizing: border-box;
}
.sv2-input:focus { outline: none; border-color: var(--accent); }
.sv2-input.danger:focus { border-color: #ef4444; }

.sv2-hint { font-size: .74rem; color: var(--text-muted); }

.sv2-btn {
    display: flex; align-items: center; justify-content: center; gap: .5rem;
    padding: .7rem 1.4rem;
    border-radius: 10px;
    font-size: .83rem;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid;
    transition: opacity .2s;
    width: 100%;
}
.sv2-btn:hover { opacity: .82; }
.sv2-btn-accent  { background: rgba(0,212,255,.12);  border-color: rgba(0,212,255,.35);  color: #00d4ff; }
.sv2-btn-purple  { background: rgba(167,139,250,.12); border-color: rgba(167,139,250,.35); color: #a78bfa; }
.sv2-btn-green   { background: rgba(52,211,153,.12); border-color: rgba(52,211,153,.35); color: #34d399; }
.sv2-btn-red     { background: rgba(239,68,68,.12);  border-color: rgba(239,68,68,.35);  color: #ef4444; }
.sv2-btn-yellow  { background: rgba(251,191,36,.12); border-color: rgba(251,191,36,.35); color: #fbbf24; }

/* Toggle */
.sv2-toggle { position:relative; display:inline-block; width:44px; height:24px; flex-shrink:0; }
.sv2-toggle input { opacity:0; width:0; height:0; }
.sv2-slider { position:absolute; cursor:pointer; inset:0; background:rgba(255,255,255,.12); border-radius:24px; transition:.3s; }
.sv2-slider::before { content:''; position:absolute; height:18px; width:18px; left:3px; bottom:3px; background:#fff; border-radius:50%; transition:.3s; }
.sv2-toggle input:checked + .sv2-slider { background:var(--accent,#00d4ff); }
.sv2-toggle input:checked + .sv2-slider::before { transform:translateX(20px); }

.sv2-row {
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    padding: .6rem 0;
    border-bottom: 1px solid var(--border);
}
.sv2-row:last-child { border-bottom: none; }
.sv2-row-label { font-size: .83rem; font-weight: 600; color: var(--text); }
.sv2-row-sub   { font-size: .72rem; color: var(--text-muted); margin-top: .15rem; }

/* Cooldown badge */
.sv2-cooldown {
    display: inline-flex; align-items: center; gap: .3rem;
    font-size: .7rem; color: var(--text-muted);
    background: rgba(255,255,255,.06);
    border: 1px solid var(--border);
    border-radius: 6px; padding: .25rem .55rem;
    margin-left: auto;
}

/* 2FA QR */
.sv2-qr-wrap {
    background: #fff;
    border-radius: 12px;
    padding: 1rem;
    display: flex; align-items: center; justify-content: center;
    width: 160px; height: 160px;
    margin: 0 auto;
}
.sv2-qr-wrap img { width: 100%; height: 100%; }

/* Account list */
.sv2-account-item {
    display: flex; align-items: center; gap: .85rem;
    background: rgba(255,255,255,.04);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: .75rem 1rem;
}
.sv2-account-avatar {
    width: 38px; height: 38px; border-radius: 50%;
    background: rgba(0,212,255,.15);
    display: flex; align-items: center; justify-content: center;
    font-size: .8rem; font-weight: 700; color: var(--accent);
    flex-shrink: 0; overflow: hidden;
}
.sv2-account-avatar img { width: 100%; height: 100%; object-fit: cover; }
.sv2-account-name  { font-size: .84rem; font-weight: 600; color: var(--text); }
.sv2-account-badge { font-size: .68rem; color: #34d399; margin-top: .1rem; }
.sv2-account-actions { margin-left: auto; display: flex; gap: .5rem; }
.sv2-account-btn {
    background: none; border: none;
    color: var(--text-muted); font-size: .75rem; cursor: pointer;
    padding: .3rem .6rem; border-radius: 6px;
    border: 1px solid var(--border);
    transition: all .2s;
}
.sv2-account-btn:hover { color: var(--text); background: rgba(255,255,255,.06); }
.sv2-account-btn.switch { color: var(--accent); border-color: rgba(0,212,255,.3); }
.sv2-account-btn.remove { color: #ef4444; border-color: rgba(239,68,68,.3); }

/* Add account modal */
.sv2-modal-overlay {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(5,5,10,.88);
    backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    padding: 1.5rem;
    animation: fadeIn .2s ease;
}
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
.sv2-modal {
    background: rgba(12,12,24,.98);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 18px;
    padding: 2rem;
    width: 100%; max-width: 400px;
    position: relative;
    animation: slideUp .3s cubic-bezier(.22,1,.36,1);
}
@keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
.sv2-modal::before {
    content:''; position:absolute; top:0;left:0;right:0; height:2px;
    background:linear-gradient(90deg,transparent,var(--accent),transparent);
    border-radius:18px 18px 0 0;
}
.sv2-modal-close {
    position: absolute; top: 1rem; right: 1rem;
    background: none; border: none; color: var(--text-muted);
    cursor: pointer; font-size: 1.2rem; line-height: 1;
    width: 28px; height: 28px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    transition: all .2s;
}
.sv2-modal-close:hover { background: rgba(255,255,255,.08); color: var(--text); }
.sv2-modal-title { font-family: var(--font-display,'Syne'),sans-serif; font-size: 1.15rem; font-weight: 800; margin-bottom: .3rem; }
.sv2-modal-sub   { font-size: .78rem; color: var(--text-muted); margin-bottom: 1.25rem; }

/* Status message */
.sv2-status { font-size: .75rem; min-height: 1rem; transition: color .2s; }
</style>

<style>
/* ── Account Info Card ── */
.acct-info-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 1.4rem;
    margin-bottom: 1.25rem;
    max-width: 700px;
}
.acct-info-header {
    display: flex; align-items: center; gap: .75rem;
    margin-bottom: 1.1rem;
}
.acct-info-header-icon {
    width: 36px; height: 36px; border-radius: 10px;
    background: rgba(0,212,255,.12); color: #00d4ff;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
}
.acct-info-header-title { font-size: .95rem; font-weight: 700; color: var(--text); }
.acct-info-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: .75rem;
}
@media(max-width:580px){ .acct-info-grid { grid-template-columns: 1fr; } }
.acct-info-item {
    background: rgba(255,255,255,.04);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: .85rem 1rem;
}
.acct-info-item-header {
    display: flex; align-items: center; gap: .5rem;
    margin-bottom: .6rem;
}
.acct-info-item-icon {
    width: 28px; height: 28px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
}
.acct-info-item-label { font-size: .75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; }
.acct-info-item-value {
    font-size: .85rem; font-weight: 600; color: var(--text);
    background: rgba(255,255,255,.05);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: .45rem .75rem;
    word-break: break-all;
}

/* ── Session Manager ── */
.session-list { display: flex; flex-direction: column; gap: .6rem; }
.session-item {
    display: flex; align-items: center; gap: .9rem;
    background: rgba(255,255,255,.04);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: .8rem 1rem;
}
.session-dot {
    width: 10px; height: 10px; border-radius: 50%;
    flex-shrink: 0;
}
.session-dot.active { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,.6); }
.session-dot.old    { background: rgba(255,255,255,.2); }
.session-info { flex: 1; min-width: 0; }
.session-browser { font-size: .83rem; font-weight: 700; color: var(--text); }
.session-meta    { font-size: .72rem; color: var(--text-muted); margin-top: .15rem; }
.session-badge {
    font-size: .72rem; font-weight: 700;
    color: #22c55e; flex-shrink: 0;
}
.session-empty {
    text-align: center; color: var(--text-muted);
    font-size: .8rem; padding: 1rem 0;
}
</style>

<!-- ── ACCOUNT INFORMATION (top card) ── -->
<div class="acct-info-card">
    <div class="acct-info-header">
        <div class="acct-info-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div class="acct-info-header-title">Account Information</div>
    </div>
    <div class="acct-info-grid">
        <!-- Username -->
        <div class="acct-info-item">
            <div class="acct-info-item-header">
                <div class="acct-info-item-icon" style="background:rgba(0,212,255,.12);color:#00d4ff">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <span class="acct-info-item-label">Username</span>
            </div>
            <div class="acct-info-item-value"><?= sanitize($userData['username']) ?></div>
        </div>
        <!-- Email -->
        <div class="acct-info-item">
            <div class="acct-info-item-header">
                <div class="acct-info-item-icon" style="background:rgba(167,139,250,.12);color:#a78bfa">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <span class="acct-info-item-label">Email</span>
            </div>
            <div class="acct-info-item-value"><?= sanitize(decryptEmail($userData['email'])) ?></div>
        </div>
        <!-- User ID -->
        <div class="acct-info-item">
            <div class="acct-info-item-header">
                <div class="acct-info-item-icon" style="background:rgba(52,211,153,.12);color:#34d399">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                </div>
                <span class="acct-info-item-label">User ID</span>
            </div>
            <div class="acct-info-item-value"><?= $userId ?></div>
        </div>
    </div>
</div>

<div class="settings-v2">

    <!-- ── USERNAME ─────────────────────────────── -->
    <div class="sv2-section open" id="sec-username">
        <div class="sv2-section-header" onclick="toggleSection('sec-username')">
            <div class="sv2-icon" style="background:rgba(0,212,255,.1);color:#00d4ff">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div>
                <div class="sv2-title">Username</div>
                <div class="sv2-sub">Currently: <strong>@<?= sanitize($userData['username']) ?></strong></div>
            </div>
            <?php if (!$canChangeUsername): ?>
            <span class="sv2-cooldown">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <?= $usernameNextChange ?>d cooldown
            </span>
            <?php endif; ?>
            <svg class="sv2-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="sv2-body">
            <?php if ($canChangeUsername): ?>
            <input type="text" class="sv2-input" id="new-username" value="<?= sanitize($userData['username']) ?>" maxlength="30">
            <p class="sv2-hint">3–30 characters. Letters, numbers, underscores only. Can be changed once every 7 days.</p>
            <button class="sv2-btn sv2-btn-accent" onclick="requestAction('change_username', {username: document.getElementById('new-username').value}, 'status-username')">
                Save Username
            </button>
            <div class="sv2-status" id="status-username"></div>
            <?php else: ?>
            <p class="sv2-hint">You can change your username again in <strong><?= $usernameNextChange ?> day<?= $usernameNextChange > 1 ? 's' : '' ?></strong>.</p>
            <?php endif; ?>
        </div>
    </div>

    <!-- ── EMAIL ─────────────────────────────────── -->
    <div class="sv2-section" id="sec-email">
        <div class="sv2-section-header" onclick="toggleSection('sec-email')">
            <div class="sv2-icon" style="background:rgba(167,139,250,.1);color:#a78bfa">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <div>
                <div class="sv2-title">Email Address</div>
                <div class="sv2-sub">Currently: <strong><?= sanitize(decryptEmail($userData['email'])) ?></strong></div>
            </div>
            <svg class="sv2-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="sv2-body">
            <input type="email" class="sv2-input" id="new-email" placeholder="New email address">
            <input type="password" class="sv2-input" id="email-password" placeholder="Confirm with current password">
            <button class="sv2-btn sv2-btn-purple" onclick="requestAction('change_email', {email: document.getElementById('new-email').value, password: document.getElementById('email-password').value}, 'status-email')">
                Save Email
            </button>
            <div class="sv2-status" id="status-email"></div>
        </div>
    </div>

    <!-- ── PASSWORD ──────────────────────────────── -->
    <div class="sv2-section" id="sec-password">
        <div class="sv2-section-header" onclick="toggleSection('sec-password')">
            <div class="sv2-icon" style="background:rgba(52,211,153,.1);color:#34d399">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div>
                <div class="sv2-title">Password</div>
                <div class="sv2-sub">Change your login password</div>
            </div>
            <svg class="sv2-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="sv2-body">
            <input type="password" class="sv2-input" id="cur-pw" placeholder="Current password">
            <input type="password" class="sv2-input" id="new-pw" placeholder="New password (min. 6 characters)">
            <input type="password" class="sv2-input" id="conf-pw" placeholder="Confirm new password">
            <button class="sv2-btn sv2-btn-green" onclick="requestAction('change_password', {current_password: document.getElementById('cur-pw').value, new_password: document.getElementById('new-pw').value, confirm_password: document.getElementById('conf-pw').value}, 'status-pw')">
                Change Password
            </button>
            <div class="sv2-status" id="status-pw"></div>
        </div>
    </div>

    <!-- ── 2FA ───────────────────────────────────── -->
    <div class="sv2-section" id="sec-2fa">
        <div class="sv2-section-header" onclick="toggleSection('sec-2fa')">
            <div class="sv2-icon" style="background:rgba(251,191,36,.1);color:#fbbf24">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
                <div class="sv2-title">Two-Factor Authentication</div>
                <div class="sv2-sub"><?= (int)$userData['two_fa_enabled'] ? '<span style="color:#34d399">✓ Enabled</span>' : 'Extra security for your account' ?></div>
            </div>
            <svg class="sv2-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="sv2-body">
            <?php if (!(int)$userData['two_fa_enabled']): ?>
            <!-- Setup 2FA -->
            <div class="sv2-row">
                <div>
                    <div class="sv2-row-label">Google Authenticator 2FA</div>
                    <div class="sv2-row-sub">Scan a QR code with Google Authenticator to enable 2FA.</div>
                </div>
            </div>
            <button class="sv2-btn sv2-btn-yellow" onclick="open2FASetup()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Set Up 2FA
            </button>
            <?php else: ?>
            <!-- Disable 2FA -->
            <div class="sv2-row">
                <div>
                    <div class="sv2-row-label" style="color:#34d399">2FA is active</div>
                    <div class="sv2-row-sub">Your account is protected with Google Authenticator.</div>
                </div>
            </div>
            <input type="text" class="sv2-input" id="disable-2fa-code" placeholder="Enter 6-digit code to disable" maxlength="6" inputmode="numeric">
            <button class="sv2-btn sv2-btn-red" onclick="doAction('disable_2fa', {code: document.getElementById('disable-2fa-code').value}, 'status-2fa')">
                Disable 2FA
            </button>
            <?php endif; ?>
            <div class="sv2-status" id="status-2fa"></div>
        </div>
    </div>

    <!-- ── SESSION MANAGER ──────────────────────── -->
    <div class="sv2-section" id="sec-sessions">
        <div class="sv2-section-header" onclick="toggleSection('sec-sessions')">
            <div class="sv2-icon" style="background:rgba(52,211,153,.1);color:#34d399">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="8" cy="8" r="3"/><path d="M3 12h18"/><circle cx="16" cy="16" r="3"/></svg>
            </div>
            <div>
                <div class="sv2-title">Session Manager</div>
                <div class="sv2-sub">Manage your active login sessions.</div>
            </div>
            <svg class="sv2-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="sv2-body">
            <div class="session-list">
            <?php if (empty($loginSessions)): ?>
                <div class="session-empty">No login sessions found.</div>
            <?php else: ?>
                <?php foreach ($loginSessions as $i => $sess): ?>
                <?php
                    $browser  = $sess['browser'] ?: 'Unknown Browser';
                    $ip       = $sess['ip_display'] ?: 'Unknown IP Address';
                    $device   = ucfirst($sess['device_type'] ?: 'Unknown Device');
                    $when     = date('d/m/Y, H:i:s', strtotime($sess['logged_at']));
                    $isCurrent = ($i === 0);
                ?>
                <div class="session-item">
                    <div class="session-dot <?= $isCurrent ? 'active' : 'old' ?>"></div>
                    <div class="session-info">
                        <div class="session-browser"><?= sanitize($browser) ?></div>
                        <div class="session-meta">
                            <?= sanitize($device) ?><br>
                            <?= sanitize($ip) ?><br>
                            <?= $when ?>
                        </div>
                    </div>
                    <?php if ($isCurrent): ?>
                    <div class="session-badge">Current Session</div>
                    <?php endif; ?>
                </div>
                <?php endforeach; ?>
            <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- ── CHOOSE REGION ─────────────────────────── -->
    <div class="sv2-section" id="sec-region">
        <div class="sv2-section-header" onclick="toggleSection('sec-region')">
            <div class="sv2-icon" style="background:rgba(167,139,250,.12);color:#a78bfa">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div>
                <div class="sv2-title">Leaderboard Region</div>
                <div class="sv2-sub">Choose your country for the local leaderboard</div>
            </div>
            <svg class="sv2-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="sv2-body">
            <p style="font-size:.82rem;color:var(--text-muted);line-height:1.5">
                Select your country to appear on the <strong style="color:var(--text)">local leaderboard</strong>. This is based on where you are from, not where your visitors come from.
            </p>
            <div id="region-current" style="font-size:.82rem;color:var(--text-muted);margin-bottom:.25rem">
                <?php
                $regStmt2 = $pdo->prepare("SELECT leaderboard_region_code, leaderboard_region_name FROM users WHERE id=?");
                $regStmt2->execute([$userId]);
                $regRow2 = $regStmt2->fetch();
                $curRegCode = $regRow2['leaderboard_region_code'] ?? '';
                $curRegName = $regRow2['leaderboard_region_name'] ?? '';
                if ($curRegCode && $curRegCode !== 'XX'):
                ?>
                Current region: <strong style="color:var(--text)"><?= htmlspecialchars($curRegName) ?></strong>
                <?php else: ?>
                No region set yet.
                <?php endif; ?>
            </div>
            <?php
            $countries = [
                'AF'=>'Afghanistan','AL'=>'Albania','DZ'=>'Algeria','AR'=>'Argentina','AM'=>'Armenia',
                'AU'=>'Australia','AT'=>'Austria','AZ'=>'Azerbaijan','BH'=>'Bahrain','BD'=>'Bangladesh',
                'BY'=>'Belarus','BE'=>'Belgium','BZ'=>'Belize','BJ'=>'Benin','BO'=>'Bolivia',
                'BA'=>'Bosnia and Herzegovina','BW'=>'Botswana','BR'=>'Brazil','BN'=>'Brunei',
                'BG'=>'Bulgaria','BF'=>'Burkina Faso','BI'=>'Burundi','KH'=>'Cambodia','CM'=>'Cameroon',
                'CA'=>'Canada','CF'=>'Central African Republic','TD'=>'Chad','CL'=>'Chile','CN'=>'China',
                'CO'=>'Colombia','CG'=>'Congo','CR'=>'Costa Rica','HR'=>'Croatia','CU'=>'Cuba',
                'CY'=>'Cyprus','CZ'=>'Czech Republic','DK'=>'Denmark','DJ'=>'Djibouti','DO'=>'Dominican Republic',
                'EC'=>'Ecuador','EG'=>'Egypt','SV'=>'El Salvador','EE'=>'Estonia','ET'=>'Ethiopia',
                'FI'=>'Finland','FR'=>'France','GA'=>'Gabon','GE'=>'Georgia','DE'=>'Germany',
                'GH'=>'Ghana','GR'=>'Greece','GT'=>'Guatemala','HT'=>'Haiti','HN'=>'Honduras',
                'HU'=>'Hungary','IN'=>'India','ID'=>'Indonesia','IR'=>'Iran','IQ'=>'Iraq',
                'IE'=>'Ireland','IL'=>'Israel','IT'=>'Italy','JM'=>'Jamaica','JP'=>'Japan',
                'JO'=>'Jordan','KZ'=>'Kazakhstan','KE'=>'Kenya','KW'=>'Kuwait','LV'=>'Latvia',
                'LB'=>'Lebanon','LY'=>'Libya','LT'=>'Lithuania','LU'=>'Luxembourg','MK'=>'North Macedonia',
                'MG'=>'Madagascar','MW'=>'Malawi','MY'=>'Malaysia','MV'=>'Maldives','ML'=>'Mali',
                'MT'=>'Malta','MX'=>'Mexico','MD'=>'Moldova','MN'=>'Mongolia','ME'=>'Montenegro',
                'MA'=>'Morocco','MZ'=>'Mozambique','MM'=>'Myanmar','NA'=>'Namibia','NP'=>'Nepal',
                'NL'=>'Netherlands','NZ'=>'New Zealand','NI'=>'Nicaragua','NG'=>'Nigeria','NO'=>'Norway',
                'OM'=>'Oman','PK'=>'Pakistan','PA'=>'Panama','PY'=>'Paraguay','PE'=>'Peru',
                'PH'=>'Philippines','PL'=>'Poland','PT'=>'Portugal','QA'=>'Qatar','RO'=>'Romania',
                'RU'=>'Russia','RW'=>'Rwanda','SA'=>'Saudi Arabia','SN'=>'Senegal','RS'=>'Serbia',
                'SL'=>'Sierra Leone','SG'=>'Singapore','SK'=>'Slovakia','SI'=>'Slovenia','SO'=>'Somalia',
                'ZA'=>'South Africa','KR'=>'South Korea','SS'=>'South Sudan','ES'=>'Spain','LK'=>'Sri Lanka',
                'SD'=>'Sudan','SE'=>'Sweden','CH'=>'Switzerland','SY'=>'Syria','TW'=>'Taiwan',
                'TZ'=>'Tanzania','TH'=>'Thailand','TN'=>'Tunisia','TR'=>'Turkey','UG'=>'Uganda',
                'UA'=>'Ukraine','AE'=>'United Arab Emirates','GB'=>'United Kingdom','US'=>'United States',
                'UY'=>'Uruguay','UZ'=>'Uzbekistan','VE'=>'Venezuela','VN'=>'Vietnam','YE'=>'Yemen',
                'ZM'=>'Zambia','ZW'=>'Zimbabwe',
            ];
            $selectedRegionName = $curRegCode ? ($countries[$curRegCode] ?? '') : '';
            ?>
            <!-- Hidden input pentru valoarea reală -->
            <input type="hidden" id="region-select" value="<?= htmlspecialchars($curRegCode) ?>" data-name="<?= htmlspecialchars($selectedRegionName) ?>">

            <!-- Custom dropdown styled dark -->
            <div class="region-dd-wrap" id="region-dd-wrap">
                <div class="region-dd-trigger" id="region-dd-trigger" onclick="toggleRegionDd()">
                    <span id="region-dd-label"><?= $curRegCode ? htmlspecialchars($selectedRegionName) : '— Select your country —' ?></span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" id="region-dd-chevron"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <div class="region-dd-list" id="region-dd-list">
                    <div class="region-dd-search-wrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" style="color:rgba(255,255,255,.3);flex-shrink:0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input type="text" class="region-dd-search" id="region-dd-search" placeholder="Search country…" oninput="filterRegions(this.value)" autocomplete="off">
                    </div>
                    <div class="region-dd-options" id="region-dd-options">
                        <?php foreach ($countries as $code => $name): ?>
                        <div class="region-dd-option <?= ($curRegCode === $code) ? 'selected' : '' ?>"
                             data-code="<?= $code ?>"
                             data-name="<?= htmlspecialchars($name) ?>"
                             onclick="selectRegion('<?= $code ?>', '<?= htmlspecialchars($name, ENT_QUOTES) ?>')">
                            <?= htmlspecialchars($name) ?>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>

            <style>
            .region-dd-wrap { position: relative; width: 100%; }
            .region-dd-trigger {
                width: 100%;
                display: flex; align-items: center; justify-content: space-between;
                padding: .6rem 1rem;
                background: rgba(255,255,255,.05);
                border: 1px solid var(--border);
                border-radius: 10px;
                color: var(--text);
                font-size: .88rem;
                font-family: 'Outfit', sans-serif;
                cursor: pointer;
                transition: border-color .2s;
                user-select: none;
            }
            .region-dd-trigger:hover,
            .region-dd-wrap.open .region-dd-trigger { border-color: var(--accent); }
            #region-dd-chevron { transition: transform .2s; flex-shrink: 0; color: rgba(255,255,255,.4); }
            .region-dd-wrap.open #region-dd-chevron { transform: rotate(180deg); }

            .region-dd-list {
                display: none;
                position: fixed;
                background: #0e0e12;
                border: 1px solid var(--accent);
                border-radius: 12px;
                z-index: 99999;
                overflow: hidden;
                box-shadow: 0 8px 40px rgba(0,0,0,.85);
            }
            .region-dd-wrap.open .region-dd-list { display: block; }

            .region-dd-search-wrap {
                display: flex; align-items: center; gap: .5rem;
                padding: .6rem .85rem;
                border-bottom: 1px solid rgba(255,255,255,.07);
                background: rgba(255,255,255,.03);
            }
            .region-dd-search {
                flex: 1; background: transparent; border: none; outline: none;
                color: var(--text); font-size: .85rem; font-family: 'Outfit', sans-serif;
            }
            .region-dd-search::placeholder { color: rgba(255,255,255,.3); }

            .region-dd-options {
                max-height: 220px;
                overflow-y: auto;
                padding: .3rem 0;
            }
            .region-dd-options::-webkit-scrollbar { width: 4px; }
            .region-dd-options::-webkit-scrollbar-track { background: transparent; }
            .region-dd-options::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 2px; }

            .region-dd-option {
                padding: .55rem 1rem;
                font-size: .86rem;
                color: rgba(255,255,255,.75);
                font-family: 'Outfit', sans-serif;
                cursor: pointer;
                transition: background .12s, color .12s;
            }
            .region-dd-option:hover { background: rgba(0,212,255,.08); color: #fff; }
            .region-dd-option.selected { background: rgba(0,212,255,.12); color: var(--accent); font-weight: 600; }
            .region-dd-option.hidden { display: none; }
            </style>
            <button class="sv2-btn" onclick="saveRegion()" style="background:linear-gradient(135deg,rgba(167,139,250,.3),rgba(167,139,250,.1));border:1px solid rgba(167,139,250,.35);color:#a78bfa">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Save Region
            </button>
            <div id="region-msg" style="font-size:.8rem;display:none"></div>
        </div>
    </div>

    <!-- ── DELETE ACCOUNT ────────────────────────── -->
    <div class="sv2-section" id="sec-delete" style="border-color:rgba(239,68,68,.25)">
        <div class="sv2-section-header" onclick="toggleSection('sec-delete')">
            <div class="sv2-icon" style="background:rgba(239,68,68,.12);color:#ef4444">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
            </div>
            <div>
                <div class="sv2-title" style="color:#ff8080">Delete Account</div>
                <div class="sv2-sub">Permanent and cannot be undone</div>
            </div>
            <svg class="sv2-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="sv2-body" id="delete-card-form">
            <input type="password" class="sv2-input danger" id="delete-password" placeholder="Enter your password to confirm">
            <button class="sv2-btn sv2-btn-red" onclick="confirmDelete()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                Delete My Account Permanently
            </button>
        </div>
    </div>

</div>

<!-- ── 2FA Verification Modal (for sensitive actions) ── -->
<div class="sv2-modal-overlay" id="modal-2fa-verify" style="display:none">
    <div class="sv2-modal" style="max-width:380px;text-align:center">
        <button class="sv2-modal-close" onclick="close2FAVerify()">✕</button>
        <div style="width:60px;height:60px;border-radius:50%;background:rgba(251,191,36,.15);border:2px solid rgba(251,191,36,.35);display:flex;align-items:center;justify-content:center;margin:0 auto .9rem">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="1.8" width="26" height="26"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div class="sv2-modal-title" style="color:#fbbf24">Two-Factor Auth</div>
        <div class="sv2-modal-sub" style="margin-bottom:1.1rem">Open Google Authenticator and enter the 6-digit code for <strong style="color:var(--text)"><?= defined('SITE_NAME') ? htmlspecialchars(SITE_NAME) : 'your account' ?></strong>.</div>
        <input type="text" class="sv2-input" id="verify-2fa-code"
               placeholder="· · · · · ·"
               maxlength="6" inputmode="numeric"
               style="text-align:center;letter-spacing:.35em;font-size:1.3rem;padding:.75rem 1rem"
               oninput="this.value=this.value.replace(/\D/g,'')"
               onkeydown="if(event.key==='Enter')submit2FAVerify()">
        <button class="sv2-btn sv2-btn-yellow" style="margin-top:.85rem" onclick="submit2FAVerify()">
            Verify Code
        </button>
        <div class="sv2-status" id="status-2fa-verify" style="text-align:center;margin-top:.6rem"></div>
        <div style="margin-top:.85rem">
            <a href="#" onclick="close2FAVerify();return false" style="font-size:.75rem;color:var(--text-muted);text-decoration:none">← Cancel</a>
        </div>
    </div>
</div>

<!-- ── 2FA Setup Modal ── -->
<div class="sv2-modal-overlay" id="modal-2fa" style="display:none">
    <div class="sv2-modal">
        <button class="sv2-modal-close" onclick="close2FASetup()">✕</button>
        <div class="sv2-modal-title">Set Up 2FA</div>
        <div class="sv2-modal-sub">Scan this QR code with Google Authenticator, then enter the 6-digit code to confirm.</div>
        <div id="qr-loading" style="text-align:center;color:var(--text-muted);padding:2rem;font-size:.8rem">Generating QR code...</div>
        <div id="qr-content" style="display:none;flex-direction:column;gap:1rem;align-items:center">
            <div class="sv2-qr-wrap" style="padding:0;overflow:hidden;border-radius:12px">
                <canvas id="qr-canvas" width="160" height="160"></canvas>
            </div>
            <p style="font-size:.72rem;color:var(--text-muted);text-align:center">
                Can't scan? Enter this key manually:<br>
                <code id="manual-key" style="color:var(--accent);letter-spacing:.1em;font-size:.8rem"></code>
            </p>
            <input type="text" class="sv2-input" id="setup-2fa-code" placeholder="Enter 6-digit code from app" maxlength="6" inputmode="numeric" style="text-align:center;letter-spacing:.2em;font-size:1.1rem">
            <button class="sv2-btn sv2-btn-yellow" style="width:100%" onclick="confirm2FASetup()">
                Confirm & Enable 2FA
            </button>
            <div class="sv2-status" id="status-2fa-setup" style="text-align:center"></div>
        </div>
    </div>
</div>

<script>
// ── 2FA state from server ─────────────────────────────────────────────────────
const USER_2FA_ENABLED = <?= (int)$userData['two_fa_enabled'] ?>;

// ── Section toggle ────────────────────────────────────────────────────────────
function toggleSection(id) {
    document.getElementById(id).classList.toggle('open');
}

// ── Generic action ────────────────────────────────────────────────────────────
async function doAction(action, data, statusId) {
    const el = document.getElementById(statusId);
    if (el) { el.textContent = 'Saving...'; el.style.color = 'var(--text-muted)'; }
    try {
        const r = await fetch('/api/settings.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...data })
        });
        const j = await r.json();
        if (j.success) {
            if (el) { el.textContent = '✓ ' + j.message; el.style.color = '#34d399'; }
            if (['change_username','change_email','change_password','disable_2fa'].includes(action)) {
                setTimeout(() => location.reload(), 1400);
            }
        } else {
            if (el) { el.textContent = '✗ ' + (j.error || 'Error'); el.style.color = '#ff8080'; }
        }
    } catch(e) {
        if (el) { el.textContent = '✗ Network error'; el.style.color = '#ff8080'; }
    }
}

async function doToggle(action, data, statusId) {
    const el = document.getElementById(statusId);
    if (el) { el.textContent = 'Saving...'; el.style.color = 'var(--text-muted)'; }
    try {
        const r = await fetch('/api/settings.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...data })
        });
        const j = await r.json();
        if (el) {
            el.textContent = j.success ? '✓ Saved' : '✗ ' + (j.error || 'Error');
            el.style.color  = j.success ? '#34d399' : '#ff8080';
            setTimeout(() => { el.textContent = ''; }, 2500);
        }
    } catch(e) {
        if (el) { el.textContent = '✗ Network error'; el.style.color = '#ff8080'; }
    }
}

// ── 2FA Verification Modal ────────────────────────────────────────────────────
let _pendingAction   = null;
let _pendingData     = null;
let _pendingStatusId = null;
let _pendingCallback = null; // for delete_account special flow

const SENSITIVE_ACTIONS = ['change_username','change_email','change_password','delete_account'];

function requestAction(action, data, statusId) {
    if (USER_2FA_ENABLED && SENSITIVE_ACTIONS.includes(action)) {
        _pendingAction   = action;
        _pendingData     = data;
        _pendingStatusId = statusId;
        _pendingCallback = null;
        open2FAVerify();
    } else {
        doAction(action, data, statusId);
    }
}

function open2FAVerify() {
    const el = document.getElementById('verify-2fa-code');
    el.value = '';
    document.getElementById('status-2fa-verify').textContent = '';
    document.getElementById('modal-2fa-verify').style.display = 'flex';
    setTimeout(() => el.focus(), 120);
}

function close2FAVerify() {
    document.getElementById('modal-2fa-verify').style.display = 'none';
    _pendingAction   = null;
    _pendingData     = null;
    _pendingStatusId = null;
    _pendingCallback = null;
}

async function submit2FAVerify() {
    const code = document.getElementById('verify-2fa-code').value.trim();
    const statusEl = document.getElementById('status-2fa-verify');

    if (code.length !== 6) {
        statusEl.textContent = '✗ Enter a 6-digit code';
        statusEl.style.color = '#ff8080';
        return;
    }

    // Close the modal immediately and inject the code into the pending request
    document.getElementById('modal-2fa-verify').style.display = 'none';

    if (_pendingCallback) {
        // delete_account special path
        await _pendingCallback(code);
    } else if (_pendingAction) {
        await doAction(_pendingAction, { ..._pendingData, two_fa_code: code }, _pendingStatusId);
    }

    _pendingAction   = null;
    _pendingData     = null;
    _pendingStatusId = null;
    _pendingCallback = null;
}

// ── Delete account ────────────────────────────────────────────────────────────
async function confirmDelete() {
    const pw = document.getElementById('delete-password').value;
    if (!pw) { showToast('Enter your password first', 'error'); return; }

    if (USER_2FA_ENABLED) {
        _pendingCallback = async (twoFaCode) => await _doDelete(pw, twoFaCode);
        _pendingAction   = 'delete_account';
        open2FAVerify();
        return;
    }

    await _doDelete(pw, null);
}

async function _doDelete(pw, twoFaCode) {
    const payload = { action: 'delete_account', password: pw };
    if (twoFaCode) payload.two_fa_code = twoFaCode;
    try {
        const r = await fetch('/api/settings.php', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const j = await r.json();
        if (j.success) {
            document.getElementById('delete-password').value = '';
            document.getElementById('delete-card-form').innerHTML = `
                <div style="display:flex;align-items:flex-start;gap:.85rem;background:rgba(255,80,80,.06);border:1px solid rgba(255,80,80,.2);border-radius:12px;padding:1rem 1.1rem">
                    <div style="flex-shrink:0;width:36px;height:36px;border-radius:50%;background:rgba(255,80,80,.12);border:1px solid rgba(255,80,80,.25);display:flex;align-items:center;justify-content:center">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ff8080" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>
                    </div>
                    <div>
                        <div style="font-size:.83rem;font-weight:600;color:#ff8080;margin-bottom:.3rem">Confirmation email sent</div>
                        <div style="font-size:.78rem;color:var(--text-muted);line-height:1.6">Check your inbox and click the link to <strong style="color:#ff9090">permanently delete</strong> your account. Link expires in <strong style="color:var(--text)">1 hour</strong>.</div>
                    </div>
                </div>`;
        } else { showToast(j.error || 'Error', 'error'); }
    } catch(e) { showToast('Network error', 'error'); }
}

// ── 2FA Setup ─────────────────────────────────────────────────────────────────
let _2faSecret = <?= json_encode($twofa_secret) ?>;
let _2faUri    = <?= json_encode($twofa_uri) ?>;

function open2FASetup() {
    document.getElementById('modal-2fa').style.display = 'flex';
    document.getElementById('qr-loading').style.display = 'none';
    document.getElementById('qr-content').style.display = 'flex';
    document.getElementById('manual-key').textContent = _2faSecret;
    if (window.QRCode) {
        renderQR(_2faUri);
    } else {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
        s.onload = () => renderQR(_2faUri);
        document.head.appendChild(s);
    }
}

function renderQR(uri) {
    const canvas = document.getElementById('qr-canvas');
    canvas.getContext('2d').clearRect(0, 0, 160, 160);
    new QRCode(canvas.parentElement, {
        text: uri,
        width: 160,
        height: 160,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
    });
    // QRCode appends a new canvas/img, remove old placeholder
    const old = document.getElementById('qr-canvas');
    if (old) old.remove();
}
function close2FASetup() { document.getElementById('modal-2fa').style.display = 'none'; }

async function confirm2FASetup() {
    const code = document.getElementById('setup-2fa-code').value.trim();
    const el   = document.getElementById('status-2fa-setup');
    if (code.length !== 6) { el.textContent = '✗ Enter a 6-digit code'; el.style.color = '#ff8080'; return; }
    el.textContent = 'Verifying...'; el.style.color = 'var(--text-muted)';
    const r = await fetch('/api/settings.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup_2fa_confirm', secret: _2faSecret, code })
    });
    const j = await r.json();
    if (j.success) {
        el.textContent = '✓ 2FA enabled!'; el.style.color = '#34d399';
        setTimeout(() => { close2FASetup(); location.reload(); }, 1200);
    } else {
        el.textContent = '✗ ' + (j.error || 'Invalid code'); el.style.color = '#ff8080';
    }
}

// Init

function toggleRegionDd() {
    const wrap    = document.getElementById('region-dd-wrap');
    const trigger = document.getElementById('region-dd-trigger');
    const list    = document.getElementById('region-dd-list');
    const isOpen  = wrap.classList.toggle('open');
    if (isOpen) {
        // Poziționează lista fix față de trigger
        const rect = trigger.getBoundingClientRect();
        list.style.top    = (rect.bottom + 6) + 'px';
        list.style.left   = rect.left + 'px';
        list.style.width  = rect.width + 'px';
        setTimeout(() => document.getElementById('region-dd-search').focus(), 50);
    }
}

function selectRegion(code, name) {
    document.getElementById('region-select').value = code;
    document.getElementById('region-select').dataset.name = name;
    document.getElementById('region-dd-label').textContent = name;
    // Mark selected
    document.querySelectorAll('.region-dd-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.code === code);
    });
    document.getElementById('region-dd-wrap').classList.remove('open');
    document.getElementById('region-dd-search').value = '';
    filterRegions('');
}

function filterRegions(q) {
    const term = q.toLowerCase();
    document.querySelectorAll('.region-dd-option').forEach(el => {
        el.classList.toggle('hidden', !el.dataset.name.toLowerCase().includes(term));
    });
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    const wrap = document.getElementById('region-dd-wrap');
    if (wrap && !wrap.contains(e.target)) wrap.classList.remove('open');
});

async function saveRegion() {
    const inp  = document.getElementById('region-select');
    const code = inp.value;
    const name = inp.dataset.name || '';
    const msg  = document.getElementById('region-msg');
    if (!code) {
        msg.textContent = '✗ Please select a country first.';
        msg.style.color = '#ff8080';
        msg.style.display = 'block';
        return;
    }
    msg.textContent = 'Saving...';
    msg.style.color = 'var(--text-muted)';
    msg.style.display = 'block';
    try {
        const r = await fetch('/api/settings.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'set_region', region_code: code, region_name: name })
        });
        const j = await r.json();
        if (j.success) {
            const lv = j.local_views ?? 0;
            msg.innerHTML = '✓ Region saved! ' + (lv > 0
                ? '<span style="color:rgba(255,255,255,.5)">Found <strong style="color:#a78bfa">' + lv + '</strong> existing local views from ' + name + '.</span>'
                : '<span style="color:rgba(255,255,255,.4)">No existing views from ' + name + ' yet.</span>');
            msg.style.color = '#34d399';
            const cur = document.getElementById('region-current');
            if (cur) cur.innerHTML = 'Current region: <strong style="color:var(--text)">' + name + '</strong>';
        } else {
            msg.textContent = '✗ ' + (j.error || 'Failed to save');
            msg.style.color = '#ff8080';
        }
    } catch(e) {
        msg.textContent = '✗ Network error';
        msg.style.color = '#ff8080';
    }
}
</script>

<?php
$pageContent = ob_get_clean();
require VIEWS_PATH . '/layouts/app.php';