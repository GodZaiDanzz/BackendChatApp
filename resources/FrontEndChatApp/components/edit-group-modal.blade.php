{{-- Edit Group Modal --}}
<div id="editGroupModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="editGroupTitle">
    <div class="modal-card">
        <div class="modal-header">
            <div>
                <h2 id="editGroupTitle" class="modal-title">Edit Detail Grup</h2>
                <p class="modal-subtitle">Perbarui nama, deskripsi, dan foto profil grup</p>
            </div>
            <button type="button" class="btn-icon" onclick="closeEditGroupModal()" aria-label="Tutup modal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <form id="editGroupForm" onsubmit="handleEditGroupSubmit(event)" class="modal-form-stack">
            {{-- Group Avatar Preview & Upload --}}
            <div class="group-avatar-upload-card">
                <div id="editGroupAvatarPreview" class="group-avatar-preview-box">
                    {{-- Dynamically populated --}}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div class="form-label" style="margin-bottom: 0.35rem;">Foto Profil Grup</div>
                    <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                        <label for="editGroupAvatarFile" class="btn-outline-action" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; margin-bottom: 0; min-height: 32px;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                <circle cx="12" cy="13" r="4"></circle>
                            </svg>
                            <span>Pilih Foto</span>
                        </label>
                        <input type="file" id="editGroupAvatarFile" accept="image/*" style="display: none;" onchange="previewGroupAvatar(event)">
                        <span id="editGroupAvatarFileName" style="font-size: 0.72rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;"></span>
                    </div>
                </div>
            </div>

            {{-- Group Name Input --}}
            <div class="form-group">
                <label for="editGroupNameInput" class="form-label">Nama Grup <span style="color: #ef4444;">*</span></label>
                <input 
                    id="editGroupNameInput" 
                    type="text" 
                    class="form-input" 
                    required 
                    maxlength="100" 
                    placeholder="Masukkan nama grup..."
                >
            </div>

            {{-- Group Description Input --}}
            <div class="form-group">
                <label for="editGroupDescInput" class="form-label">Deskripsi Grup (Opsional)</label>
                <textarea 
                    id="editGroupDescInput" 
                    class="form-input" 
                    rows="3" 
                    maxlength="255" 
                    placeholder="Tuliskan topik atau deskripsi grup ini..."
                    style="resize: vertical; min-height: 70px; line-height: 1.45;"
                ></textarea>
                <span class="form-helper">Maksimal 255 karakter</span>
            </div>

            {{-- Action buttons --}}
            <div class="modal-footer-row">
                <button type="button" class="btn-outline-action" onclick="closeEditGroupModal()">
                    Batal
                </button>
                <button type="submit" id="btnSubmitEditGroup" class="btn-action-primary">
                    Simpan Perubahan
                </button>
            </div>
        </form>
    </div>
</div>
