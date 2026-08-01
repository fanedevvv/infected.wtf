<?php

// ── Email Encryption (AES-256-CBC + HMAC blind index) ─────────────────────────
/**
 * Criptează un email cu AES-256-CBC (IV random prepended, base64 output).
 * DB stochează rezultatul; plaintext-ul nu apare niciodată în DB.
 */
function encryptEmail(string $email): string {
    $iv     = random_bytes(16);
    $cipher = openssl_encrypt(strtolower(trim($email)), 'AES-256-CBC', EMAIL_ENCRYPTION_KEY, OPENSSL_RAW_DATA, $iv);
    return base64_encode($iv . $cipher);
}

/**
 * Decriptează un email stocat de encryptEmail().
 * Returnează string-ul original dacă decriptarea eșuează (fallback sigur).
 */
function decryptEmail(string $encrypted): string {
    if (empty($encrypted)) return '';
    $data = base64_decode($encrypted, true);
    if ($data === false || strlen($data) < 17) return $encrypted; // nu e criptat (fallback)
    $iv     = substr($data, 0, 16);
    $cipher = substr($data, 16);
    $plain  = openssl_decrypt($cipher, 'AES-256-CBC', EMAIL_ENCRYPTION_KEY, OPENSSL_RAW_DATA, $iv);
    return $plain !== false ? $plain : $encrypted;
}

/**
 * Returnează un HMAC-SHA256 determinist al emailului — folosit pentru lookup/unicitate în DB
 * în locul emailului în clar, deoarece criptarea AES-CBC produce output diferit la fiecare apel.
 */
function emailBlindIndex(string $email): string {
    return hash_hmac('sha256', strtolower(trim($email)), EMAIL_BLIND_INDEX_KEY);
}

// ── Email Verification ────────────────────────────────────────────────────────
function sendVerificationEmail(PDO $pdo, int $userId, string $email, string $username): bool {
    // Delete any old unused tokens for this user
    $pdo->prepare("DELETE FROM email_verifications WHERE user_id = ? AND used = 0")->execute([$userId]);

    $token   = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', strtotime('+24 hours'));

    $pdo->prepare("INSERT INTO email_verifications (user_id, token, expires_at) VALUES (?,?,?)")
        ->execute([$userId, $token, $expires]);

    $verifyUrl = rtrim(SITE_URL, '/') . '/auth/verify-email?token=' . $token;
    $siteName  = SITE_NAME;
    $subject   = "Verify your email — {$siteName}";

    $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#050507;font-family:'Segoe UI',Arial,sans-serif;color:#f0f0f0}
  .wrap{max-width:480px;margin:40px auto;padding:0 16px}
  .card{background:linear-gradient(160deg,#0a0a16 0%,#0d0d20 100%);border:1px solid rgba(255,255,255,.1);border-radius:20px;overflow:hidden}
  .top-bar{height:3px;background:linear-gradient(90deg,#00d4ff,#ff00ff)}
  .body{padding:40px 36px}
  .logo{font-size:13px;font-weight:800;letter-spacing:.12em;color:#00d4ff;margin-bottom:32px;text-transform:uppercase}
  h1{font-size:22px;font-weight:700;margin:0 0 10px;color:#fff}
  p{font-size:14px;line-height:1.7;color:rgba(240,240,240,.65);margin:0 0 24px}
  .btn{display:inline-block;background:linear-gradient(135deg,#00d4ff,#0099bb);color:#000!important;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:.03em}
  .divider{height:1px;background:rgba(255,255,255,.07);margin:28px 0}
  .small{font-size:12px;color:rgba(240,240,240,.35);line-height:1.6}
  .small a{color:#00d4ff;text-decoration:none}
  .footer{background:rgba(255,255,255,.02);padding:20px 36px;text-align:center;font-size:11px;color:rgba(240,240,240,.3)}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="top-bar"></div>
    <div class="body">
      <div class="logo">{$siteName}</div>
      <h1>Verify your email address</h1>
      <p>Hey <strong style="color:#fff">{$username}</strong>, you're one step away! Click the button below to verify your email and activate your account.</p>
      <a href="{$verifyUrl}" class="btn">✓ Verify My Email</a>
      <div class="divider"></div>
      <p class="small">This link expires in <strong style="color:rgba(240,240,240,.6)">24 hours</strong>. If you didn't create an account on {$siteName}, you can safely ignore this email.<br><br>Or copy this link into your browser:<br><a href="{$verifyUrl}">{$verifyUrl}</a></p>
    </div>
    <div class="footer">&copy; {$siteName} · All rights reserved</div>
  </div>
</div>
</body>
</html>
HTML;

    $plain = "Verify your {$siteName} account\n\nHi {$username},\n\nClick the link below to verify your email:\n{$verifyUrl}\n\nThis link expires in 24 hours.\n";

    return _sendMail($email, $subject, $html, $plain);
}

// ── Send email-change verification ───────────────────────────────────────────
function sendEmailChangeVerification(PDO $pdo, int $userId, string $newEmail, string $username, string $token): bool {
    $verifyUrl = rtrim(SITE_URL, '/') . '/auth/confirm-action?token=' . $token . '&type=email_change';
    $siteName  = SITE_NAME;
    $subject   = "Confirm your new email — {$siteName}";

    $html = <<<HTML
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  body{margin:0;padding:0;background:#050507;font-family:'Segoe UI',Arial,sans-serif;color:#f0f0f0}
  .wrap{max-width:480px;margin:40px auto;padding:0 16px}
  .card{background:linear-gradient(160deg,#0a0a16,#0d0d20);border:1px solid rgba(255,255,255,.1);border-radius:20px;overflow:hidden}
  .top-bar{height:3px;background:linear-gradient(90deg,#a78bfa,#00d4ff)}
  .body{padding:40px 36px}
  .logo{font-size:13px;font-weight:800;letter-spacing:.12em;color:#a78bfa;margin-bottom:32px;text-transform:uppercase}
  h1{font-size:22px;font-weight:700;margin:0 0 10px;color:#fff}
  p{font-size:14px;line-height:1.7;color:rgba(240,240,240,.65);margin:0 0 24px}
  .btn{display:inline-block;background:linear-gradient(135deg,#a78bfa,#7c3aed);color:#fff!important;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none}
  .divider{height:1px;background:rgba(255,255,255,.07);margin:28px 0}
  .small{font-size:12px;color:rgba(240,240,240,.35);line-height:1.6}
  .small a{color:#a78bfa;text-decoration:none}
  .footer{background:rgba(255,255,255,.02);padding:20px 36px;text-align:center;font-size:11px;color:rgba(240,240,240,.3)}
</style></head><body>
<div class="wrap"><div class="card">
  <div class="top-bar"></div>
  <div class="body">
    <div class="logo">{$siteName}</div>
    <h1>Confirm your new email</h1>
    <p>Hey <strong style="color:#fff">{$username}</strong>, click the button below to confirm <strong style="color:#a78bfa">{$newEmail}</strong> as your new email address.</p>
    <a href="{$verifyUrl}" class="btn">Confirm New Email</a>
    <div class="divider"></div>
    <p class="small">This link expires in 24 hours. If you didn't request this change, ignore this email — your account is safe.<br><br><a href="{$verifyUrl}">{$verifyUrl}</a></p>
  </div>
  <div class="footer">&copy; {$siteName}</div>
</div></div></body></html>
HTML;
    $plain = "Confirm your new email for {$siteName}\n\nHi {$username},\n\nClick here to confirm {$newEmail} as your new email:\n{$verifyUrl}\n\nExpires in 24 hours.\n";
    return _sendMail($newEmail, $subject, $html, $plain);
}

// ── Send action confirmation email (password change / delete account) ─────────
function sendActionConfirmEmail(PDO $pdo, int $userId, string $email, string $username, string $actionType, string $token): bool {
    $verifyUrl = rtrim(SITE_URL, '/') . '/auth/confirm-action?token=' . $token . '&type=' . $actionType;
    $siteName  = SITE_NAME;

    if ($actionType === 'delete_account') {
        $subject  = "Confirm account deletion — {$siteName}";
        $heading  = "Confirm account deletion";
        $body     = "Hey <strong style='color:#fff'>{$username}</strong>, we received a request to <strong style='color:#ff8080'>permanently delete</strong> your {$siteName} account and all associated data. Click the button below to confirm.";
        $btnLabel = "Yes, Delete My Account";
        $btnColor = "linear-gradient(135deg,#ff5555,#cc0000)";
        $accent   = "#ff8080";
        $expiry   = "1 hour";
    } else {
        $subject  = "Confirm password change — {$siteName}";
        $heading  = "Confirm password change";
        $body     = "Hey <strong style='color:#fff'>{$username}</strong>, click the button below to confirm your password change on {$siteName}.";
        $btnLabel = "Confirm Password Change";
        $btnColor = "linear-gradient(135deg,#34d399,#059669)";
        $accent   = "#34d399";
        $expiry   = "1 hour";
    }

    $html = <<<HTML
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  body{margin:0;padding:0;background:#050507;font-family:'Segoe UI',Arial,sans-serif;color:#f0f0f0}
  .wrap{max-width:480px;margin:40px auto;padding:0 16px}
  .card{background:linear-gradient(160deg,#0a0a16,#0d0d20);border:1px solid rgba(255,255,255,.1);border-radius:20px;overflow:hidden}
  .top-bar{height:3px;background:{$btnColor}}
  .body{padding:40px 36px}
  .logo{font-size:13px;font-weight:800;letter-spacing:.12em;color:{$accent};margin-bottom:32px;text-transform:uppercase}
  h1{font-size:22px;font-weight:700;margin:0 0 10px;color:#fff}
  p{font-size:14px;line-height:1.7;color:rgba(240,240,240,.65);margin:0 0 24px}
  .btn{display:inline-block;background:{$btnColor};color:#fff!important;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none}
  .divider{height:1px;background:rgba(255,255,255,.07);margin:28px 0}
  .small{font-size:12px;color:rgba(240,240,240,.35);line-height:1.6}
  .small a{color:{$accent};text-decoration:none}
  .footer{background:rgba(255,255,255,.02);padding:20px 36px;text-align:center;font-size:11px;color:rgba(240,240,240,.3)}
</style></head><body>
<div class="wrap"><div class="card">
  <div class="top-bar"></div>
  <div class="body">
    <div class="logo">{$siteName}</div>
    <h1>{$heading}</h1>
    <p>{$body}</p>
    <a href="{$verifyUrl}" class="btn">{$btnLabel}</a>
    <div class="divider"></div>
    <p class="small">This link expires in {$expiry}. If you didn't request this, ignore this email — your account is safe.<br><br><a href="{$verifyUrl}">{$verifyUrl}</a></p>
  </div>
  <div class="footer">&copy; {$siteName}</div>
</div></div></body></html>
HTML;
    $plain = "{$heading} for {$siteName}\n\nHi {$username},\n\nClick here to confirm:\n{$verifyUrl}\n\nExpires in {$expiry}.\n";
    return _sendMail($email, $subject, $html, $plain);
}

// ── Re-login verification email (after 30-day inactivity) ─────────────────────
function sendReloginVerificationEmail(PDO $pdo, int $userId, string $email, string $username): bool {
    $token   = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));

    $pdo->prepare("DELETE FROM action_confirmations WHERE user_id=? AND action_type='relogin'")->execute([$userId]);
    $pdo->prepare("INSERT INTO action_confirmations (user_id, action_type, payload, token, expires_at) VALUES (?,?,?,?,?)")
        ->execute([$userId, 'relogin', '', $token, $expires]);

    $verifyUrl = rtrim(SITE_URL, '/') . '/auth/confirm-action?token=' . $token . '&type=relogin';
    $siteName  = SITE_NAME;
    $subject   = "Confirm it's you — {$siteName}";

    $html = <<<HTML
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  body{margin:0;padding:0;background:#050507;font-family:'Segoe UI',Arial,sans-serif;color:#f0f0f0}
  .wrap{max-width:480px;margin:40px auto;padding:0 16px}
  .card{background:linear-gradient(160deg,#0a0a16,#0d0d20);border:1px solid rgba(255,255,255,.1);border-radius:20px;overflow:hidden}
  .top-bar{height:3px;background:linear-gradient(90deg,#00d4ff,#ff00ff)}
  .body{padding:40px 36px}
  .logo{font-size:13px;font-weight:800;letter-spacing:.12em;color:#00d4ff;margin-bottom:32px;text-transform:uppercase}
  h1{font-size:22px;font-weight:700;margin:0 0 10px;color:#fff}
  p{font-size:14px;line-height:1.7;color:rgba(240,240,240,.65);margin:0 0 24px}
  .btn{display:inline-block;background:linear-gradient(135deg,#00d4ff,#0099bb);color:#000!important;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none}
  .divider{height:1px;background:rgba(255,255,255,.07);margin:28px 0}
  .small{font-size:12px;color:rgba(240,240,240,.35);line-height:1.6}
  .small a{color:#00d4ff;text-decoration:none}
  .footer{background:rgba(255,255,255,.02);padding:20px 36px;text-align:center;font-size:11px;color:rgba(240,240,240,.3)}
</style></head><body>
<div class="wrap"><div class="card">
  <div class="top-bar"></div>
  <div class="body">
    <div class="logo">{$siteName}</div>
    <h1>Welcome back, {$username}!</h1>
    <p>It's been a while since you last logged in to {$siteName}. For your security, please confirm it's you by clicking the button below.</p>
    <a href="{$verifyUrl}" class="btn">Yes, It's Me — Continue</a>
    <div class="divider"></div>
    <p class="small">This link expires in 1 hour. If you didn't try to log in, please <a href="{$verifyUrl}">change your password</a> immediately.</p>
  </div>
  <div class="footer">&copy; {$siteName}</div>
</div></div></body></html>
HTML;
    $plain = "Welcome back to {$siteName}\n\nHi {$username},\n\nPlease confirm it's you:\n{$verifyUrl}\n\nExpires in 1 hour.\n";
    return _sendMail($email, $subject, $html, $plain);
}

// ── Internal mail helper ──────────────────────────────────────────────────────
function _sendMail(string $to, string $subject, string $html, string $plain): bool {
    try {
        $fromEmail = '_mainaccount@infected.wtf';
        $fromName  = SITE_NAME;
        $boundary  = '----=_Boundary_' . md5(uniqid('', true));

        $headers  = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: multipart/alternative; boundary=\"$boundary\"\r\n";
        $headers .= "From: $fromName <$fromEmail>\r\n";
        $headers .= "Reply-To: $fromEmail\r\n";
        $headers .= "X-Mailer: PHP/" . PHP_VERSION . "\r\n";
        $headers .= "X-Priority: 1\r\n";

        $body  = "--$boundary\r\n";
        $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $body .= "Content-Transfer-Encoding: quoted-printable\r\n\r\n";
        $body .= quoted_printable_encode($plain) . "\r\n";
        $body .= "--$boundary\r\n";
        $body .= "Content-Type: text/html; charset=UTF-8\r\n";
        $body .= "Content-Transfer-Encoding: quoted-printable\r\n\r\n";
        $body .= quoted_printable_encode($html) . "\r\n";
        $body .= "--$boundary--";

        $result = mail($to, $subject, $body, $headers, "-f$fromEmail");
        if (!$result) error_log('[EMAIL ERROR] mail() returned false for: ' . $to);
        return (bool)$result;
    } catch (\Throwable $e) {
        error_log('[EMAIL ERROR] ' . get_class($e) . ': ' . $e->getMessage());
        return false;
    }
}




// ── General ───────────────────────────────────────────────────────────────────
function sanitize(string $str): string {
    return htmlspecialchars(strip_tags(trim($str)), ENT_QUOTES, 'UTF-8');
}
function validateUsername(string $u): bool {
    return (bool)preg_match('/^[a-zA-Z0-9_\-\.]{3,30}$/', $u);
}
function getProfile(PDO $pdo, int $uid): array|false {
    $s = $pdo->prepare("SELECT p.*, u.username, u.email, u.created_at, u.is_premium, u.premium_expires_at FROM profiles p JOIN users u ON p.user_id=u.id WHERE p.user_id=?");
    $s->execute([$uid]);
    $row = $s->fetch();
    if ($row) {
        if ($row['is_premium'] && $row['premium_expires_at'] && strtotime($row['premium_expires_at']) < time()) {
            $pdo->prepare("UPDATE users SET is_premium=0, premium_expires_at=NULL WHERE id=?")->execute([$uid]);
            $row['is_premium'] = 0; $row['premium_expires_at'] = null;
        }
    }
    return $row;
}
function getProfileByUsername(PDO $pdo, string $username): array|false {
    $s = $pdo->prepare("SELECT p.*, u.username, u.email, u.created_at, u.is_premium, u.premium_expires_at FROM profiles p JOIN users u ON p.user_id=u.id WHERE u.username=?");
    $s->execute([$username]);
    $row = $s->fetch();
    if ($row) {
        if ($row['is_premium'] && $row['premium_expires_at'] && strtotime($row['premium_expires_at']) < time()) {
            $pdo->prepare("UPDATE users SET is_premium=0, premium_expires_at=NULL WHERE id=?")->execute([(int)$row['user_id']]);
            $row['is_premium'] = 0; $row['premium_expires_at'] = null;
        }
    }
    return $row;
}
function getSocialLinks(PDO $pdo, int $uid): array {
    $s = $pdo->prepare("SELECT * FROM social_links WHERE user_id=? ORDER BY display_order ASC");
    $s->execute([$uid]); return $s->fetchAll();
}
function incrementViews(PDO $pdo, int $uid): void {
    $ip  = trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0')[0]);
    $hash  = hash('sha256', $ip . date('Y-m-d'));
    $today = date('Y-m-d');
    $ua    = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $device = 'desktop';
    if (preg_match('/tablet|ipad/i', $ua)) $device = 'tablet';
    elseif (preg_match('/mobile|android|iphone|ipod/i', $ua)) $device = 'mobile';
    $browser = 'Unknown';
    if (preg_match('/Edg\//i', $ua)) $browser = 'Edge';
    elseif (preg_match('/OPR\/|Opera/i', $ua)) $browser = 'Opera';
    elseif (preg_match('/SamsungBrowser/i', $ua)) $browser = 'Samsung';
    elseif (preg_match('/YaBrowser/i', $ua)) $browser = 'Yandex';
    elseif (preg_match('/Brave/i', $ua)) $browser = 'Brave';
    elseif (preg_match('/Firefox\/|FxiOS\//i', $ua)) $browser = 'Firefox';
    elseif (preg_match('/CriOS\/|Chrome\//i', $ua)) $browser = 'Chrome';
    elseif (preg_match('/Safari\//i', $ua)) $browser = 'Safari';
    $osName = 'Unknown';
    if (preg_match('/Windows NT 10/i', $ua)) $osName = 'Windows 10/11';
    elseif (preg_match('/Windows NT 6\.3/i', $ua)) $osName = 'Windows 8.1';
    elseif (preg_match('/Windows NT 6\.1/i', $ua)) $osName = 'Windows 7';
    elseif (preg_match('/Windows/i', $ua)) $osName = 'Windows';
    elseif (preg_match('/iPhone|iPad/i', $ua)) $osName = 'iOS';
    elseif (preg_match('/Android/i', $ua)) $osName = 'Android';
    elseif (preg_match('/Mac OS X/i', $ua)) $osName = 'macOS';
    elseif (preg_match('/Linux/i', $ua)) $osName = 'Linux';
    $countryCode = 'XX'; $countryName = 'Unknown';
    $ccMap = ['AF'=>'Afghanistan','AL'=>'Albania','DZ'=>'Algeria','AD'=>'Andorra','AO'=>'Angola','AG'=>'Antigua and Barbuda','AR'=>'Argentina','AM'=>'Armenia','AU'=>'Australia','AT'=>'Austria','AZ'=>'Azerbaijan','BS'=>'Bahamas','BH'=>'Bahrain','BD'=>'Bangladesh','BB'=>'Barbados','BY'=>'Belarus','BE'=>'Belgium','BZ'=>'Belize','BJ'=>'Benin','BT'=>'Bhutan','BO'=>'Bolivia','BA'=>'Bosnia and Herzegovina','BW'=>'Botswana','BR'=>'Brazil','BN'=>'Brunei','BG'=>'Bulgaria','BF'=>'Burkina Faso','BI'=>'Burundi','CV'=>'Cabo Verde','KH'=>'Cambodia','CM'=>'Cameroon','CA'=>'Canada','CF'=>'Central African Republic','TD'=>'Chad','CL'=>'Chile','CN'=>'China','CO'=>'Colombia','KM'=>'Comoros','CG'=>'Congo','CR'=>'Costa Rica','HR'=>'Croatia','CU'=>'Cuba','CY'=>'Cyprus','CZ'=>'Czech Republic','DK'=>'Denmark','DJ'=>'Djibouti','DM'=>'Dominica','DO'=>'Dominican Republic','EC'=>'Ecuador','EG'=>'Egypt','SV'=>'El Salvador','GQ'=>'Equatorial Guinea','ER'=>'Eritrea','EE'=>'Estonia','SZ'=>'Eswatini','ET'=>'Ethiopia','FJ'=>'Fiji','FI'=>'Finland','FR'=>'France','GA'=>'Gabon','GM'=>'Gambia','GE'=>'Georgia','DE'=>'Germany','GH'=>'Ghana','GR'=>'Greece','GD'=>'Grenada','GT'=>'Guatemala','GN'=>'Guinea','GW'=>'Guinea-Bissau','GY'=>'Guyana','HT'=>'Haiti','HN'=>'Honduras','HU'=>'Hungary','IS'=>'Iceland','IN'=>'India','ID'=>'Indonesia','IR'=>'Iran','IQ'=>'Iraq','IE'=>'Ireland','IL'=>'Israel','IT'=>'Italy','JM'=>'Jamaica','JP'=>'Japan','JO'=>'Jordan','KZ'=>'Kazakhstan','KE'=>'Kenya','KI'=>'Kiribati','KW'=>'Kuwait','KG'=>'Kyrgyzstan','LA'=>'Laos','LV'=>'Latvia','LB'=>'Lebanon','LS'=>'Lesotho','LR'=>'Liberia','LY'=>'Libya','LI'=>'Liechtenstein','LT'=>'Lithuania','LU'=>'Luxembourg','MG'=>'Madagascar','MW'=>'Malawi','MY'=>'Malaysia','MV'=>'Maldives','ML'=>'Mali','MT'=>'Malta','MH'=>'Marshall Islands','MR'=>'Mauritania','MU'=>'Mauritius','MX'=>'Mexico','FM'=>'Micronesia','MD'=>'Moldova','MC'=>'Monaco','MN'=>'Mongolia','ME'=>'Montenegro','MA'=>'Morocco','MZ'=>'Mozambique','MM'=>'Myanmar','NA'=>'Namibia','NR'=>'Nauru','NP'=>'Nepal','NL'=>'Netherlands','NZ'=>'New Zealand','NI'=>'Nicaragua','NE'=>'Niger','NG'=>'Nigeria','NO'=>'Norway','OM'=>'Oman','PK'=>'Pakistan','PW'=>'Palau','PA'=>'Panama','PG'=>'Papua New Guinea','PY'=>'Paraguay','PE'=>'Peru','PH'=>'Philippines','PL'=>'Poland','PT'=>'Portugal','QA'=>'Qatar','RO'=>'Romania','RU'=>'Russia','RW'=>'Rwanda','KN'=>'Saint Kitts and Nevis','LC'=>'Saint Lucia','VC'=>'Saint Vincent and the Grenadines','WS'=>'Samoa','SM'=>'San Marino','ST'=>'Sao Tome and Principe','SA'=>'Saudi Arabia','SN'=>'Senegal','RS'=>'Serbia','SC'=>'Seychelles','SL'=>'Sierra Leone','SG'=>'Singapore','SK'=>'Slovakia','SI'=>'Slovenia','SB'=>'Solomon Islands','SO'=>'Somalia','ZA'=>'South Africa','SS'=>'South Sudan','ES'=>'Spain','LK'=>'Sri Lanka','SD'=>'Sudan','SR'=>'Suriname','SE'=>'Sweden','CH'=>'Switzerland','SY'=>'Syria','TW'=>'Taiwan','TJ'=>'Tajikistan','TZ'=>'Tanzania','TH'=>'Thailand','TL'=>'Timor-Leste','TG'=>'Togo','TO'=>'Tonga','TT'=>'Trinidad and Tobago','TN'=>'Tunisia','TR'=>'Turkey','TM'=>'Turkmenistan','TV'=>'Tuvalu','UG'=>'Uganda','UA'=>'Ukraine','AE'=>'United Arab Emirates','GB'=>'United Kingdom','US'=>'United States','UY'=>'Uruguay','UZ'=>'Uzbekistan','VU'=>'Vanuatu','VE'=>'Venezuela','VN'=>'Vietnam','YE'=>'Yemen','ZM'=>'Zambia','ZW'=>'Zimbabwe'];
    if (!empty($_SERVER['HTTP_CF_IPCOUNTRY'])) {
        $countryCode = strtoupper(substr($_SERVER['HTTP_CF_IPCOUNTRY'], 0, 2));
        $countryName = $ccMap[$countryCode] ?? 'Unknown';
    } elseif (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
        $ctx = stream_context_create(['http' => ['timeout' => 0.5, 'ignore_errors' => true]]);
        $res = @file_get_contents("http://ip-api.com/json/{$ip}?fields=countryCode,country", false, $ctx);
        if ($res) { $d = json_decode($res, true); if (!empty($d['countryCode'])) { $countryCode = $d['countryCode']; $countryName = $d['country']; } }
    }
    try {
        $s = $pdo->prepare("INSERT IGNORE INTO views_log (profile_user_id,ip_hash,device_type,country_code,country_name,browser,os_name,viewed_at) VALUES (?,?,?,?,?,?,?,?)");
        $s->execute([$uid, $hash, $device, $countryCode, $countryName, $browser, $osName, $today]);
        if ($s->rowCount() > 0) {
            $pdo->prepare("UPDATE profiles SET views=views+1 WHERE user_id=?")->execute([$uid]);

            // Dacă vizitatorul e din aceeași țară cu regiunea setată de user → incrementează local_views
            if ($countryCode !== 'XX') {
                $regRow = $pdo->prepare("SELECT leaderboard_region_code FROM users WHERE id=?");
                $regRow->execute([$uid]);
                $userRegion = $regRow->fetchColumn();
                if ($userRegion && strtoupper($userRegion) === strtoupper($countryCode)) {
                    $pdo->prepare("UPDATE profiles SET local_views = COALESCE(local_views, 0) + 1 WHERE user_id=?")->execute([$uid]);
                }
            }
            // Auto-grant Hall of Fame at 1000 views
            $vRow = $pdo->prepare("SELECT views FROM profiles WHERE user_id=?");
            $vRow->execute([$uid]);
            $cv = (int)($vRow->fetchColumn() ?? 0);
            if ($cv >= 1000) setBadge($pdo, $uid, 'hall_of_fame', true);
            if ($cv >= 10000) setBadge($pdo, $uid, 'champion', true);

            // ── Notify user every 5 unique views ────────────────────────
            if ($cv > 0 && $cv % 5 === 0) {
                pushNotification($pdo, $uid, 'view',
                    "Your profile got new views! 👁",
                    "You now have {$cv} total profile views. Keep growing!",
                    'eye', '/dashboard/analytics'
                );
            }

            $premRow = $pdo->prepare("SELECT is_premium, premium_expires_at FROM users WHERE id=?");
            $premRow->execute([$uid]);
            $pr = $premRow->fetch();
            $isPremium = $pr && (int)$pr['is_premium'] === 1 && ($pr['premium_expires_at'] === null || strtotime($pr['premium_expires_at']) > time());
            $viewTokens = $isPremium ? 5 : 3;
            // Check x2 tokens event
            $x2SettRow = $pdo->query("SELECT x2_tokens_enabled FROM site_settings LIMIT 1")->fetch();
            if (!empty($x2SettRow['x2_tokens_enabled'])) $viewTokens *= 2;
            $pdo->prepare("UPDATE users SET tokens=tokens+? WHERE id=?")->execute([$viewTokens, $uid]);
        }
    } catch(Exception $e) {}
}
function getPlatformIcon(string $p): string {
    $i = [
        'steam'=>'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z"/></svg>',
        'spotify'=>'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>',
        'discord'=>'<svg viewBox="0 0 127.14 96.36" fill="currentColor"><path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"/></svg>',
        'instagram'=>'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>',
        'twitter'=>'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
        'youtube'=>'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
        'twitch'=>'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>',
        'github'=>'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
        'tiktok'=>'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
        'website'=>'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>',
    ];
    return $i[$p] ?? $i['website'];
}
function getPlatformColor(string $p): string {
    $c = ['steam'=>'#1b2838','spotify'=>'#1DB954','discord'=>'#5865F2','instagram'=>'#E1306C',
          'twitter'=>'#000000','youtube'=>'#FF0000','twitch'=>'#9146FF','github'=>'#333333',
          'tiktok'=>'#010101','website'=>'#555555'];
    return $c[$p] ?? '#555555';
}

// ── Auto-migrate badge_hidden and badge_order columns ──────────────────────────
function ensureBadgeColumns(PDO $pdo): void {
    static $done = false;
    if ($done) return;
    try {
        $cols = $pdo->query("SHOW COLUMNS FROM profiles")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('badge_hidden', $cols)) $pdo->exec("ALTER TABLE profiles ADD COLUMN badge_hidden JSON DEFAULT NULL");
        if (!in_array('badge_order',  $cols)) $pdo->exec("ALTER TABLE profiles ADD COLUMN badge_order  JSON DEFAULT NULL");
    } catch(Exception $e) {}
    $done = true;
}

// Returns all earned badges for a user (for dashboard — includes hidden flag, excludes admin-role badges)
function getUserBadges(PDO $pdo, int $userId, bool $applyVisibility = false): array {
    ensureBadgeColumns($pdo);
    $badges = [];

    $s = $pdo->prepare("
        SELECT u.id, u.is_owner, u.is_admin,
               COALESCE(p.badges, '[]')       AS badges_json,
               COALESCE(p.badge_hidden, '[]') AS badge_hidden_json,
               COALESCE(p.badge_order,  '[]') AS badge_order_json,
               COALESCE(p.views, 0)           AS views
        FROM users u
        LEFT JOIN profiles p ON p.user_id = u.id
        WHERE u.id = ?
    ");
    $s->execute([$userId]);
    $user = $s->fetch();
    if (!$user) return [];

    $manualBadges = json_decode($user['badges_json'],      true) ?: [];
    $manualSet    = array_flip($manualBadges);
    $hiddenSet    = array_flip(json_decode($user['badge_hidden_json'], true) ?: []);
    $orderList    = json_decode($user['badge_order_json'], true) ?: [];

    // Verified
    if (isset($manualSet['verified'])) $badges[] = ['id'=>'verified','label'=>'Verified','title'=>'Verified'];
    // OG
    $s2 = $pdo->prepare("SELECT COUNT(*) FROM users WHERE id <= ?");
    $s2->execute([$userId]);
    if ((int)$s2->fetchColumn() <= 1000) $badges[] = ['id'=>'og','label'=>'OG','title'=>'OG'];
    // Views Master
    $s3  = $pdo->query("SELECT user_id FROM profiles ORDER BY views DESC LIMIT 3");
    $top3 = array_column($s3->fetchAll(), 'user_id');
    if (in_array((string)$userId, array_map('strval', $top3))) $badges[] = ['id'=>'views_master','label'=>'Views Master','title'=>'Views Master'];
    // Hall of Fame (auto at 1k views — cannot be granted from admin)
    if ((int)$user['views'] >= 1000) $badges[] = ['id'=>'hall_of_fame','label'=>'Hall of Fame','title'=>'Hall of Fame'];
    // Champion (10k views OR admin-granted)
    if ((int)$user['views'] >= 10000 || isset($manualSet['champion'])) $badges[] = ['id'=>'champion','label'=>'Champion','title'=>'Champion'];
    // Shop badges (including lover and fresh)
    foreach (['known'=>'Known','rich'=>'Rich','trapstar'=>'Trapstar','the_killer'=>'The Killer','lover'=>'Lover','fresh'=>'Fresh'] as $bid=>$lbl) {
        if (isset($manualSet[$bid])) $badges[] = ['id'=>$bid,'label'=>$lbl,'title'=>$lbl];
    }

    // Admin-granted badges (crew, billionaire, content_creator, designer)
    foreach (['crew'=>'Crew','billionaire'=>'Billionaire','content_creator'=>'Content Creator','designer'=>'Designer'] as $bid=>$lbl) {
        if (isset($manualSet[$bid])) $badges[] = ['id'=>$bid,'label'=>$lbl,'title'=>$lbl];
    }

    // Promoter badges — based on referral count
    $refCount = (int)$pdo->query("SELECT COUNT(*) FROM referrals WHERE referrer_id={$userId}")->fetchColumn();
    if ($refCount >= 20) {
        // Elite replaces regular promoter
        $badges[] = ['id'=>'promoter_elite','label'=>'Promoter Elite','title'=>'Promoter Elite'];
    } elseif ($refCount >= 10) {
        $badges[] = ['id'=>'promoter','label'=>'Promoter','title'=>'Promoter'];
    }

    // Attach hidden flag for dashboard
    foreach ($badges as &$b) $b['hidden'] = isset($hiddenSet[$b['id']]);
    unset($b);

    if ($applyVisibility) {
        // Filter hidden
        $badges = array_values(array_filter($badges, fn($b) => !isset($hiddenSet[$b['id']])));
        // Apply custom order
        if (!empty($orderList)) {
            $ordered = [];
            foreach ($orderList as $bid) foreach ($badges as $b) if ($b['id']===$bid) { $ordered[]=$b; break; }
            foreach ($badges as $b) if (!in_array($b['id'], $orderList)) $ordered[] = $b;
            $badges = $ordered;
        }
    }

    return $badges;
}

// Badges shown on public profile (includes owner/admin/premium role badges, respects hidden/order)
function getProfileBadges(PDO $pdo, int $userId): array {
    ensureBadgeColumns($pdo);
    $s = $pdo->prepare("
        SELECT u.is_owner, u.is_admin, u.is_premium, u.premium_expires_at,
               COALESCE(p.badge_hidden,'[]') AS badge_hidden_json,
               COALESCE(p.badge_order,'[]')  AS badge_order_json
        FROM users u LEFT JOIN profiles p ON p.user_id=u.id WHERE u.id=?
    ");
    $s->execute([$userId]);
    $user = $s->fetch();
    $hiddenSet = array_flip(json_decode($user['badge_hidden_json'] ?? '[]', true) ?: []);
    $orderList = json_decode($user['badge_order_json'] ?? '[]', true) ?: [];

    // ── Build pool of all earned, visible badges ──
    // Start with user-earned badges (applyVisibility=false — we handle hidden ourselves)
    $userBadges = getUserBadges($pdo, $userId, false);

    // Remove hidden badges
    $userBadges = array_values(array_filter($userBadges, fn($b) => !isset($hiddenSet[$b['id']])));

    // Strip the 'hidden' flag key (not needed on public profile)
    $userBadges = array_map(fn($b) => ['id'=>$b['id'],'label'=>$b['label'],'title'=>$b['title']], $userBadges);

    // ── Add role badges (owner / admin) if earned and not hidden ──
    if (!empty($user['is_owner']) && !isset($hiddenSet['owner']))
        $userBadges[] = ['id'=>'owner','label'=>'Owner','title'=>'Owner'];
    if (!empty($user['is_admin']) && !isset($hiddenSet['admin']))
        $userBadges[] = ['id'=>'admin','label'=>'Admin','title'=>'Admin'];

    // ── Add premium badge if active and not hidden ──
    $isPrem = !empty($user['is_premium']) &&
              ($user['premium_expires_at'] === null || strtotime($user['premium_expires_at']) > time());
    if ($isPrem && !isset($hiddenSet['premium']))
        $userBadges[] = ['id'=>'premium','label'=>'Premium','title'=>'Premium'];

    // ── Add discord badge daca userul are integrare Discord si nu e ascuns ──
    try {
        $discordStmt = $pdo->prepare("SELECT 1 FROM integrations WHERE user_id=? AND type='discord' LIMIT 1");
        $discordStmt->execute([$userId]);
        if ($discordStmt->fetchColumn() && !isset($hiddenSet['discord']))
            $userBadges[] = ['id'=>'discord','label'=>'Discord','title'=>'Discord'];
    } catch (\Exception $_) {}

    // ── Add booster badge daca userul are badge-ul in profiles.badges JSON si nu e ascuns ──
    try {
        $boosterStmt = $pdo->prepare("SELECT COALESCE(badges,'[]') FROM profiles WHERE user_id=?");
        $boosterStmt->execute([$userId]);
        $boosterBadges = json_decode($boosterStmt->fetchColumn() ?: '[]', true) ?: [];
        if (in_array('booster', $boosterBadges) && !isset($hiddenSet['booster']))
            $userBadges[] = ['id'=>'booster','label'=>'Booster','title'=>'Server Booster'];
    } catch (\Exception $_) {}

    // ── Apply full custom order (all badge types included) ──
    if (!empty($orderList)) {
        $ordered = [];
        // First: badges that appear in the saved order list, in that order
        foreach ($orderList as $bid)
            foreach ($userBadges as $b)
                if ($b['id'] === $bid) { $ordered[] = $b; break; }
        // Then: any earned badges not yet in the order list (newly earned)
        foreach ($userBadges as $b)
            if (!in_array($b['id'], $orderList)) $ordered[] = $b;
        return $ordered;
    }

    return $userBadges;
}

// Add or remove a badge from profiles.badges JSON column
function setBadge(PDO $pdo, int $userId, string $badgeId, bool $grant): void {
    ensureBadgeColumns($pdo);
    $s = $pdo->prepare("SELECT COALESCE(badges, '[]') FROM profiles WHERE user_id=?");
    $s->execute([$userId]);
    $current = json_decode($s->fetchColumn() ?: '[]', true) ?: [];
    if ($grant) { if (!in_array($badgeId, $current)) $current[] = $badgeId; }
    else        $current = array_values(array_filter($current, fn($b) => $b !== $badgeId));
    $pdo->prepare("UPDATE profiles SET badges=? WHERE user_id=?")->execute([json_encode($current), $userId]);
}

// Toggle badge visibility on profile
function setBadgeHidden(PDO $pdo, int $userId, string $badgeId, bool $hidden): void {
    ensureBadgeColumns($pdo);
    $s = $pdo->prepare("SELECT COALESCE(badge_hidden,'[]') FROM profiles WHERE user_id=?");
    $s->execute([$userId]);
    $current = json_decode($s->fetchColumn() ?: '[]', true) ?: [];
    if ($hidden) { if (!in_array($badgeId, $current)) $current[] = $badgeId; }
    else         $current = array_values(array_filter($current, fn($b) => $b !== $badgeId));
    $pdo->prepare("UPDATE profiles SET badge_hidden=? WHERE user_id=?")->execute([json_encode($current), $userId]);
}

// Save badge display order
function saveBadgeOrder(PDO $pdo, int $userId, array $order): void {
    ensureBadgeColumns($pdo);
    $pdo->prepare("UPDATE profiles SET badge_order=? WHERE user_id=?")->execute([json_encode(array_values($order)), $userId]);
}

function getUserTokens(PDO $pdo, int $userId): int {
    $s = $pdo->prepare("SELECT tokens FROM users WHERE id=?");
    $s->execute([$userId]);
    return (int)($s->fetchColumn() ?? 0);
}

// ── New login location email ──────────────────────────────────────────────────
function sendNewLoginEmail(PDO $pdo, int $userId, string $email, string $username, string $browser, string $deviceType, string $ip): bool {
    $siteName  = SITE_NAME;
    $siteUrl   = rtrim(SITE_URL, '/');
    $time      = date('D, d M Y H:i') . ' UTC';
    $device    = ucfirst($deviceType);
    $ipMasked  = substr($ip, 0, strrpos($ip, '.') ?: strlen($ip)) . '.*';
    $subject   = "New login detected — {$siteName}";

    // Try to get country from Cloudflare header (free, no API needed)
    $country = $_SERVER['HTTP_CF_IPCOUNTRY'] ?? 'Unknown';

    $settingsUrl = $siteUrl . '/dashboard/settings';

    $html = <<<HTML
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  body{margin:0;padding:0;background:#050507;font-family:'Segoe UI',Arial,sans-serif;color:#f0f0f0}
  .wrap{max-width:480px;margin:40px auto;padding:0 16px}
  .card{background:linear-gradient(160deg,#0a0a16,#0d0d20);border:1px solid rgba(255,255,255,.1);border-radius:20px;overflow:hidden}
  .top-bar{height:3px;background:linear-gradient(90deg,#f59e0b,#ef4444)}
  .body{padding:40px 36px}
  .logo{font-size:13px;font-weight:800;letter-spacing:.12em;color:#f59e0b;margin-bottom:32px;text-transform:uppercase}
  h1{font-size:22px;font-weight:700;margin:0 0 10px;color:#fff}
  p{font-size:14px;line-height:1.7;color:rgba(240,240,240,.65);margin:0 0 20px}
  .info-box{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:16px 20px;margin-bottom:24px}
  .info-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:13px}
  .info-row:last-child{border-bottom:none}
  .info-label{color:rgba(240,240,240,.4);font-size:12px;text-transform:uppercase;letter-spacing:.06em}
  .info-val{color:#fff;font-weight:600}
  .btn-warn{display:inline-block;background:linear-gradient(135deg,#ef4444,#b91c1c);color:#fff!important;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;margin-right:10px}
  .btn-ok{display:inline-block;background:rgba(255,255,255,.08);color:rgba(240,240,240,.7)!important;font-weight:600;font-size:13px;padding:12px 20px;border-radius:10px;text-decoration:none}
  .divider{height:1px;background:rgba(255,255,255,.07);margin:28px 0}
  .small{font-size:12px;color:rgba(240,240,240,.35);line-height:1.6}
  .footer{background:rgba(255,255,255,.02);padding:20px 36px;text-align:center;font-size:11px;color:rgba(240,240,240,.3)}
</style></head><body>
<div class="wrap"><div class="card">
  <div class="top-bar"></div>
  <div class="body">
    <div class="logo">{$siteName}</div>
    <h1>New login detected</h1>
    <p>Hey <strong style="color:#fff">{$username}</strong>, we noticed a login to your account from a new device or location.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Time</span><span class="info-val">{$time}</span></div>
      <div class="info-row"><span class="info-label">Browser</span><span class="info-val">{$browser}</span></div>
      <div class="info-row"><span class="info-label">Device</span><span class="info-val">{$device}</span></div>
      <div class="info-row"><span class="info-label">IP</span><span class="info-val">{$ipMasked}</span></div>
      <div class="info-row"><span class="info-label">Country</span><span class="info-val">{$country}</span></div>
    </div>
    <p>If this was you, no action needed. If you don't recognize this login, secure your account immediately.</p>
    <a href="{$settingsUrl}" class="btn-warn">Secure My Account</a>
    <a href="{$settingsUrl}#notifications" class="btn-ok">Turn off alerts</a>
    <div class="divider"></div>
    <p class="small">You're receiving this because login notifications are enabled for your account.<br>You can disable them in <a href="{$settingsUrl}#notifications" style="color:#f59e0b;text-decoration:none">Settings → Notifications</a>.</p>
  </div>
  <div class="footer">&copy; {$siteName} · All rights reserved</div>
</div></div></body></html>
HTML;

    $plain = "New login detected on {$siteName}\n\n"
           . "Hi {$username},\n\n"
           . "A new login was detected on your account.\n\n"
           . "Time: {$time}\n"
           . "Browser: {$browser}\n"
           . "Device: {$device}\n"
           . "IP: {$ipMasked}\n"
           . "Country: {$country}\n\n"
           . "If this wasn't you, secure your account at: {$settingsUrl}\n";

    return _sendMail($email, $subject, $html, $plain);
}
// ── Notification helpers ───────────────────────────────────────────────────

/**
 * Push a notification to a user.
 * Auto-creates the notifications table if it doesn't exist.
 */
function pushNotification(PDO $pdo, int $userId, string $type, string $title, string $body = '', string $icon = 'bell', string $link = ''): void {
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `notifications` (
                `id`         INT AUTO_INCREMENT PRIMARY KEY,
                `user_id`    INT NOT NULL,
                `type`       VARCHAR(50)  NOT NULL,
                `title`      VARCHAR(200) NOT NULL,
                `body`       VARCHAR(500) DEFAULT NULL,
                `icon`       VARCHAR(50)  DEFAULT 'bell',
                `link`       VARCHAR(300) DEFAULT NULL,
                `is_read`    TINYINT(1)   NOT NULL DEFAULT 0,
                `created_at` DATETIME     DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_user_unread` (`user_id`, `is_read`),
                FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
        $stmt = $pdo->prepare("INSERT INTO notifications (user_id, type, title, body, icon, link) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $type, $title, $body, $icon, $link]);
    } catch (Throwable $e) {
        // Fail silently — notifications are non-critical
    }
}

/**
 * Get unread notification count for a user.
 */
function getUnreadNotifCount(PDO $pdo, int $userId): int {
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM notifications WHERE user_id=? AND is_read=0");
        $stmt->execute([$userId]);
        return (int)$stmt->fetchColumn();
    } catch (Throwable $e) {
        return 0;
    }
}