{{-- Auth Modal (Login, Register & Email OTP Verification) --}}
<div id="authModal" class="modal-overlay active" role="dialog" aria-modal="true" aria-labelledby="authTitle">
    <div class="modal-card">
        <div class="modal-header">
            <div>
                <h2 id="authTitle" class="modal-title">Masuk ke ZChat</h2>
                <p id="authSubtitle" class="modal-subtitle">Aplikasi pesan instan aman & real-time</p>
            </div>
        </div>

        {{-- Switch Tab Auth (Login / Register) --}}
        <div id="authTabContainer" class="auth-tabs">
            <button id="authTabLogin" type="button" class="tab-btn active" onclick="switchAuthTab('login')">
                Masuk
            </button>
            <button id="authTabRegister" type="button" class="tab-btn" onclick="switchAuthTab('register')">
                Daftar Akun Baru
            </button>
        </div>

        {{-- Form Login --}}
        <form id="loginForm" onsubmit="handleLoginSubmit(event)" style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="form-group">
                <label for="loginUsername" class="form-label">Username atau Email</label>
                <input id="loginUsername" type="text" class="form-input" required autocomplete="username" placeholder="nama@gmail.com atau @username">
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
        <form id="registerForm" onsubmit="handleRegisterSubmit(event)" style="display: none; flex-direction: column; gap: 0.85rem;">
            <div class="form-group">
                <label for="regDisplayName" class="form-label">Nama Lengkap / Tampilan</label>
                <input id="regDisplayName" type="text" class="form-input" required placeholder="Contoh: Muhammad Zaidan">
            </div>

            <div class="form-group">
                <label for="regUsername" class="form-label">Username</label>
                <input id="regUsername" type="text" class="form-input" required placeholder="Contoh: zaidan_99 (3-30 karakter)">
                <span class="form-helper">Hanya huruf, angka, strip (-), dan garis bawah (_).</span>
            </div>

            <div class="form-group">
                <label for="regEmail" class="form-label">Alamat Email Google (Gmail)</label>
                <input id="regEmail" type="email" class="form-input" required placeholder="akunanda@gmail.com">
                <span class="form-helper">Kode OTP 6 digit akan dikirimkan ke email ini untuk aktivasi.</span>
            </div>

            <div class="form-group">
                <label for="regPassword" class="form-label">Password</label>
                <input id="regPassword" type="password" class="form-input" required minlength="8" placeholder="Minimal 8 karakter">
            </div>

            <button type="submit" id="registerBtn" class="btn-submit">
                Lanjut & Kirim Kode Verifikasi
            </button>
        </form>

        {{-- Form Verifikasi OTP Email --}}
        <form id="otpForm" onsubmit="handleOtpSubmit(event)" style="display: none; flex-direction: column; gap: 1.15rem;">
            <div class="otp-info-card">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                </svg>
                <div>
                    <div>Kode 6 digit telah dikirimkan ke:</div>
                    <strong id="otpDisplayEmail">email@gmail.com</strong>
                </div>
            </div>

            <div class="form-group">
                <label for="otpCodeInput" class="form-label" style="text-align: center;">Masukkan 6 Digit Kode OTP</label>
                <input
                    id="otpCodeInput"
                    type="text"
                    class="form-input otp-code-input"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    maxlength="6"
                    placeholder="••••••"
                    required
                    autocomplete="one-time-code"
                >
                <span class="form-helper" style="text-align: center;">Periksa kotak masuk (Inbox) atau folder Spam di Gmail Anda.</span>
            </div>

            <div class="otp-resend-row">
                <span>Belum menerima kode?</span>
                <button type="button" id="btnResendOtp" class="btn-resend-link" onclick="handleResendOtp()" disabled>
                    Kirim Ulang (<span id="otpCountdownTimer">60</span>s)
                </button>
            </div>

            <button type="submit" id="verifyOtpBtn" class="btn-submit">
                Verifikasi & Mulai Mengobrol
            </button>

            <button type="button" class="btn-back-text" onclick="backToRegister()">
                ← Ubah Alamat Email
            </button>
        </form>
    </div>
</div>
