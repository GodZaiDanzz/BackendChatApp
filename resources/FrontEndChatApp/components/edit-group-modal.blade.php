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
                    <line x1="6" y1="6" x2="18" y2="6"></line>
                </svg>
            </button>
        </div>

        <form id="editGroupForm" onsubmit="handleEditGroupSubmit(event)" style="display: flex; flex-direction: column; gap: 1.15rem;">
            {{-- Group Avatar Preview & Upload --}}
            <div style="display: flex; align-items: center; gap: 1rem; padding: 0.85rem; border-radius: 12px; background: var(--bg-surface-elevated, rgba(255,255,255,0.03)); border: 1px solid var(--border-subtle, rgba(255,255,255,0.08));">
                <div id="editGroupAvatarPreview" style="width: 58px; height: 58px; border-radius: 50%; overflow: hidden; flex-shrink: 0; background: var(--bg-surface); border: 2px solid rgba(124, 58, 237, 0.3); display: flex; align-items: center; justify-content: center;">
                    {{-- Dynamically populated --}}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.3rem;">Foto Profil Grup</div>
                    <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                        <label for="editGroupAvatarFile" class="btn-outline-action" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; margin-bottom: 0; border-radius: 6px;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                <circle cx="12" cy="13" r="4"></circle>
                            </svg>
                            <span>Pilih Foto</span>
                        </label>
                        <input type="file" id="editGroupAvatarFile" accept="image/*" style="display: none;" onchange="previewGroupAvatar(event)">
                        <span id="editGroupAvatarFileName" style="font-size: 0.7rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;"></span>
                    </div>
                </div>
            </div>

            {{-- Group Name Input --}}
            <div class="form-group">
                <label for="editGroupNameInput" class="form-label" style="font-weight: 600;">Nama Grup <span style="color: #ef4444;">*</span></label>
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
                <label for="editGroupDescInput" class="form-label" style="font-weight: 600;">Deskripsi Grup (Opsional)</label>
                <textarea 
                    id="editGroupDescInput" 
                    class="form-input" 
                    rows="3" 
                    maxlength="255" 
                    placeholder="Tuliskan topik atau deskripsi grup ini..."
                    style="resize: vertical; min-height: 70px; line-height: 1.45;"
                ></textarea>
                <span class="form-helper" style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem;">Maksimal 255 karakter</span>
            </div>

            {{-- Action buttons --}}
            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.25rem;">
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
