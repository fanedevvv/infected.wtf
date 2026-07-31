<?php
// If for some reason a staff member lands here directly, send them home
if (isLoggedIn() && isStaff($pdo)) {
    header('Location: /'); exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Maintenance — <?= defined('SITE_NAME') ? htmlspecialchars(SITE_NAME) : 'BioLink' ?></title>
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

  /* Animated gradient background */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 20% 40%, rgba(0,212,255,.12) 0%, transparent 60%),
      radial-gradient(ellipse 60% 80% at 80% 70%, rgba(255,0,255,.10) 0%, transparent 60%);
    animation: bgPulse 8s ease-in-out infinite alternate;
    pointer-events: none;
    z-index: 0;
  }
  @keyframes bgPulse {
    from { opacity: .6; }
    to   { opacity: 1; }
  }

  /* Floating particles */
  .particles {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }
  .particle {
    position: absolute;
    border-radius: 50%;
    background: linear-gradient(135deg, #00d4ff, #ff00ff);
    opacity: 0;
    animation: floatUp var(--dur, 6s) ease-in var(--delay, 0s) infinite;
  }
  @keyframes floatUp {
    0%   { transform: translateY(100vh) scale(0); opacity: 0; }
    10%  { opacity: .5; }
    90%  { opacity: .2; }
    100% { transform: translateY(-10vh) scale(1); opacity: 0; }
  }

  /* Card wrapper with animated gradient border */
  .card-outer {
    position: relative;
    z-index: 1;
    border-radius: 28px;
    padding: 2px; /* thickness of the border */
    background: linear-gradient(120deg, #00d4ff, #ff00ff, #00d4ff, #ff00ff);
    background-size: 300% 300%;
    animation: borderMove 4s linear infinite, cardIn .7s cubic-bezier(.16,1,.3,1) both;
    max-width: 480px;
    width: 90%;
    box-shadow: 0 0 60px rgba(0,212,255,.15), 0 0 120px rgba(255,0,255,.08), 0 40px 80px rgba(0,0,0,.5);
  }
  @keyframes borderMove {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(30px) scale(.96); }
    to   { opacity: 1; transform: none; }
  }

  .card {
    background: linear-gradient(160deg, rgba(10,10,22,.97) 0%, rgba(13,13,32,.97) 100%);
    border-radius: 26px; /* slightly smaller than outer */
    padding: 60px 56px 52px;
    text-align: center;
  }

  .icon-wrap {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(0,212,255,.15), rgba(255,0,255,.15));
    border: 1px solid rgba(0,212,255,.2);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 28px;
    animation: iconPulse 2.5s ease-in-out infinite;
  }
  @keyframes iconPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0,212,255,.15); }
    50%       { box-shadow: 0 0 0 14px rgba(0,212,255,.0); }
  }
  .icon-wrap svg {
    width: 36px; height: 36px;
  }

  h1 {
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -.01em;
    background: linear-gradient(135deg, #fff 30%, rgba(255,255,255,.55));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 12px;
  }

  .subtitle {
    font-size: .95rem;
    color: rgba(255,255,255,.45);
    line-height: 1.65;
    margin-bottom: 36px;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: 50px;
    background: rgba(255,255,255,.05);
    border: 1px solid rgba(255,255,255,.08);
    font-size: .82rem;
    color: rgba(255,255,255,.5);
    letter-spacing: .04em;
  }
  .badge-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #00d4ff;
    animation: blink 1.4s ease-in-out infinite;
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: .2; }
  }

  <?php if (isLoggedIn()): ?>
  .logout-link {
    display: block;
    margin-top: 28px;
    font-size: .78rem;
    color: rgba(255,255,255,.25);
    text-decoration: none;
    transition: color .2s;
  }
  .logout-link:hover { color: rgba(255,255,255,.5); }
  <?php endif; ?>
</style>
</head>
<body>

<!-- Floating particles -->
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

<div class="card-outer">
  <div class="card">

    <div class="icon-wrap">
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21.5 5.5C19.2 4.6 16.5 5 14.3 6.7L18 10.4l-2.1 2.1-3.8-3.8C10.4 11 10 13.7 10.9 16L5.5 21.4a2.5 2.5 0 0 0 3.5 3.6l5.4-5.4c2.3.9 5 .5 6.8-1.3A7 7 0 0 0 21.5 5.5Z" fill="url(#g1)" opacity=".9"/>
        <circle cx="25" cy="26" r="5" stroke="url(#g2)" stroke-width="2" fill="none"/>
        <path d="M25 23v3l2 2" stroke="url(#g2)" stroke-width="1.5" stroke-linecap="round"/>
        <defs>
          <linearGradient id="g1" x1="5" y1="5" x2="28" y2="22" gradientUnits="userSpaceOnUse">
            <stop stop-color="#00d4ff"/>
            <stop offset="1" stop-color="#ff00ff"/>
          </linearGradient>
          <linearGradient id="g2" x1="20" y1="21" x2="30" y2="31" gradientUnits="userSpaceOnUse">
            <stop stop-color="#00d4ff"/>
            <stop offset="1" stop-color="#ff00ff"/>
          </linearGradient>
        </defs>
      </svg>
    </div>

    <h1>Maintenance</h1>

    <p class="subtitle">
      Maintenance will end soon.<br>
      We're working hard to get everything back up for you.
    </p>

    <div class="badge">
      <span class="badge-dot"></span>
      Back online soon
    </div>

    <?php if (isLoggedIn()): ?>
    <a href="/logout" class="logout-link">← Log out</a>
    <?php endif; ?>

  </div>
</div>

<script>
function checkMaintenance() {
  fetch('/api/maintenance_status.php', { cache: 'no-store' })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && data.maintenance === false) {
        window.location.href = '/';
      }
    })
    .catch(function() {});
}
// Run immediately on load (covers refresh), then every 10s
checkMaintenance();
setInterval(checkMaintenance, 10000);
</script>

</body>
</html>