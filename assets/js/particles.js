/**
 * GETFAME.WTF v2 - Particle Engine
 * Stars, shooting stars, cursor trail
 */

class ParticleEngine {
    constructor(canvasId, opts = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.opts = Object.assign({
            count: 130, speed: 0.25,
            sizeMin: 0.4, sizeMax: 2.2,
            opMin: 0.1, opMax: 0.75,
            color: '#ffffff', twinkle: true,
            shooting: true, shootInterval: 3500,
        }, opts);
        this.stars = [];
        this.shots = [];
        this.lastShot = 0;
        this.raf = null;
        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        for (let i = 0; i < this.opts.count; i++) this.stars.push(this.mkStar(true));
        this.loop();
    }

    resize() {
        this.canvas.width  = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    r(a, b) { return Math.random() * (b - a) + a; }

    mkStar(rand = false) {
        return {
            x: this.r(0, this.canvas.width),
            y: rand ? this.r(0, this.canvas.height) : -3,
            size: this.r(this.opts.sizeMin, this.opts.sizeMax),
            op: this.r(this.opts.opMin, this.opts.opMax),
            opDir: Math.random() < .5 ? 1 : -1,
            opSpd: this.r(0.002, 0.006),
            spd: this.r(0.04, this.opts.speed),
        };
    }

    mkShot() {
        const angle = this.r(25, 55) * Math.PI / 180;
        return {
            x: this.r(0, this.canvas.width * .7),
            y: this.r(0, this.canvas.height * .4),
            vx: Math.cos(angle) * this.r(8, 14),
            vy: Math.sin(angle) * this.r(8, 14),
            angle, len: this.r(80, 200),
            life: 1,
        };
    }

    loop() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Stars
        for (let i = 0; i < this.stars.length; i++) {
            const s = this.stars[i];
            if (this.opts.twinkle) {
                s.op += s.opSpd * s.opDir;
                if (s.op >= this.opts.opMax || s.op <= this.opts.opMin) s.opDir *= -1;
            }
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, s.op));
            ctx.fillStyle = this.opts.color;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            s.y += s.spd;
            if (s.y > this.canvas.height + 4) this.stars[i] = this.mkStar(false);
        }

        // Shooting stars
        if (this.opts.shooting) {
            const now = Date.now();
            if (now - this.lastShot > this.opts.shootInterval) {
                this.shots.push(this.mkShot());
                this.lastShot = now;
            }
            for (let i = this.shots.length - 1; i >= 0; i--) {
                const s = this.shots[i];
                s.x += s.vx; s.y += s.vy; s.life -= 0.016;
                if (s.life <= 0) { this.shots.splice(i, 1); continue; }
                const tx = s.x - Math.cos(s.angle) * s.len * s.life;
                const ty = s.y - Math.sin(s.angle) * s.len * s.life;
                const g = ctx.createLinearGradient(tx, ty, s.x, s.y);
                g.addColorStop(0, 'rgba(255,255,255,0)');
                g.addColorStop(1, `rgba(255,255,255,${s.life * .8})`);
                ctx.save();
                ctx.globalAlpha = s.life;
                ctx.strokeStyle = g;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.lineTo(s.x, s.y);
                ctx.stroke();
                ctx.restore();
            }
        }

        this.raf = requestAnimationFrame(() => this.loop());
    }

    destroy() {
        if (this.raf) cancelAnimationFrame(this.raf);
    }
}

// ── Cursor Trail ─────────────────────────────────────
class CursorTrail {
    constructor(color = '#00d4ff') {
        this.color  = color;
        this.mouse  = { x: 0, y: 0 };
        this.dots   = [];
        this.count  = 10;
        this.init();
    }
    init() {
        for (let i = 0; i < this.count; i++) {
            const d = document.createElement('div');
            const sz = Math.max(2, 6 - i * 0.4);
            d.style.cssText = `width:${sz}px;height:${sz}px;background:${this.color};border-radius:50%;position:fixed;pointer-events:none;z-index:9998;opacity:0;mix-blend-mode:screen;will-change:transform;`;
            document.body.appendChild(d);
            this.dots.push({ el: d, x: 0, y: 0 });
        }
        document.addEventListener('mousemove', e => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
        this.animate();
    }
    animate() {
        let x = this.mouse.x, y = this.mouse.y;
        for (let i = 0; i < this.dots.length; i++) {
            const d = this.dots[i];
            d.x += (x - d.x) * (0.18 + i * 0.005);
            d.y += (y - d.y) * (0.18 + i * 0.005);
            const op = (1 - i / this.dots.length) * 0.55;
            d.el.style.opacity  = op;
            d.el.style.left     = d.x - parseFloat(d.el.style.width)  / 2 + 'px';
            d.el.style.top      = d.y - parseFloat(d.el.style.height) / 2 + 'px';
            x = d.x; y = d.y;
        }
        requestAnimationFrame(() => this.animate());
    }
}

// ── Auto-init ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (window.PARTICLE_ENABLED && document.getElementById('particle-canvas')) {
        new ParticleEngine('particle-canvas');
    }
    if (window.CURSOR_TRAIL_ENABLED && !('ontouchstart' in window)) {
        new CursorTrail(window.ACCENT_COLOR || '#00d4ff');
    }
});
