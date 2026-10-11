{{-- Left-most Navigation Rail (64px Icon Column) --}}
<aside class="nav-rail" aria-label="Navigasi Utama">
    <div class="nav-rail-top">
        {{-- Brand / App Logo --}}
        <div class="rail-brand-avatar" title="ZChat Application" onclick="switchRailTab('chats')">
            <svg class="rail-brand-logo" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" fill="#ffffff" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>
                <path d="M8 8.5H16L8 15.5H16" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>

        {{-- Main Navigation Buttons --}}
        <nav class="rail-nav-group">
            {{-- Chat / Pesan Tab --}}
            <button
                type="button"
                id="railBtnChats"
                class="rail-nav-btn active"
                onclick="switchRailTab('chats')"
                title="Pesan"
                aria-label="Tab Pesan"
            >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span id="railChatsBadge" class="rail-badge" style="display: none;">0</span>
            </button>

            {{-- Contacts / Teman Tab --}}
            <button
                type="button"
                id="railBtnContacts"
                class="rail-nav-btn"
                onclick="switchRailTab('contacts')"
                title="Kontak Teman"
                aria-label="Tab Kontak"
            >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
            </button>

            {{-- Requests / Inbox Tab --}}
            <button
                type="button"
                id="railBtnRequests"
                class="rail-nav-btn"
                onclick="switchRailTab('requests')"
                title="Permintaan Pertemanan"
                aria-label="Tab Permintaan"
            >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
                    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
                </svg>
                <span id="railRequestsBadge" class="rail-badge" style="display: none;">0</span>
            </button>
        </nav>
    </div>

    <div class="nav-rail-bottom">
        {{-- Theme Switcher (Dark / Light Toggle) --}}
        <button
            type="button"
            id="btnThemeToggle"
            class="rail-nav-btn"
            onclick="toggleTheme()"
            title="Ganti Tema (Gelap / Terang)"
            aria-label="Ganti Tema"
        >
            {{-- Moon Icon (Dark Mode Active) --}}
            <svg id="themeIconDark" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
            {{-- Sun Icon (Light Mode Active) --}}
            <svg id="themeIconLight" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
        </button>

        {{-- Settings / Info Button --}}
        <button
            type="button"
            class="rail-nav-btn"
            onclick="openUserProfileModal()"
            title="Pengaturan & Profil Akun"
            aria-label="Pengaturan"
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
        </button>

        {{-- Current User Initials (Black Circle "RA" at Bottom) --}}
        <div
            id="myAvatarCircle"
            class="rail-user-avatar"
            onclick="openUserProfileModal()"
            title="Profil Saya - Klik untuk melihat / keluar"
            tabindex="0"
            role="button"
        >
            RA
        </div>
    </div>
</aside>
