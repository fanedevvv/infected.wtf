<?php
$currentPage = $currentPage ?? 'dashboard-home';
$_isAdmin = isAdmin($pdo);
$_isOwner = isOwner($pdo);
$_isModerator = isModerator($pdo);
?>
<aside class="sidebar" id="sidebar">
    <div class="sidebar-logo-wrap">
        <a href="/dashboard" class="sidebar-logo"><?= SITE_NAME ?></a>
    </div>

    <?php if ($_isModerator): ?>
    <span class="sidebar-label"><?= $_isOwner ? 'Staff' : ($_isAdmin ? 'Staff' : 'Staff') ?></span>
    <a href="/admin" class="sidebar-link <?= $currentPage==='admin'?'active':'' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        Admin Panel
    </a>
    <?php endif; ?>

    <span class="sidebar-label">Main</span>
    <a href="/dashboard" class="sidebar-link <?= $currentPage==='dashboard-home'?'active':'' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        Dashboard
    </a>
    <a href="/leaderboard" class="sidebar-link <?= $currentPage==='leaderboard'?'active':'' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 20 18 10"/><polyline points="12 20 12 4"/><polyline points="6 20 6 14"/></svg>
        Leaderboard
    </a>
    <a href="/dashboard/analytics" class="sidebar-link <?= $currentPage==='analytics'?'active':'' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        Analytics
    </a>
    <a href="/dashboard/shop" class="sidebar-link <?= $currentPage==='shop'?'active':'' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        Shop
    </a>

    <span class="sidebar-label">Profile</span>
    <a href="/dashboard/customize" class="sidebar-link <?= $currentPage==='profile-info'?'active':'' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Customize
    </a>
    <a href="/dashboard/badges" class="sidebar-link <?= $currentPage==='badges'?'active':'' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
        Badges
    </a>
    <a href="/dashboard/links" class="sidebar-link <?= $currentPage==='links'?'active':'' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        Links
    </a>
    <a href="/dashboard/referral" class="sidebar-link <?= $currentPage==='referral'?'active':'' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        Referral
    </a>
    <a href="/dashboard/effects" class="sidebar-link <?= $currentPage==='effects'?'active':'' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        Effects
    </a>
    <a href="/dashboard/integrations" class="sidebar-link <?= $currentPage==='integrations'?'active':'' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/><path d="M9 7h6M9 11h6"/></svg>
        Integrations
    </a>
</aside>
<div class="sidebar-overlay" id="sidebar-overlay" onclick="toggleSidebar()"></div>