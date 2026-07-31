<?php
requireLogin(); checkBanned($pdo);
$userId  = (int)$_SESSION['user_id'];
$profile = getProfile($pdo, $userId);
$links   = getSocialLinks($pdo, $userId);
$platforms = ['steam','spotify','discord','instagram','twitter','youtube','twitch','github','tiktok','website'];
$currentPage = 'links'; $pageTitle = 'Links';
ob_start();
?>
<style>
/* ── Links Page ── */
.link-platform-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: .75rem;
    margin-bottom: 1.5rem;
}
.link-platform-btn {
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 14px;
    padding: .9rem .5rem .75rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .45rem;
    cursor: pointer;
    transition: background .2s, border-color .2s, transform .2s, box-shadow .2s;
    color: rgba(255,255,255,.55);
    font-size: .72rem;
    font-weight: 600;
    letter-spacing: .02em;
    text-transform: capitalize;
}
.link-platform-btn:hover {
    background: rgba(255,255,255,.08);
    border-color: rgba(255,255,255,.18);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,.25);
    color: #fff;
}
.link-platform-btn .lpb-icon {
    width: 40px; height: 40px;
    border-radius: 11px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.15rem;
    transition: transform .2s;
}
.link-platform-btn:hover .lpb-icon { transform: scale(1.1); }

/* ── Add-link modal ── */
#link-modal {
    display: none;
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(0,0,0,.75);
    backdrop-filter: blur(6px);
    align-items: center; justify-content: center;
    padding: 1rem;
}
#link-modal.open { display: flex; }
.link-modal-box {
    background: rgba(13,14,22,.97);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 22px;
    padding: 2rem 2rem 1.75rem;
    max-width: 400px; width: 100%;
    position: relative;
    box-shadow: 0 28px 80px rgba(0,0,0,.65);
    animation: lm-in .2s ease;
}
@keyframes lm-in {
    from { opacity: 0; transform: translateY(12px) scale(.97); }
    to   { opacity: 1; transform: none; }
}
.link-modal-close {
    position: absolute; top: 1rem; right: 1rem;
    background: rgba(255,255,255,.07);
    border: none; color: rgba(255,255,255,.5);
    width: 30px; height: 30px; border-radius: 8px;
    cursor: pointer; font-size: 1.1rem;
    display: flex; align-items: center; justify-content: center;
    transition: background .2s;
}
.link-modal-close:hover { background: rgba(255,255,255,.13); color: #fff; }

.link-modal-header {
    display: flex; align-items: center; gap: 1rem;
    margin-bottom: 1.5rem;
}
.link-modal-icon {
    width: 54px; height: 54px; border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    font-size: 1.5rem;
}
.link-modal-title { font-size: 1.2rem; font-weight: 800; color: #fff; margin: 0 0 .2rem; }
.link-modal-sub   { font-size: .78rem; color: rgba(255,255,255,.38); margin: 0; }

.link-modal-label {
    display: block;
    font-size: .72rem; font-weight: 700;
    color: rgba(255,255,255,.4);
    text-transform: uppercase; letter-spacing: .05em;
    margin-bottom: .45rem;
}
.link-modal-input {
    width: 100%; box-sizing: border-box;
    background: rgba(255,255,255,.06);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 11px;
    padding: .75rem 1rem;
    color: #fff; font-size: .9rem; font-family: inherit;
    outline: none;
    transition: border-color .2s;
    margin-bottom: 1rem;
}
.link-modal-input:focus { border-color: var(--lm-color, rgba(99,102,241,.6)); }
.link-modal-input::placeholder { color: rgba(255,255,255,.22); }

.link-modal-err {
    display: none;
    color: #ed4245; font-size: .78rem;
    margin: -.5rem 0 .75rem;
}

.link-modal-btn {
    display: flex; align-items: center; justify-content: center; gap: .45rem;
    width: 100%; padding: .7rem 1rem;
    border: none; border-radius: 11px;
    font-size: .88rem; font-weight: 700; font-family: inherit;
    cursor: pointer;
    transition: opacity .2s, transform .2s;
    color: #fff;
    background: var(--lm-color, #6366f1);
    box-shadow: 0 4px 18px rgba(0,0,0,.25);
}
.link-modal-btn:hover   { opacity: .88; transform: translateY(-1px); }
.link-modal-btn:disabled { opacity: .5; pointer-events: none; }

/* ── Existing link rows ── */
.social-link-row {
    display: flex; align-items: center; gap: .85rem;
    padding: .85rem 1rem;
    background: rgba(255,255,255,.03);
    border: 1px solid rgba(255,255,255,.06);
    border-radius: 12px;
    margin-bottom: .55rem;
    transition: border-color .2s;
}
.social-link-row:hover { border-color: rgba(255,255,255,.12); }
.social-link-icon {
    width: 38px; height: 38px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
}
.social-link-info { flex: 1; min-width: 0; }
.social-link-platform { font-size: .82rem; font-weight: 700; color: #fff; margin-bottom: .1rem; }
.social-link-url      { font-size: .73rem; color: rgba(255,255,255,.35); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>

<div class="section-header"><h2>Social Links</h2><p>Add your social network links</p></div>

<!-- Existing links -->
<div class="dash-card">
    <div class="dash-card-header">
        <span class="dash-card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            My Links
        </span>
    </div>
    <?php if(empty($links)): ?>
    <p style="color:var(--text-muted);text-align:center;padding:2rem;font-size:.875rem">You haven't added any links yet.</p>
    <?php else: foreach($links as $link): ?>
    <div class="social-link-row" id="link-row-<?= $link['id'] ?>">
        <div class="social-link-icon" style="background:<?= getPlatformColor($link['platform']) ?>20;border:1px solid <?= getPlatformColor($link['platform']) ?>40">
            <div style="color:<?= getPlatformColor($link['platform']) ?>"><?= getPlatformIcon($link['platform']) ?></div>
        </div>
        <div class="social-link-info">
            <div class="social-link-platform"><?= sanitize(ucfirst($link['platform'])) ?></div>
            <div class="social-link-url"><?= sanitize($link['url']) ?></div>
        </div>
        <button onclick="showDeleteLinkModal(<?= $link['id'] ?>)" class="btn btn-danger btn-sm">✕</button>
    </div>
    <?php endforeach; endif; ?>
</div>

<!-- Platform picker -->
<div class="dash-card">
    <div class="dash-card-header"><span class="dash-card-title">Add new link</span></div>
    <p style="color:rgba(255,255,255,.38);font-size:.8rem;margin:0 0 1.25rem;">Select a platform to add your link or username.</p>
    <div class="link-platform-grid">
        <?php foreach($platforms as $p):
            $color = getPlatformColor($p);
        ?>
        <button
            class="link-platform-btn"
            onclick="openLinkModal('<?= $p ?>')"
            style="--lpb-color:<?= $color ?>"
        >
            <div class="lpb-icon" style="background:<?= $color ?>20;border:1px solid <?= $color ?>30;color:<?= $color ?>">
                <?= getPlatformIcon($p) ?>
            </div>
            <?= ucfirst($p) ?>
        </button>
        <?php endforeach; ?>
    </div>
</div>

<!-- ── Add Link Modal ── -->
<div id="link-modal" aria-modal="true" role="dialog">
    <div class="link-modal-box" id="link-modal-box">
        <button class="link-modal-close" onclick="closeLinkModal()">×</button>

        <div class="link-modal-header">
            <div class="link-modal-icon" id="lm-icon"></div>
            <div>
                <p class="link-modal-title" id="lm-title">Add link</p>
                <p class="link-modal-sub"   id="lm-sub">Enter your profile link or username</p>
            </div>
        </div>

        <label class="link-modal-label" for="lm-url-input">Username / URL</label>
        <input
            type="text"
            id="lm-url-input"
            class="link-modal-input"
            placeholder="https://... or @username"
            autocomplete="off"
        >
        <div class="link-modal-err" id="lm-err"></div>

        <button class="link-modal-btn" id="lm-save-btn" onclick="saveLinkModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
            Add link
        </button>
    </div>
</div>

<script>
// ── Platform meta (color + icon HTML + placeholder) ──
const PLATFORMS = {
<?php foreach($platforms as $p):
    $color = getPlatformColor($p);
    $icon  = getPlatformIcon($p);
    // escape for JS string
    $iconJs = addslashes(str_replace(["\n","\r"], '', $icon));
    $placeholders = [
        'steam'     => 'https://steamcommunity.com/id/username',
        'spotify'   => 'https://open.spotify.com/user/username',
        'discord'   => 'https://discord.gg/invite or discord.gg/server',
        'instagram' => 'https://instagram.com/username',
        'twitter'   => 'https://x.com/username',
        'youtube'   => 'https://youtube.com/@channel',
        'twitch'    => 'https://twitch.tv/username',
        'github'    => 'https://github.com/username',
        'tiktok'    => 'https://tiktok.com/@username',
        'website'   => 'https://yourwebsite.com',
    ];
    $ph = $placeholders[$p] ?? 'https://...';
?>
    '<?= $p ?>': {
        color: '<?= $color ?>',
        icon:  '<?= $iconJs ?>',
        placeholder: '<?= $ph ?>',
        label: '<?= ucfirst($p) ?>',
    },
<?php endforeach; ?>
};

let _currentPlatform = null;

function openLinkModal(platform) {
    const meta = PLATFORMS[platform];
    if (!meta) return;
    _currentPlatform = platform;

    // Style modal accent color
    document.getElementById('link-modal-box').style.setProperty('--lm-color', meta.color);
    document.getElementById('link-modal-box').style.borderColor = meta.color + '30';

    // Icon
    const iconEl = document.getElementById('lm-icon');
    iconEl.innerHTML = meta.icon;
    iconEl.style.background = meta.color + '20';
    iconEl.style.border = '1px solid ' + meta.color + '35';
    iconEl.style.color  = meta.color;

    // Texts
    document.getElementById('lm-title').textContent = 'Link ' + meta.label;
    document.getElementById('lm-sub').textContent   = 'Enter your ' + meta.label + ' profile link or username.';

    // Input
    const inp = document.getElementById('lm-url-input');
    inp.placeholder = meta.placeholder;
    inp.value = '';
    inp.style.setProperty('--lm-color', meta.color + '80');

    // Reset
    document.getElementById('lm-err').style.display = 'none';
    document.getElementById('lm-save-btn').disabled  = false;
    document.getElementById('lm-save-btn').innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg> Add link';

    // Open
    document.getElementById('link-modal').classList.add('open');
    setTimeout(() => inp.focus(), 80);
}

function closeLinkModal() {
    document.getElementById('link-modal').classList.remove('open');
    _currentPlatform = null;
}

async function saveLinkModal() {
    const inp    = document.getElementById('lm-url-input');
    const errEl  = document.getElementById('lm-err');
    const btn    = document.getElementById('lm-save-btn');
    let   url    = inp.value.trim();

    errEl.style.display = 'none';

    if (!url) {
        errEl.textContent = 'Please enter a URL or username.';
        errEl.style.display = 'block';
        inp.focus();
        return;
    }

    // Auto-prepend https:// if the user typed just a username/domain
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.startsWith('@')) url = url.slice(1); // strip leading @
        url = 'https://' + url;
    }

    btn.disabled = true;
    btn.textContent = 'Adding...';

    const fd = new FormData();
    fd.append('action',   'add-link-form');
    fd.append('platform', _currentPlatform);
    fd.append('url',      url);

    try {
        const r = await fetch('/api/update_profile.php', { method: 'POST', body: fd });
        const j = await r.json();
        if (j.success) {
            closeLinkModal();
            if (typeof showToast === 'function') showToast('Link added!', 'success');
            setTimeout(() => location.reload(), 700);
        } else {
            errEl.textContent    = j.error || 'Failed to add link.';
            errEl.style.display  = 'block';
            btn.disabled         = false;
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg> Add link';
        }
    } catch {
        errEl.textContent   = 'Network error. Please try again.';
        errEl.style.display = 'block';
        btn.disabled        = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg> Add link';
    }
}

// Close on backdrop click
document.getElementById('link-modal').addEventListener('click', function(e) {
    if (e.target === this) closeLinkModal();
});

// Close on Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeLinkModal();
});

// Submit on Enter
document.getElementById('lm-url-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') saveLinkModal();
});
</script>

<?php $pageContent = ob_get_clean(); require VIEWS_PATH . '/layouts/app.php';