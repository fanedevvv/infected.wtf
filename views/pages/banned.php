<?php
// Grab ban info BEFORE destroying session (if still logged in via direct visit)
$banUntil   = null;
$isPermanent = true;

if (isset($_GET['u'])) {
    $raw = $_GET['u'];
    if ($raw !== 'permanent') {
        $banUntil    = $raw; // e.g. "2026-05-20 14:00:00"
        $isPermanent = false;
    }
}

// Calculate days remaining
$daysLeft = null;
if (!$isPermanent && $banUntil) {
    $diff = (strtotime($banUntil) - time());
    $daysLeft = max(0, (int)ceil($diff / 86400));
    if ($daysLeft === 0 && $diff > 0) $daysLeft = 1; // show at least 1 if still active
}

if (isset($_SESSION['user_id'])) { session_destroy(); }
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Suspended &mdash; <?= defined('SITE_NAME') ? htmlspecialchars(SITE_NAME) : 'BioLink' ?></title>
<link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #050507;
    font-family: 'Syne', sans-serif;
    overflow: hidden;
    color: #fff;
  }

  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 20% 40%, rgba(239,68,68,.10) 0%, transparent 60%),
      radial-gradient(ellipse 60% 80% at 80% 70%, rgba(255,100,0,.07) 0%, transparent 60%);
    animation: bgPulse 8s ease-in-out infinite alternate;
    pointer-events: none;
    z-index: 0;
  }
  @keyframes bgPulse {
    from { opacity: .5; }
    to   { opacity: 1; }
  }

  .particles {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }
  .particle {
    position: absolute;
    border-radius: 50%;
    background: linear-gradient(135deg, #ef4444, #ff6b00);
    opacity: 0;
    animation: floatUp var(--dur, 6s) ease-in var(--delay, 0s) infinite;
  }
  @keyframes floatUp {
    0%   { transform: translateY(100vh) scale(0); opacity: 0; }
    10%  { opacity: .4; }
    90%  { opacity: .15; }
    100% { transform: translateY(-10vh) scale(1); opacity: 0; }
  }

  .card {
    position: relative;
    z-index: 1;
    background: linear-gradient(160deg, rgba(10,10,22,.96) 0%, rgba(13,13,32,.96) 100%);
    border: 1px solid rgba(239,68,68,.2);
    border-radius: 28px;
    padding: 60px 56px 52px;
    text-align: center;
    max-width: 480px;
    width: 90%;
    box-shadow: 0 0 80px rgba(239,68,68,.07), 0 40px 80px rgba(0,0,0,.5);
    animation: cardIn .7s cubic-bezier(.16,1,.3,1) both;
  }
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(30px) scale(.96); }
    to   { opacity: 1; transform: none; }
  }

  .card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    border-radius: 28px 28px 0 0;
    background: linear-gradient(90deg, #ef4444, #ff6b00, #ef4444);
    background-size: 200% 100%;
    animation: shimmer 3s linear infinite;
  }
  @keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .icon-wrap {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(239,68,68,.15), rgba(255,107,0,.12));
    border: 1px solid rgba(239,68,68,.25);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 28px;
    animation: iconPulse 2.5s ease-in-out infinite;
  }
  @keyframes iconPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,.15); }
    50%       { box-shadow: 0 0 0 14px rgba(239,68,68,.0); }
  }
  .icon-wrap svg { width: 36px; height: 36px; }

  h1 {
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -.01em;
    background: linear-gradient(135deg, #fff 30%, rgba(255,255,255,.5));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 12px;
  }

  .subtitle {
    font-size: .93rem;
    color: rgba(255,255,255,.42);
    line-height: 1.65;
    margin-bottom: 28px;
  }

  /* Ban duration pill */
  .ban-pill {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 11px 22px;
    border-radius: 50px;
    margin-bottom: 28px;
    font-size: .85rem;
    font-weight: 700;
    letter-spacing: .02em;
  }
  .ban-pill.permanent {
    background: rgba(239,68,68,.1);
    border: 1px solid rgba(239,68,68,.25);
    color: #ff8080;
  }
  .ban-pill.temporary {
    background: rgba(251,146,60,.08);
    border: 1px solid rgba(251,146,60,.22);
    color: #fb923c;
  }
  .ban-pill svg { flex-shrink: 0; }

  .actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .btn-action {
    display: inline-flex;
    align-items: center;
    gap: .45rem;
    padding: 11px 24px;
    border-radius: 12px;
    font-family: 'Syne', sans-serif;
    font-size: .84rem;
    font-weight: 700;
    text-decoration: none;
    transition: all .2s;
    border: 1px solid;
  }
  .btn-primary {
    background: rgba(239,68,68,.12);
    color: #ff8080;
    border-color: rgba(239,68,68,.28);
  }
  .btn-primary:hover {
    background: rgba(239,68,68,.22);
    border-color: rgba(239,68,68,.45);
    color: #ffaaaa;
  }
  .btn-ghost {
    background: rgba(255,255,255,.04);
    color: rgba(255,255,255,.4);
    border-color: rgba(255,255,255,.08);
  }
  .btn-ghost:hover {
    background: rgba(255,255,255,.08);
    color: rgba(255,255,255,.65);
    border-color: rgba(255,255,255,.15);
  }

  .info-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: 24px;
    padding: 9px 18px;
    border-radius: 50px;
    background: rgba(239,68,68,.06);
    border: 1px solid rgba(239,68,68,.12);
    font-size: .77rem;
    color: rgba(255,255,255,.3);
  }
  .info-badge svg { flex-shrink: 0; color: rgba(239,68,68,.5); }
</style>
</head>
<body>

<div class="particles" aria-hidden="true">
<?php
$sizes  = [4,5,6,4,5,3,6,4,5,4,3,5];
$delays = [0,.5,1,1.5,2,2.5,3,3.5,4,4.5,5,0.2];
$durs   = [7,6,8,9,6,7,8,6,9,7,8,6];
$lefts  = [5,12,22,35,48,57,65,72,80,88,93,15];
for ($i = 0; $i < 12; $i++):
    $s = $sizes[$i]; $d = $delays[$i]; $dur = $durs[$i]; $l = $lefts[$i];
?>
  <div class="particle" style="width:<?=$s?>px;height:<?=$s?>px;left:<?=$l?>%;--delay:<?=$d?>s;--dur:<?=$dur?>s"></div>
<?php endfor; ?>
</div>

<div class="card">

  <div class="icon-wrap">
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="13" stroke="url(#rb1)" stroke-width="2.2" fill="none"/>
      <line x1="8.5" y1="8.5" x2="27.5" y2="27.5" stroke="url(#rb2)" stroke-width="2.4" stroke-linecap="round"/>
      <defs>
        <linearGradient id="rb1" x1="5" y1="5" x2="31" y2="31" gradientUnits="userSpaceOnUse">
          <stop stop-color="#ef4444"/><stop offset="1" stop-color="#ff6b00"/>
        </linearGradient>
        <linearGradient id="rb2" x1="5" y1="5" x2="31" y2="31" gradientUnits="userSpaceOnUse">
          <stop stop-color="#ef4444"/><stop offset="1" stop-color="#ff6b00"/>
        </linearGradient>
      </defs>
    </svg>
  </div>

  <h1>Account Suspended</h1>

  <p class="subtitle">
    Your account has been suspended by an administrator.<br>
    If you believe this is a mistake, please contact the staff.
  </p>

  <?php if ($isPermanent): ?>
  <div class="ban-pill permanent">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
      <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>
    Permanent ban
  </div>
  <?php elseif ($daysLeft !== null): ?>
  <div class="ban-pill temporary">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
    <?php if ($daysLeft === 1): ?>
      Expires today
    <?php elseif ($daysLeft <= 7): ?>
      <?= $daysLeft ?> day<?= $daysLeft > 1 ? 's' : '' ?> remaining
    <?php else: ?>
      <?= $daysLeft ?> days remaining &mdash; until <?= date('M j, Y', strtotime($banUntil)) ?>
    <?php endif; ?>
  </div>
  <?php endif; ?>

  <div class="actions">
    <a href="/login" class="btn-action btn-primary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
        <polyline points="10 17 15 12 10 7"/>
        <line x1="15" y1="12" x2="3" y2="12"/>
      </svg>
      Back to Login
    </a>
    <a href="/" class="btn-action btn-ghost">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
      Home
    </a>
  </div>

  <div class="info-badge">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    Contact an administrator to appeal this decision
  </div>

</div>
<script>
<?php
// Pass the user ID securely to JS for polling
// We stored it in GET param or session before destroying it
$pollUid = 0;
if (isset($_GET['uid']) && ctype_digit($_GET['uid'])) {
    $pollUid = (int)$_GET['uid'];
}
?>
var POLL_UID = <?= (int)$pollUid ?>;
var IS_PERMANENT = <?= $isPermanent ? 'true' : 'false' ?>;

function checkBan() {
  if (!POLL_UID) return;
  fetch('/api/ban_status.php?uid=' + POLL_UID, { cache: 'no-store' })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && data.banned === false) {
        window.location.href = '/';
      }
    })
    .catch(function() {});
}

// Check on page load (refresh case)
checkBan();
// For temp bans, keep polling every 15s; permanent bans still poll (in case admin unbans)
setInterval(checkBan, 15000);
</script>
</body>
</html>