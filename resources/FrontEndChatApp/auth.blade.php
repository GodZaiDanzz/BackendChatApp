<!DOCTYPE html>
<html lang="id" data-theme="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#0d111d">
    <meta name="description" content="Masuk atau Daftar Akun ZChat - Aplikasi Pesan Instan Modern Real-time">
    <title>ZChat - Login to system</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='12' fill='%237c3aed'/%3E%3Cpath d='M7.9 20A9 9 0 1 0 4 16.1L2 22Z' fill='%23ffffff' stroke='%23ffffff' stroke-width='1.2' stroke-linejoin='round'/%3E%3Cpath d='M8 8.5H16L8 15.5H16' stroke='%237c3aed' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E">

    {{-- Google Fonts: Plus Jakarta Sans --}}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    {{-- Dedicated Auth Stylesheet --}}
    <link rel="stylesheet" href="/chat-assets/css/auth.css?v={{ time() }}">

    {{-- Quick Auth Redirect if already logged in --}}
    <script>
        (function() {
            try {
                if (localStorage.getItem('zchat_token')) {
                    window.location.replace('/');
                }
            } catch (e) {}
        })();
    </script>
</head>
<body>
    <div class="auth-page-viewport">
        <main class="auth-split-card" role="main">
            {{-- Left Column: Form Controls Area --}}
            <section class="auth-form-column" aria-labelledby="authMainTitle">
                {{-- Back Button --}}
                <a href="/" class="auth-back-btn" title="Kembali ke Beranda" aria-label="Kembali ke Beranda">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </a>

                {{-- Header Titles --}}
                <h1 id="authMainTitle" class="auth-title-heading">Login to system</h1>
                <p id="authSubtitle" class="auth-subtitle-text">
                    Please enter your login information or
                    <button type="button" class="auth-switch-link" onclick="setAuthMode('register')">click here to registration</button>
                </p>

                {{-- 1. Login Form --}}
                <form id="loginForm" onsubmit="submitLogin(event)">
                    <div class="auth-input-group">
                        <label for="loginUsername" class="auth-input-label">Username</label>
                        <input
                            id="loginUsername"
                            type="text"
                            class="auth-text-input"
                            required
                            autocomplete="username"
                            placeholder="username or email"
                        >
                    </div>

                    <div class="auth-input-group">
                        <label for="loginPassword" class="auth-input-label">Password</label>
                        <input
                            id="loginPassword"
                            type="password"
                            class="auth-text-input"
                            required
                            autocomplete="current-password"
                            placeholder="password"
                        >
                    </div>

                    <div class="auth-remember-row">
                        <label class="auth-checkbox-label">
                            <input id="rememberMe" type="checkbox" class="auth-checkbox-input" checked>
                            <span>Remember me</span>
                        </label>
                    </div>

                    <button type="submit" id="loginBtn" class="auth-submit-btn">
                        Log In
                    </button>
                </form>

                {{-- 2. Register Form --}}
                <form id="registerForm" onsubmit="submitRegister(event)" style="display: none;">
                    <div class="auth-input-group">
                        <label for="regDisplayName" class="auth-input-label">Nama Lengkap</label>
                        <input
                            id="regDisplayName"
                            type="text"
                            class="auth-text-input"
                            required
                            placeholder="Nama Lengkap / Tampilan"
                        >
                    </div>

                    <div class="auth-input-group">
                        <label for="regUsername" class="auth-input-label">Username</label>
                        <input
                            id="regUsername"
                            type="text"
                            class="auth-text-input"
                            required
                            placeholder="@username (3-30 karakter)"
                        >
                        <span class="auth-input-helper">Hanya huruf, angka, strip (-), dan garis bawah (_).</span>
                    </div>

                    <div class="auth-input-group">
                        <label for="regEmail" class="auth-input-label">Email Gmail</label>
                        <input
                            id="regEmail"
                            type="email"
                            class="auth-text-input"
                            required
                            placeholder="akunanda@gmail.com"
                        >
                        <span class="auth-input-helper">Kode OTP 6 digit akan dikirim ke email ini.</span>
                    </div>

                    <div class="auth-input-group">
                        <label for="regPassword" class="auth-input-label">Password</label>
                        <input
                            id="regPassword"
                            type="password"
                            class="auth-text-input"
                            required
                            minlength="8"
                            placeholder="Minimal 8 karakter"
                        >
                    </div>

                    <button type="submit" id="registerBtn" class="auth-submit-btn">
                        Lanjut & Kirim Kode OTP
                    </button>
                </form>

                {{-- 3. OTP Verification Form --}}
                <form id="otpForm" onsubmit="submitOtp(event)" style="display: none;">
                    <div class="auth-otp-card">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                            <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                        </svg>
                        <div>
                            <div>Kode 6 digit telah dikirim ke:</div>
                            <strong id="otpDisplayEmail" style="color: #ffffff;">email@gmail.com</strong>
                        </div>
                    </div>

                    <div class="auth-input-group">
                        <label for="otpCodeInput" class="auth-input-label" style="text-align: center;">Masukkan 6 Digit Kode OTP</label>
                        <input
                            id="otpCodeInput"
                            type="text"
                            class="auth-text-input auth-otp-input"
                            inputmode="numeric"
                            pattern="[0-9]*"
                            maxlength="6"
                            placeholder="••••••"
                            required
                            autocomplete="one-time-code"
                        >
                        <span class="auth-input-helper" style="text-align: center;">Periksa kotak masuk (Inbox) atau folder Spam di Gmail Anda.</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; font-size: 0.85rem; color: #94a3b8;">
                        <span>Belum menerima kode?</span>
                        <button type="button" id="btnResendOtp" class="auth-switch-link" onclick="submitResendOtp()" disabled>
                            Kirim Ulang (<span id="otpCountdownTimer">60</span>s)
                        </button>
                    </div>

                    <button type="submit" id="verifyOtpBtn" class="auth-submit-btn">
                        Verifikasi & Masuk
                    </button>

                    <div style="text-align: center; margin-top: 1rem;">
                        <button type="button" class="auth-switch-link" onclick="setAuthMode('register')" style="font-size: 0.85rem; color: #94a3b8; text-decoration: none;">
                            ← Ubah Alamat Email
                        </button>
                    </div>
                </form>
            </section>

            {{-- Right Column: Fluid Waves Art & Animated Logo Showcase --}}
            <section class="auth-showcase-column" aria-label="Branding ZChat">
                {{-- Ambient Fluid Wave Canvas --}}
                <div class="auth-fluid-canvas" aria-hidden="true">
                    <div class="auth-wave-layer-1"></div>
                    <div class="auth-wave-layer-2"></div>
                    <div class="auth-wave-ribbon"></div>
                </div>

                {{-- Center Content Box --}}
                <div class="auth-showcase-content">
                    {{-- Animated Logo Stage --}}
                    <div class="auth-logo-stage" aria-label="Logo ZChat">
                        <div class="auth-logo-ripple"></div>
                        <div class="auth-logo-ripple"></div>
                        <div class="auth-logo-glow"></div>

                        <div class="auth-logo-badge">
                            <svg class="auth-logo-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path class="auth-logo-bubble" d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" fill="#ffffff" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>
                                <path class="auth-logo-z-stroke" d="M8 8.5H16L8 15.5H16" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </div>

                    {{-- Branding Typography --}}
                    <h2 class="auth-brand-name">ZChat</h2>
                    <p class="auth-brand-tagline">Fast, Secure & Seamless Real-Time Messaging</p>

                    {{-- Feature Badges --}}
                    <div class="auth-feature-pills">
                        <span class="auth-pill-item">🔒 End-to-End Encrypted</span>
                        <span class="auth-pill-item">⚡ Instant WebSockets</span>
                        <span class="auth-pill-item">🎙️ Voice Channels</span>
                    </div>
                </div>
            </section>
        </main>
    </div>

    {{-- Toast Notification --}}
    <div id="authToast" class="auth-toast-alert" role="status" aria-live="polite"></div>

    {{-- Authentication Logic Script --}}
    <script>
        let currentAuthMode = 'login';
        let pendingOtpEmail = '';
        let otpCountdownTimer = null;

        function showToast(message, type = 'info') {
            const toast = document.getElementById('authToast');
            if (!toast) return;
            toast.textContent = message;
            toast.className = `auth-toast-alert show ${type}`;
            clearTimeout(toast._timeout);
            toast._timeout = setTimeout(() => {
                toast.classList.remove('show');
            }, 3500);
        }

        function setAuthMode(mode) {
            currentAuthMode = mode;
            clearInterval(otpCountdownTimer);

            const title = document.getElementById('authMainTitle');
            const subtitle = document.getElementById('authSubtitle');
            const formLogin = document.getElementById('loginForm');
            const formReg = document.getElementById('registerForm');
            const formOtp = document.getElementById('otpForm');

            if (mode === 'login') {
                title.textContent = 'Login to system';
                subtitle.innerHTML = 'Please enter your login information or <button type="button" class="auth-switch-link" onclick="setAuthMode(\'register\')">click here to registration</button>';
                formLogin.style.display = 'block';
                formReg.style.display = 'none';
                formOtp.style.display = 'none';
                document.title = 'ZChat - Login to system';
            } else if (mode === 'register') {
                title.textContent = 'Create an account';
                subtitle.innerHTML = 'Already have an account? <button type="button" class="auth-switch-link" onclick="setAuthMode(\'login\')">click here to login</button>';
                formLogin.style.display = 'none';
                formReg.style.display = 'block';
                formOtp.style.display = 'none';
                document.title = 'ZChat - Create an account';
            } else if (mode === 'otp') {
                title.textContent = 'Verifikasi Email OTP';
                subtitle.textContent = 'Langkah 2: Masukkan kode 6 digit yang kami kirimkan ke email Anda.';
                formLogin.style.display = 'none';
                formReg.style.display = 'none';
                formOtp.style.display = 'block';
                document.title = 'ZChat - Verifikasi OTP';
            }
        }

        function startOtpCountdown(seconds = 60) {
            const btn = document.getElementById('btnResendOtp');
            if (!btn) return;
            clearInterval(otpCountdownTimer);
            let timeLeft = seconds;
            btn.disabled = true;
            btn.innerHTML = `Kirim Ulang (<span id="otpCountdownTimer">${timeLeft}</span>s)`;

            otpCountdownTimer = setInterval(() => {
                timeLeft--;
                const span = document.getElementById('otpCountdownTimer');
                if (timeLeft <= 0) {
                    clearInterval(otpCountdownTimer);
                    btn.disabled = false;
                    btn.textContent = 'Kirim Ulang Kode';
                } else if (span) {
                    span.textContent = timeLeft;
                }
            }, 1000);
        }

        async function submitLogin(e) {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;
            const btn = document.getElementById('loginBtn');

            if (!username || !password) return;
            btn.disabled = true;
            btn.textContent = 'Memproses...';

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.message || 'Login gagal. Periksa username dan password.');
                }

                if (data.status === 'unverified') {
                    showToast(data.message || 'Email belum diverifikasi. Silakan masukkan kode OTP.', 'info');
                    pendingOtpEmail = data.email || username;
                    document.getElementById('otpDisplayEmail').textContent = pendingOtpEmail;
                    setAuthMode('otp');
                    startOtpCountdown(60);
                    return;
                }

                localStorage.setItem('zchat_token', data.token);
                localStorage.setItem('zchat_user', JSON.stringify(data.user));
                showToast(`Selamat datang, ${data.user.display_name}!`, 'success');
                setTimeout(() => {
                    window.location.replace('/');
                }, 400);
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Log In';
            }
        }

        async function submitRegister(e) {
            e.preventDefault();
            const displayName = document.getElementById('regDisplayName').value.trim();
            const username = document.getElementById('regUsername').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const password = document.getElementById('regPassword').value;
            const btn = document.getElementById('registerBtn');

            if (!displayName || !username || !email || !password) {
                showToast('Semua kolom pendaftaran wajib diisi.', 'error');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Mengirim kode OTP...';

            try {
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ display_name: displayName, username, email, password })
                });

                const data = await res.json();
                if (!res.ok) {
                    const firstErr = data.errors ? Object.values(data.errors)[0][0] : data.message;
                    throw new Error(firstErr || 'Pendaftaran gagal.');
                }

                pendingOtpEmail = data.email || email;
                document.getElementById('otpDisplayEmail').textContent = pendingOtpEmail;
                showToast(data.message || 'Kode OTP telah dikirimkan ke Gmail Anda.', 'success');
                setAuthMode('otp');
                startOtpCountdown(60);
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Lanjut & Kirim Kode OTP';
            }
        }

        async function submitOtp(e) {
            e.preventDefault();
            const otp = document.getElementById('otpCodeInput').value.trim();
            const btn = document.getElementById('verifyOtpBtn');

            if (!otp || otp.length !== 6) {
                showToast('Masukkan 6 digit kode OTP yang valid.', 'error');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Memverifikasi...';

            try {
                const res = await fetch('/api/verify-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ email: pendingOtpEmail, otp })
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.message || 'Kode OTP salah atau kedaluwarsa.');
                }

                localStorage.setItem('zchat_token', data.token);
                localStorage.setItem('zchat_user', JSON.stringify(data.user));
                showToast('Verifikasi berhasil! Mengalihkan...', 'success');
                setTimeout(() => {
                    window.location.replace('/');
                }, 400);
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Verifikasi & Masuk';
            }
        }

        async function submitResendOtp() {
            if (!pendingOtpEmail) return;
            const btn = document.getElementById('btnResendOtp');
            if (btn) btn.disabled = true;

            try {
                const res = await fetch('/api/resend-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ email: pendingOtpEmail })
                });
                const data = await res.json();
                showToast(data.message || 'Kode OTP baru telah dikirimkan.', 'info');
                startOtpCountdown(60);
            } catch (err) {
                showToast(err.message || 'Gagal mengirim ulang kode.', 'error');
                if (btn) btn.disabled = false;
            }
        }

        // Initialize based on URL hash or path
        document.addEventListener('DOMContentLoaded', () => {
            if (window.location.pathname.includes('/register') || window.location.hash === '#register') {
                setAuthMode('register');
            } else {
                setAuthMode('login');
            }
        });
    </script>
</body>
</html>
