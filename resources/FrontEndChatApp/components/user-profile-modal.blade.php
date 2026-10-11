<div id="userProfileModal" class="modal-overlay" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="profileModalTitle">
    <div class="modal-card">
        <div class="modal-header">
            <div>
                <h3 id="profileModalTitle" class="modal-title">Pengaturan Profil Akun</h3>
                <p class="modal-subtitle">Kelola informasi identitas akun dan preferensi obrolan Anda</p>
            </div>
            <button type="button" class="btn-icon" onclick="closeUserProfileModal()" aria-label="Tutup pengaturan profil">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="6"></line>
                </svg>
            </button>
        </div>

        <form id="profileForm" onsubmit="handleSaveProfile(event)">
            <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 1.5rem; text-align: center;">
                <div id="profileModalAvatar" class="avatar-circle info-avatar-large avatar-pastel-purple" style="margin-bottom: 0.75rem; width: 68px; height: 68px; font-size: 1.5rem;">
                    U
                </div>
                <div id="profileModalStatusBadge" style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; color: #10b981; font-weight: 600;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
                    <span>Terhubung ke Server</span>
                </div>
            </div>

            <div class="form-group">
                <label for="profileDisplayNameInput" class="form-label">Nama Tampilan</label>
                <input
                    type="text"
                    id="profileDisplayNameInput"
                    class="form-input"
                    maxlength="100"
                    required
                    placeholder="Masukkan nama tampilan Anda"
                >
            </div>

            <div class="form-group">
                <label for="profileUsernameInput" class="form-label">Username</label>
                <input
                    type="text"
                    id="profileUsernameInput"
                    class="form-input"
                    readonly
                    style="opacity: 0.75; cursor: not-allowed;"
                >
            </div>

            <div class="form-group">
                <label for="profileEmailInput" class="form-label">Alamat Email</label>
                <input
                    type="email"
                    id="profileEmailInput"
                    class="form-input"
                    readonly
                    style="opacity: 0.75; cursor: not-allowed;"
                >
            </div>

            <div class="form-group" style="margin-top: 1rem; padding: 0.75rem; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-card);">
                <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; user-select: none;">
                    <input type="checkbox" id="profileSoundToggle" onchange="toggleSoundNotification(this.checked)" style="width: 17px; height: 17px; accent-color: var(--accent-primary);">
                    <div>
                        <div style="font-size: 0.84rem; font-weight: 600; color: var(--text-primary);">Suara Notifikasi Obrolan</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">Bunyikan audio lembut saat ada pesan masuk</div>
                    </div>
                </label>
            </div>

            <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
                <button type="submit" id="btnSaveProfile" class="btn-primary-action" style="flex: 1;">
                    Simpan Perubahan
                </button>
                <button type="button" class="btn-primary-action danger" onclick="handleLogout()" style="background-color: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);">
                    Keluar Akun
                </button>
            </div>
        </form>
    </div>
</div>
