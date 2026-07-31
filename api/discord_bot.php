<?php

/**
 * api/discord_bot.php
 *
 * Endpoint unificat pentru Discord bot.
 *
 * Acţiuni disponibile (query param ?action=):
 *   stats      — statistici generale site (members, views, premium, verified)
 *   top_views  — top 10 profiluri după views
 *
 * Autentificare: header X-Api-Key sau query param ?key=
 *
 * Exemple:
 *   GET /api/discord_bot.php?action=stats
 *   GET /api/discord_bot.php?action=top_views
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/helpers.php';

header('Content-Type: application/json');

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────

$apiKey   = $_SERVER['HTTP_X_API_KEY'] ?? $_GET['key'] ?? '';
$validKey = defined('DISCORD_BOT_API_KEY') ? DISCORD_BOT_API_KEY : '';

if ($validKey === '' || $apiKey !== $validKey) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// ─────────────────────────────────────────────
// ROUTING
// ─────────────────────────────────────────────

$action = $_GET['action'] ?? '';

switch ($action) {

    // ─────────────────────────────────────────
    // STATS — statistici generale
    // ─────────────────────────────────────────
    case 'stats':

        try {

            // TOTAL MEMBERS
            $stmtMembers = $pdo->query("
                SELECT COUNT(*)
                FROM users
                WHERE banned = 0 AND email_verified = 1
            ");
            $totalMembers = (int) $stmtMembers->fetchColumn();

            // TOTAL VIEWS
            $stmtViews = $pdo->query("
                SELECT COALESCE(SUM(views), 0)
                FROM profiles
            ");
            $totalViews = (int) $stmtViews->fetchColumn();

            // PREMIUM USERS
            $stmtPremium = $pdo->query("
                SELECT COUNT(*)
                FROM users
                WHERE is_premium = 1
                  AND banned = 0
                  AND email_verified = 1
                  AND (
                        premium_expires_at IS NULL
                        OR premium_expires_at > NOW()
                  )
            ");
            $premiumCount = (int) $stmtPremium->fetchColumn();

            // VERIFIED USERS
            $verifiedCount = 0;

            try {

                $stmtVerified = $pdo->query("
                    SELECT COUNT(DISTINCT user_id)
                    FROM badge_settings
                    WHERE badge_id = 'verified'
                      AND enabled = 1
                ");
                $verifiedCount = (int) $stmtVerified->fetchColumn();

            } catch (Exception $e) {

                try {

                    $stmtVerified = $pdo->query("
                        SELECT COUNT(*)
                        FROM profiles
                        WHERE JSON_SEARCH(badges, 'one', 'verified') IS NOT NULL
                    ");
                    $verifiedCount = (int) $stmtVerified->fetchColumn();

                } catch (Exception $e2) {
                    $verifiedCount = 0;
                }
            }

            echo json_encode([
                'success'        => true,
                'total_members'  => $totalMembers,
                'total_views'    => $totalViews,
                'premium_count'  => $premiumCount,
                'verified_count' => $verifiedCount,
                'timestamp'      => time()
            ]);

        } catch (Exception $e) {

            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }

        break;

    // ─────────────────────────────────────────
    // TOP VIEWS — top 10 profiluri după views
    // ─────────────────────────────────────────
    case 'top_views':

        try {

            $stmt = $pdo->query("
                SELECT
                    u.id,
                    u.username,
                    COALESCE(p.display_name, '')  AS display_name,
                    COALESCE(p.avatar, '')        AS avatar,
                    COALESCE(p.views, 0)          AS views,
                    COALESCE(u.is_premium, 0)     AS is_premium
                FROM users u
                JOIN profiles p ON p.user_id = u.id
                WHERE u.banned = 0 AND u.email_verified = 1
                ORDER BY p.views DESC
                LIMIT 10
            ");

            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $data = [];
            foreach ($rows as $i => $row) {

                $avatarUrl = null;
                if (!empty($row['avatar'])) {
                    $avatarUrl = rtrim(SITE_URL, '/') . '/uploads/avatars/' . basename($row['avatar']);
                }

                $data[] = [
                    'rank'         => $i + 1,
                    'username'     => $row['username'],
                    'display_name' => $row['display_name'],
                    'views'        => (int) $row['views'],
                    'avatar_url'   => $avatarUrl,
                    'is_premium'   => (bool) $row['is_premium'],
                    'profile_url'  => rtrim(SITE_URL, '/') . '/' . rawurlencode($row['username']),
                ];
            }

            echo json_encode(['success' => true, 'data' => $data]);

        } catch (Exception $e) {

            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database error']);
        }

        break;

    // ─────────────────────────────────────────
    // UNKNOWN ACTION
    // ─────────────────────────────────────────
    default:

        http_response_code(400);
        echo json_encode([
            'success'  => false,
            'error'    => 'Unknown action. Available: stats, top_views'
        ]);

        break;
}