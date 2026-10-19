{{-- Create Group Poll Modal --}}
<div id="createPollModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="createPollModalTitle" onclick="if(event.target === this) closeCreatePollModal()">
    <div class="modal-card poll-modal-card">
        <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-primary);">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                <h2 id="createPollModalTitle" class="modal-title">Buat Polling Grup</h2>
            </div>
            <button type="button" class="btn-icon" onclick="closeCreatePollModal()" aria-label="Tutup modal polling" title="Tutup">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <form id="createPollForm" onsubmit="event.preventDefault(); submitCreatePoll();" class="modal-body" style="display: flex; flex-direction: column; gap: 1rem; overflow-y: auto; max-height: 70vh; padding: 1.25rem;">
            {{-- Pertanyaan --}}
            <div class="form-group" style="margin-bottom: 0;">
                <label for="pollQuestionInput" class="form-label" style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.35rem; display: block;">
                    Pertanyaan Polling <span style="color: #ef4444;">*</span>
                </label>
                <input
                    type="text"
                    id="pollQuestionInput"
                    name="question"
                    class="form-input"
                    placeholder="Misal: Kapan jadwal rapat PKL berikutnya?"
                    maxlength="255"
                    required
                    style="width: 100%;"
                >
            </div>

            {{-- Opsi Pilihan --}}
            <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.35rem; display: flex; align-items: center; justify-content: space-between;">
                    <span>Opsi Pilihan (Minimal 2) <span style="color: #ef4444;">*</span></span>
                    <span id="pollOptionCountLabel" style="font-size: 0.75rem; color: var(--text-muted); font-weight: 400;">2/6 Opsi</span>
                </label>
                <div id="pollOptionsContainer" style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <div class="poll-option-row">
                        <span class="poll-option-number">1</span>
                        <input type="text" class="form-input poll-opt-input" placeholder="Opsi 1" required maxlength="200" style="flex: 1;">
                    </div>
                    <div class="poll-option-row">
                        <span class="poll-option-number">2</span>
                        <input type="text" class="form-input poll-opt-input" placeholder="Opsi 2" required maxlength="200" style="flex: 1;">
                    </div>
                </div>
                <button type="button" id="btnAddPollOption" class="btn-secondary" onclick="addPollOptionRow()" style="margin-top: 0.5rem; width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.35rem; padding: 0.5rem; font-size: 0.8125rem;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>Tambah Opsi Lain</span>
                </button>
            </div>

            {{-- Pengaturan Polling --}}
            <div style="background: var(--bg-surface-elevated, rgba(255,255,255,0.03)); border: 1px solid var(--border-subtle, rgba(255,255,255,0.08)); border-radius: 8px; padding: 0.75rem 0.85rem;">
                <label style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer; user-select: none;">
                    <input type="checkbox" id="pollMultipleAnswers" name="multiple_answers" style="width: 16px; height: 16px; accent-color: var(--accent-primary);">
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-size: 0.825rem; font-weight: 600; color: var(--text-primary);">Izinkan memilih lebih dari satu jawaban</span>
                        <span style="font-size: 0.725rem; color: var(--text-muted);">Anggota dapat memilih beberapa opsi sekaligus</span>
                    </div>
                </label>
            </div>

            <div class="modal-footer" style="padding: 0; margin-top: 0.5rem; border: none; display: flex; justify-content: flex-end; gap: 0.5rem;">
                <button type="button" class="btn-secondary" onclick="closeCreatePollModal()">Batal</button>
                <button type="submit" id="btnSubmitCreatePoll" class="btn-primary" style="display: inline-flex; align-items: center; gap: 0.4rem;">
                    <span>Kirim Polling</span>
                </button>
            </div>
        </form>
    </div>
</div>
