<?php
requireLogin();
checkBanned($pdo);
$userId  = (int)$_SESSION['user_id'];
$profile = getProfile($pdo, $userId);
$bgType  = $profile['background_type'] ?: 'particles';
$bgVal   = $profile['background_value'] ?: '#050507';

$itemsDirFs = dirname(__DIR__, 3) . '/assets/img/decorations';
$itemsDirWeb = '/assets/img/decorations';
$decorationItems = [];

if (is_dir($itemsDirFs) && is_readable($itemsDirFs)) {
    $allFiles = scandir($itemsDirFs);
    foreach ($allFiles as $fileName) {
        if (!is_string($fileName)) continue;
        if (!preg_match('/^custom_(\d+)\.(png|webp|jpg|jpeg|gif)$/i', $fileName, $m)) continue;
        $absPath = $itemsDirFs . '/' . $fileName;
        if (!is_file($absPath)) continue;

        $decorationItems[] = [
            'file' => $fileName,
            'index' => (int)$m[1],
            'url' => $itemsDirWeb . '/' . rawurlencode($fileName),
        ];
    }

    usort($decorationItems, static function(array $a, array $b): int {
        return $a['index'] <=> $b['index'];
    });
}

$currentPage = 'profile-info';
$pageTitle   = 'Customize';

ob_start();
?>
<div class="section-header"><h2>Profile Info</h2><p>Customize what visitors see on your profile</p></div>
<div class="dash-card">
    <form id="profile-info-form">
        <!-- ══ ASSET UPLOADS HEADER ══════════════════════════ -->
        <div style="display:flex;align-items:center;gap:.85rem;margin-bottom:1.25rem">
            <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,rgba(0,212,255,.2),rgba(255,0,255,.15));border:1.5px solid rgba(0,212,255,.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 16px rgba(0,212,255,.15)">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" width="20" height="20"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            </div>
            <div>
                <div style="font-size:.95rem;font-weight:700;color:var(--text)">Asset Uploads</div>
                <div style="font-size:.75rem;color:var(--text-muted)">Upload custom media files</div>
            </div>
        </div>
        <div class="upload-cards-grid">
            <div class="upload-card">
                <div class="upload-card-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <div><div class="upload-card-title">Avatar</div><div class="upload-card-sub">Profile image</div></div>
                    <?php if ($profile['avatar']): ?>
                    <button type="button" class="upload-clear-btn" onclick="clearAvatar()" title="Remove avatar">✕</button>
                    <?php endif; ?>
                </div>
                <div class="upload-zone" id="avatar-zone">
                    <?php if ($profile['avatar']): ?>
                    <img src="/<?= sanitize($profile['avatar']) ?>" id="avatar-preview" class="upload-preview-img" onerror="this.src='/assets/img/default-avatar.png'">
                    <span class="upload-badge">JPG</span>
                    <?php else: ?>
                    <div class="upload-placeholder" id="avatar-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <span>Click to upload</span>
                    </div>
                    <img src="" id="avatar-preview" class="upload-preview-img" style="display:none">
                    <?php endif; ?>
                </div>
                <input type="file" id="avatar-input" accept="image/*" style="display:none">
                <input type="hidden" name="avatar" id="avatar-path" value="<?= sanitize($profile['avatar'] ?? '') ?>">
                <div id="avatar-upload-progress" style="display:none;margin-top:.5rem">
                    <div style="height:3px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden">
                        <div id="avatar-progress-bar" style="height:100%;width:0%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:2px;transition:width .3s"></div>
                    </div>
                    <p style="font-size:.72rem;color:var(--text-muted);margin-top:.3rem;text-align:center" id="avatar-upload-status">Uploading...</p>
                </div>
            </div>
            <div class="upload-card">
                <div class="upload-card-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    <div><div class="upload-card-title">Background</div><div class="upload-card-sub">Background image / video</div></div>
                    <?php if (in_array($bgType, ['image','video']) && $bgVal): ?>
                    <button type="button" class="upload-clear-btn" onclick="clearBackground()" title="Remove background">✕</button>
                    <?php endif; ?>
                </div>
                <div class="upload-zone" id="bg-zone" onclick="document.getElementById('bg-input').click()">
                    <?php if ($bgType === 'image' && $bgVal): ?>
                    <img src="/<?= sanitize($bgVal) ?>" id="bg-preview" class="upload-preview-img">
                    <span class="upload-badge">IMG</span>
                    <?php elseif ($bgType === 'video' && $bgVal): ?>
                    <video id="bg-preview" class="upload-preview-img" autoplay muted loop playsinline style="display:block;background:#000">
                        <source src="/<?= sanitize($bgVal) ?>">
                    </video>
                    <span class="upload-badge">MP4</span>
                    <?php else: ?>
                    <div class="upload-placeholder" id="bg-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                        <span>Click to upload</span>
                    </div>
                    <img src="" id="bg-preview" class="upload-preview-img" style="display:none">
                    <?php endif; ?>
                </div>
                <input type="file" id="bg-input" accept="image/*,video/mp4" style="display:none">
                <input type="hidden" name="background_image" id="bg-image-path" value="<?= $bgType==='image'?sanitize($bgVal):'' ?>">
                <div id="bg-upload-progress" style="display:none;margin-top:.5rem">
                    <div style="height:3px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden">
                        <div id="bg-progress-bar" style="height:100%;width:0%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:2px;transition:width .3s"></div>
                    </div>
                    <p style="font-size:.72rem;color:var(--text-muted);margin-top:.3rem;text-align:center" id="bg-upload-status">Uploading...</p>
                </div>
            </div>
            <div class="upload-card">
                <div class="upload-card-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    <div><div class="upload-card-title">Audio</div><div class="upload-card-sub">Background music</div></div>
                    <?php if (!empty($profile['music_path'])): ?>
                    <button type="button" class="upload-clear-btn" onclick="deleteMusic()" title="Remove music">✕</button>
                    <?php endif; ?>
                </div>
                <div class="upload-zone" id="music-upload-zone" style="cursor:pointer">
                    <?php if (!empty($profile['music_path'])): ?>
                    <div class="upload-placeholder">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36" style="color:var(--accent);opacity:.7"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                        <span style="font-size:.72rem;word-break:break-all;text-align:center;padding:0 .5rem"><?= sanitize(basename($profile['music_path'])) ?></span>
                        <span class="upload-badge" style="position:static;margin-top:.25rem">MP3</span>
                    </div>
                    <?php else: ?>
                    <div class="upload-placeholder" id="music-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                        <span>Click to upload</span>
                    </div>
                    <?php endif; ?>
                </div>
                <div id="music-upload-progress" style="display:none;margin-top:.5rem">
                    <div style="height:3px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden">
                        <div id="music-progress-bar" style="height:100%;width:0%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:2px;transition:width .3s"></div>
                    </div>
                    <p style="font-size:.72rem;color:var(--text-muted);margin-top:.3rem;text-align:center" id="music-upload-status">Uploading...</p>
                </div>
                <input type="file" id="music-input" accept="audio/mpeg,audio/ogg,audio/wav,.mp3,.ogg,.wav" style="display:none">
            </div>
            <!-- Custom Cursor -->
            <div class="upload-card">
                <div class="upload-card-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M4 4l7.07 17 2.51-7.39L21 11.07z"/></svg>
                    <div><div class="upload-card-title">Custom Cursor</div><div class="upload-card-sub">Upload a profile cursor</div></div>
                    <?php if (!empty($profile['cursor_path'])): ?>
                    <button type="button" class="upload-clear-btn" onclick="deleteCursor()" title="Remove cursor">✕</button>
                    <?php endif; ?>
                </div>
                <div class="upload-zone" id="cursor-upload-zone" style="cursor:pointer" onclick="document.getElementById('cursor-input').click()">
                    <?php if (!empty($profile['cursor_path'])): ?>
                    <div class="upload-placeholder">
                        <img src="/<?= sanitize($profile['cursor_path']) ?>" style="width:42px;height:42px;object-fit:contain;opacity:.8" alt="cursor preview">
                        <span style="font-size:.72rem;word-break:break-all;text-align:center;padding:0 .5rem"><?= sanitize(basename($profile['cursor_path'])) ?></span>
                        <span class="upload-badge" style="position:static;margin-top:.25rem">WEBP</span>
                    </div>
                    <?php else: ?>
                    <div class="upload-placeholder" id="cursor-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36"><path d="M4 4l7.07 17 2.51-7.39L21 11.07z"/></svg>
                        <span>Click to upload</span>
                    </div>
                    <?php endif; ?>
                </div>
                <div id="cursor-upload-progress" style="display:none;margin-top:.5rem">
                    <div style="height:3px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden">
                        <div id="cursor-progress-bar" style="height:100%;width:0%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:2px;transition:width .3s"></div>
                    </div>
                    <p style="font-size:.72rem;color:var(--text-muted);margin-top:.3rem;text-align:center" id="cursor-upload-status">Uploading...</p>
                </div>
                <input type="file" id="cursor-input" accept=".png,.jpg,.jpeg,.webp,.gif,.cur" style="display:none">
            </div>
        </div>
        <!-- ══ PROFILE INFORMATION ═══════════════════════════ -->
        <div style="border-top:1px solid var(--border);padding-top:1.25rem;margin-top:.25rem">
            <div style="display:flex;align-items:center;gap:.85rem;margin-bottom:1.25rem">
                <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,rgba(0,212,255,.2),rgba(255,0,255,.15));border:1.5px solid rgba(0,212,255,.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 16px rgba(0,212,255,.15)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" width="20" height="20"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div>
                    <div style="font-size:.95rem;font-weight:700;color:var(--text)">Profile Information</div>
                    <div style="font-size:.75rem;color:var(--text-muted)">Customize your public profile</div>
                </div>
            </div>

            <div class="form-grid-2">
                <div class="form-group"><label>Display name</label><input type="text" name="display_name" class="form-control" value="<?= sanitize($profile['display_name'] ?? '') ?>" placeholder="Enter your display name" maxlength="100"></div>
                <div class="form-group"><label>Location</label><input type="text" name="location" class="form-control" value="<?= sanitize($profile['location'] ?? '') ?>" placeholder="Where are you from?" maxlength="100"></div>
            </div>
            <div class="form-group"><label>Bio</label><textarea name="bio" class="form-control" maxlength="300" placeholder="Tell people about yourself..."><?= sanitize($profile['bio'] ?? '') ?></textarea></div>
            <div class="form-group">
                <label>Profile font</label>
                <div class="font-select-wrapper">
                    <input type="hidden" name="profile_font" id="profile_font_input" value="<?= sanitize($profile['profile_font'] ?? 'Syne') ?>">
                    <div class="font-select-display" id="font-select-display" onclick="toggleFontDropdown()">
                        <span id="font-selected-label"><?= sanitize($profile['profile_font'] ?? 'Syne') ?></span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                </div>
            </div>

            <!-- Opacity & Blur -->
            <div class="form-grid-2">
                <div class="form-group">
                    <label style="display:flex;align-items:center;gap:.4rem">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20"/></svg>
                        Profile Opacity
                        <span id="opacity-val" style="margin-left:auto;color:var(--accent);font-weight:700;letter-spacing:0"><?= intval($profile['profile_opacity'] ?? 100) ?>%</span>
                    </label>
                    <input type="range" name="profile_opacity" id="profile_opacity_slider" min="0" max="100"
                           value="<?= intval($profile['profile_opacity'] ?? 100) ?>"
                           style="width:100%;accent-color:var(--accent);cursor:pointer">
                    <p style="font-size:.72rem;color:var(--text-muted);margin-top:.4rem">Controls the transparency of your profile card (0% = fully transparent, 100% = fully opaque)</p>
                </div>
                <div class="form-group">
                    <label style="display:flex;align-items:center;gap:.4rem">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                        Profile Blur
                        <span id="blur-val" style="margin-left:auto;color:var(--accent);font-weight:700;letter-spacing:0"><?= intval($profile['profile_blur'] ?? 0) ?>px</span>
                    </label>
                    <input type="range" name="profile_blur" id="profile_blur_slider" min="0" max="100"
                           value="<?= intval($profile['profile_blur'] ?? 0) ?>"
                           style="width:100%;accent-color:var(--accent);cursor:pointer">
                    <p style="font-size:.72rem;color:var(--text-muted);margin-top:.4rem">Adds a backdrop blur effect to your profile card (0px = no blur, 100px = maximum blur)</p>
                </div>
            </div>
        </div>

        <div style="border-top:1px solid var(--border);padding-top:1.25rem;margin-top:1.1rem">
            <div style="display:flex;align-items:center;gap:.85rem;margin-bottom:1.1rem">
                <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,rgba(0,212,255,.2),rgba(255,0,255,.15));border:1.5px solid rgba(0,212,255,.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 16px rgba(0,212,255,.15)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" width="20" height="20"><path d="M12 2l2.4 7.2H22l-6 4.6L18.3 21 12 16.6 5.7 21 8 13.8 2 9.2h7.6z"/></svg>
                </div>
                <div>
                    <div style="font-size:.95rem;font-weight:700;color:var(--text)">Decorations Library</div>
                    <div style="font-size:.75rem;color:var(--text-muted)">Loaded automatically from /assets/img/decorations (locked, read-only)</div>
                </div>
            </div>

            <?php if (empty($decorationItems)): ?>
            <div style="padding:.9rem 1rem;border-radius:12px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);font-size:.8rem;color:rgba(255,255,255,.45)">
                No decorations found in /assets/img/decorations.
            </div>
            <?php else: ?>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:.8rem">
                <?php foreach ($decorationItems as $item): ?>
                <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:.6rem;display:flex;flex-direction:column;gap:.5rem">
                    <div style="aspect-ratio:1/1;border-radius:10px;overflow:hidden;background:#09090f;border:1px solid rgba(255,255,255,.06)">
                        <img src="<?= sanitize($item['url']) ?>" alt="<?= sanitize($item['file']) ?>" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:contain;display:block">
                    </div>
                    <div style="font-size:.68rem;color:rgba(255,255,255,.55);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                        <?= sanitize($item['file']) ?>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>
        </div>
    </form>
</div>

<!-- Unsaved changes bar -->
<div class="unsaved-bar" id="unsaved-bar">
    <span class="unsaved-bar-text">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        You have unsaved changes!
    </span>
    <div class="unsaved-bar-actions">
        <button class="btn btn-secondary btn-sm" onclick="resetProfileForm()">Reset</button>
        <button class="btn btn-primary btn-sm" onclick="saveProfileForm()">Save Changes</button>
    </div>
</div>

<script>
(function() {
    // Snapshot original values on page load
    const form = document.getElementById('profile-info-form');
    const bar  = document.getElementById('unsaved-bar');
    let original = {};
    let isDirty  = false;

    // Avatar & background uploads save instantly — they should NOT trigger the unsaved bar.
    // The bar is only for fields the user edits manually (display name, bio, location, font, etc.).
    const IGNORED_FIELDS = new Set(['avatar', 'background_image']);

    function trackedFields() {
        return Array.from(form.querySelectorAll('input:not([type=file]), textarea, select'))
            .filter(el => {
                const key = el.name || el.id;
                return !IGNORED_FIELDS.has(key);
            });
    }

    function snapshot() {
        original = {};
        trackedFields().forEach(el => {
            original[el.name || el.id] = el.value;
        });
    }

    function checkDirty() {
        let dirty = false;
        trackedFields().forEach(el => {
            const key = el.name || el.id;
            if (el.value !== (original[key] ?? '')) dirty = true;
        });
        isDirty = dirty;
        bar.classList.toggle('visible', dirty);
    }

    // Listen for any change inside the form
    form.addEventListener('input', checkDirty);
    form.addEventListener('change', checkDirty);

    // Expose save / reset globally so buttons can call them
    window.saveProfileForm = async function() {
        await submitAjax('profile-info-form', '/api/update_profile.php', 'Profile saved!');
        snapshot();
        checkDirty();
    };

    window.resetProfileForm = function() {
        trackedFields().forEach(el => {
            const key = el.name || el.id;
            if (key in original) el.value = original[key];
        });
        // Dispatch input so other listeners update (font label, etc.)
        trackedFields().forEach(el => el.dispatchEvent(new Event('input', { bubbles: true })));
        checkDirty();
    };

    // Also mark dirty when uploads/clears happen (they update hidden inputs via JS)
    const _origSubmitAjax = window.submitAjax;
    // Re-snapshot after any successful avatar/bg upload that calls reload
    document.addEventListener('profileUploaded', () => { snapshot(); checkDirty(); });

    // Expose globally so other scripts (e.g. font dropdown in dashboard.js) can trigger dirty check
    window.markProfileDirty = checkDirty;

    // Slider live labels
    const opSlider = document.getElementById('profile_opacity_slider');
    const blSlider = document.getElementById('profile_blur_slider');
    if (opSlider) opSlider.addEventListener('input', function() {
        document.getElementById('opacity-val').textContent = this.value + '%';
        checkDirty();
    });
    if (blSlider) blSlider.addEventListener('input', function() {
        document.getElementById('blur-val').textContent = this.value + 'px';
        checkDirty();
    });

    snapshot();
})();
</script>
<?php
$pageContent = ob_get_clean();
require VIEWS_PATH . '/layouts/app.php';