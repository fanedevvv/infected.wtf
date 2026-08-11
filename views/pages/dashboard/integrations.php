<?php
requireLogin(); checkBanned($pdo);
$userId  = (int)$_SESSION['user_id'];
$profile = getProfile($pdo, $userId);
$isPremium = !empty($profile['is_premium']) && (empty($profile['premium_expires_at']) || strtotime($profile['premium_expires_at']) > time());
$currentPage = 'integrations'; $pageTitle = 'Integrations';

// Fetch existing Discord integration (user account)
$stmt = $pdo->prepare("SELECT * FROM integrations WHERE user_id = ? AND type = 'discord' LIMIT 1");
$stmt->execute([$userId]);
$discordIntegration = $stmt->fetch();

// Discord server data lives in the same row
$discordServer = ($discordIntegration && !empty($discordIntegration['discord_server_id'])) ? $discordIntegration : null;

ob_start();
?>
<style>
/* ── Integrations Page ─────────────────────── */
/* ── Integration cards grid ── */
.int-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1rem;
    margin-bottom: 2.5rem;
}
@media (max-width: 640px) {
    .int-grid { grid-template-columns: 1fr; }
}
.int-card {
    background: rgba(255,255,255,.03);
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 16px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: .75rem;
    transition: border-color .25s, transform .25s, box-shadow .25s;
    position: relative;
    overflow: hidden;
}
.int-card:hover {
    border-color: rgba(88,101,242,.35);
    transform: translateY(-3px);
    box-shadow: 0 12px 40px rgba(88,101,242,.12);
}
.int-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    border-radius: 16px 16px 0 0;
    background: var(--int-color, rgba(88,101,242,1));
    opacity: 0;
    transition: opacity .25s;
}
.int-card:hover::before { opacity: 1; }
.int-card-header {
    display: flex;
    align-items: center;
    gap: .75rem;
}
.int-card-icon {
    width: 40px; height: 40px; border-radius: 11px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    font-size: 1.2rem;
}
.int-card-icon.discord-icon {
    background: linear-gradient(135deg, #5865f2, #404eed);
    box-shadow: 0 4px 14px rgba(88,101,242,.4);
}
.int-card-title { font-size: .95rem; font-weight: 700; color: #fff; margin: 0 0 .15rem; }
.int-card-subtitle { font-size: .72rem; color: rgba(255,255,255,.4); margin: 0; }
.int-card-desc { font-size: .78rem; color: rgba(255,255,255,.4); line-height: 1.55; }
.int-card-footer { margin-top: auto; }

/* Status badge */
.int-status {
    display: inline-flex;
    align-items: center;
    gap: .35rem;
    font-size: .72rem;
    font-weight: 600;
    padding: .22rem .65rem;
    border-radius: 20px;
    margin-bottom: .5rem;
}
.int-status.connected {
    background: rgba(35,165,90,.15);
    color: #23a55a;
    border: 1px solid rgba(35,165,90,.3);
}
.int-status.disconnected {
    background: rgba(255,255,255,.06);
    color: rgba(255,255,255,.35);
    border: 1px solid rgba(255,255,255,.08);
}
.int-status-dot {
    width: 5px; height: 5px; border-radius: 50%;
}
.connected .int-status-dot  { background: #23a55a; box-shadow: 0 0 5px #23a55a; }
.disconnected .int-status-dot { background: rgba(255,255,255,.3); }

/* Buttons */
.int-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: .4rem;
    padding: .5rem .9rem;
    border-radius: 9px;
    font-size: .78rem;
    font-weight: 700;
    cursor: pointer;
    transition: opacity .2s, transform .2s;
    text-decoration: none;
    border: none;
    width: 100%;
}
.int-btn:hover { opacity: .88; transform: translateY(-1px); }
.int-btn-discord {
    background: linear-gradient(135deg, #5865f2, #404eed);
    color: #fff;
    box-shadow: 0 4px 14px rgba(88,101,242,.35);
}
.int-btn-danger {
    background: rgba(237,66,69,.12);
    color: #ed4245;
    border: 1px solid rgba(237,66,69,.25);
}
.int-btn-manage {
    background: rgba(88,101,242,.12);
    color: #5865f2;
    border: 1px solid rgba(88,101,242,.25);
}

/* ── Connected profile preview ── */
.discord-preview {
    background: rgba(30,33,36,.8);
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 10px;
    padding: .65rem .85rem;
    display: flex;
    align-items: center;
    gap: .65rem;
    margin-bottom: .5rem;
}
.discord-preview-avatar {
    width: 30px; height: 30px; border-radius: 50%;
    background: rgba(88,101,242,.3);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
}
.discord-preview-avatar img { width: 100%; height: 100%; object-fit: cover; }
.discord-preview-info { min-width: 0; }
.discord-preview-name {
    font-size: .78rem; font-weight: 700; color: #fff;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.discord-preview-tag { font-size: .68rem; color: rgba(255,255,255,.4); display: flex; align-items: center; gap: .3rem; flex-wrap: wrap; }

/* ── Active integrations section ── */
.active-int-section { margin-top: .5rem; }
.active-int-section .section-header { margin-bottom: 1.25rem; }
.active-int-list { display: flex; flex-direction: column; gap: .6rem; }

.active-int-row {
    background: rgba(255,255,255,.02);
    border: 1px solid rgba(255,255,255,.06);
    border-radius: 16px;
    padding: 1rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: border-color .2s, background .2s;
    position: relative;
    overflow: hidden;
}
.active-int-row::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: var(--int-row-color, rgba(88,101,242,1));
    border-radius: 0 2px 2px 0;
}
.active-int-row:hover {
    background: rgba(255,255,255,.04);
    border-color: rgba(255,255,255,.1);
}
.active-int-row-icon {
    width: 44px; height: 44px; border-radius: 12px;
    background: var(--int-row-bg, rgba(88,101,242,.12));
    border: 1px solid var(--int-row-border, rgba(88,101,242,.2));
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
}
.active-int-row-info { flex: 1; min-width: 0; }
.active-int-row-name { font-size: .9rem; font-weight: 700; color: #fff; }
.active-int-row-meta {
    font-size: .75rem; color: rgba(255,255,255,.3); margin-top: .15rem;
    display: flex; align-items: center; gap: .4rem;
}
.active-int-row-meta .vis-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: #23a55a; display: inline-block;
    box-shadow: 0 0 5px #23a55a;
}
.active-int-row-meta .vis-dot.hidden { background: rgba(255,255,255,.25); box-shadow: none; }
.active-int-row-actions { display: flex; gap: .4rem; align-items: center; }
.icon-btn {
    width: 34px; height: 34px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: background .2s, transform .15s;
    border: 1px solid transparent;
}
.icon-btn:hover { transform: scale(1.08); }
.icon-btn-vis  { background: rgba(255,255,255,.05); color: rgba(255,255,255,.45); border-color: rgba(255,255,255,.07); }
.icon-btn-vis:hover  { background: rgba(255,255,255,.1); color: #fff; border-color: rgba(255,255,255,.15); }
.icon-btn-del  { background: rgba(237,66,69,.08); color: #ed4245; border-color: rgba(237,66,69,.15); }
.icon-btn-del:hover  { background: rgba(237,66,69,.18); border-color: rgba(237,66,69,.3); }

/* Empty state */
.int-empty {
    text-align: center; padding: 3rem 1rem;
    color: rgba(255,255,255,.25); font-size: .9rem;
}
.int-empty svg { display: block; margin: 0 auto 1rem; opacity: .2; }

/* Toast */
.int-toast {
    position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999;
    background: rgba(20,20,30,.95);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 12px;
    padding: .85rem 1.4rem;
    font-size: .88rem; font-weight: 600; color: #fff;
    box-shadow: 0 8px 32px rgba(0,0,0,.4);
    display: flex; align-items: center; gap: .6rem;
    opacity: 0; transform: translateY(12px);
    transition: opacity .3s, transform .3s;
    pointer-events: none;
}
.int-toast.show { opacity: 1; transform: translateY(0); }
.int-toast.success { border-color: rgba(35,165,90,.3); }
.int-toast.error   { border-color: rgba(237,66,69,.3); }
</style>

<!-- Available integrations -->
<div class="section-header">
    <h2>Available Integrations</h2>
    <p>Pick a platform to connect to your profile</p>
</div>

<div class="int-grid">
    <!-- Discord -->
    <div class="int-card" style="--int-color:#5865f2">
        <div class="int-card-header">
            <div class="int-card-icon discord-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 52 52"><rect width="52" height="52" rx="11" fill="#5865F2"/><g transform="translate(8,12) scale(0.2753)"><path fill="white" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.14zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z"/></g></svg>
            </div>
            <div>
                <div class="int-card-title">Discord</div>
                <div class="int-card-subtitle">User presence & activity</div>
            </div>
        </div>

        <?php if ($discordIntegration && !empty($discordIntegration['discord_user_id'])): ?>
        <div class="int-status connected">
            <div class="int-status-dot"></div>
            Connected
        </div>
        <div class="discord-preview">
            <div class="discord-preview-avatar">
                <?php if (!empty($discordIntegration['discord_avatar'])): ?>
                <img src="https://cdn.discordapp.com/avatars/<?= htmlspecialchars($discordIntegration['discord_user_id']) ?>/<?= htmlspecialchars($discordIntegration['discord_avatar']) ?>.png?size=80" onerror="this.style.display='none'">
                <?php else: ?>
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#5865F2"/><g transform="translate(4,7) scale(0.1494)"><path fill="white" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.14zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z"/></g></svg>
                <?php endif; ?>
            </div>
            <div class="discord-preview-info">
                <div class="discord-preview-name"><?= htmlspecialchars($discordIntegration['discord_username'] ?? 'Unknown') ?></div>
                <div class="discord-preview-tag">ID: <?= htmlspecialchars($discordIntegration['discord_user_id']) ?></div>
            </div>
        </div>
        <div class="int-card-footer">
            <button class="int-btn int-btn-manage" onclick="openManageModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Manage
            </button>
        </div>
        <?php else: ?>
        <div class="int-status disconnected">
            <div class="int-status-dot"></div>
            Not connected
        </div>
        <p class="int-card-desc">Show your Discord presence, badges, guild tag, and live activity (games, music, etc.) directly on your profile.</p>
        <div class="int-card-footer">
            <button class="int-btn int-btn-discord" onclick="openDiscordModal()">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" width="20" height="20"><path fill="white" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.14zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z"/></svg>
                Connect Discord
            </button>
        </div>
        <?php endif; ?>
    </div>

    <!-- Discord Server -->
    <div class="int-card" style="--int-color:#5865f2">
        <div class="int-card-header">
            <div class="int-card-icon discord-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 52 52"><rect width="52" height="52" rx="11" fill="#5865F2"/><g transform="translate(8,12) scale(0.2753)"><path fill="white" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.14zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z"/></g></svg>
            </div>
            <div>
                <div class="int-card-title">Discord Server</div>
                <div class="int-card-subtitle">Server widget on profile</div>
            </div>
        </div>

        <?php if ($discordServer): ?>
        <div class="int-status connected">
            <div class="int-status-dot"></div>
            Connected
        </div>
        <div class="discord-preview">
            <div class="discord-preview-avatar">
                <?php if (!empty($discordServer['discord_server_icon'])): ?>
                <img src="https://cdn.discordapp.com/icons/<?= htmlspecialchars($discordServer['discord_server_id']) ?>/<?= htmlspecialchars($discordServer['discord_server_icon']) ?>.png?size=64" onerror="this.style.display='none'">
                <?php else: ?>
                <svg viewBox="0 0 24 24" fill="#5865f2" width="16" height="16"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.045.036.059a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                <?php endif; ?>
            </div>
            <div class="discord-preview-info">
                <div class="discord-preview-name"><?= htmlspecialchars($discordServer['discord_server_name'] ?? 'Server') ?></div>
                <div class="discord-preview-tag">
                    <span style="color:#23a55a">● <span class="srv-online"><?= number_format((int)($discordServer['discord_server_online'] ?? 0)) ?></span> online</span>
                    <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.3);vertical-align:middle;flex-shrink:0;"></span> <span class="srv-total"><?= number_format((int)($discordServer['discord_server_total'] ?? 0)) ?></span> members
                </div>
            </div>
        </div>
        <div class="int-card-footer">
            <button class="int-btn int-btn-manage" onclick="openManageServerModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Manage
            </button>
        </div>
        <?php else: ?>
        <div class="int-status disconnected">
            <div class="int-status-dot"></div>
            Not connected
        </div>
        <p class="int-card-desc">Show your Discord server widget on your profile — with live online/offline member count and a join button.</p>
        <div class="int-card-footer">
            <button class="int-btn int-btn-discord" onclick="openServerModal()">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" width="16" height="16"><path fill="white" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.14zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z"/></svg>
                Add Discord Server
            </button>
        </div>
        <?php endif; ?>
    </div>

    <!-- Coming soon: Spotify -->
    <div class="int-card" style="--int-color:#1db954;opacity:.55;pointer-events:none;">
        <div class="int-card-header">
            <div class="int-card-icon" style="background:rgba(29,185,84,.15);border:1px solid rgba(29,185,84,.2);">
                <svg viewBox="0 0 24 24" fill="#1db954" width="22" height="22"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
            </div>
            <div>
                <div class="int-card-title">Spotify</div>
                <div class="int-card-subtitle">Music · Coming soon</div>
            </div>
        </div>
        <p class="int-card-desc">Show your currently playing track and recently listened songs on your profile.</p>
        <div class="int-card-footer">
            <button class="int-btn" style="background:rgba(255,255,255,.06);color:rgba(255,255,255,.3);cursor:not-allowed;">Coming Soon</button>
        </div>
    </div>

    <!-- Coming soon: Steam -->
    <div class="int-card" style="--int-color:#66c0f4;opacity:.55;pointer-events:none;">
        <div class="int-card-header">
            <div class="int-card-icon" style="background:rgba(102,192,244,.1);border:1px solid rgba(102,192,244,.2);">
                <svg viewBox="0 0 24 24" fill="#66c0f4" width="22" height="22"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.298-.258-1.91-.046l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.028zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273.016c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"/></svg>
            </div>
            <div>
                <div class="int-card-title">Steam</div>
                <div class="int-card-subtitle">Gaming · Coming soon</div>
            </div>
        </div>
        <p class="int-card-desc">Display your Steam profile, recent games, and playtime on your public biolink.</p>
        <div class="int-card-footer">
            <button class="int-btn" style="background:rgba(255,255,255,.06);color:rgba(255,255,255,.3);cursor:not-allowed;">Coming Soon</button>
        </div>
    </div>

</div>

<!-- Active integrations list -->
<div class="active-int-section">
    <div class="section-header">
        <h2>Your Integrations</h2>
        <p>Toggle visibility or remove connected platforms</p>
    </div>
    <div class="active-int-list" id="active-int-list">
        <?php if ($discordIntegration && !empty($discordIntegration['discord_user_id'])): ?>
        <div class="active-int-row" data-id="<?= (int)$discordIntegration['id'] ?>" style="--int-row-color:#5865f2;--int-row-bg:rgba(88,101,242,.1);--int-row-border:rgba(88,101,242,.2)">
            <div class="active-int-row-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#5865F2"/><g transform="translate(4,7) scale(0.1494)"><path fill="white" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.14zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z"/></g></svg>
            </div>
            <div class="active-int-row-info">
                <div class="active-int-row-name"><?= htmlspecialchars($discordIntegration['discord_username'] ?? 'Discord') ?></div>
                <div class="active-int-row-meta">
                    <span class="vis-dot <?= $discordIntegration['visible'] ? '' : 'hidden' ?>"></span>
                    Discord &middot; <?= $discordIntegration['visible'] ? 'Visible on profile' : 'Hidden from profile' ?>
                </div>
            </div>
            <div class="active-int-row-actions">
                <button class="icon-btn icon-btn-vis" title="<?= $discordIntegration['visible'] ? 'Hide' : 'Show' ?>"
                    onclick="toggleVisibility(<?= (int)$discordIntegration['id'] ?>, this)">
                    <?php if ($discordIntegration['visible']): ?>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    <?php else: ?>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    <?php endif; ?>
                </button>
                <button class="icon-btn icon-btn-del" title="Remove" onclick="removeIntegration(<?= (int)$discordIntegration['id'] ?>)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
            </div>
        </div>
        <?php endif; ?>

        <?php if ($discordServer): ?>
        <div class="active-int-row" data-id="srv-<?= (int)$discordServer['id'] ?>" style="--int-row-color:#5865f2;--int-row-bg:rgba(88,101,242,.1);--int-row-border:rgba(88,101,242,.2)">
            <div class="active-int-row-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#5865F2"/><g transform="translate(4,7) scale(0.1494)"><path fill="white" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.14zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z"/></g></svg>
            </div>
            <div class="active-int-row-info">
                <div class="active-int-row-name"><?= htmlspecialchars($discordServer['discord_server_name'] ?? 'Discord Server') ?></div>
                <div class="active-int-row-meta">
                    <span class="vis-dot <?= $discordServer['discord_server_visible'] ? '' : 'hidden' ?>"></span>
                    Discord Server &middot; <?= $discordServer['discord_server_visible'] ? 'Visible on profile' : 'Hidden from profile' ?>
                    &middot; <span style="color:#23a55a">● <span class="srv-online"><?= number_format((int)($discordServer['discord_server_online'] ?? 0)) ?></span></span> <span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.3);vertical-align:middle;flex-shrink:0;"></span> <span class="srv-total"><?= number_format((int)($discordServer['discord_server_total'] ?? 0)) ?></span> members
                </div>
            </div>
            <div class="active-int-row-actions">
                <button class="icon-btn icon-btn-vis" title="<?= $discordServer['discord_server_visible'] ? 'Hide' : 'Show' ?>"
                    onclick="toggleServerVisibility(<?= (int)$discordServer['id'] ?>, this)">
                    <?php if ($discordServer['discord_server_visible']): ?>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    <?php else: ?>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    <?php endif; ?>
                </button>
                <button class="icon-btn icon-btn-del" title="Remove server" onclick="removeDiscordServer(<?= (int)$discordServer['id'] ?>)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
            </div>
        </div>
        <?php endif; ?>

        <?php if (!$discordIntegration && !$discordServer): ?>
        <div class="int-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            No integrations connected yet. Connect Discord to get started.
        </div>
        <?php endif; ?>
    </div>
</div>

<div id="discord-modal" style="display:none;position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:1rem;">
    <div style="background:rgba(15,16,24,.97);border:1px solid rgba(88,101,242,.25);border-radius:18px;padding:1.75rem 1.75rem 1.5rem;max-width:420px;width:100%;max-height:90vh;overflow-y:auto;position:relative;box-shadow:0 24px 80px rgba(0,0,0,.6);">
        <button onclick="closeDiscordModal()" style="position:absolute;top:.85rem;right:.85rem;background:rgba(255,255,255,.08);border:none;color:rgba(255,255,255,.6);width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;line-height:1;z-index:1;">×</button>

        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.4rem;">
            <div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#5865f2,#404eed);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 6px 20px rgba(88,101,242,.4);">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" width="38" height="29"><path fill="white" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.14zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z"/></svg>
            </div>
            <div style="text-align:left;">
                <h3 style="font-size:1.25rem;font-weight:800;color:#fff;margin:0 0 .3rem;">Connect Discord</h3>
                <p style="color:rgba(255,255,255,.4);font-size:.83rem;line-height:1.55;margin:0;">Our bot needs to verify your identity. Follow the steps below.</p>
            </div>
        </div>

        <!-- Steps -->
        <div style="display:flex;flex-direction:column;gap:.6rem;margin-bottom:1.25rem;">
            <div style="display:flex;align-items:flex-start;gap:.8rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:.85rem;">
                <div style="width:24px;height:24px;border-radius:7px;background:rgba(88,101,242,.2);border:1px solid rgba(88,101,242,.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:800;color:#5865f2;font-size:.78rem;">1</div>
                <div>
                    <div style="font-weight:700;color:#fff;font-size:.85rem;margin-bottom:.15rem;">Join our Discord server</div>
                    <div style="color:rgba(255,255,255,.4);font-size:.78rem;margin-bottom:.5rem;">The bot needs to see you in the server to verify your account.</div>
                    <a href="<?= defined('DISCORD_SERVER_INVITE') ? DISCORD_SERVER_INVITE : '#' ?>" target="_blank"
                       style="display:inline-flex;align-items:center;gap:.35rem;background:rgba(88,101,242,.15);color:#5865f2;font-size:.78rem;font-weight:700;padding:.3rem .7rem;border-radius:7px;text-decoration:none;border:1px solid rgba(88,101,242,.25);"
                       onmouseover="this.style.background='rgba(88,101,242,.25)'" onmouseout="this.style.background='rgba(88,101,242,.15)'">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" width="20" height="20"><path fill="white" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.14zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z"/></svg>
                        Join Server
                    </a>
                </div>
            </div>
            <div style="display:flex;align-items:flex-start;gap:.8rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:.85rem;">
                <div style="width:24px;height:24px;border-radius:7px;background:rgba(88,101,242,.2);border:1px solid rgba(88,101,242,.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:800;color:#5865f2;font-size:.78rem;">2</div>
                <div>
                    <div style="font-weight:700;color:#fff;font-size:.85rem;margin-bottom:.15rem;">Log in with Discord</div>
                    <div style="color:rgba(255,255,255,.4);font-size:.78rem;">Discord's official login screen — we only ask for your basic profile (identify scope).</div>
                </div>
            </div>
            <div style="display:flex;align-items:flex-start;gap:.8rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:.85rem;">
                <div style="width:24px;height:24px;border-radius:7px;background:rgba(88,101,242,.2);border:1px solid rgba(88,101,242,.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:800;color:#5865f2;font-size:.78rem;">3</div>
                <div>
                    <div style="font-weight:700;color:#fff;font-size:.85rem;margin-bottom:.15rem;">Bot verifies & syncs</div>
                    <div style="color:rgba(255,255,255,.4);font-size:.78rem;">The bot confirms you're in the server, pulls your profile data and grants the <strong>Cont Infected</strong> role.</div>
                </div>
            </div>
        </div>

        <a class="int-btn int-btn-discord" href="/api/discord_oauth.php?action=start" style="text-decoration:none;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" width="20" height="20"><path fill="white" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.14zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z"/></svg>
            Login with Discord
        </a>
    </div>
</div>

<!-- ── Manage Modal ── -->
<div id="manage-modal" style="display:none;position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);align-items:center;justify-content:center;">
    <div style="background:rgba(15,16,24,.97);border:1px solid rgba(88,101,242,.25);border-radius:22px;padding:2.5rem;max-width:400px;width:90%;position:relative;box-shadow:0 24px 80px rgba(0,0,0,.6);">
        <button onclick="closeManageModal()" style="position:absolute;top:1rem;right:1rem;background:rgba(255,255,255,.06);border:none;color:rgba(255,255,255,.5);width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;">×</button>
        <h3 style="font-size:1.3rem;font-weight:800;color:#fff;margin:0 0 1.5rem;">Manage Discord</h3>
        <div style="display:flex;flex-direction:column;gap:.75rem;">
            <button class="int-btn int-btn-danger" onclick="removeIntegration(<?= $discordIntegration ? (int)$discordIntegration['id'] : 0 ?>); closeManageModal();">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                Disconnect Discord
            </button>
        </div>
    </div>
</div>

<!-- ── Add Discord Server Modal ── -->
<div id="server-modal" style="display:none;position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:1rem;">
    <div style="background:rgba(15,16,24,.97);border:1px solid rgba(88,101,242,.25);border-radius:18px;padding:1.75rem 1.75rem 1.5rem;max-width:420px;width:100%;position:relative;box-shadow:0 24px 80px rgba(0,0,0,.6);">
        <button onclick="closeServerModal()" style="position:absolute;top:.85rem;right:.85rem;background:rgba(255,255,255,.08);border:none;color:rgba(255,255,255,.6);width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;">×</button>

        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.4rem;">
            <div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#5865f2,#404eed);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 6px 20px rgba(88,101,242,.4);">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" width="30" height="30"><path fill="white" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.14zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z"/></svg>
            </div>
            <div>
                <h3 style="font-size:1.25rem;font-weight:800;color:#fff;margin:0 0 .3rem;">Add Discord Server</h3>
                <p style="color:rgba(255,255,255,.4);font-size:.83rem;line-height:1.55;margin:0;">Paste your server's invite link and we'll fetch the stats automatically.</p>
            </div>
        </div>

        <div style="background:rgba(88,101,242,.08);border:1px solid rgba(88,101,242,.18);border-radius:10px;padding:.85rem;margin-bottom:1.2rem;">
            <div style="font-size:.78rem;color:rgba(255,255,255,.55);line-height:1.6;">
                <strong style="color:#5865f2;">How to get the invite link:</strong><br>
                In Discord → Right-click your server → <em>Invite People</em> → copy the link (e.g. <code style="background:rgba(255,255,255,.08);padding:.1rem .4rem;border-radius:4px;">https://discord.gg/abc123</code>)
            </div>
        </div>

        <div style="margin-bottom:.85rem;">
            <label style="display:block;font-size:.75rem;font-weight:700;color:rgba(255,255,255,.45);margin-bottom:.4rem;letter-spacing:.04em;text-transform:uppercase;">Discord Invite Link</label>
            <input type="text" id="server-invite-input" placeholder="https://discord.gg/your-code"
                   style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:.7rem .9rem;color:#fff;font-size:.88rem;font-family:inherit;outline:none;transition:border-color .2s;box-sizing:border-box;"
                   onfocus="this.style.borderColor='rgba(88,101,242,.6)'" onblur="this.style.borderColor='rgba(255,255,255,.1)'">
            <div id="server-connect-error" style="display:none;color:#ed4245;font-size:.78rem;margin-top:.4rem;"></div>
        </div>

        <button class="int-btn int-btn-discord" id="server-connect-btn" onclick="connectDiscordServer()" style="font-size:.88rem;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" width="16" height="16"><path fill="white" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.14zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z"/></svg>
            Add Server
        </button>
    </div>
</div>

<!-- ── Manage Discord Server Modal ── -->
<div id="manage-server-modal" style="display:none;position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);align-items:center;justify-content:center;">
    <div style="background:rgba(15,16,24,.97);border:1px solid rgba(88,101,242,.25);border-radius:22px;padding:2.5rem;max-width:400px;width:90%;position:relative;box-shadow:0 24px 80px rgba(0,0,0,.6);">
        <button onclick="closeManageServerModal()" style="position:absolute;top:1rem;right:1rem;background:rgba(255,255,255,.06);border:none;color:rgba(255,255,255,.5);width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;">×</button>
        <h3 style="font-size:1.3rem;font-weight:800;color:#fff;margin:0 0 .5rem;">Manage Discord Server</h3>
        <?php if ($discordServer): ?>
        <p style="color:rgba(255,255,255,.4);font-size:.82rem;margin:0 0 1.5rem;display:flex;align-items:center;gap:.3rem;flex-wrap:wrap;"><?= htmlspecialchars($discordServer['discord_server_name'] ?? '') ?> <span style="color:rgba(255,255,255,.25)">&middot;</span> <span style="color:#23a55a;">● <?= number_format((int)($discordServer['discord_server_online'] ?? 0)) ?> online</span> <span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.3);vertical-align:middle;"></span> <?= number_format((int)($discordServer['discord_server_total'] ?? 0)) ?> members</p>
        <?php endif; ?>
        <div style="display:flex;flex-direction:column;gap:.75rem;">
            <button class="int-btn int-btn-danger" onclick="removeDiscordServer(<?= $discordServer ? (int)$discordServer['id'] : 0 ?>); closeManageServerModal();">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                Remove Server
            </button>
        </div>
    </div>
</div>

<!-- Toast -->
<div class="int-toast" id="int-toast"></div>

<script>
function openDiscordModal()  { document.getElementById('discord-modal').style.display  = 'flex'; }
function closeDiscordModal() { document.getElementById('discord-modal').style.display  = 'none'; }
function openManageModal()   { document.getElementById('manage-modal').style.display   = 'flex'; }
function closeManageModal()  { document.getElementById('manage-modal').style.display   = 'none'; }

function showToast(msg, type='success') {
    const t = document.getElementById('int-toast');
    const icon = type === 'success'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="#23a55a" stroke-width="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="#ed4245" stroke-width="2.5" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    t.innerHTML = icon + msg;
    t.className = 'int-toast show ' + type;
    setTimeout(() => t.className = 'int-toast', 3000);
}

// ── Toast after redirect back from /api/discord_oauth.php ─────────────────────
(function() {
    const params = new URLSearchParams(location.search);
    const status  = params.get('discord');
    if (!status) return;
    if (status === 'connected') {
        showToast('Discord connected successfully!');
    } else if (status === 'error') {
        showToast(params.get('discord_msg') || 'Could not connect Discord.', 'error');
    }
    params.delete('discord'); params.delete('discord_msg');
    const qs = params.toString();
    history.replaceState({}, '', location.pathname + (qs ? '?' + qs : ''));
})();

async function toggleVisibility(id, btn) {
    const fd = new FormData();
    fd.append('action', 'toggle_visibility');
    fd.append('id', id);
    try {
        const res  = await fetch('/api/integrations.php', { method: 'POST', body: fd });
        const json = await res.json();
        if (json.success) {
            showToast(json.message);
            setTimeout(() => location.reload(), 900);
        } else { showToast(json.error || 'Error', 'error'); }
    } catch(e) { showToast('Network error', 'error'); }
}

async function removeIntegration(id) {
    const fd = new FormData();
    fd.append('action', 'remove_integration');
    fd.append('id', id);
    try {
        const res  = await fetch('/api/integrations.php', { method: 'POST', body: fd });
        const json = await res.json();
        if (json.success) {
            showToast('Integration removed.');
            setTimeout(() => location.reload(), 900);
        } else { showToast(json.error || 'Error', 'error'); }
    } catch(e) { showToast('Network error', 'error'); }
}

// Close modals on backdrop click
document.getElementById('discord-modal').addEventListener('click', function(e){ if(e.target===this) closeDiscordModal(); });
document.getElementById('manage-modal').addEventListener('click',  function(e){ if(e.target===this) closeManageModal(); });
document.getElementById('server-modal').addEventListener('click',  function(e){ if(e.target===this) closeServerModal(); });
document.getElementById('manage-server-modal').addEventListener('click', function(e){ if(e.target===this) closeManageServerModal(); });

function openServerModal()        { document.getElementById('server-modal').style.display = 'flex'; }
function closeServerModal()       { document.getElementById('server-modal').style.display = 'none'; }
function openManageServerModal()  { document.getElementById('manage-server-modal').style.display = 'flex'; }
function closeManageServerModal() { document.getElementById('manage-server-modal').style.display = 'none'; }

async function connectDiscordServer() {
    const invite = document.getElementById('server-invite-input').value.trim();
    const errEl  = document.getElementById('server-connect-error');
    const btn    = document.getElementById('server-connect-btn');
    errEl.style.display = 'none';
    if (!/^https?:\/\/discord\.gg\/[a-zA-Z0-9\-]+$/.test(invite)) {
        errEl.textContent = 'Please enter a valid invite link (e.g. https://discord.gg/your-code)';
        errEl.style.display = 'block'; return;
    }
    btn.disabled = true; btn.textContent = 'Fetching server data...';
    const fd = new FormData();
    fd.append('action', 'connect_discord_server');
    fd.append('invite', invite);
    try {
        const res  = await fetch('/api/integrations.php', { method: 'POST', body: fd });
        const json = await res.json();
        if (json.success) {
            closeServerModal(); showToast('Discord server added!');
            setTimeout(() => location.reload(), 1200);
        } else {
            errEl.textContent = json.error || 'Failed to add server.';
            errEl.style.display = 'block'; btn.disabled = false; btn.textContent = 'Add Server';
        }
    } catch(e) {
        errEl.textContent = 'Network error. Try again.';
        errEl.style.display = 'block'; btn.disabled = false; btn.textContent = 'Add Server';
    }
}

async function toggleServerVisibility(id, btn) {
    const fd = new FormData();
    fd.append('action', 'toggle_server_visibility'); fd.append('id', id);
    try {
        const res  = await fetch('/api/integrations.php', { method: 'POST', body: fd });
        const json = await res.json();
        if (json.success) { showToast(json.message); setTimeout(() => location.reload(), 900); }
        else { showToast(json.error || 'Error', 'error'); }
    } catch(e) { showToast('Network error', 'error'); }
}

async function removeDiscordServer(id) {
    const fd = new FormData();
    fd.append('action', 'remove_discord_server'); fd.append('id', id);
    try {
        const res  = await fetch('/api/integrations.php', { method: 'POST', body: fd });
        const json = await res.json();
        if (json.success) { showToast('Discord server removed.'); setTimeout(() => location.reload(), 900); }
        else { showToast(json.error || 'Error', 'error'); }
    } catch(e) { showToast('Network error', 'error'); }
}

// ── Auto-refresh Discord Server stats every 5 minutes ─────────────────────────
<?php if ($discordServer): ?>
(function() {
    const serverId = <?= (int)$discordServer['id'] ?>;
    async function refreshServerStats() {
        const fd = new FormData();
        fd.append('action', 'refresh_discord_server');
        fd.append('id', serverId);
        try {
            const res  = await fetch('/api/integrations.php', { method: 'POST', body: fd });
            const json = await res.json();
            if (json.success) {
                // Update preview card numbers live without reload
                document.querySelectorAll('.srv-online').forEach(el => el.textContent = json.online.toLocaleString());
                document.querySelectorAll('.srv-total').forEach(el => el.textContent = json.total.toLocaleString());
            }
        } catch(e) { /* silent fail */ }
    }
    // Refresh immediately on page load, then every 5 minutes
    refreshServerStats();
    setInterval(refreshServerStats, 5 * 60 * 1000);
})();
<?php endif; ?>
</script>

<?php $pageContent = ob_get_clean(); require VIEWS_PATH . '/layouts/app.php'; ?>