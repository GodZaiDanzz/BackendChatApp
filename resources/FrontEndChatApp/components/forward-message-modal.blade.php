{{-- Forward Message Modal Component --}}
<div id="forwardMessageModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="forwardModalTitle" onclick="if(event.target === this) closeForwardModal()">
    <div class="modal-card forward-modal-card">
        <div class="modal-header">
            <div>
                <h2 id="forwardModalTitle" class="modal-title">Teruskan Pesan</h2>
                <p class="modal-subtitle">Pilih kontak atau grup untuk meneruskan pesan ini</p>
            </div>
            <button type="button" class="btn-icon" onclick="closeForwardModal()" aria-label="Tutup modal teruskan pesan" title="Tutup">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <div class="modal-form-stack">
            {{-- Preview Pesan yang Diteruskan --}}
            <div id="forwardMessagePreview" class="forward-preview-box">
                <span class="forward-preview-tag">Pratinjau Pesan</span>
                <p id="forwardPreviewText" class="forward-preview-content">-</p>
            </div>

            {{-- Kolom Cari Penerima --}}
            <div class="search-input-icon-wrap" style="width: 100%;">
                <svg class="search-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                    type="text"
                    id="forwardSearchInput"
                    class="form-input search-input-with-icon"
                    placeholder="Cari kontak atau grup tujuan..."
                    oninput="handleForwardSearchInput(event)"
                >
            </div>

            {{-- Daftar Kontak & Grup Penerima --}}
            <div id="forwardRecipientsList" class="forward-recipients-scroll member-selection-box">
                {{-- Populated dynamically --}}
            </div>

            <div class="modal-footer-row" style="align-items: center; justify-content: space-between;">
                <span id="forwardSelectedCountLabel" class="selected-counter-badge">0 dipilih</span>
                <div style="display: flex; gap: 0.5rem;">
                    <button type="button" class="btn-outline-action" onclick="closeForwardModal()">Batal</button>
                    <button type="button" id="btnSubmitForward" class="btn-action-primary" onclick="submitForwardMessage()" disabled>
                        <span>Kirim</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
