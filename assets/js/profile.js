/**
 * INFECTED.WTF v2 - Profile JS
 * Splash screen + volume widget + tooltips
 */

// ── Splash Screen ─────────────────────────────────────
function initSplash() {
    const splash  = document.getElementById('splash-screen');
    const content = document.getElementById('profile-content');
    if (!splash || !content) return;

    splash.addEventListener('click', () => {
        // 1. Fade out splash
        splash.classList.add('splash-exit');

        // 2. Show profile content
        setTimeout(() => {
            content.style.transition = 'opacity 0.7s ease';
            content.style.opacity    = '1';
            content.style.pointerEvents = 'auto';

            // 3. Start particles now that content is visible
            if (window.PARTICLE_ENABLED && document.getElementById('particle-canvas')) {
                // Shadow World + image background (poza 3): +15% particle prominence
                const isShadowWorldImg = window.ACTIVE_BG_EFFECT === 'bg_shadowworld'
                    && window.BG_TYPE === 'image';
                const particleOpts = isShadowWorldImg ? {
                    opMin: 0.115,   // 0.10 * 1.15
                    opMax: 0.8625,  // 0.75 * 1.15
                } : {};
                new ParticleEngine('particle-canvas', particleOpts);
            }
            if (window.CURSOR_TRAIL_ENABLED && !('ontouchstart' in window)) {
                new CursorTrail(window.ACCENT_COLOR || '#00d4ff');
            }

            // Start purchased effects engine (bg, avatar canvas, cursor)
            if (typeof window.initPurchasedEffects === 'function') {
                window.initPurchasedEffects();
            }

            // Apply custom cursor if set
            if (window.CUSTOM_CURSOR_URL && !('ontouchstart' in window)) {
                const url = window.CUSTOM_CURSOR_URL;
                const ext = url.split('.').pop().toLowerCase().split('?')[0];
                const isAnimated = (ext === 'gif' || ext === 'cur');

                if (isAnimated) {
                    // GIF/CUR: CSS cursor doesn't animate GIFs in browsers.
                    // Use a fake DIV cursor that follows the mouse instead.
                    const SIZE = 32;
                    // Hide native cursor
                    const oldStyle = document.getElementById('custom-cursor-style');
                    if (oldStyle) oldStyle.remove();
                    const s = document.createElement('style');
                    s.id = 'custom-cursor-style';
                    s.textContent = `*, *::before, *::after { cursor: none !important; }`;
                    document.head.appendChild(s);
                    // Create fake cursor element
                    const el = document.createElement('img');
                    el.id = 'fake-cursor';
                    el.src = url;
                    el.style.cssText = `position:fixed;top:0;left:0;width:${SIZE}px;height:${SIZE}px;pointer-events:none;z-index:2147483647;transform:translate(-2px,-2px);image-rendering:auto;`;
                    document.body.appendChild(el);
                    document.addEventListener('mousemove', e => {
                        el.style.left = e.clientX + 'px';
                        el.style.top  = e.clientY + 'px';
                    });
                    document.addEventListener('mouseleave', () => { el.style.display = 'none'; });
                    document.addEventListener('mouseenter', () => { el.style.display = ''; });
                } else {
                    // Static image — resize to 32x32 via canvas
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = function() {
                        const SIZE = 32;
                        const canvas = document.createElement('canvas');
                        canvas.width = canvas.height = SIZE;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, SIZE, SIZE);
                        const dataUrl = canvas.toDataURL('image/png');
                        const cursorVal  = `url('${dataUrl}') ${SIZE/2} ${SIZE/2}, auto`;
                        const pointerVal = `url('${dataUrl}') ${SIZE/2} ${SIZE/2}, pointer`;
                        const oldStyle = document.getElementById('custom-cursor-style');
                        if (oldStyle) oldStyle.remove();
                        const s = document.createElement('style');
                        s.id = 'custom-cursor-style';
                        s.textContent = `*, *::before, *::after { cursor: ${cursorVal} !important; }
a, button, [onclick], [role="button"], label { cursor: ${pointerVal} !important; }`;
                        document.head.appendChild(s);
                    };
                    img.onerror = function() {};
                    img.src = url;
                }
            }

            // 4. Start video bg if any
            const vid = document.getElementById('bg-video');
            if (vid) vid.play().catch(() => {});

            // 5. Start music & init volume widget
            if (window.MUSIC_PATH) {
                new VolumeWidget(window.MUSIC_PATH, window.ACCENT_COLOR);
            }

            // 6. Animate socials
            animateSocials();

            // 7. Tilt card effect
            initTilt();

        }, 300); // slight delay so fade starts first

        // Remove splash from DOM after animation
        setTimeout(() => splash.remove(), 1200);
    }, { once: true });
}

// ── Volume Widget ─────────────────────────────────────
class VolumeWidget {
    constructor(url, accent) {
        this.audio   = document.getElementById('bg-audio');
        if (!this.audio) {
            this.audio = new Audio(url);
            this.audio.loop = true;
            document.body.appendChild(this.audio);
        }
        this.muted   = false;
        this.prevVol = 0.3;
        this.accent  = accent || '#00d4ff';

        this.widget  = document.getElementById('vol-widget');
        this.btn     = document.getElementById('vol-btn');
        this.slider  = document.getElementById('vol-slider');
        this.iconOn  = document.getElementById('icon-sound');
        this.iconOff = document.getElementById('icon-muted');

        if (!this.widget) return;

        this.audio.volume = this.prevVol;
        if (this.slider) {
            this.slider.value = this.prevVol;
            this.updateFill(this.prevVol);
        }

        this.bind();

        // Play immediately — click on splash counts as user gesture
        this.audio.play().catch(() => {});
    }

    bind() {
        this.btn.addEventListener('click', () => this.toggleMute());

        this.slider.addEventListener('input', () => {
            const v = parseFloat(this.slider.value);
            this.audio.volume = v;
            if (!this.muted) this.prevVol = v;
            this.updateFill(v);
            const shouldMute = v === 0;
            if (shouldMute !== this.muted) {
                this.muted = shouldMute;
                this.widget.classList.toggle('muted', this.muted);
                this.updateIcons(this.muted);
            }
        });
    }

    toggleMute() {
        if (this.muted) {
            this.muted = false;
            const vol = this.prevVol > 0 ? this.prevVol : 0.3;
            this.audio.volume = vol;
            this.slider.value = vol;
            this.updateFill(vol);
            this.widget.classList.remove('muted');
            this.updateIcons(false);
        } else {
            this.prevVol = parseFloat(this.slider.value) || 0.3;
            this.muted   = true;
            this.audio.volume = 0;
            this.slider.value = 0;
            this.updateFill(0);
            this.widget.classList.add('muted');
            this.updateIcons(true);
        }
    }

    updateIcons(muted) {
        if (!this.iconOn || !this.iconOff) return;
        this.iconOn.style.display  = muted ? 'none'  : 'block';
        this.iconOff.style.display = muted ? 'block' : 'none';
    }

    updateFill(v) {
        if (!this.slider) return;
        const pct = v * 100;
        this.slider.style.background =
            `linear-gradient(to right, ${this.accent} 0%, ${this.accent} ${pct}%, rgba(255,255,255,0.2) ${pct}%, rgba(255,255,255,0.2) 100%)`;
    }
}

// ── Tooltips ──────────────────────────────────────────
function initTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach(el => {
        const tip = document.createElement('div');
        tip.className   = 'social-tooltip';
        tip.textContent = el.getAttribute('data-tooltip');
        el.style.position = 'relative';
        el.appendChild(tip);
        el.addEventListener('mouseenter', () => tip.style.opacity = '1');
        el.addEventListener('mouseleave', () => tip.style.opacity = '0');
    });
}

// ── Animate socials ───────────────────────────────────
function animateSocials() {
    document.querySelectorAll('.social-icon').forEach((el, i) => {
        el.style.opacity   = '0';
        el.style.transform = 'translateY(12px)';
        setTimeout(() => {
            el.style.transition = 'opacity .4s, transform .4s';
            el.style.opacity    = '1';
            el.style.transform  = 'translateY(0)';
        }, 200 + i * 65);
    });
}

// ── Init ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initTooltips();
    initSplash();
    // Particles & music are started INSIDE initSplash after click
    // so we do NOT init them here
});

// ── Tilt Card ─────────────────────────────────────────
function initTilt() {
    const card = document.querySelector('.profile-card');
    if (!card || window.matchMedia('(pointer:coarse)').matches) return;

    const MAX   = 6;
    const SCALE = 1.02;
    let rafId   = null;
    let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
    let inside  = false;

    // Wait for profileLoad animation to finish before taking over transform
    setTimeout(() => {
        card.style.animation = 'none';
        card.style.opacity   = '1';
        card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)';
    }, 850);

    function lerp(a, b, t) { return a + (b - a) * t; }

    function animate() {
        currentX = lerp(currentX, targetX, 0.08);
        currentY = lerp(currentY, targetY, 0.08);

        const sc = inside ? SCALE : 1;
        card.style.transform = `perspective(900px) rotateX(${currentX}deg) rotateY(${currentY}deg) scale(${sc})`;
        card.style.boxShadow = inside
            ? `${-currentY * 4}px ${currentX * 4}px 70px rgba(0,0,0,.75)`
            : '0 24px 70px rgba(0,0,0,.7)';

        if (Math.abs(currentX - targetX) > 0.01 || Math.abs(currentY - targetY) > 0.01) {
            rafId = requestAnimationFrame(animate);
        } else {
            rafId = null;
        }
    }

    function startRaf() { if (!rafId) rafId = requestAnimationFrame(animate); }

    card.addEventListener('mousemove', e => {
        const r  = card.getBoundingClientRect();
        targetY  =  ((e.clientX - r.left  - r.width  / 2) / (r.width  / 2)) * MAX;
        targetX  = -((e.clientY - r.top   - r.height / 2) / (r.height / 2)) * MAX;
        startRaf();
    });
    card.addEventListener('mouseenter', () => { inside = true;  startRaf(); });
    card.addEventListener('mouseleave', () => { inside = false; targetX = 0; targetY = 0; startRaf(); });
}