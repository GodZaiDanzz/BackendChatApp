{{-- Contact Information Modal Component --}}
<div id="contactInfoModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="contactInfoTitle">
    <div class="modal-card">
        <div class="modal-header">
            <h2 id="contactInfoTitle" class="modal-title">Informasi Kontak</h2>
            <button type="button" class="btn-icon" onclick="closeContactInfoModal()" aria-label="Tutup modal informasi">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="6"></line>
                </svg>
            </button>
        </div>

        <div class="contact-info-profile">
            <div class="avatar-container">
                <div id="infoAvatarCircle" class="avatar-circle contact-info-avatar">?</div>
                <span id="infoStatusDot" class="status-indicator-dot offline" style="width: 15px; height: 15px; border-width: 3px;"></span>
            </div>

            <div>
                <h3 id="infoDisplayName" class="contact-info-name">-</h3>
                <div id="infoUsername" class="contact-info-handle">@username</div>
            </div>

            <div id="infoStatusBadge" class="contact-status-badge offline">
                <span style="width: 6px; height: 6px; border-radius: 50%; background-color: currentColor;"></span>
                <span id="infoStatusText">Offline</span>
            </div>
        </div>

        <div class="contact-details-list">
            <div class="contact-detail-row">
                <span class="contact-detail-label">Status Kehadiran</span>
                <span id="infoPresenceText" class="contact-detail-val">Offline</span>
            </div>
            <div class="contact-detail-row">
                <span class="contact-detail-label">Hubungan Akun</span>
                <span class="contact-detail-val" style="color: var(--status-online);">Teman Terhubung</span>
            </div>
            <div class="contact-detail-row">
                <span class="contact-detail-label">Bergabung Sejak</span>
                <span id="infoJoinedDate" class="contact-detail-val">Pengguna ZChat</span>
            </div>
            <div class="contact-detail-row">
                <span class="contact-detail-label">Total Percakapan</span>
                <span id="infoTotalMessages" class="contact-detail-val">0 pesan</span>
            </div>
        </div>

        <div style="display: flex; gap: 0.75rem; margin-top: 0.25rem;">
            <button type="button" class="btn-action-primary" style="flex: 1;" onclick="closeContactInfoModal(); focusMessageInput();">
                Kirim Pesan
            </button>
            <button type="button" class="btn-action-primary" style="background-color: var(--bg-surface-elevated); color: var(--text-primary); border: 1px solid var(--border-subtle);" onclick="closeContactInfoModal()">
                Tutup
            </button>
        </div>
    </div>
</div>
