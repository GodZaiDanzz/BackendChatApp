{{-- Create Group Modal --}}
<div id="createGroupModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="createGroupTitle">
    <div class="modal-card">
        <div class="modal-header">
            <h2 id="createGroupTitle" class="modal-title">Buat Grup Baru</h2>
            <button type="button" class="btn-icon" onclick="closeCreateGroupModal()" aria-label="Tutup modal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <form id="createGroupForm" onsubmit="handleCreateGroupSubmit(event)" style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="form-group">
                <label for="groupNameInput" class="form-label">Nama Grup</label>
                <input id="groupNameInput" type="text" class="form-input" required maxlength="100" placeholder="Contoh: Tim Proyek ZChat">
            </div>

            <div class="form-group">
                <label for="groupDescInput" class="form-label">Deskripsi Grup (Opsional)</label>
                <input id="groupDescInput" type="text" class="form-input" maxlength="255" placeholder="Topik atau tujuan grup ini">
            </div>

            <div class="form-group">
                <label class="form-label">Pilih Anggota dari Kontak</label>
                <div id="createGroupMembersList" style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.5rem; background: var(--bg-surface);">
                    {{-- Dynamically populated by app.js --}}
                </div>
                <span class="form-helper">Pilih teman dari daftar kontak yang ingin diundang ke grup.</span>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem;">
                <button type="button" class="btn-outline-action" onclick="closeCreateGroupModal()">
                    Batal
                </button>
                <button type="submit" id="btnSubmitCreateGroup" class="btn-action-primary">
                    Buat Grup
                </button>
            </div>
        </form>
    </div>
</div>
