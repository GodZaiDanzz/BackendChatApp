{{-- Add Friend Modal --}}
<div id="addFriendModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="addFriendTitle">
    <div class="modal-card">
        <div class="modal-header">
            <h2 id="addFriendTitle" class="modal-title">Cari & Tambah Teman</h2>
            <button type="button" class="btn-icon" onclick="closeAddFriendModal()" aria-label="Tutup modal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="6"></line>
                </svg>
            </button>
        </div>

        <div class="form-group">
            <label for="searchUserInput" class="form-label">Cari Pengguna</label>
            <div style="display: flex; gap: 0.5rem;">
                <input id="searchUserInput" type="text" class="form-input" placeholder="Ketik nama atau @username" onkeyup="if(event.key==='Enter') executeUserSearch()">
                <button type="button" class="btn-action-primary" style="padding: 0.6rem 1rem;" onclick="executeUserSearch()">
                    Cari
                </button>
            </div>
            <span class="form-helper">Hasil pencarian tidak menyertakan akun Anda sendiri.</span>
        </div>

        {{-- Search Results Container --}}
        <div id="searchResultsList" style="max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem;">
            <div class="empty-state" style="padding: 1.5rem 0;">
                <p class="empty-state-desc">Masukkan nama atau username untuk menemukan teman baru.</p>
            </div>
        </div>
    </div>
</div>
