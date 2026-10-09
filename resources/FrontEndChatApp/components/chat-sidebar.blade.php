{{-- Chat Sidebar Component --}}
<aside class="sidebar">
    {{-- Sidebar Top: Current User Profile --}}
    <div class="sidebar-header">
        <div class="user-profile-badge">
            <div class="avatar-container">
                <div id="myAvatarCircle" class="avatar-circle">?</div>
                <span class="status-indicator-dot online" title="Online"></span>
            </div>
            <div class="user-details">
                <span id="myDisplayName" class="user-display-name">Memuat...</span>
                <span id="myUsername" class="user-username">@username</span>
            </div>
        </div>

        <button type="button" class="btn-icon" onclick="handleLogout()" title="Keluar dari akun" aria-label="Keluar dari akun">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
        </button>
    </div>

    {{-- Action Bar: Tambah Teman --}}
    <div class="sidebar-action-bar">
        <button type="button" class="btn-action-primary" onclick="openAddFriendModal()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
            <span>Tambah Teman Baru</span>
        </button>
    </div>

    {{-- Tabs --}}
    <nav class="sidebar-tabs" aria-label="Kategori Percakapan">
        <button id="tabBtnChats" type="button" class="tab-btn active" onclick="switchSidebarTab('chats')">
            <span>Pesan</span>
            <span id="chatsCounterBadge" class="tab-counter" style="display: none;">0</span>
        </button>
        <button id="tabBtnContacts" type="button" class="tab-btn" onclick="switchSidebarTab('contacts')">
            <span>Kontak</span>
        </button>
        <button id="tabBtnRequests" type="button" class="tab-btn" onclick="switchSidebarTab('requests')">
            <span>Permintaan</span>
            <span id="requestCounterBadge" class="tab-counter" style="display: none;">0</span>
        </button>
    </nav>

    {{-- Filter Input --}}
    <div class="search-wrapper">
        <input id="localFilterInput" type="text" class="search-input-box" placeholder="Saring kontak atau percakapan..." oninput="handleLocalFilter(this.value)">
    </div>

    {{-- Scrollable Tab Contents --}}
    <div class="sidebar-list">
        {{-- List Chats Panel --}}
        <div id="panelChats">
            <div id="chatsContainer">
                <div class="empty-state">
                    <p class="empty-state-desc">Belum ada percakapan aktif. Mulai kirim pesan ke salah satu kontak Anda.</p>
                </div>
            </div>
        </div>

        {{-- List Contacts Panel --}}
        <div id="panelContacts" style="display: none;">
            <div id="contactsContainer">
                <div class="empty-state">
                    <p class="empty-state-desc">Belum ada teman dalam kontak Anda. Klik tombol "Tambah Teman Baru".</p>
                </div>
            </div>
        </div>

        {{-- List Friend Requests Panel --}}
        <div id="panelRequests" style="display: none;">
            <div id="requestsContainer">
                <div class="empty-state">
                    <p class="empty-state-desc">Tidak ada permintaan pertemanan saat ini.</p>
                </div>
            </div>
        </div>
    </div>
</aside>
