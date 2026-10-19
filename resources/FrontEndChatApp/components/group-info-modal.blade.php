{{-- Group Information Modal Component --}}
<div id="groupInfoModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="groupInfoModalTitle" onclick="if(event.target === this) closeGroupInfoModal()">
    <div class="modal-card group-info-modal-card">
        <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-primary);">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <h2 id="groupInfoModalTitle" class="modal-title">Detail Grup</h2>
            </div>
            <button type="button" class="btn-icon" onclick="closeGroupInfoModal()" aria-label="Tutup modal informasi grup" title="Tutup">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <div class="group-info-modal-body">
            {{-- Profile Card --}}
            <div class="group-modal-profile">
                <div class="avatar-container" style="position: relative; margin: 0 auto 0.85rem;">
                    <div id="groupModalAvatarCircle" class="avatar-circle group-modal-avatar">
                        G
                    </div>
                </div>

                <div class="group-modal-title-row">
                    <h3 id="groupModalName" class="group-modal-title">-</h3>
                    <button type="button" id="btnGroupModalEditHeader" class="btn-edit-group-header" onclick="closeGroupInfoModal(); openEditGroupModal();" title="Edit Nama & Deskripsi Grup" style="display: none;" aria-label="Edit Grup">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                </div>
                <p id="groupModalDescription" class="group-modal-desc">Grup Obrolan ZChat</p>
                <div id="groupModalMembersSubtitle" class="group-modal-badge">0 anggota</div>

                {{-- 3 Quick Action Buttons: Telepon, Video, Senyap --}}
                <div class="info-quick-actions-row" style="margin-top: 1.1rem;">
                    <div class="info-action-col">
                        <button type="button" class="btn-info-circle-action" onclick="closeGroupInfoModal(); handleStartVoiceCall();" title="Panggil Suara Grup" aria-label="Telepon">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                        </button>
                        <span class="info-action-label">Telepon</span>
                    </div>

                    <div class="info-action-col">
                        <button type="button" class="btn-info-circle-action" onclick="closeGroupInfoModal(); handleStartVideoCall();" title="Panggilan Video Grup" aria-label="Video">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                            </svg>
                        </button>
                        <span class="info-action-label">Video</span>
                    </div>

                    <div class="info-action-col">
                        <button type="button" id="btnGroupModalMute" class="btn-info-circle-action" onclick="handleToggleMuteCurrentChat()" title="Senyapkan / Bunyikan Notifikasi" aria-label="Senyap">
                            <svg id="groupModalMuteIcon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                        </button>
                        <span id="groupModalMuteLabel" class="info-action-label">Senyap</span>
                    </div>
                </div>
            </div>

            {{-- Security Card --}}
            <div class="info-security-card" style="margin: 1.1rem 0;">
                <div class="info-security-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                </div>
                <div>
                    <div class="info-security-title">Enkripsi Server Terlindungi</div>
                    <div class="info-security-desc">Pesan dan media grup dilindungi protokol enkripsi aman</div>
                </div>
            </div>

            {{-- Tautan Undangan Grup --}}
            <div class="info-section" style="margin-bottom: 1.1rem;">
                <div class="info-section-header">
                    <span class="info-section-title">Tautan Undangan Grup</span>
                </div>
                <div class="group-invite-box">
                    <div class="group-invite-content">
                        <span id="groupModalInviteCodeDisplay" class="group-invite-code-text">-</span>
                        <span class="group-invite-hint">Gunakan kode ini untuk mengundang anggota baru</span>
                    </div>
                    <div class="group-invite-actions">
                        <button type="button" class="btn-copy-invite" onclick="copyGroupInviteLink()" title="Salin tautan undangan" aria-label="Salin Tautan">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>Salin</span>
                        </button>
                        <button type="button" id="btnRegenerateInviteCode" class="btn-icon-subtle" onclick="handleRegenerateInviteCode()" title="Perbarui kode undangan" aria-label="Perbarui Kode" style="display: none;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="23 4 23 10 17 10"></polyline>
                                <polyline points="1 20 1 14 7 14"></polyline>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {{-- Media Bersama Section --}}
            <div class="info-section">
                <div class="info-section-header">
                    <span class="info-section-title">Media bersama (<span id="groupModalMediaCount">0</span>)</span>
                </div>
                <div id="groupModalMediaGrid" class="info-media-grid">
                    <div class="empty-media-note" style="grid-column: 1 / -1; padding: 0.85rem 0.5rem; text-align: center; font-size: 0.75rem; color: var(--text-muted); background: var(--bg-surface-elevated, rgba(255,255,255,0.03)); border-radius: 8px; border: 1px dashed var(--border-subtle, rgba(255,255,255,0.1));">
                        Belum ada gambar bersama
                    </div>
                </div>
            </div>

            {{-- Dokumen Bersama Section --}}
            <div class="info-section">
                <div class="info-section-header">
                    <span class="info-section-title">Dokumen (<span id="groupModalDocsCount">0</span>)</span>
                </div>
                <div id="groupModalDocsList" class="info-documents-list" style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <div class="empty-docs-note" style="padding: 0.85rem 0.5rem; text-align: center; font-size: 0.75rem; color: var(--text-muted); background: var(--bg-surface-elevated, rgba(255,255,255,0.03)); border-radius: 8px; border: 1px dashed var(--border-subtle, rgba(255,255,255,0.1));">
                        Belum ada dokumen bersama (.zip, .pdf, dll)
                    </div>
                </div>
            </div>
        </div>

        {{-- Group Modal Actions Footer --}}
        <div class="modal-footer group-modal-footer">
            <button type="button" id="btnGroupModalEditAction" class="btn-outline-action group-modal-action-btn" onclick="closeGroupInfoModal(); openEditGroupModal();" style="display: none;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>Edit Detail</span>
            </button>
            <button type="button" id="btnGroupModalLeaveAction" class="btn-action-danger-outline group-modal-action-btn" onclick="closeGroupInfoModal(); handleLeaveGroup();">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Keluar</span>
            </button>
            <button type="button" id="btnGroupModalDeleteAction" class="btn-action-danger group-modal-action-btn" onclick="closeGroupInfoModal(); handleDeleteGroup();" style="display: none;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>Bubarkan</span>
            </button>
            <button type="button" class="btn-secondary group-modal-action-btn" onclick="closeGroupInfoModal()">
                Tutup
            </button>
        </div>
    </div>
</div>
