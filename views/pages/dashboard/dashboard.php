<?php
requireLogin(); checkBanned($pdo);
$userId  = (int)$_SESSION['user_id'];
$profile = getProfile($pdo, $userId);
$links   = getSocialLinks($pdo, $userId);

// Views per day for last 30 days
$stmt = $pdo->prepare("
    SELECT viewed_at, COUNT(*) as cnt
    FROM views_log
    WHERE profile_user_id = ?
      AND viewed_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
    GROUP BY viewed_at
    ORDER BY viewed_at ASC
");
$stmt->execute([$userId]);
$viewsRaw = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Build a full 30-day map
$viewsMap = [];
foreach ($viewsRaw as $row) $viewsMap[$row['viewed_at']] = (int)$row['cnt'];

$labels = []; $data = [];
for ($i = 29; $i >= 0; $i--) {
    $date = date('Y-m-d', strtotime("-$i days"));
    $labels[] = date('M j', strtotime($date));
    $data[]   = $viewsMap[$date] ?? 0;
}

$totalViews  = (int)$profile['views'];
$totalLinks  = count($links);
$joinDate    = date('M Y', strtotime($profile['created_at']));
$isPremium   = !empty($profile['is_premium']) && ((empty($profile['premium_expires_at'])) || strtotime($profile['premium_expires_at']) > time());

$currentPage = 'dashboard-home';
$pageTitle   = 'Dashboard';
ob_start();
?>

<div class="section-header">
    <h2>Welcome back, <?= sanitize($profile['display_name'] ?: $profile['username']) ?></h2>
    <p>Here's an overview of your account and profile activity.</p>
</div>

<!-- Account info cards (3 cards: username, uid, profile views) -->
<div class="overview-cards">
    <div class="overview-card">
        <div class="ov-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div class="ov-info">
            <div class="ov-label">Username</div>
            <div class="ov-value"><?= sanitize($profile['username']) ?></div>
        </div>
    </div>
    <div class="overview-card">
        <div class="ov-icon ov-icon-hash">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
        </div>
        <div class="ov-info">
            <div class="ov-label">UID</div>
            <div class="ov-value"><?= $userId ?></div>
        </div>
    </div>
    <div class="overview-card">
        <div class="ov-icon ov-icon-eye">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </div>
        <div class="ov-info">
            <div class="ov-label">Profile Views</div>
            <div class="ov-value"><?= number_format($totalViews) ?></div>
        </div>
    </div>
    <div class="overview-card <?= $isPremium ? 'ov-card-premium' : '' ?>">
        <div class="ov-icon <?= $isPremium ? 'ov-icon-premium' : 'ov-icon-hash' ?>">
            <?php if ($isPremium): ?>
            <svg viewBox="0 0 24 24" fill="none" width="22" height="22" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 0 5px rgba(255,215,0,.9))"><path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.3)" stroke="#ffd700" stroke-width="1.8" stroke-linejoin="round"/><path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="#ffd700" stroke-width="1.4" stroke-linejoin="round" opacity=".85"/></svg>
            <?php else: ?>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            <?php endif; ?>
        </div>
        <div class="ov-info">
            <div class="ov-label">Plan</div>
            <?php if ($isPremium): ?>
            <div class="ov-value" style="color:#ffd700">Premium</div>
            <?php if (!empty($profile['premium_expires_at'])): ?>
            <div style="font-size:.7rem;color:rgba(255,215,0,.5);margin-top:2px">Expires <?= date('d M Y', strtotime($profile['premium_expires_at'])) ?></div>
            <?php endif; ?>
            <?php else: ?>
            <div class="ov-value">Free</div>
            <a href="/dashboard/shop#premium" style="font-size:.7rem;color:var(--accent);margin-top:2px;display:block;text-decoration:none">Upgrade →</a>
            <?php endif; ?>
        </div>
    </div>
</div>

<!-- Views chart -->
<div class="dash-card" style="margin-top:1.5rem">
    <div class="dash-card-header">
        <span class="dash-card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Profile Visitors
        </span>
        <span class="views-range-badge">Last 30 Days</span>
    </div>

    <div class="views-summary">
        <div class="views-tracked-block">
            <span class="views-big"><?= number_format($totalViews) ?></span>
            <span class="views-badge">Tracked</span>
            <div class="views-tracked-label">Views Tracked</div>
        </div>
    </div>

    <div class="chart-wrapper">
        <canvas id="viewsChart" height="80"></canvas>
    </div>

    <div class="views-footer">
        <span class="views-footer-main">Visitors last 30 days: <strong><?= array_sum($data) ?></strong></span>
        <span class="views-footer-sub">Daily average: <?= $totalDays = 30; round(array_sum($data) / $totalDays, 1) ?> visitors/day</span>
    </div>
</div>


<script>
(function(){
    const labels = <?= json_encode($labels) ?>;
    const data   = <?= json_encode($data) ?>;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00d4ff';

    function hexToRgb(hex) {
        const r = parseInt(hex.slice(1,3),16);
        const g = parseInt(hex.slice(3,5),16);
        const b = parseInt(hex.slice(5,7),16);
        return r+','+g+','+b;
    }
    const rgb = accent.startsWith('#') ? hexToRgb(accent) : '0,212,255';
    const fillColor = 'rgba(' + rgb + ',0.12)';

    const ctx = document.getElementById('viewsChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                borderColor: accent,
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: accent,
                pointBorderColor: 'rgba(' + rgb + ',0.3)',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: accent,
                pointHoverBorderWidth: 2,
                fill: true,
                backgroundColor: fillColor,
                tension: 0.35
            }]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(8,8,20,0.95)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    titleColor: 'rgba(255,255,255,0.6)',
                    bodyColor: accent,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        title: items => items[0].label,
                        label: item => item.parsed.y + ' views'
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 11 }, maxTicksLimit: 8 }
                },
                y: {
                    display: false,
                    beginAtZero: true
                }
            }
        }
    });
})();
</script>

<?php
$pageContent = ob_get_clean();
$extraJs = '/assets/js/dashboard.js';
// Inject Chart.js before layout
$extraHead = '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js"></script>';
require VIEWS_PATH . '/layouts/app.php';