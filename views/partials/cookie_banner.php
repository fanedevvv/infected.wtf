<?php
// Determină consimțământul: DB (user logat) > cookie > null
$_cookieConsent = null;
if (isset($_SESSION['user_id']) && isset($pdo)) {
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS cookie_consent ENUM('accepted','rejected') DEFAULT NULL");
        $ccRow = $pdo->prepare("SELECT cookie_consent FROM users WHERE id=? LIMIT 1");
        $ccRow->execute([(int)$_SESSION['user_id']]);
        $_cookieConsent = $ccRow->fetchColumn() ?: null;
    } catch (Exception $e) {}
}
if (!$_cookieConsent) {
    $_cookieConsent = $_COOKIE['site_cookie_consent'] ?? null;
}
if ($_cookieConsent) return; // deja a decis, nu afișa banner
?>
<!-- COOKIE CONSENT BANNER -->
<div id="cookie-banner" style="display:none">
    <div class="cookie-icon">🍪</div>
    <div class="cookie-text">
        <div class="cookie-title">We use cookies</div>
        <div class="cookie-desc">We use cookies to improve your experience. By accepting, you agree to our <a href="/privacy">Privacy Policy</a>.</div>
    </div>
    <div class="cookie-actions">
        <button class="cookie-btn cookie-reject" onclick="cookieDecision(false)">Reject</button>
        <button class="cookie-btn cookie-accept" onclick="cookieDecision(true)">Accept</button>
    </div>
</div>
<style>
#cookie-banner {
    position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999;
    max-width: 340px; width: calc(100vw - 3rem);
    background: rgba(10,10,18,0.96);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 16px;
    padding: 1.1rem 1.2rem;
    display: flex; flex-direction: column; gap: .75rem;
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 8px 40px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04) inset;
    animation: cookieSlide .35s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes cookieSlide {
    from { opacity:0; transform: translateY(20px) scale(.96); }
    to   { opacity:1; transform: translateY(0) scale(1); }
}
.cookie-icon { font-size: 1.5rem; line-height: 1; }
.cookie-title {
    font-family: 'Syne', sans-serif; font-size: .9rem; font-weight: 800;
    color: #fff; margin-bottom: .25rem;
}
.cookie-desc { font-size: .75rem; color: rgba(255,255,255,.42); line-height: 1.55; }
.cookie-desc a { color: var(--accent, #00d4ff); text-decoration: none; }
.cookie-desc a:hover { text-decoration: underline; }
.cookie-actions { display: flex; gap: .6rem; }
.cookie-btn {
    flex: 1; padding: .5rem .8rem; border-radius: 9px;
    font-family: 'Outfit', sans-serif; font-size: .8rem; font-weight: 700;
    cursor: pointer; border: none; transition: all .18s;
}
.cookie-reject {
    background: rgba(255,255,255,.07); color: rgba(255,255,255,.6);
    border: 1px solid rgba(255,255,255,.1);
}
.cookie-reject:hover { background: rgba(255,255,255,.13); color: #fff; }
.cookie-accept {
    background: linear-gradient(135deg, #00d4ff, #0099bb);
    color: #000; font-weight: 800;
    box-shadow: 0 3px 12px rgba(0,212,255,.3);
}
.cookie-accept:hover { opacity: .88; transform: translateY(-1px); }
@media(max-width:480px) {
    #cookie-banner { bottom: 1rem; right: 1rem; left: 1rem; max-width: none; width: auto; }
}
</style>
<script>
(function() {
    var COOKIE_NAME = 'site_cookie_consent';
    function getConsent() {
        var match = document.cookie.match(new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : null;
    }
    function dismissBanner() {
        var banner = document.getElementById('cookie-banner');
        if (!banner) return;
        banner.style.transition = 'opacity .25s, transform .25s';
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(16px) scale(.96)';
        setTimeout(function(){ banner.style.display = 'none'; }, 260);
    }
    function saveConsent(value) {
        return fetch('/api/cookie_consent.php?action=set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ consent: value })
        }).catch(function() {
            var exp = new Date(Date.now() + 365*24*60*60*1000).toUTCString();
            document.cookie = COOKIE_NAME + '=' + value + '; expires=' + exp + '; path=/; SameSite=Lax';
        });
    }
    window.cookieDecision = function(accepted) {
        var value = accepted ? 'accepted' : 'rejected';
        dismissBanner();
        saveConsent(value);
    };
    var current = getConsent();
    if (!current) {
        document.getElementById('cookie-banner').style.display = 'flex';
    }
})();
</script>