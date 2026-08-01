-- ═══════════════════════════════════════════════════════════════════════════
--  MIGRATION — Rulează pe baza de date existentă (infectedw)
--  Adaugă coloanele lipsă: email_blind_index + cookie_consent
--  + mărește câmpul email pentru a stoca valoarea criptată (AES-CBC base64)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Mărește câmpul email (emailurile criptate AES-CBC în base64 pot depăși 150 chars)
ALTER TABLE `users`
    MODIFY COLUMN `email` VARCHAR(500) NOT NULL;

-- 2. Adaugă coloana pentru blind index (HMAC-SHA256 = 64 hex chars)
ALTER TABLE `users`
    ADD COLUMN IF NOT EXISTS `email_blind_index` VARCHAR(64) DEFAULT NULL AFTER `email`;

-- 3. Index pentru lookup rapid după email_blind_index
CREATE INDEX IF NOT EXISTS `idx_users_email_blind`
    ON `users` (`email_blind_index`);

-- 4. Adaugă coloana cookie_consent (folosită și de banner și de API)
ALTER TABLE `users`
    ADD COLUMN IF NOT EXISTS `cookie_consent`
    ENUM('accepted','rejected') DEFAULT NULL;

-- ───────────────────────────────────────────────────────────────────────────
-- ATENȚIE: după ce rulezi acest script, trebuie să populezi email_blind_index
-- pentru userii existenți. Poți face asta dintr-un script PHP one-time care
-- itereaza toti userii, decripteaza emailul si seteaza blind index-ul.
-- Exemplu snippet (rulat o singura data):
--
--   $rows = $pdo->query("SELECT id, email FROM users WHERE email_blind_index IS NULL")->fetchAll();
--   foreach ($rows as $r) {
--       $plain = decryptEmail($r['email']);
--       $pdo->prepare("UPDATE users SET email_blind_index=? WHERE id=?")
--           ->execute([emailBlindIndex($plain), $r['id']]);
--   }
-- ═══════════════════════════════════════════════════════════════════════════
