{{-- Join Group via Invite Code / Link Modal --}}
<div id="joinGroupModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="joinGroupModalTitle" onclick="if(event.target === this) closeJoinGroupModal()">
    <div class="modal-card join-group-modal-card">
        <div class="modal-header">
            <div>
                <h2 id="joinGroupModalTitle" class="modal-title">Gabung Grup</h2>
                <p class="modal-subtitle">Bergabung dengan grup menggunakan kode atau tautan undangan</p>
            </div>
            <button type="button" class="btn-icon" onclick="closeJoinGroupModal()" aria-label="Tutup modal gabung grup" title="Tutup">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <form id="joinGroupForm" onsubmit="event.preventDefault(); submitJoinGroupByCode();" class="modal-form-stack">
            <div class="form-group">
                <label for="joinGroupCodeInput" class="form-label">
                    Kode / Tautan Undangan <span style="color: #ef4444;">*</span>
                </label>
                <input
                    type="text"
                    id="joinGroupCodeInput"
                    class="form-input join-code-input"
                    placeholder="Contoh: a1b2c3d4e5 atau https://chat.../join/a1b2c3d4e5"
                    required
                >
                <span class="form-helper">Tempel tautan undangan grup atau masukkan kode 10 karakter yang dibagikan admin.</span>
            </div>

            <div class="modal-footer-row">
                <button type="button" class="btn-outline-action" onclick="closeJoinGroupModal()">Batal</button>
                <button type="submit" id="btnSubmitJoinGroup" class="btn-action-primary">
                    <span>Gabung Grup</span>
                </button>
            </div>
        </form>
    </div>
</div>
