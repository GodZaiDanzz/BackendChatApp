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
    <div id="activeChatWindow" style="display: none; height: 100%; flex-direction: column; position: relative;">
        {{-- Bulk Messages Selection Action Bar (Appears when selection mode is active) --}}
        <div id="chatSelectionBar" class="chat-selection-bar" style="display: none;">
            <div class="selection-bar-left">
                <button type="button" class="btn-icon selection-close-btn" onclick="exitSelectMessagesMode()" title="Batalkan pilihan (Esc)" aria-label="Batalkan pilihan">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <div class="selection-count-text">
                    <span id="selectedMessagesCountBadge">0</span> pesan dipilih
                </div>
            </div>
            <div class="selection-bar-right">
                <button type="button" id="btnSelectAllMessages" class="btn-selection-action" onclick="toggleSelectAllMessages()" title="Pilih Semua / Batal Pilih Semua">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 6L7 17l-5-5"></path>
                        <path d="M22 10l-7.5 7.5L13 16"></path>
                    </svg>
                    <span id="btnSelectAllLabel">Pilih Semua</span>
                </button>
                <button type="button" id="btnBulkDeleteMessages" class="btn-selection-delete" onclick="confirmBulkDeleteMessages()" disabled title="Hapus pesan yang dipilih">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                    <span>Hapus</span>
                </button>
            </div>
        </div>

        {{-- Chat Top Header --}}
        <header class="chat-header">
            <div class="chat-header-info">
                {{-- Close / Back button --}}
                <button type="button" class="chat-back-btn" onclick="closeActiveChat()" aria-label="Tutup obrolan" title="Tutup obrolan">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                {{-- Contact Avatar with Green Dot --}}
                <div class="avatar-container" onclick="toggleRightInfoPanel()" style="cursor: pointer;" title="Lihat profil">
                    <div id="activeAvatarCircle" class="avatar-circle avatar-pastel-pink">NP</div>
                    <span id="activeStatusDot" class="status-indicator-dot online" title="Online"></span>
                </div>

                {{-- Name & Status ("Aktif sekarang") --}}
                <div class="chat-header-text" onclick="toggleRightInfoPanel()" style="cursor: pointer;" title="Lihat profil">
                    <h2 id="activeChatDisplayName" class="chat-title">Memuat...</h2>
                    <div class="chat-presence-row">
                        <span id="activeStatusSmallDot" class="presence-dot online"></span>
                        <span id="activeUserOnlineStatus" class="user-status-text online">Aktif sekarang</span>
                        <span id="activeChatUsername" style="display: none;">@username</span>
                    </div>
                </div>
            </div>

            {{-- Right Header Action Icons: Search, Phone, Video, More --}}
            <div class="chat-header-actions">
                <button type="button" id="btnToggleInChatSearch" class="btn-header-action" onclick="toggleInChatSearch()" title="Cari pesan dalam percakapan" aria-label="Cari pesan">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </button>

                <button type="button" id="btnHeaderVoiceCall" class="btn-header-action" onclick="handleStartVoiceCall()" title="Panggilan Suara / Masuk Ruang Suara" aria-label="Obrolan Suara">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                </button>

                <button type="button" class="btn-header-action" onclick="handleStartVideoCall()" title="Panggilan Video" aria-label="Panggilan Video">
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
                            <span id="menuItemInfoLabel">Informasi Kontak</span>
                        </button>
                        {{-- Pin / Unpin Conversation --}}
                        <button type="button" id="menuItemPinChat" class="dropdown-item" onclick="handleTogglePinCurrentChat()" role="menuitem">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="17" x2="12" y2="22"></line>
                                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.77V6a3 3 0 0 0-6 0v4.77a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24Z"></path>
                            </svg>
                            <span id="menuItemPinLabel">Sematkan Obrolan</span>
                        </button>
                        {{-- Mute / Unmute Notifications --}}
                        <button type="button" id="menuItemMuteChat" class="dropdown-item" onclick="handleToggleMuteCurrentChat()" role="menuitem">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                <line x1="2" y1="2" x2="22" y2="22"></line>
                            </svg>
                            <span id="menuItemMuteLabel">Bisukan Notifikasi</span>
                        </button>
                        {{-- Group Action Items in Dropdown --}}
                        <button type="button" id="menuItemEditGroup" class="dropdown-item" style="display: none;" onclick="openEditGroupModal()" role="menuitem">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            <span>Edit Detail Grup</span>
                        </button>
                        <button type="button" id="menuItemAddMember" class="dropdown-item" style="display: none;" onclick="openAddGroupMemberModal()" role="menuitem">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <line x1="20" y1="8" x2="20" y2="14"></line>
                                <line x1="23" y1="11" x2="17" y2="11"></line>
                            </svg>
                            <span>Tambah Anggota</span>
                        </button>
                        <button type="button" class="dropdown-item" onclick="enterSelectMessagesMode()" role="menuitem">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="9 11 12 14 22 4"></polyline>
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                            </svg>
                            <span>Pilih / Hapus Banyak Pesan</span>
                        </button>
                        <button type="button" class="dropdown-item" onclick="closeActiveChat()" role="menuitem">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
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
                        <button type="button" class="dropdown-item danger" onclick="confirmDeleteContact()" role="menuitem">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <line x1="18" y1="8" x2="23" y2="13"></line>
                                <line x1="23" y1="8" x2="18" y2="13"></line>
                            </svg>
                            <span>Hapus Kontak</span>
                        </button>
                    </div>
                </div>
        </header>

        {{-- In-Chat Search Bar --}}
        <div id="inChatSearchBar" class="in-chat-search-bar" style="display: none;">
            <div class="in-chat-search-inner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted); flex-shrink: 0;">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                    type="text"
                    id="inChatSearchInput"
                    placeholder="Cari pesan dalam obrolan..."
                    oninput="handleInChatSearch(event)"
                    onkeydown="handleInChatSearchKeydown(event)"
                >
                <span id="inChatSearchCount" class="in-chat-search-count">0 hasil</span>
                <button type="button" class="btn-icon-subtle" onclick="toggleInChatSearch(false)" title="Tutup pencarian" aria-label="Tutup pencarian">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>

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
                <span id="activeTypingNameText" class="typing-label-text">Sedang mengetik...</span>
            </div>
        </div>

        {{-- Reply Message Banner --}}
        <div id="replyMessageBanner" class="reply-bar-banner" style="display: none;">
            <div class="reply-bar-content">
                <div class="reply-bar-indicator"></div>
                <div class="reply-bar-text-group">
                    <span id="replyRecipientName" class="reply-bar-author">Membalas</span>
                    <span id="replyMessageSnippet" class="reply-bar-snippet">...</span>
                </div>
            </div>
            <button type="button" class="btn-cancel-reply" onclick="cancelReplyMessage()" title="Batal balas" aria-label="Batal balas">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        {{-- Attachment Preview Banner --}}
        <div id="attachmentPreviewBanner" class="attachment-preview-banner" style="display: none;">
            <div class="attachment-info-group">
                <div id="attachmentThumbnailContainer" class="attachment-thumb-box">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                </div>
                <div class="attachment-meta-text">
                    <span id="attachmentFileName" class="attachment-name">dokumen.pdf</span>
                    <span id="attachmentFileSize" class="attachment-size">0 KB</span>
                </div>
            </div>
            <button type="button" class="btn-cancel-reply" onclick="cancelAttachment()" title="Batal lampiran" aria-label="Batal lampiran">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
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
        <footer class="chat-input-area" style="position: relative;">
            {{-- Hidden File Upload Input --}}
            <input type="file" id="chatFileInput" style="display: none;" accept="image/*,.pdf,.doc,.docx,.txt" onchange="handleFileSelected(event)">

            {{-- Interactive Emoji Picker Popover --}}
            <div id="emojiPickerPopover" class="emoji-picker-popover" style="display: none;" role="dialog" aria-label="Pemilih Emoji">
                <div class="emoji-picker-header">
                    <span class="emoji-picker-title">Pilih Emoji</span>
                    <button type="button" class="btn-icon-subtle" onclick="toggleEmojiPicker(false)" aria-label="Tutup pemilih emoji">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="emoji-tabs-row">
                    <button type="button" class="emoji-tab-btn active" onclick="switchEmojiCategory('popular')">⚡ Populer</button>
                    <button type="button" class="emoji-tab-btn" onclick="switchEmojiCategory('smileys')">😀 Wajah</button>
                    <button type="button" class="emoji-tab-btn" onclick="switchEmojiCategory('gestures')">👍 Gestur</button>
                    <button type="button" class="emoji-tab-btn" onclick="switchEmojiCategory('hearts')">❤️ Hati</button>
                    <button type="button" class="emoji-tab-btn" onclick="switchEmojiCategory('objects')">🎉 Objek</button>
                </div>
                <div id="emojiGridList" class="emoji-grid-list">
                    {{-- Populated via JavaScript --}}
                </div>
            </div>

            {{-- Voice Note Live Recording Bar --}}
            <div id="voiceNoteRecordingBar" class="voice-note-recording-bar" style="display: none;">
                <div class="recording-indicator">
                    <span class="recording-pulse-dot"></span>
                    <span id="voiceNoteDurationText" class="recording-timer">00:00</span>
                    <span class="recording-label">Merekam pesan suara...</span>
                </div>
                <div class="recording-actions">
                    <button type="button" class="btn-cancel-recording" onclick="cancelVoiceNoteRecording()" title="Batal rekam" aria-label="Batal rekam">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        <span>Batal</span>
                    </button>
                    <button type="button" class="btn-send-recording" onclick="stopAndSendVoiceNoteRecording()" title="Kirim rekaman suara" aria-label="Kirim rekaman">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
            </div>

            <form id="messageForm" class="chat-input-pill-wrapper" onsubmit="handleSendMessage(event)">
                {{-- Paperclip Attachment Button --}}
                <button type="button" class="btn-input-accessory" onclick="triggerFileAttachment()" title="Lampirkan Dokumen / Media" aria-label="Lampirkan Dokumen">
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
                <button type="button" id="btnEmojiToggle" class="btn-input-accessory" onclick="toggleEmojiPicker(event)" title="Pilih Emoji" aria-label="Pilih Emoji">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                        <line x1="9" y1="9" x2="9.01" y2="9"></line>
                        <line x1="15" y1="9" x2="15.01" y2="9"></line>
                    </svg>
                </button>

                {{-- Microphone Voice Note Button --}}
                <button type="button" id="btnVoiceNoteRecord" class="btn-input-accessory" onclick="startVoiceNoteRecording()" title="Rekam Pesan Suara" aria-label="Rekam Pesan Suara">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
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
