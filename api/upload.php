<?php
session_start(["cookie_secure"=>true,"cookie_httponly"=>true,"cookie_samesite"=>"Lax"]);
require_once __DIR__ . '/../core/database.php'; require_once __DIR__ . '/../core/auth.php'; require_once __DIR__ . '/../core/helpers.php';
/* loaded above */

header('Content-Type: application/json');

if (!isLoggedIn()) { echo json_encode(['success'=>false,'error'=>'Neautentificat.']); exit; }

$userId = (int)$_SESSION['user_id'];
$type   = trim($_POST['type'] ?? '');

function ok(array $data): void  { echo json_encode(array_merge(['success'=>true], $data)); exit; }
function err(string $m): void   { echo json_encode(['success'=>false,'error'=>$m]); exit; }

function getMime(string $tmp): string {
    $fi = finfo_open(FILEINFO_MIME_TYPE);
    $m  = finfo_file($fi, $tmp);
    finfo_close($fi);
    return $m;
}

// ── Avatar ─────────────────────────────────────────────
if ($type === 'avatar') {
    if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) err('Eroare upload avatar.');
    $file = $_FILES['avatar'];
    if ($file['size'] > 5*1024*1024) err('Max 5MB.');
    $mime = getMime($file['tmp_name']);
    $exts = ['image/jpeg'=>'jpg','image/png'=>'png','image/gif'=>'gif','image/webp'=>'webp'];
    if (!isset($exts[$mime])) err('Tip nesuportat. Acceptăm JPG, PNG, GIF, WebP.');
    $ext  = $exts[$mime];
    $dir  = __DIR__ . '/../uploads/avatars/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    // Delete old avatar
    $old = $pdo->prepare("SELECT avatar FROM profiles WHERE user_id=?");
    $old->execute([$userId]);
    $oldPath = $old->fetchColumn();
    if ($oldPath && file_exists(__DIR__.'/../'.$oldPath)) @unlink(__DIR__.'/../'.$oldPath);
    $fname = 'av_'.$userId.'_'.time().'.'.$ext;
    if (!move_uploaded_file($file['tmp_name'], $dir.$fname)) err('Nu s-a putut salva.');
    $path = 'uploads/avatars/'.$fname;
    $pdo->prepare("UPDATE profiles SET avatar=? WHERE user_id=?")->execute([$path, $userId]);
    ok(['path'=>$path, 'url'=>'/'.$path]);
}

// ── Background (image/video) ───────────────────────────
if ($type === 'background') {
    if (!isset($_FILES['background']) || $_FILES['background']['error'] !== UPLOAD_ERR_OK) err('Eroare upload fundal.');
    $file = $_FILES['background'];
    if ($file['size'] > 100*1024*1024) err('Max 100MB.');
    $mime = getMime($file['tmp_name']);
    $exts = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp','image/gif'=>'gif','video/mp4'=>'mp4'];
    if (!isset($exts[$mime])) err('Tip nesuportat.');
    $ext  = $exts[$mime];
    $dir  = __DIR__ . '/../uploads/backgrounds/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    // Delete old background file (only if it was an uploaded file)
    $old = $pdo->prepare("SELECT background_value, background_type FROM profiles WHERE user_id=?");
    $old->execute([$userId]);
    $oldRow = $old->fetch();
    if ($oldRow && in_array($oldRow['background_type'], ['image','video']) &&
        $oldRow['background_value'] &&
        preg_match('/^uploads\/backgrounds\//', $oldRow['background_value']) &&
        file_exists(__DIR__.'/../'.$oldRow['background_value'])) {
        @unlink(__DIR__.'/../'.$oldRow['background_value']);
    }
    $fname = 'bg_'.$userId.'_'.time().'.'.$ext;
    if (!move_uploaded_file($file['tmp_name'], $dir.$fname)) err('Nu s-a putut salva.');
    $path = 'uploads/backgrounds/'.$fname;
    // Persist to DB instantly so the user does not need to click "Save changes"
    $bgType = ($mime === 'video/mp4') ? 'video' : 'image';
    $pdo->prepare("UPDATE profiles SET background_type=?, background_value=? WHERE user_id=?")
        ->execute([$bgType, $path, $userId]);
    ok(['path'=>$path, 'url'=>'/'.$path]);
}

// ── Music ──────────────────────────────────────────────
if ($type === 'music') {
    if (!isset($_FILES['music']) || $_FILES['music']['error'] !== UPLOAD_ERR_OK) {
        $code = $_FILES['music']['error'] ?? 'none';
        err('Eroare upload audio. Cod: '.$code);
    }
    $file = $_FILES['music'];
    if ($file['size'] > 20*1024*1024) err('Max 20MB pentru fișiere audio.');

    $mime = getMime($file['tmp_name']);
    // Audio MIME types vary by server — also allow octet-stream for mp3
    $allowed = ['audio/mpeg','audio/mp3','audio/ogg','audio/wav','audio/wave','audio/x-wav','audio/vnd.wave','application/octet-stream'];
    // Also check file extension as fallback
    $origName = strtolower($file['name']);
    $ext = pathinfo($origName, PATHINFO_EXTENSION);
    $allowedExt = ['mp3','ogg','wav'];

    if (!in_array($mime, $allowed) && !in_array($ext, $allowedExt)) {
        err('Tip nesuportat. Acceptăm MP3, OGG, WAV. (MIME: '.$mime.')');
    }

    // Force correct extension from original filename
    if (!in_array($ext, $allowedExt)) $ext = 'mp3';

    $dir = __DIR__ . '/../uploads/music/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    // Delete old music file
    $old = $pdo->prepare("SELECT music_path FROM profiles WHERE user_id=?");
    $old->execute([$userId]);
    $oldPath = $old->fetchColumn();
    if ($oldPath && file_exists(__DIR__.'/../'.$oldPath)) @unlink(__DIR__.'/../'.$oldPath);

    $fname = 'music_'.$userId.'_'.time().'.'.$ext;
    if (!move_uploaded_file($file['tmp_name'], $dir.$fname)) err('Nu s-a putut salva fișierul.');

    $path = 'uploads/music/'.$fname;
    $pdo->prepare("UPDATE profiles SET music_path=? WHERE user_id=?")->execute([$path, $userId]);
    ok(['path'=>$path, 'url'=>'/'.$path]);
}

// ── Cursor ─────────────────────────────────────────────
if ($type === 'cursor') {
    if (!isset($_FILES['cursor']) || $_FILES['cursor']['error'] !== UPLOAD_ERR_OK) err('Eroare upload cursor. Cod: '.($_FILES['cursor']['error'] ?? 'none'));
    $file = $_FILES['cursor'];
    if ($file['size'] > 2*1024*1024) err('Max 2MB pentru cursor.');
    $mime = getMime($file['tmp_name']);
    $origExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    // Accept by MIME or by extension
    $mimeMap = [
        'image/png'                => 'png',
        'image/webp'               => 'webp',
        'image/gif'                => 'gif',
        'image/jpeg'               => 'jpg',
        'image/jpg'                => 'jpg',
        'image/apng'               => 'png',
        'application/octet-stream' => null,
    ];
    $extMap = ['png'=>'png','webp'=>'webp','gif'=>'gif','jpg'=>'jpg','jpeg'=>'jpg','cur'=>'cur'];
    if (isset($mimeMap[$mime]) && $mimeMap[$mime] !== null) {
        $ext = $mimeMap[$mime];
    } elseif (isset($extMap[$origExt])) {
        $ext = $extMap[$origExt];
    } else {
        err('Tip nesuportat. Acceptam PNG, JPG, WebP, GIF, CUR. (MIME: '.$mime.', ext: '.$origExt.')');
    }
    $dir = __DIR__ . '/../uploads/cursors/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    // Delete old cursor
    $old = $pdo->prepare("SELECT cursor_path FROM profiles WHERE user_id=?");
    $old->execute([$userId]);
    $oldPath = $old->fetchColumn();
    if ($oldPath && file_exists(__DIR__.'/../'.$oldPath)) @unlink(__DIR__.'/../'.$oldPath);


    $fname = 'cursor_'.$userId.'_'.time().'.'.$ext;
    if (!move_uploaded_file($file['tmp_name'], $dir.$fname)) err('Nu s-a putut salva fisierul.');
    $path = 'uploads/cursors/'.$fname;
    $pdo->prepare("UPDATE profiles SET cursor_path=? WHERE user_id=?")->execute([$path, $userId]);
    ok(['path'=>$path, 'url'=>'/'.$path]);
}

err('Tip upload necunoscut: '.$type);