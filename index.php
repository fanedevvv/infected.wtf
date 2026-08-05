<?php
// ── HTML minification — safe: nu atinge conținutul din <script> sau <style> ──
ob_start(function($buffer) {
    // Extrage blocurile <script> si <style> si le protejeaza de minificare
    $protected = [];
    $placeholder = "%%PROTECTED_%d%%";

    // Protejeaza <script ...>...</script>
    $buffer = preg_replace_callback('/<script(\b[^>]*)>(.*?)<\/script>/si', function($m) use (&$protected, $placeholder) {
        $key = count($protected);
        $protected[$key] = $m[0];
        return sprintf($placeholder, $key);
    }, $buffer);

    // Protejeaza <style ...>...</style>
    $buffer = preg_replace_callback('/<style(\b[^>]*)>(.*?)<\/style>/si', function($m) use (&$protected, $placeholder) {
        $key = count($protected);
        $protected[$key] = $m[0];
        return sprintf($placeholder, $key);
    }, $buffer);

    // Minifica doar HTML-ul ramas (fara script/style)
    $buffer = preg_replace('/>\s+</', '><', $buffer);
    $buffer = preg_replace('/^\s+|\s+$/m', '', $buffer);
    $buffer = preg_replace('/\n{2,}/', "\n", $buffer);

    // Restaureaza blocurile protejate
    foreach ($protected as $key => $block) {
        $buffer = str_replace(sprintf($placeholder, $key), $block, $buffer);
    }

    return trim($buffer);
});

// Extend session lifetime if remember_me cookie exists
if (isset($_COOKIE['remember_token'])) {
    ini_set('session.cookie_lifetime', 60 * 60 * 24 * 30);
    ini_set('session.gc_maxlifetime',  60 * 60 * 24 * 30);
}
session_start([
    'cookie_secure'   => true,
    'cookie_httponly' => true,
    'cookie_samesite' => 'Lax',
]);
require_once __DIR__ . '/core/database.php';
require_once __DIR__ . '/core/auth.php';
require_once __DIR__ . '/core/helpers.php';

$uri = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');

// ── Remember Me auto-login ────────────────────────────
if (!isLoggedIn() && isset($_COOKIE['remember_token'])) {
    // Hash-uim token-ul din cookie înainte de a-l compara cu DB (DB stochează SHA-256)
    $tokenHash = hash('sha256', $_COOKIE['remember_token']);
    $s = $pdo->prepare("SELECT id, username FROM users WHERE remember_token=? AND token_expires > NOW() AND banned=0");
    $s->execute([$tokenHash]);
    $u = $s->fetch();
    if ($u) {
        $_SESSION['user_id']  = $u['id'];
        $_SESSION['username'] = $u['username'];
        // Rotate token on each auto-login for security
        $newToken     = bin2hex(random_bytes(32));
        $newTokenHash = hash('sha256', $newToken);   // stocat în DB
        $newExpires   = date('Y-m-d H:i:s', strtotime('+30 days'));
        $pdo->prepare("UPDATE users SET remember_token=?, token_expires=? WHERE id=?")->execute([$newTokenHash, $newExpires, $u['id']]);
        setcookie('remember_token', $newToken, [  // cookie primește tokenul raw
            'expires'  => time() + 60*60*24*30,
            'path'     => '/',
            'secure'   => false,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    } else {
        // Invalid/expired token — clear cookie
        setcookie('remember_token', '', [
            'expires'  => time() - 3600,
            'path'     => '/',
            'secure'   => false,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }
}


// ── Cleanup: delete unverified accounts older than 24h (~1% of requests) ──
if (mt_rand(1, 100) === 1) {
    try {
        $pdo->exec("DELETE FROM users WHERE email_verified = 0 AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)");
    } catch (Exception $e) { /* silent */ }
}

// ── Route map ────────────────────────────────────────
$routes = [
    ''              => 'home',
    'login'         => 'login',
    'register'      => 'register',
    'logout'        => 'logout',
    'banned'        => 'banned',
    'leaderboard'         => 'leaderboard',
    'auth/verify-email'   => 'verify-email',
    'auth/confirm-action' => 'confirm-action',
    'reset-password'      => 'reset-password',
    'terms'         => 'terms',
    'privacy'       => 'privacy',
    'support'       => 'support',
    // Dashboard pages (each is its own page)
    'dashboard'           => 'dashboard/dashboard',
    'dashboard/info'      => 'dashboard/profile-info',
    'dashboard/customize' => 'dashboard/profile-info',
    'dashboard/links'     => 'dashboard/links',
    'dashboard/effects'   => 'dashboard/effects',
    'dashboard/decorations' => 'dashboard/decorations',
    'dashboard/integrations' => 'dashboard/integrations',
    'dashboard/badges'    => 'dashboard/badges',
    'dashboard/shop'      => 'dashboard/shop',
    'dashboard/referral'  => 'dashboard/referral',
    'dashboard/settings'  => 'dashboard/settings',
    'dashboard/analytics' => 'dashboard/analytics',
    'admin'               => 'dashboard/admin',
    'maintenance'         => 'maintenance',
];

// ── Whitelist / Maintenance check ───────────────────
checkWhitelist($pdo, $uri);

// ── Resolve route ────────────────────────────────────
$legacyDashboardMap = [
    'decorations' => 'dashboard/decorations',
];

if ($uri === 'dashboard' && isset($_GET['page'])) {
    $legacyPage = strtolower(trim((string)$_GET['page']));
    if (isset($legacyDashboardMap[$legacyPage])) {
        $page = $legacyDashboardMap[$legacyPage];
    }
}

if (!isset($page) && isset($routes[$uri])) {
    $page = $routes[$uri];
} elseif (!isset($page) && preg_match('/^[a-zA-Z0-9_\.\-]{3,30}$/', $uri)) {
    // Username profile
    $page = 'profile';
    $_GET['u'] = $uri;
} elseif (!isset($page)) {
    $page = '404';
}

// ── Special routes (no view needed) ──────────────────
if ($page === 'logout') {
    if (isset($_COOKIE['remember_token'])) {
        // Invalidate token in DB — hash-uim înainte de lookup (DB stochează SHA-256)
        $logoutHash = hash('sha256', $_COOKIE['remember_token']);
        $pdo->prepare("UPDATE users SET remember_token=NULL, token_expires=NULL WHERE remember_token=?")->execute([$logoutHash]);
        setcookie('remember_token', '', [
            'expires'  => time() - 3600,
            'path'     => '/',
            'secure'   => false,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }
    session_destroy();
    header('Location: /login'); exit;
}

// ── Load page view ───────────────────────────────────
$viewFile = __DIR__ . '/views/pages/' . $page . '.php';
if (!file_exists($viewFile)) {
    $viewFile = __DIR__ . '/views/pages/404.php';
}

// ── Pagini unde continutul NU trebuie sa fie vizibil in DevTools ─────────────
$hiddenPages = [
    'leaderboard', 'terms', 'privacy', 'support',
    'dashboard/dashboard', 'dashboard/admin',
    'dashboard/analytics', 'dashboard/shop',
    'dashboard/profile-info', 'dashboard/badges',
    'dashboard/links', 'dashboard/referral',
    'dashboard/effects', 'dashboard/decorations', 'dashboard/integrations',
    'dashboard/settings',
];
if (in_array($page, $hiddenPages, true)) {
    header('Cache-Control: no-store, no-cache, must-revalidate, private');
    header('Pragma: no-cache');
    header('Expires: 0');
    header('X-Robots-Tag: noindex, nofollow, noarchive, nosnippet');
}

require $viewFile;

// ── Flush minified output ─────────────────────────────
ob_end_flush();