<?php http_response_code(404); ?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= SITE_NAME ?> — 404</title>
<link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon.png">
<link rel="stylesheet" href="/assets/css/main.css?v=<?= @filemtime($_SERVER['DOCUMENT_ROOT'].'/assets/css/main.css') ?: time() ?>"></head>
<body class="auth-page"><div class="auth-card" style="text-align:center">
<h2 style="font-size:4rem;font-family:'Syne',sans-serif">404</h2>
<p style="color:var(--text-muted)">Page not found.</p>
<a href="/" class="btn btn-secondary" style="margin-top:1.5rem">Home</a>
</div></body></html>
