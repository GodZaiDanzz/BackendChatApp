{{-- Main Chat Conversation Area --}}
<main class="chat-main">
    {{-- Placeholder when no chat is selected --}}
    <div id="noChatSelected" class="empty-state">
        <div class="empty-state-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
        </div>
        <h3 class="empty-state-title">Pilih Percakapan</h3>
        <p class="empty-state-desc">Pilih salah satu teman dari daftar kontak di sebelah kiri untuk membaca dan mengirim pesan.</p>
    </div>

    {{-- Active Conversation Area --}}
    <div id="activeChatWindow" style="display: none; height: 100%; flex-direction: column;">
        {{-- Chat Top Header --}}
        <header class="chat-header">
            <div class="chat-header-info">
                <button type="button" class="chat-back-btn" onclick="closeActiveChat()" aria-label="Kembali ke daftar kontak">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>

                <div class="avatar-container" style="cursor: pointer;" onclick="openContactInfoModal()" title="Lihat informasi kontak">
                    <div id="activeAvatarCircle" class="avatar-circle">?</div>
                    <span id="activeStatusDot" class="status-indicator-dot offline" title="Offline"></span>
                </div>

                <div style="cursor: pointer;" onclick="openContactInfoModal()" title="Lihat informasi kontak">
                    <h2 id="activeChatDisplayName" class="chat-title">-</h2>
                    <div style="display: flex; align-items: center; gap: 0.35rem;">
                        <span id="activeChatUsername" class="chat-subtitle" style="margin: 0;">@username</span>
                        <span style="color: var(--text-muted); font-size: 0.65rem;">•</span>
                        <span id="activeUserOnlineStatus" class="user-status-text offline">Offline</span>
                    </div>
                </div>
            </div>

            <div style="position: relative;">
                <button type="button" id="btnChatMenu" class="btn-icon" onclick="toggleChatDropdown(event)" title="Pilihan percakapan" aria-label="Pilihan percakapan" aria-haspopup="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2.25"></circle>
                        <circle cx="12" cy="12" r="2.25"></circle>
                        <circle cx="12" cy="19" r="2.25"></circle>
                    </svg>
                </button>

                <div id="chatDropdownMenu" class="chat-dropdown-menu" style="display: none;" role="menu">
                    <button type="button" class="dropdown-item" onclick="openContactInfoModal()" role="menuitem">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span>Informasi Kontak</span>
                    </button>
                    <button type="button" class="dropdown-item" onclick="closeActiveChat()" role="menuitem">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="6"></line>
                        </svg>
                        <span>Tutup Obrolan</span>
                    </button>
                    <div class="dropdown-divider"></div>
                    <button type="button" class="dropdown-item danger" onclick="clearActiveChatMessages()" role="menuitem">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        <span>Bersihkan Obrolan</span>
                    </button>
                </div>
            </div>
        </header>

        {{-- Messages Stream Container --}}
        <div id="messagesContainer" class="messages-container" aria-live="polite">
            {{-- Messages will be injected here via JavaScript --}}
        </div>

        {{-- Edit Message Banner (shown when editing) --}}
        <div id="editMessageBanner" class="edit-bar-banner" style="display: none;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
                <span>Mengedit pesan</span>
            </div>
            <button type="button" class="btn-icon" style="width: 26px; height: 26px;" onclick="cancelEditMessage()" title="Batal edit" aria-label="Batal edit">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="6"></line>
                </svg>
            </button>
        </div>

        {{-- Message Input Footer --}}
        <footer class="chat-input-area">
            <form id="messageForm" class="chat-input-form" onsubmit="handleSendMessage(event)">
                <textarea
                    id="messageInput"
                    class="chat-textarea"
                    placeholder="Tulis pesan... (Tekan Enter untuk mengirim)"
                    rows="1"
                    onkeydown="handleMessageKeydown(event)"
                ></textarea>

                <button type="submit" id="btnSendMessage" class="btn-send" aria-label="Kirim pesan">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </form>
        </footer>
    </div>
</main>
