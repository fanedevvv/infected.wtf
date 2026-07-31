<?php
requireLogin(); checkBanned($pdo);
$userId  = (int)$_SESSION['user_id'];
$profile = getProfile($pdo, $userId);

$isPremium = !empty($profile['is_premium']) && (empty($profile['premium_expires_at']) || strtotime($profile['premium_expires_at']) > time());

$currentPage = 'analytics';
$pageTitle   = 'Analytics';
ob_start();

if (!$isPremium): ?>
<style>
/* ── Premium gate – analytics ─────────────────────── */
.pg-wrap {
    display: flex; align-items: center; justify-content: center;
    min-height: 72vh; padding: 2rem;
}
.pg-card {
    position: relative; text-align: center;
    max-width: 480px; width: 100%;
    background: linear-gradient(160deg, rgba(255,215,0,.06) 0%, rgba(20,16,8,.98) 100%);
    border: 1px solid rgba(255,215,0,.18);
    border-radius: 24px;
    padding: 3rem 2.5rem 2.5rem;
    box-shadow: 0 0 80px rgba(255,215,0,.07), 0 30px 60px rgba(0,0,0,.5);
    overflow: hidden;
}
/* ambient glow blob */
.pg-card::before {
    content: '';
    position: absolute; top: -60px; left: 50%; transform: translateX(-50%);
    width: 260px; height: 260px; border-radius: 50%;
    background: radial-gradient(circle, rgba(255,215,0,.18) 0%, transparent 70%);
    pointer-events: none;
}
/* faint grid lines */
.pg-card::after {
    content: '';
    position: absolute; inset: 0; border-radius: 24px;
    background-image:
        linear-gradient(rgba(255,215,0,.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,215,0,.04) 1px, transparent 1px);
    background-size: 40px 40px;
    mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent);
    pointer-events: none;
}
.pg-icon-ring {
    position: relative; z-index: 1;
    width: 88px; height: 88px; border-radius: 50%; margin: 0 auto 1.75rem;
    background: linear-gradient(135deg, #ffd700, #ff9900);
    box-shadow: 0 0 0 12px rgba(255,215,0,.08), 0 0 40px rgba(255,215,0,.3);
    display: flex; align-items: center; justify-content: center;
    animation: pg-float 3.5s ease-in-out infinite;
}
@keyframes pg-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
.pg-title {
    position: relative; z-index: 1;
    font-family: 'Syne', sans-serif; font-size: 1.75rem; font-weight: 900;
    color: #fff; margin: 0 0 .75rem; line-height: 1.15;
}
.pg-desc {
    position: relative; z-index: 1;
    color: rgba(255,255,255,.45); font-size: .9rem; line-height: 1.65;
    margin: 0 0 2rem;
}
.pg-btn {
    position: relative; z-index: 1;
    display: inline-flex; align-items: center; gap: .55rem;
    padding: .85rem 2.25rem;
    background: linear-gradient(135deg, #ffd700, #ff9900);
    color: #0a0806; font-weight: 800; border-radius: 14px;
    text-decoration: none; font-family: 'Outfit', sans-serif; font-size: .95rem;
    letter-spacing: .01em;
    box-shadow: 0 8px 24px rgba(255,180,0,.3);
    transition: opacity .2s, transform .2s, box-shadow .2s;
}
.pg-btn:hover { opacity: .9; transform: translateY(-2px); box-shadow: 0 12px 32px rgba(255,180,0,.4); }
</style>
<div class="pg-wrap">
    <div class="pg-card">
        <div class="pg-icon-ring">
            <svg viewBox="0 0 24 24" fill="none" stroke="#0a0806" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="38" height="38"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <div class="pg-title">Analytics is Premium only</div>
        <p class="pg-desc">Upgrade to Premium to unlock detailed profile analytics — views by country, browser, device, and more.</p>
        <a href="/dashboard/shop#premium" class="pg-btn">
            Upgrade to Premium
        </a>
    </div>
</div>
<?php else: ?>

<style>
/* ── Analytics page ─────────────────────────────── */
.an-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem;
}
.an-header-left h2 {
    font-family: 'Syne', sans-serif; font-size: 1.5rem; font-weight: 700;
    display: flex; align-items: center; gap: .6rem; margin-bottom: .25rem;
}
.an-header-left h2 svg { color: var(--accent); }
.an-header-left p { color: var(--text-muted); font-size: .875rem; }

/* Range tabs */
.an-range-tabs { display: flex; gap: .4rem; background: rgba(255,255,255,.04); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: .3rem; }
.an-range-tab {
    padding: .4rem .9rem; border-radius: 6px; font-size: .8rem; font-weight: 600;
    cursor: pointer; color: var(--text-muted); background: none; border: none;
    font-family: 'Outfit', sans-serif; transition: all .2s; letter-spacing: .02em;
}
.an-range-tab:hover { color: var(--text); }
.an-range-tab.active { background: rgba(0,212,255,.12); color: var(--accent); box-shadow: 0 0 0 1px rgba(0,212,255,.25); }

/* Stat cards */
.an-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
.an-stat {
    background: var(--glass); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 1.25rem 1.5rem; position: relative; overflow: hidden; transition: border-color .2s;
}
.an-stat::before {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(0,212,255,.04) 0%, transparent 60%);
    pointer-events: none;
}
.an-stat:hover { border-color: rgba(0,212,255,.25); }
.an-stat-icon {
    width: 36px; height: 36px; border-radius: 10px;
    background: rgba(0,212,255,.1); border: 1px solid rgba(0,212,255,.15);
    display: flex; align-items: center; justify-content: center; margin-bottom: .875rem;
}
.an-stat-icon svg { width: 17px; height: 17px; color: var(--accent); }
.an-stat-icon.icon-pink  { background: rgba(255,0,255,.1);  border-color: rgba(255,0,255,.15); }
.an-stat-icon.icon-pink  svg { color: var(--accent2); }
.an-stat-icon.icon-green { background: rgba(0,200,100,.1);  border-color: rgba(0,200,100,.15); }
.an-stat-icon.icon-green svg { color: #00c864; }
.an-stat-icon.icon-amber { background: rgba(255,180,0,.1);  border-color: rgba(255,180,0,.15); }
.an-stat-icon.icon-amber svg { color: #ffb400; }
.an-stat-value {
    font-family: 'Space Mono', monospace; font-size: 2rem; font-weight: 700;
    color: var(--text); line-height: 1; margin-bottom: .3rem;
    transition: color .3s;
}
.an-stat-label { font-size: .72rem; text-transform: uppercase; letter-spacing: .08em; color: var(--text-muted); font-weight: 600; }
.an-stat-sub { font-size: .75rem; color: var(--text-muted); margin-top: .4rem; display: flex; align-items: center; gap: .25rem; }
.an-stat-sub .badge-up   { color: #00c864; font-weight: 700; }
.an-stat-sub .badge-neut { color: var(--text-muted); }

/* Charts row */
.an-charts-row { display: grid; grid-template-columns: 1fr 320px; gap: 1.25rem; margin-bottom: 1.25rem; }
.an-card {
    background: var(--glass); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.5rem;
}
.an-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
.an-card-title { font-size: .9rem; font-weight: 700; display: flex; align-items: center; gap: .5rem; }
.an-card-title svg { width: 15px; height: 15px; color: var(--accent); }
.an-card-badge {
    font-size: .7rem; font-weight: 600; padding: .2rem .6rem;
    border-radius: 20px; background: rgba(0,212,255,.1); color: var(--accent);
    border: 1px solid rgba(0,212,255,.2);
}

/* Views chart */
.an-chart-wrap { position: relative; height: 220px; }
.an-chart-loading {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    color: var(--text-muted); font-size: .85rem; gap: .5rem;
}

/* Device donut */
.an-donut-wrap { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.an-donut-canvas-wrap { position: relative; width: 160px; height: 160px; }
.an-donut-center {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; pointer-events: none;
}
.an-donut-center-val { font-family: 'Space Mono', monospace; font-size: 1.4rem; font-weight: 700; line-height: 1; }
.an-donut-center-lbl { font-size: .65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: .08em; margin-top: .2rem; }
.an-legend { display: flex; flex-direction: column; gap: .5rem; width: 100%; }
.an-legend-item { display: flex; align-items: center; gap: .6rem; font-size: .8rem; }
.an-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.an-legend-label { color: var(--text-muted); flex: 1; }
.an-legend-val { font-family: 'Space Mono', monospace; font-size: .75rem; color: var(--text); font-weight: 700; }
.an-legend-pct { color: var(--text-muted); font-size: .7rem; }

/* Countries */
.an-countries { }
.an-country-item {
    display: flex; align-items: center; gap: .875rem; padding: .75rem 0;
    border-bottom: 1px solid var(--border);
}
.an-country-item:last-child { border-bottom: none; }
.an-country-flag { width: 28px; height: 20px; border-radius: 4px; object-fit: cover; flex-shrink: 0; border: 1px solid rgba(255,255,255,.1); }
.an-country-flag-fallback {
    width: 28px; height: 20px; border-radius: 4px; background: rgba(255,255,255,.08);
    display: flex; align-items: center; justify-content: center; font-size: .6rem;
    color: var(--text-muted); font-weight: 700; letter-spacing: .04em; flex-shrink: 0; border: 1px solid var(--border);
}
.an-country-info { flex: 1; min-width: 0; }
.an-country-name { font-size: .85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.an-country-bar-wrap { height: 3px; background: rgba(255,255,255,.06); border-radius: 2px; margin-top: .3rem; }
.an-country-bar { height: 100%; border-radius: 2px; background: linear-gradient(90deg, var(--accent), var(--accent2)); transition: width .6s ease; }
.an-country-views { font-family: 'Space Mono', monospace; font-size: .75rem; color: var(--text-muted); white-space: nowrap; flex-shrink: 0; }

/* Bottom 3-col row */
.an-bottom-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; margin-top: 1.25rem; }

/* Generic list used for browsers, OS, links */
.an-list-item {
    display: flex; align-items: center; gap: .875rem; padding: .75rem 0;
    border-bottom: 1px solid var(--border);
}
.an-list-item:last-child { border-bottom: none; }
.an-list-icon {
    width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
    background: rgba(255,255,255,.06); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    font-size: .7rem; font-weight: 700; color: var(--text-muted); letter-spacing: .02em;
}
.an-list-info { flex: 1; min-width: 0; }
.an-list-name { font-size: .85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.an-list-bar-wrap { height: 3px; background: rgba(255,255,255,.06); border-radius: 2px; margin-top: .3rem; }
.an-list-bar { height: 100%; border-radius: 2px; background: linear-gradient(90deg, var(--accent), var(--accent2)); transition: width .6s ease; }
.an-list-stat { font-family: 'Space Mono', monospace; font-size: .75rem; color: var(--text-muted); white-space: nowrap; flex-shrink: 0; }

@media (max-width: 1100px) { .an-bottom-row { grid-template-columns: 1fr 1fr; } }
@media (max-width: 720px)  { .an-bottom-row { grid-template-columns: 1fr; } }
.an-empty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 2.5rem 1rem; color: var(--text-muted); text-align: center; gap: .5rem;
}
.an-empty svg { opacity: .3; margin-bottom: .25rem; }
.an-empty strong { color: var(--text); font-size: .9rem; }
.an-empty span { font-size: .8rem; }

/* Update indicator */
.an-update-pill {
    display: inline-flex; align-items: center; gap: .4rem;
    font-size: .72rem; color: var(--text-muted); padding: .25rem .75rem;
    background: rgba(255,255,255,.04); border: 1px solid var(--border); border-radius: 20px;
}
.an-update-dot { width: 6px; height: 6px; border-radius: 50%; background: #00c864; animation: an-pulse 2s infinite; }
@keyframes an-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

/* Spinner */
.an-spinner {
    width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.1);
    border-top-color: var(--accent); border-radius: 50%; animation: an-spin .7s linear infinite;
}
@keyframes an-spin { to { transform: rotate(360deg); } }

@media (max-width: 1100px) {
    .an-charts-row { grid-template-columns: 1fr; }
    .an-donut-wrap { flex-direction: row; align-items: flex-start; }
}
@media (max-width: 720px) {
    .an-stats { grid-template-columns: 1fr 1fr; }
    .an-header { flex-direction: column; }
    .an-donut-wrap { flex-direction: column; align-items: center; }
}
@media (max-width: 440px) {
    .an-stats { grid-template-columns: 1fr; }
}
</style>

<!-- Header -->
<div class="an-header">
    <div class="an-header-left">
        <h2>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Analytics
        </h2>
        <p>Track your profile performance and visitor insights in real time.</p>
    </div>
    <div style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;">
        <span class="an-update-pill" id="an-update-pill">
            <span class="an-update-dot"></span>
            <span id="an-update-text">Loading…</span>
        </span>
        <div class="an-range-tabs">
            <button class="an-range-tab" data-range="1d">Today</button>
            <button class="an-range-tab" data-range="3d">3 Days</button>
            <button class="an-range-tab active" data-range="7d">7 Days</button>
            <button class="an-range-tab" data-range="30d">30 Days</button>
            <button class="an-range-tab" data-range="90d">90 Days</button>
        </div>
    </div>
</div>

<!-- Stat cards -->
<div class="an-stats">
    <div class="an-stat">
        <div class="an-stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </div>
        <div class="an-stat-value" id="st-total">—</div>
        <div class="an-stat-label">Profile Views</div>
        <div class="an-stat-sub"><span id="st-total-sub" class="badge-neut">in selected range</span></div>
    </div>
    <div class="an-stat">
        <div class="an-stat-icon icon-pink">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="an-stat-value" id="st-avg">—</div>
        <div class="an-stat-label">Daily Average</div>
        <div class="an-stat-sub"><span id="st-avg-sub" class="badge-neut">visitors / day</span></div>
    </div>
    <div class="an-stat">
        <div class="an-stat-icon icon-green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        </div>
        <div class="an-stat-value" id="st-peak">—</div>
        <div class="an-stat-label">Peak Day</div>
        <div class="an-stat-sub"><span class="badge-neut">best single day</span></div>
    </div>
    <div class="an-stat">
        <div class="an-stat-icon icon-amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        </div>
        <div class="an-stat-value" id="st-today">—</div>
        <div class="an-stat-label">Today's Views</div>
        <div class="an-stat-sub"><span class="badge-neut">since midnight</span></div>
    </div>
</div>

<!-- Charts row -->
<div class="an-charts-row">
    <!-- Views over time -->
    <div class="an-card">
        <div class="an-card-header">
            <span class="an-card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                Views Over Time
            </span>
            <span class="an-card-badge" id="chart-range-badge">Last 7 days</span>
        </div>
        <div class="an-chart-wrap">
            <div class="an-chart-loading" id="chart-loading">
                <div class="an-spinner"></div> Loading chart…
            </div>
            <canvas id="an-views-chart" style="display:none"></canvas>
        </div>
    </div>

    <!-- Visitor devices -->
    <div class="an-card">
        <div class="an-card-header">
            <span class="an-card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                Visitor Devices
            </span>
        </div>
        <div class="an-donut-wrap">
            <div class="an-donut-canvas-wrap">
                <canvas id="an-device-chart" width="160" height="160"></canvas>
                <div class="an-donut-center">
                    <span class="an-donut-center-val" id="donut-total">—</span>
                    <span class="an-donut-center-lbl">Visitors</span>
                </div>
            </div>
            <div class="an-legend" id="device-legend">
                <div class="an-legend-item">
                    <span class="an-legend-dot" style="background:var(--accent)"></span>
                    <span class="an-legend-label">Desktop</span>
                    <span class="an-legend-val" id="dev-desktop">—</span>
                    <span class="an-legend-pct" id="dev-desktop-pct"></span>
                </div>
                <div class="an-legend-item">
                    <span class="an-legend-dot" style="background:var(--accent2)"></span>
                    <span class="an-legend-label">Mobile</span>
                    <span class="an-legend-val" id="dev-mobile">—</span>
                    <span class="an-legend-pct" id="dev-mobile-pct"></span>
                </div>
                <div class="an-legend-item">
                    <span class="an-legend-dot" style="background:#00c864"></span>
                    <span class="an-legend-label">Tablet</span>
                    <span class="an-legend-val" id="dev-tablet">—</span>
                    <span class="an-legend-pct" id="dev-tablet-pct"></span>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Countries -->
<div class="an-card">
    <div class="an-card-header">
        <span class="an-card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            Top Countries by Views
        </span>
        <span class="an-card-badge" id="countries-total-badge">—</span>
    </div>
    <div id="countries-list">
        <div class="an-empty">
            <div class="an-spinner"></div>
        </div>
    </div>
</div>

<!-- Bottom row: Browser / OS / Top Links -->
<div class="an-bottom-row">

    <!-- Top Browsers -->
    <div class="an-card">
        <div class="an-card-header">
            <span class="an-card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                Top Browsers
            </span>
            <span class="an-card-badge" id="browsers-badge">—</span>
        </div>
        <div id="browsers-list"><div class="an-empty"><div class="an-spinner"></div></div></div>
    </div>

    <!-- Top OS -->
    <div class="an-card">
        <div class="an-card-header">
            <span class="an-card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                Top OS
            </span>
            <span class="an-card-badge" id="os-badge">—</span>
        </div>
        <div id="os-list"><div class="an-empty"><div class="an-spinner"></div></div></div>
    </div>

    <!-- Top Links -->
    <div class="an-card">
        <div class="an-card-header">
            <span class="an-card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Top Links
            </span>
            <span class="an-card-badge" id="links-badge">—</span>
        </div>
        <div id="links-list"><div class="an-empty"><div class="an-spinner"></div></div></div>
    </div>

</div>

<script>
(function() {
    const accent  = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()  || '#00d4ff';
    const accent2 = getComputedStyle(document.documentElement).getPropertyValue('--accent2').trim() || '#ff00ff';

    function hexToRgb(h) {
        if (!h.startsWith('#')) return '0,212,255';
        return parseInt(h.slice(1,3),16)+','+parseInt(h.slice(3,5),16)+','+parseInt(h.slice(5,7),16);
    }
    const rgb  = hexToRgb(accent);
    const rgb2 = hexToRgb(accent2);

    let viewsChart  = null;
    let deviceChart = null;
    let currentRange = '7d';

    const rangeBadgeLabels = { '1d': 'Today', '3d': 'Last 3 days', '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days' };

    // Init Charts
    const ctxViews  = document.getElementById('an-views-chart').getContext('2d');
    const ctxDevice = document.getElementById('an-device-chart').getContext('2d');

    viewsChart = new Chart(ctxViews, {
        type: 'line',
        data: { labels: [], datasets: [{ data: [], borderColor: accent, borderWidth: 2,
            pointRadius: 4, pointBackgroundColor: accent, pointBorderColor: 'rgba('+rgb+',.3)',
            pointBorderWidth: 2, pointHoverRadius: 6, pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: accent, fill: true,
            backgroundColor: (ctx) => {
                const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 220);
                g.addColorStop(0, 'rgba('+rgb+',.18)');
                g.addColorStop(1, 'rgba('+rgb+',0)');
                return g;
            }, tension: 0.4
        }]},
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(6,6,18,.97)', borderColor: 'rgba(255,255,255,.1)',
                    borderWidth: 1, titleColor: 'rgba(255,255,255,.5)', bodyColor: accent,
                    padding: 12, displayColors: false,
                    callbacks: { title: i => i[0].label, label: i => i.parsed.y + ' views' }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: 'rgba(255,255,255,.3)', font: { size: 11 }, maxTicksLimit: 10 } },
                y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: 'rgba(255,255,255,.3)', font: { size: 11 }, precision: 0, maxTicksLimit: 5 }, beginAtZero: true }
            }
        }
    });

    deviceChart = new Chart(ctxDevice, {
        type: 'doughnut',
        data: {
            labels: ['Desktop', 'Mobile', 'Tablet'],
            datasets: [{ data: [0, 0, 0], backgroundColor: [accent, accent2, '#00c864'],
                borderColor: 'rgba(6,6,18,.97)', borderWidth: 3, hoverOffset: 4 }]
        },
        options: {
            responsive: false, cutout: '72%',
            plugins: { legend: { display: false }, tooltip: {
                backgroundColor: 'rgba(6,6,18,.97)', borderColor: 'rgba(255,255,255,.1)',
                borderWidth: 1, bodyColor: '#f0f0f0', padding: 10, displayColors: true
            }}
        }
    });

    function fmt(n) { return Number(n).toLocaleString(); }
    function pct(val, total) { return total > 0 ? Math.round(val / total * 100) + '%' : '0%'; }

    function emptyHtml(title, sub) {
        return `<div class="an-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36" style="opacity:.25"><circle cx="12" cy="12" r="10"/></svg>
            <strong>${title}</strong><span>${sub}</span>
        </div>`;
    }

    function renderGenericList(listId, badgeId, items, nameKey, unit, iconFn, totalOverride) {
        const total = totalOverride !== null ? totalOverride : (items ? items.reduce((s, i) => s + parseInt(i.cnt), 0) : 0);
        document.getElementById(badgeId).textContent = fmt(total) + ' ' + unit;
        const el = document.getElementById(listId);
        if (!items || items.length === 0) {
            el.innerHTML = emptyHtml('No data yet', 'Data will appear here once visitors arrive.');
            return;
        }
        const topCnt = items[0] ? parseInt(items[0].cnt) : 1;
        el.innerHTML = items.map(item => {
            const name  = item[nameKey] || 'Unknown';
            const cnt   = parseInt(item.cnt);
            const barW  = Math.round((cnt / topCnt) * 100);
            const p     = pct(cnt, total);
            const abbr  = iconFn(item);
            return `<div class="an-list-item">
                <div class="an-list-icon">${abbr}</div>
                <div class="an-list-info">
                    <div class="an-list-name">${name}</div>
                    <div class="an-list-bar-wrap"><div class="an-list-bar" style="width:${barW}%"></div></div>
                </div>
                <div class="an-list-stat">${fmt(cnt)} <span style="color:rgba(240,240,240,.3)">${p}</span></div>
            </div>`;
        }).join('');
    }

    async function loadData(range) {
        // Show loading state
        document.getElementById('chart-loading').style.display = 'flex';
        document.getElementById('an-views-chart').style.display = 'none';
        document.getElementById('an-update-text').textContent = 'Updating…';

        try {
            const res  = await fetch('/api/analytics_data.php?range=' + range);
            const json = await res.json();

            // Stats
            document.getElementById('st-total').textContent = fmt(json.stats.total);
            document.getElementById('st-avg').textContent   = json.stats.daily_avg;
            document.getElementById('st-peak').textContent  = fmt(json.stats.peak);
            document.getElementById('st-today').textContent = fmt(json.stats.today);
            document.getElementById('st-total-sub').textContent = rangeBadgeLabels[range].toLowerCase();
            document.getElementById('chart-range-badge').textContent = rangeBadgeLabels[range];

            // Views chart
            viewsChart.data.labels = json.labels;
            viewsChart.data.datasets[0].data = json.data;
            viewsChart.update('active');
            document.getElementById('chart-loading').style.display = 'none';
            document.getElementById('an-views-chart').style.display = 'block';

            // Device chart
            const devTotal = json.devices.desktop + json.devices.mobile + json.devices.tablet;
            deviceChart.data.datasets[0].data = [json.devices.desktop, json.devices.mobile, json.devices.tablet];
            deviceChart.update();
            document.getElementById('donut-total').textContent = fmt(devTotal);
            document.getElementById('dev-desktop').textContent = fmt(json.devices.desktop);
            document.getElementById('dev-mobile').textContent  = fmt(json.devices.mobile);
            document.getElementById('dev-tablet').textContent  = fmt(json.devices.tablet);
            document.getElementById('dev-desktop-pct').textContent = pct(json.devices.desktop, devTotal);
            document.getElementById('dev-mobile-pct').textContent  = pct(json.devices.mobile, devTotal);
            document.getElementById('dev-tablet-pct').textContent  = pct(json.devices.tablet, devTotal);

            // Countries
            document.getElementById('countries-total-badge').textContent = fmt(json.total_ctr_views) + ' total';
            const list = document.getElementById('countries-list');
            if (!json.countries || json.countries.length === 0) {
                list.innerHTML = `<div class="an-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    <strong>No country data yet</strong>
                    <span>Visit your profile to start collecting country data.</span>
                </div>`;
            } else {
                const topCount = json.countries[0] ? json.countries[0].cnt : 1;
                list.innerHTML = json.countries.map(c => {
                    const barW = Math.round((c.cnt / topCount) * 100);
                    const p    = pct(c.cnt, json.total_ctr_views);
                    const code = (c.code || 'XX').toLowerCase();
                    const flagUrl = 'https://flagcdn.com/24x18/' + code + '.png';
                    return `<div class="an-country-item">
                        <img class="an-country-flag" src="${flagUrl}" alt="${c.code}"
                            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                        <div class="an-country-flag-fallback" style="display:none">${(c.code||'XX').toUpperCase()}</div>
                        <div class="an-country-info">
                            <div class="an-country-name">${c.name || 'Unknown'}</div>
                            <div class="an-country-bar-wrap"><div class="an-country-bar" style="width:${barW}%"></div></div>
                        </div>
                        <div class="an-country-views">${fmt(c.cnt)} <span style="color:rgba(240,240,240,.3)">${p}</span></div>
                    </div>`;
                }).join('');
            }

            // Update pill
            const now = new Date();
            document.getElementById('an-update-text').textContent =
                'Updated ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // --- Browsers ---
            renderGenericList('browsers-list', 'browsers-badge', json.browsers, 'browser', 'views', (item) => {
                const b = (item.browser || 'Unknown').toLowerCase();
                const icons = { chrome:'Ch', firefox:'Ff', safari:'Sa', edge:'Ed', opera:'Op', samsung:'Sa', brave:'Br' };
                const key = Object.keys(icons).find(k => b.includes(k));
                return key ? icons[key] : b.slice(0,2).toUpperCase();
            }, null);

            // --- OS ---
            renderGenericList('os-list', 'os-badge', json.os, 'os_name', 'views', (item) => {
                const o = (item.os_name || 'Unknown').toLowerCase();
                if (o.includes('windows')) return 'Win';
                if (o.includes('mac') || o.includes('ios')) return 'Mac';
                if (o.includes('android')) return 'And';
                if (o.includes('linux')) return 'Lin';
                return o.slice(0,3).toUpperCase();
            }, null);

            // --- Top Links ---
            const totalLC = json.total_link_clicks || 0;
            document.getElementById('links-badge').textContent = fmt(totalLC) + ' clicks';
            const lList = document.getElementById('links-list');
            if (!json.top_links || json.top_links.length === 0) {
                lList.innerHTML = emptyHtml('No link clicks yet', 'Clicks on your links will appear here.');
            } else {
                const topLC = json.top_links[0] ? json.top_links[0].cnt : 1;
                lList.innerHTML = json.top_links.map(l => {
                    const barW = Math.round((l.cnt / topLC) * 100);
                    const p = pct(l.cnt, totalLC);
                    const label = l.link_title || (l.link_url ? new URL(l.link_url).hostname : 'Link');
                    return `<div class="an-list-item">
                        <div class="an-list-icon" style="background:rgba(0,212,255,.08);border-color:rgba(0,212,255,.15);color:var(--accent)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        </div>
                        <div class="an-list-info">
                            <div class="an-list-name">${label}</div>
                            <div class="an-list-bar-wrap"><div class="an-list-bar" style="width:${barW}%"></div></div>
                        </div>
                        <div class="an-list-stat">${fmt(l.cnt)} <span style="color:rgba(240,240,240,.3)">${p}</span></div>
                    </div>`;
                }).join('');
            }

        } catch(e) {
            console.error(e);
            document.getElementById('an-update-text').textContent = 'Error loading data';
        }
    }

    // Range tab click
    document.querySelectorAll('.an-range-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.an-range-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentRange = btn.dataset.range;
            loadData(currentRange);
        });
    });

    // Initial load
    loadData(currentRange);

    // Auto-refresh every 2 minutes
    setInterval(() => loadData(currentRange), 120000);
})();
</script>

<?php endif; ?>
<?php
$pageContent = ob_get_clean();
$extraHead   = '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js"></script>';
require VIEWS_PATH . '/layouts/app.php';