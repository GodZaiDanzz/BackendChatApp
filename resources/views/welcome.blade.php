<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ZChat Server Portal</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
            background-color: #09090b;
            color: #f4f4f5;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
        }
        .container {
            width: 100%;
            max-width: 640px;
            background: #18181b;
            border: 1px solid #27272a;
            border-radius: 16px;
            padding: 2rem;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 2rem;
            padding-bottom: 1.25rem;
            border-bottom: 1px solid #27272a;
        }
        .brand {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        .brand-icon {
            width: 40px;
            height: 40px;
            background: #2563eb;
            color: #ffffff;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1.25rem;
        }
        .brand-title {
            font-size: 1.25rem;
            font-weight: 700;
            letter-spacing: -0.02em;
        }
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(34, 197, 94, 0.1);
            color: #4ade80;
            border: 1px solid rgba(34, 197, 94, 0.2);
            padding: 0.35rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.8125rem;
            font-weight: 600;
        }
        .status-dot {
            width: 8px;
            height: 8px;
            background-color: #22c55e;
            border-radius: 50%;
        }
        .hero-section {
            margin-bottom: 2rem;
        }
        .hero-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            line-height: 1.3;
        }
        .hero-desc {
            color: #a1a1aa;
            font-size: 0.9375rem;
            line-height: 1.6;
        }
        .specs-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .spec-card {
            background: #27272a;
            border: 1px solid #3f3f46;
            border-radius: 12px;
            padding: 1rem;
        }
        .spec-label {
            font-size: 0.75rem;
            color: #a1a1aa;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.25rem;
        }
        .spec-value {
            font-size: 0.9375rem;
            font-weight: 600;
            color: #f4f4f5;
        }
        .actions {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        .btn-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: #2563eb;
            color: #ffffff;
            font-weight: 600;
            font-size: 0.9375rem;
            padding: 0.875rem 1.25rem;
            border-radius: 10px;
            text-decoration: none;
            transition: background-color 0.2s ease;
        }
        .btn-primary:hover {
            background: #1d4ed8;
        }
        .footer-note {
            margin-top: 1.5rem;
            text-align: center;
            font-size: 0.8125rem;
            color: #71717a;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="brand">
                <div class="brand-icon">Z</div>
                <div class="brand-title">ZChat API</div>
            </div>
            <div class="status-badge">
                <span class="status-dot"></span>
                <span>Server Online</span>
            </div>
        </div>

        <div class="hero-section">
            <h1 class="hero-title">Backend API & Server Real-time</h1>
            <p class="hero-desc">
                Layanan backend ini mendukung komunikasi pesan instan real-time untuk aplikasi client Android ZChat.
            </p>
        </div>

        <div class="specs-grid">
            <div class="spec-card">
                <div class="spec-label">Protokol API</div>
                <div class="spec-value">REST + Sanctum</div>
            </div>
            <div class="spec-card">
                <div class="spec-label">Real-time Engine</div>
                <div class="spec-value">Laravel Reverb</div>
            </div>
            <div class="spec-card">
                <div class="spec-label">Push Notification</div>
                <div class="spec-value">Firebase FCM</div>
            </div>
        </div>

        <div class="actions">
            <a href="/chat" class="btn-primary" style="background: #2563eb;">
                Buka ZChat Web Client
            </a>
            <a href="/download/chat.apk" class="btn-primary" style="background: #27272a; border: 1px solid #3f3f46;">
                Unduh Aplikasi Android (.APK)
            </a>
        </div>

        <div class="footer-note">
            ZChat Backend Service &bull; {{ date('Y') }}
        </div>
    </div>
</body>
</html>
