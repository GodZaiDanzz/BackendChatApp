{{-- Add Friend Modal --}}
<div id="addFriendModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="addFriendTitle">
    <div class="modal-card">
        <div class="modal-header">
            <div>
                <h2 id="addFriendTitle" class="modal-title">Cari & Tambah Teman</h2>
                <p class="modal-subtitle">Temukan teman berdasarkan nama tampilan atau @username</p>
            </div>
            <button type="button" class="btn-icon" onclick="closeAddFriendModal()" aria-label="Tutup modal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <div class="form-group">
            <label for="searchUserInput" class="form-label">Cari Pengguna</label>
            <div class="search-input-action-row">
                <div class="search-input-icon-wrap">
                    <svg class="search-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input id="searchUserInput" type="text" class="form-input search-input-with-icon" placeholder="Ketik nama atau @username..." onkeyup="if(event.key==='Enter') executeUserSearch()">
                </div>
                <button type="button" class="btn-action-primary" onclick="executeUserSearch()">
                    Cari
                </button>
            </div>
            <span class="form-helper">Pencarian tidak menyertakan akun Anda sendiri.</span>
        </div>

        {{-- Search Results Container --}}
        <div id="searchResultsList" class="search-results-list">
            <div class="empty-state" style="padding: 1.5rem 0;">
                <div class="empty-state-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
                <p class="empty-state-desc">Masukkan nama atau username untuk menemukan teman baru.</p>
            </div>
        </div>
    </div>
</div>
