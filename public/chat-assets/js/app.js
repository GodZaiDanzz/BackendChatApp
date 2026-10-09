/**
 * ZChat Web Application - Frontend Client
 * Modern Vanilla JS implementation connecting to Laravel 12 Backend API & Reverb
 */

(function () {
    'use strict';

    // Application Global State
    const state = {
        token: localStorage.getItem('zchat_token') || null,
        user: JSON.parse(localStorage.getItem('zchat_user') || 'null'),
        contacts: [],
        requests: [],
        chats: JSON.parse(localStorage.getItem('zchat_messages') || '{}'),
        unread: {},
        activeContact: null,
        syncInterval: null,
        heartbeatInterval: null,
        activeTab: 'chats',
        reverbSocket: null,
        editingMessageId: null
    };

    // Helper: Save messages to localStorage for seamless persistence
    function persistMessages() {
        try {
            localStorage.setItem('zchat_messages', JSON.stringify(state.chats));
        } catch (e) {
            console.warn('Gagal menyimpan riwayat pesan ke localStorage:', e);
        }
    }

    // Helper: Format Timestamp
    function formatTime(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Helper: Render SVG Checkmarks (Ceklis 1, Ceklis 2, Ceklis 2 Biru)
    function renderStatusCheck(status) {
        if (status === 'read') {
            // Ceklis 2 Biru (Pesan telah dibaca)
            return `<span class="status-check read" title="Dibaca">
                <svg width="18" height="15" viewBox="0 0 28 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6L7 17l-5-5"></path>
                    <path d="M26 6l-11 11-2-2"></path>
                </svg>
            </span>`;
        } else if (status === 'delivered') {
            // Ceklis 2 Abu-abu (Pesan tersampaikan ke perangkat lawan bicara)
            return `<span class="status-check delivered" title="Tersampaikan">
                <svg width="18" height="15" viewBox="0 0 28 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6L7 17l-5-5"></path>
                    <path d="M26 6l-11 11-2-2"></path>
                </svg>
            </span>`;
        } else {
            // Ceklis 1 Abu-abu (Pesan berhasil terkirim ke server)
            return `<span class="status-check sent" title="Terkirim ke server">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </span>`;
        }
    }

    // Toast Notification System
    window.showToast = function (message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');

        const textSpan = document.createElement('span');
        textSpan.textContent = message;
        toast.appendChild(textSpan);

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.25s ease';
            setTimeout(() => toast.remove(), 250);
        }, 4000);
    };

    // Dynamic API Base URL (auto-detects live production API or relative Laravel /api)
    const API_BASE = (function () {
        if (window.ZCHAT_API_URL) return window.ZCHAT_API_URL;
        if (window.location.protocol === 'file:' || (window.location.port !== '8000' && !window.location.host.includes('ismc.my.id'))) {
            return 'https://api.ismc.my.id/api';
        }
        return '/api';
    })();

    // API Request Wrapper
    async function apiRequest(endpoint, options = {}) {
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(state.token ? { 'Authorization': `Bearer ${state.token}` } : {}),
            ...(options.headers || {})
        };

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers
            });

            if (response.status === 401) {
                // Session expired or invalid
                handleLogout();
                showToast('Sesi telah berakhir. Silakan masuk kembali.', 'error');
                throw new Error('Unauthorized');
            }

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                const message = (data && data.message) || `Error ${response.status}: Permintaan gagal`;
                throw new Error(message);
            }

            return data;
        } catch (error) {
            console.error(`API Error on ${endpoint}:`, error);
            throw error;
        }
    }

    // ==========================================
    // Autentikasi & Inisialisasi
    // ==========================================

    function initAuth() {
        const authModal = document.getElementById('authModal');
        if (!state.token || !state.user) {
            if (authModal) authModal.classList.add('active');
        } else {
            if (authModal) authModal.classList.remove('active');
            updateCurrentUserUI();
            startDataSync();
        }
    }

    function updateCurrentUserUI() {
        if (!state.user) return;
        const nameEl = document.getElementById('myDisplayName');
        const userEl = document.getElementById('myUsername');
        const avatarEl = document.getElementById('myAvatarCircle');

        if (nameEl) nameEl.textContent = state.user.display_name;
        if (userEl) userEl.textContent = `@${state.user.username}`;
        if (avatarEl) avatarEl.textContent = (state.user.display_name || state.user.username).charAt(0).toUpperCase();
    }

    let pendingOtpEmail = '';
    let otpCountdownInterval = null;

    function startOtpCountdown(seconds = 60) {
        const btn = document.getElementById('btnResendOtp');
        if (!btn) return;

        clearInterval(otpCountdownInterval);
        let timeLeft = seconds;
        btn.disabled = true;
        btn.innerHTML = `Kirim Ulang (<span id="otpCountdownTimer">${timeLeft}</span>s)`;

        otpCountdownInterval = setInterval(() => {
            timeLeft--;
            const timerSpan = document.getElementById('otpCountdownTimer');
            if (timeLeft <= 0) {
                clearInterval(otpCountdownInterval);
                btn.disabled = false;
                btn.textContent = 'Kirim Ulang Kode';
            } else if (timerSpan) {
                timerSpan.textContent = timeLeft;
            }
        }, 1000);
    }

    function showOtpStep(email) {
        pendingOtpEmail = email;
        const tabContainer = document.getElementById('authTabContainer');
        const formLogin = document.getElementById('loginForm');
        const formReg = document.getElementById('registerForm');
        const formOtp = document.getElementById('otpForm');
        const title = document.getElementById('authTitle');
        const subtitle = document.getElementById('authSubtitle');
        const emailDisplay = document.getElementById('otpDisplayEmail');
        const otpInput = document.getElementById('otpCodeInput');

        if (tabContainer) tabContainer.style.display = 'none';
        if (formLogin) formLogin.style.display = 'none';
        if (formReg) formReg.style.display = 'none';
        if (formOtp) formOtp.style.display = 'flex';

        if (title) title.textContent = 'Verifikasi Alamat Email';
        if (subtitle) subtitle.textContent = 'Langkah 2 dari 2: Konfirmasi keamanan akun Anda';
        if (emailDisplay) emailDisplay.textContent = email;

        if (otpInput) {
            otpInput.value = '';
            setTimeout(() => otpInput.focus(), 100);
        }

        startOtpCountdown(60);
    }

    window.backToRegister = function () {
        clearInterval(otpCountdownInterval);
        const tabContainer = document.getElementById('authTabContainer');
        const formOtp = document.getElementById('otpForm');
        const subtitle = document.getElementById('authSubtitle');

        if (tabContainer) tabContainer.style.display = 'flex';
        if (formOtp) formOtp.style.display = 'none';
        if (subtitle) subtitle.textContent = 'Aplikasi pesan instan aman & real-time';

        window.switchAuthTab('register');
    };

    window.switchAuthTab = function (tab) {
        clearInterval(otpCountdownInterval);
        const tabContainer = document.getElementById('authTabContainer');
        const tabLogin = document.getElementById('authTabLogin');
        const tabReg = document.getElementById('authTabRegister');
        const formLogin = document.getElementById('loginForm');
        const formReg = document.getElementById('registerForm');
        const formOtp = document.getElementById('otpForm');
        const title = document.getElementById('authTitle');
        const subtitle = document.getElementById('authSubtitle');

        if (tabContainer) tabContainer.style.display = 'flex';
        if (formOtp) formOtp.style.display = 'none';

        if (tab === 'login') {
            if (tabLogin) tabLogin.classList.add('active');
            if (tabReg) tabReg.classList.remove('active');
            if (formLogin) formLogin.style.display = 'flex';
            if (formReg) formReg.style.display = 'none';
            if (title) title.textContent = 'Masuk ke ZChat';
            if (subtitle) subtitle.textContent = 'Aplikasi pesan instan aman & real-time';
        } else {
            if (tabLogin) tabLogin.classList.remove('active');
            if (tabReg) tabReg.classList.add('active');
            if (formLogin) formLogin.style.display = 'none';
            if (formReg) formReg.style.display = 'flex';
            if (title) title.textContent = 'Daftar Akun ZChat';
            if (subtitle) subtitle.textContent = 'Lengkapi formulir untuk membuat akun baru';
        }
    };

    window.handleLoginSubmit = async function (e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const btn = document.getElementById('loginBtn');

        if (!username || !password) return;

        btn.disabled = true;
        btn.textContent = 'Memproses...';

        try {
            const res = await apiRequest('/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            if (res.status === 'unverified') {
                showToast(res.message, 'info');
                showOtpStep(res.email);
                return;
            }

            state.token = res.token;
            state.user = res.user;
            localStorage.setItem('zchat_token', res.token);
            localStorage.setItem('zchat_user', JSON.stringify(res.user));

            document.getElementById('authModal').classList.remove('active');
            updateCurrentUserUI();
            showToast(`Selamat datang kembali, ${res.user.display_name}!`, 'success');
            startDataSync();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Masuk ke Akun';
        }
    };

    window.handleRegisterSubmit = async function (e) {
        e.preventDefault();
        const displayName = document.getElementById('regDisplayName').value.trim();
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const btn = document.getElementById('registerBtn');

        if (!displayName || !username || !email || !password) {
            showToast('Semua kolom formulir pendaftaran wajib diisi.', 'error');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Mengirim kode OTP...';

        try {
            const res = await apiRequest('/register', {
                method: 'POST',
                body: JSON.stringify({
                    display_name: displayName,
                    username,
                    email,
                    password
                })
            });

            if (res.status === 'verification_required') {
                showToast(res.message, 'success');
                showOtpStep(res.email || email);
            } else if (res.token) {
                state.token = res.token;
                state.user = res.user;
                localStorage.setItem('zchat_token', res.token);
                localStorage.setItem('zchat_user', JSON.stringify(res.user));

                document.getElementById('authModal').classList.remove('active');
                updateCurrentUserUI();
                showToast('Akun berhasil dibuat. Selamat datang di ZChat!', 'success');
                startDataSync();
            }
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Lanjut & Kirim Kode Verifikasi';
        }
    };

    window.handleOtpSubmit = async function (e) {
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
            const res = await apiRequest('/verify-otp', {
                method: 'POST',
                body: JSON.stringify({
                    email: pendingOtpEmail,
                    otp
                })
            });

            clearInterval(otpCountdownInterval);
            state.token = res.token;
            state.user = res.user;
            localStorage.setItem('zchat_token', res.token);
            localStorage.setItem('zchat_user', JSON.stringify(res.user));

            document.getElementById('authModal').classList.remove('active');
            updateCurrentUserUI();
            showToast('Akun berhasil diverifikasi! Selamat datang di ZChat.', 'success');
            startDataSync();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Verifikasi & Mulai Mengobrol';
        }
    };

    window.handleResendOtp = async function () {
        if (!pendingOtpEmail) return;
        const btn = document.getElementById('btnResendOtp');
        if (btn) btn.disabled = true;

        try {
            const res = await apiRequest('/resend-otp', {
                method: 'POST',
                body: JSON.stringify({ email: pendingOtpEmail })
            });

            showToast(res.message || 'Kode verifikasi baru telah dikirimkan ke email Anda.', 'info');
            startOtpCountdown(60);
        } catch (err) {
            showToast(err.message, 'error');
            if (btn) btn.disabled = false;
        }
    };

    window.handleLogout = async function () {
        if (state.token) {
            try {
                await apiRequest('/logout', { method: 'POST' }).catch(() => {});
            } catch (e) {}
        }

        if (state.syncInterval) {
            clearInterval(state.syncInterval);
            state.syncInterval = null;
        }

        if (state.heartbeatInterval) {
            clearInterval(state.heartbeatInterval);
            state.heartbeatInterval = null;
        }

        state.token = null;
        state.user = null;
        state.contacts = [];
        state.requests = [];
        state.activeContact = null;

        localStorage.removeItem('zchat_token');
        localStorage.removeItem('zchat_user');

        document.getElementById('noChatSelected').style.display = 'flex';
        document.getElementById('activeChatWindow').style.display = 'none';
        document.getElementById('authModal').classList.add('active');
        showToast('Anda telah keluar dari ZChat.', 'info');
    };

    // ==========================================
    // Sidebar Tabs & Navigasi
    // ==========================================

    window.switchSidebarTab = function (tab) {
        state.activeTab = tab;
        const btnChats = document.getElementById('tabBtnChats');
        const btnContacts = document.getElementById('tabBtnContacts');
        const btnRequests = document.getElementById('tabBtnRequests');

        const panelChats = document.getElementById('panelChats');
        const panelContacts = document.getElementById('panelContacts');
        const panelRequests = document.getElementById('panelRequests');

        [btnChats, btnContacts, btnRequests].forEach(b => b.classList.remove('active'));
        [panelChats, panelContacts, panelRequests].forEach(p => p.style.display = 'none');

        if (tab === 'chats') {
            btnChats.classList.add('active');
            panelChats.style.display = 'block';
            renderChatsList();
        } else if (tab === 'contacts') {
            btnContacts.classList.add('active');
            panelContacts.style.display = 'block';
            renderContactsList();
        } else if (tab === 'requests') {
            btnRequests.classList.add('active');
            panelRequests.style.display = 'block';
            renderRequestsList();
        }
    };

    // ==========================================
    // Kontak & Permintaan Pertemanan
    // ==========================================

    async function fetchContacts() {
        try {
            const data = await apiRequest('/contacts');
            state.contacts = data || [];

            // Sinkronisasi status online kontak yang sedang aktif di chat window
            if (state.activeContact) {
                const freshActive = state.contacts.find(c => c.id === state.activeContact.id);
                if (freshActive) {
                    state.activeContact = freshActive;
                    const isOnline = Boolean(freshActive.is_online);
                    const dot = document.getElementById('activeStatusDot');
                    const statusLabel = document.getElementById('activeUserOnlineStatus');
                    if (dot) {
                        dot.className = `status-indicator-dot ${isOnline ? 'online' : 'offline'}`;
                        dot.title = isOnline ? 'Online' : 'Offline';
                    }
                    if (statusLabel) {
                        statusLabel.className = `user-status-text ${isOnline ? 'online' : 'offline'}`;
                        statusLabel.textContent = isOnline ? 'Online' : 'Offline';
                    }
                }
            }

            updateUnreadBadges();
            renderContactsList();
            renderChatsList();
        } catch (e) {
            console.error('Gagal mengambil daftar kontak:', e);
        }
    }

    async function fetchRequests() {
        try {
            const data = await apiRequest('/contacts/requests');
            const previousCount = state.requests.length;
            state.requests = data || [];

            // Update badge counter permintaan
            const badge = document.getElementById('requestCounterBadge');
            if (badge) {
                if (state.requests.length > 0) {
                    badge.style.display = 'inline-block';
                    badge.textContent = state.requests.length;
                } else {
                    badge.style.display = 'none';
                }
            }

            // Notifikasi jika ada permintaan baru masuk
            if (state.requests.length > previousCount && previousCount > 0) {
                const latest = state.requests[state.requests.length - 1];
                showToast(`Permintaan pertemanan baru dari ${latest.display_name} (@${latest.username})`, 'info');
            }

            renderRequestsList();
        } catch (e) {
            console.error('Gagal mengambil permintaan pertemanan:', e);
        }
    }

    function renderContactsList(filterQuery = '') {
        const container = document.getElementById('contactsContainer');
        if (!container) return;

        const filtered = state.contacts.filter(c => {
            const q = filterQuery.toLowerCase();
            return c.display_name.toLowerCase().includes(q) || c.username.toLowerCase().includes(q);
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p class="empty-state-desc">${filterQuery ? 'Tidak ada kontak yang cocok.' : 'Belum ada teman dalam kontak Anda. Klik tombol "Tambah Teman Baru".'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(contact => {
            const initial = (contact.display_name || contact.username).charAt(0).toUpperCase();
            const isActive = state.activeContact && state.activeContact.id === contact.id ? 'active' : '';
            const isOnline = Boolean(contact.is_online);

            return `
                <div class="list-item ${isActive}" onclick="selectContact(${contact.id})" role="button" tabindex="0">
                    <div class="avatar-container">
                        <div class="avatar-circle">${initial}</div>
                        <span class="status-indicator-dot ${isOnline ? 'online' : 'offline'}" title="${isOnline ? 'Online' : 'Offline'}"></span>
                    </div>
                    <div class="list-item-content">
                        <div class="list-item-header">
                            <span class="list-item-title">${escapeHtml(contact.display_name)}</span>
                            <span class="user-status-text ${isOnline ? 'online' : 'offline'}">${isOnline ? 'Online' : 'Offline'}</span>
                        </div>
                        <div class="list-item-preview">
                            <span>@${escapeHtml(contact.username)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Helper: Hitung pesan yang belum dibaca dari setiap orang (unread count per user)
    function updateUnreadBadges() {
        if (!state.user) return;
        let totalUnread = 0;

        state.contacts.forEach(contact => {
            const msgs = state.chats[contact.id] || [];

            // Jika kontak sedang aktif dibuka di layar, tidak ada unread
            if (state.activeContact && state.activeContact.id === contact.id) {
                state.unread[contact.id] = 0;
            } else {
                // Hitung pesan yang ditujukan untuk saya dan belum berstatus 'read'
                const unreadCount = msgs.filter(m => m.receiver_id === state.user.id && m.status !== 'read').length;
                state.unread[contact.id] = unreadCount;
                totalUnread += unreadCount;
            }
        });

        // Update badge total unread di tab "Pesan"
        const chatsBadge = document.getElementById('chatsCounterBadge');
        if (chatsBadge) {
            if (totalUnread > 0) {
                chatsBadge.style.display = 'inline-block';
                chatsBadge.textContent = totalUnread;
            } else {
                chatsBadge.style.display = 'none';
            }
        }
    }

    function renderChatsList(filterQuery = '') {
        const container = document.getElementById('chatsContainer');
        if (!container) return;

        updateUnreadBadges();

        if (state.contacts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p class="empty-state-desc">Belum ada percakapan aktif. Mulai tambahkan teman dan kirim pesan.</p>
                </div>
            `;
            return;
        }

        // Urutkan kontak berdasarkan pesan terakhir
        const sortedContacts = [...state.contacts].sort((a, b) => {
            const msgsA = state.chats[a.id] || [];
            const msgsB = state.chats[b.id] || [];
            const lastA = msgsA.length ? new Date(msgsA[msgsA.length - 1].created_at || 0) : 0;
            const lastB = msgsB.length ? new Date(msgsB[msgsB.length - 1].created_at || 0) : 0;
            return lastB - lastA;
        });

        const filtered = sortedContacts.filter(c => {
            const q = filterQuery.toLowerCase();
            return c.display_name.toLowerCase().includes(q) || c.username.toLowerCase().includes(q);
        });

        container.innerHTML = filtered.map(contact => {
            const msgs = state.chats[contact.id] || [];
            const lastMsg = msgs.length ? msgs[msgs.length - 1] : null;
            const isLastDeleted = lastMsg && (lastMsg.is_deleted || lastMsg.body === 'Pesan ini telah dihapus');
            const previewText = lastMsg ? (isLastDeleted ? '🚫 Pesan telah dihapus' : escapeHtml(lastMsg.body)) : 'Belum ada pesan';
            const timeText = lastMsg ? formatTime(lastMsg.created_at) : '';
            const unreadCount = state.unread[contact.id] || 0;
            const initial = (contact.display_name || contact.username).charAt(0).toUpperCase();
            const isActive = state.activeContact && state.activeContact.id === contact.id ? 'active' : '';
            const isOnline = Boolean(contact.is_online);

            return `
                <div class="list-item ${isActive}" onclick="selectContact(${contact.id})" role="button" tabindex="0">
                    <div class="avatar-container">
                        <div class="avatar-circle">${initial}</div>
                        <span class="status-indicator-dot ${isOnline ? 'online' : 'offline'}" title="${isOnline ? 'Online' : 'Offline'}"></span>
                    </div>
                    <div class="list-item-content">
                        <div class="list-item-header">
                            <span class="list-item-title">${escapeHtml(contact.display_name)}</span>
                            <span class="list-item-time">${timeText}</span>
                        </div>
                        <div class="list-item-preview">
                            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; ${isLastDeleted ? 'font-style: italic; color: var(--text-muted);' : ''}">${previewText}</span>
                            ${unreadCount > 0 ? `<span class="unread-badge" title="${unreadCount} pesan belum dibaca">${unreadCount}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderRequestsList() {
        const container = document.getElementById('requestsContainer');
        if (!container) return;

        if (state.requests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p class="empty-state-desc">Tidak ada permintaan pertemanan saat ini.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = state.requests.map(req => {
            const initial = (req.display_name || req.username).charAt(0).toUpperCase();
            return `
                <div class="request-item">
                    <div class="request-item-info">
                        <div class="avatar-circle">${initial}</div>
                        <div>
                            <div class="list-item-title">${escapeHtml(req.display_name)}</div>
                            <div class="user-username">@${escapeHtml(req.username)}</div>
                        </div>
                    </div>
                    <div class="request-actions">
                        <button type="button" class="btn-accept" onclick="handleAcceptRequest(${req.id})">
                            Terima
                        </button>
                        <button type="button" class="btn-reject" onclick="handleRejectRequest(${req.id})">
                            Tolak
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.handleAcceptRequest = async function (requesterId) {
        try {
            await apiRequest('/contacts/accept', {
                method: 'POST',
                body: JSON.stringify({ requester_id: requesterId })
            });
            showToast('Permintaan pertemanan diterima!', 'success');
            await fetchRequests();
            await fetchContacts();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    window.handleRejectRequest = async function (requesterId) {
        try {
            await apiRequest('/contacts/reject', {
                method: 'POST',
                body: JSON.stringify({ requester_id: requesterId })
            });
            showToast('Permintaan pertemanan ditolak.', 'info');
            await fetchRequests();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    // ==========================================
    // Cari & Tambah Teman Modal
    // ==========================================

    window.openAddFriendModal = function () {
        const modal = document.getElementById('addFriendModal');
        const input = document.getElementById('searchUserInput');
        const list = document.getElementById('searchResultsList');
        if (modal) {
            modal.classList.add('active');
            if (input) {
                input.value = '';
                input.focus();
            }
            if (list) {
                list.innerHTML = `
                    <div class="empty-state" style="padding: 1.5rem 0;">
                        <p class="empty-state-desc">Masukkan nama atau username untuk menemukan teman baru.</p>
                    </div>
                `;
            }
        }
    };

    window.closeAddFriendModal = function () {
        const modal = document.getElementById('addFriendModal');
        if (modal) modal.classList.remove('active');
    };

    window.executeUserSearch = async function () {
        const input = document.getElementById('searchUserInput');
        const list = document.getElementById('searchResultsList');
        const query = (input ? input.value : '').trim();

        if (!query) {
            showToast('Ketik nama atau username yang ingin dicari', 'info');
            return;
        }

        if (list) {
            list.innerHTML = `
                <div class="empty-state" style="padding: 1rem 0;">
                    <p class="empty-state-desc">Mencari pengguna...</p>
                </div>
            `;
        }

        try {
            const users = await apiRequest(`/users/search?q=${encodeURIComponent(query)}`);

            if (!users || users.length === 0) {
                list.innerHTML = `
                    <div class="empty-state" style="padding: 1.5rem 0;">
                        <p class="empty-state-desc">Tidak ada pengguna ditemukan dengan kata kunci "${escapeHtml(query)}".</p>
                    </div>
                `;
                return;
            }

            list.innerHTML = users.map(user => {
                const initial = (user.display_name || user.username).charAt(0).toUpperCase();
                const isFriend = state.contacts.some(c => c.id === user.id);

                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.625rem; background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div class="avatar-circle" style="width: 34px; height: 34px; font-size: 0.875rem;">${initial}</div>
                            <div>
                                <div style="font-weight: 600; font-size: 0.875rem; color: var(--text-primary);">${escapeHtml(user.display_name)}</div>
                                <div style="font-size: 0.75rem; color: var(--text-secondary);">@${escapeHtml(user.username)}</div>
                            </div>
                        </div>

                        ${isFriend ? `
                            <span style="font-size: 0.8125rem; color: var(--status-online); font-weight: 600;">Sudah Teman</span>
                        ` : `
                            <button type="button" class="btn-action-primary" style="padding: 0.4rem 0.75rem; font-size: 0.8125rem; min-height: 32px;" onclick="handleAddFriendSubmit(${user.id}, this)">
                                Tambah
                            </button>
                        `}
                    </div>
                `;
            }).join('');
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    window.handleAddFriendSubmit = async function (contactId, btn) {
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Mengirim...';
        }

        try {
            await apiRequest('/contacts', {
                method: 'POST',
                body: JSON.stringify({ contact_id: contactId })
            });

            showToast('Permintaan pertemanan berhasil dikirim!', 'success');
            if (btn) {
                btn.textContent = 'Terkirim';
                btn.style.backgroundColor = 'var(--status-online)';
            }
        } catch (e) {
            showToast(e.message, 'error');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Tambah';
            }
        }
    };

    // ==========================================
    // Percakapan & Pengiriman Pesan
    // ==========================================

    window.selectContact = function (contactId) {
        const contact = state.contacts.find(c => c.id === contactId);
        if (!contact) return;

        // Batal mode edit pesan jika sedang mengedit pesan kontak sebelumnya
        if (state.editingMessageId) {
            window.cancelEditMessage();
        }

        state.activeContact = contact;

        // Reset unread count untuk orang ini
        state.unread[contactId] = 0;

        // Update UI Header
        document.getElementById('noChatSelected').style.display = 'none';
        const chatWindow = document.getElementById('activeChatWindow');
        chatWindow.style.display = 'flex';

        document.getElementById('activeChatDisplayName').textContent = contact.display_name;
        document.getElementById('activeChatUsername').textContent = `@${contact.username}`;
        document.getElementById('activeAvatarCircle').textContent = (contact.display_name || contact.username).charAt(0).toUpperCase();

        const isOnline = Boolean(contact.is_online);
        const dot = document.getElementById('activeStatusDot');
        const statusLabel = document.getElementById('activeUserOnlineStatus');
        if (dot) {
            dot.className = `status-indicator-dot ${isOnline ? 'online' : 'offline'}`;
            dot.title = isOnline ? 'Online' : 'Offline';
        }
        if (statusLabel) {
            statusLabel.className = `user-status-text ${isOnline ? 'online' : 'offline'}`;
            statusLabel.textContent = isOnline ? 'Online' : 'Offline';
        }

        // Responsive mobile view
        document.querySelector('.app-viewport').classList.add('show-chat');

        // Tandai semua pesan dari orang ini sebagai telah dibaca
        acknowledgeMessagesForContact(contact.id);

        renderActiveMessages();
        renderContactsList();
        renderChatsList();

        // Focus message input
        const input = document.getElementById('messageInput');
        if (input) input.focus();
    };

    window.closeActiveChat = function () {
        window.closeChatDropdown();
        state.activeContact = null;

        const activeWindow = document.getElementById('activeChatWindow');
        const emptyState = document.getElementById('noChatSelected');
        const viewport = document.querySelector('.app-viewport');

        if (activeWindow) activeWindow.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
        if (viewport) viewport.classList.remove('show-chat');

        document.querySelectorAll('.chat-item.active, .contact-card-item.active').forEach(el => {
            el.classList.remove('active');
        });
    };

    window.closeChatMobile = window.closeActiveChat;

    // ==========================================
    // Menu Pilihan & Informasi Kontak
    // ==========================================

    window.closeChatDropdown = function () {
        const menu = document.getElementById('chatDropdownMenu');
        const btn = document.getElementById('btnChatMenu');
        if (menu) {
            menu.classList.remove('show');
            menu.style.display = 'none';
        }
        if (btn) btn.classList.remove('active');
    };

    window.toggleChatDropdown = function (e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const menu = document.getElementById('chatDropdownMenu');
        const btn = document.getElementById('btnChatMenu');
        if (!menu) return;

        const isShown = menu.classList.contains('show') || menu.style.display === 'flex';
        if (isShown) {
            window.closeChatDropdown();
        } else {
            menu.classList.add('show');
            menu.style.display = 'flex';
            if (btn) btn.classList.add('active');
        }
    };

    window.openContactInfoModal = function () {
        window.closeChatDropdown();

        if (!state.activeContact) return;

        const contact = state.activeContact;
        const initial = (contact.display_name || contact.username).charAt(0).toUpperCase();
        const isOnline = Boolean(contact.is_online);

        const modal = document.getElementById('contactInfoModal');
        const avatarEl = document.getElementById('infoAvatarCircle');
        const dotEl = document.getElementById('infoStatusDot');
        const nameEl = document.getElementById('infoDisplayName');
        const userEl = document.getElementById('infoUsername');
        const badgeEl = document.getElementById('infoStatusBadge');
        const statusTextEl = document.getElementById('infoStatusText');
        const presenceEl = document.getElementById('infoPresenceText');
        const joinedEl = document.getElementById('infoJoinedDate');
        const msgsEl = document.getElementById('infoTotalMessages');

        if (avatarEl) avatarEl.textContent = initial;
        if (dotEl) {
            dotEl.className = `status-indicator-dot ${isOnline ? 'online' : 'offline'}`;
            dotEl.title = isOnline ? 'Online' : 'Offline';
        }
        if (nameEl) nameEl.textContent = contact.display_name;
        if (userEl) userEl.textContent = `@${contact.username}`;
        if (badgeEl) {
            badgeEl.className = `contact-status-badge ${isOnline ? 'online' : 'offline'}`;
        }
        if (statusTextEl) {
            statusTextEl.textContent = isOnline ? 'Online' : 'Offline';
        }
        if (presenceEl) {
            presenceEl.textContent = isOnline ? 'Sedang Aktif Sekarang' : 'Sedang Tidak Aktif';
        }

        if (joinedEl) {
            if (contact.created_at) {
                const d = new Date(contact.created_at);
                const options = { year: 'numeric', month: 'long', day: 'numeric' };
                joinedEl.textContent = d.toLocaleDateString('id-ID', options);
            } else {
                joinedEl.textContent = 'Pengguna Terdaftar';
            }
        }

        if (msgsEl) {
            const list = state.chats[contact.id] || [];
            msgsEl.textContent = `${list.length} pesan`;
        }

        if (modal) {
            modal.classList.add('active');
        }
    };

    window.closeContactInfoModal = function () {
        const modal = document.getElementById('contactInfoModal');
        if (modal) modal.classList.remove('active');
    };

    window.focusMessageInput = function () {
        const input = document.getElementById('messageInput');
        if (input) input.focus();
    };

    window.clearActiveChatMessages = function () {
        window.closeChatDropdown();

        if (!state.activeContact) return;

        const confirmed = window.confirm(`Hapus seluruh riwayat pesan lokal bersama ${state.activeContact.display_name}?`);
        if (!confirmed) return;

        state.chats[state.activeContact.id] = [];
        persistMessages();
        renderActiveMessages();
        renderChatsList();
        showToast('Riwayat obrolan telah dibersihkan dari perangkat Anda.', 'info');
    };

    function renderActiveMessages() {
        const container = document.getElementById('messagesContainer');
        if (!container || !state.activeContact) return;

        const messages = state.chats[state.activeContact.id] || [];

        if (messages.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="margin: auto;">
                    <div class="empty-state-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <h3 class="empty-state-title">Mulai Mengobrol</h3>
                    <p class="empty-state-desc">Belum ada percakapan dengan ${escapeHtml(state.activeContact.display_name)}. Kirim pesan pertama Anda di bawah ini!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = messages.map(msg => {
            const isMe = msg.sender_id === state.user.id;
            const rowClass = isMe ? 'me' : 'other';
            const timeText = formatTime(msg.created_at);
            const statusMarker = isMe ? renderStatusCheck(msg.status) : '';
            const isDeleted = Boolean(msg.is_deleted) || msg.body === 'Pesan ini telah dihapus';
            const isEdited = Boolean(msg.is_edited) && !isDeleted;
            const msgIdentifier = msg.id ? String(msg.id) : (msg.client_uuid || '');
            const safeIdAttr = escapeHtml(msgIdentifier);

            if (isDeleted) {
                return `
                    <div class="message-row ${rowClass}" data-msg-id="${safeIdAttr}">
                        <div class="message-bubble deleted">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; opacity: 0.7;">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                            </svg>
                            <span>Pesan ini telah dihapus</span>
                        </div>
                        <div class="message-meta">
                            <span>${timeText}</span>
                            ${statusMarker}
                        </div>
                    </div>
                `;
            }

            return `
                <div class="message-row ${rowClass}" data-msg-id="${safeIdAttr}">
                    <div class="message-bubble-wrapper">
                        <div class="message-bubble">
                            ${escapeHtml(msg.body).replace(/\n/g, '<br>')}
                            ${isEdited ? '<span class="edited-label">(diedit)</span>' : ''}
                        </div>
                        ${isMe ? `
                            <div class="message-actions" role="toolbar" aria-label="Aksi pesan">
                                <button type="button" class="btn-msg-action" onclick="startEditMessage('${safeIdAttr}')" title="Edit pesan" aria-label="Edit pesan">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <button type="button" class="btn-msg-action danger" onclick="confirmDeleteMessage('${safeIdAttr}')" title="Hapus pesan" aria-label="Hapus pesan">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="message-meta">
                        <span>${timeText}</span>
                        ${statusMarker}
                    </div>
                </div>
            `;
        }).join('');

        // Auto scroll to latest message
        container.scrollTop = container.scrollHeight;
    }

    window.handleMessageKeydown = function (e) {
        if (e.key === 'Escape' && state.editingMessageId) {
            e.preventDefault();
            window.cancelEditMessage();
            return;
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    window.handleSendMessage = async function (e) {
        if (e) e.preventDefault();
        if (!state.activeContact) return;

        const textarea = document.getElementById('messageInput');
        const body = (textarea ? textarea.value : '').trim();
        if (!body) return;

        // Jika sedang dalam mode edit pesan
        if (state.editingMessageId) {
            await handleUpdateMessage(state.editingMessageId, body);
            return;
        }

        const clientUuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : 'uuid-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

        // Pesan baru awalnya berstatus 'sent' (Ceklis 1)
        const newMsg = {
            id: null,
            client_uuid: clientUuid,
            sender_id: state.user.id,
            receiver_id: state.activeContact.id,
            body: body,
            status: 'sent',
            is_edited: false,
            is_deleted: false,
            created_at: new Date().toISOString()
        };

        // Simpan & render secara optimistik
        if (!state.chats[state.activeContact.id]) {
            state.chats[state.activeContact.id] = [];
        }
        state.chats[state.activeContact.id].push(newMsg);
        persistMessages();
        renderActiveMessages();
        renderChatsList();

        textarea.value = '';
        textarea.style.height = 'auto';

        try {
            const savedMsg = await apiRequest('/messages', {
                method: 'POST',
                body: JSON.stringify({
                    client_uuid: clientUuid,
                    receiver_id: state.activeContact.id,
                    body: body
                })
            });

            // Perbarui ID setelah tersimpan di server
            if (savedMsg && savedMsg.id) {
                const target = state.chats[state.activeContact.id].find(m => m.client_uuid === clientUuid);
                if (target) {
                    target.id = savedMsg.id;
                    target.status = savedMsg.status || 'sent';
                    persistMessages();
                    renderActiveMessages();
                }
            }
        } catch (err) {
            showToast('Gagal mengirim pesan: ' + err.message, 'error');
        }
    };

    // ==========================================
    // Fitur Edit & Hapus Pesan
    // ==========================================

    window.startEditMessage = function (msgIdentifier) {
        if (!state.activeContact) return;
        const msgs = state.chats[state.activeContact.id] || [];
        const target = msgs.find(m => String(m.id) === String(msgIdentifier) || (m.client_uuid && String(m.client_uuid) === String(msgIdentifier)));

        if (!target) {
            showToast('Pesan tidak ditemukan.', 'error');
            return;
        }

        if (target.is_deleted || target.body === 'Pesan ini telah dihapus') {
            showToast('Pesan yang sudah dihapus tidak dapat diedit.', 'info');
            return;
        }

        state.editingMessageId = target.id || target.client_uuid;

        const textarea = document.getElementById('messageInput');
        const banner = document.getElementById('editMessageBanner');

        if (textarea) {
            textarea.value = target.body;
            textarea.focus();
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
        }

        if (banner) {
            banner.style.display = 'flex';
        }
    };

    window.cancelEditMessage = function () {
        state.editingMessageId = null;
        const textarea = document.getElementById('messageInput');
        const banner = document.getElementById('editMessageBanner');

        if (textarea) {
            textarea.value = '';
            textarea.style.height = 'auto';
        }

        if (banner) {
            banner.style.display = 'none';
        }
    };

    async function handleUpdateMessage(msgIdentifier, newBody) {
        if (!state.activeContact) return;

        const msgs = state.chats[state.activeContact.id] || [];
        const target = msgs.find(m => String(m.id) === String(msgIdentifier) || (m.client_uuid && String(m.client_uuid) === String(msgIdentifier)));

        if (!target) {
            window.cancelEditMessage();
            return;
        }

        const previousBody = target.body;
        const previousEdited = target.is_edited;

        // Optimistic update
        target.body = newBody;
        target.is_edited = true;
        persistMessages();
        renderActiveMessages();
        renderChatsList();
        window.cancelEditMessage();

        try {
            const idToCall = target.id || target.client_uuid;
            const res = await apiRequest(`/messages/${idToCall}`, {
                method: 'PUT',
                body: JSON.stringify({ body: newBody })
            });

            if (res) {
                if (res.id && !target.id) target.id = res.id;
                target.body = res.body || newBody;
                target.is_edited = true;
                persistMessages();
                renderActiveMessages();
                renderChatsList();
            }
            showToast('Pesan berhasil diedit.', 'success');
        } catch (err) {
            // Rollback jika gagal
            target.body = previousBody;
            target.is_edited = previousEdited;
            persistMessages();
            renderActiveMessages();
            renderChatsList();
            showToast('Gagal mengedit pesan: ' + err.message, 'error');
        }
    }

    window.confirmDeleteMessage = async function (msgIdentifier) {
        if (!state.activeContact) return;

        const msgs = state.chats[state.activeContact.id] || [];
        const target = msgs.find(m => String(m.id) === String(msgIdentifier) || (m.client_uuid && String(m.client_uuid) === String(msgIdentifier)));

        if (!target) return;

        if (target.is_deleted || target.body === 'Pesan ini telah dihapus') {
            showToast('Pesan sudah dihapus sebelumnya.', 'info');
            return;
        }

        const confirmed = window.confirm('Hapus pesan ini untuk semua orang?');
        if (!confirmed) return;

        if (state.editingMessageId && (String(state.editingMessageId) === String(target.id) || String(state.editingMessageId) === String(target.client_uuid))) {
            window.cancelEditMessage();
        }

        const previousBody = target.body;
        const previousDeleted = target.is_deleted;

        // Optimistic delete
        target.body = 'Pesan ini telah dihapus';
        target.is_deleted = true;
        persistMessages();
        renderActiveMessages();
        renderChatsList();

        try {
            const idToCall = target.id || target.client_uuid;
            await apiRequest(`/messages/${idToCall}`, {
                method: 'DELETE'
            });
            showToast('Pesan berhasil dihapus.', 'info');
        } catch (err) {
            // Rollback jika gagal
            target.body = previousBody;
            target.is_deleted = previousDeleted;
            persistMessages();
            renderActiveMessages();
            renderChatsList();
            showToast('Gagal menghapus pesan: ' + err.message, 'error');
        }
    };

    // Acknowledge pesan telah dibaca saat chat dibuka
    async function acknowledgeMessagesForContact(contactId) {
        const msgs = state.chats[contactId] || [];
        const unreadIds = msgs
            .filter(m => m.receiver_id === state.user.id && m.status !== 'read' && m.id)
            .map(m => m.id);

        // Langsung tandai secara lokal sebagai 'read'
        let hasChanges = false;
        msgs.forEach(m => {
            if (m.receiver_id === state.user.id && m.status !== 'read') {
                m.status = 'read';
                hasChanges = true;
            }
        });

        state.unread[contactId] = 0;

        if (hasChanges) {
            persistMessages();
            renderActiveMessages();
            renderChatsList();
        }

        if (unreadIds.length === 0) return;

        try {
            await apiRequest('/messages/ack', {
                method: 'POST',
                body: JSON.stringify({
                    message_ids: unreadIds,
                    status: 'read'
                })
            });
        } catch (e) {
            console.warn('Gagal acknowledge pesan:', e);
        }
    }

    // ==========================================
    // Sinkronisasi Pesan Pending & Status Ceklis
    // ==========================================

    async function syncPendingMessages() {
        if (!state.token || !state.user) return;

        try {
            const pendingList = await apiRequest('/messages/pending');
            if (!pendingList || pendingList.length === 0) return;

            const readAckIds = [];
            const deliveredAckIds = [];
            let activeUpdated = false;

            pendingList.forEach(msg => {
                const partnerId = msg.sender_id;
                if (!state.chats[partnerId]) {
                    state.chats[partnerId] = [];
                }

                // Cek apakah pesan sudah ada berdasarkan client_uuid atau ID
                const existingMsg = state.chats[partnerId].find(
                    m => (m.client_uuid && m.client_uuid === msg.client_uuid) || (m.id && m.id === msg.id)
                );

                const isCurrentActive = state.activeContact && state.activeContact.id === partnerId;

                if (!existingMsg) {
                    if (isCurrentActive) {
                        // Jika chat dengan orang ini sedang dibuka, langsung tandai 'read'
                        msg.status = 'read';
                        state.chats[partnerId].push(msg);
                        readAckIds.push(msg.id);
                        activeUpdated = true;
                    } else {
                        // Jika di luar chat, tandai 'delivered' (Ceklis 2) dan tambah unread count
                        msg.status = 'delivered';
                        state.chats[partnerId].push(msg);
                        deliveredAckIds.push(msg.id);

                        state.unread[partnerId] = (state.unread[partnerId] || 0) + 1;
                        const sender = state.contacts.find(c => c.id === partnerId);
                        const senderName = sender ? sender.display_name : 'Seseorang';
                        showToast(`Pesan baru dari ${senderName}: "${msg.body.substring(0, 40)}"`, 'info');
                    }
                } else {
                    // Update pesan jika ada perubahan (misal body diedit atau status berubah)
                    let changed = false;
                    if (msg.body && existingMsg.body !== msg.body) {
                        existingMsg.body = msg.body;
                        changed = true;
                    }
                    if (msg.is_edited !== undefined && existingMsg.is_edited !== Boolean(msg.is_edited)) {
                        existingMsg.is_edited = Boolean(msg.is_edited);
                        changed = true;
                    }
                    const isDeleted = Boolean(msg.is_deleted) || msg.body === 'Pesan ini telah dihapus';
                    if (isDeleted && !existingMsg.is_deleted) {
                        existingMsg.is_deleted = true;
                        existingMsg.body = 'Pesan ini telah dihapus';
                        changed = true;
                    }
                    if (changed) {
                        activeUpdated = true;
                    }
                }
            });

            if (readAckIds.length > 0 || deliveredAckIds.length > 0) {
                persistMessages();
                renderChatsList();

                if (activeUpdated) {
                    renderActiveMessages();
                }

                // Kirim ACK secara terpisah ke server
                if (readAckIds.length > 0) {
                    await apiRequest('/messages/ack', {
                        method: 'POST',
                        body: JSON.stringify({
                            message_ids: readAckIds,
                            status: 'read'
                        })
                    }).catch(() => {});
                }

                if (deliveredAckIds.length > 0) {
                    await apiRequest('/messages/ack', {
                        method: 'POST',
                        body: JSON.stringify({
                            message_ids: deliveredAckIds,
                            status: 'delivered'
                        })
                    }).catch(() => {});
                }
            }
        } catch (e) {
            console.error('Error saat sinkronisasi pesan pending:', e);
        }
    }

    // Sinkronisasi status pesan yang saya kirim (Ceklis 1 -> Ceklis 2 -> Ceklis 2 Biru)
    async function syncMessageStatuses() {
        if (!state.token || !state.user) return;

        try {
            const updates = await apiRequest('/messages/statuses');
            if (!updates || updates.length === 0) return;

            let hasChanges = false;
            updates.forEach(u => {
                for (const partnerId in state.chats) {
                    const list = state.chats[partnerId];
                    const msg = list.find(m => (m.id && m.id === u.id) || (m.client_uuid && m.client_uuid === u.client_uuid));
                    if (msg) {
                        let msgChanged = false;

                        if (u.status && msg.status !== u.status) {
                            msg.status = u.status;
                            msgChanged = true;
                        }

                        if (!msg.id && u.id) {
                            msg.id = u.id;
                            msgChanged = true;
                        }

                        // Perbarui teks jika diedit
                        if (u.body && msg.body !== u.body) {
                            msg.body = u.body;
                            msgChanged = true;
                        }

                        // Perbarui status edit jika ada
                        if (u.is_edited !== undefined && msg.is_edited !== Boolean(u.is_edited)) {
                            msg.is_edited = Boolean(u.is_edited);
                            msgChanged = true;
                        }

                        // Perbarui status hapus jika dihapus
                        const isDeleted = Boolean(u.is_deleted) || u.body === 'Pesan ini telah dihapus';
                        if (isDeleted && !msg.is_deleted) {
                            msg.is_deleted = true;
                            msg.body = 'Pesan ini telah dihapus';
                            msgChanged = true;
                        }

                        if (msgChanged) {
                            hasChanges = true;
                        }
                    }
                }
            });

            if (hasChanges) {
                persistMessages();
                if (state.activeContact) {
                    renderActiveMessages();
                }
                renderChatsList();
            }
        } catch (e) {
            // Abaikan error status sync di background
        }
    }

    async function sendHeartbeat() {
        if (!state.token || !state.user) return;
        try {
            await apiRequest('/heartbeat', { method: 'POST' }).catch(() => {});
        } catch (e) {
            // Abaikan error heartbeat di background
        }
    }

    function startDataSync() {
        if (state.syncInterval) clearInterval(state.syncInterval);
        if (state.heartbeatInterval) clearInterval(state.heartbeatInterval);

        // Fetch & Heartbeat langsung saat start
        sendHeartbeat();
        fetchContacts();
        fetchRequests();
        syncPendingMessages();
        syncMessageStatuses();

        // Kirim heartbeat setiap 20 detik untuk mempertahankan status online
        state.heartbeatInterval = setInterval(() => {
            sendHeartbeat();
        }, 20000);

        let syncTick = 0;
        // Polling setiap 2.5 detik untuk sinkronisasi pesan, status ceklis, dan permohonan
        state.syncInterval = setInterval(() => {
            syncTick++;
            syncPendingMessages();
            syncMessageStatuses();
            fetchRequests();

            // Perbarui status online/offline kontak setiap 5 detik (setiap 2 tick)
            if (syncTick % 2 === 0) {
                fetchContacts();
            }
        }, 2500);
    }

    window.handleLocalFilter = function (query) {
        if (state.activeTab === 'contacts') {
            renderContactsList(query);
        } else {
            renderChatsList(query);
        }
    };

    function escapeHtml(string) {
        if (!string) return '';
        return String(string)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Tutup dropdown menu saat klik di luar
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('chatDropdownMenu');
        const btn = document.getElementById('btnChatMenu');
        if (menu && (menu.classList.contains('show') || menu.style.display === 'flex')) {
            if (!menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
                window.closeChatDropdown();
            }
        }
    });

    // Tutup modal atau dropdown dengan tombol Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            window.closeChatDropdown();
            const infoModal = document.getElementById('contactInfoModal');
            if (infoModal && infoModal.classList.contains('active')) {
                window.closeContactInfoModal();
            }
        }
    });

    // Jalankan inisialisasi saat DOM siap
    document.addEventListener('DOMContentLoaded', () => {
        initAuth();
    });

})();
