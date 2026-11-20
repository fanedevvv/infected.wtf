-- Staff-uploaded profile effects (animated WebP/GIF/APNG or WebM) sold in the Collectibles shop as "cx-<id>".
CREATE TABLE IF NOT EXISTS custom_effects (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(60) NOT NULL,
  description VARCHAR(200) NULL,
  rarity VARCHAR(16) NOT NULL DEFAULT 'epic',
  price INT NOT NULL DEFAULT 500,
  file VARCHAR(255) NOT NULL,
  kind VARCHAR(8) NOT NULL DEFAULT 'image',
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
