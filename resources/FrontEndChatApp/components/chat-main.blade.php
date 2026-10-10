{{-- Main Chat Conversation Area (Third Column: Chat Stream & Input) --}}
<main class="chat-main">
    {{-- Placeholder when no chat is selected --}}
    <div id="noChatSelected" class="empty-state">
        <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
        </div>
        <h3 class="empty-state-title">Pilih Percakapan</h3>
        <p class="empty-state-desc">Pilih salah satu kontak di sebelah kiri untuk membaca dan mengirim pesan secara real-time.</p>
    </div>

    {{-- Active Conversation Area --}}
    <div id="activeChatWindow" style="display: none; height: 100%; flex-direction: column;">
        {{-- Chat Top Header --}}
        <header class="chat-header">
            <div class="chat-header-info">
                {{-- Back button for Mobile --}}
                <button type="button" class="chat-back-btn" onclick="closeActiveChat()" aria-label="Kembali ke daftar kontak">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>

                {{-- Contact Avatar with Green Dot --}}
                <div class="avatar-container" onclick="toggleRightInfoPanel()" style="cursor: pointer;" title="Lihat profil">
                    <div id="activeAvatarCircle" class="avatar-circle avatar-pastel-pink">NP</div>
                    <span id="activeStatusDot" class="status-indicator-dot online" title="Online"></span>
                </div>

                {{-- Name & Status ("Aktif sekarang") --}}
                <div class="chat-header-text" onclick="toggleRightInfoPanel()" style="cursor: pointer;" title="Lihat profil">
                    <h2 id="activeChatDisplayName" class="chat-title">Nadia Putri</h2>
                    <div class="chat-presence-row">
                        <span id="activeStatusSmallDot" class="presence-dot online"></span>
                        <span id="activeUserOnlineStatus" class="user-status-text online">Aktif sekarang</span>
                        <span id="activeChatUsername" style="display: none;">@username</span>
                    </div>
                </div>
            </div>

            {{-- Right Header Action Icons: Phone, Video, More --}}
            <div class="chat-header-actions">
                <button type="button" class="btn-header-action" onclick="handleSimulatedAction('Panggilan Suara')" title="Panggilan Suara" aria-label="Panggilan Suara">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                </button>

                <button type="button" class="btn-header-action" onclick="handleSimulatedAction('Panggilan Video')" title="Panggilan Video" aria-label="Panggilan Video">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                    </svg>
                </button>

                <div style="position: relative;">
                    <button type="button" id="btnChatMenu" class="btn-header-action" onclick="toggleChatDropdown(event)" title="Pilihan percakapan" aria-label="Pilihan percakapan">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="1.5"></circle>
                            <circle cx="19" cy="12" r="1.5"></circle>
                            <circle cx="5" cy="12" r="1.5"></circle>
                        </svg>
                    </button>

                    <div id="chatDropdownMenu" class="chat-dropdown-menu" style="display: none;" role="menu">
                        <button type="button" class="dropdown-item" onclick="toggleRightInfoPanel(true)" role="menuitem">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
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
                            <span>Bersihkan Riwayat Pesan</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>

        {{-- Message Stream Loading Skeleton --}}
        <div id="chatLoadingSkeleton" class="chat-skeleton-container" style="display: none;" aria-hidden="true">
            <div class="skeleton-row other">
                <div class="skeleton-bubble"></div>
                <div class="skeleton-meta"></div>
            </div>
            <div class="skeleton-row me">
                <div class="skeleton-bubble"></div>
                <div class="skeleton-meta"></div>
            </div>
            <div class="skeleton-row other">
                <div class="skeleton-bubble" style="width: 170px;"></div>
                <div class="skeleton-meta"></div>
            </div>
        </div>

        {{-- Messages Stream Container --}}
        <div id="messagesContainer" class="messages-container" aria-live="polite">
            {{-- Messages injected via JavaScript --}}
        </div>

        {{-- Live Typing Indicator Row (Bottom of stream) --}}
        <div id="activeTypingStatus" class="stream-typing-row" style="display: none;">
            <div class="typing-bubble-card">
                <span class="typing-dots-pill">
                    <span>•</span><span>•</span><span>•</span>
                </span>
                <span id="activeTypingNameText" class="typing-label-text">Nadia sedang mengetik</span>
            </div>
        </div>

        {{-- Edit Message Banner (shown when editing) --}}
        <div id="editMessageBanner" class="edit-bar-banner" style="display: none;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
                <span>Mengedit pesan Anda</span>
            </div>
            <button type="button" class="btn-cancel-edit" onclick="cancelEditMessage()" title="Batal edit">
                Batal
            </button>
        </div>

        {{-- Message Input Footer --}}
        <footer class="chat-input-area">
            <form id="messageForm" class="chat-input-pill-wrapper" onsubmit="handleSendMessage(event)">
                {{-- Paperclip Attachment Button --}}
                <button type="button" class="btn-input-accessory" onclick="handleSimulatedAction('Unggah Lampiran')" title="Lampirkan Dokumen / Media" aria-label="Lampirkan Dokumen">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                    </svg>
                </button>

                {{-- Textarea Input --}}
                <textarea
                    id="messageInput"
                    class="chat-textarea-pill"
                    placeholder="Tulis pesan..."
                    rows="1"
                    onkeydown="handleMessageKeydown(event)"
                    oninput="handleMessageInput(event)"
                ></textarea>

                {{-- Emoji Smile Button --}}
                <button type="button" class="btn-input-accessory" onclick="handleSimulatedAction('Buka Emoji')" title="Pilih Emoji" aria-label="Pilih Emoji">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                        <line x1="9" y1="9" x2="9.01" y2="9"></line>
                        <line x1="15" y1="9" x2="15.01" y2="9"></line>
                    </svg>
                </button>

                {{-- Vibrant Purple Circular Send Button --}}
                <button type="submit" id="btnSendMessage" class="btn-send-purple" aria-label="Kirim Pesan">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </form>
        </footer>
    </div>
</main>
