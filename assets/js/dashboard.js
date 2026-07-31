/**
 * GETFAME.WTF v2 - Dashboard JS
 */

// ── Toast ─────────────────────────────────────────────
function showToast(msg, type = 'success') {
    let c = document.getElementById('toast-container');
    if (!c) { c = document.createElement('div'); c.id = 'toast-container'; c.className = 'toast-container'; document.body.appendChild(c); }
    const icons = {
        success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15" style="color:#5fefa5;flex-shrink:0"><path d="M20 6L9 17l-5-5"/></svg>`,
        error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15" style="color:#ff8080;flex-shrink:0"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
    };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = (icons[type] || '') + msg;
    c.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .3s, transform .3s'; t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ── Section Nav ───────────────────────────────────────
function showSection(id) {
    document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.getElementById('section-' + id)?.classList.add('active');
    document.querySelector(`[data-section="${id}"]`)?.classList.add('active');
    localStorage.setItem('dash_section', id);
}

// ── AJAX submit ───────────────────────────────────────
async function submitAjax(formId, endpoint, successMsg) {
    const form = document.getElementById(formId);
    if (!form) return;
    const btn = form.querySelector('[type="button"]');
    const orig = btn?.textContent;
    if (btn) { btn.disabled = true; btn.textContent = 'Se salvează...'; }
    const fd = new FormData(form);
    fd.append('action', formId);
    try {
        const res  = await fetch(endpoint, { method: 'POST', body: fd });
        const json = await res.json();
        json.success ? showToast(successMsg || json.message || 'Saved!', 'success')
                     : showToast(json.error || 'Error', 'error');
    } catch { showToast('Network error', 'error'); }
    finally { if (btn) { btn.disabled = false; btn.textContent = orig; } }
}

// ── Avatar upload ─────────────────────────────────────
function initAvatarUpload() {
    const input       = document.getElementById('avatar-input');
    const preview     = document.getElementById('avatar-preview');
    const placeholder = document.getElementById('avatar-placeholder');
    const progress    = document.getElementById('avatar-upload-progress');
    const bar         = document.getElementById('avatar-progress-bar');
    const status      = document.getElementById('avatar-upload-status');
    if (!input) return;
    document.getElementById('avatar-zone')?.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('Max 5MB', 'error'); return; }
        const reader = new FileReader();
        reader.onload = e => {
            if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
            if (placeholder) placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
        if (progress) progress.style.display = 'block';
        if (bar)      bar.style.width = '0%';
        if (status)   status.textContent = 'Uploading...';
        const fd = new FormData();
        fd.append('avatar', file);
        fd.append('type', 'avatar');
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', e => {
            if (!e.lengthComputable) return;
            const pct = Math.round(e.loaded / e.total * 100);
            if (bar)    bar.style.width = pct + '%';
            if (status) status.textContent = 'Uploading... ' + pct + '%';
        });
        xhr.addEventListener('load', () => {
            try {
                const j = JSON.parse(xhr.responseText);
                if (j.success) {
                    if (bar)    bar.style.width = '100%';
                    if (status) status.textContent = '✓ Upload complete!';
                    showToast('Avatar updated!', 'success');
                    setTimeout(() => location.reload(), 900);
                } else {
                    if (progress) progress.style.display = 'none';
                    showToast(j.error || 'Upload failed', 'error');
                }
            } catch {
                if (progress) progress.style.display = 'none';
                showToast('Server error', 'error');
            }
        });
        xhr.addEventListener('error', () => {
            if (progress) progress.style.display = 'none';
            showToast('Network error', 'error');
        });
        xhr.open('POST', '/api/upload.php');
        xhr.send(fd);
    });
}

// ── Upload card UI helpers ────────────────────────────
function showClearBtn(card, show, onclickFn) {
    if (!card) return;
    let btn = card.querySelector('.upload-clear-btn');
    if (show) {
        if (!btn) {
            btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'upload-clear-btn';
            btn.title = 'Remove';
            btn.innerHTML = '✕';
            btn.setAttribute('onclick', onclickFn);
            card.querySelector('.upload-card-header')?.appendChild(btn);
        }
        btn.style.display = 'flex';
    } else {
        if (btn) btn.style.display = 'none';
    }
}
function ensureBadge(zone, label) {
    if (!zone) return;
    let badge = zone.querySelector('.upload-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'upload-badge';
        zone.appendChild(badge);
    }
    badge.textContent = label;
    badge.style.display = 'block';
}
function hideBadge(zone) {
    if (!zone) return;
    const badge = zone.querySelector('.upload-badge');
    if (badge) badge.style.display = 'none';
}

// ── Clear helpers (instant save) ──────────────────────
async function clearAvatar() {
    try {
        const fd = new FormData();
        fd.append('action', 'clear_avatar');
        const r = await fetch('/api/update_profile.php', { method:'POST', body:fd });
        const j = await r.json();
        if (j.success) { showToast('Avatar removed!', 'success'); setTimeout(() => location.reload(), 700); }
        else showToast(j.error || 'Error', 'error');
    } catch { showToast('Delete error', 'error'); }
}
async function clearBackground() {
    try {
        const fd = new FormData();
        fd.append('action', 'clear_background');
        const r = await fetch('/api/update_profile.php', { method:'POST', body:fd });
        const j = await r.json();
        if (j.success) { showToast('Background removed!', 'success'); setTimeout(() => location.reload(), 700); }
        else showToast(j.error || 'Error', 'error');
    } catch { showToast('Delete error', 'error'); }
}

// ── BG upload ─────────────────────────────────────────
function initBgUpload() {
    const bgIn     = document.getElementById('bg-input');
    const progress = document.getElementById('bg-upload-progress');
    const bar      = document.getElementById('bg-progress-bar');
    const status   = document.getElementById('bg-upload-status');
    if (!bgIn) return;
    bgIn.addEventListener('change', () => {
        const file = bgIn.files[0]; if (!file) return;
        if (file.size > 100 * 1024 * 1024) { showToast('Max 100MB', 'error'); return; }

        // Preview instant — imagine sau video
        const placeholder = document.getElementById('bg-placeholder');
        const zone        = document.getElementById('bg-zone');
        if (placeholder) placeholder.style.display = 'none';

        // Curăță orice preview existent
        const oldPreview = document.getElementById('bg-preview');
        if (oldPreview) oldPreview.remove();
        const oldBadge = zone ? zone.querySelector('.upload-badge') : null;
        if (oldBadge) oldBadge.remove();

        if (file.type === 'video/mp4') {
            // Preview video
            const video = document.createElement('video');
            video.id = 'bg-preview';
            video.className = 'upload-preview-img';
            video.muted = true;
            video.loop = true;
            video.setAttribute('playsinline', '');
            video.style.display = 'block';
            video.style.background = '#000';
            video.src = URL.createObjectURL(file);
            video.play().catch(() => {});
            if (zone) zone.insertBefore(video, zone.firstChild);
            ensureBadge(zone, 'MP4');
        } else {
            // Preview imagine
            const reader = new FileReader();
            reader.onload = e => {
                const img = document.createElement('img');
                img.id = 'bg-preview';
                img.className = 'upload-preview-img';
                img.src = e.target.result;
                img.style.display = 'block';
                if (zone) zone.insertBefore(img, zone.firstChild);
                ensureBadge(zone, 'IMG');
            };
            reader.readAsDataURL(file);
        }

        if (progress) progress.style.display = 'block';
        if (bar)      bar.style.width = '0%';
        if (status)   status.textContent = 'Uploading...';
        const fd = new FormData();
        fd.append('background', file);
        fd.append('type', 'background');
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', e => {
            if (!e.lengthComputable) return;
            const pct = Math.round(e.loaded / e.total * 100);
            if (bar)    bar.style.width = pct + '%';
            if (status) status.textContent = 'Uploading... ' + pct + '%';
        });
        xhr.addEventListener('load', () => {
            try {
                const j = JSON.parse(xhr.responseText);
                if (j.success) {
                    if (bar)    bar.style.width = '100%';
                    if (status) status.textContent = '✓ Upload complete!';
                    showToast('Background uploaded!', 'success');
                    setTimeout(() => location.reload(), 900);
                } else {
                    if (progress) progress.style.display = 'none';
                    showToast(j.error || 'Upload failed', 'error');
                }
            } catch {
                if (progress) progress.style.display = 'none';
                showToast('Server error', 'error');
            }
        });
        xhr.addEventListener('error', () => {
            if (progress) progress.style.display = 'none';
            showToast('Network error', 'error');
        });
        xhr.open('POST', '/api/upload.php');
        xhr.send(fd);
    });
}
// ── Music upload (XHR with progress) ─────────────────
function initMusicUpload() {
    const input    = document.getElementById('music-input');
    const zone     = document.getElementById('music-upload-zone');
    const filename = document.getElementById('music-filename');
    const progress = document.getElementById('music-upload-progress');
    const bar      = document.getElementById('music-progress-bar');
    const status   = document.getElementById('music-upload-status');

    if (!input) return;

    // Click zone -> open file picker
    zone?.addEventListener('click', () => input.click());

    input.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) return;

        if (file.size > 20 * 1024 * 1024) {
            showToast('Max 20MB for audio', 'error'); return;
        }

        // Show filename in zone
        if (filename) filename.textContent = '🎵 ' + file.name;

        // Show progress bar
        if (progress) progress.style.display = 'block';
        if (bar)      bar.style.width = '0%';
        if (status)   status.textContent = 'Uploading...';

        const fd = new FormData();
        fd.append('music', file);
        fd.append('type', 'music');

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', e => {
            if (!e.lengthComputable) return;
            const pct = Math.round(e.loaded / e.total * 100);
            if (bar)    bar.style.width = pct + '%';
            if (status) status.textContent = `Uploading... ${pct}%`;
        });

        xhr.addEventListener('load', () => {
            try {
                const j = JSON.parse(xhr.responseText);
                if (j.success) {
                    if (bar)    bar.style.width = '100%';
                    if (status) status.textContent = '✓ Upload complete!';
                    showToast('Music uploaded successfully!', 'success');
                    setTimeout(() => location.reload(), 900);
                } else {
                    if (progress) progress.style.display = 'none';
                    showToast(j.error || 'Upload failed', 'error');
                }
            } catch {
                if (progress) progress.style.display = 'none';
                showToast('Server error', 'error');
            }
        });

        xhr.addEventListener('error', () => {
            if (progress) progress.style.display = 'none';
            showToast('Network error', 'error');
        });

        xhr.open('POST', '/api/upload.php');
        xhr.send(fd);
    });
}

// ── Delete music ──────────────────────────────────────
async function deleteMusic() {
    const fd = new FormData();
    fd.append('action', 'delete_music');
    try {
        const r = await fetch('/api/update_profile.php', { method: 'POST', body: fd });
        const j = await r.json();
        if (j.success) { showToast('Music removed!', 'success'); setTimeout(() => location.reload(), 700); }
        else showToast(j.error || 'Error', 'error');
    } catch { showToast('Error', 'error'); }
}

// ── Delete link modal ─────────────────────────────────
function showDeleteLinkModal(id) {
    // Remove any existing modal
    document.getElementById('delete-link-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'delete-link-modal';
    modal.className = 'dlm-overlay';
    modal.innerHTML = `
        <div class="dlm-box">
            <div class="dlm-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
            </div>
            <p class="dlm-title">Delete this link?</p>
            <p class="dlm-sub">This action cannot be undone.</p>
            <div class="dlm-actions">
                <button class="dlm-btn dlm-cancel" id="dlm-cancel-btn">Cancel</button>
                <button class="dlm-btn dlm-confirm" id="dlm-confirm-btn">Delete</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Animate in
    requestAnimationFrame(() => modal.classList.add('dlm-visible'));

    const close = () => {
        modal.classList.remove('dlm-visible');
        setTimeout(() => modal.remove(), 200);
    };

    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    document.getElementById('dlm-cancel-btn').addEventListener('click', close);
    document.getElementById('dlm-confirm-btn').addEventListener('click', async () => {
        close();
        await deleteSocialLink(id);
    });
}

async function deleteSocialLink(id) {
    const fd = new FormData();
    fd.append('id', id); fd.append('action', 'delete_link');
    try {
        const r = await fetch('/api/update_profile.php', { method: 'POST', body: fd });
        const j = await r.json();
        if (j.success) { document.getElementById('link-row-' + id)?.remove(); showToast('Link deleted!', 'success'); }
        else showToast(j.error || 'Error', 'error');
    } catch { showToast('Error', 'error'); }
}

// ── Add link ──────────────────────────────────────────
async function addLink() {
    const btn = document.getElementById('add-link-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Adding...'; }
    const form = document.getElementById('add-link-form');
    const fd   = new FormData(form);
    fd.append('action', 'add-link-form');
    try {
        const r = await fetch('/api/update_profile.php', { method: 'POST', body: fd });
        const j = await r.json();
        if (j.success) { showToast('Link added!', 'success'); setTimeout(() => location.reload(), 700); }
        else showToast(j.error || 'Error', 'error');
    } catch { showToast('Error', 'error'); }
    finally { if (btn) { btn.disabled = false; btn.textContent = '+ Add link'; } }
}

// ── Copy URL ──────────────────────────────────────────
function copyProfileUrl() {
    const txt = document.getElementById('profile-url-text')?.textContent?.trim();
    if (txt) navigator.clipboard.writeText(txt).then(() => showToast('URL copied!', 'success'));
}

// ── BG tabs ───────────────────────────────────────────
function initBgTabs() {
    document.querySelectorAll('.bg-type-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.bg-type-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.bg-type-section').forEach(s => s.style.display = 'none');
            tab.classList.add('active');
            const type = tab.dataset.type;
            const sec  = document.getElementById('bg-section-' + type);
            if (sec) sec.style.display = 'block';
            document.getElementById('bg-type-input').value = type;
        });
    });
}

// ── Color swatches ────────────────────────────────────
function initColorSwatches() {
    document.querySelectorAll('[data-swatch-for]').forEach(sw => {
        sw.addEventListener('click', () => {
            const tgt = document.getElementById(sw.dataset.swatchFor);
            if (tgt) { tgt.value = sw.style.background; tgt.dispatchEvent(new Event('input')); }
            sw.closest('.color-grid')?.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
            sw.classList.add('active');
        });
    });
    document.getElementById('accent-color')?.addEventListener('input', e => {
        document.querySelector('.accent-preview')?.style.setProperty('background', e.target.value);
    });
}

// ── Platform selector ─────────────────────────────────
function initPlatformSelector() {
    document.querySelectorAll('.platform-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.platform-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            document.getElementById('selected-platform').value = opt.dataset.platform;
        });
    });
}

// ── Init ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initAvatarUpload();
    initBgUpload();
    initMusicUpload();
    initCursorUpload();
    initBgTabs();
    initColorSwatches();
    initPlatformSelector();
});

// ── Custom font dropdown (portal — attached to body to escape stacking contexts) ──
(function() {
    const fonts = ['Syne','Outfit','Space Mono','Rajdhani','Orbitron','Bebas Neue','Exo 2','Josefin Sans'];

    // Create portal element once
    const portal = document.createElement('div');
    portal.id = 'font-dropdown-portal';
    fonts.forEach(f => {
        const opt = document.createElement('div');
        opt.className = 'font-select-option';
        opt.textContent = f;
        opt.addEventListener('mousedown', e => { e.preventDefault(); selectFont(f); });
        portal.appendChild(opt);
    });
    document.body.appendChild(portal);

    function getActiveFont() {
        const inp = document.getElementById('profile_font_input');
        return inp ? inp.value : 'Syne';
    }

    function positionPortal() {
        const display = document.getElementById('font-select-display');
        if (!display) return;
        const rect = display.getBoundingClientRect();
        portal.style.left  = rect.left + 'px';
        portal.style.top   = (rect.bottom + 4) + 'px';
        portal.style.width = rect.width + 'px';
    }

    function openDropdown() {
        // Update active state
        const current = getActiveFont();
        portal.querySelectorAll('.font-select-option').forEach(o => {
            o.classList.toggle('active', o.textContent === current);
        });
        positionPortal();
        portal.classList.add('open');
        document.querySelector('.font-select-wrapper')?.classList.add('open');
    }

    function closeDropdown() {
        portal.classList.remove('open');
        document.querySelector('.font-select-wrapper')?.classList.remove('open');
    }

    window.toggleFontDropdown = function() {
        portal.classList.contains('open') ? closeDropdown() : openDropdown();
    };

    // Store the original font once at init time
    let _originalFont = null;
    document.addEventListener('DOMContentLoaded', function() {
        const inp = document.getElementById('profile_font_input');
        if (inp) _originalFont = inp.value;
    });

    window.selectFont = function(font) {
        const inp = document.getElementById('profile_font_input');
        const lbl = document.getElementById('font-selected-label');

        // Capture original on first select if DOMContentLoaded already fired
        if (_originalFont === null && inp) _originalFont = inp.value;

        if (inp) inp.value = font;
        if (lbl) lbl.textContent = font;
        portal.querySelectorAll('.font-select-option').forEach(o => {
            o.classList.toggle('active', o.textContent === font);
        });

        // Show/hide the unsaved bar based on whether font differs from original
        const bar = document.getElementById('unsaved-bar');
        if (bar) {
            if (font !== _originalFont) {
                bar.classList.add('visible');
            } else {
                // Font back to original — let checkDirty decide if other fields are still dirty
                if (typeof window.markProfileDirty === 'function') window.markProfileDirty();
                else bar.classList.remove('visible');
            }
        }

        closeDropdown();
    };

    // Close on outside click
    document.addEventListener('click', e => {
        const wrapper = document.querySelector('.font-select-wrapper');
        if (!portal.contains(e.target) && (!wrapper || !wrapper.contains(e.target))) {
            closeDropdown();
        }
    });

    // Reposition on scroll/resize
    window.addEventListener('scroll', positionPortal, true);
    window.addEventListener('resize', positionPortal);
})();
// ── Cursor Upload ──────────────────────────────────────
function initCursorUpload() {
    const input    = document.getElementById('cursor-input');
    const progress = document.getElementById('cursor-upload-progress');
    const bar      = document.getElementById('cursor-progress-bar');
    const status   = document.getElementById('cursor-upload-status');
    if (!input) return;

    input.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { showToast('Max 2MB', 'error'); return; }

        // Instant preview
        const reader = new FileReader();
        reader.onload = e => {
            const placeholder = document.getElementById('cursor-placeholder');
            const zone        = document.getElementById('cursor-upload-zone');
            if (placeholder) placeholder.style.display = 'none';
            // Show preview img inside zone
            let preview = document.getElementById('cursor-preview-img');
            if (!preview) {
                preview = document.createElement('img');
                preview.id = 'cursor-preview-img';
                preview.style.cssText = 'width:42px;height:42px;object-fit:contain;opacity:.85;margin-bottom:.4rem';
                if (zone) zone.insertBefore(preview, zone.firstChild);
            }
            preview.src = e.target.result;
        };
        reader.readAsDataURL(file);

        if (progress) progress.style.display = 'block';
        if (bar)      bar.style.width = '0%';
        if (status)   status.textContent = 'Uploading...';

        const fd = new FormData();
        fd.append('cursor', file);
        fd.append('type', 'cursor');

        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', e => {
            if (!e.lengthComputable) return;
            const pct = Math.round(e.loaded / e.total * 100);
            if (bar)    bar.style.width = pct + '%';
            if (status) status.textContent = 'Uploading... ' + pct + '%';
        });
        xhr.addEventListener('load', () => {
            try {
                const j = JSON.parse(xhr.responseText);
                if (j.success) {
                    if (bar)    bar.style.width = '100%';
                    if (status) status.textContent = '✓ Upload complete!';
                    showToast('Cursor uploaded!', 'success');
                    setTimeout(() => location.reload(), 900);
                } else {
                    if (progress) progress.style.display = 'none';
                    showToast(j.error || 'Upload failed', 'error');
                }
            } catch {
                if (progress) progress.style.display = 'none';
                showToast('Server error', 'error');
            }
        });
        xhr.addEventListener('error', () => {
            if (progress) progress.style.display = 'none';
            showToast('Network error', 'error');
        });
        xhr.open('POST', '/api/upload.php');
        xhr.send(fd);
    });
}

// ── Delete cursor ──────────────────────────────────────
async function deleteCursor() {
    const fd = new FormData();
    fd.append('action', 'delete_cursor');
    try {
        const r = await fetch('/api/update_profile.php', { method: 'POST', body: fd });
        const j = await r.json();
        if (j.success) { showToast('Cursor removed', 'success'); setTimeout(() => location.reload(), 700); }
        else showToast(j.error || 'Error', 'error');
    } catch { showToast('Network error', 'error'); }
}