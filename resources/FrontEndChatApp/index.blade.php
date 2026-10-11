<!DOCTYPE html>
<html lang="id" data-theme="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="ZChat Web - Aplikasi Pesan Instan Modern Real-time">
    <title>ZChat Web - Ruang Obrolan Real-time</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='12' fill='%237c3aed'/%3E%3Cpath d='M7.9 20A9 9 0 1 0 4 16.1L2 22Z' fill='%23ffffff' stroke='%23ffffff' stroke-width='1.2' stroke-linejoin='round'/%3E%3Cpath d='M8 8.5H16L8 15.5H16' stroke='%237c3aed' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E">

    {{-- Script pencegah flicker tema saat loading awal --}}
    <script>
        (function() {
            try {
                var saved = localStorage.getItem('zchat_theme') || 'dark';
                document.documentElement.setAttribute('data-theme', saved);
            } catch (e) {}
        })();
    </script>

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
    @include('components.create-group-modal')
    @include('components.add-group-member-modal')
    @include('components.contact-info-modal')
    @include('components.user-profile-modal')
    @include('components.toast')

    {{-- Application Logic Script --}}
    <script src="/chat-assets/js/app.js?v={{ time() }}"></script>
</body>
</html>
