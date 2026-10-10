{{-- Right Contact Info Panel (Fourth Column: Profile Details, Media & Documents) --}}
<aside id="chatInfoPanel" class="info-sidebar" aria-label="Informasi Kontak & Media">
    <div class="info-sidebar-content">
        {{-- Profile Header Card --}}
        <div class="info-profile-section">
            <div class="avatar-container info-avatar-container">
                <div id="infoAvatarCircle" class="avatar-circle info-avatar-large avatar-pastel-pink">
                    NP
                </div>
                <span id="infoStatusDot" class="status-indicator-dot online" style="width: 14px; height: 14px; border-width: 2.5px;"></span>
            </div>

            <h3 id="infoDisplayName" class="info-profile-name">Nadia Putri</h3>
            <p id="infoUsername" class="info-profile-handle">nadia.putri@email.com</p>

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

        {{-- Section 1: Media Bersama --}}
        <div class="info-section">
            <div class="info-section-header">
                <span class="info-section-title">Media bersama</span>
                <button type="button" class="btn-link-action" onclick="handleSimulatedAction('Lihat Semua Media')">
                    Lihat semua
                </button>
            </div>

            <div class="info-media-grid">
                {{-- Thumbnail 1: Soft Purple-Blue Gradient --}}
                <div class="media-thumb-card thumb-gradient-purple" title="Gambar bersama"></div>

                {{-- Thumbnail 2: Soft Orange-Peach Gradient --}}
                <div class="media-thumb-card thumb-gradient-peach" title="Gambar bersama"></div>

                {{-- Thumbnail 3: Soft Gray with Gallery Icon --}}
                <div class="media-thumb-card thumb-placeholder" title="Media lainnya">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                </div>
            </div>
        </div>

        {{-- Section 2: Dokumen --}}
        <div class="info-section">
            <div class="info-section-header">
                <span class="info-section-title">Dokumen</span>
            </div>

            <div class="document-item-card" onclick="handleSimulatedAction('Buka Dokumen: Brief proyek.pdf')">
                <div class="doc-icon-container">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                </div>

                <div class="doc-details">
                    <span class="doc-name">Brief proyek.pdf</span>
                    <span class="doc-meta">2.4 MB • PDF</span>
                </div>
            </div>
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
