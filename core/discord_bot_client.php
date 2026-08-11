<?php
// ── core/discord_bot_client.php ─────────────────────────────────────────────
// Shared HTTP client for talking to the discord-bot/ Express API.
// Used by api/integrations.php, api/discord_oauth.php and api/admin_action.php.
// ─────────────────────────────────────────────────────────────────────────────

function discordBotUrl(): string {
    return defined('DISCORD_BOT_URL') ? rtrim(DISCORD_BOT_URL, '/') : 'http://127.0.0.1:4001';
}

function discordBotApiKey(): string {
    return defined('DISCORD_BOT_API_KEY') ? DISCORD_BOT_API_KEY : '';
}

/**
 * GET request to the bot API. Returns [data|null, error|null].
 */
function discordBotRequest(string $path, int $timeout = 8): array {
    $ch = curl_init(discordBotUrl() . $path);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_HTTPHEADER     => [
            'X-Api-Key: ' . discordBotApiKey(),
            'User-Agent: Infected-Site/1.0',
        ],
    ]);
    $res     = curl_exec($ch);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($res === false || $res === '') {
        return [null, $curlErr ?: 'No response from bot'];
    }
    return [json_decode($res, true), null];
}

/**
 * POST (JSON body) request to the bot API. Returns [data|null, error|null].
 * $timeout defaults short (fire-and-forget) so role/ban syncs never block the request.
 */
function discordBotPost(string $path, array $body = [], int $timeout = 5): array {
    $ch = curl_init(discordBotUrl() . $path);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_CONNECTTIMEOUT => 2,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($body),
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'X-Api-Key: ' . discordBotApiKey(),
            'User-Agent: Infected-Site/1.0',
        ],
    ]);
    $res     = curl_exec($ch);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($res === false || $res === '') {
        return [null, $curlErr ?: 'No response from bot'];
    }
    return [json_decode($res, true), null];
}

/**
 * Look up the discord_user_id linked to a site user, if any.
 */
function getLinkedDiscordId(PDO $pdo, int $userId): ?string {
    $stmt = $pdo->prepare("SELECT discord_user_id FROM integrations WHERE user_id=? AND type='discord'");
    $stmt->execute([$userId]);
    $id = $stmt->fetchColumn();
    return $id ?: null;
}

/**
 * Grant/revoke the "cont infected" role. Call whenever a Discord account gets linked/unlinked.
 */
function syncDiscordInfectedRole(string $discordId, bool $grant): void {
    discordBotPost($grant ? '/assign-infected-role' : '/remove-infected-role', ['discord_id' => $discordId]);
}

/**
 * Ban/unban a linked Discord account on the guild. Fire-and-forget, mirrors syncDiscordPremiumRole().
 */
function syncDiscordBanState(PDO $pdo, int $userId, bool $banned, string $reason = ''): void {
    $discordId = getLinkedDiscordId($pdo, $userId);
    if (!$discordId) return;
    discordBotPost($banned ? '/ban' : '/unban', ['discord_id' => $discordId, 'reason' => $reason]);
}
