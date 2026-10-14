{{-- Settings Detail Modals for WhatsApp Web Settings Menu --}}

{{-- 1. Modal Akun & Keamanan --}}
<div id="accountSecurityModal" class="modal-overlay" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="accountModalTitle">
    <div class="modal-card">
        <div class="modal-header">
            <div>
                <h3 id="accountModalTitle" class="modal-title">Info Akun & Keamanan</h3>
                <p class="modal-subtitle">Informasi identitas akun dan keamanan sesi Anda</p>
            </div>
            <button type="button" class="btn-icon" onclick="closeAccountSecurityModal()" aria-label="Tutup info akun">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            {{-- Account Status Card --}}
            <div style="padding: 0.85rem; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-card); display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">Status Akun</div>
                    <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-top: 2px;">Aktif & Terverifikasi</div>
                </div>
                <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.75rem; color: #10b981; font-weight: 600; padding: 0.25rem 0.65rem; background: rgba(16, 185, 129, 0.12); border-radius: 9999px;">
                    <span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981;"></span>
                    <span>Online</span>
                </span>
            </div>

            {{-- Security Notice --}}
            <div style="padding: 0.85rem; background: rgba(124, 58, 237, 0.08); border-radius: var(--radius-md); border: 1px solid rgba(124, 58, 237, 0.25); display: flex; gap: 0.75rem; align-items: flex-start;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                <div style="font-size: 0.8rem; line-height: 1.4; color: var(--text-secondary);">
                    <strong style="color: var(--text-primary);">Enkripsi End-to-End WebSocket</strong><br>
                    Obrolan dan panggilan Anda dilindungi protokol TLS dengan token autentikasi Sanctum aman.
                </div>
            </div>

            {{-- Account Details List --}}
            <div class="form-group">
                <label class="form-label">Username Anda</label>
                <input type="text" id="accountModalUsername" class="form-input" readonly style="opacity: 0.8; cursor: not-allowed;">
            </div>

            <div class="form-group">
                <label class="form-label">Email Terdaftar</label>
                <input type="email" id="accountModalEmail" class="form-input" readonly style="opacity: 0.8; cursor: not-allowed;">
            </div>

            <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem;">
                <button type="button" class="btn-action-primary" style="flex: 1;" onclick="closeAccountSecurityModal(); openUserProfileModal();">
                    Edit Profil Saya
                </button>
            </div>
        </div>
    </div>
</div>

{{-- 2. Modal Privasi --}}
<div id="privacySettingsModal" class="modal-overlay" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="privacyModalTitle">
    <div class="modal-card">
        <div class="modal-header">
            <div>
                <h3 id="privacyModalTitle" class="modal-title">Pengaturan Privasi</h3>
                <p class="modal-subtitle">Kontrol kerahasiaan percakapan dan privasi tampilan Anda</p>
            </div>
            <button type="button" class="btn-icon" onclick="closePrivacySettingsModal()" aria-label="Tutup privasi">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            {{-- Streamer Mode Switch Card --}}
            <div style="padding: 0.85rem; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-card);">
                <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; user-select: none;">
                    <div style="padding-right: 0.75rem;">
                        <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary);">Mode Streamer</div>
                        <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">Samarkan teks obrolan & nomor kontak saat share screen / live streaming</div>
                    </div>
                    <input type="checkbox" id="privacyStreamerToggle" onchange="toggleStreamerMode()" style="width: 18px; height: 18px; accent-color: var(--accent-primary); cursor: pointer;">
                </label>
            </div>

            {{-- Pesan Sementara Info --}}
            <div style="padding: 0.85rem; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-card); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary);">Pesan Sementara</div>
                    <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">Atur timer otomatis penghapusan pesan baru</div>
                </div>
                <span style="font-size: 0.8rem; color: var(--text-secondary); background: var(--bg-subtle); padding: 0.25rem 0.5rem; border-radius: 6px;">Mati</span>
            </div>

            {{-- Laporan Dibaca --}}
            <div style="padding: 0.85rem; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-card); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary);">Tanda Dibaca (Centang Biru)</div>
                    <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">Kirim tanda saat Anda telah membuka dan membaca pesan</div>
                </div>
                <span style="font-size: 0.8rem; color: #10b981; font-weight: 600;">Aktif</span>
            </div>

            <div style="margin-top: 0.5rem;">
                <button type="button" class="btn-action-primary" style="width: 100%;" onclick="closePrivacySettingsModal()">
                    Selesai
                </button>
            </div>
        </div>
    </div>
</div>

{{-- 3. Modal Preferensi Chat --}}
<div id="chatPreferencesModal" class="modal-overlay" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="chatPrefModalTitle">
    <div class="modal-card">
        <div class="modal-header">
            <div>
                <h3 id="chatPrefModalTitle" class="modal-title">Pengaturan Chat & Tampilan</h3>
                <p class="modal-subtitle">Personalisasi tema, wallpaper, dan kenyamanan membaca obrolan</p>
            </div>
            <button type="button" class="btn-icon" onclick="closeChatPreferencesModal()" aria-label="Tutup pengaturan chat">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            {{-- Theme Selection Row --}}
            <div style="padding: 0.85rem; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-card); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary);">Tema Warna Tampilan</div>
                    <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">Pilih antara mode gelap obsidian atau mode terang</div>
                </div>
                <button type="button" class="btn-outline-action" onclick="toggleTheme()" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px;">
                    <span id="chatPrefThemeLabel">Ganti Tema</span>
                </button>
            </div>

            {{-- Enter to Send Option --}}
            <div style="padding: 0.85rem; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-card);">
                <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; user-select: none;">
                    <div>
                        <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary);">Enter untuk Mengirim</div>
                        <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">Tekan tombol Enter pada keyboard untuk langsung mengirim pesan</div>
                    </div>
                    <input type="checkbox" checked disabled style="width: 18px; height: 18px; accent-color: var(--accent-primary);">
                </label>
            </div>

            {{-- Clear local cache button --}}
            <div style="padding: 0.85rem; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-card); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary);">Cache Obrolan Lokal</div>
                    <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">Segarkan memori cache pesan lokal perangkat ini</div>
                </div>
                <button type="button" class="btn-outline-action" onclick="showToast('Cache lokal berhasil disegarkan.', 'success')" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; border-radius: 6px;">
                    Bersihkan
                </button>
            </div>

            <div style="margin-top: 0.5rem;">
                <button type="button" class="btn-action-primary" style="width: 100%;" onclick="closeChatPreferencesModal()">
                    Simpan & Tutup
                </button>
            </div>
        </div>
    </div>
</div>

{{-- 4. Modal Notifikasi --}}
<div id="notificationSettingsModal" class="modal-overlay" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="notifModalTitle">
    <div class="modal-card">
        <div class="modal-header">
            <div>
                <h3 id="notifModalTitle" class="modal-title">Pengaturan Notifikasi</h3>
                <p class="modal-subtitle">Kelola nada dering, suara pesan masuk, dan pemberitahuan desktop</p>
            </div>
            <button type="button" class="btn-icon" onclick="closeNotificationSettingsModal()" aria-label="Tutup notifikasi">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            {{-- Sound toggle with test button --}}
            <div style="padding: 0.85rem; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-card);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <div>
                        <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary);">Suara Nada Dering Pesan</div>
                        <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">Bunyikan audio lembut saat ada pesan masuk</div>
                    </div>
                    <input type="checkbox" id="modalSoundToggle" onchange="toggleSoundNotification(this.checked)" style="width: 18px; height: 18px; accent-color: var(--accent-primary); cursor: pointer;">
                </div>
                <button type="button" class="btn-outline-action" onclick="if(window.playMessageChime){window.playMessageChime();}showToast('Memutar suara nada dering obrolan...', 'info')" style="padding: 0.35rem 0.75rem; font-size: 0.78rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 5px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                    <span>Uji Nada Dering</span>
                </button>
            </div>

            {{-- Desktop / Web Notifications --}}
            <div style="padding: 0.85rem; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-card); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary);">Pemberitahuan Desktop</div>
                    <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">Tampilkan popup saat aplikasi sedang diminimalkan</div>
                </div>
                <button type="button" class="btn-outline-action" onclick="requestBrowserNotificationPermission()" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; border-radius: 6px;">
                    Izin Notifikasi
                </button>
            </div>

            <div style="margin-top: 0.5rem;">
                <button type="button" class="btn-action-primary" style="width: 100%;" onclick="closeNotificationSettingsModal()">
                    Simpan Pengaturan
                </button>
            </div>
        </div>
    </div>
</div>

{{-- 5. Modal Pintasan Keyboard --}}
<div id="keyboardShortcutsModal" class="modal-overlay" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="shortcutsModalTitle">
    <div class="modal-card">
        <div class="modal-header">
            <div>
                <h3 id="shortcutsModalTitle" class="modal-title">Pintasan Keyboard</h3>
                <p class="modal-subtitle">Akses cepat menggunakan tombol keyboard di ZChat Web</p>
            </div>
            <button type="button" class="btn-icon" onclick="closeKeyboardShortcutsModal()" aria-label="Tutup pintasan keyboard">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.65rem; max-height: 380px; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.75rem; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-card);">
                <span style="font-size: 0.85rem; color: var(--text-primary);">Kirim Pesan</span>
                <kbd style="padding: 0.2rem 0.5rem; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 4px; font-size: 0.78rem; font-family: monospace; color: #a78bfa;">Enter</kbd>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.75rem; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-card);">
                <span style="font-size: 0.85rem; color: var(--text-primary);">Baris Baru dalam Pesan</span>
                <kbd style="padding: 0.2rem 0.5rem; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 4px; font-size: 0.78rem; font-family: monospace; color: #a78bfa;">Shift + Enter</kbd>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.75rem; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-card);">
                <span style="font-size: 0.85rem; color: var(--text-primary);">Tutup Modal / Batal</span>
                <kbd style="padding: 0.2rem 0.5rem; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 4px; font-size: 0.78rem; font-family: monospace; color: #a78bfa;">Esc</kbd>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.75rem; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-card);">
                <span style="font-size: 0.85rem; color: var(--text-primary);">Fokus Kotak Pencarian</span>
                <kbd style="padding: 0.2rem 0.5rem; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 4px; font-size: 0.78rem; font-family: monospace; color: #a78bfa;">/</kbd>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.75rem; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-card);">
                <span style="font-size: 0.85rem; color: var(--text-primary);">Panel Detail Kontak</span>
                <kbd style="padding: 0.2rem 0.5rem; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 4px; font-size: 0.78rem; font-family: monospace; color: #a78bfa;">Ctrl + B</kbd>
            </div>
        </div>

        <div style="margin-top: 1rem;">
            <button type="button" class="btn-action-primary" style="width: 100%;" onclick="closeKeyboardShortcutsModal()">
                Tutup
            </button>
        </div>
    </div>
</div>

{{-- 6. Modal Bantuan dan Masukan --}}
<div id="helpSupportModal" class="modal-overlay" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="helpModalTitle">
    <div class="modal-card">
        <div class="modal-header">
            <div>
                <h3 id="helpModalTitle" class="modal-title">Bantuan dan Masukan</h3>
                <p class="modal-subtitle">Informasi versi aplikasi, dokumentasi, dan kontak bantuan</p>
            </div>
            <button type="button" class="btn-icon" onclick="closeHelpSupportModal()" aria-label="Tutup bantuan">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            <div style="display: flex; align-items: center; gap: 0.85rem; padding: 0.85rem; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-card);">
                <div style="width: 44px; height: 44px; border-radius: 12px; background: #7c3aed; display: flex; align-items: center; justify-content: center; color: #ffffff; flex-shrink: 0;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                </div>
                <div>
                    <div style="font-size: 1rem; font-weight: 700; color: var(--text-primary);">ZChat Web</div>
                    <div style="font-size: 0.775rem; color: var(--text-muted); margin-top: 1px;">Versi 2.5.0 Modern Realtime Edition</div>
                </div>
            </div>

            <div style="padding: 0.85rem; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-card); font-size: 0.8125rem; line-height: 1.5; color: var(--text-secondary);">
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.35rem;">Spesifikasi Mesin:</div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <span>Protokol Realtime:</span>
                    <strong style="color: #10b981;">WebSockets (TLS Encrypted)</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <span>Pengembang:</span>
                    <strong style="color: var(--text-primary);">Muhammad Zaidan</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Status Server:</span>
                    <strong style="color: #10b981;">Operasional Normal</strong>
                </div>
            </div>

            <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem;">
                <button type="button" class="btn-action-primary" style="flex: 1;" onclick="closeHelpSupportModal()">
                    Tutup
                </button>
            </div>
        </div>
    </div>
</div>
