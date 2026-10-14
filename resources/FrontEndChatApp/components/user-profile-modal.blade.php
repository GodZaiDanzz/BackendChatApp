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
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <form id="profileForm" onsubmit="handleSaveProfile(event)">
            <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 1.5rem; text-align: center;">
                {{-- WhatsApp-Style Profile Avatar Container with Camera Overlay --}}
                <div style="position: relative; margin-bottom: 0.75rem; cursor: pointer;" onclick="document.getElementById('userAvatarFileInput').click()" title="Klik untuk ubah foto profil">
                    <div id="profileModalAvatar" class="avatar-circle avatar-pastel-purple" style="width: 104px; height: 104px; font-size: 2.25rem; border: 3px solid rgba(124, 58, 237, 0.4); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35); overflow: hidden; display: flex; align-items: center; justify-content: center; position: relative; transition: all 0.2s ease;">
                        U
                    </div>
                    {{-- Camera icon overlay badge --}}
                    <div style="position: absolute; bottom: 2px; right: 2px; width: 32px; height: 32px; border-radius: 50%; background: #7c3aed; color: #ffffff; display: flex; align-items: center; justify-content: center; border: 2.5px solid var(--bg-surface); box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4); transition: transform 0.15s ease;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                        </svg>
                    </div>
                </div>

                {{-- Hidden file picker --}}
                <input type="file" id="userAvatarFileInput" accept="image/*" style="display: none;" onchange="handleUserAvatarSelected(event)">

                {{-- Avatar Action Buttons (Ubah / Hapus) --}}
                <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.35rem;">
                    <button type="button" class="btn-outline-action" onclick="document.getElementById('userAvatarFileInput').click()" style="padding: 0.25rem 0.65rem; font-size: 0.75rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                        </svg>
                        <span>Ubah Foto</span>
                    </button>
                    <button type="button" id="btnDeleteUserAvatar" class="btn-outline-action" onclick="handleDeleteUserAvatar()" style="display: none; padding: 0.25rem 0.65rem; font-size: 0.75rem; border-radius: 6px; color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">
                        Hapus Foto
                    </button>
                </div>

                {{-- Conversion / Size info badge --}}
                <div id="userAvatarInfoBadge" style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.4rem;">
                    Ukuran standar WhatsApp (500x500) • Maks 10MB
                </div>

                <div id="profileModalStatusBadge" style="display: inline-flex; align-items: center; gap: 0.45rem; font-size: 0.75rem; color: #10b981; font-weight: 600; padding: 0.2rem 0.65rem; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 9999px;">
                    <span class="status-indicator-dot online" style="position: static; width: 8px; height: 8px; margin: 0; box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);"></span>
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

            <div class="form-group">
                <label for="profilePhoneInput" class="form-label">Nomor Telepon</label>
                <input
                    type="tel"
                    id="profilePhoneInput"
                    class="form-input"
                    maxlength="25"
                    placeholder="Contoh: 081234567890 / +62812..."
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
                <button type="submit" id="btnSaveProfile" class="btn-action-primary" style="flex: 1; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 600; border-radius: var(--radius-md);">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Simpan Perubahan</span>
                </button>
                <button type="button" class="btn-action-danger-outline" onclick="handleLogout()" style="min-height: 44px; padding: 0.625rem 1rem; border-radius: var(--radius-md); display: inline-flex; align-items: center; gap: 0.45rem; font-weight: 600; background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); cursor: pointer; transition: all 0.15s ease;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    <span>Keluar Akun</span>
                </button>
            </div>
        </form>
    </div>
</div>
