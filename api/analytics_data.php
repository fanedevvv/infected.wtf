<?php
if (session_status() === PHP_SESSION_NONE) session_start(["cookie_secure"=>true,"cookie_httponly"=>true,"cookie_samesite"=>"Lax"]);

require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/helpers.php';

header('Content-Type: application/json');

if (!isLoggedIn()) {
    echo json_encode(['error' => 'unauthorized']);
    exit;
}

$userId = (int)$_SESSION['user_id'];
$range  = isset($_GET['range']) ? $_GET['range'] : '7d';

$daysMap = ['1d' => 1, '3d' => 3, '7d' => 7, '30d' => 30, '90d' => 90];
$days = isset($daysMap[$range]) ? $daysMap[$range] : 7;

$startDate = date('Y-m-d', strtotime("-{$days} days"));
$today     = date('Y-m-d');

// Detect if analytics columns exist (graceful fallback)
$hasExtraCols = false;
try {
    $pdo->query("SELECT device_type FROM views_log LIMIT 1");
    $hasExtraCols = true;
} catch (Exception $e) {
    $hasExtraCols = false;
}

$hasBrowserCol = false;
try {
    $pdo->query("SELECT browser FROM views_log LIMIT 1");
    $hasBrowserCol = true;
} catch (Exception $e) {}

$hasOsCol = false;
try {
    $pdo->query("SELECT os_name FROM views_log LIMIT 1");
    $hasOsCol = true;
} catch (Exception $e) {}

$hasLinkClicks = false;
try {
    $pdo->query("SELECT id FROM link_clicks LIMIT 1");
    $hasLinkClicks = true;
} catch (Exception $e) {}

// Views per day
$rawViews = [];
try {
    $stmt = $pdo->prepare("
        SELECT viewed_at, COUNT(*) AS cnt
        FROM views_log
        WHERE profile_user_id = ? AND viewed_at >= ?
        GROUP BY viewed_at
        ORDER BY viewed_at ASC
    ");
    $stmt->execute([$userId, $startDate]);
    $rawViews = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {}

$viewsMap = [];
foreach ($rawViews as $r) $viewsMap[$r['viewed_at']] = (int)$r['cnt'];

$labels = [];
$data   = [];
for ($i = $days - 1; $i >= 0; $i--) {
    $date     = date('Y-m-d', strtotime("-{$i} days"));
    $labels[] = $days <= 3
        ? date('D, M j', strtotime($date))
        : date('M j', strtotime($date));
    $data[]   = isset($viewsMap[$date]) ? $viewsMap[$date] : 0;
}

// Device breakdown
$devices = ['desktop' => 0, 'mobile' => 0, 'tablet' => 0];
if ($hasExtraCols) {
    try {
        $devStmt = $pdo->prepare("
            SELECT COALESCE(NULLIF(device_type, ''), 'desktop') AS device,
                   COUNT(*) AS cnt
            FROM views_log
            WHERE profile_user_id = ? AND viewed_at >= ?
            GROUP BY device_type
        ");
        $devStmt->execute([$userId, $startDate]);
        foreach ($devStmt->fetchAll(PDO::FETCH_ASSOC) as $d) {
            $key = $d['device'];
            if (array_key_exists($key, $devices)) $devices[$key] = (int)$d['cnt'];
            else $devices['desktop'] += (int)$d['cnt'];
        }
    } catch (Exception $e) {}
} else {
    $devices['desktop'] = array_sum($data);
}

// Country breakdown
$countries     = [];
$totalCtrViews = 0;
if ($hasExtraCols) {
    try {
        $ctrStmt = $pdo->prepare("
            SELECT COALESCE(NULLIF(country_code, ''), 'XX') AS code,
                   COALESCE(NULLIF(country_name, ''), 'Unknown') AS name,
                   COUNT(*) AS cnt
            FROM views_log
            WHERE profile_user_id = ? AND viewed_at >= ?
            GROUP BY country_code, country_name
            ORDER BY cnt DESC
            LIMIT 8
        ");
        $ctrStmt->execute([$userId, $startDate]);
        $countries     = $ctrStmt->fetchAll(PDO::FETCH_ASSOC);
        $totalCtrViews = (int)array_sum(array_column($countries, 'cnt'));
    } catch (Exception $e) {}
}

// Browser breakdown
$browsers = [];
if ($hasBrowserCol) {
    try {
        $bStmt = $pdo->prepare("
            SELECT COALESCE(NULLIF(browser, ''), 'Unknown') AS browser, COUNT(*) AS cnt
            FROM views_log
            WHERE profile_user_id = ? AND viewed_at >= ?
            GROUP BY browser ORDER BY cnt DESC LIMIT 8
        ");
        $bStmt->execute([$userId, $startDate]);
        $browsers = $bStmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {}
}

// OS breakdown
$osData = [];
if ($hasOsCol) {
    try {
        $oStmt = $pdo->prepare("
            SELECT COALESCE(NULLIF(os_name, ''), 'Unknown') AS os_name, COUNT(*) AS cnt
            FROM views_log
            WHERE profile_user_id = ? AND viewed_at >= ?
            GROUP BY os_name ORDER BY cnt DESC LIMIT 8
        ");
        $oStmt->execute([$userId, $startDate]);
        $osData = $oStmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {}
}

// Top links by clicks
$topLinks = [];
$totalLinkClicks = 0;
if ($hasLinkClicks) {
    try {
        $lStmt = $pdo->prepare("
            SELECT link_id, link_title, link_url, COUNT(*) AS cnt
            FROM link_clicks
            WHERE profile_user_id = ? AND clicked_at >= ?
            GROUP BY link_id, link_title, link_url
            ORDER BY cnt DESC LIMIT 8
        ");
        $lStmt->execute([$userId, $startDate]);
        $topLinks = $lStmt->fetchAll(PDO::FETCH_ASSOC);
        $totalLinkClicks = (int)array_sum(array_column($topLinks, 'cnt'));
    } catch (Exception $e) {}
}

// Summary stats
$totalViews = (int)array_sum($data);
$peakViews  = $data ? (int)max($data) : 0;
$dailyAvg   = $days > 0 ? round($totalViews / $days, 1) : 0;
$todayViews = isset($viewsMap[$today]) ? $viewsMap[$today] : 0;

echo json_encode([
    'labels'            => $labels,
    'data'              => $data,
    'devices'           => $devices,
    'countries'         => $countries,
    'total_ctr_views'   => $totalCtrViews,
    'browsers'          => $browsers,
    'os'                => $osData,
    'top_links'         => $topLinks,
    'total_link_clicks' => $totalLinkClicks,
    'has_extra_cols'    => $hasExtraCols,
    'stats' => [
        'total'     => $totalViews,
        'peak'      => $peakViews,
        'daily_avg' => $dailyAvg,
        'today'     => $todayViews,
        'days'      => $days,
    ],
]);