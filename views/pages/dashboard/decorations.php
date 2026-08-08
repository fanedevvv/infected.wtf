<?php
requireLogin();
checkBanned($pdo);
$userId = (int)$_SESSION['user_id'];
$profile = getProfile($pdo, $userId);

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

    usort($decorationItems, static function (array $a, array $b): int {
        return $a['index'] <=> $b['index'];
    });
}

$currentPage = 'decorations';
$pageTitle = 'Decorations';
ob_start();
?>

<div class="section-header">
    <h2>Decorations</h2>
    <p>Gallery loaded from <strong>/assets/img/decorations</strong> (locked, read-only).</p>
</div>

<div class="dash-card" style="padding:1rem">
    <?php if (empty($decorationItems)): ?>
    <div style="padding:.9rem 1rem;border-radius:12px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);font-size:.82rem;color:rgba(255,255,255,.45)">
        Nu s-au găsit imagini în /assets/img/decorations (format custom_X.png).
    </div>
    <?php else: ?>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:.8rem">
        <?php foreach ($decorationItems as $item): ?>
        <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:.6rem;display:flex;flex-direction:column;gap:.5rem">
            <div style="aspect-ratio:1/1;border-radius:10px;overflow:hidden;background:#09090f;border:1px solid rgba(255,255,255,.06)">
                <img src="<?= sanitize($item['url']) ?>" alt="<?= sanitize($item['file']) ?>" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:contain;display:block">
            </div>
            <div style="font-size:.68rem;color:rgba(255,255,255,.58);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                <?= sanitize($item['file']) ?>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>
</div>

<?php
$pageContent = ob_get_clean();
require VIEWS_PATH . '/layouts/app.php';
