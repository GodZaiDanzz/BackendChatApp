{{-- Right Contact Info Panel (Fourth Column: Profile Details, Media & Documents) --}}
<aside id="chatInfoPanel" class="info-sidebar" aria-label="Informasi Kontak & Media">
    <div class="info-sidebar-content">
        {{-- Profile Header Card --}}
        <div class="info-profile-section">
            <div class="avatar-container info-avatar-container">
                <div id="infoAvatarCircle" class="avatar-circle info-avatar-large avatar-pastel-pink">
                    U
                </div>
                <span id="infoStatusDot" class="status-indicator-dot online" style="width: 14px; height: 14px; border-width: 2.5px;"></span>
            </div>

            <h3 id="infoDisplayName" class="info-profile-name">Info Kontak</h3>
            <p id="infoUsername" class="info-profile-handle">@kontak</p>

            {{-- 3 Quick Action Round Buttons: Telepon, Video, Senyap --}}
            <div class="info-quick-actions-row">
                {{-- Telepon --}}
                <div class="info-action-col">
                    <button type="button" class="btn-info-circle-action" onclick="handleSimulatedAction('Panggilan Telepon')" title="Panggil Kontak" aria-label="Telepon">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                    </button>
                    <span class="info-action-label">Telepon</span>
                </div>

                {{-- Video --}}
                <div class="info-action-col">
                    <button type="button" class="btn-info-circle-action" onclick="handleSimulatedAction('Panggilan Video')" title="Panggilan Video" aria-label="Video">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="23 7 16 12 23 17 23 7"></polygon>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                        </svg>
                    </button>
                    <span class="info-action-label">Video</span>
                </div>

                {{-- Senyap (Mute) --}}
                <div class="info-action-col">
                    <button type="button" class="btn-info-circle-action" onclick="handleSimulatedAction('Mode Senyap')" title="Senyapkan Notifikasi" aria-label="Senyap">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                    </button>
                    <span class="info-action-label">Senyap</span>
                </div>
            </div>
        </div>

        <div class="info-section" style="padding-top: 0.5rem; padding-bottom: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border-radius: 10px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2);">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); display: flex; align-items: center; justify-content: center; color: #10b981; flex-shrink: 0;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                </div>
                <div>
                    <div style="font-size: 0.8125rem; font-weight: 600; color: #10b981;">Terenkripsi End-to-End</div>
                </div>
            </div>
        </div>

        {{-- Section 1: Media Bersama --}}
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

        {{-- Section 2: Dokumen --}}
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

        <div class="info-section" style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle, rgba(255,255,255,0.08));">
            <button type="button" class="btn-delete-contact" onclick="confirmDeleteContact()" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.1); color: #ef4444; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s ease;">
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

    {{-- Bottom-Right Floating Help / Info Circle (?) Button --}}
    <button
        type="button"
        class="floating-help-btn"
        onclick="handleSimulatedAction('Pusat Bantuan')"
        title="Bantuan & Panduan Pengguna"
        aria-label="Pusat Bantuan"
    >
        ?
    </button>
</aside>
