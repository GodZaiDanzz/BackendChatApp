{{-- Custom Modern Confirmation Modal (Replaces default browser window.confirm) --}}
<div id="confirmModal" class="modal-overlay confirm-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirmModalTitle" style="display: none;" onclick="if(event.target === this) closeConfirmModal(false)">
    <div class="modal-card confirm-modal-card">
        <div class="confirm-modal-top">
            <div id="confirmModalIconBox" class="confirm-icon-box danger">
                <svg id="confirmModalIconSvg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            </div>
            <button type="button" id="confirmModalCloseBtn" class="btn-icon confirm-close-btn" onclick="closeConfirmModal(false)" aria-label="Tutup konfirmasi">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <div class="confirm-modal-body">
            <h3 id="confirmModalTitle" class="confirm-modal-title">Konfirmasi Tindakan</h3>
            <p id="confirmModalMessage" class="confirm-modal-message">Apakah Anda yakin ingin melanjutkan tindakan ini?</p>
        </div>

        <div class="confirm-modal-actions">
            <button type="button" id="confirmModalCancelBtn" class="btn-confirm-cancel" onclick="closeConfirmModal(false)">
                Batal
            </button>
            <button type="button" id="confirmModalConfirmBtn" class="btn-confirm-submit danger" onclick="closeConfirmModal(true)">
                Hapus
            </button>
        </div>
    </div>
</div>
