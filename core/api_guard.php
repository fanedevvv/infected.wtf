<?php
// ── api_guard.php — include la începutul fiecărui fișier API ─────────────────
// Blochează accesul direct la fișierele API (din browser URL bar sau tool extern)
// Permite doar requesturi fetch/XHR legitime din interiorul site-ului

(function() {
    $allowedOrigin = 'getfame.wtf'; // <-- domeniul tău

    // 1. Verifică că requestul are X-Requested-With (setat de fetch/axios/jQuery)
    $xrw = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';

    // 2. Verifică Referer — vine de pe domeniul corect?
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    $validReferer = (
        str_contains($referer, $allowedOrigin) ||
        $referer === '' // permite requesturi server-to-server fără referer
    );

    // 3. Blochează dacă nu e XHR și referer-ul e extern
    if (strtolower($xrw) !== 'xmlhttprequest' && !$validReferer) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Forbidden']);
        exit;
    }
})();