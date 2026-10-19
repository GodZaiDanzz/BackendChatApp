{{-- Forward Message Modal Component --}}
<div id="forwardMessageModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="forwardModalTitle" onclick="if(event.target === this) closeForwardModal()">
    <div class="modal-card forward-modal-card">
        <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-primary);">
                    <polyline points="15 14 20 9 15 4"></polyline>
                    <path d="M4 20v-7a4 4 0 0 1 4-4h12"></path>
                </svg>
                <h2 id="forwardModalTitle" class="modal-title">Teruskan Pesan</h2>
            </div>
            <button type="button" class="btn-icon" onclick="closeForwardModal()" aria-label="Tutup modal teruskan pesan" title="Tutup">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <div class="modal-body" style="padding: 1.15rem; display: flex; flex-direction: column; gap: 0.85rem; overflow: hidden;">
            {{-- Preview Pesan yang Diteruskan --}}
            <div id="forwardMessagePreview" class="forward-preview-box">
                <span class="forward-preview-tag">Pratinjau Pesan:</span>
                <p id="forwardPreviewText" class="forward-preview-content">-</p>
            </div>

            {{-- Kolom Cari Penerima --}}
            <div class="search-input-wrapper" style="width: 100%;">
                <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                    type="text"
                    id="forwardSearchInput"
                    class="form-input search-input"
                    placeholder="Cari kontak atau grup tujuan..."
                    oninput="handleForwardSearchInput(event)"
                    style="width: 100%; padding-left: 2.2rem;"
                >
            </div>

            {{-- Daftar Kontak & Grup Penerima --}}
            <div id="forwardRecipientsList" class="forward-recipients-scroll">
                {{-- Populated dynamically --}}
            </div>
        </div>

        <div class="modal-footer" style="padding: 0.85rem 1.25rem; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-subtle, rgba(255,255,255,0.08));">
            <span id="forwardSelectedCountLabel" style="font-size: 0.78rem; color: var(--text-muted); font-weight: 500;">0 dipilih</span>
            <div style="display: flex; gap: 0.5rem;">
                <button type="button" class="btn-secondary" onclick="closeForwardModal()">Batal</button>
                <button type="button" id="btnSubmitForward" class="btn-primary" onclick="submitForwardMessage()" disabled style="display: inline-flex; align-items: center; gap: 0.35rem;">
                    <span>Kirim</span>
                </button>
            </div>
        </div>
    </div>
</div>
