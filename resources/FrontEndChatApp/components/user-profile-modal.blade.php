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
