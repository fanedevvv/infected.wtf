<?php
requireLogin(); checkBanned($pdo);
$userId = (int)$_SESSION['user_id'];
$profile = getProfile($pdo, $userId);
$isPremium = !empty($profile['is_premium']) && (empty($profile['premium_expires_at']) || strtotime($profile['premium_expires_at']) > time());
$currentPage = 'effects'; $pageTitle = 'Effects';

// Load purchased & active effects
$s = $pdo->prepare("SELECT COALESCE(purchased_effects,'[]'), COALESCE(active_effects,'{}') FROM profiles WHERE user_id=?");
$s->execute([$userId]);
$efRow = $s->fetch(PDO::FETCH_NUM);
$purchasedEffects = json_decode($efRow[0] ?? '[]', true) ?: [];
$activeEffects    = json_decode($efRow[1] ?? '{}', true) ?: [];

ob_start();

?>

<style>
/* ── Category labels ──────────────────────────────────── */
.fx-section { margin-bottom: 2.2rem; }
.fx-section-title {
    font-family: 'Syne', sans-serif;
    font-size: .7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .13em;
    color: rgba(255,255,255,.32);
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: .55rem;
}
.fx-section-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,.07);
}
.fx-section-title svg { flex-shrink: 0; }

/* ── Grid ─────────────────────────────────────────────── */
.effects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(205px, 1fr));
    gap: 1rem;
}

/* ── Card ─────────────────────────────────────────────── */
.effect-card {
    background: #111;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 18px;
    padding: 1.2rem 1rem 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: .65rem;
    transition: border-color .25s, box-shadow .25s;
}
.effect-card.active {
    border-color: rgba(0,212,255,.38);
    box-shadow: 0 0 20px rgba(0,212,255,.07);
}

/* ── Preview box ──────────────────────────────────────── */
.effect-preview {
    width: 100%; height: 98px;
    border-radius: 11px;
    background: #0a0a0f;
    border: 1px solid rgba(255,255,255,.05);
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
}
.effect-preview canvas {
    position: absolute; inset: 0;
    width: 100% !important; height: 100% !important;
}
.cursor-dot {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
}
.preview-typewriter {
    font-family: 'Syne', sans-serif;
    font-size: .98rem;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
}
.cursor-blink {
    display: inline-block;
    width: 2px; height: 1em;
    background: var(--accent, #00d4ff);
    margin-left: 2px;
    vertical-align: text-bottom;
    animation: blink .8s step-end infinite;
}
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

/* ── Card name / desc ─────────────────────────────────── */
.effect-card-name {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: .88rem;
    color: #fff;
    display: flex;
    align-items: center;
    gap: .3rem;
}
.effect-card-desc {
    font-size: .73rem;
    color: rgba(255,255,255,.36);
    line-height: 1.45;
}

/* ── Toggle ───────────────────────────────────────────── */
.effect-toggle-wrap { display:flex; align-items:center; gap:.5rem; margin-top:.1rem; }
.effect-toggle-text {
    font-size: .67rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: .07em;
    color: rgba(255,255,255,.32);
    min-width: 48px; text-align: right;
}
.effect-toggle-switch {
    width: 40px; height: 21px; border-radius: 21px;
    background: rgba(255,255,255,.1);
    border: 1px solid rgba(255,255,255,.13);
    position: relative; cursor: pointer;
    transition: background .25s, border-color .25s;
}
.effect-toggle-switch.active { background: rgba(0,212,255,.28); border-color: rgba(0,212,255,.55); }
.effect-toggle-knob {
    position: absolute; top: 3px; left: 3px;
    width: 13px; height: 13px; border-radius: 50%;
    background: rgba(255,255,255,.5);
    transition: transform .25s, background .25s;
}
.effect-toggle-switch.active .effect-toggle-knob { transform: translateX(19px); background: #00d4ff; }

/* ── Ring previews ────────────────────────────────────────────────── */
.ring-preview-wrap {
    position: relative;
    width: 62px; height: 62px;
    display: flex; align-items: center; justify-content: center;
}
.ring-preview-shell {
    position: absolute; inset: -4px;
    border-radius: 50%; overflow: hidden; z-index: 0;
}
.ring-preview-shell.rp-premium { inset: -7px; }
.ring-preview-shell.rp-glow {
    box-shadow: 0 0 14px 4px rgba(255,215,0,.55), 0 0 30px 8px rgba(255,180,0,.28);
    animation: premiumGlowPrev 2.2s ease-in-out infinite;
}
@keyframes premiumGlowPrev {
    0%,100%{ box-shadow: 0 0 14px 4px rgba(255,215,0,.55), 0 0 30px 8px rgba(255,180,0,.28); }
    50%    { box-shadow: 0 0 22px 8px rgba(255,215,0,.28), 0 0 50px 14px rgba(255,180,0,.12); }
}
.ring-preview-spin {
    position: absolute; inset: -60%; border-radius: 0;
    animation: ringRotatePrev 3s linear infinite;
}
@keyframes ringRotatePrev { to { transform: rotate(360deg); } }
.rp-spin-accent {
    background: conic-gradient(var(--accent,#00d4ff), var(--accent2,#ff00ff), var(--accent,#00d4ff));
}
.rp-spin-gold {
    background: conic-gradient(
        #ffd700 0deg, #ffec6e 40deg, #fff4a0 80deg,
        #ffd700 120deg, #b8860b 160deg, #ffd700 200deg,
        #ffe066 240deg, #fff4a0 280deg, #ffd700 320deg, #ffd700 360deg
    );
}
.ring-preview-inner {
    position: absolute; inset: 2px;
    border-radius: 50%; background: #0a0a0f; z-index: 1;
}
.ring-preview-avatar {
    position: relative; z-index: 2;
    width: 44px; height: 44px; border-radius: 50%;
    background: rgba(255,255,255,.06);
    border: 1px solid rgba(255,255,255,.1);
}
.ring-preview-pulse {
    position: absolute; inset: -11px;
    border-radius: 50%;
    border: 2px solid rgba(255,215,0,.35);
    animation: premiumPulsePrev 2.2s ease-in-out infinite;
    pointer-events: none; z-index: 0;
}
@keyframes premiumPulsePrev {
    0%,100%{ box-shadow:0 0 8px 2px rgba(255,215,0,.4); opacity:1; }
    50%    { box-shadow:0 0 22px 8px rgba(255,215,0,.15); opacity:.7; }
}

/* ── Shape picker ─────────────────────────────────────── */
.shape-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: .9rem;
}
.shape-card {
    background: #111;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 14px;
    padding: .95rem .7rem .8rem;
    display: flex; flex-direction: column;
    align-items: center; gap: .55rem;
    cursor: pointer;
    transition: border-color .2s, box-shadow .2s, transform .15s;
}
.shape-card:hover { border-color: rgba(0,212,255,.28); transform: translateY(-2px); }
.shape-card.selected {
    border-color: rgba(0,212,255,.6);
    box-shadow: 0 0 16px rgba(0,212,255,.1);
    background: rgba(0,212,255,.04);
}
.shape-preview {
    width: 50px; height: 50px;
    background: var(--accent, #00d4ff);
    opacity: .82;
    transition: border-radius .3s;
}
.shape-preview.sq  { border-radius: 8px; }
.shape-preview.sft { border-radius: 18px; }
.shape-preview.rnd { border-radius: 25px; }
.shape-preview.cir { border-radius: 50%; }
.shape-preview.eye { border-radius: 0; clip-path: polygon(0% 50%,10% 30%,25% 15%,50% 5%,75% 15%,90% 30%,100% 50%,90% 70%,75% 85%,50% 95%,25% 85%,10% 70%); }
.shape-preview.dia { border-radius: 0; clip-path: polygon(50% 0%,100% 50%,50% 100%,0% 50%); }
.shape-preview.egg { border-radius: 50% 50% 50% 50% / 35% 35% 60% 60%; }
.shape-label {
    font-size: .7rem; font-weight: 600;
    color: rgba(255,255,255,.42);
    text-transform: uppercase; letter-spacing: .06em;
}
.shape-card.selected .shape-label { color: #00d4ff; }

@media(max-width:600px){
    .effects-grid { grid-template-columns: 1fr 1fr; }
    .shape-grid   { grid-template-columns: repeat(3,1fr); }
}
@media(max-width:380px){
    .effects-grid { grid-template-columns: 1fr; }
}

/* ── Locked / Not Owned cards ──────────────────────────────────────── */
.effect-locked {
    opacity: 1;
    position: relative;
}
.effect-locked .effect-preview {
    filter: brightness(.45) saturate(.4);
}
.lock-overlay {
    position: absolute; inset: 0; border-radius: 10px;
    background: linear-gradient(160deg, rgba(10,10,20,.55) 0%, rgba(0,0,0,.72) 100%);
    backdrop-filter: blur(1px);
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .45rem;
    pointer-events: none;
    z-index: 2;
}
.lock-overlay svg {
    color: rgba(255,255,255,.5);
    filter: drop-shadow(0 0 6px rgba(0,212,255,.35));
}
.lock-overlay span {
    font-size: .65rem; font-weight: 800;
    text-transform: uppercase; letter-spacing: .1em;
    color: rgba(255,255,255,.45);
}
/* Disabled state for locked cards */
.effect-locked .effect-card-name { opacity: .55; }
.effect-locked .effect-card-desc { opacity: .4; }

/* ── Buy in Shop link ──────────────────────────────────────────────── */
.pef-buy-link {
    display: inline-flex; align-items: center; justify-content: center; gap: .4rem;
    font-size: .75rem; font-weight: 700;
    color: var(--accent, #00d4ff);
    text-decoration: none;
    padding: .45rem .9rem;
    border: 1px solid rgba(0,212,255,.25);
    border-radius: 8px;
    background: rgba(0,212,255,.06);
    margin-top: .1rem;
    letter-spacing: .03em;
    transition: background .18s, border-color .18s, transform .15s;
    width: 100%; box-sizing: border-box;
}
.pef-buy-link:hover {
    background: rgba(0,212,255,.12);
    border-color: rgba(0,212,255,.45);
    transform: translateY(-1px);
}
.pef-buy-link svg { flex-shrink: 0; }

/* ── Purchased effect preview canvas ──────────────────────────────── */
.pef-preview { background: #06060f; cursor: default; }
.pef-preview canvas { position:absolute;inset:0;width:100%!important;height:100%!important; }

/* ── Premium Only badge (Gold Ring) ───────────────────────────────── */
.premium-ring-lock {
    display: inline-flex;
    align-items: center;
    gap: .38rem;
    padding: .42rem 1rem;
    background: linear-gradient(135deg, rgba(255,215,0,.13), rgba(251,191,36,.07));
    border: 1px solid rgba(255,215,0,.3);
    border-radius: 10px;
    margin-top: .1rem;
    font-size: .72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .09em;
    color: #fbbf24;
    box-shadow: 0 0 14px rgba(255,215,0,.08);
    cursor: default;
}
.premium-ring-lock svg { flex-shrink: 0; }
</style>

<div class="section-header"><h2>Visual Effects</h2><p>Enable or disable special effects</p></div>

<!-- ══ 1. BACKGROUND EFFECTS ══════════════════════════════════════════ -->
<div class="fx-section">
    <div class="fx-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
        Background Effects
    </div>
    <div class="effects-grid">
        <!-- Free particles/stars -->
        <div class="effect-card <?= $profile['particle_effect'] ? 'active' : '' ?>" id="card-particles">
            <div class="effect-preview">
                <canvas id="particles-canvas"></canvas>
            </div>
            <div class="effect-card-name">Particles / Stars</div>
            <div class="effect-card-desc">Stars and shooting stars animation on your profile background</div>
            <div class="effect-toggle-wrap">
                <span class="effect-toggle-text" id="lbl-particles"><?= $profile['particle_effect'] ? 'Enabled' : 'Disabled' ?></span>
                <div class="effect-toggle-switch <?= $profile['particle_effect'] ? 'active' : '' ?>"
                     id="sw-particles"
                     onclick="toggleEffect('particle_effect',this,'lbl-particles','card-particles')">
                    <div class="effect-toggle-knob"></div>
                </div>
            </div>
        </div>
        <!-- Purchased background effects (inline) -->
        <?php
        $bgEffects = [
            'bg_fallingleaves' => ['name'=>'Falling Leaves',  'desc'=>'Gentle autumn leaves drifting across the bg', 'color'=>'#84cc16'],
            'bg_underwater'    => ['name'=>'Underwater',       'desc'=>'Bubbles and rays in an underwater scene',    'color'=>'#0369a1'],
            'bg_gas'           => ['name'=>'Gas Effect',       'desc'=>'Swirling fog and gas clouds across the bg',  'color'=>'#6d28d9'],
            'bg_fireworks'     => ['name'=>'Fireworks',        'desc'=>'Colorful fireworks bursting across the background','color'=>'#f97316'],
            'bg_hell'          => ['name'=>'Hell Background',  'desc'=>'Hellfire and embers engulf your background', 'color'=>'#ef4444'],
            'bg_shadowworld'   => ['name'=>'Shadow World',     'desc'=>'Dark creepy shadow realm, highest tier bg',  'color'=>'#1e1b4b'],
        ];
        $activeBgId = $activeEffects['bg'] ?? '';
        foreach ($bgEffects as $effectId => $effect):
            $owned    = in_array($effectId, $purchasedEffects, true);
            $isActive = ($activeBgId === $effectId);
            $cardId   = 'card-pef-'.$effectId;
            $lblId    = 'lbl-pef-'.$effectId;
        ?>
        <div class="effect-card <?= $isActive ? 'active' : '' ?> <?= !$owned ? 'effect-locked' : '' ?>" id="<?= $cardId ?>">
            <div class="effect-preview pef-preview" data-effect="<?= $effectId ?>">
                <?php if (!$owned): ?>
                <div class="lock-overlay">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="26" height="26"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    <span>Not Owned</span>
                </div>
                <?php endif; ?>
            </div>
            <div class="effect-card-name" style="color:<?= $effect['color'] ?>">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:<?= $effect['color'] ?>;flex-shrink:0"></span>
                <?= htmlspecialchars($effect['name']) ?>
            </div>
            <div class="effect-card-desc"><?= htmlspecialchars($effect['desc']) ?></div>
            <?php if ($owned): ?>
            <div class="effect-toggle-wrap">
                <span class="effect-toggle-text" id="<?= $lblId ?>"><?= $isActive ? 'Enabled' : 'Disabled' ?></span>
                <div class="effect-toggle-switch pef-switch <?= $isActive ? 'active' : '' ?>"
                     id="sw-pef-<?= $effectId ?>"
                     data-type="bg"
                     data-effect="<?= $effectId ?>"
                     data-lbl="<?= $lblId ?>"
                     data-card="<?= $cardId ?>"
                     onclick="togglePurchasedEffect('<?= $effectId ?>','bg',this,'<?= $lblId ?>','<?= $cardId ?>')">
                    <div class="effect-toggle-knob"></div>
                </div>
            </div>
            <?php else: ?>
            <a href="/dashboard/shop#effects" class="pef-buy-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                Buy in Shop
            </a>
            <?php endif; ?>
        </div>
        <?php endforeach; ?>
    </div>
</div>

<!-- ══ 2. CURSOR EFFECTS ══════════════════════════════════════════════ -->
<div class="fx-section">
    <div class="fx-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M4 4l7.07 17 2.51-7.39L21 11.07z"/></svg>
        Cursor Effects
    </div>
    <div class="effects-grid">
        <!-- Free cursor trail -->
        <div class="effect-card <?= $profile['cursor_trail'] ? 'active' : '' ?>" id="card-cursor">
            <div class="effect-preview" id="cursor-preview"></div>
            <div class="effect-card-name">Cursor Trail</div>
            <div class="effect-card-desc">Leaves a colorful trail as visitors move their mouse on your profile</div>
            <div class="effect-toggle-wrap">
                <span class="effect-toggle-text" id="lbl-cursor"><?= $profile['cursor_trail'] ? 'Enabled' : 'Disabled' ?></span>
                <div class="effect-toggle-switch <?= $profile['cursor_trail'] ? 'active' : '' ?>"
                     id="sw-cursor"
                     onclick="toggleEffect('cursor_trail',this,'lbl-cursor','card-cursor')">
                    <div class="effect-toggle-knob"></div>
                </div>
            </div>
        </div>
        <!-- Purchased cursor effects (inline) -->
        <?php
        $cursorEffects = [
            'cursor_smoke'     => ['name'=>'Smoke Trail',     'desc'=>'Gray smoke particles trailing your cursor',   'color'=>'#888'],
            'cursor_fire'      => ['name'=>'Fire Trail',       'desc'=>'Intense fire particles that burn behind you', 'color'=>'#ff4500'],
            'cursor_soundwave' => ['name'=>'Sound Wave',       'desc'=>'Expanding sound rings from your cursor',     'color'=>'#00d4ff'],
            'cursor_meteors'   => ['name'=>'Meteors',          'desc'=>'Shooting meteors streaking behind cursor',   'color'=>'#ffd700'],
            'cursor_leaves'    => ['name'=>'Aesthetic Leaves', 'desc'=>'3D aesthetic leaves floating around cursor', 'color'=>'#4caf50'],
            'cursor_water'     => ['name'=>'Water Trail 3D',   'desc'=>'Smooth 3D water droplets trailing cursor',   'color'=>'#0ea5e9'],
            'cursor_shadow'    => ['name'=>'Soul Trail',        'desc'=>'Ethereal glowing souls that drift behind your cursor', 'color'=>'#a8edff'],
        ];
        $activeCursorId = $activeEffects['cursor'] ?? '';
        foreach ($cursorEffects as $effectId => $effect):
            $owned    = in_array($effectId, $purchasedEffects, true);
            $isActive = ($activeCursorId === $effectId);
            $cardId   = 'card-pef-'.$effectId;
            $lblId    = 'lbl-pef-'.$effectId;
        ?>
        <div class="effect-card <?= $isActive ? 'active' : '' ?> <?= !$owned ? 'effect-locked' : '' ?>" id="<?= $cardId ?>">
            <div class="effect-preview pef-preview" data-effect="<?= $effectId ?>">
                <?php if (!$owned): ?>
                <div class="lock-overlay">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="26" height="26"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    <span>Not Owned</span>
                </div>
                <?php endif; ?>
            </div>
            <div class="effect-card-name" style="color:<?= $effect['color'] ?>">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:<?= $effect['color'] ?>;flex-shrink:0"></span>
                <?= htmlspecialchars($effect['name']) ?>
            </div>
            <div class="effect-card-desc"><?= htmlspecialchars($effect['desc']) ?></div>
            <?php if ($owned): ?>
            <div class="effect-toggle-wrap">
                <span class="effect-toggle-text" id="<?= $lblId ?>"><?= $isActive ? 'Enabled' : 'Disabled' ?></span>
                <div class="effect-toggle-switch pef-switch <?= $isActive ? 'active' : '' ?>"
                     id="sw-pef-<?= $effectId ?>"
                     data-type="cursor"
                     data-effect="<?= $effectId ?>"
                     data-lbl="<?= $lblId ?>"
                     data-card="<?= $cardId ?>"
                     onclick="togglePurchasedEffect('<?= $effectId ?>','cursor',this,'<?= $lblId ?>','<?= $cardId ?>')">
                    <div class="effect-toggle-knob"></div>
                </div>
            </div>
            <?php else: ?>
            <a href="/dashboard/shop#effects" class="pef-buy-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                Buy in Shop
            </a>
            <?php endif; ?>
        </div>
        <?php endforeach; ?>
    </div>
</div>

<!-- ══ 3. NAME EFFECTS ════════════════════════════════════════════════ -->
<div class="fx-section">
    <div class="fx-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
        Name Effects
    </div>
    <div class="effects-grid">
        <div class="effect-card <?= !empty($profile['typing_effect']) ? 'active' : '' ?>" id="card-typing">
            <div class="effect-preview">
                <div class="preview-typewriter" id="tw-preview"></div>
            </div>
            <div class="effect-card-name">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11" style="color:var(--accent)"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                Typewriter Effect
            </div>
            <div class="effect-card-desc">Animates your display name letter by letter on your profile</div>
            <div class="effect-toggle-wrap">
                <span class="effect-toggle-text" id="lbl-typing"><?= !empty($profile['typing_effect']) ? 'Enabled' : 'Disabled' ?></span>
                <div class="effect-toggle-switch <?= !empty($profile['typing_effect']) ? 'active' : '' ?>"
                     id="sw-typing"
                     onclick="toggleEffect('typing_effect',this,'lbl-typing','card-typing')">
                    <div class="effect-toggle-knob"></div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- ══ 4. AVATAR RINGS & EFFECTS ═══════════════════════════════════════ -->
<div class="fx-section">
    <div class="fx-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="5"/></svg>
        Avatar Rings &amp; Effects
    </div>
    <?php $currentRing = $profile['avatar_ring'] ?? 'none'; ?>
    <div class="effects-grid">

        <!-- Accent Ring -->
        <div class="effect-card <?= $currentRing === 'normal' ? 'active' : '' ?>" id="card-ring-normal">
            <div class="effect-preview" style="overflow:visible">
                <div class="ring-preview-wrap">
                    <div class="ring-preview-shell rp-normal"><div class="ring-preview-spin rp-spin-accent"></div></div>
                    <div class="ring-preview-inner"></div>
                    <div class="ring-preview-avatar"></div>
                </div>
            </div>
            <div class="effect-card-name">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11" style="color:var(--accent)"><circle cx="12" cy="12" r="10"/></svg>
                Accent Ring
            </div>
            <div class="effect-card-desc">Spinning gradient ring using your profile accent colors</div>
            <div class="effect-toggle-wrap">
                <span class="effect-toggle-text" id="lbl-ring-normal"><?= $currentRing === 'normal' ? 'Enabled' : 'Disabled' ?></span>
                <div class="effect-toggle-switch <?= $currentRing === 'normal' ? 'active' : '' ?>"
                     id="sw-ring-normal"
                     onclick="toggleRing('normal',this,'lbl-ring-normal','card-ring-normal')">
                    <div class="effect-toggle-knob"></div>
                </div>
            </div>
        </div>

        <!-- Gold Ring -->
        <div class="effect-card <?= $currentRing === 'premium' ? 'active' : '' ?> <?= !$isPremium ? 'effect-locked' : '' ?>" id="card-ring-premium">
            <div class="effect-preview" style="overflow:visible">
                <div class="ring-preview-wrap">
                    <div class="ring-preview-shell rp-premium rp-glow"><div class="ring-preview-spin rp-spin-gold"></div></div>
                    <div class="ring-preview-inner" style="inset:5px"></div>
                    <div class="ring-preview-avatar"></div>
                    <div class="ring-preview-pulse"></div>
                </div>
            </div>
            <div class="effect-card-name">
                <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" width="11" height="11"><circle cx="12" cy="12" r="10"/></svg>
                Gold Ring
            </div>
            <div class="effect-card-desc">Shimmering golden ring with outer glow and pulse animation</div>
            <?php if ($isPremium): ?>
            <div class="effect-toggle-wrap">
                <span class="effect-toggle-text" id="lbl-ring-premium"><?= $currentRing === 'premium' ? 'Enabled' : 'Disabled' ?></span>
                <div class="effect-toggle-switch <?= $currentRing === 'premium' ? 'active' : '' ?>"
                     id="sw-ring-premium"
                     onclick="toggleRing('premium',this,'lbl-ring-premium','card-ring-premium')">
                    <div class="effect-toggle-knob"></div>
                </div>
            </div>
            <?php else: ?>
            <div class="premium-ring-lock">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16" style="color:#fbbf24"><path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.35)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" opacity=".8"/></svg>
                <span>Premium Only</span>
            </div>
            <?php endif; ?>
        </div>

        <!-- Purchased avatar effects (inline) -->
        <?php
        $avatarEffects = [
            'avatar_rocks'     => ['name'=>'Rock Ring',   'desc'=>'Rocks orbiting around your avatar frame',       'color'=>'#78716c'],
            'avatar_crown'     => ['name'=>'Crown 3D',    'desc'=>'Glowing 3D crown floating above your profile',  'color'=>'#ffd700'],
            'avatar_bloodrain' => ['name'=>'Blood Rain',  'desc'=>'Dark blood dripping down over your avatar',     'color'=>'#dc2626'],
            'avatar_darkeyes'  => ['name'=>'Dark Eyes',   'desc'=>'Eerie eyes appearing beside your avatar frame', 'color'=>'#7c3aed'],
        ];
        $activeAvatarId = $activeEffects['avatar'] ?? '';
        foreach ($avatarEffects as $effectId => $effect):
            $owned    = in_array($effectId, $purchasedEffects, true);
            $isActive = ($activeAvatarId === $effectId);
            $cardId   = 'card-pef-'.$effectId;
            $lblId    = 'lbl-pef-'.$effectId;
        ?>
        <div class="effect-card <?= $isActive ? 'active' : '' ?> <?= !$owned ? 'effect-locked' : '' ?>" id="<?= $cardId ?>">
            <div class="effect-preview pef-preview" data-effect="<?= $effectId ?>">
                <?php if (!$owned): ?>
                <div class="lock-overlay">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="26" height="26"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    <span>Not Owned</span>
                </div>
                <?php endif; ?>
            </div>
            <div class="effect-card-name" style="color:<?= $effect['color'] ?>">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:<?= $effect['color'] ?>;flex-shrink:0"></span>
                <?= htmlspecialchars($effect['name']) ?>
            </div>
            <div class="effect-card-desc"><?= htmlspecialchars($effect['desc']) ?></div>
            <?php if ($owned): ?>
            <div class="effect-toggle-wrap">
                <span class="effect-toggle-text" id="<?= $lblId ?>"><?= $isActive ? 'Enabled' : 'Disabled' ?></span>
                <div class="effect-toggle-switch pef-switch <?= $isActive ? 'active' : '' ?>"
                     id="sw-pef-<?= $effectId ?>"
                     data-type="avatar"
                     data-lbl="<?= $lblId ?>"
                     data-card="<?= $cardId ?>"
                     onclick="togglePurchasedEffect('<?= $effectId ?>','avatar',this,'<?= $lblId ?>','<?= $cardId ?>')">
                    <div class="effect-toggle-knob"></div>
                </div>
            </div>
            <?php else: ?>
            <a href="/dashboard/shop#effects" class="pef-buy-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                Buy in Shop
            </a>
            <?php endif; ?>
        </div>
        <?php endforeach; ?>

    </div>
</div>

<!-- ══ 5. PROFILE PICTURE SHAPE ══════════════════════════════════════ -->
<div class="fx-section">
    <div class="fx-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/></svg>
        Profile Picture Shape
    </div>
    <div class="shape-grid">
        <?php
        $currentShape = $profile['avatar_shape'] ?? 'circle';
        $shapes = [
            'square'  => ['label'=>'Square',   'cls'=>'sq'],
            'soft'    => ['label'=>'Soft',     'cls'=>'sft'],
            'rounded' => ['label'=>'Rounded',  'cls'=>'rnd'],
            'circle'  => ['label'=>'Circle',   'cls'=>'cir'],
            'eye'     => ['label'=>'Eye',      'cls'=>'eye'],
            'diamond' => ['label'=>'Diamond',  'cls'=>'dia'],
            'egg'     => ['label'=>'Egg',      'cls'=>'egg'],
        ];
        foreach ($shapes as $shapeKey => $s): ?>
        <div class="shape-card <?= $currentShape === $shapeKey ? 'selected' : '' ?>"
             onclick="selectShape(this,'<?= $shapeKey ?>')">
            <div class="shape-preview <?= $s['cls'] ?>"></div>
            <div class="shape-label"><?= $s['label'] ?></div>
        </div>
        <?php endforeach; ?>
    </div>
</div>

<script>
// ── Instant toggle — no Save button ──────────────────────────────────────────
function toggleEffect(field, switchEl, lblId, cardId) {
    const wasActive = switchEl.classList.contains('active');

    // Radio behavior: background group (particle_effect vs purchased bg effects)
    // Remember any active purchased bg effect so we can deactivate it on the server too
    let activeBgPurchased = null;
    if (field === 'particle_effect') {
        document.querySelectorAll('.pef-switch[data-type="bg"]').forEach(sw => {
            if (sw.classList.contains('active') && sw.dataset.effect) activeBgPurchased = sw.dataset.effect;
            sw.classList.remove('active');
            const lbl = document.getElementById(sw.dataset.lbl);
            const crd = document.getElementById(sw.dataset.card);
            if(lbl) lbl.textContent = 'Disabled';
            if(crd) crd.classList.remove('active');
        });
    }

    // Radio behavior: cursor group (cursor_trail vs purchased cursor effects)
    // Remember any active purchased cursor effect so we can deactivate it on the server too
    let activeCursorPurchased = null;
    if (field === 'cursor_trail') {
        document.querySelectorAll('.pef-switch[data-type="cursor"]').forEach(sw => {
            if (sw.classList.contains('active') && sw.dataset.effect) activeCursorPurchased = sw.dataset.effect;
            sw.classList.remove('active');
            const lbl = document.getElementById(sw.dataset.lbl);
            const crd = document.getElementById(sw.dataset.card);
            if(lbl) lbl.textContent = 'Disabled';
            if(crd) crd.classList.remove('active');
        });
    }

    switchEl.classList.toggle('active');
    const on = switchEl.classList.contains('active');
    document.getElementById(lblId).textContent = on ? 'Enabled' : 'Disabled';
    document.getElementById(cardId).classList.toggle('active', on);

    function saveFreeEffects() {
        const fd = new FormData();
        fd.append('action','effects-form');
        if (document.getElementById('sw-particles').classList.contains('active')) fd.append('particle_effect','1');
        if (document.getElementById('sw-cursor').classList.contains('active'))    fd.append('cursor_trail','1');
        if (document.getElementById('sw-typing').classList.contains('active'))    fd.append('typing_effect','1');
        fetch('/api/update_profile.php',{method:'POST',body:fd})
            .then(r=>r.json())
            .then(d=>{
                if(!d.success){
                    switchEl.classList.toggle('active');
                    const rev = switchEl.classList.contains('active');
                    document.getElementById(lblId).textContent = rev ? 'Enabled' : 'Disabled';
                    document.getElementById(cardId).classList.toggle('active', rev);
                } else {
                    setTimeout(() => location.reload(), 400);
                }
            }).catch(()=>{});
    }

    // If enabling a free effect that conflicts with a purchased one, deactivate the purchased one on server first
    const purchasedToKill = on && activeBgPurchased
        ? { id: activeBgPurchased, type: 'bg' }
        : on && activeCursorPurchased
        ? { id: activeCursorPurchased, type: 'cursor' }
        : null;

    if (purchasedToKill) {
        const fdP = new FormData();
        fdP.append('action', 'toggle_purchased_effect');
        fdP.append('effect_id', purchasedToKill.id);
        fdP.append('effect_type', purchasedToKill.type);
        fdP.append('enable', '0');
        fetch('/api/update_profile.php', {method:'POST', body:fdP})
            .then(() => saveFreeEffects())
            .catch(() => saveFreeEffects());
    } else {
        saveFreeEffects();
    }
}

// ── Avatar ring toggle (radio: only one active at a time) ─────────────────────
function toggleRing(type, switchEl, lblId, cardId) {
    const wasActive = switchEl.classList.contains('active');

    // Turn off both rings first
    ['normal','premium'].forEach(t => {
        const sw   = document.getElementById('sw-ring-' + t);
        const lbl  = document.getElementById('lbl-ring-' + t);
        const card = document.getElementById('card-ring-' + t);
        if (sw) {
            sw.classList.remove('active');
            lbl.textContent = 'Disabled';
            card.classList.remove('active');
        }
    });

    // Also deactivate any purchased avatar effects (same slot)
    document.querySelectorAll('.pef-switch[data-type="avatar"]').forEach(sw => {
        sw.classList.remove('active');
        const lbl = document.getElementById(sw.dataset.lbl);
        const crd = document.getElementById(sw.dataset.card);
        if(lbl) lbl.textContent = 'Disabled';
        if(crd) crd.classList.remove('active');
    });

    // If it wasn't active before, turn this one on
    const newRing = wasActive ? 'none' : type;
    if (!wasActive) {
        switchEl.classList.add('active');
        document.getElementById(lblId).textContent = 'Enabled';
        document.getElementById(cardId).classList.add('active');
    }

    const fd = new FormData();
    fd.append('action', 'effects-form');
    if (document.getElementById('sw-particles').classList.contains('active')) fd.append('particle_effect','1');
    if (document.getElementById('sw-cursor').classList.contains('active'))    fd.append('cursor_trail','1');
    if (document.getElementById('sw-typing').classList.contains('active'))    fd.append('typing_effect','1');
    fd.append('avatar_ring', newRing);

    fetch('/api/update_profile.php',{method:'POST',body:fd})
        .then(r=>r.json())
        .then(d=>{
            if(!d.success){
                // revert on error
                switchEl.classList.toggle('active');
                const rev = switchEl.classList.contains('active');
                document.getElementById(lblId).textContent = rev ? 'Enabled' : 'Disabled';
                document.getElementById(cardId).classList.toggle('active', rev);
            } else {
                setTimeout(() => location.reload(), 400);
            }
        }).catch(()=>{});
}

// ── Avatar shape — instant ────────────────────────────────────────────────────
function selectShape(card, shape) {
    document.querySelectorAll('.shape-card').forEach(c=>c.classList.remove('selected'));
    card.classList.add('selected');
    const fd = new FormData();
    fd.append('action','save_avatar_shape');
    fd.append('avatar_shape', shape);
    fetch('/api/update_profile.php',{method:'POST',body:fd}).catch(()=>{});
}

// ── Particles canvas preview ──────────────────────────────────────────────────
(function(){
    const canvas=document.getElementById('particles-canvas');
    const ctx=canvas.getContext('2d');
    let W,H,stars=[];
    function resize(){ const r=canvas.parentElement.getBoundingClientRect(); W=canvas.width=r.width; H=canvas.height=r.height; }
    function mk(){ return {x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.2+.3,a:Math.random(),da:(Math.random()*.008+.003)*(Math.random()<.5?1:-1),sh:Math.random()<.05,sx:0,sy:0,sl:0}; }
    function init(){ stars=[]; for(let i=0;i<50;i++) stars.push(mk()); }
    function draw(){
        ctx.clearRect(0,0,W,H);
        for(const s of stars){
            s.a+=s.da; if(s.a<=0||s.a>=1) s.da*=-1;
            if(s.sh){
                s.sx+=2.2;s.sy+=.7;s.sl++;
                ctx.save();ctx.globalAlpha=Math.max(0,1-s.sl/45);ctx.strokeStyle='rgba(0,212,255,.85)';ctx.lineWidth=1;
                ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x+s.sx,s.y+s.sy);ctx.stroke();ctx.restore();
                if(s.sl>45){Object.assign(s,mk());s.sh=Math.random()<.05;s.sx=s.sy=s.sl=0;}
            } else {
                ctx.save();ctx.globalAlpha=s.a;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();ctx.restore();
            }
        }
        requestAnimationFrame(draw);
    }
    resize();init();draw();
})();

// ── Cursor trail preview ──────────────────────────────────────────────────────
(function(){
    const wrap=document.getElementById('cursor-preview');
    const colors=['#00d4ff','#ff4dff','#ffd700','#00ffb8','#ff6b6b','#a78bfa','#fb923c'];
    for(let i=0;i<9;i++){
        const d=document.createElement('div');
        d.className='cursor-dot';
        const sz=Math.max(5,16-i*1.3);
        d.style.cssText=`width:${sz}px;height:${sz}px;background:${colors[i%colors.length]};left:50%;top:50%;opacity:0;animation:ct-move ${2+i*.2}s ease-in-out ${i*.16}s infinite;`;
        wrap.appendChild(d);
    }
    const st=document.createElement('style');
    st.textContent=`@keyframes ct-move{0%{transform:translate(-50%,-50%) translate(-55px,10px);opacity:1}25%{transform:translate(-50%,-50%) translate(-10px,-35px);opacity:.85}50%{transform:translate(-50%,-50%) translate(50px,5px);opacity:.65}75%{transform:translate(-50%,-50%) translate(15px,35px);opacity:.4}100%{transform:translate(-50%,-50%) translate(-55px,10px);opacity:0}}`;
    document.head.appendChild(st);
})();

// ── Typewriter preview ────────────────────────────────────────────────────────
(function(){
    const el=document.getElementById('tw-preview');
    const text=<?= json_encode(!empty($profile['display_name']) ? $profile['display_name'] : 'Zeus') ?>;
    let i=0,del=false,p=0;
    function tick(){
        if(p>0){p--;setTimeout(tick,80);return;}
        if(!del){el.innerHTML=text.slice(0,++i)+'<span class="cursor-blink"></span>';if(i>=text.length){p=22;del=true;}}
        else    {el.innerHTML=text.slice(0,--i)+'<span class="cursor-blink"></span>';if(i<=0){p=10;del=false;}}
        setTimeout(tick,del?60:110);
    }
    tick();
})();

// ── Purchased-effect toggle ────────────────────────────────────────────────────
function togglePurchasedEffect(effectId, effectType, switchEl, lblId, cardId) {
    const wasActive = switchEl.classList.contains('active');
    // Radio within same type: deactivate others
    document.querySelectorAll(`.pef-switch[data-type="${effectType}"]`).forEach(sw => {
        sw.classList.remove('active');
        const lbl = document.getElementById(sw.dataset.lbl);
        const crd = document.getElementById(sw.dataset.card);
        if(lbl) lbl.textContent = 'Disabled';
        if(crd) crd.classList.remove('active');
    });

    // If bg effect: also deactivate free particle_effect
    if (effectType === 'bg') {
        const swP = document.getElementById('sw-particles');
        const lblP = document.getElementById('lbl-particles');
        const crdP = document.getElementById('card-particles');
        if(swP) { swP.classList.remove('active'); if(lblP) lblP.textContent='Disabled'; if(crdP) crdP.classList.remove('active'); }
    }

    // If cursor effect: also deactivate free cursor_trail
    if (effectType === 'cursor') {
        const swC = document.getElementById('sw-cursor');
        const lblC = document.getElementById('lbl-cursor');
        const crdC = document.getElementById('card-cursor');
        if(swC) { swC.classList.remove('active'); if(lblC) lblC.textContent='Disabled'; if(crdC) crdC.classList.remove('active'); }
    }

    // If avatar effect: also deactivate rings (same slot)
    if (effectType === 'avatar') {
        ['normal','premium'].forEach(t => {
            const sw   = document.getElementById('sw-ring-' + t);
            const lbl  = document.getElementById('lbl-ring-' + t);
            const card = document.getElementById('card-ring-' + t);
            if (sw) { sw.classList.remove('active'); if(lbl) lbl.textContent='Disabled'; if(card) card.classList.remove('active'); }
        });
    }

    const enable = wasActive ? 0 : 1;
    if (enable) {
        switchEl.classList.add('active');
        document.getElementById(lblId).textContent = 'Enabled';
        document.getElementById(cardId).classList.add('active');
    }

    // When activating a bg purchased effect, we must also persist particle_effect=0
    // When activating a cursor purchased effect, we must also persist cursor_trail=0
    // We do this with a chained free-effects save first, then the purchased toggle.
    const freeUpdateNeeded =
        (effectType === 'bg'     && enable && document.getElementById('sw-particles') && !document.getElementById('sw-particles').classList.contains('active')) ||
        (effectType === 'cursor' && enable && document.getElementById('sw-cursor')    && !document.getElementById('sw-cursor').classList.contains('active'));

    function doPurchasedToggle() {
        const fd = new FormData();
        fd.append('action', 'toggle_purchased_effect');
        fd.append('effect_id', effectId);
        fd.append('effect_type', effectType);
        fd.append('enable', enable);
        fetch('/api/update_profile.php', {method:'POST', body:fd})
            .then(r => r.json())
            .then(d => { if (d && d.success) setTimeout(() => location.reload(), 400); })
            .catch(()=>{});
    }

    if (freeUpdateNeeded) {
        // Persist the free-effect disable first, then toggle the purchased effect
        const fdFree = new FormData();
        fdFree.append('action', 'effects-form');
        // particle_effect and cursor_trail are both already visually off at this point
        // (we removed 'active' above), so we intentionally send neither as '1'
        fetch('/api/update_profile.php', {method:'POST', body:fdFree})
            .then(r => r.json())
            .then(() => doPurchasedToggle())
            .catch(() => doPurchasedToggle());
    } else {
        doPurchasedToggle();
    }
}
</script>


<script>
// ── Mini preview animations for purchased effects ─────────────────────────────
(function(){
    const previews = document.querySelectorAll('.pef-preview');
    previews.forEach(el => {
        const id = el.dataset.effect;
        const canvas = document.createElement('canvas');
        el.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        let W, H;
        function resize() {
            const r = el.getBoundingClientRect();
            W = canvas.width  = r.width  || 205;
            H = canvas.height = r.height || 98;
        }
        resize();
        new ResizeObserver(resize).observe(el);

        // Each effect has its own mini renderer
        const renderers = {
            cursor_smoke: function(ctx,W,H,t){
                ctx.clearRect(0,0,W,H);
                for(let i=0;i<12;i++){
                    const a=((t*0.4+i*30)%360)*Math.PI/180;
                    const x=W/2+Math.cos(a)*18+Math.cos(a*1.7)*10;
                    const y=H/2+Math.sin(a)*12;
                    const sz=3+Math.abs(Math.sin(t*0.02+i))*6;
                    const op=0.15+Math.abs(Math.sin(t*0.015+i*0.5))*0.3;
                    ctx.save();ctx.globalAlpha=op;ctx.fillStyle='#aaa';
                    ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.fill();ctx.restore();
                }
            },
            cursor_fire: function(ctx,W,H,t){
                ctx.clearRect(0,0,W,H);
                for(let i=0;i<18;i++){
                    const age=(t*2+i*20)%100;
                    const x=W/2+(Math.sin(i*1.7+t*0.03)*22)*(1-age/100);
                    const y=H/2+10-age*0.7;
                    const sz=(7-age*0.05)*0.8;
                    const r=255,g=Math.floor(50+age*2),b=0;
                    const op=Math.max(0,(1-age/100)*0.85);
                    ctx.save();ctx.globalAlpha=op;ctx.fillStyle=`rgb(${r},${g},${b})`;
                    ctx.beginPath();ctx.arc(x,y,Math.max(.5,sz),0,Math.PI*2);ctx.fill();ctx.restore();
                }
            },
            cursor_soundwave: function(ctx,W,H,t){
                ctx.clearRect(0,0,W,H);
                for(let i=0;i<4;i++){
                    const r=((t+i*25)%100)*0.65;
                    const op=Math.max(0,1-r/65)*0.7;
                    ctx.save();ctx.globalAlpha=op;ctx.strokeStyle='#00d4ff';ctx.lineWidth=1.5;
                    ctx.beginPath();ctx.arc(W/2,H/2,r,0,Math.PI*2);ctx.stroke();ctx.restore();
                }
            },
            cursor_meteors: function(ctx,W,H,t){
                ctx.clearRect(0,0,W,H);
                for(let i=0;i<6;i++){
                    const prog=((t*1.5+i*17)%100)/100;
                    const x=5+prog*(W-10);
                    const y=10+prog*(H-20);
                    ctx.save();ctx.globalAlpha=1-prog;
                    ctx.strokeStyle='#ffd700';ctx.lineWidth=1.5;
                    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-prog*25,y-prog*15);ctx.stroke();
                    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill();
                    ctx.restore();
                }
            },
            cursor_leaves: function(ctx,W,H,t){
                ctx.clearRect(0,0,W,H);
                const colors=['#4caf50','#8bc34a','#cddc39','#66bb6a'];
                for(let i=0;i<8;i++){
                    const a=(t*0.5+i*45)*Math.PI/180;
                    const r=25+Math.sin(t*0.03+i)*8;
                    const x=W/2+Math.cos(a)*r;
                    const y=H/2+Math.sin(a)*r*0.6;
                    ctx.save();ctx.globalAlpha=0.8;ctx.fillStyle=colors[i%colors.length];
                    ctx.translate(x,y);ctx.rotate(a+t*0.02);
                    ctx.beginPath();ctx.ellipse(0,0,5,3,0,0,Math.PI*2);ctx.fill();
                    ctx.restore();
                }
            },
            cursor_water: function(ctx,W,H,t){
                ctx.clearRect(0,0,W,H);
                for(let i=0;i<10;i++){
                    const age=((t*1.8+i*10)%100);
                    const x=W/2+(Math.sin(i*0.9+t*0.02)*20)*(1-age/100);
                    const y=H/2+age*0.35-10;
                    const sz=Math.max(.5,4*(1-age/100));
                    const op=Math.max(0,(1-age/100)*0.9);
                    ctx.save();ctx.globalAlpha=op;ctx.fillStyle='#0ea5e9';
                    ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.fill();ctx.restore();
                }
            },
            cursor_shadow: function(ctx,W,H,t){
                ctx.clearRect(0,0,W,H);
                const cx=W/2,cy=H/2;
                const souls=[
                    {ox:-22,oy:8,phase:0},
                    {ox:20,oy:-12,phase:1.8},
                    {ox:5,oy:20,phase:3.6},
                    {ox:-10,oy:-18,phase:2.5},
                    {ox:28,oy:14,phase:4.8},
                ];
                souls.forEach(function(s){
                    const drift=Math.sin(t*0.035+s.phase);
                    const bob=Math.cos(t*0.028+s.phase)*4;
                    const sx=cx+s.ox+drift*5;
                    const sy=cy+s.oy+bob;
                    const pulse=0.7+Math.sin(t*0.05+s.phase)*0.3;
                    ctx.save();
                    ctx.globalAlpha=0.18*pulse;
                    const g=ctx.createRadialGradient(sx,sy,0,sx,sy,10);
                    g.addColorStop(0,'#a8edff');g.addColorStop(1,'transparent');
                    ctx.fillStyle=g;ctx.beginPath();ctx.arc(sx,sy,10,0,Math.PI*2);ctx.fill();ctx.restore();
                    ctx.save();
                    ctx.globalAlpha=0.88*pulse;
                    ctx.shadowColor='#7ee8fa';ctx.shadowBlur=10;
                    ctx.fillStyle='#a8edff';
                    ctx.beginPath();
                    ctx.ellipse(sx,sy,4,5.5,drift*0.3,0,Math.PI*2);
                    ctx.fill();
                    ctx.fillStyle='#1a0a2e';
                    ctx.globalAlpha=0.9*pulse;
                    ctx.beginPath();ctx.arc(sx-1.5,sy-1,1,0,Math.PI*2);ctx.fill();
                    ctx.beginPath();ctx.arc(sx+1.5,sy-1,1,0,Math.PI*2);ctx.fill();
                    ctx.restore();
                    for(let d=1;d<=3;d++){
                        ctx.save();
                        ctx.globalAlpha=(0.45-d*0.12)*pulse;
                        ctx.fillStyle='#a8edff';
                        ctx.shadowColor='#7ee8fa';ctx.shadowBlur=6;
                        ctx.beginPath();ctx.arc(sx+(drift*d*0.4),sy+5+d*4,2.2-d*0.5,0,Math.PI*2);ctx.fill();
                        ctx.restore();
                    }
                });
                ctx.save();ctx.globalAlpha=0.06;
                const fg=ctx.createRadialGradient(cx,cy,0,cx,cy,38);
                fg.addColorStop(0,'#a8edff');fg.addColorStop(1,'transparent');
                ctx.fillStyle=fg;ctx.beginPath();ctx.arc(cx,cy,38,0,Math.PI*2);ctx.fill();ctx.restore();
            },
            avatar_rocks: function(ctx,W,H,t){
                ctx.clearRect(0,0,W,H);
                const cx=W/2,cy=H/2;
                ctx.save();ctx.globalAlpha=0.25;ctx.strokeStyle='#78716c';ctx.lineWidth=1;
                ctx.beginPath();ctx.arc(cx,cy,28,0,Math.PI*2);ctx.stroke();ctx.restore();
                for(let i=0;i<6;i++){
                    const a=(t*0.8+i*60)*Math.PI/180;
                    const x=cx+Math.cos(a)*28,y=cy+Math.sin(a)*28;
                    ctx.save();ctx.fillStyle='#a8a29e';ctx.globalAlpha=0.9;
                    ctx.translate(x,y);ctx.rotate(a);
                    ctx.beginPath();ctx.ellipse(0,0,4,3,0,0,Math.PI*2);ctx.fill();ctx.restore();
                }
            },
            avatar_crown: function(ctx,W,H,t){
                ctx.clearRect(0,0,W,H);
                const cx=W/2;
                const bob=Math.sin(t*0.04)*2.5;
                const baseY=H*0.28-bob;
                const s=Math.min(W,H)*0.13;

                // glow redus ~40%
                const glowR=s*1.0;
                const pulse=0.12+Math.sin(t*0.05)*0.05;
                const grd=ctx.createRadialGradient(cx,baseY,0,cx,baseY,glowR);
                grd.addColorStop(0,`rgba(255,200,0,${pulse})`);
                grd.addColorStop(1,'transparent');
                ctx.save();ctx.fillStyle=grd;ctx.beginPath();ctx.arc(cx,baseY,glowR,0,Math.PI*2);ctx.fill();ctx.restore();

                const bH=s*0.3, bY=baseY+s*0.45;
                const bL=cx-s, bR=cx+s;
                const lx=cx-s*0.6, rx=cx+s*0.6;
                const cSH=s*1.05, sSH=s*0.68;
                const cSW=s*0.27, sSW=s*0.21;

                const mf=ctx.createLinearGradient(cx,bY-cSH,cx,bY+bH);
                mf.addColorStop(0,'rgba(255,240,90,0.95)');
                mf.addColorStop(0.25,'rgba(255,205,20,0.92)');
                mf.addColorStop(0.65,'rgba(200,145,0,0.88)');
                mf.addColorStop(1,'rgba(150,100,0,0.82)');

                ctx.save();
                ctx.shadowColor='#ffc200';ctx.shadowBlur=7;
                ctx.strokeStyle='#b8860b';ctx.lineWidth=1.5;ctx.globalAlpha=0.98;
                ctx.fillStyle=mf;
                ctx.beginPath();
                ctx.moveTo(bL,bY+bH);ctx.lineTo(bL,bY);
                ctx.lineTo(lx-sSW/2,bY);ctx.lineTo(lx-sSW/2,bY-sSH);
                ctx.lineTo(lx+sSW/2,bY-sSH);ctx.lineTo(lx+sSW/2,bY);
                ctx.lineTo(cx-cSW/2,bY);ctx.lineTo(cx-cSW/2,bY-cSH);
                ctx.lineTo(cx+cSW/2,bY-cSH);ctx.lineTo(cx+cSW/2,bY);
                ctx.lineTo(rx-sSW/2,bY);ctx.lineTo(rx-sSW/2,bY-sSH);
                ctx.lineTo(rx+sSW/2,bY-sSH);ctx.lineTo(rx+sSW/2,bY);
                ctx.lineTo(bR,bY);ctx.lineTo(bR,bY+bH);
                ctx.closePath();ctx.fill();ctx.stroke();
                ctx.restore();

                ctx.save();ctx.globalAlpha=0.12;
                const sh=ctx.createLinearGradient(bL,0,bR,0);
                sh.addColorStop(0,'transparent');sh.addColorStop(0.42,'rgba(255,255,220,0.9)');
                sh.addColorStop(0.58,'rgba(255,255,220,0.9)');sh.addColorStop(1,'transparent');
                ctx.fillStyle=sh;ctx.fillRect(bL,bY-cSH,s*2,cSH+bH);ctx.restore();

                const orbR=s*0.13;
                [{x:lx,y:bY-sSH,c:'#c084fc',gc:'#7e22ce'},
                 {x:cx,y:bY-cSH,c:'#fbbf24',gc:'#b45309'},
                 {x:rx,y:bY-sSH,c:'#60a5fa',gc:'#1d4ed8'}].forEach(({x,y,c,gc})=>{
                    ctx.save();
                    ctx.shadowColor=gc;ctx.shadowBlur=9;ctx.globalAlpha=0.97;
                    const og=ctx.createRadialGradient(x-orbR*0.35,y-orbR*0.38,orbR*0.08,x,y,orbR);
                    og.addColorStop(0,'rgba(255,255,255,0.75)');
                    og.addColorStop(0.35,c);og.addColorStop(1,gc);
                    ctx.fillStyle=og;ctx.beginPath();ctx.arc(x,y,orbR,0,Math.PI*2);ctx.fill();
                    ctx.strokeStyle=gc;ctx.lineWidth=0.8;ctx.stroke();ctx.restore();
                });

                ctx.save();ctx.shadowColor='#ff4444';ctx.shadowBlur=7;ctx.globalAlpha=0.92;
                ctx.fillStyle='#f87171';const gx=cx,gy=bY+bH*0.5;
                ctx.beginPath();ctx.moveTo(gx,gy-4);ctx.lineTo(gx+3,gy);ctx.lineTo(gx,gy+4);ctx.lineTo(gx-3,gy);ctx.closePath();ctx.fill();
                ctx.fillStyle='rgba(255,255,255,0.65)';ctx.shadowBlur=0;
                ctx.beginPath();ctx.arc(gx-0.8,gy-1.3,1,0,Math.PI*2);ctx.fill();ctx.restore();
            },

            avatar_bloodrain: function(ctx,W,H,t){
                ctx.clearRect(0,0,W,H);
                const cx=W/2,cy=H/2;
                const R=Math.min(W,H)*0.38;
                // ── Blood ring — rosu/visinui/portocaliu, fara curcubeu ──
                const segments=80;
                for(let i=0;i<segments;i++){
                    const a1=(i/segments)*Math.PI*2;
                    const a2=((i+1)/segments)*Math.PI*2;
                    // paleta: rosu inchis -> visinui -> portocaliu-rosu, animat lent
                    const cycle=(i/segments+t*0.004)%1;
                    const hue= cycle<0.5
                        ? 0  + cycle*2*20        // rosu 0 -> 20 (portocaliu-rosu)
                        : 20 - (cycle-0.5)*2*20; // inapoi 20 -> 0
                    const sat=88+Math.sin(cycle*Math.PI*2+t*0.03)*6;
                    const light=22+Math.sin((i/segments)*Math.PI*4+t*0.05)*8;
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(cx,cy,R,a1,a2);
                    ctx.arc(cx,cy,R-5,a2,a1,true);
                    ctx.closePath();
                    ctx.fillStyle='hsl('+hue+','+sat+'%,'+light+'%)';
                    ctx.globalAlpha=0.95;
                    ctx.fill();
                    ctx.restore();
                }
                // glow exterior rosu
                ctx.save();
                ctx.strokeStyle='rgba(180,20,20,0.5)';
                ctx.lineWidth=5;ctx.shadowColor='#b01414';ctx.shadowBlur=16;
                ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.stroke();
                ctx.restore();
                // glow interior portocaliu subtil
                ctx.save();
                ctx.strokeStyle='rgba(220,80,20,0.25)';
                ctx.lineWidth=3;ctx.shadowColor='#dc5014';ctx.shadowBlur=8;
                ctx.beginPath();ctx.arc(cx,cy,R-5,0,Math.PI*2);ctx.stroke();
                ctx.restore();
                // ── Picaturi de sange — curg vertical in jos de pe inel ──
                const dropCount=10;
                for(let i=0;i<dropCount;i++){
                    const spawnAngle=(i/dropCount)*Math.PI*2;
                    if(Math.sin(spawnAngle)<-0.15) continue; // doar de la mijloc in jos si laterale
                    const sx=cx+Math.cos(spawnAngle)*R;
                    const sy=cy+Math.sin(spawnAngle)*R;
                    const prog=((t*0.7+i*9.3)%100)/100;
                    const maxDrop=Math.min(W,H)*0.38; // cad maxim pana la marginea canvas
                    const dy=prog*maxDrop;
                    const op=Math.max(0,Math.min(1,(1-prog)*2.5));
                    // grosimea picaturii descreste pe masura ce cade
                    const thick=2.5*(1-prog*0.5);
                    const dropLen=5+Math.sin(i*1.9)*2;
                    // culoare: rosu inchis spre visinui
                    const dHue=i%3===0?15:i%3===1?5:0;
                    ctx.save();
                    ctx.globalAlpha=op;
                    ctx.shadowColor='#8b0000';ctx.shadowBlur=5;
                    // tija
                    ctx.strokeStyle='hsl('+dHue+',85%,28%)';
                    ctx.lineWidth=thick;ctx.lineCap='round';
                    ctx.beginPath();ctx.moveTo(sx,sy+dy);ctx.lineTo(sx,sy+dy+dropLen);ctx.stroke();
                    // blob la capat
                    ctx.fillStyle='hsl('+dHue+',80%,22%)';
                    ctx.beginPath();ctx.ellipse(sx,sy+dy+dropLen,thick*0.9,thick*1.4,0,0,Math.PI*2);ctx.fill();
                    ctx.restore();
                }
            },
            avatar_darkeyes: function(ctx,W,H,t){
                ctx.clearRect(0,0,W,H);
                const cx=W/2, cy=H/2;
                const R = Math.min(W,H)*0.32;

                // Orbit ring
                ctx.save();
                ctx.strokeStyle='rgba(124,58,237,0.5)';
                ctx.lineWidth=1.2;
                ctx.shadowColor='#7c3aed';ctx.shadowBlur=8;
                ctx.setLineDash([3,5]);
                ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.stroke();
                ctx.setLineDash([]);ctx.restore();

                function drawEye(ex,ey,angle,blinkP,sc){
                    const ew=W*0.1*sc, eh=ew*0.42;
                    const bSY=1-blinkP*0.96;
                    ctx.save();ctx.translate(ex,ey);ctx.rotate(angle+Math.PI/2);ctx.scale(1,bSY);
                    // glow
                    const g=ctx.createRadialGradient(0,0,ew*0.2,0,0,ew*1.2);
                    g.addColorStop(0,'rgba(124,58,237,0.3)');g.addColorStop(1,'transparent');
                    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,ew*1.2,eh*1.2,0,0,Math.PI*2);ctx.fill();
                    // iris
                    ctx.save();ctx.shadowColor='#7c3aed';ctx.shadowBlur=10;ctx.fillStyle='#6d28d9';
                    ctx.beginPath();ctx.moveTo(-ew,0);ctx.bezierCurveTo(-ew,-eh*1.5,ew,-eh*1.5,ew,0);ctx.bezierCurveTo(ew,eh*1.5,-ew,eh*1.5,-ew,0);ctx.fill();ctx.restore();
                    // pupil slit
                    ctx.save();ctx.fillStyle='#0a0010';
                    const ph=eh*0.82,pw=ew*0.13;
                    ctx.beginPath();ctx.moveTo(0,-ph);ctx.bezierCurveTo(pw,-ph*0.4,pw,ph*0.4,0,ph);ctx.bezierCurveTo(-pw,ph*0.4,-pw,-ph*0.4,0,-ph);ctx.fill();ctx.restore();
                    // outline
                    ctx.save();ctx.strokeStyle='rgba(109,40,217,0.8)';ctx.lineWidth=1;
                    ctx.beginPath();ctx.moveTo(-ew,0);ctx.bezierCurveTo(-ew,-eh*1.5,ew,-eh*1.5,ew,0);ctx.bezierCurveTo(ew,eh*1.5,-ew,eh*1.5,-ew,0);ctx.stroke();ctx.restore();
                    ctx.restore();
                }

                const a1=t*0.005, a2=a1+Math.PI;
                const b1=Math.max(0,Math.sin(t*0.07)>0.96?(Math.sin(t*0.07)-0.96)/0.04:0);
                const b2=Math.max(0,Math.sin(t*0.07+Math.PI)>0.96?(Math.sin(t*0.07+Math.PI)-0.96)/0.04:0);
                drawEye(cx+Math.cos(a1)*R, cy+Math.sin(a1)*R, a1, b1, 1);
                drawEye(cx+Math.cos(a2)*R, cy+Math.sin(a2)*R, a2, b2, 0.85);
            },
            bg_fallingleaves: (()=>{
                const N=14,seeds=Array.from({length:N},(_,i)=>({xBase:Math.random(),phase:Math.random()*100,speed:0.22+Math.random()*0.28,swayAmp:10+Math.random()*14,swayFreq:0.02+Math.random()*0.02,rotSpeed:(Math.random()<0.5?1:-1)*(0.025+Math.random()*0.04),sz:3+Math.random()*3.5,ci:i%5,so:Math.random()*Math.PI*2}));
                const colors=['#84cc16','#65a30d','#a3e635','#fbbf24','#86efac'];
                function leaf(ctx,sz,col){ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(0,-sz);ctx.bezierCurveTo(sz*0.9,-sz*0.3,sz*0.9,sz*0.6,0,sz);ctx.bezierCurveTo(-sz*0.9,sz*0.6,-sz*0.9,-sz*0.3,0,-sz);ctx.fill();ctx.strokeStyle='rgba(0,0,0,0.15)';ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(0,-sz*0.8);ctx.lineTo(0,sz*0.8);ctx.stroke();}
                function branch(ctx,W,H){ctx.save();ctx.translate(W,0);ctx.strokeStyle='rgba(101,163,13,0.5)';ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-W*0.09,H*0.06,-W*0.17,H*0.13,-W*0.28,H*0.18);ctx.stroke();[[0.3,-0.55,W*0.06,1.6],[0.55,-0.9,W*0.07,1.4],[0.78,-0.45,W*0.045,1.2]].forEach(([t,ang,len,lw])=>{const mt=1-t,px=mt*mt*mt*0+3*mt*mt*t*(-W*0.09)+3*mt*t*t*(-W*0.17)+t*t*t*(-W*0.28),py=mt*mt*mt*0+3*mt*mt*t*(H*0.06)+3*mt*t*t*(H*0.13)+t*t*t*(H*0.18);ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+Math.cos(ang)*len,py+Math.sin(ang+1.2)*len);ctx.stroke();ctx.save();ctx.translate(px+Math.cos(ang)*len*0.9,py+Math.sin(ang+1.2)*len*0.9);ctx.rotate(ang-Math.PI/2);ctx.globalAlpha=0.65;leaf(ctx,lw*2.8,'#84cc16');ctx.restore();});ctx.restore();}
                return function(ctx,W,H,t){ctx.clearRect(0,0,W,H);branch(ctx,W,H);for(let i=0;i<N;i++){const s=seeds[i],prog=((t*s.speed+s.phase)%100)/100,y=prog*(H+30)-15,x=(s.xBase*W+Math.sin(t*s.swayFreq+s.so)*s.swayAmp+W)%W,fi=Math.min(1,prog*12),fo=Math.min(1,(1-prog)*8);ctx.save();ctx.globalAlpha=0.7*fi*fo;ctx.translate(x,y);ctx.rotate(t*s.rotSpeed+s.phase);leaf(ctx,s.sz,colors[s.ci]);ctx.restore();}};
            })(),
            bg_underwater: (()=>{
                const BC=10;let bb=null;
                function init(W){bb=Array.from({length:BC},()=>({x:Math.random()*W,wo:Math.random()*Math.PI*2,sp:0.3+Math.random()*0.5,r:1.5+Math.random()*3.5,ph:Math.random()*100,pa:0.08+Math.random()*0.22,pop:false,pt:0,px:0,py:0}));}
                return function(ctx,W,H,t){
                    ctx.clearRect(0,0,W,H);
                    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(3,105,161,0.18)');g.addColorStop(1,'rgba(7,89,133,0.05)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
                    if(!bb) init(W);
                    for(let i=0;i<bb.length;i++){
                        const b=bb[i],prog=((t*b.sp+b.ph)%100)/100,ry=H*(1-prog),bx=(b.x+Math.sin(prog*Math.PI*3+b.wo)*16+W)%W;
                        if(!b.pop&&prog>=(1-b.pa)){b.pop=true;b.pt=0;b.px=bx;b.py=ry;}
                        if(b.pop){b.pt++;const pt=b.pt/16;if(pt<=1){const pr=b.r*(1+pt*3);ctx.save();ctx.globalAlpha=(1-pt)*0.5;ctx.strokeStyle='#bae6fd';ctx.lineWidth=1;ctx.beginPath();ctx.arc(b.px,b.py,pr,0,Math.PI*2);ctx.stroke();ctx.restore();for(let d=0;d<4;d++){const da=b.wo+d*Math.PI/2,dx=b.px+Math.cos(da)*pr*0.9,dy=b.py+Math.sin(da)*pr*0.9;ctx.save();ctx.globalAlpha=(1-pt)*0.45;ctx.fillStyle='#7dd3fc';ctx.beginPath();ctx.arc(dx,dy,Math.max(0.4,b.r*0.2*(1-pt)),0,Math.PI*2);ctx.fill();ctx.restore();}}else{b.x=Math.random()*W;b.wo=Math.random()*Math.PI*2;b.sp=0.3+Math.random()*0.5;b.r=1.5+Math.random()*3.5;b.ph=Math.random()*100;b.pa=0.08+Math.random()*0.22;b.pop=false;b.pt=0;}}
                        else{const al=prog<0.08?prog/0.08:prog>0.88?(1-prog)/0.12:1;ctx.save();ctx.globalAlpha=al*0.6;ctx.strokeStyle='#7dd3fc';ctx.lineWidth=1;ctx.shadowColor='#38bdf8';ctx.shadowBlur=5;ctx.beginPath();ctx.arc(bx,ry,b.r,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=al*0.16;ctx.fillStyle='#e0f2fe';ctx.beginPath();ctx.arc(bx-b.r*0.28,ry-b.r*0.28,b.r*0.36,0,Math.PI*2);ctx.fill();ctx.restore();}
                    }
                };
            })(),
            bg_gas: function(ctx,W,H,t){
                ctx.clearRect(0,0,W,H);
                for(let i=0;i<6;i++){
                    const x=W/2+Math.cos(t*0.012+i*60*Math.PI/180)*W*0.28;
                    const y=H/2+Math.sin(t*0.015+i*60*Math.PI/180)*H*0.3;
                    const r=22+Math.sin(t*0.02+i)*8;
                    ctx.save();ctx.globalAlpha=0.08;
                    const g=ctx.createRadialGradient(x,y,0,x,y,r);
                    g.addColorStop(0,'#a78bfa');g.addColorStop(1,'transparent');
                    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();
                }
            },
            bg_fireworks: (() => {
                const bursts = [];
                const COLORS = ['#ffd700','#f97316','#ef4444','#a78bfa','#34d399','#60a5fa','#f472b6'];
                let lastBurst = 0;
                function spawnBurst(W, H) {
                    const x = W * (0.15 + Math.random() * 0.7);
                    const y = H * (0.1  + Math.random() * 0.6);
                    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
                    const count = 18 + Math.floor(Math.random() * 10);
                    const speed = 1.5 + Math.random() * 1.8;
                    const particles = [];
                    for (let i = 0; i < count; i++) {
                        const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
                        const s = speed * (0.5 + Math.random() * 0.8);
                        particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 0.8, life: 1, trail: [] });
                    }
                    bursts.push({ particles, color, life: 1, maxLife: 55 + Math.floor(Math.random() * 20) });
                }
                return function(ctx, W, H, t) {
                    ctx.clearRect(0, 0, W, H);
                    if (t - lastBurst > 70 || bursts.length === 0) {
                        if (bursts.length < 4) { spawnBurst(W, H); lastBurst = t; }
                    }
                    if (bursts.length < 2 && t - lastBurst > 35) { spawnBurst(W, H); }
                    for (let b = bursts.length - 1; b >= 0; b--) {
                        const burst = bursts[b];
                        burst.life -= 1 / burst.maxLife;
                        if (burst.life <= 0) { bursts.splice(b, 1); continue; }
                        for (let p of burst.particles) {
                            p.trail.push({ x: p.x, y: p.y });
                            if (p.trail.length > 4) p.trail.shift();
                            p.x += p.vx; p.y += p.vy;
                            p.vx *= 0.97; p.vy = p.vy * 0.97 + 0.1;
                            p.life = burst.life;
                        }
                        for (let p of burst.particles) {
                            if (p.trail.length > 1) {
                                ctx.save();
                                ctx.strokeStyle = burst.color;
                                ctx.lineWidth = 1;
                                ctx.globalAlpha = p.life * 0.3;
                                ctx.beginPath();
                                ctx.moveTo(p.trail[0].x, p.trail[0].y);
                                for (let pt of p.trail) ctx.lineTo(pt.x, pt.y);
                                ctx.stroke(); ctx.restore();
                            }
                            const sz = Math.max(0.4, 2.5 * p.life);
                            ctx.save();
                            ctx.globalAlpha = p.life * 0.9;
                            ctx.fillStyle = burst.color;
                            ctx.shadowColor = burst.color; ctx.shadowBlur = 7;
                            ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI * 2); ctx.fill();
                            ctx.restore();
                        }
                    }
                };
            })(),
            bg_hell: function(ctx,W,H,t){
                ctx.clearRect(0,0,W,H);
                const g=ctx.createLinearGradient(0,H,0,0);
                g.addColorStop(0,'rgba(239,68,68,0.25)');g.addColorStop(0.4,'rgba(120,20,20,0.12)');g.addColorStop(1,'rgba(0,0,0,0)');
                ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
                // --- pentagram helper ---
                function penta(cx,cy,r,rot,alpha,clr){
                    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=clr;ctx.lineWidth=1;
                    ctx.shadowColor=clr;ctx.shadowBlur=8;ctx.beginPath();
                    for(let p=0;p<5;p++){const a=rot+p*4*Math.PI/5-Math.PI/2;const x=cx+r*Math.cos(a);const y=cy+r*Math.sin(a);p===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
                    ctx.closePath();ctx.stroke();ctx.restore();
                }
                // --- soul helper ---
                function soul(cx,cy,sz,alpha,clr){
                    ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=clr;ctx.shadowColor=clr;ctx.shadowBlur=16;
                    ctx.beginPath();ctx.arc(cx,cy,sz,Math.PI,0,false);
                    ctx.lineTo(cx+sz,cy+sz*1.8);
                    ctx.quadraticCurveTo(cx+sz*0.5,cy+sz*1.3,cx,cy+sz*1.6);
                    ctx.quadraticCurveTo(cx-sz*0.5,cy+sz*1.3,cx-sz,cy+sz*1.8);
                    ctx.lineTo(cx-sz,cy);ctx.closePath();ctx.fill();ctx.restore();
                }
                // pentagrams – upper 65%, slow rotation
                for(let i=0;i<6;i++){const sd=i*137.5;const px=(Math.sin(sd)*0.45+0.5)*W;const py=(Math.cos(sd*0.7)*0.28+0.32)*H*0.65;const pr=5+Math.sin(sd*0.3)*3;const rot=t*0.004*(i%2?1:-1)+sd;const a=0.22+Math.sin(t*0.006+sd)*0.1;penta(px,py,pr,rot,a,'#ef4444');}
                // souls rising from bottom – random spawn positions
                if(!window._hellSeedsEfx){window._hellSeedsEfx=Array.from({length:8},()=>({xBase:Math.random(),xWobble:Math.random()*Math.PI*2,speed:0.5+Math.random()*0.5,phase:Math.random()*100,sz0:2+Math.random()*2}));}
                for(let i=0;i<8;i++){const s=window._hellSeedsEfx[i];const prog=((t*s.speed+s.phase)%100)/100;const x=(s.xBase*W*0.88+W*0.06+Math.sin(prog*Math.PI*3+s.xWobble)*14)%W;const y=H*(1-prog*0.92)+8;const sz=s.sz0+prog*3;const a=prog<0.1?prog*10:prog>0.85?(1-prog)/0.15:0.7;const clr=prog>0.5?'rgba(255,180,180,0.9)':'rgba(255,100,100,0.85)';soul(x,y,sz,a,clr);}
            },
            bg_shadowworld: function(ctx,W,H,t){
                ctx.clearRect(0,0,W,H);
                // Shadow orbs +15% pronunțare
                for(let i=0;i<7;i++){
                    const x=W*0.05+i*(W*0.15)+Math.sin(t*0.008+i)*14;
                    const y=H/2+Math.cos(t*0.01+i)*H*0.28;
                    const r=10+Math.sin(t*0.018+i)*6;
                    ctx.save();ctx.globalAlpha=0.92;
                    const g=ctx.createRadialGradient(x,y,0,x,y,r*1.4);
                    g.addColorStop(0,'rgba(109,40,217,0.32)');g.addColorStop(0.5,'rgba(76,29,149,0.16)');g.addColorStop(1,'transparent');
                    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*1.4,0,Math.PI*2);ctx.fill();ctx.restore();
                }
                // micro-orbs
                for(let i=0;i<5;i++){
                    const x=W*0.1+i*(W*0.2)+Math.cos(t*0.011+i*1.3)*9;
                    const y=H*0.2+((t*0.15+i*14)%100)/100*H*0.6;
                    const r=4+Math.sin(t*0.025+i)*2.5;
                    const g=ctx.createRadialGradient(x,y,0,x,y,r);
                    g.addColorStop(0,'rgba(139,92,246,0.38)');g.addColorStop(1,'transparent');
                    ctx.save();ctx.globalAlpha=0.85;ctx.fillStyle=g;
                    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();
                }

                // Background eyes — left and right sides only
                function drawBgEye(ex,ey,ew,blinkT,hue){
                    const eh=ew*0.38;
                    const blink=Math.max(0,Math.sin(blinkT));
                    if(blink<0.02) return;
                    ctx.save();ctx.translate(ex,ey);ctx.scale(1,blink);
                    const grd=ctx.createRadialGradient(0,0,ew*0.1,0,0,ew*1.4);
                    grd.addColorStop(0,`hsla(${hue},80%,45%,0.18)`);grd.addColorStop(1,'transparent');
                    ctx.fillStyle=grd;ctx.beginPath();ctx.ellipse(0,0,ew*1.4,eh*1.4,0,0,Math.PI*2);ctx.fill();
                    ctx.save();ctx.shadowColor=`hsl(${hue},70%,40%)`;ctx.shadowBlur=8;
                    ctx.fillStyle=`hsl(${hue},60%,22%)`;
                    ctx.beginPath();ctx.moveTo(-ew,0);ctx.bezierCurveTo(-ew,-eh*1.6,ew,-eh*1.6,ew,0);
                    ctx.bezierCurveTo(ew,eh*1.6,-ew,eh*1.6,-ew,0);ctx.fill();ctx.restore();
                    ctx.save();ctx.globalAlpha=0.27;ctx.fillStyle=`hsl(${hue},70%,55%)`;
                    ctx.beginPath();ctx.moveTo(-ew*0.45,0);ctx.bezierCurveTo(-ew*0.45,-eh,ew*0.45,-eh,ew*0.45,0);
                    ctx.bezierCurveTo(ew*0.45,eh,-ew*0.45,eh,-ew*0.45,0);ctx.fill();ctx.restore();
                    ctx.save();ctx.fillStyle='#05000f';
                    ctx.beginPath();ctx.moveTo(0,-eh*0.88);ctx.bezierCurveTo(ew*0.12,-eh*0.3,ew*0.12,eh*0.3,0,eh*0.88);
                    ctx.bezierCurveTo(-ew*0.12,eh*0.3,-ew*0.12,-eh*0.3,0,-eh*0.88);ctx.fill();ctx.restore();
                    ctx.save();ctx.strokeStyle=`hsla(${hue},70%,55%,0.6)`;ctx.lineWidth=0.8;
                    ctx.shadowColor=`hsl(${hue},70%,50%)`;ctx.shadowBlur=6;
                    ctx.beginPath();ctx.moveTo(-ew,0);ctx.bezierCurveTo(-ew,-eh*1.6,ew,-eh*1.6,ew,0);
                    ctx.bezierCurveTo(ew,eh*1.6,-ew,eh*1.6,-ew,0);ctx.stroke();ctx.restore();
                    ctx.restore();
                }
                const eyes=[
                    {fx:0.06,  fy:0.22, fs:0.06, ph:0,   hue:270},
                    {fx:0.09,  fy:0.65, fs:0.05, ph:55,  hue:278},
                    {fx:0.94,  fy:0.30, fs:0.055,ph:30,  hue:265},
                    {fx:0.91,  fy:0.72, fs:0.048,ph:85,  hue:272},
                ];
                eyes.forEach(({fx,fy,fs,ph,hue})=>{
                    const blinkT=Math.sin((t+ph)*0.022)*Math.PI;
                    ctx.save();ctx.globalAlpha=0.75+Math.sin(t*0.015+ph)*0.15;
                    drawBgEye(fx*W,fy*H,fs*W,blinkT,hue);
                    ctx.restore();
                });

                // glitch lines
                if(Math.sin(t*0.05)>0.8){
                    ctx.save();ctx.globalAlpha=0.10;ctx.strokeStyle='#4c1d95';ctx.lineWidth=1;
                    for(let j=0;j<3;j++){const ly=Math.random()*H;ctx.beginPath();ctx.moveTo(0,ly);ctx.lineTo(W,ly);ctx.stroke();}
                    ctx.restore();
                }
            },
        };

        let frame=0;
        const rid = id in renderers ? id : null;
        if(!rid) return;
        (function loop(){
            renderers[rid](ctx,W,H,frame++);
            requestAnimationFrame(loop);
        })();
    });
})();
</script>


<?php $pageContent = ob_get_clean(); require VIEWS_PATH . '/layouts/app.php';