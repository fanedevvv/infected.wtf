<?php
requireLogin(); checkBanned($pdo);
$userId  = (int)$_SESSION['user_id'];
$profile = getProfile($pdo, $userId);

// Auto-generate referral code if user doesn't have one
$codeRow = $pdo->prepare("SELECT referral_code FROM users WHERE id=?");
$codeRow->execute([$userId]);
$myCode = $codeRow->fetchColumn();
if (!$myCode) {
    $myCode = strtoupper(substr(md5($profile['username'] . $userId . time()), 0, 8));
    $pdo->prepare("UPDATE users SET referral_code=? WHERE id=?")->execute([$myCode, $userId]);
}

$refLink = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . '/register?ref=' . $myCode;

// Stats
$totalRefs   = (int)$pdo->prepare("SELECT COUNT(*) FROM referrals WHERE referrer_id=?")->execute([$userId]) ? $pdo->query("SELECT COUNT(*) FROM referrals WHERE referrer_id={$userId}")->fetchColumn() : 0;
$tokensEarned = (int)$pdo->query("SELECT COALESCE(SUM(tokens_given),0) FROM referrals WHERE referrer_id={$userId}")->fetchColumn();

// Pagination
$perPage = 10;
$page    = max(1, (int)($_GET['page'] ?? 1));
$totalRefs = (int)$pdo->query("SELECT COUNT(*) FROM referrals WHERE referrer_id={$userId}")->fetchColumn();
$totalPages = max(1, (int)ceil($totalRefs / $perPage));
$page = min($page, $totalPages);
$offset = ($page - 1) * $perPage;

$refs = $pdo->prepare("
    SELECT r.referred_id, r.tokens_given, r.created_at,
           u.username, p.avatar
    FROM referrals r
    JOIN users u ON u.id = r.referred_id AND u.email_verified = 1
    LEFT JOIN profiles p ON p.user_id = r.referred_id
    WHERE r.referrer_id = ?
    ORDER BY r.created_at DESC
    LIMIT {$perPage} OFFSET {$offset}
");
$refs->execute([$userId]);
$referrals = $refs->fetchAll();

$isPremium = !empty($profile['is_premium']);
$tokensPerRef = $isPremium ? 20 : 10;

// ── X2 tokens event ───────────────────────────────────────────────────────────
$x2Active = false;
try {
    $x2Cols = $pdo->query("SHOW COLUMNS FROM site_settings")->fetchAll(PDO::FETCH_COLUMN);
    if (in_array('x2_tokens_enabled', $x2Cols)) {
        $x2Row = $pdo->query("SELECT x2_tokens_enabled FROM site_settings LIMIT 1")->fetch();
        $x2Active = !empty($x2Row['x2_tokens_enabled']);
    }
} catch (\Exception $_) {}
if ($x2Active) $tokensPerRef *= 2;

// ── Promoter badge progress + auto-grant ──────────────────────────────────────
$earnedBadgesRef  = json_decode($pdo->query("SELECT COALESCE(badges,'[]') FROM profiles WHERE user_id={$userId}")->fetchColumn() ?: '[]', true) ?: [];
$hasPromoter      = in_array('promoter', $earnedBadgesRef);
$hasPromoterElite = in_array('promoter_elite', $earnedBadgesRef);

// Auto-grant / upgrade promoter badges based on referral count
if ($totalRefs >= 20 && !$hasPromoterElite) {
    // Upgrade to elite: add promoter_elite, remove regular promoter
    $earnedBadgesRef = array_values(array_filter($earnedBadgesRef, fn($b) => $b !== 'promoter'));
    if (!in_array('promoter_elite', $earnedBadgesRef)) $earnedBadgesRef[] = 'promoter_elite';
    $pdo->prepare("UPDATE profiles SET badges=? WHERE user_id=?")->execute([json_encode($earnedBadgesRef), $userId]);
    $hasPromoterElite = true;
    $hasPromoter = false;
} elseif ($totalRefs >= 10 && !$hasPromoter && !$hasPromoterElite) {
    // Grant regular promoter
    $earnedBadgesRef[] = 'promoter';
    $pdo->prepare("UPDATE profiles SET badges=? WHERE user_id=?")->execute([json_encode($earnedBadgesRef), $userId]);
    $hasPromoter = true;
}

$currentPage = 'referral'; $pageTitle = 'Referral';
ob_start();
?>

<style>
.ref-hero {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 1rem; margin-bottom: 1.5rem;
}
.ref-stat {
    background: rgba(255,255,255,.03);
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 14px; padding: 1.25rem 1.5rem;
    text-align: center;
}
.ref-stat-num {
    font-family:'Syne',sans-serif; font-size: 1.9rem;
    font-weight: 800; color: #fff; line-height: 1;
    margin-bottom: .3rem;
}
.ref-stat-num.accent { color: var(--accent); }
.ref-stat-label {
    font-size: .68rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: .1em;
    color: rgba(255,255,255,.35);
}
.ref-link-box {
    display: flex; gap: .65rem; align-items: center;
}
.ref-link-input {
    flex: 1; background: rgba(0,212,255,.04);
    border: 1px solid rgba(0,212,255,.2);
    border-radius: 10px; padding: .6rem 1rem;
    font-family: 'Space Mono', monospace;
    font-size: .8rem; color: rgba(255,255,255,.7);
    outline: none; cursor: default; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
}
.ref-copy-btn {
    display: inline-flex; align-items: center; gap: .4rem;
    padding: .6rem 1.1rem; border-radius: 10px;
    font-size: .82rem; font-weight: 700; cursor: pointer;
    border: 1px solid rgba(0,212,255,.35);
    background: rgba(0,212,255,.1); color: var(--accent);
    transition: all .2s; white-space: nowrap; flex-shrink: 0;
}
.ref-copy-btn:hover { background: rgba(0,212,255,.2); transform: translateY(-1px); }
.ref-invited-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 1rem;
}
.ref-invited-title {
    font-size: .72rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: .1em;
    color: rgba(255,255,255,.35);
}
.ref-invited-count {
    width: 22px; height: 22px; border-radius: 50%;
    background: rgba(0,212,255,.12); border: 1px solid rgba(0,212,255,.3);
    color: var(--accent); font-size: .72rem; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
}
.ref-user-row {
    display: flex; align-items: center; gap: .85rem;
    padding: .75rem 0;
    border-bottom: 1px solid rgba(255,255,255,.05);
}
.ref-user-row:last-child { border-bottom: none; }
.ref-user-avatar {
    width: 38px; height: 38px; border-radius: 10px;
    object-fit: cover; background: rgba(255,255,255,.06);
    border: 1px solid rgba(255,255,255,.08); flex-shrink: 0;
}
.ref-user-info { flex: 1; min-width: 0; }
.ref-user-name { font-weight: 700; font-size: .88rem; color: #fff; }
.ref-user-date { font-size: .73rem; color: rgba(255,255,255,.35); margin-top: .1rem; }
.ref-token-badge {
    display: inline-flex; align-items: center; gap: .3rem;
    padding: .3rem .7rem; border-radius: 99px;
    font-size: .75rem; font-weight: 700;
    background: rgba(95,239,165,.1); color: #5fefa5;
    border: 1px solid rgba(95,239,165,.25); flex-shrink: 0;
}
.ref-empty {
    text-align: center; padding: 3rem 1rem;
    color: rgba(255,255,255,.25); font-size: .88rem;
}
.ref-empty svg { display: block; margin: 0 auto 1rem; opacity: .3; }

/* Premium bonus banner */
.ref-premium-banner {
    display: flex; align-items: center; gap: 1rem;
    padding: .9rem 1.2rem; border-radius: 14px; margin-bottom: 1.5rem;
    background: linear-gradient(135deg, rgba(255,215,0,.08), rgba(255,180,0,.04));
    border: 1px solid rgba(255,215,0,.3);
}
.ref-premium-banner-icon {
    width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
    background: rgba(255,215,0,.12); border: 1px solid rgba(255,215,0,.3);
    display: flex; align-items: center; justify-content: center;
}
.ref-premium-banner-text { flex: 1; }
.ref-premium-banner-title {
    font-size: .85rem; font-weight: 800; margin-bottom: .15rem;
    background: linear-gradient(90deg, #ffd700, #fff4a3, #ffd700);
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.ref-premium-banner-sub {
    font-size: .75rem; color: rgba(255,255,255,.45); line-height: 1.4;
}
.ref-premium-badge {
    display: inline-flex; align-items: center; gap: .3rem;
    padding: .35rem .8rem; border-radius: 99px; flex-shrink: 0;
    font-size: .78rem; font-weight: 800;
    background: rgba(255,215,0,.12); color: #ffd700;
    border: 1px solid rgba(255,215,0,.35);
}

/* Non-premium upsell banner */
.ref-upsell-banner {
    display: flex; align-items: center; gap: 1rem;
    padding: .9rem 1.2rem; border-radius: 14px; margin-bottom: 1.5rem;
    background: rgba(255,255,255,.02);
    border: 1px solid rgba(255,255,255,.07);
}
.ref-upsell-icon {
    width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
    background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
    display: flex; align-items: center; justify-content: center;
}
.ref-upsell-text { flex: 1; }
.ref-upsell-title { font-size: .85rem; font-weight: 700; color: rgba(255,255,255,.7); margin-bottom: .15rem; }
.ref-upsell-sub { font-size: .75rem; color: rgba(255,255,255,.35); line-height: 1.4; }
.ref-upsell-link {
    display: inline-flex; align-items: center; gap: .3rem;
    padding: .35rem .8rem; border-radius: 99px; flex-shrink: 0;
    font-size: .78rem; font-weight: 700; text-decoration: none;
    background: rgba(255,215,0,.08); color: rgba(255,215,0,.7);
    border: 1px solid rgba(255,215,0,.2);
    transition: all .2s;
}
.ref-upsell-link:hover { background: rgba(255,215,0,.15); color: #ffd700; border-color: rgba(255,215,0,.4); }

@media (max-width: 580px) {
    .ref-hero { grid-template-columns: 1fr 1fr; }
    .ref-hero .ref-stat:last-child { grid-column: span 2; }
    .ref-premium-banner, .ref-upsell-banner { flex-wrap: wrap; }
}
</style>

<div class="section-header">
    <h2>Referral Program</h2>
    <p>Invite friends and earn <?= $tokensPerRef ?> tokens for each registration</p>
</div>

<!-- ── Promoter Badge Progress Bar ─────────────────────────────────────────── -->
<?php
$phase1Goal = 10; $phase2Goal = 20;
$phase1Done = min($totalRefs, $phase1Goal);
$phase2Done = max(0, min($totalRefs - $phase1Goal, $phase1Goal));
$phase1Pct  = ($phase1Done / $phase1Goal) * 100;
$phase2Pct  = $hasPromoterElite ? 100 : (($phase2Done / $phase1Goal) * 100);
?>
<?php if (!$hasPromoterElite || $totalRefs < 20): ?>
<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:1.25rem 1.4rem;margin-bottom:1.5rem;">
    <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1rem;">
        <div style="width:36px;height:36px;border-radius:10px;background:rgba(156,163,175,.1);border:1px solid rgba(156,163,175,.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg viewBox="0 0 24 24" fill="<?= $hasPromoterElite ? '#4b5563' : '#9ca3af' ?>" width="18" height="18"><path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"/></svg>
        </div>
        <div style="flex:1;">
            <div style="font-size:.82rem;font-weight:800;color:#fff;margin-bottom:.1rem;">
                Promoter Badge
                <?php if ($hasPromoterElite): ?>
                    <span style="margin-left:.5rem;font-size:.7rem;padding:.2rem .55rem;border-radius:20px;background:rgba(75,85,99,.3);border:1px solid rgba(75,85,99,.6);color:#9ca3af;font-weight:700;">ELITE ✓</span>
                <?php elseif ($hasPromoter): ?>
                    <span style="margin-left:.5rem;font-size:.7rem;padding:.2rem .55rem;border-radius:20px;background:rgba(156,163,175,.15);border:1px solid rgba(156,163,175,.4);color:#9ca3af;font-weight:700;">UNLOCKED ✓</span>
                <?php endif; ?>
            </div>
            <div style="font-size:.72rem;color:rgba(255,255,255,.35);">Invite friends via your referral link and unlock exclusive badges</div>
        </div>
        <div style="font-size:.78rem;font-weight:700;color:rgba(255,255,255,.5);white-space:nowrap;"><?= $totalRefs ?> / 20 inv.</div>
    </div>

    <!-- Phase 1: 0→10 (gray badge) -->
    <div style="margin-bottom:.9rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem;">
            <span style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:<?= $hasPromoter||$hasPromoterElite ? '#9ca3af' : 'rgba(255,255,255,.3)' ?>;">
                <?= $hasPromoter||$hasPromoterElite ? '✓ ' : '' ?>Promoter <span style="opacity:.6;">(gray)</span>
            </span>
            <span style="font-size:.7rem;color:rgba(255,255,255,.35);"><?= $phase1Done ?>/10</span>
        </div>
        <div style="height:7px;border-radius:99px;background:rgba(255,255,255,.07);overflow:hidden;">
            <div style="height:100%;width:<?= $phase1Done >= 10 || $hasPromoter || $hasPromoterElite ? 100 : $phase1Pct ?>%;background:#9ca3af;border-radius:99px;transition:width .6s;"></div>
        </div>
    </div>

    <!-- Phase 2: 10→20 (gray+black elite badge) -->
    <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem;">
            <span style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:<?= $hasPromoterElite ? '#6b7280' : 'rgba(255,255,255,.3)' ?>;">
                <?= $hasPromoterElite ? '✓ ' : '' ?>Promoter Elite <span style="opacity:.6;">(gray+black)</span>
            </span>
            <span style="font-size:.7rem;color:rgba(255,255,255,.35);"><?= $hasPromoterElite ? '10' : $phase2Done ?>/10 more</span>
        </div>
        <div style="height:7px;border-radius:99px;background:rgba(255,255,255,.07);overflow:hidden;">
            <div style="height:100%;width:<?= $hasPromoterElite ? 100 : $phase2Pct ?>%;background:linear-gradient(90deg,#6b7280,#1f2937);border-radius:99px;transition:width .6s;"></div>
        </div>
    </div>

    <?php if (!$hasPromoter && !$hasPromoterElite): ?>
    <div style="margin-top:.9rem;font-size:.72rem;color:rgba(255,255,255,.3);text-align:center;">
        You need <strong style="color:rgba(156,163,175,.7);"><?= max(0, 10 - $totalRefs) ?> more invite<?= max(0,10-$totalRefs)!==1?'s':'' ?></strong> to unlock the Promoter badge (gray)
    </div>
    <?php elseif ($hasPromoter && !$hasPromoterElite): ?>
    <div style="margin-top:.9rem;font-size:.72rem;color:rgba(255,255,255,.3);text-align:center;">
        You need <strong style="color:rgba(107,114,128,.8);"><?= max(0, 20 - $totalRefs) ?> more invite<?= max(0,20-$totalRefs)!==1?'s':'' ?></strong> to upgrade to Promoter Elite
    </div>
    <?php endif; ?>
</div>
<?php endif; ?>
<!-- ─────────────────────────────────────────────────────────────────────────── -->

<?php if ($x2Active): ?>
<!-- X2 Tokens Event banner -->
<div style="
    display:flex;align-items:center;gap:1rem;
    background:linear-gradient(135deg,rgba(255,80,0,.13),rgba(255,160,0,.08));
    border:1.5px solid rgba(255,120,0,.45);
    border-radius:16px;padding:1rem 1.5rem;margin-bottom:1.25rem;
    box-shadow:0 0 32px rgba(255,100,0,.12);
    position:relative;overflow:hidden;
">
    <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(255,140,0,.18),transparent 70%);pointer-events:none"></div>
    <div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;background:rgba(255,140,0,.15);border:1px solid rgba(255,140,0,.3);flex-shrink:0">
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style="color:#ff9900"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
    </div>
    <div style="flex:1">
        <div style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:900;color:#ff9900;letter-spacing:.03em">X2 TOKENS EVENT — ACTIVE!</div>
        <div style="font-size:.82rem;color:rgba(255,255,255,.55);margin-top:.2rem">All referrals give <strong style="color:#ffb900">double tokens</strong> right now! You earn <strong style="color:#ffb900">+<?= $tokensPerRef ?> tokens</strong> per invite.</div>
    </div>
    <div style="background:rgba(255,140,0,.18);border:1px solid rgba(255,140,0,.4);border-radius:10px;padding:.4rem .9rem;font-weight:900;font-size:.9rem;color:#ffaa00;white-space:nowrap;letter-spacing:.03em">x2</div>
</div>
<?php endif; ?>

<?php if ($isPremium): ?>
<!-- Premium bonus banner -->
<div class="ref-premium-banner">
    <div class="ref-premium-banner-icon">
        <svg viewBox="0 0 24 24" fill="none" width="20" height="20" style="color:#ffd700" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.25)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" opacity=".8"/></svg>
    </div>
    <div class="ref-premium-banner-text">
        <div class="ref-premium-banner-title">Premium Referral Bonus Active</div>
        <div class="ref-premium-banner-sub">As a Premium member you earn <strong style="color:#ffd700">+20 tokens</strong> per referral instead of the standard 10. Double the rewards!</div>
    </div>
    <div class="ref-premium-badge">
        +20 tokens
    </div>
</div>
<?php else: ?>
<!-- Upsell banner for non-premium -->
<div class="ref-upsell-banner">
    <div class="ref-upsell-icon">
        <svg viewBox="0 0 24 24" fill="none" width="20" height="20" style="color:#ffd700" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.25)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" opacity=".8"/></svg>
    </div>
    <div class="ref-upsell-text">
        <div class="ref-upsell-title">Get Premium for double referral rewards</div>
        <div class="ref-upsell-sub">Premium members earn <strong style="color:rgba(255,215,0,.7)">+20 tokens</strong> per referral instead of 10.</div>
    </div>
    <a href="/dashboard/shop" class="ref-upsell-link">
        Get Premium
    </a>
</div>
<?php endif; ?>

<!-- Stats -->
<div class="ref-hero">
    <div class="ref-stat">
        <div class="ref-stat-num"><?= number_format($totalRefs) ?></div>
        <div class="ref-stat-label">Total Referrals</div>
    </div>
    <div class="ref-stat">
        <div class="ref-stat-num" style="color:#5fefa5">+<?= number_format($tokensEarned) ?></div>
        <div class="ref-stat-label">Tokens Earned</div>
    </div>
    <div class="ref-stat">
        <div class="ref-stat-num accent"><?= htmlspecialchars($myCode) ?></div>
        <div class="ref-stat-label">Your Code</div>
    </div>
</div>

<!-- Referral link card -->
<div class="dash-card" style="margin-bottom:1.25rem">
    <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.35);margin-bottom:.85rem">
        Your Referral Link
    </div>
    <div class="ref-link-box">
        <input type="text" class="ref-link-input" id="ref-link-val" value="<?= htmlspecialchars($refLink) ?>" readonly>
        <button class="ref-copy-btn" id="ref-copy-btn" onclick="copyRefLink()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy
        </button>
    </div>
    <p style="font-size:.75rem;color:rgba(255,255,255,.25);margin-top:.75rem;line-height:1.6">
        Friends can use your code <strong style="color:rgba(255,255,255,.5)"><?= htmlspecialchars($myCode) ?></strong> or your username <strong style="color:rgba(255,255,255,.5)">@<?= htmlspecialchars($profile['username']) ?></strong> when registering.
        You earn <strong style="color:<?= $isPremium ? '#ffd700' : '#5fefa5' ?>"><?= $isPremium ? '+20 tokens (Premium bonus!)' : '+10 tokens' ?></strong> for each successful registration.
    </p>
</div>

<!-- Invited users -->
<div class="dash-card">
    <div class="ref-invited-header">
        <span class="ref-invited-title">Invited Users</span>
        <span class="ref-invited-count"><?= $totalRefs ?></span>
    </div>

    <?php if (empty($referrals)): ?>
    <div class="ref-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        Nobody yet. Share your link and start earning!
    </div>
    <?php else: foreach($referrals as $r):
        $av = !empty($r['avatar']) ? '/'.$r['avatar'] : '/assets/img/default-avatar.png';
        $date = date('M d, Y', strtotime($r['created_at']));
    ?>
    <div class="ref-user-row">
        <img src="<?= htmlspecialchars($av) ?>" onerror="this.src='/assets/img/default-avatar.png'" class="ref-user-avatar" alt="">
        <div class="ref-user-info">
            <div class="ref-user-name">@<?= htmlspecialchars($r['username']) ?></div>
            <div class="ref-user-date"><?= $date ?></div>
        </div>
        <span class="ref-token-badge">
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-2h2v2zm0-4h-2V7h2v5.5z"/></svg>
            +<?= (int)$r['tokens_given'] ?> tokens
        </span>
    </div>
    <?php endforeach; endif; ?>

    <?php if ($totalPages > 1): ?>
    <div style="display:flex;align-items:center;justify-content:center;gap:.45rem;margin-top:1.4rem;flex-wrap:wrap;">
        <?php
        $btnBase   = 'display:inline-flex;align-items:center;justify-content:center;min-width:38px;height:38px;padding:0 .75rem;border-radius:10px;font-size:.82rem;font-weight:700;text-decoration:none;transition:all .2s;border:1px solid;';
        $btnNormal = $btnBase . 'background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1);color:rgba(255,255,255,.6);';
        $btnActive = $btnBase . 'background:rgba(0,212,255,.12);border-color:rgba(0,212,255,.45);color:#00d4ff;box-shadow:0 0 12px rgba(0,212,255,.2);';
        $btnDisabl = $btnBase . 'background:rgba(255,255,255,.02);border-color:rgba(255,255,255,.05);color:rgba(255,255,255,.2);pointer-events:none;';
        ?>
        <a href="/dashboard/referral?page=<?= max(1,$page-1) ?>" style="<?= $page<=1 ? $btnDisabl : $btnNormal ?>">← Prev</a>
        <?php for($i=max(1,$page-2);$i<=min($totalPages,$page+2);$i++): ?>
        <a href="/dashboard/referral?page=<?= $i ?>" style="<?= $i===$page ? $btnActive : $btnNormal ?>"><?= $i ?></a>
        <?php endfor; ?>
        <a href="/dashboard/referral?page=<?= min($totalPages,$page+1) ?>" style="<?= $page>=$totalPages ? $btnDisabl : $btnNormal ?>">Next →</a>
    </div>
    <?php endif; ?>
</div>

<script>
function copyRefLink() {
    const val = document.getElementById('ref-link-val').value;
    navigator.clipboard.writeText(val).then(() => {
        const btn = document.getElementById('ref-copy-btn');
        const orig = btn.innerHTML;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15"><path d="M20 6L9 17l-5-5"/></svg> Copied!`;
        btn.style.background = 'rgba(95,239,165,.15)';
        btn.style.borderColor = 'rgba(95,239,165,.4)';
        btn.style.color = '#5fefa5';
        setTimeout(() => {
            btn.innerHTML = orig;
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.style.color = '';
        }, 2000);
    });
}
</script>

<?php
$pageContent = ob_get_clean();
require VIEWS_PATH . '/layouts/app.php';