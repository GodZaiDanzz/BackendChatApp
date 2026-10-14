{{-- Chat Sidebar Component (Second Column: Chat List / Settings) --}}
<aside class="sidebar">
    {{-- Sidebar Top: Ruang Obrolan & Pesan Title with Compose Button --}}
    <div id="sidebarDefaultHeader" class="sidebar-header-row">
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

    {{-- Settings Sidebar Header (WhatsApp Web style - matches Image 2) --}}
    <div id="sidebarSettingsHeader" class="sidebar-header-row" style="display: none; align-items: center; justify-content: flex-start; gap: 0.85rem; padding-bottom: 0.75rem;">
        <button
            type="button"
            class="btn-compose-circle"
            onclick="switchRailTab('chats')"
            title="Kembali ke Obrolan"
            aria-label="Kembali ke Pesan"
            style="width: 34px; height: 34px; flex-shrink: 0;"
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
        </button>
        <div style="flex: 1; min-width: 0;">
            <h1 id="settingsHeaderUsername" class="sidebar-main-title" style="font-size: 1.5rem; font-weight: 700; text-transform: lowercase; margin: 0; line-height: 1.1; letter-spacing: -0.02em;">
                zaidan
            </h1>
        </div>
    </div>

    {{-- Search Bar: Cari percakapan... --}}
    <div id="sidebarDefaultSearch" class="search-box-wrapper">
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

    {{-- Settings Search Bar: Cari (Matches Image 2) --}}
    <div id="sidebarSettingsSearch" class="search-box-wrapper" style="display: none;">
        <div class="search-box-inner">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="search-icon">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
                id="settingsFilterInput"
                type="text"
                class="search-input-field"
                placeholder="Cari"
                oninput="filterSettingsList(this.value)"
            >
        </div>
    </div>

    {{-- Category Row: TERBARU + Tandai dibaca --}}
    <div id="sidebarDefaultCategory" class="sidebar-category-row">
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

        {{-- Panel 5: Settings Menu List (WhatsApp Web Style - Matches Image 2) --}}
        <div id="panelSettings" class="settings-panel-view" style="display: none;">
            <div id="settingsMenuList" class="settings-menu-list">
                {{-- 1. Profil --}}
                <div class="settings-item" onclick="openUserProfileModal()" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')openUserProfileModal()" data-keywords="profil nama foto profil nama pengguna username avatar bio">
                    <div class="settings-item-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="7" r="4"></circle>
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        </svg>
                    </div>
                    <div class="settings-item-body">
                        <div class="settings-item-title">Profil</div>
                        <div class="settings-item-desc">Nama, foto profil, nama pengguna</div>
                    </div>
                </div>

                {{-- 2. Akun --}}
                <div class="settings-item" onclick="openAccountSecurityModal()" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')openAccountSecurityModal()" data-keywords="akun notifikasi keamanan info akun email username telepon sandi">
                    <div class="settings-item-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="7.5" cy="15.5" r="5.5"></circle>
                            <path d="m21 2-9.6 9.6"></path>
                            <path d="m15.5 7.5 3 3L22 7l-3-3"></path>
                        </svg>
                    </div>
                    <div class="settings-item-body">
                        <div class="settings-item-title">Akun</div>
                        <div class="settings-item-desc">Notifikasi keamanan, info akun</div>
                    </div>
                </div>

                {{-- 3. Privasi --}}
                <div class="settings-item" onclick="openPrivacySettingsModal()" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')openPrivacySettingsModal()" data-keywords="privasi kontak diblokir pesan sementara streamer mode sensor">
                    <div class="settings-item-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                    <div class="settings-item-body">
                        <div class="settings-item-title">Privasi</div>
                        <div class="settings-item-desc">Kontak diblokir, pesan sementara</div>
                    </div>
                </div>

                {{-- 4. Chat --}}
                <div class="settings-item" onclick="openChatPreferencesModal()" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')openChatPreferencesModal()" data-keywords="chat tema wallpaper pengaturan obrolan warna tampilan">
                    <div class="settings-item-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <div class="settings-item-body">
                        <div class="settings-item-title">Chat</div>
                        <div class="settings-item-desc">Tema, wallpaper, pengaturan obrolan</div>
                    </div>
                </div>

                {{-- 5. Notifikasi --}}
                <div class="settings-item" onclick="openNotificationSettingsModal()" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')openNotificationSettingsModal()" data-keywords="notifikasi pesan grup suara audio dering bell">
                    <div class="settings-item-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                    </div>
                    <div class="settings-item-body">
                        <div class="settings-item-title">Notifikasi</div>
                        <div class="settings-item-desc">Pesan, grup, suara</div>
                    </div>
                </div>

                {{-- 6. Pintasan keyboard --}}
                <div class="settings-item" onclick="openKeyboardShortcutsModal()" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')openKeyboardShortcutsModal()" data-keywords="pintasan keyboard shortcut tindakan cepat tombol navigasi enter">
                    <div class="settings-item-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                            <line x1="6" y1="8" x2="6" y2="8"></line>
                            <line x1="10" y1="8" x2="10" y2="8"></line>
                            <line x1="14" y1="8" x2="14" y2="8"></line>
                            <line x1="18" y1="8" x2="18" y2="8"></line>
                            <line x1="6" y1="12" x2="6" y2="12"></line>
                            <line x1="10" y1="12" x2="10" y2="12"></line>
                            <line x1="14" y1="12" x2="14" y2="12"></line>
                            <line x1="18" y1="12" x2="18" y2="12"></line>
                            <line x1="7" y1="16" x2="17" y2="16"></line>
                        </svg>
                    </div>
                    <div class="settings-item-body">
                        <div class="settings-item-title">Pintasan keyboard</div>
                        <div class="settings-item-desc">Tindakan cepat</div>
                    </div>
                </div>

                {{-- 7. Bantuan dan masukan --}}
                <div class="settings-item" onclick="openHelpSupportModal()" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')openHelpSupportModal()" data-keywords="bantuan masukan pusat bantuan hubungi kami kebijakan privasi faq support panduan">
                    <div class="settings-item-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                    </div>
                    <div class="settings-item-body">
                        <div class="settings-item-title">Bantuan dan masukan</div>
                        <div class="settings-item-desc">Pusat Bantuan, hubungi kami, Kebijakan Privasi</div>
                    </div>
                </div>

                {{-- 8. Logout --}}
                <div class="settings-item danger" onclick="handleLogout()" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')handleLogout()" data-keywords="logout keluar akun signout exit log off">
                    <div class="settings-item-icon text-danger">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                    </div>
                    <div class="settings-item-body">
                        <div class="settings-item-title text-danger">Logout</div>
                    </div>
                </div>
            </div>
            <div id="settingsEmptyFilter" class="empty-state" style="display: none; padding: 2rem 1rem;">
                <p class="empty-state-desc">Tidak ada pengaturan yang cocok dengan pencarian Anda.</p>
            </div>
        </div>
    </div>
</aside>
