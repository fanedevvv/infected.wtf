<?php
requireLogin(); checkBanned($pdo);
$userId  = (int)$_SESSION['user_id'];
$profile = getProfile($pdo, $userId);

// ── Badge definitions — always shown in grid, locked if not earned ──
$allBadges = [
    'owner' => [
        'id'=>'owner','name'=>'Owner','desc'=>'The site owner.',
        'color'=>'#fbbf24','auto'=>false,'admin_only'=>true,
    ],
    'admin' => [
        'id'=>'admin','name'=>'Admin','desc'=>'Platform administrator.',
        'color'=>'#00d4ff','auto'=>false,'admin_only'=>true,
    ],
    'premium' => [
        'id'=>'premium','name'=>'Premium','desc'=>'Active Premium subscriber — supports the platform.',
        'color'=>'#ffd700','auto'=>true,'admin_only'=>false,
    ],
    'og' => [
        'id'=>'og','name'=>'OG','desc'=>'Awarded to one of the first 1,000 users on the platform.',
        'color'=>'#a78bfa','auto'=>true,'admin_only'=>false,
    ],
    'views_master' => [
        'id'=>'views_master','name'=>'Views Master','desc'=>'Your profile is in the top 3 most viewed on the site.',
        'color'=>'#38bdf8','auto'=>true,'admin_only'=>false,
    ],
    'verified' => [
        'id'=>'verified','name'=>'Verified','desc'=>'This account has been verified by the team.',
        'color'=>'#34d399','auto'=>false,'admin_only'=>false,
    ],
    'hall_of_fame' => [
        'id'=>'hall_of_fame','name'=>'Hall of Fame','desc'=>'Reach 1,000 profile views to earn this badge.',
        'color'=>'#f59e0b','auto'=>true,'admin_only'=>false,
    ],
    'champion' => [
        'id'=>'champion','name'=>'Champion','desc'=>'Reach 10,000 views.',
        'color'=>'#c0c0c0','auto'=>true,'admin_only'=>false,
    ],
    'known' => [
        'id'=>'known','name'=>'Known','desc'=>'Show the world you\'re a known figure.',
        'color'=>'#60a5fa','auto'=>false,'shop'=>true,'price'=>250,'admin_only'=>false,
    ],
    'rich' => [
        'id'=>'rich','name'=>'Rich','desc'=>'Flex your wealth with the Rich badge.',
        'color'=>'#fbbf24','auto'=>false,'shop'=>true,'price'=>500,'admin_only'=>false,
    ],
    'trapstar' => [
        'id'=>'trapstar','name'=>'Trapstar','desc'=>'For those who live the trap life.',
        'color'=>'#f97316','auto'=>false,'shop'=>true,'price'=>1000,'admin_only'=>false,
    ],
    'the_killer' => [
        'id'=>'the_killer','name'=>'The Killer','desc'=>'The most exclusive badge on the platform.',
        'color'=>'#ef4444','auto'=>false,'shop'=>true,'price'=>1500,'admin_only'=>false,
    ],
    'discord' => [
        'id'=>'discord','name'=>'Discord','desc'=>'Awarded after linking your Discord account.',
        'color'=>'#5865F2','auto'=>true,'admin_only'=>false,'automatic'=>true,
    ],
    'booster' => [
        'id'=>'booster','name'=>'Server Booster','desc'=>'Automatically granted when you boost our Discord server.',
        'color'=>'#ff73fa','auto'=>true,'admin_only'=>false,'automatic'=>true,
    ],
    // ── Badge-uri noi v2 ──────────────────────────────────────────────────────
    'lover' => [
        'id'=>'lover','name'=>'Lover','desc'=>'Show your love.',
        'color'=>'#ff6ba0','auto'=>false,'shop'=>true,'price'=>300,'admin_only'=>false,
    ],
    'fresh' => [
        'id'=>'fresh','name'=>'Fresh','desc'=>'Stay fresh.',
        'color'=>'#a8d8ff','auto'=>false,'shop'=>true,'price'=>50,'admin_only'=>false,
    ],
    'crew' => [
        'id'=>'crew','name'=>'Crew','desc'=>'Your ideas shaped this platform.',
        'color'=>'#8b5cf6','auto'=>false,'admin_only'=>true,
    ],
    'billionaire' => [
        'id'=>'billionaire','name'=>'Billionaire','desc'=>'Spent over $10 in the shop.',
        'color'=>'#6aff99','auto'=>false,'admin_only'=>true,
    ],
    'content_creator' => [
        'id'=>'content_creator','name'=>'Content Creator','desc'=>'Awarded to exceptional content creators by the team.',
        'color'=>'#4ade80','auto'=>false,'admin_only'=>true,
    ],
    'designer' => [
        'id'=>'designer','name'=>'Designer','desc'=>'Awarded to talented designers by the team.',
        'color'=>'#f472b6','auto'=>false,'admin_only'=>true,
    ],
    // promoter_elite nu mai apare ca card separat — e 2-in-1 cu promoter
    'promoter' => [
        'id'=>'promoter','name'=>'Promoter','desc'=>'Invite 10 people to unlock. Invite 20 to upgrade to Elite.',
        'color'=>'#9ca3af','auto'=>true,'admin_only'=>false,'automatic'=>true,
    ],
];

// Get earned badges (all, with hidden flags)
$earnedBadges = getUserBadges($pdo, $userId);
$earned = array_column($earnedBadges, 'id');

// Fetch badge_hidden and badge_order JSON directly (covers premium, owner, admin too)
$hiddenJsonStmt = $pdo->prepare("SELECT COALESCE(badge_hidden,'[]'), COALESCE(badge_order,'[]') FROM profiles WHERE user_id=?");
$hiddenJsonStmt->execute([$userId]);
$hiddenOrderRow  = $hiddenJsonStmt->fetch(PDO::FETCH_NUM);
$allHiddenSet    = array_flip(json_decode($hiddenOrderRow[0] ?? '[]', true) ?: []);
$badgeOrderJson  = $hiddenOrderRow[1] ?? '[]';

// Auto-add premium if user is premium
$isPremiumUser = !empty($profile['is_premium']) && (empty($profile['premium_expires_at']) || strtotime($profile['premium_expires_at']) > time());
if ($isPremiumUser && !in_array('premium', $earned)) $earned[] = 'premium';

// Auto-add owner/admin based on role
$roleStmt = $pdo->prepare("SELECT is_owner, is_admin FROM users WHERE id=?");
$roleStmt->execute([$userId]);
$roleRow = $roleStmt->fetch();
if (!empty($roleRow['is_owner']) && !in_array('owner', $earned)) $earned[] = 'owner';
if (!empty($roleRow['is_admin']) && !in_array('admin', $earned)) $earned[] = 'admin';

// Auto-add discord badge daca userul are integrarea Discord conectata
$discordIntStmt = $pdo->prepare("SELECT 1 FROM integrations WHERE user_id=? AND type='discord' LIMIT 1");
$discordIntStmt->execute([$userId]);
if ($discordIntStmt->fetchColumn() && !in_array('discord', $earned)) $earned[] = 'discord';

// Auto-add booster badge daca userul il are in profiles.badges JSON
$boosterCheckStmt = $pdo->prepare("SELECT COALESCE(badges,'[]') FROM profiles WHERE user_id=?");
$boosterCheckStmt->execute([$userId]);
$boosterBadgesJson = json_decode($boosterCheckStmt->fetchColumn() ?: '[]', true) ?: [];
if (in_array('booster', $boosterBadgesJson) && !in_array('booster', $earned)) $earned[] = 'booster';

// Auto-add / upgrade promoter badges based on referral count — un singur card (2-in-1)
$refCountBadge = (int)$pdo->query("SELECT COUNT(*) FROM referrals WHERE referrer_id={$userId}")->fetchColumn();
$isPromoterElite = false;

if ($refCountBadge >= 20) {
    $isPromoterElite = true;
    // Asigurăm că earned conține 'promoter' (cardul unic) și nu promoter_elite separat
    if (!in_array('promoter', $earned)) $earned[] = 'promoter';
    $earned = array_values(array_filter($earned, fn($b) => $b !== 'promoter_elite'));
    // Sync DB: păstrăm promoter_elite în JSON pentru getProfileBadges, dar scoatem promoter duplicat
    $badgesJsonNow = json_decode($pdo->query("SELECT COALESCE(badges,'[]') FROM profiles WHERE user_id={$userId}")->fetchColumn() ?: '[]', true) ?: [];
    if (!in_array('promoter_elite', $badgesJsonNow)) {
        $badgesJsonNow[] = 'promoter_elite';
        $badgesJsonNow = array_values(array_filter($badgesJsonNow, fn($b) => $b !== 'promoter'));
        $pdo->prepare("UPDATE profiles SET badges=? WHERE user_id=?")->execute([json_encode($badgesJsonNow), $userId]);
    }
} elseif ($refCountBadge >= 10) {
    if (!in_array('promoter', $earned)) $earned[] = 'promoter';
    // Sync DB
    $badgesJsonNow = json_decode($pdo->query("SELECT COALESCE(badges,'[]') FROM profiles WHERE user_id={$userId}")->fetchColumn() ?: '[]', true) ?: [];
    if (!in_array('promoter', $badgesJsonNow)) {
        $badgesJsonNow[] = 'promoter';
        $pdo->prepare("UPDATE profiles SET badges=? WHERE user_id=?")->execute([json_encode($badgesJsonNow), $userId]);
    }
}

// Override display-ul cardului promoter dacă e elite
if ($isPromoterElite && isset($allBadges['promoter'])) {
    $allBadges['promoter']['name']  = 'Promoter Elite';
    $allBadges['promoter']['desc']  = 'Invited 20+ people — upgraded referral badge.';
    $allBadges['promoter']['color'] = '#d1d5db';
    $allBadges['promoter']['_elite'] = true;
}

$earnedSet = array_flip($earned);

// Build hidden set — from getUserBadges flags + allHiddenSet for premium/owner/admin
$hiddenSet = [];
foreach ($earnedBadges as $b) if (!empty($b['hidden'])) $hiddenSet[$b['id']] = true;
foreach (['premium', 'owner', 'admin'] as $_sb) {
    if (isset($allHiddenSet[$_sb])) $hiddenSet[$_sb] = true;
}

// ── Sort badges: unlocked first (respecting custom drag order), locked after ──
$orderList = json_decode($badgeOrderJson, true) ?: [];

$unlockedBadges = [];
$lockedBadges   = [];

// 1. Unlocked badges that are in the custom order list — in that order
foreach ($orderList as $bid) {
    if (isset($allBadges[$bid]) && isset($earnedSet[$bid])) {
        $unlockedBadges[$bid] = $allBadges[$bid];
    }
}
// 2. Unlocked badges NOT yet in the order list (owner/admin/premium/newly earned)
foreach ($allBadges as $bid => $b) {
    if (isset($earnedSet[$bid]) && !isset($unlockedBadges[$bid])) {
        $unlockedBadges[$bid] = $b;
    }
}
// 3. Locked badges in original definition order
foreach ($allBadges as $bid => $b) {
    if (!isset($earnedSet[$bid])) {
        $lockedBadges[$bid] = $b;
    }
}

$sortedBadges = array_merge($unlockedBadges, $lockedBadges);

$currentPage = 'badges';
$pageTitle   = 'Badges';
ob_start();
?>

<div class="section-header">
    <h2>Badges</h2>
    <p>Collect badges by being active on the platform.</p>
</div>

<div class="badges-meta">
    <span><?= count($earned) ?> / <?= count($allBadges) ?> unlocked</span>
</div>

<div class="badges-grid" id="badges-grid">
    <?php foreach ($sortedBadges as $b):
        $unlocked    = isset($earnedSet[$b['id']]);
        $isHidden    = $unlocked && isset($hiddenSet[$b['id']]);
        $isEliteCard = !empty($b['_elite']); // promoter upgraded to elite
        // pentru drag/visibility, cardul elite salvează ordinea ca 'promoter_elite'
        $cardDataBadge = ($isEliteCard) ? 'promoter_elite' : $b['id'];
    ?>
    <div class="badge-card <?= $unlocked ? 'unlocked' : 'locked' ?> <?= $isHidden ? 'badge-hidden-card' : '' ?> <?= $isEliteCard ? 'promoter-elite-card' : '' ?>"
         data-badge="<?= $cardDataBadge ?>"
         data-color="<?= $b['color'] ?>"
         data-unlocked="<?= $unlocked ? '1' : '0' ?>"
         style="--bc:<?= $b['color'] ?>;position:relative">

        <?php if (!$unlocked): ?>
        <div class="badge-card-lock">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <?php endif; ?>

        <?php if ($unlocked): ?>
        <div class="badge-move-btn" title="Drag to reorder" data-bid="<?= $cardDataBadge ?>">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M5 9l7-7 7 7M5 15l7 7 7-7"/></svg>
        </div>
        <?php endif; ?>

        <div class="badge-card-icon">
            <?= $isEliteCard ? getBadgeSvg('promoter_elite') : getBadgeSvg($b['id']) ?>
        </div>

        <div class="badge-card-name">
            <?= htmlspecialchars($b['name']) ?>
        </div>
        <div class="badge-card-desc"><?= htmlspecialchars($b['desc']) ?></div>

        <div class="badge-card-status">
            <?= $unlocked ? 'OWNED' : 'LOCKED' ?>
        </div>

        <?php if ($unlocked): ?>
        <div class="badge-toggle-wrap" title="<?= $isHidden ? 'Shown on profile: OFF' : 'Shown on profile: ON' ?>">
            <label class="badge-toggle-label">
                <span class="badge-toggle-text"><?= $isHidden ? 'Hidden' : 'Visible' ?></span>
                <div class="badge-toggle-switch <?= $isHidden ? '' : 'active' ?>"
                     onclick="toggleBadgeVisibility('<?= $cardDataBadge ?>', this)">
                    <div class="badge-toggle-knob"></div>
                </div>
            </label>
        </div>
        <?php endif; ?>
    </div>
    <?php endforeach; ?>
</div>

<!-- Badge Order Info -->
<div style="margin-top:1.2rem;padding:.85rem 1.1rem;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;font-size:.78rem;color:rgba(255,255,255,.45);display:flex;align-items:center;gap:.5rem">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
    Click the arrows icon on an unlocked badge to drag and reorder how they appear on your profile.
</div>

<style>
.badge-card { cursor:default; }
.badge-move-btn {
    position:absolute;top:.55rem;right:.55rem;
    width:24px;height:24px;border-radius:6px;
    background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);
    display:flex;align-items:center;justify-content:center;
    cursor:grab;color:rgba(255,255,255,.5);
    transition:background .2s,color .2s;z-index:2;
}
.badge-move-btn:hover { background:rgba(255,255,255,.15);color:#fff; }
.badge-move-btn:active { cursor:grabbing; }

/* Toggle switch */
.badge-toggle-wrap {
    margin-top:.6rem;display:flex;justify-content:center;
}
.badge-toggle-label {
    display:flex;align-items:center;gap:.5rem;cursor:pointer;
}
.badge-toggle-text {
    font-size:.68rem;font-weight:600;text-transform:uppercase;
    letter-spacing:.06em;color:rgba(255,255,255,.4);
    min-width:38px;text-align:right;
}
.badge-toggle-switch {
    width:38px;height:20px;border-radius:20px;
    background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);
    position:relative;cursor:pointer;
    transition:background .25s,border-color .25s;
}
.badge-toggle-switch.active {
    background:rgba(0,212,255,.25);border-color:rgba(0,212,255,.5);
}
.badge-toggle-knob {
    position:absolute;top:2px;left:2px;
    width:14px;height:14px;border-radius:50%;
    background:rgba(255,255,255,.5);
    transition:transform .25s,background .25s;
}
.badge-toggle-switch.active .badge-toggle-knob {
    transform:translateX(18px);background:#00d4ff;
}

/* Hidden badge card dimmed */
.badge-hidden-card { opacity:.55; }

/* Drag-over highlight */
.badge-card.drag-over { outline:2px dashed rgba(0,212,255,.6);outline-offset:2px; }
.badge-card.dragging  { opacity:.35;transform:scale(.97); }

/* Elite pill inside badge name */
.elite-pill {
    display:inline-block;margin-left:.4rem;
    font-size:.58rem;font-weight:800;letter-spacing:.09em;
    padding:.15rem .45rem;border-radius:20px;vertical-align:middle;
    background:linear-gradient(135deg,rgba(209,213,219,.2),rgba(75,85,99,.3));
    border:1px solid rgba(209,213,219,.45);color:#d1d5db;
    text-transform:uppercase;line-height:1.2;
}

/* Elite card — subtle gradient border glow */
.promoter-elite-card.unlocked {
    background:linear-gradient(135deg,rgba(75,85,99,.18),rgba(31,41,55,.25)) !important;
    border-color:rgba(209,213,219,.4) !important;
    box-shadow:0 0 18px rgba(156,163,175,.12);
}
</style>

<script>
// ── Badge SVGs (JS side for modal) ───────────────────────────────────────────
function getBadgeSvgStr(id) {
    const svgs = {
        owner:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3H5v1h14v-1z"/></svg>`,
        admin:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z"/></svg>`,
        premium:`<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.25)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" opacity=".8"/></svg>`,
        og:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.09 6.26L21 9.27l-5 4.87 1.18 6.88L12 17.77l-5.18 3.25L8 14.14 3 9.27l6.91-1.01L12 2z"/></svg>`,
        views_master:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`,
        verified:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`,
        hall_of_fame:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H8v2h8v-2h-3v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/></svg>`,
        champion:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="rgba(192,192,192,.15)"/><path d="M8 12l2.5 2.5L16 9" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 6l1.5 1.5M18 6l-1.5 1.5M6 18l1.5-1.5M18 18l-1.5-1.5" stroke-linecap="round" opacity=".5"/></svg>`,
        known:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`,
        rich:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>`,
        trapstar:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>`,
        the_killer:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C7.58 2 4 5.58 4 10c0 2.84 1.49 5.34 3.73 6.76.18.11.27.31.27.52V19c0 1.1.9 2 2 2v-2h1.5v2h1v-2H14v2c1.1 0 2-.9 2-2v-1.72c0-.21.09-.41.27-.52C18.51 15.34 20 12.84 20 10c0-4.42-3.58-8-8-8zM9 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>`,
        discord:`<svg viewBox="0 0 127.14 96.36" fill="currentColor"><path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"/></svg>`,
        booster:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.13 22.19L11.5 18.36C13.07 17.78 14.54 17 15.9 16.09L13.13 22.19M5.64 12.5L1.81 10.87L7.91 8.1C7 9.46 6.22 10.93 5.64 12.5M21.61 2.39C21.61 2.39 16.66.269 11 5.93C8.81 8.12 7.5 10.53 6.65 12.64C6.37 13.39 6.56 14.21 7.11 14.77L9.24 16.89C9.79 17.45 10.61 17.63 11.36 17.35C13.5 16.53 15.88 15.19 18.07 13C23.73 7.34 21.61 2.39 21.61 2.39M14.54 9.46C13.76 8.68 13.76 7.41 14.54 6.63S16.59 5.85 17.37 6.63C18.14 7.41 18.15 8.68 17.37 9.46C16.59 10.24 15.32 10.24 14.54 9.46M8.88 16.53L7.47 15.12L8.88 16.53M6.24 22L9.88 18.36C9.54 18.27 9.21 18.12 8.91 17.91L4.83 22H6.24M2 22H3.41L8.18 17.24L6.76 15.83L2 20.59V22M7 22H8.41L9.5 20.92L8.09 19.5L7 20.59V22Z"/></svg>`,
        lover:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/></svg>`,
        fresh:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-5 8z"/></svg>`,
        crew:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.92 5L2 20l5-5h4l8-8-4-4-8 8V7.5L6.92 5zM20 2l2 2-2.5 2.5-2-2L20 2z"/></svg>`,
        billionaire:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>`,
        promoter:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"/></svg>`,
        promoter_elite:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"/></svg>`,
        content_creator:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/><path d="M9 3L7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9zm3 14a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/></svg>`,
        designer:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a1 1 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96a1 1 0 0 0 0-1.41z"/></svg>`,
    };
    return svgs[id] || '';
}

// ── Toggle badge visibility ────────────────────────────────────────────────────
function toggleBadgeVisibility(badgeId, switchEl) {
    const isActive = switchEl.classList.contains('active');
    const newHidden = isActive; // currently visible → will be hidden
    const textEl = switchEl.previousElementSibling;

    fetch('/api/badge_settings.php', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({action:'toggle_hidden', badge_id: badgeId, hidden: newHidden})
    })
    .then(r => r.json())
    .then(d => {
        if (d.success) {
            if (newHidden) {
                switchEl.classList.remove('active');
                textEl.textContent = 'Hidden';
                switchEl.closest('.badge-card').classList.add('badge-hidden-card');
            } else {
                switchEl.classList.add('active');
                textEl.textContent = 'Visible';
                switchEl.closest('.badge-card').classList.remove('badge-hidden-card');
            }
        } else {
            alert(d.error || 'Error updating badge visibility.');
        }
    })
    .catch(() => alert('Network error.'));
}

// ── Badge drag-to-reorder ─────────────────────────────────────────────────────
(function() {
    let dragged = null;
    const grid = document.getElementById('badges-grid');

    grid.querySelectorAll('.badge-move-btn').forEach(btn => {
        const card = btn.closest('.badge-card');
        btn.addEventListener('mousedown', () => { card.setAttribute('draggable', 'true'); });
        btn.addEventListener('mouseup', () => { card.setAttribute('draggable', 'false'); });
    });

    grid.addEventListener('dragstart', e => {
        const card = e.target.closest('.badge-card');
        if (!card || card.dataset.unlocked !== '1') { e.preventDefault(); return; }
        dragged = card;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });

    grid.addEventListener('dragend', e => {
        const card = e.target.closest('.badge-card');
        if (card) card.classList.remove('dragging');
        grid.querySelectorAll('.badge-card').forEach(c => c.classList.remove('drag-over'));
        saveOrder();
    });

    grid.addEventListener('dragover', e => {
        e.preventDefault();
        const target = e.target.closest('.badge-card');
        if (!target || target === dragged || target.dataset.unlocked !== '1') return;
        grid.querySelectorAll('.badge-card').forEach(c => c.classList.remove('drag-over'));
        target.classList.add('drag-over');
    });

    grid.addEventListener('drop', e => {
        e.preventDefault();
        const target = e.target.closest('.badge-card');
        if (!target || target === dragged || target.dataset.unlocked !== '1') return;
        target.classList.remove('drag-over');

        // Insert dragged before or after target based on mouse position
        const rect = target.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        if (e.clientX < midX) {
            grid.insertBefore(dragged, target);
        } else {
            grid.insertBefore(dragged, target.nextSibling);
        }
    });

    function saveOrder() {
        const order = [...grid.querySelectorAll('.badge-card[data-unlocked="1"]')]
                        .map(c => c.dataset.badge);
        fetch('/api/badge_settings.php', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({action:'save_order', order})
        });
    }
})();

// ── Color unlocked cards ──────────────────────────────────────────────────────
(function(){
    function hexToRgb(hex){ const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return {r,g,b}; }
    document.querySelectorAll('.badge-card.unlocked[data-color]').forEach(card => {
        const c = hexToRgb(card.dataset.color);
        card.style.borderColor = `rgba(${c.r},${c.g},${c.b},0.35)`;
        card.style.background  = `rgba(${c.r},${c.g},${c.b},0.06)`;
        const st = card.querySelector('.badge-card-status');
        if (st) { st.style.background = `rgba(${c.r},${c.g},${c.b},0.15)`; st.style.color = card.dataset.color; st.style.borderColor = `rgba(${c.r},${c.g},${c.b},0.3)`; }
        const nm = card.querySelector('.badge-card-name');
        if (nm) nm.style.color = card.dataset.color;
        const ic = card.querySelector('.badge-card-icon');
        if (ic) ic.style.color = card.dataset.color;
        card.addEventListener('mouseenter', () => { card.style.borderColor = card.dataset.color; card.style.boxShadow = `0 12px 30px rgba(${c.r},${c.g},${c.b},0.2)`; });
        card.addEventListener('mouseleave', () => { card.style.borderColor = `rgba(${c.r},${c.g},${c.b},0.35)`; card.style.boxShadow = ''; });
    });
})();
</script>

<?php
$pageContent = ob_get_clean();
require VIEWS_PATH . '/layouts/app.php';

// ── helper: badge SVG (server-side for profile too) ─────────────────────────
function getBadgeSvg(string $id): string {
    $svgs = [
        'premium'      => '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.25)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" opacity=".8"/></svg>',
        'og'           => '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.09 6.26L21 9.27l-5 4.87 1.18 6.88L12 17.77l-5.18 3.25L8 14.14 3 9.27l6.91-1.01L12 2z"/></svg>',
        'views_master' => '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>',
        'verified'     => '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>',
        'owner'        => '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3H5v1h14v-1z"/></svg>',
        'admin'        => '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z"/></svg>',
        'hall_of_fame' => '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H8v2h8v-2h-3v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/></svg>',
        'champion'     => '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.5 6.5 5 5l2 5H4l2.5 4h11L20 10h-3l2-5-4.5 1.5L12 2z" opacity=".9"/><rect x="7" y="19" width="10" height="2" rx="1"/><rect x="8.5" y="16" width="7" height="2.5" rx=".8"/></svg>',
        'known'        => '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>',
        'rich'         => '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>',
        'trapstar'     => '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>',
        'the_killer'   => '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C7.58 2 4 5.58 4 10c0 2.84 1.49 5.34 3.73 6.76.18.11.27.31.27.52V19c0 1.1.9 2 2 2v-2h1.5v2h1v-2H14v2c1.1 0 2-.9 2-2v-1.72c0-.21.09-.41.27-.52C18.51 15.34 20 12.84 20 10c0-4.42-3.58-8-8-8zM9 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>',
        'discord'      => '<svg viewBox="0 0 127.14 96.36" fill="currentColor"><path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"/></svg>',
        'booster'      => '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.13 22.19L11.5 18.36C13.07 17.78 14.54 17 15.9 16.09L13.13 22.19M5.64 12.5L1.81 10.87L7.91 8.1C7 9.46 6.22 10.93 5.64 12.5M21.61 2.39C21.61 2.39 16.66.269 11 5.93C8.81 8.12 7.5 10.53 6.65 12.64C6.37 13.39 6.56 14.21 7.11 14.77L9.24 16.89C9.79 17.45 10.61 17.63 11.36 17.35C13.5 16.53 15.88 15.19 18.07 13C23.73 7.34 21.61 2.39 21.61 2.39M14.54 9.46C13.76 8.68 13.76 7.41 14.54 6.63S16.59 5.85 17.37 6.63C18.14 7.41 18.15 8.68 17.37 9.46C16.59 10.24 15.32 10.24 14.54 9.46M8.88 16.53L7.47 15.12L8.88 16.53M6.24 22L9.88 18.36C9.54 18.27 9.21 18.12 8.91 17.91L4.83 22H6.24M2 22H3.41L8.18 17.24L6.76 15.83L2 20.59V22M7 22H8.41L9.5 20.92L8.09 19.5L7 20.59V22Z"/></svg>',
        'lover'        => '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/></svg>',
        'fresh'        => '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-5 8z"/></svg>',
        'crew'         => '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.92 5L2 20l5-5h4l8-8-4-4-8 8V7.5L6.92 5zM20 2l2 2-2.5 2.5-2-2L20 2z"/></svg>',
        'billionaire'  => '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>',
        'promoter'     => '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"/></svg>',
        'promoter_elite' => '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"/><path d="M9.5 4.5l.6 1.8 1.9.1-1.5 1.1.5 1.8-1.5-1-1.5 1 .5-1.8-1.5-1.1 1.9-.1z" opacity=".9"/></svg>',
        'content_creator' => '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/><path d="M9 3L7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9zm3 14a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/></svg>',
        'designer'        => '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a1 1 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96a1 1 0 0 0 0-1.41z"/></svg>',
    ];
    return $svgs[$id] ?? '';
}