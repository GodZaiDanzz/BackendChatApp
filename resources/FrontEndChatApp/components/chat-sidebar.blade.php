{{-- Chat Sidebar Component (Second Column: Chat List) --}}
<aside class="sidebar">
    {{-- Sidebar Top: Ruang Obrolan & Pesan Title with Compose Button --}}
    <div class="sidebar-header-row">
        <div class="sidebar-title-group">
            <span class="sidebar-eyebrow">RUANG OBROLAN</span>
            <h1 class="sidebar-main-title">Pesan</h1>
        </div>

        {{-- Dark Circle Compose Button (Pencil Icon) --}}
        <button
            type="button"
            class="btn-compose-circle"
            onclick="openAddFriendModal()"
            title="Mulai Obrolan / Tambah Teman Baru"
            aria-label="Tambah Teman Baru"
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
        </button>
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
                    <p class="empty-state-desc">Belum ada teman terhubung. Klik tombol pensil di atas untuk menambah teman.</p>
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
    </div>
</aside>
