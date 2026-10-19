{{-- Active Sessions & Multi-Device Modal --}}
<div id="activeSessionsModal" class="modal-overlay" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="activeSessionsModalTitle">
    <div class="modal-card active-sessions-card">
        <header class="modal-header">
            <div class="modal-title-with-icon">
                <div class="modal-icon-badge">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                </div>
                <div>
                    <h3 id="activeSessionsModalTitle" class="modal-title">Sesi Aktif & Multi-Perangkat</h3>
                    <p class="modal-subtitle">Daftar browser atau perangkat yang sedang terhubung ke akun Anda.</p>
                </div>
            </div>
            <button type="button" class="btn-icon" onclick="closeActiveSessionsModal()" title="Tutup (Esc)" aria-label="Tutup modal sesi">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </header>

        <div class="modal-body sessions-modal-body">
            {{-- Sessions List Loading State --}}
            <div id="activeSessionsLoading" class="sessions-loading" style="display: none;">
                <div class="spinner-sm"></div>
                <span>Memuat daftar perangkat terhubung...</span>
            </div>

            {{-- Sessions List Container --}}
            <div id="activeSessionsList" class="active-sessions-list">
                {{-- Dynamically populated via JavaScript --}}
            </div>
        </div>

        <footer class="modal-footer sessions-modal-footer">
            <button type="button" class="btn-secondary" onclick="loadActiveSessions()" title="Muat ulang daftar sesi">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                <span>Perbarui</span>
            </button>
            <button type="button" id="btnRevokeOtherSessions" class="btn-danger" onclick="confirmRevokeOtherSessions()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Keluar dari Semua Perangkat Lain</span>
            </button>
        </footer>
    </div>
</div>
