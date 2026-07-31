<?php
/**
 * migrate_blind_index.php
 * Script one-time: populează email_blind_index pentru userii existenți.
 * RULARE: pune în public_html, accesează o dată, apoi ȘTERGE-L!
 */

define('MIGRATION_SECRET', 'change-me-before-running');
if (php_sapi_name() !== 'cli') {
    $provided = $_GET['secret'] ?? '';
    if ($provided !== MIGRATION_SECRET) {
        http_response_code(403);
        die('Forbidden. Adaugă ?secret=change-me-before-running în URL.');
    }
}

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/core/database.php';
require_once __DIR__ . '/core/helpers.php';

set_time_limit(0);
echo "<pre>\n=== Migrare email_blind_index ===\n\n";

// Pasul 1: ALTER-uri
$alters = [
    "ALTER TABLE `users` MODIFY COLUMN `email` VARCHAR(500) NOT NULL"                                                                => 'email VARCHAR(500)',
    "ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `email_blind_index` VARCHAR(64) DEFAULT NULL AFTER `email`"                        => 'email_blind_index',
    "CREATE INDEX IF NOT EXISTS `idx_users_email_blind` ON `users` (`email_blind_index`)"                                            => 'index email_blind',
    "ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `cookie_consent` ENUM('accepted','rejected') DEFAULT NULL"                        => 'cookie_consent',
];
foreach ($alters as $sql => $label) {
    try { $pdo->exec($sql); echo "OK  $label\n"; }
    catch (Exception $e) { echo "~   $label: " . $e->getMessage() . "\n"; }
}

// Pasul 2: populare blind index
echo "\n=== Populare blind index ===\n";
$rows = $pdo->query("SELECT id, email FROM users WHERE email_blind_index IS NULL OR email_blind_index = ''")->fetchAll(PDO::FETCH_ASSOC);
$upd = $pdo->prepare("UPDATE users SET email_blind_index=? WHERE id=?");
$updated = $skipped = $errors = 0;
foreach ($rows as $r) {
    try {
        $plain = decryptEmail($r['email']);
        if (!$plain) { $skipped++; echo "SKIP #{$r['id']}\n"; continue; }
        $upd->execute([emailBlindIndex($plain), $r['id']]);
        echo "OK   #{$r['id']}\n";
        $updated++;
    } catch (Exception $e) { echo "ERR  #{$r['id']}: " . $e->getMessage() . "\n"; $errors++; }
}
echo "\nActualizați: $updated | Omisi: $skipped | Erori: $errors\n";
echo "\n⚠️  ȘTERGE ACEST FIȘIER imediat!\n</pre>\n";
