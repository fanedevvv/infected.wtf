<?php
session_start(["cookie_secure"=>true,"cookie_httponly"=>true,"cookie_samesite"=>"Lax"]);
require_once __DIR__ . '/../core/database.php'; require_once __DIR__ . '/../core/auth.php'; require_once __DIR__ . '/../core/helpers.php';

header('Content-Type: application/json');

if (!isLoggedIn()) { echo json_encode(['success'=>false,'error'=>'Neautentificat.']); exit; }

// Check if banned
$banCheck = $pdo->prepare("SELECT banned FROM users WHERE id=?");
$banCheck->execute([(int)$_SESSION['user_id']]);
$banRow = $banCheck->fetch();
if (!$banRow || $banRow['banned']) {
    session_destroy();
    echo json_encode(['success'=>false,'error'=>'Contul tău a fost suspendat.']); exit;
}

$userId = (int)$_SESSION['user_id'];
$action = $_POST['action'] ?? '';

function ok(string $m='OK'): void { echo json_encode(['success'=>true,'message'=>$m]); exit; }
function err(string $m): void     { echo json_encode(['success'=>false,'error'=>$m]); exit; }

// ── Clear avatar (instant) ─────────────────────────────
if ($action === 'clear_avatar') {
    $row = $pdo->prepare("SELECT avatar FROM profiles WHERE user_id=?");
    $row->execute([$userId]);
    $path = $row->fetchColumn();
    if ($path && file_exists(__DIR__.'/../'.$path)) @unlink(__DIR__.'/../'.$path);
    $pdo->prepare("UPDATE profiles SET avatar=NULL WHERE user_id=?")->execute([$userId]);
    ok('Avatar șters!');
}

// ── Clear background (instant) ─────────────────────────
if ($action === 'clear_background') {
    $row = $pdo->prepare("SELECT background_type, background_value FROM profiles WHERE user_id=?");
    $row->execute([$userId]);
    $bg = $row->fetch();
    if ($bg && in_array($bg['background_type'], ['image','video']) && $bg['background_value']
        && preg_match('/^uploads\/backgrounds\//', $bg['background_value'])
        && file_exists(__DIR__.'/../'.$bg['background_value'])) {
        @unlink(__DIR__.'/../'.$bg['background_value']);
    }
    $pdo->prepare("UPDATE profiles SET background_type='particles',background_value='#050507' WHERE user_id=?")->execute([$userId]);
    ok('Fundal șters!');
}

// ── Profile info ──────────────────────────────────────
if ($action === 'profile-info-form') {
    $dn      = substr(strip_tags(trim($_POST['display_name']??'')),0,100);
    $bio     = substr(strip_tags(trim($_POST['bio']??'')),0,300);
    $loc     = substr(strip_tags(trim($_POST['location']??'')),0,100);
    $font    = trim($_POST['profile_font']??'Syne');
    $typing  = isset($_POST['typing_effect']) ? 1 : 0;
    $avatar  = trim($_POST['avatar']??'');
    $bgImg   = trim($_POST['background_image']??'');
    $opacity = max(0, min(100, (int)($_POST['profile_opacity'] ?? 100)));
    $blur    = max(0, min(100, (int)($_POST['profile_blur']   ?? 0)));
    $allowed_fonts = ['Syne','Outfit','Space Mono','Rajdhani','Orbitron','Bebas Neue','Exo 2','Josefin Sans'];
    if (!in_array($font,$allowed_fonts)) $font='Syne';
    if ($avatar && !preg_match('/^uploads\/avatars\/[a-zA-Z0-9_\-\.]+$/',$avatar)) $avatar='';

    // Background image handling — ONLY update background if a valid image path was sent.
    // An empty $bgImg means the current background is not an image type (color/gradient/video/particles),
    // so we must NOT touch it. Previously this was incorrectly resetting it to particles.
    $bgType = null; $bgVal = null;
    if ($bgImg && preg_match('/^uploads\/backgrounds\/[a-zA-Z0-9_\-\.]+$/',$bgImg)) {
        $bgType = 'image'; $bgVal = $bgImg;
    }
    // (no elseif for empty string — empty just means "not an image bg", leave it alone)

    $pdo->prepare("UPDATE profiles SET display_name=?,bio=?,location=?,profile_font=?,typing_effect=?,avatar=?,profile_opacity=?,profile_blur=? WHERE user_id=?")
        ->execute([$dn?:null,$bio?:null,$loc?:null,$font,$typing,$avatar?:null,$opacity,$blur,$userId]);
    if ($bgType !== null) {
        $pdo->prepare("UPDATE profiles SET background_type=?,background_value=? WHERE user_id=?")->execute([$bgType,$bgVal,$userId]);
    }
    ok('Profil salvat!');
}

// ── Add link ──────────────────────────────────────────
if ($action === 'add-link-form') {
    $platform = trim($_POST['platform']??'website');
    $url      = trim($_POST['url']??'');
    $allowed  = ['steam','spotify','discord','instagram','twitter','youtube','twitch','github','tiktok','website'];
    if (!in_array($platform,$allowed)) err('Platformă invalidă.');
    if (!filter_var($url,FILTER_VALIDATE_URL)) err('URL invalid.');
    if (strlen($url)>500) err('URL prea lung.');
    $cnt = $pdo->prepare("SELECT COUNT(*) FROM social_links WHERE user_id=?");
    $cnt->execute([$userId]);
    if ($cnt->fetchColumn()>=10) err('Maxim 10 linkuri.');
    $ord = $pdo->prepare("SELECT COALESCE(MAX(display_order),0)+1 FROM social_links WHERE user_id=?");
    $ord->execute([$userId]);
    $pdo->prepare("INSERT INTO social_links (user_id,platform,url,display_order) VALUES (?,?,?,?)")
        ->execute([$userId,$platform,$url,$ord->fetchColumn()]);
    ok('Link adăugat!');
}

// ── Delete link ───────────────────────────────────────
if ($action === 'delete_link') {
    $id = (int)($_POST['id']??0);
    if (!$id) err('ID invalid.');
    $pdo->prepare("DELETE FROM social_links WHERE id=? AND user_id=?")->execute([$id,$userId]);
    ok('Link șters!');
}

// ── Background ────────────────────────────────────────
if ($action === 'background-form') {
    $type  = trim($_POST['background_type']??'particles');
    $types = ['particles','color','gradient','image','video'];
    if (!in_array($type,$types)) $type='particles';
    $value = '#050507';
    if ($type==='color') {
        $v = trim($_POST['background_value_color']??'#000');
        $value = preg_match('/^#[0-9a-fA-F]{3,8}$/',$v) ? $v : '#000000';
    } elseif ($type==='gradient') {
        $v = trim($_POST['background_value_gradient']??'');
        $value = substr(preg_replace('/[<>"\'`]/','', $v),0,300) ?: 'linear-gradient(135deg,#000,#0d0033)';
    } elseif ($type==='image') {
        $up  = trim($_POST['background_value_image']??'');
        $url = trim($_POST['background_value_image_url']??'');
        if ($up && preg_match('/^uploads\/backgrounds\/[a-zA-Z0-9_\-\.]+$/',$up)) $value=$up;
        elseif ($url && filter_var($url,FILTER_VALIDATE_URL)) $value=$url;
    } elseif ($type==='video') {
        $up = trim($_POST['background_value_video']??'');
        if ($up && preg_match('/^uploads\/backgrounds\/[a-zA-Z0-9_\-\.]+$/',$up)) $value=$up;
    }
    $pdo->prepare("UPDATE profiles SET background_type=?,background_value=? WHERE user_id=?")->execute([$type,$value,$userId]);
    ok('Fundal salvat!');
}

// ── Effects ───────────────────────────────────────────
if ($action === 'effects-form') {
    $p = isset($_POST['particle_effect'])?1:0;
    $c = isset($_POST['cursor_trail'])?1:0;
    $t = isset($_POST['typing_effect'])?1:0;
    $ring = trim($_POST['avatar_ring'] ?? 'none');
    if (!in_array($ring, ['none','normal','premium'])) $ring = 'none';
    $pdo->prepare("UPDATE profiles SET particle_effect=?,cursor_trail=?,typing_effect=?,avatar_ring=? WHERE user_id=?")->execute([$p,$c,$t,$ring,$userId]);

    // Exclusivitate: actualizăm active_effects pentru conflicte
    $s2 = $pdo->prepare("SELECT COALESCE(active_effects,'{}') FROM profiles WHERE user_id=?");
    $s2->execute([$userId]);
    $active2 = json_decode($s2->fetchColumn() ?: '{}', true) ?: [];
    $changed = false;

    // Dacă s-a activat particle_effect, resetăm efectul bg cumpărat (exclusivitate)
    if ($p) { unset($active2['bg']); $changed = true; }

    // Dacă s-a activat cursor_trail, resetăm efectul cursor cumpărat (exclusivitate)
    if ($c) { unset($active2['cursor']); $changed = true; }

    // Dacă s-a activat un ring, resetăm efectul avatar cumpărat (exclusivitate)
    if ($ring !== 'none') { unset($active2['avatar']); $changed = true; }

    if ($changed) {
        $pdo->prepare("UPDATE profiles SET active_effects=? WHERE user_id=?")->execute([json_encode($active2), $userId]);
    }

    ok('Efecte salvate!');
}

// ── Delete music ──────────────────────────────────────
if ($action === 'delete_music') {
    $row = $pdo->prepare("SELECT music_path FROM profiles WHERE user_id=?");
    $row->execute([$userId]);
    $path = $row->fetchColumn();
    if ($path && file_exists(__DIR__.'/../'.$path)) @unlink(__DIR__.'/../'.$path);
    $pdo->prepare("UPDATE profiles SET music_path=NULL WHERE user_id=?")->execute([$userId]);
    ok('Muzică ștearsă!');
}

if ($action === 'delete_cursor') {
    $row = $pdo->prepare("SELECT cursor_path FROM profiles WHERE user_id=?");
    $row->execute([$userId]);
    $path = $row->fetchColumn();
    if ($path && file_exists(__DIR__.'/../'.$path)) @unlink(__DIR__.'/../'.$path);
    $pdo->prepare("UPDATE profiles SET cursor_path=NULL WHERE user_id=?")->execute([$userId]);
    ok('Cursor șters!');
}

// ── Avatar shape ──────────────────────────────────────────────────────────────
if ($action === 'save_avatar_shape') {
    $allowed = ['square', 'soft', 'rounded', 'circle', 'eye', 'diamond', 'egg'];
    $shape   = trim($_POST['avatar_shape'] ?? 'circle');
    if (!in_array($shape, $allowed)) $shape = 'circle';
    $pdo->prepare("UPDATE profiles SET avatar_shape=? WHERE user_id=?")->execute([$shape, $userId]);
    ok('Avatar shape saved!');
}

// ── Toggle/activate purchased effect ──────────────────────────────────────────
if ($action === 'toggle_purchased_effect') {
    $effectId   = trim($_POST['effect_id'] ?? '');
    $effectType = trim($_POST['effect_type'] ?? ''); // cursor | avatar | bg
    $enable     = (int)($_POST['enable'] ?? 0);

    if (!$effectId || !in_array($effectType, ['cursor','avatar','bg'])) err('Invalid effect.');

    // Check the user actually owns this effect
    $s = $pdo->prepare("SELECT COALESCE(purchased_effects,'[]'), COALESCE(active_effects,'{}') FROM profiles WHERE user_id=?");
    $s->execute([$userId]);
    $row = $s->fetch(PDO::FETCH_NUM);
    $purchased = json_decode($row[0] ?: '[]', true) ?: [];
    $active    = json_decode($row[1] ?: '{}', true) ?: [];

    if (!in_array($effectId, $purchased, true)) err('Effect not owned.');

    if ($enable) {
        $active[$effectType] = $effectId;
        // Exclusivitate: resetăm câmpurile free care se bat cu efectul cumpărat
        if ($effectType === 'bg') {
            $pdo->prepare("UPDATE profiles SET particle_effect=0 WHERE user_id=?")->execute([$userId]);
        }
        if ($effectType === 'cursor') {
            $pdo->prepare("UPDATE profiles SET cursor_trail=0 WHERE user_id=?")->execute([$userId]);
        }
        if ($effectType === 'avatar') {
            $pdo->prepare("UPDATE profiles SET avatar_ring='none' WHERE user_id=?")->execute([$userId]);
        }
    } else {
        if (isset($active[$effectType]) && $active[$effectType] === $effectId) {
            unset($active[$effectType]);
        }
    }

    $pdo->prepare("UPDATE profiles SET active_effects=? WHERE user_id=?")->execute([json_encode($active), $userId]);
    ok('Effect updated!', ['active_effects' => $active]);
}

err('Acțiune necunoscută.');// Removed trailing err — appended below