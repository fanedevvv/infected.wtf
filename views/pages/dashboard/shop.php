<?php
requireLogin(); checkBanned($pdo);
$userId  = (int)$_SESSION['user_id'];
$profile = getProfile($pdo, $userId);
$tokens  = getUserTokens($pdo, $userId);
$isPremium = !empty($profile['is_premium']) && (empty($profile['premium_expires_at']) || strtotime($profile['premium_expires_at']) > time());

// x2 tokens event state
$settCols = $pdo->query("SHOW COLUMNS FROM site_settings")->fetchAll(PDO::FETCH_COLUMN);
$x2Active = false;
if (in_array('x2_tokens_enabled', $settCols)) {
    $x2Row = $pdo->query("SELECT x2_tokens_enabled FROM site_settings LIMIT 1")->fetch();
    $x2Active = !empty($x2Row['x2_tokens_enabled']);
}

$s = $pdo->prepare("SELECT COALESCE(badges,'[]') FROM profiles WHERE user_id=?");
$s->execute([$userId]);
$ownedBadges = json_decode($s->fetchColumn() ?: '[]', true) ?: [];

// ── Fetch active bundles ──────────────────────────────────────────────────
$activeBundles = [];
$purchasedBundleIds = [];
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `bundles` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `name` VARCHAR(100) NOT NULL,
        `price` DECIMAL(8,2) NOT NULL DEFAULT 0,
        `price_type` ENUM('euro','tokens') NOT NULL DEFAULT 'euro',
        `badges` JSON DEFAULT NULL,
        `effects` JSON DEFAULT NULL,
        `premium_days` INT NOT NULL DEFAULT 0,
        `created_by` INT DEFAULT NULL,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $activeBundles = $pdo->query("SELECT * FROM bundles ORDER BY created_at DESC")->fetchAll(PDO::FETCH_ASSOC);
    // Load which bundles this user already owns
    $cols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
    if (in_array('purchased_bundles', $cols)) {
        $pbStmt = $pdo->prepare("SELECT COALESCE(purchased_bundles,'[]') FROM users WHERE id=?");
        $pbStmt->execute([$userId]);
        $purchasedBundleIds = json_decode($pbStmt->fetchColumn() ?: '[]', true) ?: [];
    }
} catch (Throwable $e) { $activeBundles = []; }

// ── Badge SVG icons (same as badges.php) ─────────────────────────────────
function getBadgeSvgShop(string $id, string $color): string {
    $svgs = [
        'premium'         => '<path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="'.$color.'44" stroke="'.$color.'" stroke-width="1.8" stroke-linejoin="round"/><path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="'.$color.'" stroke-width="1.4" stroke-linejoin="round" opacity=".8"/>',
        'og'              => '<path fill="'.$color.'" d="M12 2l2.09 6.26L21 9.27l-5 4.87 1.18 6.88L12 17.77l-5.18 3.25L8 14.14 3 9.27l6.91-1.01L12 2z"/>',
        'views_master'    => '<path fill="'.$color.'" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>',
        'verified'        => '<path fill="'.$color.'" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>',
        'owner'           => '<path fill="'.$color.'" d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3H5v1h14v-1z"/>',
        'admin'           => '<path fill="'.$color.'" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z"/>',
        'hall_of_fame'    => '<path fill="'.$color.'" d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H8v2h8v-2h-3v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>',
        'champion'        => '<path fill="'.$color.'" d="M12 2L9.5 6.5 5 5l2 5H4l2.5 4h11L20 10h-3l2-5-4.5 1.5L12 2z" opacity=".9"/><rect fill="'.$color.'" x="7" y="19" width="10" height="2" rx="1"/><rect fill="'.$color.'" x="8.5" y="16" width="7" height="2.5" rx=".8"/>',
        'known'           => '<path fill="'.$color.'" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>',
        'rich'            => '<path fill="'.$color.'" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>',
        'trapstar'        => '<path fill="'.$color.'" d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>',
        'the_killer'      => '<path fill="'.$color.'" d="M12 2C7.58 2 4 5.58 4 10c0 2.84 1.49 5.34 3.73 6.76.18.11.27.31.27.52V19c0 1.1.9 2 2 2v-2h1.5v2h1v-2H14v2c1.1 0 2-.9 2-2v-1.72c0-.21.09-.41.27-.52C18.51 15.34 20 12.84 20 10c0-4.42-3.58-8-8-8zM9 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>',
        'discord'         => '<path fill="'.$color.'" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"/>',
        'booster'         => '<path fill="'.$color.'" d="M13.13 22.19L11.5 18.36C13.07 17.78 14.54 17 15.9 16.09L13.13 22.19M5.64 12.5L1.81 10.87L7.91 8.1C7 9.46 6.22 10.93 5.64 12.5M21.61 2.39C21.61 2.39 16.66.269 11 5.93C8.81 8.12 7.5 10.53 6.65 12.64C6.37 13.39 6.56 14.21 7.11 14.77L9.24 16.89C9.79 17.45 10.61 17.63 11.36 17.35C13.5 16.53 15.88 15.19 18.07 13C23.73 7.34 21.61 2.39 21.61 2.39M14.54 9.46C13.76 8.68 13.76 7.41 14.54 6.63S16.59 5.85 17.37 6.63C18.14 7.41 18.15 8.68 17.37 9.46C16.59 10.24 15.32 10.24 14.54 9.46M8.88 16.53L7.47 15.12L8.88 16.53M6.24 22L9.88 18.36C9.54 18.27 9.21 18.12 8.91 17.91L4.83 22H6.24M2 22H3.41L8.18 17.24L6.76 15.83L2 20.59V22M7 22H8.41L9.5 20.92L8.09 19.5L7 20.59V22Z"/>',
        'lover'           => '<path fill="'.$color.'" d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>',
        'fresh'           => '<path fill="'.$color.'" d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-5 8z"/>',
        'crew'            => '<path fill="'.$color.'" d="M6.92 5L2 20l5-5h4l8-8-4-4-8 8V7.5L6.92 5zM20 2l2 2-2.5 2.5-2-2L20 2z"/>',
        'billionaire'     => '<path fill="'.$color.'" d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>',
        'promoter'        => '<path fill="'.$color.'" d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"/>',
        'promoter_elite'  => '<path fill="'.$color.'" d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"/><path fill="'.$color.'" d="M9.5 4.5l.6 1.8 1.9.1-1.5 1.1.5 1.8-1.5-1-1.5 1 .5-1.8-1.5-1.1 1.9-.1z" opacity=".9"/>',
        'content_creator' => '<path fill="'.$color.'" d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/><path fill="'.$color.'" d="M9 3L7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9zm3 14a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/>',
    ];
    if (!isset($svgs[$id])) return '';
    $vb = ($id === 'discord') ? '0 0 127.14 96.36' : '0 0 24 24';
    return '<svg viewBox="'.$vb.'" xmlns="http://www.w3.org/2000/svg" width="13" height="13" style="flex-shrink:0">'.$svgs[$id].'</svg>';
}

// ── Badge display map (for reward pills) ──────────────────────────────────
$badgeDisplayMap = [
    'verified'        => ['name' => 'Verified',        'color' => '#34d399'],
    'champion'        => ['name' => 'Champion',        'color' => '#c0c0c0'],
    'known'           => ['name' => 'Known',           'color' => '#60a5fa'],
    'rich'            => ['name' => 'Rich',            'color' => '#fbbf24'],
    'trapstar'        => ['name' => 'Trapstar',        'color' => '#f97316'],
    'the_killer'      => ['name' => 'The Killer',      'color' => '#ef4444'],
    'crew'            => ['name' => 'Crew',            'color' => '#8b5cf6'],
    'billionaire'     => ['name' => 'Billionaire',     'color' => '#6aff99'],
    'content_creator' => ['name' => 'Content Creator', 'color' => '#4ade80'],
    'fresh'           => ['name' => 'Fresh',           'color' => '#a8d8ff'],
    'lover'           => ['name' => 'Lover',           'color' => '#ff6ba0'],
];

// ── Effect display map ────────────────────────────────────────────────────
$effectDisplayMap = [
    'cursor_smoke'     => 'Smoke Trail',   'cursor_fire'      => 'Fire Trail',
    'cursor_soundwave' => 'Sound Wave',    'cursor_meteors'   => 'Meteors',
    'cursor_leaves'    => 'Aesth. Leaves', 'cursor_water'     => 'Water Trail',
    'cursor_shadow'    => 'Soul Trail',    'avatar_rocks'     => 'Rock Ring',
    'avatar_crown'     => 'Crown 3D',      'avatar_bloodrain' => 'Blood Rain',
    'avatar_darkeyes'  => 'Dark Eyes',     'bg_fallingleaves' => 'Falling Leaves',
    'bg_underwater'    => 'Underwater',    'bg_gas'           => 'Gas Effect',
    'bg_fireworks'     => 'Fireworks',     'bg_hell'          => 'Hell BG',
    'bg_shadowworld'   => 'Shadow World',
];

$shopItems = [
    'fresh'      => ['name'=>'Fresh',      'price'=>50,   'badge_id'=>'fresh',      'color'=>'#a8d8ff', 'desc'=>'Stay fresh. A clean badge for a clean vibe.'],
    'lover'      => ['name'=>'Lover',      'price'=>300,  'badge_id'=>'lover',      'color'=>'#ff6ba0', 'desc'=>'Show your love. A pink heart badge.'],
    'known'      => ['name'=>'Known',      'price'=>250,  'badge_id'=>'known',      'color'=>'#60a5fa', 'desc'=>'Show the world you\'re a known figure.'],
    'rich'       => ['name'=>'Rich',       'price'=>500,  'badge_id'=>'rich',       'color'=>'#fbbf24', 'desc'=>'Flex your wealth with the Rich badge.'],
    'trapstar'   => ['name'=>'Trapstar',   'price'=>1000, 'badge_id'=>'trapstar',   'color'=>'#f97316', 'desc'=>'For those who live the trap life.'],
    'the_killer' => ['name'=>'The Killer', 'price'=>1500, 'badge_id'=>'the_killer', 'color'=>'#ef4444', 'desc'=>'The most exclusive badge on the platform.'],
];

$currentPage = 'shop';
$pageTitle   = 'Shop';
ob_start();
?>

<style>
/* Gift modal */
.gift-overlay {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(0,0,0,.65);
    backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
    opacity: 0; pointer-events: none;
    transition: opacity .22s;
}
.gift-overlay.open { opacity: 1; pointer-events: all; }
.gift-modal {
    background: #0d0d16;
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 18px;
    padding: 1.75rem;
    width: 100%; max-width: 380px;
    box-shadow: 0 24px 60px rgba(0,0,0,.6);
    transform: translateY(16px) scale(.97);
    transition: transform .22s cubic-bezier(.4,0,.2,1);
    position: relative;
}
.gift-overlay.open .gift-modal { transform: translateY(0) scale(1); }
.gift-modal-title {
    font-family:'Syne',sans-serif; font-size:1.1rem; font-weight:800;
    margin-bottom:.25rem;
}
.gift-modal-sub {
    font-size:.8rem; color:rgba(255,255,255,.4); margin-bottom:1.25rem;
}
.gift-badge-preview {
    display: flex; align-items: center; gap: .75rem;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 12px; padding: .75rem 1rem;
    margin-bottom: 1.25rem;
}
.gift-badge-ico {
    width: 42px; height: 42px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
}
.gift-badge-meta strong { font-size: .92rem; font-weight: 700; display: block; }
.gift-badge-meta span { font-size: .75rem; color: rgba(255,255,255,.4); }
.gift-search-wrap { position: relative; margin-bottom: .75rem; }
.gift-search-input {
    width: 100%; padding: .6rem 1rem .6rem 2.4rem;
    background: rgba(255,255,255,.05);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px; color: #fff; font-size: .88rem;
    outline: none; font-family: 'Outfit',sans-serif;
    transition: border-color .2s; box-sizing: border-box;
}
.gift-search-input:focus { border-color: rgba(52,211,153,.5); }
.gift-search-icon {
    position: absolute; left: .75rem; top: 50%;
    transform: translateY(-50%);
    color: rgba(255,255,255,.3); pointer-events: none;
}
.gift-results {
    max-height: 200px; overflow-y: auto;
    background: rgba(255,255,255,.03);
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 10px; margin-bottom: 1rem;
    display: none;
}
.gift-results.show { display: block; }
.gift-result-item {
    display: flex; align-items: center; gap: .65rem;
    padding: .6rem .85rem; cursor: pointer;
    transition: background .15s; border-bottom: 1px solid rgba(255,255,255,.05);
}
.gift-result-item:last-child { border-bottom: none; }
.gift-result-item:hover { background: rgba(255,255,255,.06); }
.gift-result-item.selected { background: rgba(52,211,153,.07); }
.gift-result-avatar {
    width: 32px; height: 32px; border-radius: 8px;
    object-fit: cover; flex-shrink: 0;
    background: rgba(255,255,255,.06);
}
.gift-result-name { font-size: .85rem; font-weight: 600; }
.gift-result-check {
    margin-left: auto; color: var(--accent);
    display: none;
}
.gift-result-item.selected .gift-result-check { display: block; }
.gift-selected-user {
    display: none; align-items: center; gap: .65rem;
    background: rgba(52,211,153,.06);
    border: 1px solid rgba(52,211,153,.2);
    border-radius: 10px; padding: .6rem .85rem;
    margin-bottom: 1rem; font-size: .85rem;
}
.gift-selected-user.show { display: flex; }
.gift-selected-user img {
    width: 30px; height: 30px; border-radius: 7px; object-fit: cover;
}
.gift-selected-clear {
    margin-left: auto; background: none; border: none;
    color: rgba(255,255,255,.35); cursor: pointer; font-size: 1rem;
    padding: 0; line-height: 1;
}
.gift-selected-clear:hover { color: #ff6b6b; }
.gift-modal-actions { display: flex; gap: .6rem; }
.gift-send-btn {
    flex: 1; padding: .65rem; border-radius: 10px;
    font-size: .88rem; font-weight: 700; cursor: pointer;
    border: none; background: linear-gradient(135deg,var(--accent),#1fac79);
    color: #000; transition: all .2s;
}
.gift-send-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
.gift-send-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; filter: none; }
.gift-cancel-btn {
    padding: .65rem 1.1rem; border-radius: 10px;
    font-size: .88rem; font-weight: 700; cursor: pointer;
    background: rgba(255,255,255,.05);
    border: 1px solid rgba(255,255,255,.1);
    color: rgba(255,255,255,.6); transition: all .2s;
}
.gift-cancel-btn:hover { background: rgba(255,255,255,.1); }
.gift-close-x {
    position: absolute; top: 1rem; right: 1rem;
    background: none; border: none; cursor: pointer;
    color: rgba(255,255,255,.3); padding: .2rem;
    transition: color .2s;
}
.gift-close-x:hover { color: #fff; }
.gift-no-results {
    padding: .85rem; text-align: center;
    font-size: .8rem; color: rgba(255,255,255,.3);
}
/* Card action row */
.shop-card-actions { display: flex; gap: .5rem; align-items: stretch; }
.shop-buy-btn      { flex: 1; }
.shop-gift-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: .35rem;
    padding: .6rem .9rem; border-radius: 10px;
    font-size: .82rem; font-weight: 700; cursor: pointer;
    border: 1px solid rgba(255,255,255,.12);
    background: rgba(255,255,255,.05);
    color: rgba(255,255,255,.65);
    transition: all .2s; white-space: nowrap; flex-shrink: 0;
}
.shop-gift-btn:hover {
    background: rgba(255,255,255,.1);
    border-color: rgba(255,255,255,.2);
    color: #fff;
}
</style>

<div class="section-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:2rem">
    <div>
        <h2>Shop</h2>
        <p>Unlock exclusive perks with your tokens and cash.</p>
    </div>
</div>

<!-- ══ BUNDLES SECTION ════════════════════════════════════════════════ -->
<?php if (!empty($activeBundles)): ?>
<style>
.bundles-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.25rem;
    margin-bottom: 2.5rem;
}
@media (max-width: 700px) { .bundles-grid { grid-template-columns: 1fr; } }
.bundle-shop-card {
    background: linear-gradient(135deg, rgba(16,185,129,.07) 0%, rgba(5,150,105,.04) 50%, rgba(10,10,16,.97) 100%);
    border: 1.5px solid rgba(16,185,129,.25);
    border-radius: 18px;
    padding: 1.5rem 1.6rem 1.4rem;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    transition: border-color .2s, box-shadow .2s, transform .2s;
    box-shadow: 0 0 24px rgba(16,185,129,.06);
}
.bundle-shop-card:hover {
    border-color: rgba(16,185,129,.5);
    box-shadow: 0 0 32px rgba(16,185,129,.14);
    transform: translateY(-2px);
}
.bundle-shop-card::before {
    content: '';
    position: absolute;
    top: -40px; right: -40px;
    width: 130px; height: 130px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(16,185,129,.12), transparent 70%);
    pointer-events: none;
}
.bundle-pill-label {
    display: inline-flex; align-items: center; gap: .35rem;
    font-size: .62rem; font-weight: 800; text-transform: uppercase; letter-spacing: .09em;
    color: #10b981;
    background: rgba(16,185,129,.12);
    border: 1px solid rgba(16,185,129,.3);
    border-radius: 99px; padding: .2rem .65rem;
    width: fit-content;
}
.bundle-name {
    font-family: 'Syne', sans-serif;
    font-size: 1.2rem; font-weight: 800; color: #fff; line-height: 1.25;
}
.bundle-rewards-wrap {
    display: flex; flex-wrap: wrap; gap: .4rem;
}
.bundle-reward-pill {
    font-size: .72rem; font-weight: 600;
    padding: .25rem .65rem;
    border-radius: 99px;
    border: 1px solid;
    display: inline-flex; align-items: center; gap: .3rem;
}
.bundle-price-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: .75rem; margin-top: auto; padding-top: .75rem;
    border-top: 1px solid rgba(255,255,255,.06);
}
.bundle-price-val {
    font-family: 'Syne', sans-serif;
    font-size: 1.5rem; font-weight: 900; line-height: 1;
}
.bundle-buy-btn {
    display: inline-flex; align-items: center; gap: .45rem;
    padding: .6rem 1.3rem;
    background: linear-gradient(135deg, #10b981, #059669);
    border: none; border-radius: 10px;
    color: #fff; font-size: .82rem; font-weight: 700;
    cursor: pointer; white-space: nowrap;
    transition: opacity .2s, transform .15s;
    box-shadow: 0 4px 16px rgba(16,185,129,.25);
    text-decoration: none;
}
.bundle-buy-btn:hover { opacity: .88; transform: scale(1.04); }
.bundle-buy-btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }
.bundle-section-head {
    display: flex; align-items: center; gap: .7rem;
    margin-bottom: 1.25rem;
}
.bundle-section-title {
    font-family: 'Syne', sans-serif;
    font-size: 1.1rem; font-weight: 800; color: #fff;
}
.bundle-section-sub {
    font-size: .8rem; color: rgba(255,255,255,.4);
    margin-left: auto;
}
</style>

<div class="bundle-section-head">
    <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" width="18" height="18"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
    <div class="bundle-section-title">Bundles</div>
    <div class="bundle-section-sub">Exclusive reward packages</div>
</div>

<div class="bundles-grid">
<?php foreach ($activeBundles as $bn):
    $bnBadges    = json_decode($bn['badges']  ?? '[]', true) ?: [];
    $bnEffects   = json_decode($bn['effects'] ?? '[]', true) ?: [];
    $bnPremium   = (int)$bn['premium_days'];
    $isEuro      = $bn['price_type'] === 'euro';
    $priceNum    = (float)$bn['price'];
    $priceStr    = $isEuro ? '€'.number_format($priceNum,2) : number_format($priceNum,0).' tokens';
    $hasRewards  = !empty($bnBadges) || !empty($bnEffects) || $bnPremium > 0;
    $siteEmail   = 'admin@'.strtolower(preg_replace('/[^a-z0-9.]/i','',SITE_NAME));
    $bundleOwned = in_array((int)$bn['id'], $purchasedBundleIds, true);
?>
<div class="bundle-shop-card" id="bundle-card-<?= (int)$bn['id'] ?>">
    <!-- Top label -->
    <div class="bundle-pill-label">
        <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        Bundle
    </div>

    <!-- Name -->
    <div class="bundle-name"><?= htmlspecialchars($bn['name'], ENT_QUOTES) ?></div>

    <!-- Reward pills -->
    <?php if ($hasRewards): ?>
    <div class="bundle-rewards-wrap">
        <?php if ($bnPremium > 0): ?>
        <span class="bundle-reward-pill" style="color:#ffd700;border-color:rgba(255,215,0,.3);background:rgba(255,215,0,.08)">
            ⭐ <?= $bnPremium ?>d Premium
        </span>
        <?php endif; ?>
        <?php foreach ($bnBadges as $bid):
            $bc = $badgeDisplayMap[$bid] ?? ['name'=>$bid,'color'=>'#aaa'];
        ?>
        <span class="bundle-reward-pill" style="color:<?= $bc['color'] ?>;border-color:<?= $bc['color'] ?>44;background:<?= $bc['color'] ?>11;display:inline-flex;align-items:center;gap:.3rem">
            <?= getBadgeSvgShop($bid, $bc['color']) ?>
            <?= htmlspecialchars($bc['name'], ENT_QUOTES) ?>
        </span>
        <?php endforeach; ?>
        <?php foreach ($bnEffects as $eid):
            $en = $effectDisplayMap[$eid] ?? $eid;
            $eType = str_starts_with($eid,'cursor_') ? 'cursor' : (str_starts_with($eid,'avatar_') ? 'avatar' : 'bg');
        ?>
        <span class="bundle-reward-pill" style="color:#a5b4fc;border-color:rgba(99,102,241,.3);background:rgba(99,102,241,.08)">
            ✨ <?= htmlspecialchars($en, ENT_QUOTES) ?>
        </span>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>

    <!-- Price + Buy -->
    <div class="bundle-price-row">
        <div>
            <div class="bundle-price-val" style="color:<?= $isEuro ? '#10b981' : '#00d4ff' ?>">
                <?= $priceStr ?>
            </div>
            <div style="font-size:.7rem;color:rgba(255,255,255,.35);margin-top:.2rem">
                <?= $isEuro ? 'one-time payment' : 'paid with tokens' ?>
            </div>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem">
        <?php if ($isEuro): ?>
        <a href="mailto:<?= $siteEmail ?>?subject=Bundle+Purchase:+<?= urlencode($bn['name']) ?>&body=User+ID:+<?= $userId ?>%0ABundle:+<?= urlencode($bn['name']) ?>%0APrice:+<?= urlencode($priceStr) ?>"
           class="bundle-buy-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Buy for <?= $priceStr ?>
        </a>
        <?php elseif ($bundleOwned): ?>
        <button class="bundle-buy-btn" disabled style="background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.35);color:#10b981;box-shadow:none;cursor:default">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
            Owned
        </button>
        <?php else: ?>
        <button class="bundle-buy-btn" id="bundle-buy-btn-<?= (int)$bn['id'] ?>"
                onclick="bundleShopBuy(<?= (int)$bn['id'] ?>, '<?= htmlspecialchars($bn['name'], ENT_QUOTES) ?>', <?= (int)$priceNum ?>)">
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>
            Buy
        </button>
        <?php endif; ?>
        <?php if (!$isEuro): ?>
        <button class="shop-gift-btn" onclick="bundleOpenGift(<?= (int)$bn['id'] ?>, '<?= htmlspecialchars($bn['name'], ENT_QUOTES) ?>', <?= (int)$priceNum ?>)" title="Gift this bundle">
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M20 12v10H4V12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
            Gift
        </button>
        <?php endif; ?>
        </div>
    </div>
</div>
<?php endforeach; ?>
</div>

<script>
// ── Bundle Buy — uses the same SCM confirm modal as badges ──
let _bundlePending = null;

function bundleShopBuy(bundleId, bundleName, price) {
    _bundlePending = { bundleId, bundleName, price };

    const tokenEl = document.getElementById('shop-token-count');
    const currentTokens = tokenEl ? parseInt(tokenEl.textContent.replace(/,/g,'')) || 0 : 0;
    if (currentTokens < price) {
        showToast('Not enough tokens! You need ' + price.toLocaleString() + ' tokens.', 'error');
        return;
    }

    // Fill modal
    const nameEl = document.getElementById('shopConfirmName');
    const priceEl = document.getElementById('shopConfirmPrice');
    if (nameEl)  { nameEl.textContent = bundleName; nameEl.style.color = '#10b981'; }
    if (priceEl) { priceEl.textContent = price.toLocaleString(); priceEl.style.color = '#10b981'; }

    // Tint icon to green (bundle color)
    const p1 = document.getElementById('scmIconPath1');
    const ln = document.getElementById('scmIconLine');
    const p2 = document.getElementById('scmIconPath2');
    if (p1) p1.setAttribute('stroke', '#10b981');
    if (ln) ln.setAttribute('stroke', '#10b981');
    if (p2) p2.setAttribute('stroke', '#10b981');
    const iconEl = document.querySelector('.scm-icon');
    if (iconEl) iconEl.style.background = 'radial-gradient(circle at 60% 35%, rgba(16,185,129,.22) 0%, rgba(16,185,129,.07) 60%, transparent 100%)';
    const box = document.querySelector('.scm-box');
    if (box) box.style.setProperty('--scm-glow', 'rgba(16,185,129,.18)');

    // Override confirm button to bundle flow
    const confirmBtn = document.querySelector('#shopConfirmOverlay .scm-btn-confirm');
    if (confirmBtn) confirmBtn.onclick = bundleConfirmDo;

    const overlay = document.getElementById('shopConfirmOverlay');
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('scm-visible'));
}

async function bundleConfirmDo() {
    if (!_bundlePending) return;
    const { bundleId, bundleName, price } = _bundlePending;
    const _scmBtn = document.querySelector('#shopConfirmOverlay .scm-btn-confirm');
    if (_scmBtn) { _scmBtn.disabled = true; _scmBtn.style.opacity = '0.5'; }
    shopConfirmClose();
    _bundlePending = null;

    try {
        const res = await fetch('/api/shop.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'buy_bundle', bundle_id: bundleId })
        });
        const data = await res.json();
        if (data.success) {
            spawnPurchaseParticles();
            showToast('🎁 Bundle "' + bundleName + '" unlocked!', 'success');
            document.querySelectorAll('.token-balance,[data-tokens],.tokens-val,#shop-token-count').forEach(el => {
                if (data.tokens !== undefined) el.textContent = data.tokens.toLocaleString();
            });
            setTimeout(() => location.reload(), 2400);
        } else {
            showToast(data.error || 'Purchase failed.', 'error');
        }
    } catch(e) {
        showToast('Network error.', 'error');
    }
}

// ── Bundle Gift ─────────────────────────────────────────────────────
let _giftBundleId   = null;
let _giftBundleName = null;
let _giftBundlePrice = 0;

function bundleOpenGift(bundleId, bundleName, price) {
    _giftBundleId   = bundleId;
    _giftBundleName = bundleName;
    _giftBundlePrice = price;

    giftItemId   = '__bundle__' + bundleId;
    giftItemName = bundleName;
    giftItemCost = price;
    giftTargetId = null;

    // Set modal title
    const titleEl = document.querySelector('#gift-overlay .gift-modal-title');
    if (titleEl) titleEl.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="vertical-align:-2px;margin-right:4px"><path d="M20 12v10H4V12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg> Gift Bundle';
    const subEl = document.querySelector('#gift-overlay .gift-modal-sub');
    if (subEl) subEl.textContent = 'Choose who to send this bundle to';

    document.getElementById('gift-badge-name').textContent = bundleName;
    document.getElementById('gift-badge-cost').textContent = price.toLocaleString() + ' tokens';
    const ico = document.getElementById('gift-badge-ico');
    ico.style.background = 'rgba(16,185,129,.13)';
    ico.style.border = '1px solid rgba(16,185,129,.3)';
    ico.innerHTML = '<svg viewBox="0 0 24 24" fill="#10b981" width="22" height="22"><path d="M20 12v10H4V12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7" stroke="#10b981" stroke-width="2"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>';

    // Override send button to bundle gift flow
    const sendBtn = document.getElementById('gift-send-btn');
    if (sendBtn) sendBtn.onclick = sendBundleGift;

    clearGiftUser();
    document.getElementById('gift-search').value = '';
    document.getElementById('gift-results').innerHTML = '';
    document.getElementById('gift-results').classList.remove('show');
    document.getElementById('gift-overlay').classList.add('open');
}

async function sendBundleGift() {
    if (!giftTargetId) return;
    const sendBtn = document.getElementById('gift-send-btn');
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    try {
        const r = await fetch('/api/shop.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'gift_bundle', bundle_id: _giftBundleId, target_id: giftTargetId })
        });
        const j = await r.json();
        if (j.success) {
            closeGift();
            spawnPurchaseParticles();
            document.querySelectorAll('.token-balance,[data-tokens],.tokens-val,#shop-token-count').forEach(el => {
                if (j.tokens !== undefined) el.textContent = j.tokens.toLocaleString();
            });
            showToast(j.message || 'Bundle gifted!', 'success');
        } else {
            showToast(j.error || 'Gift failed.', 'error');
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send Gift';
        }
    } catch(e) {
        showToast('Network error. Please try again.', 'error');
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Gift';
    }
}
</script>
<?php endif; ?>

<!-- ══ PREMIUM PLAN SECTION ══════════════════════════════════════════ -->
<div id="premium" class="prem-section">
<style>
/* ══ Side-by-side wrapper ══ */
.shop-top-grid {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 1.25rem;
    margin-bottom: 2.5rem;
    align-items: stretch;
}
@media (max-width: 960px) {
    .shop-top-grid { grid-template-columns: 1fr; }
}
.shop-top-grid > div { display: flex; flex-direction: column; }
.prem-section { margin-bottom: 0; }
.prem-card {
    border-radius: 20px; padding: 2rem 2.5rem;
    background: linear-gradient(135deg,rgba(255,215,0,.08) 0%,rgba(255,150,0,.04) 50%,rgba(15,12,8,.95) 100%);
    border: 1.5px solid rgba(255,215,0,.3);
    box-shadow: 0 0 40px rgba(255,215,0,.08), inset 0 1px 0 rgba(255,215,0,.1);
    position: relative; overflow: hidden; flex: 1; box-sizing: border-box;
}
.prem-card::before {
    content:''; position:absolute; top:-40px; right:-40px;
    width:200px; height:200px; border-radius:50%;
    background:radial-gradient(circle,rgba(255,215,0,.12),transparent 70%);
    pointer-events:none;
}
.prem-card-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem; }
.prem-badge-pill {
    display:inline-flex; align-items:center; gap:.4rem;
    background:rgba(255,215,0,.12); border:1px solid rgba(255,215,0,.35);
    border-radius:30px; padding:.3rem .85rem; font-size:.75rem;
    font-weight:700; color:#ffd700; letter-spacing:.05em;
}
.prem-title { font-family:'Syne',sans-serif; font-size:1.5rem; font-weight:800; color:#fff; margin:.35rem 0 .2rem; }
.prem-sub { color:rgba(255,255,255,.5); font-size:.875rem; }
.prem-perks { display:grid; grid-template-columns: 1fr 1fr; gap:.55rem; margin-bottom:1.75rem; }
.prem-perk {
    display:flex; align-items:center; gap:.6rem; padding:.6rem .85rem;
    background:rgba(255,215,0,.05); border:1px solid rgba(255,215,0,.12);
    border-radius:10px; font-size:.83rem; color:rgba(255,255,255,.8);
}
.prem-perk-ico { color:#ffd700; flex-shrink:0; }
.prem-buy-row { display:flex; align-items:center; gap:1rem; flex-wrap:wrap; }
.prem-price-tag { font-family:'Syne',sans-serif; font-size:2rem; font-weight:900; color:#ffd700; }
.prem-price-sub { font-size:.78rem; color:rgba(255,255,255,.35); margin-top:2px; }
.btn-buy-premium {
    display:inline-flex; align-items:center; gap:.5rem; padding:.75rem 1.75rem;
    background:linear-gradient(135deg,#ffd700,#ff9900);
    color:#0a0806; font-weight:800; border-radius:12px; border:none;
    font-family:'Outfit',sans-serif; font-size:.9rem; cursor:pointer;
    transition:opacity .2s,transform .2s; text-decoration:none;
}
.btn-buy-premium:hover { opacity:.88; transform:scale(1.03); }
.prem-token-buy {
    display:inline-flex; align-items:center; gap:.5rem; padding:.75rem 1.5rem;
    background:rgba(255,215,0,.08); border:1px solid rgba(255,215,0,.25);
    color:#ffd700; font-weight:700; border-radius:12px;
    font-family:'Outfit',sans-serif; font-size:.85rem; cursor:pointer;
    transition:all .2s; white-space:nowrap;
}
.prem-token-buy:hover { background:rgba(255,215,0,.14); border-color:rgba(255,215,0,.45); }
.prem-active-banner {
    display:flex; align-items:center; gap:.75rem; padding:.85rem 1.25rem;
    background:rgba(255,215,0,.08); border:1px solid rgba(255,215,0,.25);
    border-radius:12px; color:#ffd700; font-weight:700; font-size:.9rem;
}
/* Token buy modal */
.token-days-wrap { display:flex; align-items:center; gap:.75rem; margin:1rem 0; }
.token-days-input {
    width:80px; padding:.5rem .75rem; background:rgba(255,255,255,.05);
    border:1px solid rgba(255,255,255,.12); border-radius:8px; color:#fff;
    font-size:1rem; text-align:center; outline:none; font-family:'Outfit',sans-serif;
}
.token-days-cost { color:rgba(255,215,0,.8); font-size:.85rem; }
/* ══ Token Premium Modal — Redesign ══════════════════════════════ */
.tpm-overlay {
    position: fixed; inset: 0; z-index: 600;
    background: rgba(0,0,0,.75);
    backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    opacity: 0; pointer-events: none;
    transition: opacity .28s cubic-bezier(.4,0,.2,1);
}
.tpm-overlay.open { opacity: 1; pointer-events: all; }
.tpm-modal {
    position: relative;
    width: 100%; max-width: 400px;
    background: linear-gradient(160deg, #1a1508 0%, #0d0a04 60%, #0f0d08 100%);
    border: 1px solid rgba(255,215,0,.22);
    border-radius: 24px;
    padding: 0;
    overflow: hidden;
    box-shadow: 0 32px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(255,215,0,.06) inset;
    transform: translateY(20px) scale(.96);
    transition: transform .3s cubic-bezier(.34,1.56,.64,1);
}
.tpm-overlay.open .tpm-modal { transform: translateY(0) scale(1); }

/* Glow top-right orb */
.tpm-modal::before {
    content: '';
    position: absolute; top: -60px; right: -60px;
    width: 200px; height: 200px; border-radius: 50%;
    background: radial-gradient(circle, rgba(255,185,0,.2) 0%, transparent 70%);
    pointer-events: none;
}

/* Header band */
.tpm-header {
    padding: 1.6rem 1.75rem 1.2rem;
    border-bottom: 1px solid rgba(255,215,0,.1);
    position: relative;
}
.tpm-close {
    position: absolute; top: 1.1rem; right: 1.1rem;
    background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
    border-radius: 8px; cursor: pointer; color: rgba(255,255,255,.5);
    padding: .3rem .35rem; line-height: 1;
    transition: all .18s;
}
.tpm-close:hover { background: rgba(255,255,255,.12); color: #fff; }
.tpm-pill {
    display: inline-flex; align-items: center; gap: .35rem;
    background: rgba(255,185,0,.12); border: 1px solid rgba(255,185,0,.3);
    border-radius: 20px; padding: .25rem .75rem;
    font-size: .7rem; font-weight: 800; color: #ffb900;
    letter-spacing: .08em; text-transform: uppercase; margin-bottom: .6rem;
}
.tpm-title {
    font-family: 'Syne', sans-serif;
    font-size: 1.25rem; font-weight: 900; color: #fff;
    margin-bottom: .2rem; line-height: 1.2;
}
.tpm-sub {
    font-size: .8rem; color: rgba(255,255,255,.38);
}

/* Body */
.tpm-body { padding: 1.4rem 1.75rem 1.75rem; }

/* Days selector */
.tpm-days-label {
    font-size: .72rem; font-weight: 700; color: rgba(255,255,255,.4);
    text-transform: uppercase; letter-spacing: .09em;
    margin-bottom: .5rem;
}
.tpm-days-row {
    display: flex; align-items: center; gap: .75rem; margin-bottom: 1rem;
}
.tpm-days-ctrl {
    display: flex; align-items: center; gap: 0;
    background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12);
    border-radius: 12px; overflow: hidden;
}
.tpm-days-btn {
    background: none; border: none; cursor: pointer;
    color: rgba(255,255,255,.6); padding: .55rem .85rem;
    font-size: 1.15rem; line-height: 1; transition: all .15s;
    user-select: none;
}
.tpm-days-btn:hover { background: rgba(255,215,0,.1); color: #ffd700; }
.tpm-days-input {
    width: 64px; background: none; border: none;
    color: #fff; font-size: 1.1rem; font-weight: 800;
    text-align: center; outline: none;
    font-family: 'Outfit', sans-serif; padding: .4rem 0;
}
/* Hide number arrows */
.tpm-days-input::-webkit-outer-spin-button,
.tpm-days-input::-webkit-inner-spin-button { -webkit-appearance: none; }
.tpm-days-input[type=number] { -moz-appearance: textfield; }

.tpm-preset-chips {
    display: flex; gap: .45rem; flex-wrap: wrap; margin-bottom: 1.2rem;
}
.tpm-chip {
    padding: .3rem .75rem; border-radius: 20px; font-size: .78rem; font-weight: 700;
    border: 1px solid rgba(255,215,0,.2); background: rgba(255,215,0,.05);
    color: rgba(255,215,0,.65); cursor: pointer; transition: all .17s;
}
.tpm-chip:hover, .tpm-chip.active {
    background: rgba(255,185,0,.18); border-color: rgba(255,185,0,.5); color: #ffb900;
}

/* Cost summary card */
.tpm-cost-card {
    background: rgba(255,185,0,.06);
    border: 1px solid rgba(255,185,0,.18);
    border-radius: 14px; padding: 1rem 1.1rem;
    margin-bottom: 1.2rem;
    display: flex; align-items: center; justify-content: space-between;
    gap: .5rem;
}
.tpm-cost-label { font-size: .8rem; color: rgba(255,255,255,.4); }
.tpm-cost-amount {
    font-family: 'Syne', sans-serif;
    font-size: 1.6rem; font-weight: 900; color: #ffd700;
    line-height: 1;
}
.tpm-cost-unit { font-size: .72rem; color: rgba(255,215,0,.5); margin-top: 2px; }

/* Balance bar */
.tpm-bal-row {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: .5rem; font-size: .78rem;
}
.tpm-bal-label { color: rgba(255,255,255,.38); }
.tpm-bal-value { color: #ffd700; font-weight: 700; }
.tpm-bar-track {
    height: 6px; background: rgba(255,255,255,.07); border-radius: 99px;
    overflow: hidden; margin-bottom: 1.35rem;
}
.tpm-bar-fill {
    height: 100%; border-radius: 99px;
    background: linear-gradient(90deg, #ffb900, #ffd700);
    transition: width .4s cubic-bezier(.4,0,.2,1);
    max-width: 100%;
}
.tpm-bar-fill.danger { background: linear-gradient(90deg, #ff4e4e, #ff8c42); }

/* Activate button */
.tpm-activate-btn {
    width: 100%; padding: .9rem; border: none; border-radius: 14px;
    background: linear-gradient(135deg, #ffb900 0%, #ffd700 50%, #ff9800 100%);
    color: #0a0600; font-family: 'Outfit', sans-serif;
    font-size: 1rem; font-weight: 900; cursor: pointer;
    letter-spacing: .02em;
    box-shadow: 0 6px 24px rgba(255,185,0,.3);
    transition: all .22s cubic-bezier(.4,0,.2,1);
    position: relative; overflow: hidden;
}
.tpm-activate-btn::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(255,255,255,.18) 0%, transparent 60%);
    pointer-events: none;
}
.tpm-activate-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 32px rgba(255,185,0,.45);
    filter: brightness(1.08);
}
.tpm-activate-btn:active { transform: translateY(0); }
.tpm-activate-btn:disabled {
    opacity: .45; cursor: not-allowed; transform: none;
    box-shadow: none; filter: none;
}
.tpm-not-enough {
    text-align: center; font-size: .76rem; color: #ff6b6b;
    margin-top: .6rem; display: none;
}

/* Gift row inside premium card */
.prem-gift-row {
    display:flex; align-items:center; gap:.65rem; flex-wrap:wrap;
    margin-top:.85rem; padding-top:.85rem;
    border-top:1px solid rgba(255,255,255,.07);
}
.prem-gift-label {
    display:inline-flex; align-items:center; gap:.35rem;
    font-size:.78rem; color:rgba(255,255,255,.4); white-space:nowrap;
}
.btn-gift-prem-money {
    display:inline-flex; align-items:center; gap:.45rem; padding:.55rem 1.1rem;
    background:linear-gradient(135deg,#ffd700,#ff9900);
    color:#0a0806; font-weight:800; border-radius:10px; border:none;
    font-family:'Outfit',sans-serif; font-size:.82rem; cursor:pointer;
    transition:opacity .2s,transform .2s;
}
.btn-gift-prem-money:hover { opacity:.88; transform:scale(1.02); }
.btn-gift-prem-tokens {
    display:inline-flex; align-items:center; gap:.45rem; padding:.55rem 1.1rem;
    background:rgba(255,215,0,.08); border:1px solid rgba(255,215,0,.25);
    color:#ffd700; font-weight:700; border-radius:10px;
    font-family:'Outfit',sans-serif; font-size:.82rem; cursor:pointer;
    transition:all .2s; white-space:nowrap;
}
.btn-gift-prem-tokens:hover { background:rgba(255,215,0,.15); border-color:rgba(255,215,0,.45); }
</style>
<div class="shop-top-grid">
<div>
<div class="prem-card">
    <div class="prem-card-header">
        <div>
            <div class="prem-badge-pill">
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2L9.5 8.5H3l5.5 4L6 19l6-4 6 4-2.5-6.5L21 8.5h-6.5L12 2z"/></svg>
                PREMIUM
            </div>
            <div class="prem-title">Unlock the full experience</div>
            <div class="prem-sub">Everything you need to stand out on <?= SITE_NAME ?>.</div>
        </div>
    </div>

    <div class="prem-perks">
        <div class="prem-perk"><span class="prem-perk-ico"><svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg></span> Full Analytics dashboard</div>
        <div class="prem-perk"><span class="prem-perk-ico"><svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2L9.5 8.5H3l5.5 4L6 19l6-4 6 4-2.5-6.5L21 8.5h-6.5L12 2z"/></svg></span> Visual Effects access</div>
        <div class="prem-perk"><span class="prem-perk-ico"><svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M6.5 3C4.6 3 3 4.6 3 6.5c0 5.3 7.5 13.5 9 13.5S21 11.8 21 6.5C21 4.6 19.4 3 17.5 3c-1.2 0-2.2.6-2.9 1.5C14.8 3.6 13.5 3 12 3s-2.8.6-3.5 1.5C7.7 3.6 6.7 3 6.5 3z" opacity=".6"/><path d="M12 3c1.5 0 2.8.6 3.6 1.5C14.8 3.6 13.7 3 12.5 3H12zm0 0c-1.5 0-2.8.6-3.6 1.5C9.2 3.6 10.3 3 11.5 3H12z"/><path d="M12 2a5 5 0 100 10A5 5 0 0012 2zm0 8a3 3 0 110-6 3 3 0 010 6z"/></svg></span> Exclusive Diamond badge</div>
        <div class="prem-perk"><span class="prem-perk-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg></span> Golden 3D avatar ring</div>
        <div class="prem-perk"><span class="prem-perk-ico"><svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg><strong style="font-size:.78rem">2×</strong></span> Double referral rewards (20 tokens)</div>
        <div class="prem-perk"><span class="prem-perk-ico"><svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg></span> 5 tokens per profile view (vs 3)</div>
        <div class="prem-perk"><span class="prem-perk-ico"><svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg></span> Priority support when you need it</div>
        <div class="prem-perk"><span class="prem-perk-ico"><svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.59 13L12 10.41 7.41 15 6 13.59l4.59-4.59L6 4.41 7.41 3 12 7.59 16.59 3 18 4.41l-4.59 4.59L18 13.59 16.59 15z"/></svg></span> Remove watermark from profile</div>
    </div>

    <?php if ($isPremium): ?>
    <div class="prem-active-banner">
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 2L9.5 8.5H3l5.5 4L6 19l6-4 6 4-2.5-6.5L21 8.5h-6.5L12 2z"/></svg>
        Premium is active<?= !empty($profile['premium_expires_at']) ? ' — expires ' . date('d M Y', strtotime($profile['premium_expires_at'])) : ' (lifetime)' ?>.
    <button class="prem-token-buy" onclick="openTokenPremModal()" style="margin-left:auto">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style="vertical-align:-2px;margin-right:3px"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>
                Extend with tokens
            </button>
    </div>
    <div class="prem-gift-row">
        <span class="prem-gift-label">
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M20 12v10H4V12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
            Gift Premium:
        </span>
        <button class="btn-gift-prem-money" onclick="openGiftPremModal('money')">
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
            Gift for €7
        </button>
        <button class="btn-gift-prem-tokens" onclick="openGiftPremModal('tokens')">
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>
            Gift with tokens (100/day)
        </button>
    </div>
    <?php else: ?>
    <div class="prem-buy-row">
        <div>
            <div class="prem-price-tag">€7</div>
            <div class="prem-price-sub">lifetime · one-time</div>
        </div>
        <a href="mailto:admin@<?= strtolower(preg_replace('/[^a-z0-9.]/i','',SITE_NAME)) ?>?subject=Premium+Purchase&body=User+ID:+<?= $userId ?>" class="btn-buy-premium">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2L9.5 8.5H3l5.5 4L6 19l6-4 6 4-2.5-6.5L21 8.5h-6.5L12 2z"/></svg>
            Buy Premium — €7 <span style="font-size:.75rem;opacity:.75;font-weight:600;margin-left:4px">(lifetime)</span>
        </a>
        <button class="prem-token-buy" onclick="openTokenPremModal()">
            <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15" style="vertical-align:-2px"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>
            Buy with tokens <span style="font-size:.75rem;opacity:.75;font-weight:600;margin-left:2px">(100/day · durată limitată)</span>
        </button>
    </div>
    <div class="prem-gift-row">
        <span class="prem-gift-label">
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M20 12v10H4V12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
            Gift Premium:
        </span>
        <button class="btn-gift-prem-money" onclick="openGiftPremModal('money')">
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
            Gift for €7
        </button>
        <button class="btn-gift-prem-tokens" style="opacity:.38;cursor:not-allowed" title="Premium required to gift with tokens" onclick="showToast('Gifting Premium with tokens requires your own Premium subscription.','error')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            Gift with tokens (Premium only)
        </button>
    </div>
    <?php endif; ?>
</div>
</div>

<!-- ══ VERIFIED BADGE SECTION — inside grid ══ -->
<?php
$hasVerified = in_array('verified', $ownedBadges, true);
?>
<style>
.verified-card {
    border-radius: 20px; padding: 2rem 1.75rem;
    background: linear-gradient(160deg,rgba(52,211,153,.09) 0%,rgba(0,150,200,.04) 50%,rgba(8,12,20,.95) 100%);
    border: 1.5px solid rgba(52,211,153,.3);
    box-shadow: 0 0 40px rgba(52,211,153,.07), inset 0 1px 0 rgba(52,211,153,.1);
    position: relative; overflow: hidden;
    display: flex; flex-direction: column; gap: 1.25rem;
    height: 100%; box-sizing: border-box;
}
#verified-section { align-self: stretch; }
.verified-card::before {
    content:''; position:absolute; top:-40px; right:-40px;
    width:200px; height:200px; border-radius:50%;
    background:radial-gradient(circle,rgba(52,211,153,.12),transparent 70%);
    pointer-events:none;
}
.verified-card-left { display:flex; flex-direction:column; align-items:flex-start; gap:1rem; }
.verified-icon-wrap {
    width:58px; height:58px; border-radius:16px; flex-shrink:0;
    background:rgba(52,211,153,.12); border:1.5px solid rgba(52,211,153,.3);
    display:flex; align-items:center; justify-content:center;
    color:#34d399;
}
.verified-card-info .verified-label {
    display:inline-flex; align-items:center; gap:.4rem;
    background:rgba(52,211,153,.12); border:1px solid rgba(52,211,153,.35);
    border-radius:30px; padding:.25rem .8rem; font-size:.72rem;
    font-weight:700; color:#34d399; letter-spacing:.05em;
    margin-bottom:.4rem;
}
.verified-card-info h3 {
    font-family:'Syne',sans-serif; font-size:1.25rem; font-weight:800; color:#fff;
    margin:0 0 .2rem;
}
.verified-card-info p { color:rgba(255,255,255,.5); font-size:.85rem; margin:0; }
.verified-buy-row { display:flex; align-items:center; gap:1rem; flex-wrap:wrap; margin-top:auto; }
.verified-perks { display:flex; flex-direction:column; gap:.5rem; width:100%; }
.verified-perk {
    display:flex; align-items:center; gap:.6rem; padding:.55rem .85rem;
    background:rgba(52,211,153,.05); border:1px solid rgba(52,211,153,.12);
    border-radius:10px; font-size:.82rem; color:rgba(255,255,255,.8);
}
.verified-perk-ico { color:#34d399; flex-shrink:0; }
.verified-price { font-family:'Syne',sans-serif; font-size:2rem; font-weight:900; color:#34d399; }
.verified-price-sub { font-size:.75rem; color:rgba(255,255,255,.35); margin-top:2px; }
.btn-buy-verified {
    display:inline-flex; align-items:center; gap:.5rem; padding:.75rem 1.75rem;
    background:#34d399;
    color:#000; font-weight:800; border-radius:12px; border:none;
    font-family:'Outfit',sans-serif; font-size:.9rem; cursor:pointer;
    transition:opacity .2s,transform .2s; text-decoration:none;
}
.btn-buy-verified:hover { opacity:.88; transform:scale(1.03); }
.verified-owned-banner {
    display:flex; align-items:center; gap:.75rem; padding:.85rem 1.25rem;
    background:rgba(52,211,153,.08); border:1px solid rgba(52,211,153,.25);
    border-radius:12px; color:#34d399; font-weight:700; font-size:.9rem;
}
/* Verified purchase modal */
.vpm-overlay {
    position:fixed; inset:0; z-index:700;
    background:rgba(0,0,0,.75); backdrop-filter:blur(10px);
    display:flex; align-items:center; justify-content:center;
    opacity:0; pointer-events:none; transition:opacity .25s;
}
.vpm-overlay.open { opacity:1; pointer-events:all; }
.vpm-modal {
    position:relative; width:100%; max-width:380px;
    background:linear-gradient(160deg,#050e15 0%,#080d10 100%);
    border:1px solid rgba(52,211,153,.22); border-radius:22px;
    overflow:hidden; box-shadow:0 32px 80px rgba(0,0,0,.7);
    transform:translateY(18px) scale(.96); transition:transform .28s cubic-bezier(.34,1.56,.64,1);
}
.vpm-overlay.open .vpm-modal { transform:translateY(0) scale(1); }
.vpm-header {
    padding:1.5rem 1.75rem 1.1rem;
    border-bottom:1px solid rgba(52,211,153,.1); position:relative;
}
.vpm-close {
    position:absolute; top:1.1rem; right:1.1rem;
    background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1);
    border-radius:8px; cursor:pointer; color:rgba(255,255,255,.5);
    padding:.3rem .35rem; line-height:1; transition:all .18s;
}
.vpm-close:hover { background:rgba(255,255,255,.12); color:#fff; }
.vpm-pill {
    display:inline-flex; align-items:center; gap:.35rem;
    background:rgba(52,211,153,.12); border:1px solid rgba(52,211,153,.3);
    border-radius:20px; padding:.25rem .75rem;
    font-size:.7rem; font-weight:800; color:#34d399;
    letter-spacing:.08em; text-transform:uppercase; margin-bottom:.6rem;
}
.vpm-title { font-family:'Syne',sans-serif; font-size:1.2rem; font-weight:900; color:#fff; margin-bottom:.2rem; }
.vpm-sub { font-size:.8rem; color:rgba(255,255,255,.38); }
.vpm-body { padding:1.4rem 1.75rem 1.75rem; }
.vpm-preview {
    display:flex; align-items:center; gap:1rem;
    background:rgba(52,211,153,.06); border:1px solid rgba(52,211,153,.15);
    border-radius:14px; padding:1rem 1.1rem; margin-bottom:1.25rem;
}
.vpm-preview-ico {
    width:48px; height:48px; border-radius:12px;
    background:rgba(52,211,153,.12); border:1px solid rgba(52,211,153,.3);
    display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#34d399;
}
.vpm-preview-info strong { font-size:.95rem; font-weight:800; display:block; color:#fff; }
.vpm-preview-info span { font-size:.78rem; color:rgba(255,255,255,.4); }
.vpm-price-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem; }
.vpm-price-big { font-family:'Syne',sans-serif; font-size:2rem; font-weight:900; color:#34d399; }
.vpm-price-note { font-size:.78rem; color:rgba(255,255,255,.35); }
.vpm-buy-btn {
    width:100%; padding:.9rem; border:none; border-radius:14px;
    background:linear-gradient(135deg,#2ecc9a,#34d399,#1fac79);
    color:#000; font-family:'Outfit',sans-serif;
    font-size:1rem; font-weight:900; cursor:pointer;
    box-shadow:0 6px 24px rgba(52,211,153,.3);
    transition:all .22s; position:relative; overflow:hidden;
}
.vpm-buy-btn::after {
    content:''; position:absolute; inset:0;
    background:linear-gradient(180deg,rgba(255,255,255,.18) 0%,transparent 60%);
    pointer-events:none;
}
.vpm-buy-btn:hover { transform:translateY(-2px); box-shadow:0 10px 32px rgba(52,211,153,.45); filter:brightness(1.08); }
.vpm-buy-btn:active { transform:translateY(0); }
</style>
<div id="verified-section">
<div class="verified-card">
    <div class="verified-card-left">
        <div style="display:flex;align-items:center;gap:1rem;">
            <div class="verified-card-info">
                <div class="verified-label">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                    VERIFIED
                </div>
                <h3>Get Verified</h3>
                <p>Show the world your account is authentic.</p>
            </div>
        </div>

        <div class="verified-perks">
            <div class="verified-perk"><span class="verified-perk-ico"><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg></span> Official green checkmark badge</div>
            <div class="verified-perk"><span class="verified-perk-ico"><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg></span> Visible on your public profile</div>
            <div class="verified-perk"><span class="verified-perk-ico"><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg></span> Permanent — one-time purchase</div>
            <div class="verified-perk"><span class="verified-perk-ico"><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg></span> Builds trust with your audience</div>
        </div>
    </div>

    <?php if ($hasVerified): ?>
    <div class="verified-owned-banner">
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
        Your account is Verified.
    </div>
    <?php else: ?>
    <div class="verified-buy-row">
        <div>
            <div class="verified-price">€5</div>
            <div class="verified-price-sub">one-time · permanent</div>
        </div>
        <button class="btn-buy-verified" onclick="openVerifiedModal()">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
            Buy Verified — €5
        </button>
    </div>
    <?php endif; ?>
</div>
</div>
</div>

<!-- Verified Purchase Modal -->
<?php if (!$hasVerified): ?>
<div class="vpm-overlay" id="verifiedModal" onclick="if(event.target===this)closeVerifiedModal()">
    <div class="vpm-modal">
        <div class="vpm-header">
            <button class="vpm-close" onclick="closeVerifiedModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="15" height="15"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div class="vpm-title">Get Verified</div>
            <div class="vpm-sub">One-time purchase — permanent badge on your profile</div>
        </div>
        <div class="vpm-body">
            <div class="vpm-preview">
                <div class="vpm-preview-ico">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                </div>
                <div class="vpm-preview-info">
                    <strong>Verified Badge</strong>
                    <span>Official green checkmark — shows on your public profile</span>
                </div>
            </div>
            <div class="vpm-price-row">
                <div>

                </div>
            </div>
            <a href="mailto:admin@<?= strtolower(preg_replace('/[^a-z0-9.]/i','',SITE_NAME)) ?>?subject=Verified+Badge+Purchase&body=User+ID:+<?= $userId ?>%0AUsername:+<?= urlencode($profile['username'] ?? '') ?>%0AI+want+to+purchase+the+Verified+badge+for+%E2%82%AC7." class="vpm-buy-btn" onclick="closeVerifiedModal()">
                ✓ Buy Verified Badge — €5
            </a>
        </div>
    </div>
</div>
<script>
function openVerifiedModal() { document.getElementById('verifiedModal').classList.add('open'); }
function closeVerifiedModal() { document.getElementById('verifiedModal').classList.remove('open'); }
document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeVerifiedModal(); });
</script>
<?php endif; ?>
<div class="gift-overlay" id="giftPremOverlay" onclick="if(event.target===this)closeGiftPremModal()">
    <div class="gift-modal" style="max-width:400px">
        <button class="gift-close-x" onclick="closeGiftPremModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div class="gift-modal-title" style="color:#34d399" id="giftPremTitle">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="vertical-align:-2px;margin-right:4px"><path d="M20 12v10H4V12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
            Gift Premium
        </div>
        <div class="gift-modal-sub" id="giftPremSub">Send 30 days of Premium as a gift</div>

        <!-- Token days input (shown only for token mode) -->
        <div id="giftPremTokenRow" style="display:none">
            <div class="token-days-wrap">
                <input type="number" min="1" max="365" value="30" id="giftPremDays" class="token-days-input" oninput="updateGiftPremCost()">
                <span style="color:rgba(255,255,255,.5)">days</span>
                <span class="token-days-cost" id="giftPremCost">= 3,000 tokens</span>
            </div>
            <div style="font-size:.8rem;color:rgba(255,255,255,.4);margin-bottom:1rem">Your balance: <span style="color:#34d399" id="giftPremBal"><?= number_format($tokens) ?></span> tokens</div>
        </div>

        <!-- User search -->
        <div class="gift-selected-user" id="giftPremSelectedUser">
            <img id="giftPremSelAvatar" src="" alt="" onerror="this.src='/assets/img/default-avatar.png'">
            <span id="giftPremSelName"></span>
            <button class="gift-selected-clear" onclick="clearGiftPremUser()" title="Clear">✕</button>
        </div>
        <div class="gift-search-wrap" id="giftPremSearchWrap">
            <svg class="gift-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="gift-search-input" id="giftPremSearch" placeholder="Search username..." autocomplete="off">
        </div>
        <div class="gift-results" id="giftPremResults"></div>

        <div class="gift-modal-actions">
            <button class="gift-cancel-btn" onclick="closeGiftPremModal()">Cancel</button>
            <button class="gift-send-btn" id="giftPremSendBtn" onclick="sendGiftPremium()" disabled>Send Gift</button>
        </div>
    </div>
</div>

<script>
let giftPremMode = 'money';
let giftPremTargetId = null;
let giftPremSearchTimer = null;

function openGiftPremModal(mode) {
    giftPremMode = mode;
    giftPremTargetId = null;
    document.getElementById('giftPremTokenRow').style.display = mode === 'tokens' ? 'block' : 'none';
    document.getElementById('giftPremSub').textContent = mode === 'money'
        ? 'Send Premium for €7 — we\'ll contact the recipient.'
        : 'Deduct tokens from your balance and gift Premium days.';
    clearGiftPremUser();
    document.getElementById('giftPremSearch').value = '';
    document.getElementById('giftPremResults').innerHTML = '';
    document.getElementById('giftPremResults').classList.remove('show');
    document.getElementById('giftPremOverlay').classList.add('open');
}
function closeGiftPremModal() {
    document.getElementById('giftPremOverlay').classList.remove('open');
    giftPremTargetId = null;
}
function updateGiftPremCost() {
    const d = Math.max(1, parseInt(document.getElementById('giftPremDays').value) || 1);
    document.getElementById('giftPremCost').textContent = '= ' + (d * 100).toLocaleString() + ' tokens';
}
function clearGiftPremUser() {
    giftPremTargetId = null;
    document.getElementById('giftPremSelectedUser').classList.remove('show');
    document.getElementById('giftPremSearchWrap').style.display = '';
    document.getElementById('giftPremSendBtn').disabled = true;
}
function selectGiftPremUser(id, username, avatar) {
    giftPremTargetId = id;
    document.getElementById('giftPremSelAvatar').src = avatar;
    document.getElementById('giftPremSelName').textContent = '@' + username;
    document.getElementById('giftPremSelectedUser').classList.add('show');
    document.getElementById('giftPremSearchWrap').style.display = 'none';
    document.getElementById('giftPremResults').classList.remove('show');
    document.getElementById('giftPremSendBtn').disabled = false;
}
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('giftPremSearch').addEventListener('input', e => {
        clearTimeout(giftPremSearchTimer);
        const q = e.target.value.trim();
        if (q.length < 2) { document.getElementById('giftPremResults').classList.remove('show'); return; }
        giftPremSearchTimer = setTimeout(() => searchGiftPremUsers(q), 300);
    });
});
async function searchGiftPremUsers(q) {
    const res = document.getElementById('giftPremResults');
    res.innerHTML = '<div class="gift-no-results">Searching...</div>';
    res.classList.add('show');
    try {
        const r = await fetch('/api/shop.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'search_users', q}) });
        const j = await r.json();
        if (!j.success || !j.users.length) { res.innerHTML = '<div class="gift-no-results">No users found.</div>'; return; }
        res.innerHTML = j.users.map(u => `
            <div class="gift-result-item" onclick="selectGiftPremUser(${u.id},'${escHtml(u.username)}','${escHtml(u.avatar)}')">
                <img class="gift-result-avatar" src="${escHtml(u.avatar)}" onerror="this.src='/assets/img/default-avatar.png'" alt="">
                <span class="gift-result-name">@${escHtml(u.username)}</span>
            </div>
        `).join('');
    } catch(e) { res.innerHTML = '<div class="gift-no-results">Search failed.</div>'; }
}
async function sendGiftPremium() {
    if (!giftPremTargetId) return;
    const btn = document.getElementById('giftPremSendBtn');
    btn.disabled = true; btn.textContent = 'Sending...';
    if (giftPremMode === 'money') {
        // Redirect to email for money gift
        const username = document.getElementById('giftPremSelName').textContent;
        window.location.href = `mailto:admin@<?= strtolower(preg_replace('/[^a-z0-9.]/i','',SITE_NAME)) ?>?subject=Gift+Premium&body=I+want+to+gift+Premium+to+user+ID:+${giftPremTargetId}+(${username}).+My+user+ID:+<?= $userId ?>`;
        closeGiftPremModal();
        showToast('Opening email to complete the Premium gift...', 'success');
        btn.disabled = false; btn.textContent = 'Send Gift';
        return;
    }
    // Token mode
    const days = Math.max(1, parseInt(document.getElementById('giftPremDays').value) || 1);
    try {
        const r = await fetch('/api/shop.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'gift_premium_tokens', target_id: giftPremTargetId, days}) });
        const j = await r.json();
        if (j.success) {
            closeGiftPremModal();
            showToast(j.message, 'success');
            if (j.tokens !== undefined) {
                document.getElementById('shop-token-count').textContent = j.tokens.toLocaleString();
                document.getElementById('giftPremBal').textContent = j.tokens.toLocaleString();
            }
        } else {
            showToast(j.error || 'Error', 'error');
            btn.disabled = false; btn.textContent = 'Send Gift';
        }
    } catch(e) {
        showToast('Network error', 'error');
        btn.disabled = false; btn.textContent = 'Send Gift';
    }
}
</script>
<!-- ══ TOKEN PREMIUM MODAL — Redesigned ══════════════════════════ -->
<div class="tpm-overlay" id="tokenPremOverlay">
    <div class="tpm-modal">
        <div class="tpm-header">
            <button class="tpm-close" onclick="closeTokenPremModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="15" height="15"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div class="tpm-pill">
                <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>
                Token Purchase
            </div>
            <div class="tpm-title">Buy Premium with Tokens</div>
            <div class="tpm-sub">100 tokens per day &nbsp;·&nbsp; Minimum 1 day</div>
        </div>

        <div class="tpm-body">
            <!-- Days selector -->
            <div class="tpm-days-label">Duration</div>
            <div class="tpm-days-row">
                <div class="tpm-days-ctrl">
                    <button class="tpm-days-btn" onclick="tpmAdjust(-1)">−</button>
                    <input type="number" min="1" max="365" value="30" id="tokenPremDays" class="tpm-days-input" oninput="updateTokenCost()">
                    <button class="tpm-days-btn" onclick="tpmAdjust(1)">+</button>
                </div>
                <span style="font-size:.83rem;color:rgba(255,255,255,.4)">days</span>
            </div>

            <!-- Quick presets -->
            <div class="tpm-preset-chips">
                <span class="tpm-chip" onclick="tpmSetDays(7)">7d</span>
                <span class="tpm-chip active" onclick="tpmSetDays(30)">30d</span>
                <span class="tpm-chip" onclick="tpmSetDays(90)">90d</span>
                <span class="tpm-chip" onclick="tpmSetDays(180)">180d</span>
                <span class="tpm-chip" onclick="tpmSetDays(365)">1 year</span>
            </div>

            <!-- Cost summary -->
            <div class="tpm-cost-card">
                <div>
                    <div class="tpm-cost-label">Total cost</div>
                    <div class="tpm-cost-amount" id="tokenPremCostNum">3,000</div>
                    <div class="tpm-cost-unit">tokens</div>
                </div>
                <div style="text-align:right">
                    <div class="tpm-cost-label">Per day</div>
                    <div style="font-size:1.1rem;font-weight:800;color:rgba(255,215,0,.7);font-family:'Syne',sans-serif">100</div>
                    <div class="tpm-cost-unit">tokens/day</div>
                </div>
            </div>

            <!-- Balance bar -->
            <div class="tpm-bal-row">
                <span class="tpm-bal-label">Your balance</span>
                <span class="tpm-bal-value" id="tokenBal"><?= number_format($tokens) ?> tokens</span>
            </div>
            <div class="tpm-bar-track">
                <div class="tpm-bar-fill" id="tpmBarFill" style="width:<?= min(100, $tokens > 0 ? round(min($tokens,3000)/$tokens*100) : 0) ?>%"></div>
            </div>

            <button class="tpm-activate-btn" id="tpmActivateBtn" onclick="buyPremiumTokens()">
                ✦ Activate Premium
            </button>
            <div class="tpm-not-enough" id="tpmNotEnough">Insufficient tokens for this duration</div>
        </div>
    </div>
</div>

<script>
function openTokenPremModal() { document.getElementById('tokenPremOverlay').classList.add('open'); updateTokenCost(); }
function closeTokenPremModal() { document.getElementById('tokenPremOverlay').classList.remove('open'); }
function tpmAdjust(delta) {
    const inp = document.getElementById('tokenPremDays');
    inp.value = Math.max(1, Math.min(365, (parseInt(inp.value)||1) + delta));
    updateTokenCost();
}
function tpmSetDays(d) {
    document.getElementById('tokenPremDays').value = d;
    document.querySelectorAll('.tpm-chip').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    updateTokenCost();
}
function updateTokenCost() {
    const d = Math.max(1, parseInt(document.getElementById('tokenPremDays').value) || 1);
    const cost = d * 100;
    const balRaw = document.getElementById('tokenBal').textContent.replace(/[^0-9]/g,'');
    const bal = parseInt(balRaw) || 0;

    document.getElementById('tokenPremCostNum').textContent = cost.toLocaleString();
    // legacy id used by gift modal too
    const legacyCost = document.getElementById('tokenPremCost');
    if (legacyCost) legacyCost.textContent = '= ' + cost.toLocaleString() + ' tokens';

    // Balance bar
    const fill = document.getElementById('tpmBarFill');
    const btn  = document.getElementById('tpmActivateBtn');
    const warn = document.getElementById('tpmNotEnough');
    if (bal > 0) {
        const pct = Math.min(100, Math.round((bal / cost) * 100));
        fill.style.width = Math.min(100, pct) + '%';
        fill.className = 'tpm-bar-fill' + (bal < cost ? ' danger' : '');
    } else {
        fill.style.width = '0%';
        fill.className = 'tpm-bar-fill danger';
    }
    if (bal < cost) {
        btn.disabled = true;
        warn.style.display = 'block';
    } else {
        btn.disabled = false;
        warn.style.display = 'none';
    }
}
async function buyPremiumTokens() {
    const days = Math.max(1, parseInt(document.getElementById('tokenPremDays').value) || 1);
    const cost = days * 100;
    const balRaw = document.getElementById('tokenBal').textContent.replace(/[^0-9]/g,'');
    const bal  = parseInt(balRaw) || 0;
    if (bal < cost) { showToast('Not enough tokens. You need ' + cost.toLocaleString() + ' but have ' + bal.toLocaleString() + '.', 'error'); return; }
    const btn = document.getElementById('tpmActivateBtn');
    btn.disabled = true; btn.textContent = 'Activating...';
    const res = await fetch('/api/shop.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'buy_premium_tokens', days}) });
    const data = await res.json();
    if (data.success) {
        showToast('Premium activated for ' + days + ' day(s)!', 'success');
        closeTokenPremModal();
        setTimeout(() => location.reload(), 1200);
    } else {
        showToast(data.error || 'Error', 'error');
        btn.disabled = false; btn.textContent = '✦ Activate Premium';
    }
}
document.getElementById('tokenPremOverlay').addEventListener('click', function(e){ if(e.target===this) closeTokenPremModal(); });
</script>

<span id="shop-token-count" style="display:none"><?= number_format($tokens) ?></span>

<!-- ══ X2 EVENT BANNER ═══════════════════════════════════════════════ -->
<?php if ($x2Active): ?>
<div style="
    display:flex;align-items:center;gap:1rem;
    background:linear-gradient(135deg,rgba(255,80,0,.13),rgba(255,160,0,.08));
    border:1.5px solid rgba(255,120,0,.45);
    border-radius:16px;padding:1rem 1.5rem;margin-bottom:1.75rem;
    box-shadow:0 0 32px rgba(255,100,0,.12);
    position:relative;overflow:hidden;
">
    <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(255,140,0,.18),transparent 70%);pointer-events:none"></div>
    <div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;background:rgba(255,140,0,.15);border:1px solid rgba(255,140,0,.3);flex-shrink:0">
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style="color:#ff9900"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
    </div>
    <div style="flex:1">
        <div style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:900;color:#ff9900;letter-spacing:.03em">X2 TOKENS EVENT — ACTIVE!</div>
        <div style="font-size:.82rem;color:rgba(255,255,255,.55);margin-top:.2rem">All token purchases, profile views and referrals give <strong style="color:#ffb900">double tokens</strong> right now!</div>
    </div>
    <div style="background:rgba(255,140,0,.18);border:1px solid rgba(255,140,0,.4);border-radius:10px;padding:.4rem .9rem;font-weight:900;font-size:.9rem;color:#ffaa00;white-space:nowrap;letter-spacing:.03em">x2</div>
</div>
<?php endif; ?>

<!-- ══ TOKEN PACKS SECTION ════════════════════════════════════════════ -->
<div class="shop-section" style="margin-bottom:2.5rem">
    <div class="shop-section-head">
        <span class="shop-section-label" style="display:inline-flex;align-items:center;gap:.4rem">
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
            BUY TOKENS
        </span>
        <h3 class="shop-section-title">Token Packs — real money</h3>
        <p style="font-size:.82rem;color:rgba(255,255,255,.4);margin:.35rem 0 0">Purchase tokens with real money.</p>
    </div>
<style>
.tpack-grid {
    display:grid;
    grid-template-columns:repeat(auto-fill,minmax(195px,1fr));
    gap:1rem; margin-top:1.25rem;
}
.tpack-card {
    position:relative;
    background:linear-gradient(160deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%);
    border:1px solid rgba(255,255,255,.09);
    border-radius:18px; padding:1.35rem 1.25rem 1.1rem;
    display:flex;flex-direction:column;gap:.75rem;
    transition:border-color .2s,transform .18s,box-shadow .2s;
    overflow:hidden;
}
.tpack-card:hover { border-color:rgba(96,165,250,.4);transform:translateY(-3px);box-shadow:0 12px 36px rgba(96,165,250,.1); }
.tpack-card.tpack-popular { border-color:rgba(96,165,250,.4);background:linear-gradient(160deg,rgba(96,165,250,.07) 0%,rgba(59,130,246,.03) 100%); }
.tpack-popular-badge {
    position:absolute;top:-.5px;right:1rem;
    background:linear-gradient(135deg,#3b82f6,#60a5fa);
    color:#fff;font-size:.65rem;font-weight:900;
    padding:.2rem .65rem;border-radius:0 0 8px 8px;letter-spacing:.06em;
}
.tpack-tokens { font-family:'Syne',sans-serif;font-size:1.75rem;font-weight:900;color:#60a5fa;line-height:1; }
.tpack-tokens span { font-size:.9rem;color:rgba(96,165,250,.6);font-weight:600; }
.tpack-bonus {
    display:inline-flex;align-items:center;gap:.35rem;
    background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.25);
    border-radius:20px;padding:.2rem .65rem;font-size:.72rem;font-weight:700;color:#4ade80;
}
.tpack-x2 {
    display:inline-flex;align-items:center;gap:.35rem;
    background:rgba(255,140,0,.15);border:1px solid rgba(255,140,0,.35);
    border-radius:20px;padding:.2rem .65rem;font-size:.72rem;font-weight:700;color:#ff9900;
}
.tpack-price { font-family:'Syne',sans-serif;font-size:1.4rem;font-weight:900;color:#fff;margin-top:auto; }
.tpack-buy-btn {
    width:100%;padding:.65rem;border-radius:12px;
    background:linear-gradient(135deg,rgba(96,165,250,.15),rgba(59,130,246,.1));
    border:1px solid rgba(96,165,250,.3);
    color:#60a5fa;font-weight:800;font-size:.88rem;
    font-family:'Outfit',sans-serif;cursor:pointer;transition:all .2s;
    text-decoration:none;display:flex;align-items:center;justify-content:center;gap:.45rem;box-sizing:border-box;
}
.tpack-buy-btn:hover { background:linear-gradient(135deg,rgba(96,165,250,.26),rgba(59,130,246,.18));border-color:rgba(96,165,250,.6);transform:translateY(-1px); }
</style>
<?php
$tokenPacks = [
    ['id'=>'pack_150',  'tokens'=>150,  'bonus'=>0,   'price'=>'€0.99', 'popular'=>false],
    ['id'=>'pack_450',  'tokens'=>450,  'bonus'=>0,   'price'=>'€2.99', 'popular'=>false],
    ['id'=>'pack_700',  'tokens'=>700,  'bonus'=>70,  'price'=>'€4.99', 'popular'=>true],
    ['id'=>'pack_1500', 'tokens'=>1500, 'bonus'=>150, 'price'=>'€8.99', 'popular'=>false],
    ['id'=>'pack_2000', 'tokens'=>2000, 'bonus'=>250, 'price'=>'€9.99', 'popular'=>false],
];
?>
<div class="tpack-grid">
<?php foreach ($tokenPacks as $pack):
    $baseTotal    = $pack['tokens'] + $pack['bonus'];
    $displayTotal = $x2Active ? $baseTotal * 2 : $baseTotal;
?>
<div class="tpack-card <?= $pack['popular'] ? 'tpack-popular' : '' ?>">
    <?php if ($pack['popular']): ?>
    <div class="tpack-popular-badge">&#9733; POPULAR</div>
    <?php endif; ?>
    <div class="tpack-tokens">
        <?= number_format($x2Active ? $baseTotal * 2 : $pack['tokens']) ?>
        <span> tokens</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:.4rem">
        <?php if ($pack['bonus'] > 0 && !$x2Active): ?>
        <div class="tpack-bonus">
            <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><path d="M20 12v10H4V12m8 10V7m0 0H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zm0 0h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
            +<?= $pack['bonus'] ?> bonus tokens
        </div>
        <?php endif; ?>
        <?php if ($x2Active): ?>
        <div class="tpack-x2">
            <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
            x2 EVENT — <?= number_format($baseTotal * 2) ?> total
        </div>
        <?php endif; ?>
    </div>
    <div class="tpack-price"><?= htmlspecialchars($pack['price']) ?></div>
    <a href="mailto:admin@<?= strtolower(preg_replace('/[^a-z0-9.]/i','',SITE_NAME)) ?>?subject=Token+Pack+Purchase&body=User+ID:+<?= $userId ?>%0AUsername:+<?= urlencode($profile['username'] ?? '') ?>%0APack:+<?= $pack['id'] ?>+(<?= urlencode($pack['price']) ?>)%0ATokens+expected:+<?= $displayTotal ?>"
       class="tpack-buy-btn">
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
        Buy <?= htmlspecialchars($pack['price']) ?>
    </a>
</div>
<?php endforeach; ?>
</div>
</div>

<div class="shop-section">
    <div class="shop-section-head">
        <span class="shop-section-label">TOKEN SHOP</span>
        <h3 class="shop-section-title">Make your profile unique with badges</h3>
    </div>

    <div class="shop-grid">
        <?php foreach ($shopItems as $itemId => $item):
            $owned = in_array($item['badge_id'], $ownedBadges);
        ?>
        <div class="shop-card <?= $owned ? 'shop-card-owned' : '' ?>" style="--sc:<?= $item['color'] ?>">
            <div class="shop-card-glow"></div>
            <div class="shop-card-top">
                <div class="shop-card-icon">
                    <?= getShopBadgeSvg($itemId) ?>
                </div>
                <div class="shop-card-info">
                    <div class="shop-card-title-row">
                        <span class="shop-card-name"><?= htmlspecialchars($item['name']) ?></span>
                        <span class="shop-card-price">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>
                            <?= number_format($item['price']) ?>
                        </span>
                    </div>
                    <p class="shop-card-desc"><?= htmlspecialchars($item['desc']) ?></p>
                </div>
            </div>
            <div class="shop-card-actions">
                <?php if ($owned): ?>
                <div class="shop-card-owned-badge" style="flex:1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
                    OWNED
                </div>
                <?php else: ?>
                <button class="shop-buy-btn" onclick="shopBuy('<?= $itemId ?>', '<?= htmlspecialchars($item['name']) ?>', <?= $item['price'] ?>, '<?= $item['color'] ?>')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                    Buy
                </button>
                <?php endif; ?>
                <button class="shop-gift-btn" onclick="openGift('<?= $itemId ?>', '<?= htmlspecialchars($item['name']) ?>', '<?= $item['color'] ?>', <?= $item['price'] ?>)" title="Gift this badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
                    Gift
                </button>
                <?php /* Gift is available for all users */ ?>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
</div>

<!-- ═══ EFFECTS SHOP ═══════════════════════════════════════════════ -->
<div id="effects" class="shop-section" style="margin-top:2.5rem">
    <div class="shop-section-head">
        <span class="shop-section-label">EFFECTS SHOP</span>
        <h3 class="shop-section-title">Power up your profile with visual effects</h3>
    </div>

    <?php
    $purchasedEffects = json_decode($pdo->query("SELECT COALESCE(purchased_effects,'[]') FROM profiles WHERE user_id=$userId")->fetchColumn() ?: '[]', true) ?: [];

    $effectShopData = [
        'cursor' => [
            'label' => 'Cursor Trail Effects',
            'icon'  => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M4 4l7.07 17 2.51-7.39L21 11.07z"/></svg>',
            'items' => [
                'cursor_smoke'     => ['name'=>'Smoke Trail',     'price'=>200,  'color'=>'#9ca3af', 'desc'=>'Ethereal gray smoke particles drift behind your cursor.'],
                'cursor_fire'      => ['name'=>'Fire Trail',       'price'=>300,  'color'=>'#f97316', 'desc'=>'Intense fire bursts trail your every move.'],
                'cursor_soundwave' => ['name'=>'Sound Wave',       'price'=>400,  'color'=>'#00d4ff', 'desc'=>'Pulsing sound wave rings expand from your cursor.'],
                'cursor_meteors'   => ['name'=>'Meteors',          'price'=>500,  'color'=>'#fbbf24', 'desc'=>'Blazing meteors streak and crash behind you.'],
                'cursor_leaves'    => ['name'=>'Aesthetic Leaves', 'price'=>600,  'color'=>'#4ade80', 'desc'=>'3D aesthetic leaves float and spiral around your cursor.'],
                'cursor_water'     => ['name'=>'Water Trail 3D',   'price'=>800,  'color'=>'#38bdf8', 'desc'=>'Smooth 3D water droplets flow and ripple behind you.'],
                'cursor_shadow'    => ['name'=>'Soul Trail',         'price'=>1000, 'color'=>'#a8edff', 'desc'=>'Ethereal glowing souls that drift behind your cursor — the most exclusive effect.'],
            ],
        ],
        'avatar' => [
            'label' => 'Avatar Effects',
            'icon'  => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/></svg>',
            'items' => [
                'avatar_rocks'     => ['name'=>'Rock Ring',   'price'=>100,  'color'=>'#a8a29e', 'desc'=>'Stones orbit around your profile picture.'],
                'avatar_crown'     => ['name'=>'Crown 3D',    'price'=>350,  'color'=>'#ffd700', 'desc'=>'A glowing 3D crown floats above your avatar.'],
                'avatar_bloodrain' => ['name'=>'Blood Rain',  'price'=>550,  'color'=>'#ef4444', 'desc'=>'Dark blood drips down over your avatar frame.'],
                'avatar_darkeyes'  => ['name'=>'Dark Eyes',   'price'=>900,  'color'=>'#7c3aed', 'desc'=>'Eerie dark eyes appear on both sides of your avatar.'],
            ],
        ],
        'bg' => [
            'label' => 'Background Effects',
            'icon'  => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
            'items' => [
                'bg_fallingleaves' => ['name'=>'Falling Leaves',  'price'=>150,  'color'=>'#86efac', 'desc'=>'Autumn leaves drift gently across your profile background.'],
                'bg_underwater'    => ['name'=>'Underwater',       'price'=>250,  'color'=>'#7dd3fc', 'desc'=>'Bubbles and god rays transform your background.'],
                'bg_gas'           => ['name'=>'Gas Effect',       'price'=>300,  'color'=>'#c4b5fd', 'desc'=>'Swirling fog and gas clouds envelope your profile.'],
                'bg_fireworks'     => ['name'=>'Fireworks',        'price'=>400,  'color'=>'#fb923c', 'desc'=>'Colorful fireworks burst and trail across your background.'],
                'bg_hell'          => ['name'=>'Hell Background',  'price'=>500,  'color'=>'#f87171', 'desc'=>'Hellfire and embers engulf your entire profile background.'],
                'bg_shadowworld'   => ['name'=>'Shadow World',     'price'=>1000, 'color'=>'#818cf8', 'desc'=>'Dark creepy shadow realm — the ultimate background effect.'],
            ],
        ],
    ];
    ?>

    <?php foreach ($effectShopData as $typeKey => $typeData): ?>
    <div style="margin-bottom:2rem">
        <div style="display:flex;align-items:center;gap:.55rem;font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.13em;color:rgba(255,255,255,.32);margin-bottom:1rem">
            <?= $typeData['icon'] ?>
            <?= $typeData['label'] ?>
            <div style="flex:1;height:1px;background:rgba(255,255,255,.07)"></div>
        </div>
        <div class="shop-grid">
        <?php foreach ($typeData['items'] as $effectId => $eff):
            $owned = in_array($effectId, $purchasedEffects, true);
            // Specific SVG icon per effect
            $effectIcons = [
                'cursor_smoke'     => '<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z"/>',
                'cursor_fire'      => '<path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>',
                'cursor_soundwave' => '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>',
                'cursor_meteors'   => '<path d="M19 3l-6 6 2 7-7-2-6 6"/><path d="M2 2l20 20"/>',
                'cursor_leaves'    => '<path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-5 8z"/>',
                'cursor_water'     => '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>',
                'cursor_shadow'    => '<path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>',
                'avatar_rocks'     => '<path d="M19.5 9.5c0 3.58-2.92 6.5-6.5 6.5S6.5 13.08 6.5 9.5 9.42 3 13 3s6.5 2.92 6.5 6.5zM2 21c0-3 2-6 6.5-6.7"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><circle cx="12" cy="21" r="2"/>',
                'avatar_crown'     => '<path d="M2 4l3 12h14l3-12-6 7-4-7-4 7z"/><path d="M5 20h14"/>',
                'avatar_bloodrain' => '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
                'avatar_darkeyes'  => '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
                'bg_fallingleaves' => '<path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-5 8z"/><path d="M8.5 13.5s.5 3 4 4"/>',
                'bg_underwater'    => '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/><path d="M7 3c0 0 1 4-1 7"/><path d="M17 3c0 0-1 4 1 7"/>',
                'bg_gas'           => '<path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>',
                'bg_fireworks'     => '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
                'bg_hell'          => '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
                'bg_shadowworld'   => '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/>',
            ];
            $svgInner = $effectIcons[$effectId] ?? '<circle cx="12" cy="12" r="5"/>';
            $svgFill = in_array($effectId, ['cursor_fire','cursor_leaves','cursor_soundwave','cursor_water','avatar_crown','avatar_bloodrain','bg_fallingleaves','bg_fireworks','bg_hell']) ? 'fill' : 'none';
            $strokeAttr = ($svgFill === 'none') ? 'fill="none" stroke="'.$eff['color'].'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"' : 'fill="'.$eff['color'].'" stroke="none"';
        ?>
        <div class="shop-card <?= $owned ? 'shop-card-owned' : '' ?>" style="--sc:<?= $eff['color'] ?>">
            <div class="shop-card-glow"></div>
            <div class="shop-card-top">
                <div class="shop-card-icon" style="background:#0a0a14;padding:0;overflow:hidden;">
                    <canvas class="effect-preview-canvas" data-effect="<?= $effectId ?>" width="48" height="48" style="display:block;width:48px;height:48px;"></canvas>
                </div>
                <div class="shop-card-info">
                    <div class="shop-card-title-row">
                        <span class="shop-card-name"><?= htmlspecialchars($eff['name']) ?></span>
                        <span class="shop-card-price">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>
                            <?= number_format($eff['price']) ?>
                        </span>
                    </div>
                    <p class="shop-card-desc"><?= htmlspecialchars($eff['desc']) ?></p>
                </div>
            </div>
            <div class="shop-card-actions">
                <?php if ($owned): ?>
                <div class="shop-card-owned-badge" style="flex:1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
                    OWNED
                </div>
                <?php else: ?>
                <button class="shop-buy-btn" onclick="shopBuyEffect('<?= $effectId ?>','<?= htmlspecialchars($eff['name']) ?>',<?= $eff['price'] ?>,'<?= $eff['color'] ?>')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                    Buy
                </button>
                <?php endif; ?>
                <button class="shop-gift-btn"
                    data-effect-id="<?= $effectId ?>"
                    data-effect-name="<?= htmlspecialchars($eff['name'], ENT_QUOTES) ?>"
                    data-effect-color="<?= $eff['color'] ?>"
                    data-effect-price="<?= $eff['price'] ?>"
                    data-effect-icon="<?= htmlspecialchars($svgInner, ENT_QUOTES) ?>"
                    data-effect-fill="<?= $svgFill ?>"
                    onclick="openGiftEffectFromBtn(this)"
                    title="Gift this effect">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
                    Gift
                </button>
            </div>
        </div>
        <?php endforeach; ?>
        </div>
    </div>
    <?php endforeach; ?>
</div>

<!-- ═══ GIFT MODAL ═══ -->
<div class="gift-overlay" id="gift-overlay" onclick="handleOverlayClick(event)">
    <div class="gift-modal">
        <button class="gift-close-x" onclick="closeGift()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div class="gift-modal-title">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="vertical-align:-2px;margin-right:4px"><path d="M20 12v10H4V12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
            Gift Badge
        </div>
        <div class="gift-modal-sub">Choose who to send this badge to</div>

        <div class="gift-badge-preview">
            <div class="gift-badge-ico" id="gift-badge-ico"></div>
            <div class="gift-badge-meta">
                <strong id="gift-badge-name"></strong>
                <span id="gift-badge-cost"></span>
            </div>
        </div>

        <!-- Selected user display -->
        <div class="gift-selected-user" id="gift-selected-user">
            <img id="gift-sel-avatar" src="" alt="" onerror="this.src='/assets/img/default-avatar.png'">
            <span id="gift-sel-name"></span>
            <button class="gift-selected-clear" onclick="clearGiftUser()" title="Clear">✕</button>
        </div>

        <!-- Search -->
        <div class="gift-search-wrap" id="gift-search-wrap">
            <svg class="gift-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="gift-search-input" id="gift-search" placeholder="Search username..." autocomplete="off">
        </div>
        <div class="gift-results" id="gift-results"></div>

        <div class="gift-modal-actions">
            <button class="gift-cancel-btn" onclick="closeGift()">Cancel</button>
            <button class="gift-send-btn" id="gift-send-btn" onclick="sendGift()" disabled>
                Send Gift
            </button>
        </div>
    </div>
</div>

<script>
// ── State ─────────────────────────────────────────────
let giftItemId   = null;
let giftItemName = null;
let giftItemCost = 0;
let giftTargetId = null;
let searchTimer  = null;

// ── Open / Close ──────────────────────────────────────
function openGift(itemId, name, color, cost) {
    giftItemId   = itemId;
    giftItemName = name;
    giftItemCost = cost;
    giftTargetId = null;

    // Reset modal title to "Gift Badge"
    const titleEl = document.querySelector('#gift-overlay .gift-modal-title');
    if (titleEl) {
        titleEl.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="vertical-align:-2px;margin-right:4px"><path d="M20 12v10H4V12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg> Gift Badge';
    }
    const subEl = document.querySelector('#gift-overlay .gift-modal-sub');
    if (subEl) subEl.textContent = 'Choose who to send this badge to';

    // Badge preview
    document.getElementById('gift-badge-name').textContent = name;
    document.getElementById('gift-badge-cost').textContent = cost.toLocaleString() + ' tokens';
    const ico = document.getElementById('gift-badge-ico');
    ico.style.background = color + '22';
    ico.style.border = '1px solid ' + color + '44';
    ico.innerHTML = getBadgeSvg(itemId, color);

    // Reset UI
    clearGiftUser();
    document.getElementById('gift-search').value = '';
    document.getElementById('gift-results').innerHTML = '';
    document.getElementById('gift-results').classList.remove('show');

    document.getElementById('gift-overlay').classList.add('open');
}

function closeGift() {
    document.getElementById('gift-overlay').classList.remove('open');
    giftItemId = giftTargetId = null;
}

function handleOverlayClick(e) {
    if (e.target === document.getElementById('gift-overlay')) closeGift();
}

// ── User search ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('gift-search').addEventListener('input', e => {
        clearTimeout(searchTimer);
        const q = e.target.value.trim();
        if (q.length < 2) {
            document.getElementById('gift-results').classList.remove('show');
            return;
        }
        searchTimer = setTimeout(() => searchUsers(q), 300);
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeGift();
    });
});

async function searchUsers(q) {
    const res = document.getElementById('gift-results');
    res.innerHTML = '<div class="gift-no-results">Searching...</div>';
    res.classList.add('show');
    try {
        const r = await fetch('/api/shop.php', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({action:'search_users', q})
        });
        const j = await r.json();
        if (!j.success || !j.users.length) {
            res.innerHTML = '<div class="gift-no-results">No users found.</div>';
            return;
        }
        res.innerHTML = j.users.map(u => `
            <div class="gift-result-item" onclick="selectGiftUser(${u.id}, '${escHtml(u.username)}', '${escHtml(u.avatar)}')">
                <img class="gift-result-avatar" src="${escHtml(u.avatar)}" onerror="this.src='/assets/img/default-avatar.png'" alt="">
                <span class="gift-result-name">@${escHtml(u.username)}</span>
                <svg class="gift-result-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
        `).join('');
    } catch(e) {
        res.innerHTML = '<div class="gift-no-results">Search failed.</div>';
    }
}

function selectGiftUser(id, username, avatar) {
    giftTargetId = id;

    // Show selected user
    document.getElementById('gift-sel-avatar').src     = avatar;
    document.getElementById('gift-sel-name').textContent = '@' + username;
    document.getElementById('gift-selected-user').classList.add('show');

    // Hide search
    document.getElementById('gift-search-wrap').style.display = 'none';
    document.getElementById('gift-results').classList.remove('show');

    // Enable send
    document.getElementById('gift-send-btn').disabled = false;
}

function clearGiftUser() {
    giftTargetId = null;
    document.getElementById('gift-selected-user').classList.remove('show');
    document.getElementById('gift-search-wrap').style.display = '';
    document.getElementById('gift-send-btn').disabled = true;
}

// ── Send gift ─────────────────────────────────────────
// sendGift() defined below (unified badge + effect gift handler)

// ── Buy (unchanged) ───────────────────────────────────
// ── Buy Modal ─────────────────────────────
let _shopBuyPending = null;

function shopBuy(itemId, name, price, color) {
    _shopBuyPending = { itemId, name, price, color };
    const badgeColor = color || '#a78bfa';
    document.getElementById('shopConfirmName').textContent = name;
    document.getElementById('shopConfirmName').style.color = badgeColor;
    document.getElementById('shopConfirmPrice').textContent = price.toLocaleString();
    document.getElementById('shopConfirmPrice').style.color = badgeColor;
    // Update SVG icon color to badge color
    const p1 = document.getElementById('scmIconPath1');
    const ln = document.getElementById('scmIconLine');
    const p2 = document.getElementById('scmIconPath2');
    if (p1) p1.setAttribute('stroke', badgeColor);
    if (ln) ln.setAttribute('stroke', badgeColor);
    if (p2) p2.setAttribute('stroke', badgeColor);
    // Update icon background glow
    const iconEl = document.querySelector('.scm-icon');
    if (iconEl) iconEl.style.background = `radial-gradient(circle at 60% 35%, rgba(${hexToRgb(badgeColor)},0.22) 0%, rgba(${hexToRgb(badgeColor)},0.07) 60%, transparent 100%)`;
    // Update glow orb to badge color
    const box = document.querySelector('.scm-box');
    if (box) {
        box.style.setProperty('--scm-glow', `rgba(${hexToRgb(badgeColor)},0.18)`);
    }
    const overlay = document.getElementById('shopConfirmOverlay');
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('scm-visible'));
}

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
}

function shopConfirmClose() {
    const overlay = document.getElementById('shopConfirmOverlay');
    overlay.classList.remove('scm-visible');
    setTimeout(() => {
        overlay.style.display = 'none';
        // Restore default confirm handler (badge flow) in case effect flow overwrote it
        const confirmBtn = overlay.querySelector('.scm-btn-confirm');
        if (confirmBtn) confirmBtn.onclick = shopConfirmDo;
    }, 280);
    _shopBuyPending  = null;
    _pendingEffectId = null;
}

async function shopConfirmDo() {
    if (!_shopBuyPending) return;
    const pending = _shopBuyPending; // save before close nulls it
    const _scmBtn = document.querySelector('#shopConfirmOverlay .scm-btn-confirm');
    if (_scmBtn) { _scmBtn.disabled = true; _scmBtn.style.opacity = '0.5'; }
    shopConfirmClose();
    const { itemId } = pending;
    try {
        const r = await fetch('/api/shop.php', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({action:'buy', item_id: itemId})
        });
        const j = await r.json();
        if (j.success) {
            spawnPurchaseParticles();
            showToast(j.message, 'success');
            setTimeout(() => location.reload(), 2400);
        } else {
            showToast(j.error || 'Error', 'error');
        }
    } catch(e) {
        showToast('Network error', 'error');
    }
}

function spawnPurchaseParticles() {
    const canvas = document.getElementById('shopParticleCanvas');
    if (!canvas) return;
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ['#a78bfa','#60a5fa','#34d399','#fbbf24','#f472b6','#f97316','#ffffff'];
    const particles = Array.from({length: 130}, () => ({
        x: Math.random() * canvas.width,
        y: canvas.height * (0.3 + Math.random() * 0.4),
        vx: (Math.random() - 0.5) * 10,
        vy: -(Math.random() * 13 + 5),
        r: Math.random() * 7 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
        life: 1,
        decay: Math.random() * 0.011 + 0.007
    }));
    let frame;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        for (const p of particles) {
            if (p.life <= 0) continue;
            alive = true;
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            if (p.shape === 'rect') {
                ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
            } else {
                ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
            p.x += p.vx; p.y += p.vy;
            p.vy += 0.38; p.vx *= 0.99;
            p.rot += p.rotSpeed;
            p.life -= p.decay;
        }
        if (alive) { frame = requestAnimationFrame(draw); }
        else { ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.style.display = 'none'; }
    }
    cancelAnimationFrame(frame);
    draw();
}

// ── Helpers ───────────────────────────────────────────
function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function getBadgeSvg(id, color) {
    const svgs = {
        fresh:      `<svg viewBox="0 0 24 24" fill="${color}" width="22" height="22"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-5 8z"/></svg>`,
        lover:      `<svg viewBox="0 0 24 24" fill="${color}" width="22" height="22"><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/></svg>`,
        known:      `<svg viewBox="0 0 24 24" fill="${color}" width="22" height="22"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`,
        rich:       `<svg viewBox="0 0 24 24" fill="${color}" width="22" height="22"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>`,
        trapstar:   `<svg viewBox="0 0 24 24" fill="${color}" width="22" height="22"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>`,
        the_killer: `<svg viewBox="0 0 24 24" fill="${color}" width="22" height="22"><path d="M12 2C7.58 2 4 5.58 4 10c0 2.84 1.49 5.34 3.73 6.76.18.11.27.31.27.52V19c0 1.1.9 2 2 2v-2h1.5v2h1v-2H14v2c1.1 0 2-.9 2-2v-1.72c0-.21.09-.41.27-.52C18.51 15.34 20 12.84 20 10c0-4.42-3.58-8-8-8zM9 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>`,
    };
    return svgs[id] || '';
}

</script>

<!-- Shop Confirm Modal -->
<style>
.scm-overlay {
    display:none; position:fixed; inset:0; z-index:9999;
    align-items:center; justify-content:center;
    background:rgba(0,0,0,.75); backdrop-filter:blur(12px);
    opacity:0; transition:opacity .28s ease;
}
.scm-overlay.scm-visible { opacity:1; }
.scm-box {
    background:linear-gradient(160deg,#111118 0%,#0c0c12 60%,#0a0a10 100%);
    border:1px solid rgba(255,255,255,.07);
    border-radius:22px; padding:2rem 2rem 1.75rem;
    width:min(92vw,400px); text-align:center;
    box-shadow:0 32px 80px rgba(0,0,0,.85), 0 0 0 1px rgba(255,255,255,.03) inset;
    transform:translateY(20px) scale(.96);
    transition:transform .3s cubic-bezier(.34,1.56,.64,1), opacity .28s ease;
    opacity:0; position:relative; overflow:hidden;
}
.scm-box::before {
    content:''; position:absolute; top:-80px; left:50%; transform:translateX(-50%);
    width:220px; height:160px; border-radius:50%;
    background:radial-gradient(circle,var(--scm-glow, rgba(160,160,160,.15)) 0%,transparent 70%);
    pointer-events:none;
}
.scm-overlay.scm-visible .scm-box { transform:translateY(0) scale(1); opacity:1; }
.scm-icon {
    width:64px; height:64px; margin:0 auto 1.1rem;
    background:rgba(255,255,255,.06);
    border:1px solid rgba(255,255,255,.1);
    border-radius:18px;
    display:flex; align-items:center; justify-content:center;
    position:relative; z-index:1;
}
.scm-title {
    font-family:'Syne',sans-serif; font-size:1.2rem; font-weight:800;
    color:#fff; margin-bottom:.4rem; position:relative; z-index:1;
}
.scm-sub {
    font-size:.855rem; color:rgba(255,255,255,.4);
    margin-bottom:1.75rem; line-height:1.6; position:relative; z-index:1;
}
.scm-badge-name { font-weight:700; }
.scm-price { font-weight:700; }
.scm-divider {
    height:1px; background:rgba(255,255,255,.06);
    margin:0 -2rem 1.5rem; position:relative; z-index:1;
}
.scm-actions { display:flex; flex-direction:column; gap:.6rem; position:relative; z-index:1; }
.scm-btn-confirm {
    width:100%; padding:.85rem; border-radius:12px;
    background:linear-gradient(135deg,#16a34a 0%,#22c55e 50%,#4ade80 100%);
    border:none; color:#fff;
    font-family:'Outfit',sans-serif; font-size:.95rem; font-weight:800;
    cursor:pointer; transition:filter .18s, transform .14s, box-shadow .18s;
    box-shadow:0 8px 28px rgba(34,197,94,.45);
    display:flex; align-items:center; justify-content:center; gap:.5rem;
    letter-spacing:.01em;
}
.scm-btn-confirm:hover { filter:brightness(1.1); transform:translateY(-2px); box-shadow:0 12px 36px rgba(34,197,94,.55); }
.scm-btn-confirm:active { transform:translateY(0); box-shadow:0 4px 16px rgba(34,197,94,.35); }
.scm-btn-cancel {
    width:100%; padding:.75rem; border-radius:12px;
    background:rgba(239,68,68,.12);
    border:1px solid rgba(239,68,68,.35);
    color:rgba(239,68,68,.85); font-size:.88rem; font-weight:600;
    font-family:'Outfit',sans-serif;
    cursor:pointer; transition:all .18s;
    letter-spacing:.01em;
}
.scm-btn-cancel:hover { background:rgba(239,68,68,.22); border-color:rgba(239,68,68,.55); color:#ef4444; }
#shopParticleCanvas {
    display:none; position:fixed; inset:0; z-index:99999;
    pointer-events:none; width:100%; height:100%;
}
</style>

<canvas id="shopParticleCanvas"></canvas>

<div class="scm-overlay" id="shopConfirmOverlay">
    <div class="scm-box">
        <div class="scm-icon">
            <svg viewBox="0 0 24 24" fill="none" width="30" height="30" xmlns="http://www.w3.org/2000/svg">
                <path id="scmIconPath1" d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="#a78bfa" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
                <line id="scmIconLine" x1="3" y1="6" x2="21" y2="6" stroke="#a78bfa" stroke-width="1.7" stroke-linecap="round"/>
                <path id="scmIconPath2" d="M16 10a4 4 0 01-8 0" stroke="#c084fc" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
        <div class="scm-title">Confirm Purchase</div>
        <div class="scm-sub">
            Buy <strong id="shopConfirmName" class="scm-badge-name"></strong>
            for <span class="scm-price"><span id="shopConfirmPrice"></span> tokens</span>?
        </div>
        <div class="scm-divider"></div>
        <div class="scm-actions">
            <button class="scm-btn-confirm" onclick="shopConfirmDo()">
                Confirm
            </button>
            <button class="scm-btn-cancel" onclick="shopConfirmClose()">Cancel</button>
        </div>
    </div>
</div>

<script>
// Close modal on backdrop click
document.getElementById('shopConfirmOverlay').addEventListener('click', function(e) {
    if (e.target === this) shopConfirmClose();
});

function showToast(msg, type='info') {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;padding:.75rem 1.25rem;border-radius:10px;font-size:.88rem;font-weight:600;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.4);transition:opacity .4s';
    t.style.background = type==='success'?'#10b981':type==='error'?'#ef4444':'#6366f1';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.remove(),400); }, 3000);
}

// ── Effect buy — reuses the same confirm modal & confetti as badges ──
let _pendingEffectId   = null;
let _pendingEffectBtn  = null;
let _pendingEffectCard = null;

function shopBuyEffect(effectId, name, price, color) {
    _pendingEffectId   = effectId;
    _pendingEffectBtn  = event.target.closest('button');
    _pendingEffectCard = _pendingEffectBtn ? _pendingEffectBtn.closest('.shop-card') : null;

    // Reuse the existing confirm modal
    document.getElementById('shopConfirmName').textContent  = name;
    document.getElementById('shopConfirmPrice').textContent = price.toLocaleString();

    // Tint the glow to the effect colour
    const overlay = document.getElementById('shopConfirmOverlay');
    overlay.querySelector('.scm-box').style.setProperty('--scm-glow', color + '33');

    // Swap icon to cursor/avatar/bg style
    const p1 = document.getElementById('scmIconPath1');
    const ln = document.getElementById('scmIconLine');
    const p2 = document.getElementById('scmIconPath2');
    if (p1) { p1.setAttribute('stroke', color); }
    if (ln) { ln.setAttribute('stroke', color); }
    if (p2) { p2.setAttribute('stroke', color); }

    // Override confirm button to call effect API
    const confirmBtn = overlay.querySelector('.scm-btn-confirm');
    confirmBtn.onclick = shopConfirmEffectDo;

    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('scm-visible'));
}

async function shopConfirmEffectDo() {
    const effectId = _pendingEffectId; // save BEFORE close nulls it
    const pendingBtn  = _pendingEffectBtn;
    const pendingCard = _pendingEffectCard;
    const _scmBtn2 = document.querySelector('#shopConfirmOverlay .scm-btn-confirm');
    if (_scmBtn2) { _scmBtn2.disabled = true; _scmBtn2.style.opacity = '0.5'; }
    shopConfirmClose();
    if (!effectId) return;
    try {
        const r = await fetch('/api/shop.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'buy_effect', effect_id: effectId})
        });
        const d = await r.json();
        if (d.success) {
            spawnPurchaseParticles();
            document.querySelectorAll('.token-balance, [data-tokens], .tokens-val').forEach(el => {
                el.textContent = d.tokens.toLocaleString();
            });
            showToast('Effect purchased! Go to Effects to enable it.', 'success');
            setTimeout(() => location.reload(), 2400);
        } else {
            showToast(d.error || 'Purchase failed.', 'error');
        }
    } catch(e) {
        showToast('Network error. Please try again.', 'error');
    }
}

// ── Effect Gift ──────────────────────────────────────────────────────
let _giftEffectId = null;

function openGiftEffectFromBtn(btn) {
    const effectId = btn.dataset.effectId;
    const name     = btn.dataset.effectName;
    const color    = btn.dataset.effectColor;
    const price    = parseInt(btn.dataset.effectPrice, 10);
    const svgInner = btn.dataset.effectIcon;
    const fillType = btn.dataset.effectFill; // 'fill' or 'none'
    openGiftEffect(effectId, name, color, price, svgInner, fillType);
}

function openGiftEffect(effectId, name, color, price, svgInner, fillType) {
    _giftEffectId = effectId;

    giftItemId   = '__effect__' + effectId;
    giftItemName = name;
    giftItemCost = price;
    giftTargetId = null;

    // Update modal title to "Gift Effect"
    const titleEl = document.querySelector('#gift-overlay .gift-modal-title');
    if (titleEl) {
        titleEl.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="vertical-align:-2px;margin-right:4px"><path d="M20 12v10H4V12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg> Gift Effect';
    }
    const subEl = document.querySelector('#gift-overlay .gift-modal-sub');
    if (subEl) subEl.textContent = 'Choose who to send this effect to';

    // Preview with specific effect icon
    document.getElementById('gift-badge-name').textContent = name;
    document.getElementById('gift-badge-cost').textContent = price.toLocaleString() + ' tokens';
    const ico = document.getElementById('gift-badge-ico');
    ico.style.background = color + '22';
    ico.style.border = '1px solid ' + color + '44';
    if (svgInner) {
        const isFill = (fillType === 'fill');
        const attrs  = isFill
            ? `fill="${color}" stroke="none"`
            : `fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
        ico.innerHTML = `<svg viewBox="0 0 24 24" ${attrs} width="22" height="22">${svgInner}</svg>`;
    } else {
        ico.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" width="22" height="22"><circle cx="12" cy="12" r="5"/></svg>`;
    }

    // Reset UI
    clearGiftUser();
    document.getElementById('gift-search').value = '';
    document.getElementById('gift-results').innerHTML = '';
    document.getElementById('gift-results').classList.remove('show');
    document.getElementById('gift-send-btn').disabled = true;

    document.getElementById('gift-overlay').classList.add('open');
}

async function sendGift() {
    if (!giftTargetId) return;

    const sendBtn = document.getElementById('gift-send-btn');
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    try {
        const isEffect = giftItemId && giftItemId.startsWith('__effect__');
        const payload  = isEffect
            ? {action: 'gift_effect', effect_id: _giftEffectId, target_id: giftTargetId}
            : {action: 'gift', item_id: giftItemId, target_id: giftTargetId};

        const r = await fetch('/api/shop.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const j = await r.json();
        if (j.success) {
            closeGift();
            spawnPurchaseParticles();
            document.querySelectorAll('.token-balance, [data-tokens], .tokens-val').forEach(el => {
                el.textContent = j.tokens.toLocaleString();
            });
            showToast(j.message || 'Gift sent!', 'success');
        } else {
            showToast(j.error || 'Gift failed.', 'error');
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send Gift';
        }
    } catch(e) {
        showToast('Network error. Please try again.', 'error');
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Gift';
    }
}
</script>

<script>
(function() {
    function drawAvatarBase(ctx, W, H) {
        var cx = W/2, cy = H/2, R = Math.min(W,H)*0.34;
        ctx.fillStyle = '#0e0e1a'; ctx.fillRect(0,0,W,H);
        ctx.save();
        ctx.fillStyle = '#1e1e30'; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.arc(cx,cy-R*0.2,R*0.32,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx,cy+R*0.75,R*0.52,0,Math.PI,true); ctx.fill();
        ctx.restore();
    }
    var renderers = {
        cursor_smoke: function(ctx,W,H,t){
            ctx.clearRect(0,0,W,H);
            for(var i=0;i<12;i++){var a=((t*0.4+i*30)%360)*Math.PI/180,x=W/2+Math.cos(a)*12+Math.cos(a*1.7)*7,y=H/2+Math.sin(a)*8,sz=2+Math.abs(Math.sin(t*0.02+i))*4,op=0.15+Math.abs(Math.sin(t*0.015+i*0.5))*0.3;ctx.save();ctx.globalAlpha=op;ctx.fillStyle='#aaa';ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.fill();ctx.restore();}
        },
        cursor_fire: function(ctx,W,H,t){
            ctx.clearRect(0,0,W,H);
            for(var i=0;i<18;i++){var age=(t*2+i*20)%100,x=W/2+(Math.sin(i*1.7+t*0.03)*15)*(1-age/100),y=H/2+7-age*0.45,sz=Math.max(.5,(5-age*0.04)*0.8),op=Math.max(0,(1-age/100)*0.85);ctx.save();ctx.globalAlpha=op;ctx.fillStyle='rgb(255,'+Math.floor(50+age*2)+',0)';ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.fill();ctx.restore();}
        },
        cursor_soundwave: function(ctx,W,H,t){
            ctx.clearRect(0,0,W,H);
            for(var i=0;i<4;i++){var r=((t+i*25)%100)*0.42,op=Math.max(0,1-r/42)*0.7;ctx.save();ctx.globalAlpha=op;ctx.strokeStyle='#00d4ff';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(W/2,H/2,r,0,Math.PI*2);ctx.stroke();ctx.restore();}
        },
        cursor_meteors: function(ctx,W,H,t){
            ctx.clearRect(0,0,W,H);
            for(var i=0;i<6;i++){var prog=((t*1.5+i*17)%100)/100,x=3+prog*(W-6),y=5+prog*(H-10);ctx.save();ctx.globalAlpha=1-prog;ctx.strokeStyle='#ffd700';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-prog*16,y-prog*10);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,1.5,0,Math.PI*2);ctx.fill();ctx.restore();}
        },
        cursor_leaves: function(ctx,W,H,t){
            ctx.clearRect(0,0,W,H);
            var colors=['#4caf50','#8bc34a','#cddc39','#66bb6a'];
            for(var i=0;i<8;i++){var a=(t*0.5+i*45)*Math.PI/180,r=16+Math.sin(t*0.03+i)*5,x=W/2+Math.cos(a)*r,y=H/2+Math.sin(a)*r*0.6;ctx.save();ctx.globalAlpha=0.8;ctx.fillStyle=colors[i%colors.length];ctx.translate(x,y);ctx.rotate(a+t*0.02);ctx.beginPath();ctx.ellipse(0,0,3.5,2,0,0,Math.PI*2);ctx.fill();ctx.restore();}
        },
        cursor_water: function(ctx,W,H,t){
            ctx.clearRect(0,0,W,H);
            for(var i=0;i<10;i++){var age=((t*1.8+i*10)%100),x=W/2+(Math.sin(i*0.9+t*0.02)*13)*(1-age/100),y=H/2+age*0.22-6,sz=Math.max(.5,2.5*(1-age/100)),op=Math.max(0,(1-age/100)*0.9);ctx.save();ctx.globalAlpha=op;ctx.fillStyle='#0ea5e9';ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.fill();ctx.restore();}
        },
        cursor_shadow: function(ctx,W,H,t){
            ctx.clearRect(0,0,W,H);
            var cx=W/2,cy=H/2,souls=[{ox:-14,oy:5,phase:0},{ox:12,oy:-8,phase:1.8},{ox:3,oy:13,phase:3.6},{ox:-6,oy:-12,phase:2.5},{ox:18,oy:9,phase:4.8}];
            souls.forEach(function(s){var drift=Math.sin(t*0.035+s.phase),bob=Math.cos(t*0.028+s.phase)*3,sx=cx+s.ox+drift*3,sy=cy+s.oy+bob,pulse=0.7+Math.sin(t*0.05+s.phase)*0.3;ctx.save();ctx.globalAlpha=0.18*pulse;var g=ctx.createRadialGradient(sx,sy,0,sx,sy,7);g.addColorStop(0,'#a8edff');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.beginPath();ctx.arc(sx,sy,7,0,Math.PI*2);ctx.fill();ctx.restore();ctx.save();ctx.globalAlpha=0.88*pulse;ctx.shadowColor='#7ee8fa';ctx.shadowBlur=8;ctx.fillStyle='#a8edff';ctx.beginPath();ctx.ellipse(sx,sy,2.5,3.5,drift*0.3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#1a0a2e';ctx.globalAlpha=0.9*pulse;ctx.beginPath();ctx.arc(sx-1,sy-0.7,0.7,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(sx+1,sy-0.7,0.7,0,Math.PI*2);ctx.fill();ctx.restore();});
        },
        avatar_rocks: function(ctx,W,H,t){
            drawAvatarBase(ctx,W,H);
            var cx=W/2,cy=H/2;
            ctx.save();ctx.globalAlpha=0.3;ctx.strokeStyle='#78716c';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,19,0,Math.PI*2);ctx.stroke();ctx.restore();
            for(var i=0;i<6;i++){var a=(t*0.8+i*60)*Math.PI/180,x=cx+Math.cos(a)*19,y=cy+Math.sin(a)*19;ctx.save();ctx.fillStyle='#a8a29e';ctx.globalAlpha=0.9;ctx.translate(x,y);ctx.rotate(a);ctx.beginPath();ctx.ellipse(0,0,2.5,2,0,0,Math.PI*2);ctx.fill();ctx.restore();}
        },
        avatar_crown: function(ctx,W,H,t){
            drawAvatarBase(ctx,W,H);
            var cx=W/2,bob=Math.sin(t*0.04)*1.2,baseY=H*0.14-bob,s=Math.min(W,H)*0.09;
            var glowR=s*1.0,pulse=0.12+Math.sin(t*0.05)*0.05;
            ctx.save();var grd=ctx.createRadialGradient(cx,baseY,0,cx,baseY,glowR);
            grd.addColorStop(0,'rgba(255,200,0,'+pulse+')');grd.addColorStop(1,'transparent');
            ctx.fillStyle=grd;ctx.beginPath();ctx.arc(cx,baseY,glowR,0,Math.PI*2);ctx.fill();ctx.restore();
            var bH=s*0.3,bY=baseY+s*0.45,bL=cx-s,bR=cx+s;
            var lx=cx-s*0.6,rx=cx+s*0.6,cSH=s*1.05,sSH=s*0.68,cSW=s*0.27,sSW=s*0.21;
            var mf=ctx.createLinearGradient(cx,bY-cSH,cx,bY+bH);
            mf.addColorStop(0,'rgba(255,240,90,0.95)');mf.addColorStop(0.25,'rgba(255,205,20,0.92)');
            mf.addColorStop(0.65,'rgba(200,145,0,0.88)');mf.addColorStop(1,'rgba(150,100,0,0.82)');
            ctx.save();ctx.shadowColor='#ffc200';ctx.shadowBlur=5;ctx.strokeStyle='#b8860b';ctx.lineWidth=1;ctx.globalAlpha=0.98;ctx.fillStyle=mf;
            ctx.beginPath();
            ctx.moveTo(bL,bY+bH);ctx.lineTo(bL,bY);
            ctx.lineTo(lx-sSW/2,bY);ctx.lineTo(lx-sSW/2,bY-sSH);ctx.lineTo(lx+sSW/2,bY-sSH);ctx.lineTo(lx+sSW/2,bY);
            ctx.lineTo(cx-cSW/2,bY);ctx.lineTo(cx-cSW/2,bY-cSH);ctx.lineTo(cx+cSW/2,bY-cSH);ctx.lineTo(cx+cSW/2,bY);
            ctx.lineTo(rx-sSW/2,bY);ctx.lineTo(rx-sSW/2,bY-sSH);ctx.lineTo(rx+sSW/2,bY-sSH);ctx.lineTo(rx+sSW/2,bY);
            ctx.lineTo(bR,bY);ctx.lineTo(bR,bY+bH);
            ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
            var orbR=s*0.13;
            [[lx,bY-sSH,'#c084fc','#7e22ce'],[cx,bY-cSH,'#fbbf24','#b45309'],[rx,bY-sSH,'#60a5fa','#1d4ed8']].forEach(function(o){
                ctx.save();ctx.shadowColor=o[3];ctx.shadowBlur=7;ctx.globalAlpha=0.97;
                var og=ctx.createRadialGradient(o[0]-orbR*0.35,o[1]-orbR*0.38,orbR*0.08,o[0],o[1],orbR);
                og.addColorStop(0,'rgba(255,255,255,0.75)');og.addColorStop(0.35,o[2]);og.addColorStop(1,o[3]);
                ctx.fillStyle=og;ctx.beginPath();ctx.arc(o[0],o[1],orbR,0,Math.PI*2);ctx.fill();ctx.restore();
            });
        },

        avatar_bloodrain: function(ctx,W,H,t){
            drawAvatarBase(ctx,W,H);
            var cx=W/2,cy=H/2,R=Math.min(W,H)*0.38,segments=60;
            for(var i=0;i<segments;i++){var a1=(i/segments)*Math.PI*2,a2=((i+1)/segments)*Math.PI*2,cycle=(i/segments+t*0.004)%1,hue=cycle<0.5?cycle*40:40-(cycle-0.5)*40,light=22+Math.sin((i/segments)*Math.PI*4+t*0.05)*8;ctx.save();ctx.beginPath();ctx.arc(cx,cy,R,a1,a2);ctx.arc(cx,cy,R-3,a2,a1,true);ctx.closePath();ctx.fillStyle='hsl('+hue+',88%,'+light+'%)';ctx.globalAlpha=0.95;ctx.fill();ctx.restore();}
            for(var i=0;i<8;i++){var spawnAngle=(i/8)*Math.PI*2;if(Math.sin(spawnAngle)<-0.15)continue;var sx=cx+Math.cos(spawnAngle)*R,sy=cy+Math.sin(spawnAngle)*R,prog=((t*0.7+i*9.3)%100)/100,dy=prog*Math.min(W,H)*0.28,op=Math.max(0,Math.min(1,(1-prog)*2.5)),thick=1.5*(1-prog*0.5);ctx.save();ctx.globalAlpha=op;ctx.strokeStyle='hsl(5,85%,28%)';ctx.lineWidth=thick;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(sx,sy+dy);ctx.lineTo(sx,sy+dy+4);ctx.stroke();ctx.restore();}
        },
        avatar_darkeyes: function(ctx,W,H,t){
            drawAvatarBase(ctx,W,H);
            var cx=W/2,cy=H/2,R=Math.min(W,H)*0.32;
            ctx.save();ctx.strokeStyle='rgba(124,58,237,0.5)';ctx.lineWidth=1;ctx.shadowColor='#7c3aed';ctx.shadowBlur=6;ctx.setLineDash([2,4]);ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();
            function drawEye(ex,ey,angle,blinkP){var ew=W*0.07,eh=ew*0.42,bSY=1-blinkP*0.96;ctx.save();ctx.translate(ex,ey);ctx.rotate(angle+Math.PI/2);ctx.scale(1,bSY);ctx.save();ctx.shadowColor='#7c3aed';ctx.shadowBlur=7;ctx.fillStyle='#6d28d9';ctx.beginPath();ctx.moveTo(-ew,0);ctx.bezierCurveTo(-ew,-eh*1.5,ew,-eh*1.5,ew,0);ctx.bezierCurveTo(ew,eh*1.5,-ew,eh*1.5,-ew,0);ctx.fill();ctx.restore();ctx.restore();}
            var a1=t*0.005,a2=a1+Math.PI,b1=Math.max(0,Math.sin(t*0.07)>0.96?(Math.sin(t*0.07)-0.96)/0.04:0),b2=Math.max(0,Math.sin(t*0.07+Math.PI)>0.96?(Math.sin(t*0.07+Math.PI)-0.96)/0.04:0);
            drawEye(cx+Math.cos(a1)*R,cy+Math.sin(a1)*R,a1,b1);drawEye(cx+Math.cos(a2)*R,cy+Math.sin(a2)*R,a2,b2);
        },
        bg_fallingleaves: (function(){
            var N=14,seeds=null;
            function init(){seeds=[];for(var i=0;i<N;i++){seeds.push({xBase:Math.random(),phase:Math.random()*100,speed:0.22+Math.random()*0.28,swayAmp:10+Math.random()*14,swayFreq:0.02+Math.random()*0.02,rotSpeed:(Math.random()<0.5?1:-1)*(0.025+Math.random()*0.04),sz:3+Math.random()*3.5,ci:i%5,so:Math.random()*Math.PI*2});}}
            var colors=['#84cc16','#65a30d','#a3e635','#fbbf24','#86efac'];
            function leaf(ctx,sz,col){ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(0,-sz);ctx.bezierCurveTo(sz*0.9,-sz*0.3,sz*0.9,sz*0.6,0,sz);ctx.bezierCurveTo(-sz*0.9,sz*0.6,-sz*0.9,-sz*0.3,0,-sz);ctx.fill();ctx.strokeStyle='rgba(0,0,0,0.15)';ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(0,-sz*0.8);ctx.lineTo(0,sz*0.8);ctx.stroke();}
            function branch(ctx,W,H){ctx.save();ctx.translate(W,0);ctx.strokeStyle='rgba(101,163,13,0.5)';ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-W*0.09,H*0.06,-W*0.17,H*0.13,-W*0.28,H*0.18);ctx.stroke();[[0.3,-0.55,W*0.06,1.6],[0.55,-0.9,W*0.07,1.4],[0.78,-0.45,W*0.045,1.2]].forEach(function(a){var t=a[0],ang=a[1],len=a[2],lw=a[3],mt=1-t,px=mt*mt*mt*0+3*mt*mt*t*(-W*0.09)+3*mt*t*t*(-W*0.17)+t*t*t*(-W*0.28),py=mt*mt*mt*0+3*mt*mt*t*(H*0.06)+3*mt*t*t*(H*0.13)+t*t*t*(H*0.18);ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+Math.cos(ang)*len,py+Math.sin(ang+1.2)*len);ctx.stroke();ctx.save();ctx.translate(px+Math.cos(ang)*len*0.9,py+Math.sin(ang+1.2)*len*0.9);ctx.rotate(ang-Math.PI/2);ctx.globalAlpha=0.65;leaf(ctx,lw*2.8,'#84cc16');ctx.restore();});ctx.restore();}
            return function(ctx,W,H,t){ctx.clearRect(0,0,W,H);if(!seeds)init();branch(ctx,W,H);for(var i=0;i<N;i++){var s=seeds[i],prog=((t*s.speed+s.phase)%100)/100,y=prog*(H+30)-15,x=(s.xBase*W+Math.sin(t*s.swayFreq+s.so)*s.swayAmp+W)%W,fi=Math.min(1,prog*12),fo=Math.min(1,(1-prog)*8);ctx.save();ctx.globalAlpha=0.7*fi*fo;ctx.translate(x,y);ctx.rotate(t*s.rotSpeed+s.phase);leaf(ctx,s.sz,colors[s.ci]);ctx.restore();}};
        })(),
        bg_underwater: (function(){
            var BC=8,bb=null;
            function init(W){bb=[];for(var i=0;i<BC;i++){bb.push({x:Math.random()*W,wo:Math.random()*Math.PI*2,sp:0.3+Math.random()*0.5,r:1+Math.random()*3,ph:Math.random()*100,pa:0.08+Math.random()*0.22,pop:false,pt:0,px:0,py:0});}}
            return function(ctx,W,H,t){
                ctx.clearRect(0,0,W,H);
                var g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(3,105,161,0.18)');g.addColorStop(1,'rgba(7,89,133,0.05)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
                if(!bb) init(W);
                for(var i=0;i<bb.length;i++){
                    var b=bb[i],prog=((t*b.sp+b.ph)%100)/100,ry=H*(1-prog),bx=(b.x+Math.sin(prog*Math.PI*3+b.wo)*12+W)%W;
                    if(!b.pop&&prog>=(1-b.pa)){b.pop=true;b.pt=0;b.px=bx;b.py=ry;}
                    if(b.pop){b.pt++;var pt=b.pt/14;if(pt<=1){var pr=b.r*(1+pt*3);ctx.save();ctx.globalAlpha=(1-pt)*0.5;ctx.strokeStyle='#bae6fd';ctx.lineWidth=1;ctx.beginPath();ctx.arc(b.px,b.py,pr,0,Math.PI*2);ctx.stroke();ctx.restore();for(var d=0;d<4;d++){var da=b.wo+d*Math.PI/2,dx=b.px+Math.cos(da)*pr*0.9,dy=b.py+Math.sin(da)*pr*0.9;ctx.save();ctx.globalAlpha=(1-pt)*0.45;ctx.fillStyle='#7dd3fc';ctx.beginPath();ctx.arc(dx,dy,Math.max(0.4,b.r*0.2*(1-pt)),0,Math.PI*2);ctx.fill();ctx.restore();}}else{b.x=Math.random()*W;b.wo=Math.random()*Math.PI*2;b.sp=0.3+Math.random()*0.5;b.r=1+Math.random()*3;b.ph=Math.random()*100;b.pa=0.08+Math.random()*0.22;b.pop=false;b.pt=0;}}
                    else{var al=prog<0.08?prog/0.08:prog>0.88?(1-prog)/0.12:1;ctx.save();ctx.globalAlpha=al*0.6;ctx.strokeStyle='#7dd3fc';ctx.lineWidth=1;ctx.shadowColor='#38bdf8';ctx.shadowBlur=4;ctx.beginPath();ctx.arc(bx,ry,b.r,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=al*0.15;ctx.fillStyle='#e0f2fe';ctx.beginPath();ctx.arc(bx-b.r*0.28,ry-b.r*0.28,b.r*0.36,0,Math.PI*2);ctx.fill();ctx.restore();}
                }
            };
        })(),
        bg_gas: function(ctx,W,H,t){
            ctx.clearRect(0,0,W,H);
            for(var i=0;i<6;i++){var x=W/2+Math.cos(t*0.012+i*60*Math.PI/180)*W*0.28,y=H/2+Math.sin(t*0.015+i*60*Math.PI/180)*H*0.3,r=15+Math.sin(t*0.02+i)*6;ctx.save();ctx.globalAlpha=0.14;var grd=ctx.createRadialGradient(x,y,0,x,y,r);grd.addColorStop(0,'#a78bfa');grd.addColorStop(1,'transparent');ctx.fillStyle=grd;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();}
        },
        bg_fireworks: (function(){
            var bursts=[],lastBurst=0,COLORS=['#ffd700','#f97316','#ef4444','#a78bfa','#34d399','#60a5fa','#f472b6'];
            function spawn(W,H){var x=W*(0.15+Math.random()*0.7),y=H*(0.1+Math.random()*0.6),color=COLORS[Math.floor(Math.random()*COLORS.length)],count=14+Math.floor(Math.random()*6),speed=1.2+Math.random()*1.4,particles=[];for(var i=0;i<count;i++){var a=(i/count)*Math.PI*2+(Math.random()-0.5)*0.3,s=speed*(0.5+Math.random()*0.8);particles.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-0.6,trail:[]});}bursts.push({particles:particles,color:color,life:1,maxLife:45+Math.floor(Math.random()*15)});}
            return function(ctx,W,H,t){ctx.clearRect(0,0,W,H);if(t-lastBurst>60||bursts.length===0){if(bursts.length<3){spawn(W,H);lastBurst=t;}}for(var b=bursts.length-1;b>=0;b--){var burst=bursts[b];burst.life-=1/burst.maxLife;if(burst.life<=0){bursts.splice(b,1);continue;}for(var j=0;j<burst.particles.length;j++){var p=burst.particles[j];p.x+=p.vx;p.y+=p.vy;p.vx*=0.97;p.vy=p.vy*0.97+0.08;p.life=burst.life;}for(var j=0;j<burst.particles.length;j++){var p=burst.particles[j],sz=Math.max(0.3,2*p.life);ctx.save();ctx.globalAlpha=p.life*0.9;ctx.fillStyle=burst.color;ctx.shadowColor=burst.color;ctx.shadowBlur=5;ctx.beginPath();ctx.arc(p.x,p.y,sz,0,Math.PI*2);ctx.fill();ctx.restore();}}};
        })(),
        bg_hell: function(ctx,W,H,t){
            ctx.clearRect(0,0,W,H);
            var g=ctx.createLinearGradient(0,H,0,0);g.addColorStop(0,'rgba(239,68,68,0.25)');g.addColorStop(0.4,'rgba(120,20,20,0.12)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
            if(!window._hellSeedsShop){window._hellSeedsShop=Array.from({length:8},function(){return{xb:Math.random(),xw:Math.random()*Math.PI*2,sp:0.5+Math.random()*0.5,ph:Math.random()*100,s0:1.5+Math.random()*1.5};});}
            for(var i=0;i<8;i++){var s=window._hellSeedsShop[i],prog=((t*s.sp+s.ph)%100)/100,x=(s.xb*W*0.88+W*0.06+Math.sin(prog*Math.PI*3+s.xw)*10)%W,y=H*(1-prog*0.92)+4,sz=s.s0+prog*2,a=prog<0.1?prog*10:prog>0.85?(1-prog)/0.15:0.7;ctx.save();ctx.globalAlpha=a;ctx.fillStyle='rgba(255,100,100,0.85)';ctx.shadowColor='#ef4444';ctx.shadowBlur=8;ctx.beginPath();ctx.arc(x,y,sz,Math.PI,0,false);ctx.lineTo(x+sz,y+sz*1.8);ctx.quadraticCurveTo(x+sz*0.5,y+sz*1.3,x,y+sz*1.6);ctx.quadraticCurveTo(x-sz*0.5,y+sz*1.3,x-sz,y+sz*1.8);ctx.lineTo(x-sz,y);ctx.closePath();ctx.fill();ctx.restore();}
        },
        bg_shadowworld: function(ctx,W,H,t){
            ctx.clearRect(0,0,W,H);
            for(var i=0;i<6;i++){var x=W*0.05+i*(W*0.18)+Math.sin(t*0.008+i)*10,y=H/2+Math.cos(t*0.01+i)*H*0.28,r=8+Math.sin(t*0.018+i)*4;ctx.save();ctx.globalAlpha=0.92;var grd=ctx.createRadialGradient(x,y,0,x,y,r*1.4);grd.addColorStop(0,'rgba(109,40,217,0.32)');grd.addColorStop(0.5,'rgba(76,29,149,0.16)');grd.addColorStop(1,'transparent');ctx.fillStyle=grd;ctx.beginPath();ctx.arc(x,y,r*1.4,0,Math.PI*2);ctx.fill();ctx.restore();}
        }
    };

    var t = 0;
    var canvases = document.querySelectorAll('.effect-preview-canvas');
    var contexts = [];
    canvases.forEach(function(canvas) {
        var ctx = canvas.getContext('2d');
        contexts.push({ctx: ctx, canvas: canvas, effectId: canvas.dataset.effect});
    });

    function animate() {
        t++;
        contexts.forEach(function(item) {
            var W = item.canvas.width, H = item.canvas.height;
            if (renderers[item.effectId]) renderers[item.effectId](item.ctx, W, H, t);
        });
        requestAnimationFrame(animate);
    }
    if (contexts.length > 0) animate();
})();
</script>


<?php
$pageContent = ob_get_clean();
require VIEWS_PATH . '/layouts/app.php';

function getShopBadgeSvg(string $id): string {
    $svgs = [
        'premium'    => '<svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26"><path d="M12 2L9.5 8.5H3l5.5 4L6 19l6-4 6 4-2.5-6.5L21 8.5h-6.5L12 2z"/></svg>',
        'fresh'      => '<svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-5 8z"/></svg>',
        'lover'      => '<svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26"><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/></svg>',
        'known'      => '<svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>',
        'rich'       => '<svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>',
        'trapstar'   => '<svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>',
        'the_killer' => '<svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26"><path d="M12 2C7.58 2 4 5.58 4 10c0 2.84 1.49 5.34 3.73 6.76.18.11.27.31.27.52V19c0 1.1.9 2 2 2v-2h1.5v2h1v-2H14v2c1.1 0 2-.9 2-2v-1.72c0-.21.09-.41.27-.52C18.51 15.34 20 12.84 20 10c0-4.42-3.58-8-8-8zM9 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>',
    ];
    return $svgs[$id] ?? '';
}