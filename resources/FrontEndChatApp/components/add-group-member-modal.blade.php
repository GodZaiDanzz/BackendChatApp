{{-- Add Group Member Modal --}}
<div id="addGroupMemberModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="addGroupMemberTitle">
    <div class="modal-card">
        <div class="modal-header">
            <h2 id="addGroupMemberTitle" class="modal-title">Tambah Anggota Grup</h2>
            <button type="button" class="btn-icon" onclick="closeAddGroupMemberModal()" aria-label="Tutup modal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="6"></line>
                </svg>
            </button>
        </div>

        <form id="addGroupMemberForm" onsubmit="handleAddGroupMembersSubmit(event)" style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="form-group">
                <label class="form-label">Pilih Kontak untuk Ditambahkan</label>
                <div id="addMembersChecklist" style="max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.5rem; background: var(--bg-surface);">
                    {{-- Dynamically populated by app.js --}}
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem;">
                <button type="button" class="btn-outline-action" onclick="closeAddGroupMemberModal()">
                    Batal
                </button>
                <button type="submit" id="btnSubmitAddMembers" class="btn-action-primary">
                    Tambahkan
                </button>
            </div>
        </form>
    </div>
</div>
