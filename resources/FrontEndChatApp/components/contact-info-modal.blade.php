{{-- Contact Information Modal Component --}}
<div id="contactInfoModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="contactInfoTitle">
    <div class="modal-card contact-modal-card">
        <div class="modal-header">
            <h2 id="contactInfoTitle" class="modal-title">Informasi Kontak</h2>
            <button type="button" class="btn-icon" onclick="closeContactInfoModal()" aria-label="Tutup modal informasi">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <div class="contact-modal-profile">
            <div class="avatar-container contact-modal-avatar-wrap">
                <div id="contactModalAvatarCircle" class="avatar-circle contact-info-avatar">?</div>
                <span id="contactModalStatusDot" class="status-indicator-dot offline"></span>
            </div>

            <div class="contact-modal-meta">
                <h3 id="contactModalDisplayName" class="contact-info-name">-</h3>
                <div id="contactModalUsername" class="contact-info-handle">@username</div>
            </div>

            <div id="contactModalStatusBadge" class="contact-status-badge offline">
                <span class="status-badge-dot"></span>
                <span id="contactModalStatusText">Offline</span>
            </div>
        </div>

        <div class="contact-details-list">
            <div class="contact-detail-row">
                <span class="contact-detail-label">Status Kehadiran</span>
                <span id="contactModalPresenceText" class="contact-detail-val">Offline</span>
            </div>
            <div class="contact-detail-row">
                <span class="contact-detail-label">Nomor Telepon</span>
                <span id="contactModalPhoneText" class="contact-detail-val">-</span>
            </div>
            <div class="contact-detail-row">
                <span class="contact-detail-label">Hubungan Akun</span>
                <span class="contact-detail-val status-online-text">Teman Terhubung</span>
            </div>
            <div class="contact-detail-row">
                <span class="contact-detail-label">Bergabung Sejak</span>
                <span id="contactModalJoinedDate" class="contact-detail-val">Pengguna ZChat</span>
            </div>
            <div class="contact-detail-row">
                <span class="contact-detail-label">Total Percakapan</span>
                <span id="contactModalTotalMessages" class="contact-detail-val">0 pesan</span>
            </div>
            <div class="contact-detail-row">
                <span class="contact-detail-label">Keamanan Obrolan</span>
                <span class="contact-detail-val security-verified-text">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    Enkripsi Server Terlindungi
                </span>
            </div>
        </div>

        <div class="contact-modal-actions">
            <button type="button" class="btn-action-primary contact-modal-btn" onclick="closeContactInfoModal(); focusMessageInput();">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>Kirim Pesan</span>
            </button>
            <button type="button" id="contactModalBlockBtn" class="btn-outline-warning contact-modal-btn" onclick="handleContactModalToggleBlock()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                </svg>
                <span id="contactModalBlockBtnText">Blokir Kontak</span>
            </button>
            <button type="button" class="btn-action-danger-outline contact-modal-btn" onclick="confirmDeleteContact()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>Hapus Kontak</span>
            </button>
            <button type="button" class="btn-outline-action contact-modal-btn" onclick="closeContactInfoModal()">
                Tutup
            </button>
        </div>
    </div>
</div>
