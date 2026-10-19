{{-- Create Group Poll Modal --}}
<div id="createPollModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="createPollModalTitle" onclick="if(event.target === this) closeCreatePollModal()">
    <div class="modal-card poll-modal-card">
        <div class="modal-header">
            <div>
                <h2 id="createPollModalTitle" class="modal-title">Buat Polling Grup</h2>
                <p class="modal-subtitle">Ajukan pertanyaan dan dapatkan pilihan suara dari anggota grup</p>
            </div>
            <button type="button" class="btn-icon" onclick="closeCreatePollModal()" aria-label="Tutup modal polling" title="Tutup">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <form id="createPollForm" onsubmit="event.preventDefault(); submitCreatePoll();" class="modal-form-stack">
            {{-- Pertanyaan --}}
            <div class="form-group">
                <label for="pollQuestionInput" class="form-label">
                    Pertanyaan Polling <span style="color: #ef4444;">*</span>
                </label>
                <input
                    type="text"
                    id="pollQuestionInput"
                    name="question"
                    class="form-input"
                    placeholder="Contoh: Kapan jadwal rapat berikutnya?"
                    maxlength="255"
                    required
                >
            </div>

            {{-- Opsi Pilihan --}}
            <div class="form-group">
                <div class="member-header-row">
                    <label class="form-label mb-0">
                        Opsi Pilihan (Minimal 2) <span style="color: #ef4444;">*</span>
                    </label>
                    <span id="pollOptionCountLabel" class="selected-counter-badge">2/6 Opsi</span>
                </div>
                <div id="pollOptionsContainer" class="poll-options-inputs-stack">
                    <div class="poll-option-row">
                        <span class="poll-option-number">1</span>
                        <input type="text" class="form-input poll-opt-input" placeholder="Opsi 1" required maxlength="200">
                    </div>
                    <div class="poll-option-row">
                        <span class="poll-option-number">2</span>
                        <input type="text" class="form-input poll-opt-input" placeholder="Opsi 2" required maxlength="200">
                    </div>
                </div>
                <button type="button" id="btnAddPollOption" class="btn-outline-action btn-add-poll-opt" onclick="addPollOptionRow()">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>Tambah Opsi Pilihan</span>
                </button>
            </div>

            {{-- Pengaturan Polling --}}
            <div class="poll-setting-card">
                <label class="poll-checkbox-label">
                    <input type="checkbox" id="pollMultipleAnswers" name="multiple_answers" class="poll-setting-checkbox">
                    <div class="poll-setting-texts">
                        <span class="poll-setting-title">Izinkan memilih lebih dari satu jawaban</span>
                        <span class="poll-setting-desc">Anggota dapat memberikan suara pada beberapa opsi sekaligus</span>
                    </div>
                </label>
            </div>

            <div class="modal-footer-row">
                <button type="button" class="btn-outline-action" onclick="closeCreatePollModal()">
                    Batal
                </button>
                <button type="submit" id="btnSubmitCreatePoll" class="btn-action-primary">
                    <span>Kirim Polling</span>
                </button>
            </div>
        </form>
    </div>
</div>
