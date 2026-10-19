{{-- Create Group Modal --}}
<div id="createGroupModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="createGroupTitle">
    <div class="modal-card">
        <div class="modal-header">
            <div>
                <h2 id="createGroupTitle" class="modal-title">Buat Grup Baru</h2>
                <p class="modal-subtitle">Buat ruang obrolan bersama teman dan anggota tim Anda</p>
            </div>
            <button type="button" class="btn-icon" onclick="closeCreateGroupModal()" aria-label="Tutup modal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <form id="createGroupForm" onsubmit="handleCreateGroupSubmit(event)" class="modal-form-stack">
            <div class="form-group">
                <label for="groupNameInput" class="form-label">Nama Grup</label>
                <input id="groupNameInput" type="text" class="form-input" required maxlength="100" placeholder="Contoh: Tim Proyek ZChat">
            </div>

            <div class="form-group">
                <label for="groupDescInput" class="form-label">Deskripsi Grup (Opsional)</label>
                <input id="groupDescInput" type="text" class="form-input" maxlength="255" placeholder="Topik atau tujuan grup ini">
            </div>

            <div class="form-group">
                <div class="member-header-row">
                    <label class="form-label mb-0">Pilih Anggota dari Kontak</label>
                    <span id="createGroupSelectedCount" class="selected-counter-badge">0 dipilih</span>
                </div>
                <div id="createGroupMembersList" class="member-selection-box">
                    {{-- Dynamically populated by app.js --}}
                </div>
                <span class="form-helper">Pilih teman dari daftar kontak yang ingin diundang ke grup.</span>
            </div>

            <div class="modal-footer-row">
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
