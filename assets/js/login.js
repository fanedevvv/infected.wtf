// ── Remember me checkbox ──────────────────────────────────────────────────────
(function () {
    var wrap = document.querySelector('.remember-wrap');
    if (!wrap) return;
    var box   = document.getElementById('remember-box');
    var check = document.getElementById('remember');
    var icon  = document.getElementById('remember-check');
    wrap.addEventListener('click', function () {
        check.checked = !check.checked;
        if (check.checked) {
            box.style.background   = 'var(--accent, #00d4ff)';
            box.style.borderColor  = 'var(--accent, #00d4ff)';
            icon.style.display     = 'block';
        } else {
            box.style.background   = 'rgba(255,255,255,0.05)';
            box.style.borderColor  = 'rgba(255,255,255,0.2)';
            icon.style.display     = 'none';
        }
    });
})();

// ── Particles config ──────────────────────────────────────────────────────────
window.PARTICLE_ENABLED      = true;
window.CURSOR_TRAIL_ENABLED  = false;
window.ACCENT_COLOR          = '#00d4ff';

// ── Forgot Password Modal ─────────────────────────────────────────────────────
function openForgotModal() {
    var ov = document.getElementById('fp-overlay');
    ov.style.display = 'flex';
    document.getElementById('fp-identifier').value         = '';
    document.getElementById('fp-status').textContent       = '';
    document.getElementById('fp-btn').disabled             = false;
    document.getElementById('fp-btn').style.opacity        = '1';
    setTimeout(function () {
        document.getElementById('fp-identifier').focus();
    }, 120);
}

function closeForgotModal() {
    document.getElementById('fp-overlay').style.display = 'none';
}

function closeForgotIfOutside(e) {
    if (e.target === document.getElementById('fp-overlay')) closeForgotModal();
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeForgotModal();
});

document.addEventListener('DOMContentLoaded', function () {
    var inp = document.getElementById('fp-identifier');
    if (inp) {
        inp.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') submitForgot();
        });
    }
});

async function submitForgot() {
    var identifier = document.getElementById('fp-identifier').value.trim();
    var statusEl   = document.getElementById('fp-status');
    var btn        = document.getElementById('fp-btn');

    if (!identifier) {
        statusEl.textContent = '✗ Please enter your username or email.';
        statusEl.style.color = '#ff8080';
        return;
    }

    btn.disabled       = true;
    btn.style.opacity  = '.55';
    statusEl.textContent = 'Sending...';
    statusEl.style.color = 'rgba(255,255,255,.4)';

    try {
        var res  = await fetch('/api/forgot-password.php', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ identifier: identifier })
        });
        var data = await res.json();
        if (data.success) {
            statusEl.textContent = '✓ ' + data.message;
            statusEl.style.color = '#34d399';
        } else {
            statusEl.textContent = '✗ ' + (data.error || 'Something went wrong.');
            statusEl.style.color = '#ff8080';
            btn.disabled         = false;
            btn.style.opacity    = '1';
        }
    } catch (err) {
        statusEl.textContent = '✗ Network error. Please try again.';
        statusEl.style.color = '#ff8080';
        btn.disabled         = false;
        btn.style.opacity    = '1';
    }
}