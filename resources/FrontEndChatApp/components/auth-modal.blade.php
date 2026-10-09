{{-- Auth Modal (Login & Register) --}}
<div id="authModal" class="modal-overlay active" role="dialog" aria-modal="true" aria-labelledby="authTitle">
    <div class="modal-card">
        <div class="modal-header">
            <h2 id="authTitle" class="modal-title">Masuk ke ZChat</h2>
        </div>

        {{-- Switch Tab Auth --}}
        <div style="display: flex; gap: 0.5rem; background: var(--bg-input); padding: 0.25rem; border-radius: var(--radius-md);">
            <button id="authTabLogin" type="button" class="tab-btn active" style="border-radius: var(--radius-sm); border: none; padding: 0.5rem;" onclick="switchAuthTab('login')">
                Masuk
            </button>
            <button id="authTabRegister" type="button" class="tab-btn" style="border-radius: var(--radius-sm); border: none; padding: 0.5rem;" onclick="switchAuthTab('register')">
                Daftar Akun Baru
            </button>
        </div>

        {{-- Form Login --}}
        <form id="loginForm" onsubmit="handleLoginSubmit(event)" style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="form-group">
                <label for="loginUsername" class="form-label">Username</label>
                <input id="loginUsername" type="text" class="form-input" required autocomplete="username" placeholder="Masukkan username">
            </div>

            <div class="form-group">
                <label for="loginPassword" class="form-label">Password</label>
                <input id="loginPassword" type="password" class="form-input" required autocomplete="current-password" placeholder="Masukkan password">
            </div>

            <button type="submit" id="loginBtn" class="btn-submit">
                Masuk ke Akun
            </button>
        </form>

        {{-- Form Register --}}
        <form id="registerForm" onsubmit="handleRegisterSubmit(event)" style="display: none; flex-direction: column; gap: 0.875rem;">
            <div class="form-group">
                <label for="regUsername" class="form-label">Username</label>
                <input id="regUsername" type="text" class="form-input" required placeholder="Contoh: zaidan_99 (3-30 karakter)">
                <span class="form-helper">Hanya huruf, angka, dash, dan underscore.</span>
            </div>

            <div class="form-group">
                <label for="regDisplayName" class="form-label">Nama Tampilan</label>
                <input id="regDisplayName" type="text" class="form-input" required placeholder="Nama lengkap atau panggilan">
            </div>

            <div class="form-group">
                <label for="regPassword" class="form-label">Password</label>
                <input id="regPassword" type="password" class="form-input" required minlength="8" placeholder="Minimal 8 karakter">
            </div>

            <div class="form-group">
                <label for="regInviteCode" class="form-label">Kode Undangan Komunitas</label>
                <input id="regInviteCode" type="text" class="form-input" required placeholder="Masukkan kode undangan yang sah">
                <span class="form-helper">Wajib diisi sesuai kode undangan backend yang berlaku.</span>
            </div>

            <button type="submit" id="registerBtn" class="btn-submit">
                Daftar Akun
            </button>
        </form>
    </div>
</div>
