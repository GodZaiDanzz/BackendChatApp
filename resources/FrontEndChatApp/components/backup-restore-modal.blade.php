{{-- Modal Cadangan & Pemulihan Obrolan (Encrypted Backup & Restore) --}}
<div id="backupRestoreModal" class="modal-overlay" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="backupModalTitle">
    <div class="modal-card" style="max-width: 480px;">
        <div class="modal-header">
            <div>
                <h3 id="backupModalTitle" class="modal-title">Cadangan & Pemulihan Chat</h3>
                <p class="modal-subtitle">Amankan riwayat chat lokal Anda agar tidak hilang saat berganti perangkat</p>
            </div>
            <button type="button" class="btn-icon" onclick="closeBackupRestoreModal()" aria-label="Tutup modal cadangan">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        {{-- Tab Switcher --}}
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem;">
            <button type="button" id="tabBackupExport" class="btn-action-primary" style="flex: 1; padding: 0.5rem 0.75rem; font-size: 0.85rem;" onclick="switchBackupTab('export')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>Cadangkan (Ekspor)</span>
            </button>
            <button type="button" id="tabBackupImport" class="btn-outline-action" style="flex: 1; padding: 0.5rem 0.75rem; font-size: 0.85rem;" onclick="switchBackupTab('import')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <span>Pulihkan (Impor)</span>
            </button>
        </div>

        {{-- 1. Panel Ekspor / Cadangkan --}}
        <div id="backupExportPanel" style="display: flex; flex-direction: column; gap: 1rem;">
            <div style="padding: 0.85rem 1rem; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-card);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <span style="font-size: 0.8rem; color: var(--text-muted);">Penyimpanan Klien Saat Ini</span>
                    <span id="backupStatsBadge" style="font-size: 0.75rem; color: #a78bfa; font-weight: 600; background: rgba(124, 58, 237, 0.12); padding: 0.2rem 0.5rem; border-radius: 999px;">IndexedDB</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                    <div>
                        <div id="backupTotalMessages" style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">0</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Total Pesan</div>
                    </div>
                    <div>
                        <div id="backupTotalChats" style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">0</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Obrolan Tersimpan</div>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label" for="backupExportPassword" style="display: flex; justify-content: space-between; align-items: center;">
                    <span>Kata Sandi Enkripsi (Opsional)</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted);">AES-256-GCM</span>
                </label>
                <input
                    type="password"
                    id="backupExportPassword"
                    class="form-input"
                    placeholder="Masukkan sandi untuk mengunci cadangan..."
                    autocomplete="new-password"
                >
                <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 4px;">
                    Jika diisi, berkas cadangan akan dienkripsi dengan standar AES-GCM dan hanya bisa dibuka dengan sandi ini.
                </div>
            </div>

            <button type="button" class="btn-action-primary" onclick="handleExportBackup()" style="width: 100%; padding: 0.75rem; font-size: 0.9rem; justify-content: center;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>Unduh Berkas Cadangan (.zchat)</span>
            </button>
        </div>

        {{-- 2. Panel Impor / Pulihkan --}}
        <div id="backupImportPanel" style="display: none; flex-direction: column; gap: 1rem;">
            <div style="padding: 1.25rem; border: 2px dashed var(--border-card); border-radius: var(--radius-md); text-align: center; cursor: pointer; background: var(--bg-surface-elevated); transition: all 0.2s ease;" onclick="document.getElementById('backupFileInput').click()">
                <input type="file" id="backupFileInput" accept=".zchat,.json" style="display: none;" onchange="handleBackupFileSelected(event)">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 0.5rem;">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <div id="backupFileSelectedName" style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary);">Pilih Berkas Cadangan</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 3px;">Klik untuk memilih berkas (.zchat atau .json)</div>
            </div>

            <div id="backupImportPasswordGroup" class="form-group" style="display: none;">
                <label class="form-label" for="backupImportPassword">Kata Sandi Berkas Cadangan</label>
                <input
                    type="password"
                    id="backupImportPassword"
                    class="form-input"
                    placeholder="Masukkan sandi saat berkas dicadangkan..."
                >
            </div>

            <button type="button" id="btnRunRestoreBackup" class="btn-action-primary" onclick="handleImportBackup()" disabled style="width: 100%; padding: 0.75rem; font-size: 0.9rem; justify-content: center; opacity: 0.5; cursor: not-allowed;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Pulihkan Riwayat Chat Sekarang</span>
            </button>
        </div>
    </div>
</div>
