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

    {{-- Settings Subpanel Header (e.g. Edit profil, Akun, Privasi) --}}
    <div id="sidebarSubpanelHeader" class="sidebar-header-row" style="display: none; align-items: center; justify-content: flex-start; gap: 0.85rem; padding-bottom: 0.75rem;">
        <button
            type="button"
            class="btn-compose-circle"
            onclick="backToSettingsMain()"
            title="Kembali ke Pengaturan"
            aria-label="Kembali ke Pengaturan"
            style="width: 34px; height: 34px; flex-shrink: 0;"
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
        </button>
        <div style="flex: 1; min-width: 0;">
            <h1 id="settingsSubpanelTitle" class="sidebar-main-title" style="font-size: 1.25rem; font-weight: 700; margin: 0; line-height: 1.2;">
                Edit profil
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
                <div class="settings-item" onclick="openSettingsSubpanel('profile')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')openSettingsSubpanel('profile')" data-keywords="profil nama foto profil nama pengguna username avatar bio">
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
                <div class="settings-item" onclick="openSettingsSubpanel('account')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')openSettingsSubpanel('account')" data-keywords="akun notifikasi keamanan info akun email username telepon sandi">
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
                <div class="settings-item" onclick="openSettingsSubpanel('privacy')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')openSettingsSubpanel('privacy')" data-keywords="privasi kontak diblokir pesan sementara streamer mode sensor">
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
                <div class="settings-item" onclick="openSettingsSubpanel('chat')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')openSettingsSubpanel('chat')" data-keywords="chat tema wallpaper pengaturan obrolan warna tampilan">
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
                <div class="settings-item" onclick="openSettingsSubpanel('notifications')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')openSettingsSubpanel('notifications')" data-keywords="notifikasi pesan grup suara audio dering bell">
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
                <div class="settings-item" onclick="openSettingsSubpanel('keyboard')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')openSettingsSubpanel('keyboard')" data-keywords="pintasan keyboard shortcut tindakan cepat tombol navigasi enter">
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
                <div class="settings-item" onclick="openSettingsSubpanel('help')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')openSettingsSubpanel('help')" data-keywords="bantuan masukan pusat bantuan hubungi kami kebijakan privasi faq support panduan">
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

        {{-- Panel 6: Settings Subpanel View (In-Sidebar Pages - No Modal Popup) --}}
        <div id="panelSettingsSubpanel" class="settings-subpanel-view" style="display: none;">
            {{-- Subpanel 1: Edit profil (Matches user screenshot) --}}
            <div id="subpanelProfile" class="subpanel-content" style="display: none;">
                {{-- Large Centered Avatar with Camera Icon Overlay --}}
                <div class="subpanel-avatar-section">
                    <div id="subpanelAvatarCircle" class="subpanel-avatar-circle" onclick="document.getElementById('subpanelAvatarFileInput').click()" title="Klik untuk ubah foto profil">
                        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                            <line x1="19" y1="5" x2="19" y2="9"></line>
                            <line x1="17" y1="7" x2="21" y2="7"></line>
                        </svg>
                        <div class="subpanel-avatar-overlay">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                <circle cx="12" cy="13" r="4"></circle>
                            </svg>
                            <span>UBAH FOTO</span>
                        </div>
                    </div>

                    <input type="file" id="subpanelAvatarFileInput" accept="image/*" style="display: none;" onchange="handleUserAvatarSelected(event)">

                    <div style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.75rem;">
                        <button type="button" class="btn-outline-action" onclick="document.getElementById('subpanelAvatarFileInput').click()" style="padding: 0.25rem 0.65rem; font-size: 0.75rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                <circle cx="12" cy="13" r="4"></circle>
                            </svg>
                            <span>Ubah Foto</span>
                        </button>
                        <button type="button" id="btnDeleteSubpanelAvatar" class="btn-outline-action" onclick="handleDeleteUserAvatar()" style="display: none; padding: 0.25rem 0.65rem; font-size: 0.75rem; border-radius: 6px; color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">
                            Hapus Foto
                        </button>
                    </div>

                    <div id="subpanelAvatarInfoBadge" style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.35rem;">
                        Ukuran standar WhatsApp (500x500) • Maks 10MB
                    </div>
                </div>

                {{-- Field 1: About (Matches user screenshot) --}}
                <div class="profile-field-group">
                    <div class="profile-field-label">About</div>
                    <div class="profile-field-row">
                        <div style="display: flex; align-items: center; gap: 0.65rem; flex: 1; min-width: 0;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                                <line x1="9" y1="9" x2="9.01" y2="9"></line>
                                <line x1="15" y1="9" x2="15.01" y2="9"></line>
                            </svg>
                            <input type="text" id="subpanelAboutInput" class="profile-field-input" placeholder="Share a thought" value="Share a thought" maxlength="120">
                        </div>
                        <button type="button" class="btn-icon-subtle" onclick="document.getElementById('subpanelAboutInput').focus()" title="Ubah status">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 20h9"></path>
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="profile-field-subtext">Until I change it</div>
                </div>

                {{-- Field 2: Nama (Matches user screenshot) --}}
                <div class="profile-field-group">
                    <div class="profile-field-label">Nama</div>
                    <div class="profile-field-row">
                        <input type="text" id="subpanelDisplayNameInput" class="profile-field-input" placeholder="Ketik nama tampilan Anda" value="zaidan" maxlength="100">
                        <button type="button" class="btn-icon-subtle" onclick="document.getElementById('subpanelDisplayNameInput').focus()" title="Ubah nama tampilan">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 20h9"></path>
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="profile-field-helper">Ini bukan nama pengguna Anda. Nama ini akan terlihat oleh kontak Anda.</div>
                </div>

                {{-- Field 3: Nama pengguna yang dipesan (Matches user screenshot) --}}
                <div class="profile-field-group">
                    <div class="profile-field-label">Nama pengguna yang dipesan</div>
                    <div class="profile-field-row" style="cursor: default;">
                        <div style="display: flex; align-items: center; gap: 0.65rem; flex: 1; min-width: 0;">
                            <div style="width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-weight: 700; font-size: 1rem; flex-shrink: 0;">@</div>
                            <span id="subpanelUsernameText" style="font-size: 0.95rem; font-weight: 500; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">zaidan</span>
                        </div>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted); flex-shrink: 0;">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </div>
                </div>

                {{-- Field 4: Telepon (Matches user screenshot) --}}
                <div class="profile-field-group">
                    <div class="profile-field-label">Telepon</div>
                    <div class="profile-field-row">
                        <div style="display: flex; align-items: center; gap: 0.65rem; flex: 1; min-width: 0;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-secondary); flex-shrink: 0;">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                            <input type="tel" id="subpanelPhoneInput" class="profile-field-input" placeholder="Masukkan nomor telepon" value="089637351685">
                        </div>
                        <button type="button" class="btn-icon-subtle" onclick="copyPhoneNumber()" title="Salin nomor telepon">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                {{-- Simpan Perubahan Button --}}
                <div style="padding: 1.25rem 1.25rem 0.5rem;">
                    <button type="button" id="btnSaveSubpanelProfile" class="btn-action-primary" onclick="handleSaveProfileSubpanel()" style="width: 100%; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 600; border-radius: var(--radius-md);">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>Simpan Perubahan</span>
                    </button>
                </div>
            </div>

            {{-- Subpanel 2: Akun --}}
            <div id="subpanelAccount" class="subpanel-content" style="display: none;">
                <div class="subpanel-card">
                    <div class="subpanel-card-row">
                        <div>
                            <div class="subpanel-card-title">Status Akun</div>
                            <div class="subpanel-card-desc">Terhubung ke Server Real-time</div>
                        </div>
                        <span style="font-size: 0.75rem; color: #10b981; font-weight: 600; padding: 0.25rem 0.65rem; background: rgba(16, 185, 129, 0.12); border-radius: 9999px;">
                            Online
                        </span>
                    </div>
                </div>

                <div class="subpanel-card">
                    <div class="subpanel-card-title">Notifikasi Keamanan</div>
                    <div class="subpanel-card-desc" style="line-height: 1.45;">
                        Pesan dan panggilan Anda dilindungi dengan enkripsi end-to-end TLS dan autentikasi token Sanctum.
                    </div>
                </div>

                <div class="subpanel-card">
                    <div class="subpanel-card-title">Alamat Email Terdaftar</div>
                    <div id="subpanelAccountEmail" class="subpanel-card-desc" style="color: var(--text-primary); font-size: 0.875rem; margin-top: 4px;">
                        -
                    </div>
                </div>

                <div class="subpanel-card">
                    <div class="subpanel-card-title">Username Akun</div>
                    <div id="subpanelAccountUsername" class="subpanel-card-desc" style="color: var(--text-primary); font-size: 0.875rem; margin-top: 4px;">
                        -
                    </div>
                </div>

                <div class="subpanel-card" style="cursor: pointer;" onclick="openSettingsSubpanel('profile')">
                    <div class="subpanel-card-row">
                        <div>
                            <div class="subpanel-card-title" style="color: #a78bfa;">Ubah Informasi Profil</div>
                            <div class="subpanel-card-desc">Edit nama tampilan, bio, dan nomor telepon</div>
                        </div>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </div>
                </div>
            </div>

            {{-- Subpanel 3: Privasi --}}
            <div id="subpanelPrivacy" class="subpanel-content" style="display: none;">
                <div class="subpanel-card">
                    <div class="subpanel-card-row">
                        <div>
                            <div class="subpanel-card-title">Mode Streamer</div>
                            <div class="subpanel-card-desc">Samarkan teks obrolan & nomor kontak saat share screen / streaming</div>
                        </div>
                        <input type="checkbox" id="subpanelStreamerToggle" onchange="toggleStreamerMode()" style="width: 18px; height: 18px; accent-color: var(--accent-primary); cursor: pointer;">
                    </div>
                </div>

                <div class="subpanel-card">
                    <div class="subpanel-card-row">
                        <div>
                            <div class="subpanel-card-title">Terakhir Dilihat & Online</div>
                            <div class="subpanel-card-desc">Siapa yang dapat melihat status Anda</div>
                        </div>
                        <span style="font-size: 0.8rem; color: var(--text-secondary);">Semua orang</span>
                    </div>
                </div>

                <div class="subpanel-card">
                    <div class="subpanel-card-row">
                        <div>
                            <div class="subpanel-card-title">Foto Profil & Info</div>
                            <div class="subpanel-card-desc">Visibilitas foto profil akun</div>
                        </div>
                        <span style="font-size: 0.8rem; color: var(--text-secondary);">Semua orang</span>
                    </div>
                </div>

                <div class="subpanel-card">
                    <div class="subpanel-card-row">
                        <div>
                            <div class="subpanel-card-title">Pesan Sementara</div>
                            <div class="subpanel-card-desc">Timer otomatis penghapusan pesan baru</div>
                        </div>
                        <span style="font-size: 0.8rem; color: var(--text-secondary);">Mati</span>
                    </div>
                </div>

                <div class="subpanel-card">
                    <div class="subpanel-card-row">
                        <div>
                            <div class="subpanel-card-title">Laporan Dibaca (Centang Biru)</div>
                            <div class="subpanel-card-desc">Kirim tanda saat Anda membuka pesan</div>
                        </div>
                        <span style="font-size: 0.8rem; color: #10b981; font-weight: 600;">Aktif</span>
                    </div>
                </div>

                <div class="subpanel-card" style="cursor: pointer;" onclick="openBlockedUsersModal()">
                    <div class="subpanel-card-row">
                        <div>
                            <div class="subpanel-card-title">Kontak Diblokir</div>
                            <div class="subpanel-card-desc">Daftar kontak yang Anda blokir</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.35rem;">
                            <span id="subpanelBlockedCount" style="font-size: 0.8rem; color: var(--text-secondary);">0 kontak</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {{-- Subpanel 4: Chat --}}
            <div id="subpanelChat" class="subpanel-content" style="display: none;">
                {{-- Cadangan & Pemulihan Chat Lokal --}}
                <div class="subpanel-card" style="cursor: pointer;" onclick="openBackupRestoreModal()">
                    <div class="subpanel-card-row">
                        <div>
                            <div class="subpanel-card-title">Cadangan & Pemulihan Chat</div>
                            <div class="subpanel-card-desc">Ekspor atau pulihkan riwayat chat lokal (.zchat)</div>
                        </div>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </div>
                </div>

                <div class="subpanel-card">
                    <div class="subpanel-card-row">
                        <div>
                            <div class="subpanel-card-title">Tema Warna Tampilan</div>
                            <div class="subpanel-card-desc" id="subpanelThemeDesc">Mode Gelap Obsidian</div>
                        </div>
                        <button type="button" class="btn-outline-action" onclick="toggleTheme(); updateSubpanelThemeLabel();" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; border-radius: 6px;">
                            Ganti Tema
                        </button>
                    </div>
                </div>

                <div class="subpanel-card">
                    <div class="subpanel-card-row">
                        <div>
                            <div class="subpanel-card-title">Wallpaper Obrolan</div>
                            <div class="subpanel-card-desc">Latar belakang default WhatsApp Dark</div>
                        </div>
                        <span style="font-size: 0.8rem; color: var(--text-secondary);">Standar</span>
                    </div>
                </div>

                <div class="subpanel-card">
                    <div class="subpanel-card-row">
                        <div>
                            <div class="subpanel-card-title">Enter untuk Mengirim</div>
                            <div class="subpanel-card-desc">Tekan tombol Enter pada keyboard untuk mengirim pesan</div>
                        </div>
                        <input type="checkbox" checked disabled style="width: 18px; height: 18px; accent-color: var(--accent-primary);">
                    </div>
                </div>

                <div class="subpanel-card">
                    <div class="subpanel-card-row">
                        <div>
                            <div class="subpanel-card-title">Bersihkan Cache Obrolan</div>
                            <div class="subpanel-card-desc">Segarkan data memori obrolan lokal</div>
                        </div>
                        <button type="button" class="btn-outline-action" onclick="showToast('Cache lokal obrolan berhasil disegarkan.', 'success')" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; border-radius: 6px;">
                            Bersihkan
                        </button>
                    </div>
                </div>
            </div>

            {{-- Subpanel 5: Notifikasi --}}
            <div id="subpanelNotifications" class="subpanel-content" style="display: none;">
                <div class="subpanel-card">
                    <div class="subpanel-card-row">
                        <div>
                            <div class="subpanel-card-title">Suara Notifikasi Obrolan</div>
                            <div class="subpanel-card-desc">Bunyikan audio saat pesan baru masuk</div>
                        </div>
                        <input type="checkbox" id="subpanelSoundToggle" onchange="toggleSoundNotification(this.checked)" style="width: 18px; height: 18px; accent-color: var(--accent-primary); cursor: pointer;">
                    </div>
                    <div style="margin-top: 0.65rem;">
                        <button type="button" class="btn-outline-action" onclick="if(window.playMessageChime){window.playMessageChime();}showToast('Memutar nada dering pesan...', 'info')" style="padding: 0.35rem 0.75rem; font-size: 0.78rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 5px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            </svg>
                            <span>Uji Nada Dering</span>
                        </button>
                    </div>
                </div>

                <div class="subpanel-card">
                    <div class="subpanel-card-row">
                        <div>
                            <div class="subpanel-card-title">Pemberitahuan Desktop</div>
                            <div class="subpanel-card-desc">Tampilkan notifikasi saat aplikasi tidak dibuka</div>
                        </div>
                        <button type="button" class="btn-outline-action" onclick="requestBrowserNotificationPermission()" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; border-radius: 6px;">
                            Izin Notifikasi
                        </button>
                    </div>
                </div>
            </div>

            {{-- Subpanel 6: Pintasan keyboard --}}
            <div id="subpanelKeyboard" class="subpanel-content" style="display: none;">
                <div class="subpanel-card">
                    <div class="subpanel-card-row">
                        <span style="font-size: 0.875rem; color: var(--text-primary);">Kirim Pesan</span>
                        <kbd style="padding: 0.2rem 0.5rem; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 4px; font-size: 0.78rem; font-family: monospace; color: #a78bfa;">Enter</kbd>
                    </div>
                </div>
                <div class="subpanel-card">
                    <div class="subpanel-card-row">
                        <span style="font-size: 0.875rem; color: var(--text-primary);">Baris Baru dalam Pesan</span>
                        <kbd style="padding: 0.2rem 0.5rem; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 4px; font-size: 0.78rem; font-family: monospace; color: #a78bfa;">Shift + Enter</kbd>
                    </div>
                </div>
                <div class="subpanel-card">
                    <div class="subpanel-card-row">
                        <span style="font-size: 0.875rem; color: var(--text-primary);">Cari Percakapan</span>
                        <kbd style="padding: 0.2rem 0.5rem; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 4px; font-size: 0.78rem; font-family: monospace; color: #a78bfa;">/</kbd>
                    </div>
                </div>
                <div class="subpanel-card">
                    <div class="subpanel-card-row">
                        <span style="font-size: 0.875rem; color: var(--text-primary);">Tutup Obrolan / Kembali</span>
                        <kbd style="padding: 0.2rem 0.5rem; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 4px; font-size: 0.78rem; font-family: monospace; color: #a78bfa;">Esc</kbd>
                    </div>
                </div>
                <div class="subpanel-card">
                    <div class="subpanel-card-row">
                        <span style="font-size: 0.875rem; color: var(--text-primary);">Panel Detail Kontak</span>
                        <kbd style="padding: 0.2rem 0.5rem; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 4px; font-size: 0.78rem; font-family: monospace; color: #a78bfa;">Ctrl + B</kbd>
                    </div>
                </div>
            </div>

            {{-- Subpanel 7: Bantuan dan masukan --}}
            <div id="subpanelHelp" class="subpanel-content" style="display: none;">
                <div style="display: flex; align-items: center; gap: 0.85rem; padding: 1.25rem; border-bottom: 1px solid var(--border-subtle);">
                    <div style="width: 44px; height: 44px; border-radius: 12px; background: #7c3aed; display: flex; align-items: center; justify-content: center; color: #ffffff; flex-shrink: 0;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <div>
                        <div style="font-size: 1rem; font-weight: 700; color: var(--text-primary);">ZChat Web</div>
                        <div style="font-size: 0.775rem; color: var(--text-muted); margin-top: 1px;">Versi 2.5.0 Modern Realtime Edition</div>
                    </div>
                </div>

                <div class="subpanel-card">
                    <div class="subpanel-card-row">
                        <div>
                            <div class="subpanel-card-title">Protokol Realtime</div>
                            <div class="subpanel-card-desc">WebSockets (TLS Encrypted)</div>
                        </div>
                        <span style="font-size: 0.75rem; color: #10b981; font-weight: 600;">Aktif</span>
                    </div>
                </div>

                <div class="subpanel-card">
                    <div class="subpanel-card-title">Tanya Jawab Populer (FAQ)</div>
                    <div class="faq-accordion-group" style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.65rem;">
                        <details style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 0.65rem; cursor: pointer;">
                            <summary style="font-size: 0.825rem; font-weight: 600; color: var(--text-primary); user-select: none;">Bagaimana cara panggilan suara atau video?</summary>
                            <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.5rem; line-height: 1.45;">Buka percakapan dengan kontak yang ingin Anda hubungi, lalu klik ikon Telepon atau Kamera Video di pojok kanan atas layar percakapan.</p>
                        </details>
                        <details style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 0.65rem; cursor: pointer;">
                            <summary style="font-size: 0.825rem; font-weight: 600; color: var(--text-primary); user-select: none;">Bagaimana cara merekam pesan suara (voice note)?</summary>
                            <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.5rem; line-height: 1.45;">Klik ikon mikrofon di bilah input pesan. Rekaman akan dimulai dengan timer live. Klik tombol kirim ungu untuk mengirim, atau tombol batal untuk menghapusnya.</p>
                        </details>
                        <details style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 0.65rem; cursor: pointer;">
                            <summary style="font-size: 0.825rem; font-weight: 600; color: var(--text-primary); user-select: none;">Bagaimana cara menyematkan (pin) chat ke atas?</summary>
                            <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.5rem; line-height: 1.45;">Klik tombol menu titik tiga di bilah atas obrolan aktif, lalu pilih 'Sematkan Obrolan'. Obrolan akan berada di posisi teratas daftar sidebar dengan ikon pin.</p>
                        </details>
                        <details style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 0.65rem; cursor: pointer;">
                            <summary style="font-size: 0.825rem; font-weight: 600; color: var(--text-primary); user-select: none;">Apakah pesan saya dilindungi enkripsi?</summary>
                            <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.5rem; line-height: 1.45;">Ya. Semua isi pesan teks dan media dilindungi enkripsi AES-256 dan transmisi aman TLS/WSS secara real-time.</p>
                        </details>
                    </div>
                </div>

                <div class="subpanel-card">
                    <div class="subpanel-card-title">Pengembang Aplikasi</div>
                    <div class="subpanel-card-desc" style="color: var(--text-primary); font-size: 0.875rem; margin-top: 2px;">
                        Muhammad Zaidan
                    </div>
                </div>

                <div class="subpanel-card">
                    <div class="subpanel-card-row">
                        <div>
                            <div class="subpanel-card-title">Status Server</div>
                            <div class="subpanel-card-desc">Operasional Normal</div>
                        </div>
                        <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</aside>
