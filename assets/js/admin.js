/**
 * INFECTED.WTF — Admin Panel JS
 */

let epUser = null;
let epIsSelf = false;
let _epInFlight = false; // guard against duplicate in-flight requests

// ── helpers ───────────────────────────────────────────
function getRoleKey(user) {
    if (user.is_owner) return 'owner';
    if (user.is_admin) return 'admin';
    if (user.is_mod)   return 'mod';
    return 'user';
}

function roleBadgeHTML(user) {
    if (user.is_owner) return '<span class="badge badge-owner">Owner</span>';
    if (user.is_admin) return '<span class="badge badge-admin">Admin</span>';
    if (user.is_mod)   return '<span class="badge" style="background:rgba(168,85,247,.15);border:1px solid rgba(168,85,247,.4);color:#a855f7;font-size:.68rem;padding:.2rem .6rem;border-radius:20px;font-weight:800;letter-spacing:.04em">Mod</span>';
    return '<span class="badge badge-normal">User</span>';
}

function buildRoleRow(currentRole) {
    const roles = [
        { key:'user',  label:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" style="vertical-align:middle"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> User',  bg:'rgba(255,255,255,.06)', border:'rgba(255,255,255,.15)', color:'rgba(255,255,255,.7)' },
        { key:'mod',   label:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" style="vertical-align:middle"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg> Mod',   bg:'rgba(168,85,247,.08)', border:'rgba(168,85,247,.35)', color:'#a855f7' },
        { key:'admin', label:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" style="vertical-align:middle"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Admin', bg:'rgba(0,212,255,.08)',  border:'rgba(0,212,255,.3)',  color:'var(--accent)' },
    ];
    if (window.EP_CAN_GRANT_OWNER) {
        roles.push({ key:'owner', label:'<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13" style="vertical-align:middle"><path d="M2 19h20v2H2v-2zM2 6l5 7 5-9 5 9 5-7v11H2V6z"/></svg> Owner', bg:'rgba(251,191,36,.08)', border:'rgba(251,191,36,.35)', color:'#fbbf24' });
    }
    return roles.map(r => {
        const isActive    = r.key === currentRole;
        const activeStyle = isActive
            ? `background:${r.bg};border:2px solid ${r.border};color:${r.color};opacity:1;cursor:default;`
            : `background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.35);cursor:pointer;`;
        const checkmark   = isActive
            ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="12" height="12" style="margin-left:4px"><path d="M20 6L9 17l-5-5"/></svg>`
            : '';
        const onclick = isActive ? '' : `onclick="epSetRole('${r.key}')"`;
        return `<button class="ep-role-btn" style="padding:.5rem 1rem;border-radius:10px;font-size:.8rem;font-weight:700;display:inline-flex;align-items:center;gap:.3rem;transition:all .2s;${activeStyle}" ${onclick}>${r.label}${checkmark}</button>`;
    }).join('');
}

// ── OPEN PANEL ────────────────────────────────────────
function openEditPanel(user, isSelf = false) {
    epUser   = user;
    epIsSelf = isSelf;

    document.getElementById('ep-avatar').src           = user.avatar;
    document.getElementById('ep-username').textContent = '@' + user.username;
    document.getElementById('ep-email').textContent    = '';
    document.getElementById('ep-quick-stats').innerHTML =
        `<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" style="vertical-align:middle;margin-right:3px"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>${user.views} views</span><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" style="vertical-align:middle;margin-right:3px"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>${user.links} links</span>`;

    // Role badge in header
    const rb = document.getElementById('ep-role-badge');
    if (rb) {
        rb.innerHTML = roleBadgeHTML(user);
        if (user.banned) rb.innerHTML += '<span class="badge badge-banned">Banned</span>';
    }

    // ── Ban UI ──
    const banUi   = document.getElementById('ep-ban-ui');
    const unbanUi = document.getElementById('ep-unban-ui');
    if (user.banned) {
        banUi.style.display   = 'none';
        unbanUi.style.display = 'block';
        const infoEl = document.getElementById('ep-ban-info-text');
        if (infoEl) {
            if (user.ban_until) {
                const d = new Date(user.ban_until);
                infoEl.textContent = 'Banned until ' + d.toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'});
            } else {
                infoEl.textContent = 'Banned permanently';
            }
        }
    } else {
        banUi.style.display   = 'block';
        unbanUi.style.display = 'none';
        const radios = document.querySelectorAll('input[name="ep-ban-type"]');
        radios.forEach(r => { r.checked = (r.value === 'permanent'); });
        const daysWrap = document.getElementById('ep-ban-days-wrap');
        if (daysWrap) daysWrap.style.display = 'none';
        const daysInput = document.getElementById('ep-ban-days');
        if (daysInput) daysInput.value = '';
    }

    // ── Badges ──
    if (window.EP_IS_OWNER) {
        Object.keys(window.EP_ALL_BADGES || {}).forEach(bid => {
            const ownedEl  = document.getElementById('epbs-' + bid);
            const grantBtn = document.querySelector(`#epbr-${bid} .ep-b-grant`);
            const revBtn   = document.querySelector(`#epbr-${bid} .ep-b-revoke`);
            if (!ownedEl) return;
            const has = user.badges && user.badges.includes(bid);
            ownedEl.style.display = has ? 'flex' : 'none';
            if (grantBtn) grantBtn.style.display = has ? 'none' : '';
            if (revBtn)   revBtn.style.display   = has ? '' : 'none';
        });
    }

    // ── Tokens ──
    const tokInput   = document.getElementById('ep-tokens-input');
    const tokCurrent = document.getElementById('ep-tokens-current');
    if (tokInput)   tokInput.value = user.tokens ?? 0;
    if (tokCurrent) tokCurrent.textContent = `Current balance: ${(user.tokens ?? 0).toLocaleString()} tokens`;

    // ── Premium ──
    epRefreshPremiumUI(user);

    // ── Role row ──
    const roleRow = document.getElementById('ep-role-row');
    if (roleRow) roleRow.innerHTML = buildRoleRow(getRoleKey(user));

    document.getElementById('ep-overlay').classList.add('open');
    document.getElementById('ep-panel').classList.add('open');
    document.body.style.overflow = 'hidden';

    // Hide ban/delete/role when editing self
    const banSection    = document.getElementById('ep-section-ban');
    const deleteSection = document.getElementById('ep-section-delete');
    const roleSection   = document.getElementById('ep-section-role');
    if (banSection)    banSection.style.display    = isSelf ? 'none' : '';
    if (deleteSection) deleteSection.style.display = isSelf ? 'none' : '';
    if (roleSection)   roleSection.style.display   = isSelf ? 'none' : '';

    // Owners cannot ban or delete other owners
    if (user.is_owner && !isSelf) {
        if (banSection)    banSection.style.display    = 'none';
        if (deleteSection) deleteSection.style.display = 'none';
    }
}

// ── CLOSE ─────────────────────────────────────────────
function closeEditPanel() {
    document.getElementById('ep-overlay').classList.remove('open');
    document.getElementById('ep-panel').classList.remove('open');
    document.body.style.overflow = '';
    epUser = null;
    _epInFlight = false; // reset on close so next open works cleanly
}

// ── TOAST ─────────────────────────────────────────────
function showToast(msg, type = 'success') {
    let c = document.getElementById('toast-container');
    if (!c) { c = document.createElement('div'); c.id = 'toast-container'; c.className = 'toast-container'; document.body.appendChild(c); }
    const icons = {
        success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15" style="color:#5fefa5;flex-shrink:0"><path d="M20 6L9 17l-5-5"/></svg>`,
        error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15" style="color:#ff8080;flex-shrink:0"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
    };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = (icons[type] || '') + msg;
    c.appendChild(t);
    setTimeout(() => {
        t.style.transition = 'opacity .3s, transform .3s';
        t.style.opacity = '0'; t.style.transform = 'translateX(20px)';
        setTimeout(() => t.remove(), 300);
    }, 3000);
}

// ── AJAX ──────────────────────────────────────────────
async function epCall(action, extra = {}) {
    if (!epUser) return;
    if (_epInFlight) return; // prevent duplicate requests
    _epInFlight = true;
    // Disable confirm button immediately to block double-clicks
    const confirmBtn = document.getElementById('confirm-btn');
    if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.style.opacity = '0.5'; }
    try {
        const res  = await fetch('/api/admin_action.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, target_id: epUser.id, self_edit: epIsSelf, ...extra })
        });
        const json = await res.json();
        if (json.success) {
            showToast(json.message || 'Done', 'success');
            // Role change — update UI live, no reload needed
            if (extra.role !== undefined && epUser) {
                epUser.is_owner = extra.role === 'owner';
                epUser.is_admin = extra.role === 'admin';
                epUser.is_mod   = extra.role === 'mod';
                // Re-render role row
                const roleRow = document.getElementById('ep-role-row');
                if (roleRow) roleRow.innerHTML = buildRoleRow(getRoleKey(epUser));
                // Update header badge
                const rb2 = document.getElementById('ep-role-badge');
                if (rb2) rb2.innerHTML = roleBadgeHTML(epUser);
                // Update table row status cell
                const tableRow = document.querySelector(`tr[data-uid="${epUser.id}"]`);
                if (tableRow) {
                    const sc = tableRow.querySelector('.user-status-badge');
                    if (sc) sc.outerHTML = roleBadgeHTML(epUser).replace('class="badge', 'class="badge user-status-badge');
                }
            } else {
                setTimeout(() => location.reload(), 1000);
            }
        } else {
            showToast(json.error || 'Error', 'error');
        }
    } catch(e) {
        showToast('Network error', 'error');
    } finally {
        _epInFlight = false;
        if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.style.opacity = ''; }
    }
}

// ── BAN ───────────────────────────────────────────────
function epDoBan() {
    if (!epUser) return;
    const radio    = document.querySelector('input[name="ep-ban-type"]:checked');
    const type     = radio ? radio.value : 'permanent';
    const username = epUser.username;

    if (type === 'temporary') {
        const days = parseInt(document.getElementById('ep-ban-days')?.value || '0', 10);
        if (!days || days < 1) { showToast('Enter a valid number of days', 'error'); return; }
        showConfirm(`Ban (${days}d)`, `Ban @${username} for ${days} day${days > 1 ? 's' : ''}?`, 'Ban',
            () => epCall('ban', { days }));
    } else {
        showConfirm('Permanent Ban', `Ban @${username} permanently?`, 'Ban permanently',
            () => epCall('ban', { days: 0 }));
    }
}

function epDoUnban() {
    if (!epUser) return;
    showConfirm('Unban user', `Remove ban from @${epUser.username}?`, 'Unban', () => epCall('unban'));
}

// ── DELETE ────────────────────────────────────────────
function epDoDelete() {
    showConfirm('Delete Account', `Permanently delete @${epUser?.username}? This cannot be undone.`, 'Delete', () => epCall('delete'));
}

// ── BADGE ─────────────────────────────────────────────
function epBadge(badgeId, grant) {
    const action = grant ? 'badge_grant' : 'badge_revoke';
    epCall(action, { badge_id: badgeId }).then(() => {
        const ownedEl  = document.getElementById('epbs-' + badgeId);
        const grantBtn = document.querySelector(`#epbr-${badgeId} .ep-b-grant`);
        const revBtn   = document.querySelector(`#epbr-${badgeId} .ep-b-revoke`);
        if (ownedEl)  ownedEl.style.display = grant ? 'flex' : 'none';
        if (grantBtn) grantBtn.style.display = grant ? 'none' : '';
        if (revBtn)   revBtn.style.display   = grant ? '' : 'none';
        if (epUser) {
            epUser.badges = epUser.badges || [];
            if (grant && !epUser.badges.includes(badgeId)) epUser.badges.push(badgeId);
            if (!grant) epUser.badges = epUser.badges.filter(b => b !== badgeId);
        }
    });
}

// ── TOKENS ────────────────────────────────────────────
function epSetTokens() {
    if (!epUser) return;
    const val = parseInt(document.getElementById('ep-tokens-input')?.value || '-1', 10);
    if (isNaN(val) || val < 0) { showToast('Enter a valid token amount', 'error'); return; }
    epCall('set_tokens', { tokens: val });
}

// ── PREMIUM ───────────────────────────────────────────
function epRefreshPremiumUI(user) {
    const statusEl  = document.getElementById('ep-premium-status');
    const grantUI   = document.getElementById('ep-premium-grant-ui');
    const revokeUI  = document.getElementById('ep-premium-revoke-ui');
    if (!statusEl) return;

    const now       = Date.now();
    const expiresAt = user.premium_expires_at ? new Date(user.premium_expires_at) : null;
    const isActive  = user.is_premium && (!expiresAt || expiresAt.getTime() > now);

    if (isActive) {
        const expStr = expiresAt
            ? 'Expires ' + expiresAt.toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})
            : 'Lifetime';
        statusEl.style.cssText = 'display:flex;align-items:center;gap:.6rem;padding:.55rem .9rem;border-radius:10px;margin-bottom:.85rem;font-size:.8rem;font-weight:600;background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.25);color:#ffd700';
        statusEl.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 2L9.5 8.5H3l5.5 4L6 19l6-4 6 4-2.5-6.5L21 8.5h-6.5L12 2z"/></svg> Premium active &nbsp;&middot;&nbsp; <span style="font-weight:500;color:rgba(255,215,0,.7)">${expStr}</span>`;
        const btn = grantUI ? grantUI.querySelector('button') : null;
        if (btn) btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2L9.5 8.5H3l5.5 4L6 19l6-4 6 4-2.5-6.5L21 8.5h-6.5L12 2z"/></svg> Extend Premium';
        if (revokeUI) revokeUI.style.display = 'block';
    } else {
        statusEl.style.cssText = 'display:flex;align-items:center;gap:.6rem;padding:.55rem .9rem;border-radius:10px;margin-bottom:.85rem;font-size:.8rem;font-weight:600;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.4)';
        statusEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg> No active Premium`;
        const btn2 = grantUI ? grantUI.querySelector('button') : null;
        if (btn2) btn2.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2L9.5 8.5H3l5.5 4L6 19l6-4 6 4-2.5-6.5L21 8.5h-6.5L12 2z"/></svg> Grant Premium';
        if (revokeUI) revokeUI.style.display = 'none';
    }
}

function epGrantPremium() {
    if (!epUser) return;
    const days = parseInt(document.getElementById('ep-premium-days')?.value || '0', 10);
    if (!days || days < 1) { showToast('Enter a valid number of days', 'error'); return; }
    const label = epUser.is_premium ? `Extend Premium by ${days} day(s)?` : `Grant Premium to @${epUser.username} for ${days} day(s)?`;
    showConfirm('Set Premium', label, 'Confirm', () => epCall('set_premium', { days }));
}

function epRevokePremium() {
    if (!epUser) return;
    showConfirm('Revoke Premium', `Remove Premium from @${epUser.username}?`, 'Revoke', () => epCall('set_premium', { days: 0 }));
}

// ── ROLE ──────────────────────────────────────────────
function epSetRole(role) {
    const username = epUser?.username || '';
    const labels   = { user:'User', mod:'Mod', admin:'Admin', owner:'Owner' };
    showConfirm(`Set role: ${labels[role] || role}`, `Set @${username} as ${labels[role] || role}?`, 'Confirm',
        () => epCall('set_role', { role }));
}

// ── CONFIRM ───────────────────────────────────────────
let _confirmCallback = null;
function showConfirm(title, text, btnLabel, callback) {
    _confirmCallback = callback;
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-text').textContent  = text;
    document.getElementById('confirm-btn').textContent   = btnLabel;
    document.getElementById('confirm-modal').classList.add('open');
}
function closeConfirm() {
    document.getElementById('confirm-modal').classList.remove('open');
    _confirmCallback = null;
}
function doConfirm() {
    const btn = document.getElementById('confirm-btn');
    if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
    if (_confirmCallback) _confirmCallback();
    closeConfirm();
}

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeConfirm(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { closeConfirm(); closeEditPanel(); }
    });
});
// ── Whitelist / Maintenance Toggle ───────────────────────────────────────────
// SVG helpers for dynamic label update
const _svgLock   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;margin-right:4px"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
const _svgCheck  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14" style="vertical-align:middle;margin-right:4px"><polyline points="20 6 9 17 4 12"/></svg>';
const _svgWarn   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;margin-right:4px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

function toggleWhitelist() {
    const btn  = document.getElementById('wl-toggle-btn');
    const lbl  = document.getElementById('wl-status-label');
    const card = document.getElementById('whitelist-card');
    if (!btn) return;

    // Detect current state by data attribute (reliable, no emoji dependency)
    const isOn = btn.dataset.state === 'on';

    const title      = isOn ? 'Disable Maintenance?' : 'Enable Maintenance?';
    const confirmMsg = isOn
        ? 'The site will become publicly accessible again.'
        : 'All non-staff users will be blocked from the site.';
    const btnLabel   = isOn ? 'Disable Maintenance' : 'Enable Maintenance';

    showConfirm(title, confirmMsg, btnLabel, async () => {
        btn.disabled = true;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;margin-right:4px;animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0"/></svg> Loading...';
        try {
            const res = await fetch('/api/admin_action.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggle_whitelist' })
            });
            const data = await res.json();
            if (data.success) {
                const nowOn = data.whitelist_enabled;
                // Update button
                btn.dataset.state    = nowOn ? 'on' : 'off';
                btn.innerHTML        = nowOn
                    ? _svgCheck + ' Disable Maintenance'
                    : _svgWarn  + ' Enable Maintenance';
                btn.style.background  = nowOn ? 'rgba(74,222,128,.12)' : 'rgba(239,68,68,.12)';
                btn.style.color       = nowOn ? '#4ade80' : '#ef4444';
                btn.style.borderColor = nowOn ? 'rgba(74,222,128,.35)' : 'rgba(239,68,68,.35)';
                // Update status label
                lbl.innerHTML = nowOn
                    ? _svgLock + ' Maintenance Mode ON'
                    : _svgCheck + ' Normal — Site Open';
                lbl.style.color = nowOn ? '#ff6b6b' : '#4ade80';
                // Update card border
                if (card) card.style.borderColor = nowOn ? 'rgba(255,100,100,.3)' : 'rgba(255,255,255,.07)';
                showToast(data.message, 'success');
            } else {
                showToast(data.error || 'Action failed', 'error');
            }
        } catch (e) {
            showToast('Network error', 'error');
        } finally {
            btn.disabled = false;
        }
    });
}
// ── Toggle x2 Tokens Event ─────────────────────────────────────────────────
function toggleX2Tokens() {
    const btn  = document.getElementById('x2-toggle-btn');
    const lbl  = document.getElementById('x2-status-label');
    const card = document.getElementById('x2-card');
    if (!btn) return;

    const isOn = btn.dataset.state === 'on';
    const title      = isOn ? 'Deactivate x2 Tokens?' : 'Activate x2 Tokens?';
    const confirmMsg = isOn
        ? 'Users will receive normal token amounts (no multiplier).'
        : 'All users will receive DOUBLE tokens on purchases, views and referrals.';
    const btnLabel   = isOn ? 'Deactivate' : 'Activate x2';

    showConfirm(title, confirmMsg, btnLabel, async () => {
        btn.disabled = true;
        btn.textContent = 'Processing...';
        try {
            const res = await fetch('/api/admin_action.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggle_x2_tokens' })
            });
            const data = await res.json();
            if (data.success) {
                const nowOn = data.x2_tokens_enabled;
                btn.dataset.state    = nowOn ? 'on' : 'off';
                btn.innerHTML        = nowOn
                    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Deactivate x2 Tokens'
                    : '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg> Activate x2 Tokens';
                btn.style.background  = nowOn ? 'rgba(74,222,128,.12)' : 'rgba(255,140,0,.12)';
                btn.style.color       = nowOn ? '#4ade80' : '#ff9900';
                btn.style.borderColor = nowOn ? 'rgba(74,222,128,.35)' : 'rgba(255,140,0,.35)';
                if (lbl) {
                    lbl.innerHTML = nowOn
                        ? '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style="color:#ff9900;vertical-align:-2px"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg> ACTIVE — x2 Tokens for everyone'
                        : 'Inactive';
                    lbl.style.color = nowOn ? '#ff9900' : 'rgba(255,255,255,.4)';
                }
                if (card) {
                    card.style.borderColor = nowOn ? 'rgba(255,140,0,.5)' : 'rgba(255,255,255,.07)';
                    card.style.background  = nowOn ? 'linear-gradient(160deg,rgba(255,100,0,.07) 0%,rgba(255,140,0,.03) 100%)' : '';
                }
                showToast(data.message, 'success');
            } else {
                showToast(data.error || 'Action failed', 'error');
            }
        } catch (e) {
            showToast('Network error', 'error');
        } finally {
            btn.disabled = false;
        }
    });
}
// ═══════════════════════════════════════════════════════
// BUNDLES — Owner-only reward bundle management
// ═══════════════════════════════════════════════════════

function bundleBadgeHover(label) {
    const cb = label.querySelector('input[type=checkbox]');
    label.style.borderColor = cb && cb.checked ? 'rgba(16,185,129,.5)' : 'rgba(255,255,255,.09)';
}

// Keep checked badges highlighted
document.addEventListener('change', function(e) {
    if (e.target && e.target.name === 'b_badge') {
        const label = e.target.closest('label');
        if (label) label.style.borderColor = e.target.checked ? 'rgba(16,185,129,.5)' : 'rgba(255,255,255,.09)';
    }
    if (e.target && e.target.name === 'b_effect') {
        const label = e.target.closest('label');
        if (label) label.style.borderColor = e.target.checked ? 'rgba(99,102,241,.45)' : 'rgba(255,255,255,.09)';
    }
});

async function bundleCreate() {
    const name        = (document.getElementById('b-name')         ?.value || '').trim();
    const price       = parseFloat(document.getElementById('b-price')?.value || 0);
    const priceType   = document.getElementById('b-price-type')?.value || 'euro';
    const premiumDays = parseInt(document.getElementById('b-premium-days')?.value || 0);
    const badges      = [...document.querySelectorAll('input[name="b_badge"]:checked')].map(c => c.value);
    const effects     = [...document.querySelectorAll('input[name="b_effect"]:checked')].map(c => c.value);
    const statusEl    = document.getElementById('b-create-status');
    const btn         = document.getElementById('b-create-btn');

    if (!name) { statusEl.textContent = '✗ Bundle name is required.'; statusEl.style.color = '#ff8080'; return; }

    btn.disabled = true; btn.style.opacity = '.6';
    statusEl.textContent = 'Creating...'; statusEl.style.color = 'rgba(255,255,255,.45)';

    try {
        const res  = await fetch('/api/admin_action.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create_bundle', name, price, price_type: priceType, premium_days: premiumDays, badges, effects })
        });
        const data = await res.json();
        if (data.success) {
            statusEl.textContent = '✓ Bundle created!'; statusEl.style.color = '#4ade80';
            showToast('Bundle "' + name + '" created!', 'success');
            // Reset form
            document.getElementById('b-name').value = '';
            document.getElementById('b-price').value = '';
            document.getElementById('b-premium-days').value = '0';
            document.querySelectorAll('input[name="b_badge"], input[name="b_effect"]').forEach(c => {
                c.checked = false;
                const lbl = c.closest('label');
                if (lbl) lbl.style.borderColor = 'rgba(255,255,255,.09)';
            });
            // Inject new bundle row into DOM
            bundleInjectRow(data.bundle_id, name, price, priceType, premiumDays, badges, effects);
            setTimeout(() => { statusEl.textContent = ''; }, 4000);
        } else {
            statusEl.textContent = '✗ ' + (data.error || 'Failed'); statusEl.style.color = '#ff8080';
        }
    } catch(e) {
        statusEl.textContent = '✗ Network error'; statusEl.style.color = '#ff8080';
    }
    btn.disabled = false; btn.style.opacity = '1';
}

function bundleInjectRow(id, name, price, priceType, premiumDays, badges, effects) {
    const wrap = document.getElementById('bundles-items-wrap');
    const empty = document.getElementById('bundles-empty-msg');
    if (empty) empty.remove();

    let wrapEl = wrap;
    if (!wrapEl) {
        const list = document.getElementById('bundles-list');
        if (!list) return;
        const countDiv = document.createElement('div');
        countDiv.style.cssText = 'font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.35);margin-bottom:.75rem';
        countDiv.textContent = '1 bundle(s) created';
        list.appendChild(countDiv);
        wrapEl = document.createElement('div');
        wrapEl.id = 'bundles-items-wrap';
        wrapEl.style.cssText = 'display:flex;flex-direction:column;gap:.65rem';
        list.appendChild(wrapEl);
    }

    const priceStr = priceType === 'euro' ? '€' + price.toFixed(2) : price.toFixed(0) + ' tokens';
    let badgePills = badges.map(b => `<span style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);border-radius:6px;padding:.1rem .45rem;color:#fbbf24;font-size:.7rem">🏅 ${b}</span>`).join('');
    let effectPills = effects.map(e => `<span style="background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);border-radius:6px;padding:.1rem .45rem;color:#a5b4fc;font-size:.7rem">✨ ${e}</span>`).join('');
    let premiumPill = premiumDays > 0 ? `<span style="background:rgba(255,215,0,.1);border:1px solid rgba(255,215,0,.3);border-radius:6px;padding:.1rem .45rem;color:#ffd700;font-weight:600">⭐ ${premiumDays}d Premium</span>` : '';

    const row = document.createElement('div');
    row.className = 'bundle-row';
    row.dataset.bundleId = id;
    row.style.cssText = 'display:flex;align-items:center;gap:1rem;padding:.85rem 1rem;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;flex-wrap:wrap;animation:fadeIn .3s ease';
    row.innerHTML = `
        <div style="flex:1;min-width:180px">
            <div style="font-weight:700;font-size:.9rem;color:#fff;margin-bottom:.25rem">${name}</div>
            <div style="font-size:.75rem;color:rgba(255,255,255,.45);display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
                <span style="background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3);border-radius:6px;padding:.1rem .45rem;color:#10b981;font-weight:700">${priceStr}</span>
                ${premiumPill}${badgePills}${effectPills}
            </div>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem;flex-shrink:0">
            <button onclick="bundleApplyPrompt(${id},'${name.replace(/'/g,"\\'")}')"\n                    style="display:inline-flex;align-items:center;gap:.4rem;padding:.45rem .9rem;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);border-radius:8px;color:#10b981;font-size:.78rem;font-weight:600;cursor:pointer"
                    onmouseover="this.style.background='rgba(16,185,129,.2)'" onmouseout="this.style.background='rgba(16,185,129,.1)'">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>
                Apply to User
            </button>
            <button onclick="bundleDelete(${id},this)"
                    style="display:inline-flex;align-items:center;gap:.4rem;padding:.45rem .75rem;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:8px;color:#ef4444;font-size:.78rem;font-weight:600;cursor:pointer"
                    onmouseover="this.style.background='rgba(239,68,68,.18)'" onmouseout="this.style.background='rgba(239,68,68,.08)'">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
        </div>`;
    wrapEl.prepend(row);
}

function bundleDelete(bundleId, btn) {
    showConfirm('Delete Bundle', 'This bundle will be permanently removed. Users who already received rewards keep them.', 'Delete', async () => {
        try {
            const res  = await fetch('/api/admin_action.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_bundle', target_id: 1, bundle_id: bundleId })
            });
            const data = await res.json();
            if (data.success) {
                const row = btn.closest('.bundle-row');
                if (row) { row.style.opacity = '0'; row.style.transition = 'opacity .3s'; setTimeout(() => row.remove(), 300); }
                showToast('Bundle deleted.', 'success');
            } else {
                showToast(data.error || 'Failed to delete', 'error');
            }
        } catch(e) {
            showToast('Network error', 'error');
        }
    });
}

function bundleApplyPrompt(bundleId, bundleName) {
    window._bundleApplyId = bundleId;
    document.getElementById('bam-bundle-name').textContent = bundleName;
    document.getElementById('bam-target').value = '';
    document.getElementById('bam-status').textContent = '';
    const modal = document.getElementById('bundle-apply-modal');
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('bam-target').focus(), 80);
}

function bundleApplyClose() {
    document.getElementById('bundle-apply-modal').style.display = 'none';
}

async function bundleApplyConfirm() {
    const target   = (document.getElementById('bam-target')?.value || '').trim();
    const statusEl = document.getElementById('bam-status');
    const btn      = document.getElementById('bam-apply-btn');
    if (!target) { statusEl.textContent = '✗ Enter a username or user ID.'; statusEl.style.color = '#ff8080'; return; }

    btn.disabled = true; btn.style.opacity = '.6';
    statusEl.textContent = 'Applying...'; statusEl.style.color = 'rgba(255,255,255,.45)';

    try {
        const res  = await fetch('/api/admin_action.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'apply_bundle', target_id: 1, bundle_id: window._bundleApplyId, target })
        });
        const data = await res.json();
        if (data.success) {
            statusEl.textContent = '✓ Bundle applied to @' + data.user + '!'; statusEl.style.color = '#4ade80';
            showToast('Bundle applied to @' + data.user, 'success');
            setTimeout(bundleApplyClose, 1800);
        } else {
            statusEl.textContent = '✗ ' + (data.error || 'Failed'); statusEl.style.color = '#ff8080';
        }
    } catch(e) {
        statusEl.textContent = '✗ Network error'; statusEl.style.color = '#ff8080';
    }
    btn.disabled = false; btn.style.opacity = '1';
}

// Close apply modal on backdrop click
document.getElementById('bundle-apply-modal')?.addEventListener('click', function(e) {
    if (e.target === this) bundleApplyClose();
});