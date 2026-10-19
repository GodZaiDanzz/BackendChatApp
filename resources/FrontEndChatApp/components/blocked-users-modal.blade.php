{{-- Modal Daftar Kontak Diblokir (Blocked Contacts) --}}
<div id="blockedUsersModal" class="modal-overlay" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="blockedUsersModalTitle">
    <div class="modal-card" style="max-width: 480px;">
        <div class="modal-header">
            <div>
                <h3 id="blockedUsersModalTitle" class="modal-title">Kontak Diblokir</h3>
                <p class="modal-subtitle">Kontak yang diblokir tidak dapat mengirimkan pesan atau memulai panggilan kepada Anda</p>
            </div>
            <button type="button" class="btn-icon" onclick="closeBlockedUsersModal()" aria-label="Tutup modal kontak diblokir">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        {{-- Filter / Search blocked contact input --}}
        <div class="form-group" style="margin-bottom: 0.75rem;">
            <input
                type="text"
                id="searchBlockedUsersInput"
                class="form-input"
                placeholder="Cari kontak dalam daftar blokir..."
                oninput="filterBlockedUsersList(this.value)"
            >
        </div>

        {{-- Blocked Users List Container --}}
        <div id="blockedUsersList" style="max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.6rem; min-height: 120px;">
            <div class="empty-state" style="padding: 2rem 0; text-align: center;">
                <p class="empty-state-desc" style="color: var(--text-muted); font-size: 0.85rem;">Memuat daftar kontak yang diblokir...</p>
            </div>
        </div>

        <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle); display: flex; justify-content: flex-end;">
            <button type="button" class="btn-outline-action" onclick="closeBlockedUsersModal()" style="padding: 0.5rem 1.25rem;">
                Tutup
            </button>
        </div>
    </div>
</div>
