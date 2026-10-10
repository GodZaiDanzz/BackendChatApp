<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="ZChat Web - Aplikasi Pesan Instan Modern Real-time">
    <title>ZChat Web - Ruang Obrolan Real-time</title>

    {{-- Google Fonts: Plus Jakarta Sans --}}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

    {{-- Dedicated CSS Stylesheet --}}
    <link rel="stylesheet" href="/chat-assets/css/style.css?v={{ time() }}">
</head>
<body>
    {{-- Application Viewport Shell (Multi-Column Layout) --}}
    <div class="app-viewport">
        {{-- Column 1: Left-most Navigation Rail (64px) --}}
        @include('components.nav-rail')

        {{-- Column 2: Chat & Contacts Sidebar (320px) --}}
        @include('components.chat-sidebar')

        {{-- Column 3: Active Chat Stream & Floating Input (Flex-1) --}}
        @include('components.chat-main')

        {{-- Column 4: Right Contact Info Panel (280px) --}}
        @include('components.chat-info-panel')
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
