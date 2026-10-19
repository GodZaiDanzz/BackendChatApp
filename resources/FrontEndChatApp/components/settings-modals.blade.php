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

        <div class="modal-form-stack">
            {{-- Account Status Card --}}
            <div class="settings-card-item">
                <div class="settings-card-row">
                    <div>
                        <div class="settings-card-desc">Status Akun</div>
                        <div class="settings-card-title" style="margin-top: 2px;">Aktif & Terverifikasi</div>
                    </div>
                    <span class="settings-status-pill online">
                        Online
                    </span>
                </div>
            </div>

            {{-- Security Notice --}}
            <div class="info-security-card">
                <div class="info-security-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                </div>
                <div>
                    <div class="info-security-title">Enkripsi End-to-End WebSocket</div>
                    <div class="info-security-desc">Obrolan dan panggilan Anda dilindungi protokol TLS dengan token autentikasi Sanctum aman.</div>
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

            <div class="modal-footer-row">
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

        <div class="modal-form-stack">
            {{-- Streamer Mode Switch Card --}}
            <div class="settings-card-item">
                <label class="settings-card-row" style="cursor: pointer; user-select: none;">
                    <div style="padding-right: 0.75rem;">
                        <div class="settings-card-title">Mode Streamer</div>
                        <div class="settings-card-desc">Samarkan teks obrolan & nomor kontak saat share screen / live streaming</div>
                    </div>
                    <input type="checkbox" id="privacyStreamerToggle" onchange="toggleStreamerMode()" style="width: 18px; height: 18px; accent-color: var(--accent-primary); cursor: pointer;">
                </label>
            </div>

            {{-- Pesan Sementara Info --}}
            <div class="settings-card-item">
                <div class="settings-card-row">
                    <div>
                        <div class="settings-card-title">Pesan Sementara</div>
                        <div class="settings-card-desc">Atur timer otomatis penghapusan pesan baru</div>
                    </div>
                    <span class="settings-status-pill muted">Mati</span>
                </div>
            </div>

            {{-- Laporan Dibaca --}}
            <div class="settings-card-item">
                <div class="settings-card-row">
                    <div>
                        <div class="settings-card-title">Tanda Dibaca (Centang Biru)</div>
                        <div class="settings-card-desc">Kirim tanda saat Anda telah membuka dan membaca pesan</div>
                    </div>
                    <span class="settings-status-pill online">Aktif</span>
                </div>
            </div>

            <div class="modal-footer-row">
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

        <div class="modal-form-stack">
            {{-- Theme Selection Row --}}
            <div class="settings-card-item">
                <div class="settings-card-row">
                    <div>
                        <div class="settings-card-title">Tema Warna Tampilan</div>
                        <div class="settings-card-desc">Pilih antara mode gelap obsidian atau mode terang</div>
                    </div>
                    <button type="button" class="btn-outline-action" onclick="toggleTheme()" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; min-height: 32px;">
                        <span id="chatPrefThemeLabel">Ganti Tema</span>
                    </button>
                </div>
            </div>

            {{-- Enter to Send Option --}}
            <div class="settings-card-item">
                <label class="settings-card-row" style="cursor: pointer; user-select: none;">
                    <div>
                        <div class="settings-card-title">Enter untuk Mengirim</div>
                        <div class="settings-card-desc">Tekan tombol Enter pada keyboard untuk langsung mengirim pesan</div>
                    </div>
                    <input type="checkbox" checked disabled style="width: 18px; height: 18px; accent-color: var(--accent-primary);">
                </label>
            </div>

            {{-- Clear local cache button --}}
            <div class="settings-card-item">
                <div class="settings-card-row">
                    <div>
                        <div class="settings-card-title">Cache Obrolan Lokal</div>
                        <div class="settings-card-desc">Segarkan memori cache pesan lokal perangkat ini</div>
                    </div>
                    <button type="button" class="btn-outline-action" onclick="showToast('Cache lokal berhasil disegarkan.', 'success')" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; min-height: 32px;">
                        Bersihkan
                    </button>
                </div>
            </div>

            <div class="modal-footer-row">
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

        <div class="modal-form-stack">
            {{-- Sound toggle with test button --}}
            <div class="settings-card-item">
                <div class="settings-card-row" style="margin-bottom: 0.5rem;">
                    <div>
                        <div class="settings-card-title">Suara Nada Dering Pesan</div>
                        <div class="settings-card-desc">Bunyikan audio lembut saat ada pesan masuk</div>
                    </div>
                    <input type="checkbox" id="modalSoundToggle" onchange="toggleSoundNotification(this.checked)" style="width: 18px; height: 18px; accent-color: var(--accent-primary); cursor: pointer;">
                </div>
                <button type="button" class="btn-outline-action" onclick="if(window.playMessageChime){window.playMessageChime();}showToast('Memutar suara nada dering obrolan...', 'info')" style="padding: 0.35rem 0.75rem; font-size: 0.78rem; min-height: 32px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                    <span>Uji Nada Dering</span>
                </button>
            </div>

            {{-- Desktop / Web Notifications --}}
            <div class="settings-card-item">
                <div class="settings-card-row">
                    <div>
                        <div class="settings-card-title">Pemberitahuan Desktop</div>
                        <div class="settings-card-desc">Tampilkan popup saat aplikasi sedang diminimalkan</div>
                    </div>
                    <button type="button" class="btn-outline-action" onclick="requestBrowserNotificationPermission()" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; min-height: 32px;">
                        Izin Notifikasi
                    </button>
                </div>
            </div>

            <div class="modal-footer-row">
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
            <div class="settings-card-item" style="padding: 0.65rem 0.85rem;">
                <div class="settings-card-row">
                    <span class="settings-card-title">Cari Pesan dalam Chat Aktif</span>
                    <kbd style="padding: 0.25rem 0.55rem; background: var(--bg-input); border: 1px solid var(--border-card); border-radius: 6px; font-size: 0.8rem; font-family: monospace; color: #a78bfa; font-weight: 700;">Ctrl + F</kbd>
                </div>
            </div>

            <div class="settings-card-item" style="padding: 0.65rem 0.85rem;">
                <div class="settings-card-row">
                    <span class="settings-card-title">Kirim Pesan</span>
                    <kbd style="padding: 0.25rem 0.55rem; background: var(--bg-input); border: 1px solid var(--border-card); border-radius: 6px; font-size: 0.8rem; font-family: monospace; color: #a78bfa; font-weight: 700;">Enter</kbd>
                </div>
            </div>

            <div class="settings-card-item" style="padding: 0.65rem 0.85rem;">
                <div class="settings-card-row">
                    <span class="settings-card-title">Baris Baru dalam Pesan</span>
                    <kbd style="padding: 0.25rem 0.55rem; background: var(--bg-input); border: 1px solid var(--border-card); border-radius: 6px; font-size: 0.8rem; font-family: monospace; color: #a78bfa; font-weight: 700;">Shift + Enter</kbd>
                </div>
            </div>

            <div class="settings-card-item" style="padding: 0.65rem 0.85rem;">
                <div class="settings-card-row">
                    <span class="settings-card-title">Tutup Modal / Lightbox / Batal</span>
                    <kbd style="padding: 0.25rem 0.55rem; background: var(--bg-input); border: 1px solid var(--border-card); border-radius: 6px; font-size: 0.8rem; font-family: monospace; color: #a78bfa; font-weight: 700;">Esc</kbd>
                </div>
            </div>

            <div class="settings-card-item" style="padding: 0.65rem 0.85rem;">
                <div class="settings-card-row">
                    <span class="settings-card-title">Fokus Kotak Pencarian Kontak</span>
                    <kbd style="padding: 0.25rem 0.55rem; background: var(--bg-input); border: 1px solid var(--border-card); border-radius: 6px; font-size: 0.8rem; font-family: monospace; color: #a78bfa; font-weight: 700;">/</kbd>
                </div>
            </div>

            <div class="settings-card-item" style="padding: 0.65rem 0.85rem;">
                <div class="settings-card-row">
                    <span class="settings-card-title">Panel Detail Kontak</span>
                    <kbd style="padding: 0.25rem 0.55rem; background: var(--bg-input); border: 1px solid var(--border-card); border-radius: 6px; font-size: 0.8rem; font-family: monospace; color: #a78bfa; font-weight: 700;">Ctrl + B</kbd>
                </div>
            </div>
        </div>

        <div class="modal-footer-row">
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

        <div class="modal-form-stack">
            <div class="settings-card-item">
                <div style="display: flex; align-items: center; gap: 0.85rem;">
                    <div style="width: 44px; height: 44px; border-radius: 12px; background: var(--accent-primary); display: flex; align-items: center; justify-content: center; color: #ffffff; flex-shrink: 0;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <div>
                        <div style="font-size: 1rem; font-weight: 700; color: var(--text-primary);">ZChat Web</div>
                        <div style="font-size: 0.775rem; color: var(--text-secondary); margin-top: 1px;">Versi 2.5.0 Modern Realtime Edition</div>
                    </div>
                </div>
            </div>

            <div class="settings-card-item">
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem; font-size: 0.84375rem;">Spesifikasi Mesin:</div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem; font-size: 0.8125rem;">
                    <span style="color: var(--text-secondary);">Protokol Realtime:</span>
                    <strong style="color: #10b981;">WebSockets (TLS Encrypted)</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem; font-size: 0.8125rem;">
                    <span style="color: var(--text-secondary);">Pengembang:</span>
                    <strong style="color: var(--text-primary);">Muhammad Zaidan</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.8125rem;">
                    <span style="color: var(--text-secondary);">Status Server:</span>
                    <strong style="color: #10b981;">Operasional Normal</strong>
                </div>
            </div>

            <div class="modal-footer-row">
                <button type="button" class="btn-action-primary" style="flex: 1;" onclick="closeHelpSupportModal()">
                    Tutup
                </button>
            </div>
        </div>
    </div>
</div>
