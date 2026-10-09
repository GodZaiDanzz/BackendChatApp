<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="ZChat Web - Aplikasi Pesan Instan Real-time yang Terhubung dengan Backend API Laravel 12">
    <title>ZChat Web - Pesan Instan Real-time</title>

    {{-- Google Fonts: Plus Jakarta Sans --}}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

    {{-- Dedicated CSS Stylesheet --}}
    <link rel="stylesheet" href="/chat-assets/css/style.css?v={{ time() }}">
</head>
<body>
    {{-- Application Viewport Shell --}}
    <div class="app-viewport">
        {{-- Left Panel: Chat & Contacts Sidebar --}}
        @include('components.chat-sidebar')

        {{-- Right Panel: Active Chat Stream & Input --}}
        @include('components.chat-main')
    </div>

    {{-- Modals & Floating Components --}}
    @include('components.auth-modal')
    @include('components.add-friend-modal')
    @include('components.contact-info-modal')
    @include('components.toast')

    {{-- Application Logic Script --}}
    <script src="/chat-assets/js/app.js?v={{ time() }}"></script>
</body>
</html>
