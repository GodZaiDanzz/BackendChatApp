{{-- Add Group Member Modal --}}
<div id="addGroupMemberModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="addGroupMemberTitle">
    <div class="modal-card">
        <div class="modal-header">
            <div>
                <h2 id="addGroupMemberTitle" class="modal-title">Tambah Anggota Grup</h2>
                <p class="modal-subtitle">Pilih kontak teman untuk diundang ke dalam grup ini</p>
            </div>
            <button type="button" class="btn-icon" onclick="closeAddGroupMemberModal()" aria-label="Tutup modal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="6"></line>
                </svg>
            </button>
        </div>

        <form id="addGroupMemberForm" onsubmit="handleAddGroupMembersSubmit(event)" style="display: flex; flex-direction: column; gap: 1rem;">
            {{-- Search contacts input --}}
            <div class="form-group" style="position: relative;">
                <input 
                    id="searchAddMemberInput" 
                    type="text" 
                    class="form-input" 
                    placeholder="Cari teman di kontak..." 
                    oninput="filterAddMemberCandidates(event)"
                    style="padding-left: 2.25rem;"
                >
                <div style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--text-muted); display: flex;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label" style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600;">Daftar Kontak Tersedia</span>
                    <span id="addMemberSelectedBadge" style="font-size: 0.75rem; color: #a78bfa; font-weight: 600;">0 dipilih</span>
                </label>
                <div id="addMembersChecklist" style="max-height: 230px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.4rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.5rem; background: var(--bg-surface-elevated, rgba(255,255,255,0.02));">
                    {{-- Dynamically populated by app.js --}}
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.25rem;">
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
