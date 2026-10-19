{{-- Join Group via Invite Code / Link Modal --}}
<div id="joinGroupModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="joinGroupModalTitle" onclick="if(event.target === this) closeJoinGroupModal()">
    <div class="modal-card join-group-modal-card">
        <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-primary);">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
                <h2 id="joinGroupModalTitle" class="modal-title">Gabung Grup</h2>
            </div>
            <button type="button" class="btn-icon" onclick="closeJoinGroupModal()" aria-label="Tutup modal gabung grup" title="Tutup">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <form id="joinGroupForm" onsubmit="event.preventDefault(); submitJoinGroupByCode();" class="modal-body" style="padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem;">
            <p style="font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.5; margin: 0;">
                Masukkan kode undangan grup atau tempel tautan undangan yang Anda terima dari anggota atau admin grup.
            </p>

            <div class="form-group" style="margin-bottom: 0;">
                <label for="joinGroupCodeInput" class="form-label" style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.35rem; display: block;">
                    Kode / Tautan Undangan <span style="color: #ef4444;">*</span>
                </label>
                <input
                    type="text"
                    id="joinGroupCodeInput"
                    class="form-input"
                    placeholder="Misal: a1b2c3d4e5 atau https://chat.../join/a1b2c3d4e5"
                    required
                    style="width: 100%; font-family: monospace;"
                >
            </div>

            <div class="modal-footer" style="padding: 0; margin-top: 0.5rem; border: none; display: flex; justify-content: flex-end; gap: 0.5rem;">
                <button type="button" class="btn-secondary" onclick="closeJoinGroupModal()">Batal</button>
                <button type="submit" id="btnSubmitJoinGroup" class="btn-primary" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                    <span>Gabung Grup</span>
                </button>
            </div>
        </form>
    </div>
</div>
