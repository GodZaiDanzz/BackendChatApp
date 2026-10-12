{{-- Chat Sidebar Component (Second Column: Chat List) --}}
<aside class="sidebar">
    {{-- Sidebar Top: Ruang Obrolan & Pesan Title with Compose Button --}}
    <div class="sidebar-header-row">
        <div class="sidebar-title-group">
            <span class="sidebar-eyebrow">RUANG OBROLAN</span>
            <h1 class="sidebar-main-title">Pesan</h1>
        </div>

        <div style="display: flex; align-items: center; gap: 0.5rem;">
            {{-- Quick Theme Toggle for Mobile Screens --}}
            <button
                type="button"
                id="btnMobileThemeToggle"
                class="btn-compose-circle mobile-only-action"
                onclick="toggleTheme()"
                title="Ganti Tema (Gelap / Terang)"
                aria-label="Ganti Tema"
            >
                <svg id="mobileThemeIconDark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
                <svg id="mobileThemeIconLight" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
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
            {{-- Buat Grup Baru Button --}}
            <button
                type="button"
                class="btn-compose-circle"
                onclick="openCreateGroupModal()"
                title="Buat Grup Baru"
                aria-label="Buat Grup Baru"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
            </button>

            {{-- Tambah Teman Button --}}
            <button
                type="button"
                class="btn-compose-circle"
                onclick="openAddFriendModal()"
                title="Cari & Tambah Teman Baru"
                aria-label="Tambah Teman Baru"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
        </div>
    </div>

    {{-- Search Bar: Cari percakapan... --}}
    <div class="search-box-wrapper">
        <div class="search-box-inner">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="search-icon">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
                id="localFilterInput"
                type="text"
                class="search-input-field"
                placeholder="Cari percakapan..."
                oninput="handleLocalFilter(this.value)"
            >
        </div>
    </div>

    {{-- Category Row: TERBARU + Tandai dibaca --}}
    <div class="sidebar-category-row">
        <span id="sidebarSectionLabel" class="sidebar-section-tag">TERBARU</span>
        <button
            type="button"
            class="btn-mark-read"
            onclick="handleMarkAllRead()"
            title="Tandai semua pesan telah dibaca"
        >
            Tandai dibaca
        </button>
    </div>

    {{-- Scrollable List Area --}}
    <div class="sidebar-list">
        {{-- Panel 1: Active Conversations List --}}
        <div id="panelChats">
            <div id="chatsContainer">
                <div class="empty-state">
                    <p class="empty-state-desc">Belum ada percakapan aktif. Mulai obrolan baru dengan teman Anda.</p>
                </div>
            </div>
        </div>

        {{-- Panel 2: Contacts List (Switched from Rail) --}}
        <div id="panelContacts" style="display: none;">
            <div id="contactsContainer">
                <div class="empty-state">
                    <p class="empty-state-desc">Belum ada teman terhubung. Klik tombol tambah (+) di atas untuk menambah teman baru.</p>
                </div>
            </div>
        </div>

        {{-- Panel 3: Friend Requests List (Switched from Rail) --}}
        <div id="panelRequests" style="display: none;">
            <div id="requestsContainer">
                <div class="empty-state">
                    <p class="empty-state-desc">Tidak ada permintaan pertemanan saat ini.</p>
                </div>
            </div>
        </div>

        {{-- Panel 4: Call Logs List (Switched from Rail) --}}
        <div id="panelCalls" style="display: none;">
            <div id="callsContainer">
                <div class="empty-state">
                    <p class="empty-state-desc">Belum ada riwayat panggilan.</p>
                </div>
            </div>
        </div>
    </div>
</aside>
