{{-- Right Contact Info Panel (Fourth Column: Profile Details, Media & Documents, or Discord Group Members) --}}
<aside id="chatInfoPanel" class="info-sidebar" aria-label="Informasi Obrolan & Anggota">
    {{-- VIEW 1: Direct Contact Info (1-on-1 Private Chats) --}}
    <div id="directChatInfoContent" class="info-sidebar-inner">
        {{-- Header Bar with Close Button for Mobile & Tablet --}}
        <div class="info-sidebar-top-bar">
            <span class="info-sidebar-top-title">Detail Kontak</span>
            <button type="button" class="btn-icon info-close-btn" onclick="toggleRightInfoPanel(false)" aria-label="Tutup panel info" title="Tutup">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        <div class="info-sidebar-content">
            {{-- Profile Header Card --}}
            <div class="info-profile-section">
                <div class="avatar-container info-avatar-container">
                    <div id="infoAvatarCircle" class="avatar-circle info-avatar-large avatar-pastel-pink">
                        U
                    </div>
                    <span id="infoStatusDot" class="status-indicator-dot online" style="width: 14px; height: 14px; border-width: 2.5px;"></span>
                </div>

                <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 0.25rem;">
                    <h3 id="infoDisplayName" class="info-profile-name" style="margin-top: 0;">Info Kontak</h3>
                </div>
                <p id="infoUsername" class="info-profile-handle">@kontak</p>
                <p id="infoPresenceText" class="info-profile-status" style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem; margin-bottom: 0; text-align: center;">Online</p>

                {{-- 3 Quick Action Round Buttons: Telepon, Video, Senyap --}}
                <div class="info-quick-actions-row">
                    <div class="info-action-col">
                        <button type="button" class="btn-info-circle-action" onclick="handleStartVoiceCall()" title="Panggil Kontak" aria-label="Telepon">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                        </button>
                        <span class="info-action-label">Telepon</span>
                    </div>

                    <div class="info-action-col">
                        <button type="button" class="btn-info-circle-action" onclick="handleStartVideoCall()" title="Panggilan Video" aria-label="Video">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                            </svg>
                        </button>
                        <span class="info-action-label">Video</span>
                    </div>

                    <div class="info-action-col">
                        <button type="button" id="btnInfoMuteToggle" class="btn-info-circle-action" onclick="handleToggleMuteCurrentChat()" title="Senyapkan / Bunyikan Notifikasi" aria-label="Senyap">
                            <svg id="infoMuteIcon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                        </button>
                        <span id="infoMuteLabel" class="info-action-label">Senyap</span>
                    </div>
                </div>
            </div>

            <div class="info-section">
                <div class="info-security-card">
                    <div class="info-security-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                    <div>
                        <div class="info-security-title">Enkripsi Server Terlindungi</div>
                        <div class="info-security-desc">Pesan dan media dilindungi protokol TLS & enkripsi aman</div>
                    </div>
                </div>
            </div>

            {{-- Media Bersama --}}
            <div class="info-section">
                <div class="info-section-header">
                    <span class="info-section-title">Media bersama (<span id="infoMediaCount">0</span>)</span>
                </div>
                <div id="infoMediaGrid" class="info-media-grid">
                    <div class="empty-media-note" style="grid-column: 1 / -1; padding: 0.85rem 0.5rem; text-align: center; font-size: 0.75rem; color: var(--text-muted); background: var(--bg-surface-elevated, rgba(255,255,255,0.03)); border-radius: 8px; border: 1px dashed var(--border-subtle, rgba(255,255,255,0.1));">
                        Belum ada gambar bersama
                    </div>
                </div>
            </div>

            {{-- Dokumen --}}
            <div class="info-section">
                <div class="info-section-header">
                    <span class="info-section-title">Dokumen (<span id="infoDocsCount">0</span>)</span>
                </div>
                <div id="infoDocumentsList" class="info-documents-list" style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <div class="empty-docs-note" style="padding: 0.85rem 0.5rem; text-align: center; font-size: 0.75rem; color: var(--text-muted); background: var(--bg-surface-elevated, rgba(255,255,255,0.03)); border-radius: 8px; border: 1px dashed var(--border-subtle, rgba(255,255,255,0.1));">
                        Belum ada dokumen bersama (.zip, .pdf, dll)
                    </div>
                </div>
            </div>

            {{-- Actions at bottom: Contact --}}
            <div class="info-section-actions">
                <button type="button" id="btnBlockContactAction" class="info-action-btn warning" onclick="handleToggleBlockContact()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                    </svg>
                    <span id="btnBlockContactActionLabel">Blokir Kontak</span>
                </button>
                <button type="button" id="btnDeleteContactAction" class="info-action-btn danger" onclick="confirmDeleteContact()">
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
    </div>

    {{-- VIEW 2: Discord-Style Member Sidebar for Groups --}}
    <div id="groupMembersSidebarContent" class="info-sidebar-inner discord-members-inner" style="display: none;">
        {{-- Discord Member Top Header --}}
        <div class="discord-sidebar-header">
            <div class="discord-header-left">
                <span class="discord-header-title">Anggota Grup</span>
                <span id="discordTotalMembersBadge" class="discord-header-badge">0</span>
            </div>
            <div class="discord-header-actions">
                <button type="button" id="btnDiscordAddMember" class="btn-discord-add" onclick="openAddGroupMemberModal()" title="Tambah anggota grup" style="display: none;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>Tambah</span>
                </button>
            </div>
        </div>

        {{-- Discord Member List Scrollable Area --}}
        <div id="discordMembersScrollArea" class="discord-members-scroll">
            {{-- Section 1: Admins & Owner --}}
            <div id="discordAdminSection" class="discord-role-section">
                <div class="discord-role-header">
                    <span class="discord-role-title">PEMILIK & ADMIN</span>
                    <span class="discord-role-dash">—</span>
                    <span id="discordAdminCount" class="discord-role-count">0</span>
                </div>
                <div id="discordAdminList" class="discord-member-items">
                    {{-- Dynamically populated --}}
                </div>
            </div>

            {{-- Section 2: Regular Members --}}
            <div id="discordMemberSection" class="discord-role-section">
                <div class="discord-role-header">
                    <span class="discord-role-title">ANGGOTA</span>
                    <span class="discord-role-dash">—</span>
                    <span id="discordMemberCount" class="discord-role-count">0</span>
                </div>
                <div id="discordMemberList" class="discord-member-items">
                    {{-- Dynamically populated --}}
                </div>
            </div>
        </div>

        {{-- Bottom Quick Action: Buka Detail & Media Grup --}}
        <div class="discord-sidebar-footer">
            <button type="button" class="btn-open-group-modal" onclick="openGroupInfoModal()" title="Buka Detail & Media Grup">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <span>Media & Dokumen Grup</span>
            </button>
        </div>
    </div>

    {{-- Bottom-Right Floating Help / Info Circle Button --}}
    <button
        type="button"
        class="floating-help-btn"
        onclick="openHelpSubpanel()"
        title="Bantuan & Panduan Pengguna"
        aria-label="Pusat Bantuan"
    >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
    </button>
</aside>
