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
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <form id="addGroupMemberForm" onsubmit="handleAddGroupMembersSubmit(event)" class="modal-form-stack">
            {{-- Search contacts input --}}
            <div class="form-group">
                <div class="search-input-icon-wrap">
                    <svg class="search-icon-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input 
                        id="searchAddMemberInput" 
                        type="text" 
                        class="form-input search-input-with-icon" 
                        placeholder="Cari teman di kontak..." 
                        oninput="filterAddMemberCandidates(event)"
                    >
                </div>
            </div>

            <div class="form-group">
                <div class="member-header-row">
                    <span class="form-label mb-0">Daftar Kontak Tersedia</span>
                    <span id="addMemberSelectedBadge" class="selected-counter-badge">0 dipilih</span>
                </div>
                <div id="addMembersChecklist" class="member-selection-box">
                    {{-- Dynamically populated by app.js --}}
                </div>
            </div>

            <div class="modal-footer-row">
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
