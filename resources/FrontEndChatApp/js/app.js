/**
 * ZChat Web Application - Frontend Client
 * Modern Vanilla JS implementation connecting to Laravel 12 Backend API & Reverb
 */

(function () {
    'use strict';

    // ==========================================
    // Local Client Database (IndexedDB / SQLite-like)
    // ==========================================
    const AppDB = (function () {
        const DB_NAME = 'ZChat_Client_Storage';
        const DB_VERSION = 1;
        const STORE_MESSAGES = 'messages';
        let dbPromise = null;

        function open() {
            if (dbPromise) return dbPromise;
            if (typeof indexedDB === 'undefined') {
                console.warn('IndexedDB tidak didukung pada browser ini.');
                return Promise.resolve(null);
            }

            dbPromise = new Promise((resolve) => {
                const req = indexedDB.open(DB_NAME, DB_VERSION);

                req.onupgradeneeded = function (e) {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
                        const store = db.createObjectStore(STORE_MESSAGES, { keyPath: 'client_uuid' });
                        store.createIndex('partner_id', 'partner_id', { unique: false });
                        store.createIndex('sender_id', 'sender_id', { unique: false });
                        store.createIndex('receiver_id', 'receiver_id', { unique: false });
                        store.createIndex('created_at', 'created_at', { unique: false });
                    }
                };

                req.onsuccess = function (e) {
                    resolve(e.target.result);
                };

                req.onerror = function (e) {
                    console.error('IndexedDB error:', e.target.error);
                    resolve(null);
                };
            });

            return dbPromise;
        }

        async function saveMessage(msg, currentUserId) {
            if (!msg || !msg.client_uuid) return;
            const partnerId = msg.group_id
                ? 'group_' + msg.group_id
                : (Number(msg.sender_id) === Number(currentUserId)
                    ? Number(msg.receiver_id)
                    : Number(msg.sender_id));

            const record = {
                ...msg,
                partner_id: partnerId
            };

            const db = await open();
            if (!db) return;

            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(STORE_MESSAGES, 'readwrite');
                    const store = tx.objectStore(STORE_MESSAGES);
                    store.put(record);
                    tx.oncomplete = () => resolve(record);
                    tx.onerror = () => resolve(null);
                } catch (e) {
                    resolve(null);
                }
            });
        }

        async function saveMessagesBatch(messages, currentUserId) {
            if (!messages || !messages.length) return;
            const db = await open();
            if (!db) return;

            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(STORE_MESSAGES, 'readwrite');
                    const store = tx.objectStore(STORE_MESSAGES);
                    messages.forEach(msg => {
                        if (msg && msg.client_uuid) {
                            const partnerId = msg.group_id
                                ? 'group_' + msg.group_id
                                : (Number(msg.sender_id) === Number(currentUserId)
                                    ? Number(msg.receiver_id)
                                    : Number(msg.sender_id));
                            store.put({ ...msg, partner_id: partnerId });
                        }
                    });
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => resolve(false);
                } catch (e) {
                    resolve(false);
                }
            });
        }

        async function getAllChats(currentUserId) {
            const db = await open();
            if (!db) return null;

            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(STORE_MESSAGES, 'readonly');
                    const store = tx.objectStore(STORE_MESSAGES);
                    const req = store.getAll();

                    req.onsuccess = function () {
                        const items = req.result || [];
                        const grouped = {};
                        items.forEach(msg => {
                            const partnerId = msg.partner_id || (Number(msg.sender_id) === Number(currentUserId) ? Number(msg.receiver_id) : Number(msg.sender_id));
                            if (!grouped[partnerId]) grouped[partnerId] = [];
                            grouped[partnerId].push(msg);
                        });
                        for (const pid in grouped) {
                            grouped[pid].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                        }
                        resolve(grouped);
                    };

                    req.onerror = () => resolve(null);
                } catch (e) {
                    resolve(null);
                }
            });
        }

        async function clearContactChat(partnerId) {
            const db = await open();
            if (!db) return;

            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(STORE_MESSAGES, 'readwrite');
                    const store = tx.objectStore(STORE_MESSAGES);
                    const req = store.getAll();

                    req.onsuccess = function () {
                        const items = req.result || [];
                        items.forEach(item => {
                            if (String(item.partner_id) === String(partnerId)) {
                                store.delete(item.client_uuid);
                            }
                        });
                    };
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => resolve(false);
                } catch (e) {
                    resolve(false);
                }
            });
        }

        return {
            open,
            saveMessage,
            saveMessagesBatch,
            getAllChats,
            clearContactChat
        };
    })();

    // Application Global State
    const state = {
        token: localStorage.getItem('zchat_token') || null,
        user: JSON.parse(localStorage.getItem('zchat_user') || 'null'),
        contacts: [],
        requests: [],
        groups: [],
        chats: JSON.parse(localStorage.getItem('zchat_messages') || '{}'),
        unread: {},
        activeContact: null,
        syncInterval: null,
        heartbeatInterval: null,
        activeTab: 'chats',
        reverbSocket: null,
        editingMessageId: null,
        replyingTo: null,
        selectedAttachment: null,
        soundEnabled: localStorage.getItem('zchat_sound_enabled') !== 'false',
        inChatSearchQuery: '',
        activeEmojiCategory: 'popular',
        typingUsers: {},
        typingTimers: {},
        isCurrentlyTyping: false,
        lastTypingSentAt: 0,
        myTypingTimeout: null,
        conversationKeys: {},
        callLogs: [],
        voice: {
            active: false,
            roomType: null,
            groupId: null,
            targetUserId: null,
            targetName: '',
            callUuid: null,
            localStream: null,
            isMuted: false,
            isDeafened: false,
            peerConnections: {},
            remoteStreams: {},
            audioElements: {},
            pendingIceCandidates: {},
            participants: [],
            callTimer: null,
            callSeconds: 0,
            audioContext: null,
            analyser: null,
            analyserInterval: null,
            ringToneOscillator: null,
            incomingCall: null
        }
    };

    const cryptoKeyCache = new Map();

    async function getCryptoKey(hexKey) {
        if (!hexKey) return null;
        if (cryptoKeyCache.has(hexKey)) {
            return cryptoKeyCache.get(hexKey);
        }
        try {
            const rawBytes = new Uint8Array(hexKey.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            const cryptoKey = await window.crypto.subtle.importKey(
                'raw',
                rawBytes,
                { name: 'AES-GCM' },
                false,
                ['encrypt', 'decrypt']
            );
            cryptoKeyCache.set(hexKey, cryptoKey);
            return cryptoKey;
        } catch (e) {
            console.warn('Gagal import crypto key:', e);
            return null;
        }
    }

    function getConversationKeyForContact(contactId) {
        if (!contactId) return null;
        if (state.conversationKeys && state.conversationKeys[contactId]) {
            return state.conversationKeys[contactId];
        }
        if (String(contactId).startsWith('group_')) {
            const gid = Number(String(contactId).replace('group_', ''));
            const grp = (state.groups || []).find(g => Number(g.id) === gid);
            if (grp && grp.group_key) {
                state.conversationKeys[contactId] = grp.group_key;
                return grp.group_key;
            }
            if (state.activeContact && state.activeContact.is_group && state.activeContact.group_key) {
                return state.activeContact.group_key;
            }
        }
        const id = Number(contactId);
        if (state.conversationKeys && state.conversationKeys[id]) {
            return state.conversationKeys[id];
        }
        const contact = state.contacts.find(c => Number(c.id) === id);
        if (contact && contact.conversation_key) {
            state.conversationKeys[id] = contact.conversation_key;
            return contact.conversation_key;
        }
        if (state.activeContact && Number(state.activeContact.id) === id && state.activeContact.conversation_key) {
            return state.activeContact.conversation_key;
        }
        return null;
    }

    async function encryptMessageBody(text, hexKey) {
        if (!text || !hexKey || typeof text !== 'string') return text;
        try {
            const cryptoKey = await getCryptoKey(hexKey);
            if (!cryptoKey) return text;

            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encoded = new TextEncoder().encode(text);
            const cipherBuffer = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                cryptoKey,
                encoded
            );
            const cipherArray = new Uint8Array(cipherBuffer);

            let ivBinary = '';
            for (let i = 0; i < iv.length; i++) ivBinary += String.fromCharCode(iv[i]);

            let cipherBinary = '';
            for (let i = 0; i < cipherArray.length; i++) cipherBinary += String.fromCharCode(cipherArray[i]);

            return `enc:v1:${btoa(ivBinary)}:${btoa(cipherBinary)}`;
        } catch (e) {
            console.warn('Enkripsi pesan gagal:', e);
            return text;
        }
    }

    async function decryptMessageBody(payload, hexKey) {
        if (!payload || typeof payload !== 'string' || !payload.startsWith('enc:v1:') || !hexKey) {
            return payload;
        }
        try {
            const parts = payload.slice(7).split(':');
            if (parts.length !== 2) return payload;

            const ivBinary = atob(parts[0]);
            const iv = new Uint8Array(ivBinary.length);
            for (let i = 0; i < ivBinary.length; i++) iv[i] = ivBinary.charCodeAt(i);

            const cipherBinary = atob(parts[1]);
            const cipherBytes = new Uint8Array(cipherBinary.length);
            for (let i = 0; i < cipherBinary.length; i++) cipherBytes[i] = cipherBinary.charCodeAt(i);

            const cryptoKey = await getCryptoKey(hexKey);
            if (!cryptoKey) return payload;

            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                cryptoKey,
                cipherBytes
            );
            return new TextDecoder().decode(decryptedBuffer);
        } catch (e) {
            console.warn('Gagal mendekripsi pesan:', e);
            return payload;
        }
    }

    // Helper: Save messages to IndexedDB (local storage) and localStorage
    function persistMessages() {
        try {
            localStorage.setItem('zchat_messages', JSON.stringify(state.chats));
        } catch (e) {
            console.warn('Gagal menyimpan riwayat pesan ke localStorage:', e);
        }

        if (state.user && state.user.id) {
            const allFlat = [];
            for (const pid in state.chats) {
                if (Array.isArray(state.chats[pid])) {
                    allFlat.push(...state.chats[pid]);
                }
            }
            if (allFlat.length > 0) {
                AppDB.saveMessagesBatch(allFlat, state.user.id);
            }
        }
    }

    async function loadClientDatabase() {
        if (!state.user || !state.user.id) return;
        try {
            const dbChats = await AppDB.getAllChats(state.user.id);
            if (dbChats && Object.keys(dbChats).length > 0) {
                for (const pid in dbChats) {
                    if (!state.chats[pid]) {
                        state.chats[pid] = dbChats[pid];
                    } else {
                        const existingUuids = new Set(state.chats[pid].map(m => m.client_uuid));
                        dbChats[pid].forEach(msg => {
                            if (!existingUuids.has(msg.client_uuid)) {
                                state.chats[pid].push(msg);
                            }
                        });
                        state.chats[pid].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                    }
                }
            } else {
                persistMessages();
            }
        } catch (e) {
            console.warn('Gagal memuat client IndexedDB:', e);
        }
    }

    // Helper: Format Timestamp
    function formatTime(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Helper: Pastel Avatar Colors matching reference
    const pastelColorClasses = [
        'avatar-pastel-pink',
        'avatar-pastel-blue',
        'avatar-pastel-amber',
        'avatar-pastel-cyan',
        'avatar-pastel-green'
    ];

    function getPastelColorClass(str) {
        if (!str) return pastelColorClasses[0];
        let hash = 0;
        const s = String(str);
        for (let i = 0; i < s.length; i++) {
            hash = (hash << 5) - hash + s.charCodeAt(i);
            hash |= 0;
        }
        const index = Math.abs(hash) % pastelColorClasses.length;
        return pastelColorClasses[index];
    }

    // Helper: Render SVG Checkmarks (Ceklis 1, Ceklis 2, Ceklis 2 Putih)
    function renderStatusCheck(status) {
        if (status === 'read') {
            // Ceklis 2 Putih (Pesan telah dibaca)
            return `<span class="status-check read" title="Dibaca">
                <svg width="16" height="13" viewBox="0 0 28 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6L7 17l-5-5"></path>
                    <path d="M26 6l-11 11-2-2"></path>
                </svg>
            </span>`;
        } else if (status === 'delivered') {
            // Ceklis 2 (Pesan tersampaikan)
            return `<span class="status-check delivered" title="Tersampaikan">
                <svg width="16" height="13" viewBox="0 0 28 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6L7 17l-5-5"></path>
                    <path d="M26 6l-11 11-2-2"></path>
                </svg>
            </span>`;
        } else {
            // Ceklis 1 (Pesan terkirim ke server)
            return `<span class="status-check sent" title="Terkirim ke server">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </span>`;
        }
    }

    // Helper: Render Checkmarks di luar chat (Daftar Chat Sidebar di bawah jam)
    function renderListStatusCheck(status) {
        if (status === 'read') {
            // Ceklis 2 Biru/Cyan (Dibaca)
            return `<span class="list-item-status-check read" title="Dibaca" style="display: inline-flex; align-items: center; color: #38bdf8; margin-left: 0.5rem; flex-shrink: 0;">
                <svg width="15" height="13" viewBox="0 0 28 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6L7 17l-5-5"></path>
                    <path d="M26 6l-11 11-2-2"></path>
                </svg>
            </span>`;
        } else if (status === 'delivered') {
            // Ceklis 2 Abu-abu (Tersampaikan)
            return `<span class="list-item-status-check delivered" title="Tersampaikan" style="display: inline-flex; align-items: center; color: var(--text-muted, #9ca3af); margin-left: 0.5rem; flex-shrink: 0;">
                <svg width="15" height="13" viewBox="0 0 28 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6L7 17l-5-5"></path>
                    <path d="M26 6l-11 11-2-2"></path>
                </svg>
            </span>`;
        } else {
            // Ceklis 1 Abu-abu (Terkirim)
            return `<span class="list-item-status-check sent" title="Terkirim" style="display: inline-flex; align-items: center; color: var(--text-muted, #9ca3af); margin-left: 0.5rem; flex-shrink: 0;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
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

    async function initAuth() {
        if (!state.token || !state.user) {
            window.location.replace('/login');
            return;
        }
        updateCurrentUserUI();
        await loadClientDatabase();
        renderChatsList();
        startDataSync();
    }

    function updateCurrentUserUI() {
        if (!state.user) return;
        const nameEl = document.getElementById('myDisplayName');
        const userEl = document.getElementById('myUsername');
        const avatarEl = document.getElementById('myAvatarCircle');

        if (nameEl) nameEl.textContent = state.user.display_name;
        if (userEl) userEl.textContent = `@${state.user.username}`;
        if (avatarEl) {
            if (state.user.avatar) {
                avatarEl.innerHTML = `<img src="${escapeHtml(state.user.avatar)}" alt="${escapeHtml(state.user.display_name)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`;
                avatarEl.style.padding = '0';
                avatarEl.style.overflow = 'hidden';
            } else {
                const initials = state.user.display_name
                    ? state.user.display_name.split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase()
                    : (state.user.username || 'RA').substring(0, 2).toUpperCase();
                avatarEl.textContent = initials;
                avatarEl.style.padding = '';
                avatarEl.style.overflow = '';
            }
            avatarEl.title = `Profil: ${state.user.display_name} (@${state.user.username}) - Klik untuk info / keluar`;
        }
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
        btn.innerHTML = '<span class="btn-spinner"></span> Memproses...';

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
            await loadClientDatabase();
            renderChatsList();
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
        btn.innerHTML = '<span class="btn-spinner"></span> Mengirim kode OTP...';

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
        btn.innerHTML = '<span class="btn-spinner"></span> Memverifikasi...';

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
            await loadClientDatabase();
            renderChatsList();
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
                await apiRequest('/logout', { method: 'POST' }).catch(() => { });
            } catch (e) { }
        }

        if (state.syncInterval) {
            clearInterval(state.syncInterval);
            state.syncInterval = null;
        }

        if (state.heartbeatInterval) {
            clearInterval(state.heartbeatInterval);
            state.heartbeatInterval = null;
        }

        if (state.reverbSocket) {
            try { state.reverbSocket.disconnect(); } catch (e) { }
            state.reverbSocket = null;
        }

        if (state.voice && state.voice.active) {
            window.handleDisconnectVoiceCall();
        }
        stopIncomingRingtone();

        state.token = null;
        state.user = null;
        state.contacts = [];
        state.requests = [];
        state.activeContact = null;

        localStorage.removeItem('zchat_token');
        localStorage.removeItem('zchat_user');

        showToast('Anda telah keluar dari ZChat.', 'info');
        setTimeout(() => {
            window.location.replace('/login');
        }, 300);
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
            state.contacts.forEach(c => {
                if (c.id && c.conversation_key) {
                    state.conversationKeys[c.id] = c.conversation_key;
                }
            });

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
            const avatarHtml = contact.avatar
                ? `<img src="${escapeHtml(contact.avatar)}" alt="${escapeHtml(contact.display_name)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`
                : initial;

            return `
                <div class="list-item ${isActive}" onclick="selectContact(${contact.id})" role="button" tabindex="0">
                    <div class="avatar-container">
                        <div class="avatar-circle" style="overflow: hidden; display: flex; align-items: center; justify-content: center;">${avatarHtml}</div>
                        <span class="status-indicator-dot ${isOnline ? 'online' : 'offline'}" title="${isOnline ? 'Online' : 'Offline'}"></span>
                    </div>
                    <div class="list-item-content">
                        <div class="list-item-header">
                            <span class="list-item-title">${escapeHtml(contact.display_name)}</span>
                            <span class="user-status-text ${isOnline ? 'online' : 'offline'}">${isOnline ? 'Online' : 'Offline'}</span>
                        </div>
                        <div class="list-item-preview" style="display: flex; align-items: center; justify-content: space-between;">
                            <span>@${escapeHtml(contact.username)}</span>
                            <button type="button" class="btn-icon-subtle danger" onclick="event.stopPropagation(); confirmDeleteContact(${contact.id})" title="Hapus kontak ${escapeHtml(contact.display_name)}" style="opacity: 0.6; padding: 3px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center;">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
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

        // Update badge total unread di tab "Pesan" & Nav Rail
        const chatsBadge = document.getElementById('chatsCounterBadge');
        const railBadge = document.getElementById('railChatsBadge');
        if (totalUnread > 0) {
            if (chatsBadge) {
                chatsBadge.style.display = 'inline-block';
                chatsBadge.textContent = totalUnread;
            }
            if (railBadge) {
                railBadge.style.display = 'inline-block';
                railBadge.textContent = totalUnread;
            }
        } else {
            if (chatsBadge) chatsBadge.style.display = 'none';
            if (railBadge) railBadge.style.display = 'none';
        }
    }

    function renderChatsList(filterQuery = '') {
        const container = document.getElementById('chatsContainer');
        if (!container) return;

        updateUnreadBadges();

        const conversationItems = [];

        (state.contacts || []).forEach(contact => {
            const msgs = state.chats[contact.id] || [];
            const lastMsg = msgs.length ? msgs[msgs.length - 1] : null;
            const lastTime = lastMsg ? new Date(lastMsg.created_at || 0).getTime() : 0;
            conversationItems.push({
                is_group: false,
                id: contact.id,
                raw: contact,
                display_name: contact.display_name,
                username: contact.username,
                is_online: Boolean(contact.is_online),
                lastMsg: lastMsg,
                lastTime: lastTime,
                unread: state.unread[contact.id] || 0
            });
        });

        (state.groups || []).forEach(group => {
            const chatKey = 'group_' + group.id;
            const msgs = state.chats[chatKey] || [];
            const lastMsg = msgs.length ? msgs[msgs.length - 1] : group.last_message;
            const lastTime = lastMsg ? new Date(lastMsg.created_at || 0).getTime() : (group.created_at ? new Date(group.created_at).getTime() : 0);
            conversationItems.push({
                is_group: true,
                id: chatKey,
                group_id: group.id,
                raw: group,
                display_name: group.name,
                username: `${group.members_count || (group.members ? group.members.length : 1)} anggota`,
                is_online: true,
                lastMsg: lastMsg,
                lastTime: lastTime,
                unread: state.unread[chatKey] || 0
            });
        });

        if (conversationItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p class="empty-state-desc">Belum ada obrolan atau grup aktif. Mulai tambahkan teman atau buat grup baru.</p>
                </div>
            `;
            return;
        }

        conversationItems.sort((a, b) => b.lastTime - a.lastTime);

        const q = filterQuery.toLowerCase();
        const filtered = conversationItems.filter(item => {
            return item.display_name.toLowerCase().includes(q) || item.username.toLowerCase().includes(q);
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p class="empty-state-desc">Tidak ada hasil pencarian percakapan.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(item => {
            if (item.is_group) {
                const group = item.raw;
                const lastMsg = item.lastMsg;
                const isLastDeleted = lastMsg && (lastMsg.is_deleted || lastMsg.body === 'Pesan ini telah dihapus');
                let previewText = 'Belum ada pesan grup';
                if (lastMsg) {
                    if (isLastDeleted) {
                        previewText = '🚫 Pesan telah dihapus';
                    } else {
                        const senderPrefix = lastMsg.sender_name ? `${escapeHtml(lastMsg.sender_name)}: ` : '';
                        previewText = senderPrefix + escapeHtml(lastMsg.body);
                    }
                }
                const timeText = lastMsg ? formatTime(lastMsg.created_at) : '';
                const unreadCount = item.unread;
                const isActive = state.activeContact && state.activeContact.is_group && Number(state.activeContact.group_id) === Number(group.id) ? 'active' : '';
                const isMeLastMsg = Boolean(lastMsg && state.user && Number(lastMsg.sender_id) === Number(state.user.id));
                const statusCheckHtml = isMeLastMsg ? renderListStatusCheck(lastMsg.status) : '';

                const groupAvatarContent = group.avatar
                    ? `<img src="${escapeHtml(group.avatar)}" alt="${escapeHtml(group.name)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
                    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>`;

                return `
                    <div class="list-item ${isActive}" onclick="selectGroup(${group.id})" role="button" tabindex="0">
                        <div class="avatar-container">
                            <div class="avatar-circle avatar-pastel-purple" style="display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(109, 40, 217, 0.35)); color: #c4b5fd; overflow: hidden;">
                                ${groupAvatarContent}
                            </div>
                        </div>
                        <div class="list-item-content">
                            <div class="list-item-header">
                                <span class="list-item-title" style="display: flex; align-items: center; gap: 4px;">
                                    <span>${escapeHtml(group.name)}</span>
                                </span>
                                <span class="list-item-time">${timeText}</span>
                            </div>
                            <div class="list-item-preview">
                                <span class="list-preview-text" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; ${isLastDeleted ? 'font-style: italic; color: var(--text-muted);' : ''}">${previewText}</span>
                                ${unreadCount > 0 ? `<span class="unread-badge" title="${unreadCount} pesan belum dibaca">${unreadCount}</span>` : statusCheckHtml}
                            </div>
                        </div>
                    </div>
                `;
            }

            const contact = item.raw;
            const isTyping = Boolean(state.typingUsers && state.typingUsers[contact.id]);
            const lastMsg = item.lastMsg;
            const isLastDeleted = lastMsg && (lastMsg.is_deleted || lastMsg.body === 'Pesan ini telah dihapus');
            const previewText = isTyping
                ? '<span class="typing-preview-text">sedang mengetik...</span>'
                : (lastMsg ? (isLastDeleted ? '🚫 Pesan telah dihapus' : escapeHtml(lastMsg.body)) : 'Belum ada pesan');
            const timeText = lastMsg ? formatTime(lastMsg.created_at) : '';
            const unreadCount = item.unread;
            const pastelClass = getPastelColorClass(contact.display_name || contact.username);
            const initials = (contact.display_name || contact.username).split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase() || 'U';
            const isActive = state.activeContact && !state.activeContact.is_group && Number(state.activeContact.id) === Number(contact.id) ? 'active' : '';
            const isOnline = Boolean(contact.is_online);
            const isMeLastMsg = Boolean(lastMsg && state.user && Number(lastMsg.sender_id) === Number(state.user.id));
            const statusCheckHtml = isMeLastMsg ? renderListStatusCheck(lastMsg.status) : '';
            const avatarContent = contact.avatar
                ? `<img src="${escapeHtml(contact.avatar)}" alt="${escapeHtml(contact.display_name)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`
                : initials;

            return `
                <div class="list-item ${isActive}" onclick="selectContact(${contact.id})" role="button" tabindex="0">
                    <div class="avatar-container">
                        <div class="avatar-circle ${contact.avatar ? '' : pastelClass}" style="overflow: hidden; display: flex; align-items: center; justify-content: center;">${avatarContent}</div>
                        <span class="status-indicator-dot ${isOnline ? 'online' : 'offline'}" title="${isOnline ? 'Online' : 'Offline'}"></span>
                    </div>
                    <div class="list-item-content">
                        <div class="list-item-header">
                            <span class="list-item-title">${escapeHtml(contact.display_name)}</span>
                            <span class="list-item-time">${timeText}</span>
                        </div>
                        <div class="list-item-preview">
                            <span class="list-preview-text" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; ${isLastDeleted ? 'font-style: italic; color: var(--text-muted);' : ''}">${previewText}</span>
                            ${unreadCount > 0 ? `<span class="unread-badge" title="${unreadCount} pesan belum dibaca">${unreadCount}</span>` : statusCheckHtml}
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
            const avatarHtml = req.avatar
                ? `<img src="${escapeHtml(req.avatar)}" alt="${escapeHtml(req.display_name)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`
                : initial;
            return `
                <div class="request-item">
                    <div class="request-item-info">
                        <div class="avatar-circle" style="overflow: hidden; display: flex; align-items: center; justify-content: center;">${avatarHtml}</div>
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

    // Navigation Rail Tab Switching & Controls
    window.switchRailTab = function (tab) {
        state.activeTab = tab;
        const btnChats = document.getElementById('railBtnChats');
        const btnContacts = document.getElementById('railBtnContacts');
        const btnRequests = document.getElementById('railBtnRequests');
        const btnCalls = document.getElementById('railBtnCalls');
        const panelChats = document.getElementById('panelChats');
        const panelContacts = document.getElementById('panelContacts');
        const panelRequests = document.getElementById('panelRequests');
        const panelCalls = document.getElementById('panelCalls');
        const sectionLabel = document.getElementById('sidebarSectionLabel');

        [btnChats, btnContacts, btnRequests, btnCalls].forEach(b => { if (b) b.classList.remove('active'); });

        if (panelChats) panelChats.style.display = 'none';
        if (panelContacts) panelContacts.style.display = 'none';
        if (panelRequests) panelRequests.style.display = 'none';
        if (panelCalls) panelCalls.style.display = 'none';

        if (tab === 'chats') {
            if (btnChats) btnChats.classList.add('active');
            if (panelChats) panelChats.style.display = 'block';
            if (sectionLabel) sectionLabel.textContent = 'TERBARU';
            renderChatsList();
        } else if (tab === 'contacts') {
            if (btnContacts) btnContacts.classList.add('active');
            if (panelContacts) panelContacts.style.display = 'block';
            if (sectionLabel) sectionLabel.textContent = 'SEMUA KONTAK';
            renderContactsList();
        } else if (tab === 'requests') {
            if (btnRequests) btnRequests.classList.add('active');
            if (panelRequests) panelRequests.style.display = 'block';
            if (sectionLabel) sectionLabel.textContent = 'PERMINTAAN PERTEMANAN';
            renderRequestsList();
        } else if (tab === 'calls') {
            if (btnCalls) btnCalls.classList.add('active');
            if (panelCalls) panelCalls.style.display = 'block';
            if (sectionLabel) sectionLabel.textContent = 'RIWAYAT PANGGILAN';
            fetchCallLogs();
        }
    };

    window.fetchCallLogs = async function () {
        if (!state.token) return;
        try {
            const res = await apiRequest('/voice/call-logs');
            if (res && res.call_logs) {
                state.callLogs = res.call_logs;
                renderCallLogsList();
            }
        } catch (e) {
            console.warn('Gagal memuat riwayat panggilan:', e);
        }
    };

    function renderCallLogsList(filterQuery = '') {
        const container = document.getElementById('callsContainer');
        if (!container) return;

        let logs = state.callLogs || [];
        if (filterQuery) {
            const q = filterQuery.toLowerCase();
            logs = logs.filter(log => {
                const other = log.other_user || {};
                const name = (other.display_name || other.username || '').toLowerCase();
                const status = (log.status_label || '').toLowerCase();
                const uuid = (log.call_uuid || '').toLowerCase();
                return name.includes(q) || status.includes(q) || uuid.includes(q);
            });
        }

        if (logs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p class="empty-state-desc">${filterQuery ? 'Tidak ada riwayat panggilan yang cocok.' : 'Belum ada riwayat panggilan.'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = logs.map(log => {
            const otherUser = log.other_user || { id: 0, display_name: 'Pengguna', username: 'user' };
            const otherName = otherUser.display_name || otherUser.username || 'Pengguna';
            const initial = otherName.charAt(0).toUpperCase();
            const pastelClass = getPastelColorClass(otherName);
            const initials = otherName.split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase() || 'U';
            const isOutgoing = log.direction === 'outgoing';

            let statusIcon = '';
            let statusBadgeText = log.status_label || 'Selesai';
            let badgeBg = 'rgba(100, 116, 139, 0.15)';
            let badgeColor = '#94a3b8';

            if (log.status === 'answered') {
                badgeBg = 'rgba(16, 185, 129, 0.15)';
                badgeColor = '#10b981';
                statusIcon = isOutgoing
                    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" title="Panggilan Keluar"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>`
                    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" title="Panggilan Masuk"><line x1="17" y1="7" x2="7" y2="17"></line><polyline points="17 17 7 17 7 7"></polyline></svg>`;
            } else if (log.status === 'rejected') {
                badgeBg = 'rgba(239, 68, 68, 0.15)';
                badgeColor = '#ef4444';
                statusIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" title="Panggilan Ditolak"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>`;
            } else if (log.status === 'missed') {
                badgeBg = 'rgba(239, 68, 68, 0.15)';
                badgeColor = '#ef4444';
                statusIcon = isOutgoing
                    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" title="Tak Terjawab"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>`
                    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" title="Panggilan Tak Terjawab"><line x1="17" y1="7" x2="7" y2="17"></line><polyline points="17 17 7 17 7 7"></polyline></svg>`;
            } else {
                badgeBg = 'rgba(245, 158, 11, 0.15)';
                badgeColor = '#f59e0b';
                statusIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" title="Sedang Sibuk"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
            }

            const endedByText = log.ended_by_name ? ` • Diakhiri oleh ${escapeHtml(log.ended_by_name)}` : '';
            const durationText = log.status === 'answered' ? `Durasi: ${log.duration_formatted}` : statusBadgeText;
            const timeText = log.created_at_time ? `${log.created_at_date}, ${log.created_at_time}` : (log.created_at_human || '');
            const callUuidShort = (log.call_uuid || '').substring(0, 16);

            return `
                <div class="list-item call-log-item" style="cursor: default; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 0.85rem; flex: 1; min-width: 0;">
                        <div class="avatar-container">
                            <div class="avatar-circle ${pastelClass}">${initials}</div>
                        </div>
                        <div class="list-item-content">
                            <div class="list-item-header">
                                <span class="list-item-title">${escapeHtml(otherName)}</span>
                                <span class="list-item-time">${escapeHtml(timeText)}</span>
                            </div>
                            <div class="list-item-preview" style="gap: 0.35rem; align-items: center;">
                                <span style="display: inline-flex; align-items: center;">${statusIcon}</span>
                                <span style="color: ${badgeColor}; font-weight: 500; font-size: 0.78rem;">${escapeHtml(durationText)}</span>
                                <span style="opacity: 0.75; font-size: 0.75rem;">${endedByText}</span>
                            </div>
                            <div style="margin-top: 0.15rem; font-size: 0.68rem; color: var(--text-muted); opacity: 0.7; font-family: monospace;">
                                ID: ${escapeHtml(callUuidShort)}
                            </div>
                        </div>
                    </div>
                    ${otherUser.id ? `
                        <button type="button" class="btn-icon" onclick="startDirectVoiceCall(${otherUser.id}, '${escapeHtml(otherName).replace(/'/g, "\\'")}')" title="Panggil Ulang" aria-label="Panggil Ulang" style="margin-left: 0.5rem; width: 34px; height: 34px; border-radius: 50%; background: rgba(124, 58, 237, 0.12); color: #7c3aed; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.15s, background 0.15s;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    window.switchSidebarTab = window.switchRailTab;

    window.handleMarkAllRead = function () {
        if (!state.contacts || state.contacts.length === 0) return;
        state.contacts.forEach(c => {
            state.unread[c.id] = 0;
        });
        updateUnreadBadges();
        renderChatsList();
        showToast('Semua percakapan telah ditandai dibaca.', 'success');
    };

    window.toggleRightInfoPanel = function (openOnly = false) {
        const panel = document.getElementById('chatInfoPanel');
        if (!panel) return;
        if (openOnly) {
            panel.classList.add('open');
        } else {
            panel.classList.toggle('open');
        }
        if (state.activeContact) {
            updateRightPanelMediaAndDocs(state.activeContact.id);
        }
    };

    function updateRightPanelMediaAndDocs(contactId) {
        const mediaContainer = document.getElementById('infoMediaGrid');
        const docsContainer = document.getElementById('infoDocumentsList');
        const mediaCountEl = document.getElementById('infoMediaCount');
        const docsCountEl = document.getElementById('infoDocsCount');

        if (!contactId || !mediaContainer || !docsContainer) return;

        const messages = state.chats[contactId] || [];
        const validAttachments = [];

        messages.forEach(msg => {
            if (msg.is_deleted || msg.body === 'Pesan ini telah dihapus') return;
            if (msg.attachment && msg.attachment.url) {
                validAttachments.push(msg.attachment);
            } else if (msg.body && msg.body.startsWith('[Berkas:')) {
                const match = msg.body.match(/^\[Berkas:\s*(.+?)\]$/);
                if (match) {
                    validAttachments.push({
                        name: match[1],
                        url: '',
                        size: 0,
                        type: ''
                    });
                }
            }
        });

        const images = [];
        const documents = [];

        validAttachments.forEach(att => {
            const name = (att.name || att.url || '').toLowerCase();
            const type = (att.type || '').toLowerCase();
            const isImg = type.startsWith('image/') || Boolean(name.match(/\.(jpeg|jpg|png|gif|webp|svg)$/i));

            if (isImg) {
                images.push(att);
            } else {
                documents.push(att);
            }
        });

        if (mediaCountEl) mediaCountEl.textContent = images.length;
        if (docsCountEl) docsCountEl.textContent = documents.length;

        if (images.length === 0) {
            mediaContainer.innerHTML = `
                <div class="empty-media-note" style="grid-column: 1 / -1; padding: 0.85rem 0.5rem; text-align: center; font-size: 0.75rem; color: var(--text-muted); background: var(--bg-surface-elevated, rgba(255,255,255,0.03)); border-radius: 8px; border: 1px dashed var(--border-subtle, rgba(255,255,255,0.1));">
                    Belum ada gambar bersama
                </div>
            `;
        } else {
            const recentImages = images.slice(-9).reverse();
            mediaContainer.innerHTML = recentImages.map(img => {
                const imgUrl = img.url || '#';
                const imgName = escapeHtml(img.name || 'Gambar');
                return `
                    <a href="${imgUrl}" target="_blank" rel="noopener noreferrer" class="media-thumb-card" title="${imgName}" style="background-image: url('${imgUrl}'); background-size: cover; background-position: center; border: 1px solid var(--border-card); display: block; text-decoration: none;">
                    </a>
                `;
            }).join('');
        }

        if (documents.length === 0) {
            docsContainer.innerHTML = `
                <div class="empty-docs-note" style="padding: 0.85rem 0.5rem; text-align: center; font-size: 0.75rem; color: var(--text-muted); background: var(--bg-surface-elevated, rgba(255,255,255,0.03)); border-radius: 8px; border: 1px dashed var(--border-subtle, rgba(255,255,255,0.1));">
                    Belum ada dokumen bersama (.zip, .pdf, dll)
                </div>
            `;
        } else {
            const recentDocs = documents.slice(-10).reverse();
            docsContainer.innerHTML = recentDocs.map(doc => {
                const docUrl = doc.url || '#';
                const docName = escapeHtml(doc.name || 'Berkas');
                const ext = (doc.name || '').split('.').pop().toLowerCase() || 'file';
                const sizeText = doc.size ? formatFileSize(doc.size) : 'Dokumen';

                let iconColor = '#7c3aed';
                let iconSvg = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                `;

                if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
                    iconColor = '#f59e0b';
                    iconSvg = `
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                            <line x1="12" y1="22.08" x2="12" y2="12"></line>
                        </svg>
                    `;
                } else if (ext === 'pdf') {
                    iconColor = '#ef4444';
                } else if (['doc', 'docx', 'txt'].includes(ext)) {
                    iconColor = '#3b82f6';
                } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
                    iconColor = '#10b981';
                }

                return `
                    <a href="${docUrl}" ${docUrl !== '#' ? `download="${docName}"` : ''} target="_blank" rel="noopener noreferrer" class="document-item-card" title="Buka ${docName}" style="text-decoration: none;">
                        <div class="doc-icon-container" style="color: ${iconColor};">
                            ${iconSvg}
                        </div>
                        <div class="doc-details" style="overflow: hidden; min-width: 0;">
                            <span class="doc-name" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${docName}</span>
                            <span class="doc-meta">${sizeText} • ${ext.toUpperCase()}</span>
                        </div>
                    </a>
                `;
            }).join('');
        }
    }

    window.handleSimulatedAction = function (name) {
        showToast(`${name} sedang disiapkan.`, 'info');
    };

    function playMessageChime() {
        if (!state.soundEnabled) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.32);
        } catch (e) { }
    }

    window.toggleSoundNotification = function (enabled) {
        state.soundEnabled = Boolean(enabled);
        try {
            localStorage.setItem('zchat_sound_enabled', String(state.soundEnabled));
        } catch (e) { }
        if (state.soundEnabled) {
            playMessageChime();
            showToast('Suara notifikasi diaktifkan.', 'info');
        } else {
            showToast('Suara notifikasi dinonaktifkan.', 'info');
        }
    };

    /**
     * Konversi & Kompresi Foto Profil ke Standar WhatsApp:
     * - Aspek rasio 1:1 Square (Center-crop)
     * - Resolusi 500x500 piksel (standar WhatsApp)
     * - Format WebP kualitas 0.85 (fallback JPEG)
     * - Mengurangi foto kamera ponsel 5MB-10MB menjadi hanya ~35-65 KB tanpa pecah
     */
    function compressAndCropProfileImage(file, targetSize = 500, quality = 0.85) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.match(/^image\//i)) {
                return reject(new Error('File yang dipilih bukan berkas gambar valid.'));
            }
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
            reader.onload = (e) => {
                const img = new Image();
                img.onerror = () => reject(new Error('Gagal memproses data gambar.'));
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = targetSize;
                        canvas.height = targetSize;
                        const ctx = canvas.getContext('2d');

                        // 1:1 Center crop (seperti WhatsApp avatar crop)
                        const minDim = Math.min(img.width, img.height);
                        const sx = (img.width - minDim) / 2;
                        const sy = (img.height - minDim) / 2;

                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

                        // Export ke WebP (fallback JPEG)
                        canvas.toBlob((blob) => {
                            if (blob) {
                                const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
                                const convertedFile = new File([blob], `avatar_${Date.now()}.${ext}`, { type: blob.type });
                                resolve({
                                    file: convertedFile,
                                    dataUrl: canvas.toDataURL(blob.type, quality),
                                    originalSize: file.size,
                                    compressedSize: blob.size
                                });
                            } else {
                                canvas.toBlob((jpegBlob) => {
                                    if (!jpegBlob) return reject(new Error('Gagal mengompresi gambar.'));
                                    const convertedFile = new File([jpegBlob], `avatar_${Date.now()}.jpg`, { type: 'image/jpeg' });
                                    resolve({
                                        file: convertedFile,
                                        dataUrl: canvas.toDataURL('image/jpeg', quality),
                                        originalSize: file.size,
                                        compressedSize: jpegBlob.size
                                    });
                                }, 'image/jpeg', quality);
                            }
                        }, 'image/webp', quality);
                    } catch (err) {
                        reject(err);
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    window.handleUserAvatarSelected = async function (e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        // Reset input value agar dapat memilih file yang sama bila diinginkan
        e.target.value = '';

        const MAX_SIZE_BYTES = 10 * 1024 * 1024; // Maksimal 10MB sebelum kompresi
        if (file.size > MAX_SIZE_BYTES) {
            showToast('Ukuran foto terlalu besar! Maksimal 10MB.', 'error');
            return;
        }

        const avatarEl = document.getElementById('profileModalAvatar');
        const badgeEl = document.getElementById('userAvatarInfoBadge');
        const btnDelete = document.getElementById('btnDeleteUserAvatar');

        if (badgeEl) {
            badgeEl.innerHTML = `<span style="color: #a78bfa;">Mengonversi ke 500x500 WebP...</span>`;
        }

        try {
            const result = await compressAndCropProfileImage(file, 500, 0.85);

            // Tampilkan preview instan
            if (avatarEl) {
                avatarEl.innerHTML = `<img src="${result.dataUrl}" alt="Preview" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`;
                avatarEl.className = 'avatar-circle';
            }

            const origKb = Math.round(result.originalSize / 1024);
            const compKb = Math.round(result.compressedSize / 1024);
            if (badgeEl) {
                badgeEl.innerHTML = `<span style="color: #10b981;">Terkonversi: ${compKb} KB (dari ${origKb} KB) • Mengunggah...</span>`;
            }

            // Unggah ke endpoint server
            const formData = new FormData();
            formData.append('avatar', result.file);

            const token = localStorage.getItem('zchat_token') || sessionStorage.getItem('zchat_token');
            const res = await fetch('/api/user/avatar', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Gagal menyimpan foto profil ke server.');
            }

            const data = await res.json();
            if (data && data.avatar) {
                state.user.avatar = data.avatar;
                localStorage.setItem('zchat_user', JSON.stringify(state.user));
                updateCurrentUserUI();
                if (btnDelete) btnDelete.style.display = 'inline-flex';
                if (badgeEl) {
                    badgeEl.innerHTML = `<span style="color: #10b981;">Foto WhatsApp terpasang (${compKb} KB)!</span>`;
                }
                showToast('Foto profil WhatsApp berhasil diperbarui!', 'success');
            }
        } catch (err) {
            console.error('Avatar upload error:', err);
            showToast(err.message || 'Gagal mengunggah foto profil', 'error');
            if (badgeEl) {
                badgeEl.textContent = 'Ukuran standar WhatsApp (500x500) • Maks 10MB';
                badgeEl.style.color = 'var(--text-muted)';
            }
            if (avatarEl) {
                if (state.user && state.user.avatar) {
                    avatarEl.innerHTML = `<img src="${state.user.avatar}" alt="${escapeHtml(state.user.display_name)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`;
                } else {
                    const initials = (state.user ? (state.user.display_name || state.user.username) : 'U').split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase();
                    avatarEl.className = 'avatar-circle avatar-pastel-purple';
                    avatarEl.textContent = initials;
                }
            }
        }
    };

    window.handleDeleteUserAvatar = async function () {
        if (!state.user || !state.user.avatar) return;
        if (!confirm('Apakah Anda yakin ingin menghapus foto profil?')) return;

        const avatarEl = document.getElementById('profileModalAvatar');
        const badgeEl = document.getElementById('userAvatarInfoBadge');
        const btnDelete = document.getElementById('btnDeleteUserAvatar');

        try {
            const token = localStorage.getItem('zchat_token') || sessionStorage.getItem('zchat_token');
            const res = await fetch('/api/user/avatar', {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Gagal menghapus foto profil.');
            }

            state.user.avatar = null;
            localStorage.setItem('zchat_user', JSON.stringify(state.user));
            updateCurrentUserUI();

            if (avatarEl) {
                const pastelClass = getPastelColorClass(state.user.display_name || state.user.username);
                const initials = (state.user.display_name || state.user.username).split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase() || 'U';
                avatarEl.className = `avatar-circle ${pastelClass}`;
                avatarEl.textContent = initials;
            }
            if (btnDelete) btnDelete.style.display = 'none';
            if (badgeEl) {
                badgeEl.textContent = 'Ukuran standar WhatsApp (500x500) • Maks 10MB';
                badgeEl.style.color = 'var(--text-muted)';
            }
            showToast('Foto profil berhasil dihapus.', 'info');
        } catch (err) {
            console.error('Delete avatar error:', err);
            showToast(err.message || 'Gagal menghapus foto profil', 'error');
        }
    };

    window.openUserProfileModal = function () {
        if (!state.user) return;
        const modal = document.getElementById('userProfileModal');
        const nameInput = document.getElementById('profileDisplayNameInput');
        const userInput = document.getElementById('profileUsernameInput');
        const emailInput = document.getElementById('profileEmailInput');
        const avatarEl = document.getElementById('profileModalAvatar');
        const soundToggle = document.getElementById('profileSoundToggle');
        const btnDelete = document.getElementById('btnDeleteUserAvatar');
        const badgeEl = document.getElementById('userAvatarInfoBadge');

        if (nameInput) nameInput.value = state.user.display_name || '';
        if (userInput) userInput.value = `@${state.user.username || ''}`;
        if (emailInput) emailInput.value = state.user.email || 'Belum diatur';
        if (soundToggle) soundToggle.checked = Boolean(state.soundEnabled);

        if (avatarEl) {
            if (state.user.avatar) {
                avatarEl.className = 'avatar-circle';
                avatarEl.innerHTML = `<img src="${state.user.avatar}" alt="${escapeHtml(state.user.display_name)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`;
                if (btnDelete) btnDelete.style.display = 'inline-flex';
            } else {
                const pastelClass = getPastelColorClass(state.user.display_name || state.user.username);
                const initials = (state.user.display_name || state.user.username).split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase() || 'U';
                avatarEl.className = `avatar-circle ${pastelClass}`;
                avatarEl.textContent = initials;
                if (btnDelete) btnDelete.style.display = 'none';
            }
        }

        if (badgeEl) {
            badgeEl.textContent = 'Ukuran standar WhatsApp (500x500) • Maks 10MB';
            badgeEl.style.color = 'var(--text-muted)';
        }

        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
            if (nameInput) nameInput.focus();
        }
    };

    window.closeUserProfileModal = function () {
        const modal = document.getElementById('userProfileModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    };

    window.handleSaveProfile = async function (e) {
        if (e) e.preventDefault();
        const nameInput = document.getElementById('profileDisplayNameInput');
        const btnSave = document.getElementById('btnSaveProfile');
        const newName = (nameInput ? nameInput.value : '').trim();

        if (!newName) {
            showToast('Nama tampilan tidak boleh kosong.', 'error');
            return;
        }

        if (btnSave) {
            btnSave.disabled = true;
            btnSave.textContent = 'Menyimpan...';
        }

        try {
            const updated = await apiRequest('/user/profile', {
                method: 'PUT',
                body: JSON.stringify({ display_name: newName })
            });

            if (updated) {
                state.user.display_name = updated.display_name || newName;
                if (updated.avatar !== undefined) {
                    state.user.avatar = updated.avatar;
                }
                localStorage.setItem('zchat_user', JSON.stringify(state.user));
                updateCurrentUserUI();
                showToast('Profil berhasil diperbarui.', 'success');
                window.closeUserProfileModal();
            }
        } catch (err) {
            showToast('Gagal memperbarui profil: ' + err.message, 'error');
        } finally {
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.textContent = 'Simpan Perubahan';
            }
        }
    };

    const EMOJI_CATEGORIES = {
        popular: ['👍', '❤️', '😂', '🔥', '✨', '🎉', '🙏', '😊', '😍', '👏', '🙌', '💯', '🚀', '😎'],
        smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '🥺', '😢', '😭', '😤', '😠', '😡', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴'],
        gestures: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '💪', '✍️', '🙏', '🤝', '👏', '🙌', '👐', '🤲'],
        hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
        objects: ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🔥', '⭐', '🌟', '💡', '📌', '📎', '💼', '💻', '📱', '🔔', '📢', '🚀', '💯']
    };

    window.toggleEmojiPicker = function (eOrForce) {
        const popover = document.getElementById('emojiPickerPopover');
        if (!popover) return;
        const willShow = typeof eOrForce === 'boolean' ? eOrForce : popover.style.display === 'none';
        if (willShow) {
            popover.style.display = 'flex';
            renderEmojiGrid(state.activeEmojiCategory || 'popular');
        } else {
            popover.style.display = 'none';
        }
    };

    window.switchEmojiCategory = function (category) {
        state.activeEmojiCategory = category;
        const tabs = document.querySelectorAll('.emoji-tab-btn');
        tabs.forEach(t => t.classList.remove('active'));
        const activeTab = Array.from(tabs).find(t => t.getAttribute('onclick')?.includes(category));
        if (activeTab) activeTab.classList.add('active');
        renderEmojiGrid(category);
    };

    function renderEmojiGrid(category) {
        const grid = document.getElementById('emojiGridList');
        if (!grid) return;
        const list = EMOJI_CATEGORIES[category] || EMOJI_CATEGORIES.popular;
        grid.innerHTML = list.map(em => `
            <button type="button" class="emoji-item-btn" onclick="insertEmoji('${em}')" aria-label="${em}">${em}</button>
        `).join('');
    }

    window.insertEmoji = function (emoji) {
        const textarea = document.getElementById('messageInput');
        if (!textarea) return;
        const start = textarea.selectionStart || textarea.value.length;
        const end = textarea.selectionEnd || textarea.value.length;
        const val = textarea.value;
        textarea.value = val.substring(0, start) + emoji + val.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
        handleMessageInput();
    };

    window.startReplyMessage = function (msgIdentifier) {
        if (!state.activeContact) return;
        const msgs = state.chats[state.activeContact.id] || [];
        const target = msgs.find(m => String(m.id) === String(msgIdentifier) || (m.client_uuid && String(m.client_uuid) === String(msgIdentifier)));
        if (!target) return;

        state.replyingTo = target;
        const banner = document.getElementById('replyMessageBanner');
        const authorEl = document.getElementById('replyRecipientName');
        const snippetEl = document.getElementById('replyMessageSnippet');

        const isTargetMe = Number(target.sender_id) === Number(state.user.id);
        const name = isTargetMe ? 'Anda' : (state.activeContact.display_name || state.activeContact.username);

        if (authorEl) authorEl.textContent = `Membalas ${name}`;
        let snippet = target.body || '';
        if (target.attachment) {
            snippet = snippet && !snippet.startsWith('[Berkas:') ? snippet : `📷 ${target.attachment.name || 'Lampiran'}`;
        }
        if (snippetEl) snippetEl.textContent = snippet ? snippet.substring(0, 80) : '[Lampiran]';
        if (banner) banner.style.display = 'flex';

        const textarea = document.getElementById('messageInput');
        if (textarea) textarea.focus();
    };

    window.cancelReplyMessage = function () {
        state.replyingTo = null;
        const banner = document.getElementById('replyMessageBanner');
        if (banner) banner.style.display = 'none';
    };

    window.scrollToMessage = function (msgId) {
        const row = document.querySelector(`.message-row[data-msg-id="${msgId}"]`);
        if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.style.transition = 'background-color 0.4s ease';
            row.style.backgroundColor = 'rgba(124, 58, 237, 0.15)';
            setTimeout(() => {
                row.style.backgroundColor = 'transparent';
            }, 1200);
        }
    };

    async function uploadAttachmentFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API_BASE}/messages/upload`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                ...(state.token ? { 'Authorization': `Bearer ${state.token}` } : {})
            },
            body: formData
        });

        if (!res.ok) {
            const err = await res.json().catch(() => null);
            throw new Error((err && err.message) || 'Gagal mengunggah berkas');
        }

        return await res.json();
    }

    window.triggerFileAttachment = function () {
        const fileInput = document.getElementById('chatFileInput');
        if (fileInput) fileInput.click();
    };

    window.handleFileSelected = function (e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (file.size > 25 * 1024 * 1024) {
            showToast('Ukuran berkas melebihi batas maksimal 25 MB.', 'error');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function (evt) {
            state.selectedAttachment = {
                name: file.name,
                size: file.size,
                type: file.type,
                dataUrl: evt.target.result,
                fileObj: file,
                uploadPromise: uploadAttachmentFile(file).then(res => {
                    if (state.selectedAttachment && state.selectedAttachment.fileObj === file) {
                        state.selectedAttachment.url = res.url;
                    }
                    return res;
                }).catch(err => {
                    console.warn('Upload gagal:', err);
                    return null;
                })
            };

            const banner = document.getElementById('attachmentPreviewBanner');
            const nameEl = document.getElementById('attachmentFileName');
            const sizeEl = document.getElementById('attachmentFileSize');
            const thumbContainer = document.getElementById('attachmentThumbnailContainer');

            if (nameEl) nameEl.textContent = file.name;
            if (sizeEl) sizeEl.textContent = formatFileSize(file.size);

            if (thumbContainer) {
                if (file.type.startsWith('image/')) {
                    thumbContainer.innerHTML = `<img src="${evt.target.result}" alt="${file.name}">`;
                } else {
                    thumbContainer.innerHTML = `
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                    `;
                }
            }

            if (banner) banner.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    };

    window.cancelAttachment = function () {
        state.selectedAttachment = null;
        const banner = document.getElementById('attachmentPreviewBanner');
        const fileInput = document.getElementById('chatFileInput');
        if (banner) banner.style.display = 'none';
        if (fileInput) fileInput.value = '';
    };

    function formatFileSize(bytes) {
        if (!bytes || isNaN(bytes)) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    window.toggleInChatSearch = function (forceState) {
        const bar = document.getElementById('inChatSearchBar');
        const input = document.getElementById('inChatSearchInput');
        if (!bar) return;
        const willShow = typeof forceState === 'boolean' ? forceState : bar.style.display === 'none';
        if (willShow) {
            bar.style.display = 'block';
            if (input) {
                input.value = state.inChatSearchQuery || '';
                input.focus();
            }
        } else {
            bar.style.display = 'none';
            state.inChatSearchQuery = '';
            if (input) input.value = '';
            renderActiveMessages();
        }
    };

    window.handleInChatSearch = function (e) {
        const query = (e.target.value || '').trim();
        state.inChatSearchQuery = query;
        renderActiveMessages();

        const countEl = document.getElementById('inChatSearchCount');
        if (!countEl) return;

        if (!query) {
            countEl.textContent = '0 hasil';
            return;
        }

        const msgs = (state.activeContact && state.chats[state.activeContact.id]) || [];
        const matches = msgs.filter(m => !m.is_deleted && m.body && m.body.toLowerCase().includes(query.toLowerCase()));
        countEl.textContent = `${matches.length} ditemukan`;

        if (matches.length > 0) {
            const firstMatch = matches[matches.length - 1];
            const targetId = firstMatch.id || firstMatch.client_uuid;
            scrollToMessage(targetId);
        }
    };

    window.handleInChatSearchKeydown = function (e) {
        if (e.key === 'Escape') {
            toggleInChatSearch(false);
        }
    };

    window.toggleMessageReaction = function (msgIdentifier, emoji) {
        if (!state.activeContact || !state.user) return;
        const msgs = state.chats[state.activeContact.id] || [];
        const target = msgs.find(m => String(m.id) === String(msgIdentifier) || (m.client_uuid && String(m.client_uuid) === String(msgIdentifier)));
        if (!target) return;

        if (!target.reactions) target.reactions = {};
        const userName = state.user.display_name || state.user.username;

        if (!target.reactions[emoji]) {
            target.reactions[emoji] = [userName];
        } else {
            const idx = target.reactions[emoji].indexOf(userName);
            if (idx >= 0) {
                target.reactions[emoji].splice(idx, 1);
                if (target.reactions[emoji].length === 0) delete target.reactions[emoji];
            } else {
                target.reactions[emoji].push(userName);
            }
        }

        persistMessages();
        renderActiveMessages();
    };

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
                const userAvatarHtml = user.avatar
                    ? `<img src="${escapeHtml(user.avatar)}" alt="${escapeHtml(user.display_name)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`
                    : initial;

                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.625rem; background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div class="avatar-circle" style="width: 34px; height: 34px; font-size: 0.875rem; overflow: hidden; display: flex; align-items: center; justify-content: center;">${userAvatarHtml}</div>
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

    window.selectContact = async function (contactId) {
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

        const pastelClass = getPastelColorClass(contact.display_name || contact.username);
        const initials = (contact.display_name || contact.username).split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase() || 'U';
        const isOnline = Boolean(contact.is_online);
        const isTyping = Boolean(state.typingUsers && state.typingUsers[contact.id]);

        document.getElementById('activeChatDisplayName').textContent = contact.display_name;
        document.getElementById('activeChatUsername').textContent = `@${contact.username}`;
        const activeAvatarEl = document.getElementById('activeAvatarCircle');
        if (activeAvatarEl) {
            if (contact.avatar) {
                activeAvatarEl.className = 'avatar-circle';
                activeAvatarEl.style.overflow = 'hidden';
                activeAvatarEl.innerHTML = `<img src="${escapeHtml(contact.avatar)}" alt="${escapeHtml(contact.display_name)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`;
            } else {
                activeAvatarEl.className = `avatar-circle ${pastelClass}`;
                activeAvatarEl.style.overflow = '';
                activeAvatarEl.textContent = initials;
            }
        }

        const dot = document.getElementById('activeStatusDot');
        const smallDot = document.getElementById('activeStatusSmallDot');
        const statusLabel = document.getElementById('activeUserOnlineStatus');
        const typingBadge = document.getElementById('activeTypingStatus');

        if (dot) {
            dot.className = `status-indicator-dot ${isOnline ? 'online' : 'offline'}`;
            dot.title = isOnline ? 'Online' : 'Offline';
        }
        if (smallDot) {
            smallDot.className = `presence-dot ${isOnline ? 'online' : 'offline'}`;
        }
        if (statusLabel) {
            statusLabel.className = `user-status-text ${isOnline ? 'online' : 'offline'}`;
            statusLabel.textContent = isOnline ? 'Aktif sekarang' : 'Offline';
        }
        if (typingBadge) {
            typingBadge.style.display = isTyping ? 'flex' : 'none';
        }
        const typingNameText = document.getElementById('activeTypingNameText');
        if (typingNameText) {
            const activeName = contact.display_name || contact.name || contact.username || 'Kontak';
            typingNameText.textContent = `${activeName} sedang mengetik`;
        }

        // Sinkronisasi Right Contact Info Panel
        const infoAvatar = document.getElementById('infoAvatarCircle');
        const infoName = document.getElementById('infoDisplayName');
        const infoUser = document.getElementById('infoUsername');
        const infoDot = document.getElementById('infoStatusDot');
        if (infoAvatar) {
            if (contact.avatar) {
                infoAvatar.className = 'avatar-circle info-avatar-large';
                infoAvatar.style.overflow = 'hidden';
                infoAvatar.innerHTML = `<img src="${escapeHtml(contact.avatar)}" alt="${escapeHtml(contact.display_name)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`;
            } else {
                infoAvatar.className = `avatar-circle info-avatar-large ${pastelClass}`;
                infoAvatar.style.overflow = '';
                infoAvatar.textContent = initials;
            }
        }
        if (infoName) infoName.textContent = contact.display_name;
        if (infoUser) infoUser.textContent = contact.email || `@${contact.username}`;
        if (infoDot) {
            infoDot.className = `status-indicator-dot ${isOnline ? 'online' : 'offline'}`;
        }

        // Responsive mobile view
        document.querySelector('.app-viewport').classList.add('show-chat');

        // Tandai semua pesan dari orang ini sebagai telah dibaca
        acknowledgeMessagesForContact(contact.id);

        // Tampilkan state loading skeleton sejenak saat berpindah obrolan
        const skeleton = document.getElementById('chatLoadingSkeleton');
        const msgsContainer = document.getElementById('messagesContainer');
        if (skeleton && msgsContainer) {
            skeleton.style.display = 'flex';
            msgsContainer.style.display = 'none';
        }

        const hexKey = getConversationKeyForContact(contact.id);
        if (hexKey && state.chats[contact.id]) {
            let decryptedAny = false;
            for (const m of state.chats[contact.id]) {
                if (m.body && m.body.startsWith('enc:v1:')) {
                    m.body = await decryptMessageBody(m.body, hexKey);
                    decryptedAny = true;
                }
            }
            if (decryptedAny) {
                persistMessages();
            }
        }

        try {
            renderActiveMessages();
            renderContactsList();
            renderChatsList();
            updateRightPanelMediaAndDocs(contact.id);
        } catch (err) {
            console.error('Error rendering active chat messages:', err);
        } finally {
            if (skeleton && msgsContainer) {
                setTimeout(() => {
                    skeleton.style.display = 'none';
                    msgsContainer.style.display = 'flex';
                    msgsContainer.scrollTop = msgsContainer.scrollHeight;
                }, 40);
            }
        }

        const groupSec = document.getElementById('infoGroupSection');
        const btnDelContact = document.getElementById('btnDeleteContactAction');
        const btnLeaveGrp = document.getElementById('btnLeaveGroupAction');
        const btnDelGrp = document.getElementById('btnDeleteGroupAction');
        const btnHeaderEdit = document.getElementById('btnHeaderEditGroup');
        const btnEditAction = document.getElementById('btnEditGroupAction');
        if (groupSec) groupSec.style.display = 'none';
        if (btnDelContact) btnDelContact.style.display = 'flex';
        if (btnLeaveGrp) btnLeaveGrp.style.display = 'none';
        if (btnDelGrp) btnDelGrp.style.display = 'none';
        if (btnHeaderEdit) btnHeaderEdit.style.display = 'none';
        if (btnEditAction) btnEditAction.style.display = 'none';

        // Focus message input
        const input = document.getElementById('messageInput');
        if (input) input.focus();
    };

    async function fetchGroups() {
        if (!state.token) return [];
        try {
            const groups = await apiRequest('/groups');
            state.groups = Array.isArray(groups) ? groups : [];
            state.groups.forEach(g => {
                if (g.group_key) {
                    state.conversationKeys['group_' + g.id] = g.group_key;
                }
            });
            renderChatsList();
            return state.groups;
        } catch (e) {
            console.warn('Gagal memuat daftar grup:', e);
            return [];
        }
    }

    window.selectGroup = async function (groupId) {
        const group = (state.groups || []).find(g => Number(g.id) === Number(groupId));
        if (!group) return;

        if (state.editingMessageId) {
            window.cancelEditMessage();
        }

        const chatKey = 'group_' + groupId;
        state.activeContact = {
            ...group,
            is_group: true,
            id: chatKey,
            group_id: Number(groupId)
        };

        state.unread[chatKey] = 0;

        document.getElementById('noChatSelected').style.display = 'none';
        const chatWindow = document.getElementById('activeChatWindow');
        chatWindow.style.display = 'flex';

        document.getElementById('activeChatDisplayName').textContent = group.name;
        document.getElementById('activeChatUsername').textContent = `${group.members_count || (group.members ? group.members.length : 1)} anggota`;

        const activeAvatarEl = document.getElementById('activeAvatarCircle');
        if (activeAvatarEl) {
            if (group.avatar) {
                activeAvatarEl.className = 'avatar-circle';
                activeAvatarEl.style.overflow = 'hidden';
                activeAvatarEl.innerHTML = `<img src="${escapeHtml(group.avatar)}" alt="${escapeHtml(group.name)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            } else {
                activeAvatarEl.className = 'avatar-circle avatar-pastel-purple';
                activeAvatarEl.style.overflow = 'hidden';
                activeAvatarEl.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                `;
            }
        }

        const dot = document.getElementById('activeStatusDot');
        const smallDot = document.getElementById('activeStatusSmallDot');
        const statusLabel = document.getElementById('activeUserOnlineStatus');
        const typingBadge = document.getElementById('activeTypingStatus');

        if (dot) {
            dot.className = 'status-indicator-dot online';
            dot.title = 'Grup Aktif';
        }
        if (smallDot) smallDot.className = 'presence-dot online';
        if (statusLabel) {
            statusLabel.className = 'user-status-text online';
            statusLabel.textContent = `${group.members_count || (group.members ? group.members.length : 1)} anggota`;
        }
        if (typingBadge) typingBadge.style.display = 'none';

        updateRightPanelForGroup(group);

        document.querySelector('.app-viewport').classList.add('show-chat');

        const skeleton = document.getElementById('chatLoadingSkeleton');
        const msgsContainer = document.getElementById('messagesContainer');
        if (skeleton && msgsContainer) {
            skeleton.style.display = 'flex';
            msgsContainer.style.display = 'none';
        }

        try {
            const apiMsgs = await apiRequest(`/groups/${groupId}/messages`);
            if (Array.isArray(apiMsgs)) {
                const hexKey = group.group_key;
                for (const m of apiMsgs) {
                    if (m.body && m.body.startsWith('enc:v1:')) {
                        m.body = await decryptMessageBody(m.body, hexKey);
                    }
                }
                state.chats[chatKey] = apiMsgs;
                await AppDB.saveMessagesBatch(apiMsgs.map(m => ({ ...m, group_id: groupId })), state.user.id);
                persistMessages();
            }
        } catch (e) {
            console.warn('Gagal memuat pesan grup:', e);
        }

        try {
            renderActiveMessages();
            renderChatsList();
            updateRightPanelMediaAndDocs(chatKey);
        } catch (err) {
            console.error('Error render pesan grup:', err);
        } finally {
            if (skeleton && msgsContainer) {
                setTimeout(() => {
                    skeleton.style.display = 'none';
                    msgsContainer.style.display = 'flex';
                    msgsContainer.scrollTop = msgsContainer.scrollHeight;
                }, 40);
            }
        }

        const input = document.getElementById('messageInput');
        if (input) input.focus();
    };

    function updateRightPanelForGroup(group) {
        const infoAvatar = document.getElementById('infoAvatarCircle');
        const infoName = document.getElementById('infoDisplayName');
        const infoUser = document.getElementById('infoUsername');
        const infoDot = document.getElementById('infoStatusDot');
        const groupSec = document.getElementById('infoGroupSection');
        const groupList = document.getElementById('infoGroupMembersList');
        const groupCount = document.getElementById('infoGroupMembersCount');
        const btnAddMem = document.getElementById('btnOpenAddMember');
        const btnDelContact = document.getElementById('btnDeleteContactAction');
        const btnLeaveGrp = document.getElementById('btnLeaveGroupAction');
        const btnDelGrp = document.getElementById('btnDeleteGroupAction');
        const btnHeaderEdit = document.getElementById('btnHeaderEditGroup');
        const btnEditAction = document.getElementById('btnEditGroupAction');

        if (infoAvatar) {
            if (group.avatar) {
                infoAvatar.className = 'avatar-circle info-avatar-large';
                infoAvatar.style.overflow = 'hidden';
                infoAvatar.innerHTML = `<img src="${escapeHtml(group.avatar)}" alt="${escapeHtml(group.name)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            } else {
                infoAvatar.className = 'avatar-circle info-avatar-large avatar-pastel-purple';
                infoAvatar.style.overflow = 'hidden';
                infoAvatar.innerHTML = `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                `;
            }
        }
        if (infoName) infoName.textContent = group.name;
        if (infoUser) infoUser.textContent = group.description || 'Grup Obrolan ZChat';
        if (infoDot) infoDot.className = 'status-indicator-dot online';

        if (groupSec) groupSec.style.display = 'block';
        if (btnDelContact) btnDelContact.style.display = 'none';
        if (btnLeaveGrp) btnLeaveGrp.style.display = 'flex';

        const isAdmin = group.my_role === 'admin' || (Number(group.created_by) === Number(state.user?.id));
        if (btnDelGrp) btnDelGrp.style.display = isAdmin ? 'flex' : 'none';
        if (btnAddMem) btnAddMem.style.display = isAdmin ? 'flex' : 'none';
        if (btnHeaderEdit) btnHeaderEdit.style.display = isAdmin ? 'flex' : 'none';
        if (btnEditAction) btnEditAction.style.display = isAdmin ? 'flex' : 'none';

        if (groupCount) groupCount.textContent = group.members ? group.members.length : (group.members_count || 1);

        if (groupList && group.members) {
            const isCurrentCreator = Number(group.created_by) === Number(state.user?.id);
            groupList.innerHTML = group.members.map(m => {
                const initial = (m.display_name || m.username || 'U').charAt(0).toUpperCase();
                const isMe = Number(m.user_id) === Number(state.user?.id);
                const isMemAdmin = m.role === 'admin';
                const isTargetCreator = Number(m.user_id) === Number(group.created_by);
                // Admin can kick members; only creator can kick another admin; creator cannot be kicked by other admins
                const canKick = isAdmin && !isMe && (!isTargetCreator || isCurrentCreator);
                const memAvatarHtml = m.avatar
                    ? `<img src="${escapeHtml(m.avatar)}" alt="${escapeHtml(m.display_name)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`
                    : initial;

                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.45rem 0.65rem; border-radius: 8px; background: var(--bg-surface-elevated, rgba(255,255,255,0.03)); border: 1px solid var(--border-subtle, rgba(255,255,255,0.06)); font-size: 0.8125rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; overflow: hidden; min-width: 0;">
                            <div class="avatar-circle" style="width: 30px; height: 30px; font-size: 0.75rem; flex-shrink: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(124, 58, 237, 0.3), rgba(139, 92, 237, 0.15)); color: #c4b5fd;">${memAvatarHtml}</div>
                            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                <div style="font-weight: 600; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                                    ${escapeHtml(m.display_name)}${isMe ? ' <span style="color: var(--accent-primary); font-size: 0.7rem; font-weight: 500;">(Anda)</span>' : ''}
                                </div>
                                <div style="font-size: 0.7rem; color: var(--text-muted);">@${escapeHtml(m.username)}</div>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0;">
                            <span style="font-size: 0.6875rem; padding: 2px 7px; border-radius: 4px; ${isMemAdmin ? 'background: rgba(124, 58, 237, 0.2); color: #a78bfa; font-weight: 600;' : 'background: rgba(255,255,255,0.06); color: var(--text-muted);'}">
                                ${isMemAdmin ? (isTargetCreator ? 'Owner' : 'Admin') : 'Anggota'}
                            </span>
                            ${canKick ? `
                                <button type="button" class="btn-kick-member" style="display: flex; align-items: center; gap: 3px; padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.35); background: rgba(239, 68, 68, 0.12); color: #f87171; font-size: 0.6875rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;" title="Keluarkan dari grup" onclick="handleRemoveGroupMember(${m.user_id}, '${escapeHtml(m.display_name || m.username)}')">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="8.5" cy="7" r="4"></circle>
                                        <line x1="18" y1="8" x2="23" y2="13"></line>
                                        <line x1="23" y1="8" x2="18" y2="13"></line>
                                    </svg>
                                    <span>Kick</span>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    window.openCreateGroupModal = function () {
        const modal = document.getElementById('createGroupModal');
        const nameInput = document.getElementById('groupNameInput');
        const descInput = document.getElementById('groupDescInput');
        const membersList = document.getElementById('createGroupMembersList');

        if (nameInput) nameInput.value = '';
        if (descInput) descInput.value = '';

        if (membersList) {
            if (!state.contacts || state.contacts.length === 0) {
                membersList.innerHTML = `
                    <div style="padding: 1rem; text-align: center; font-size: 0.8125rem; color: var(--text-muted);">
                        Belum ada kontak teman. Tambahkan teman terlebih dahulu untuk diundang ke grup.
                    </div>
                `;
            } else {
                membersList.innerHTML = state.contacts.map(c => {
                    const initial = (c.display_name || c.username || 'U').charAt(0).toUpperCase();
                    return `
                        <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0.6rem; border-radius: 6px; cursor: pointer; transition: background 0.15s ease; background: var(--bg-surface-elevated, rgba(255,255,255,0.02));">
                            <div style="display: flex; align-items: center; gap: 0.6rem;">
                                <div class="avatar-circle" style="width: 28px; height: 28px; font-size: 0.75rem;">${initial}</div>
                                <div>
                                    <div style="font-size: 0.8125rem; font-weight: 600; color: var(--text-primary);">${escapeHtml(c.display_name)}</div>
                                    <div style="font-size: 0.7rem; color: var(--text-muted);">@${escapeHtml(c.username)}</div>
                                </div>
                            </div>
                            <input type="checkbox" name="selected_group_members" value="${c.id}" style="width: 16px; height: 16px; accent-color: var(--accent-primary); cursor: pointer;">
                        </label>
                    `;
                }).join('');
            }
        }

        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
            if (nameInput) nameInput.focus();
        }
    };

    window.closeCreateGroupModal = function () {
        const modal = document.getElementById('createGroupModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    };

    window.handleCreateGroupSubmit = async function (e) {
        if (e) e.preventDefault();
        const nameInput = document.getElementById('groupNameInput');
        const descInput = document.getElementById('groupDescInput');
        const submitBtn = document.getElementById('btnSubmitCreateGroup');

        const name = (nameInput ? nameInput.value : '').trim();
        const description = (descInput ? descInput.value : '').trim();

        if (!name) {
            showToast('Nama grup tidak boleh kosong.', 'error');
            return;
        }

        const checkboxes = document.querySelectorAll('input[name="selected_group_members"]:checked');
        const memberIds = Array.from(checkboxes).map(cb => Number(cb.value));

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Membuat...';
        }

        try {
            const res = await apiRequest('/groups', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    description,
                    member_ids: memberIds
                })
            });

            showToast(`Grup "${name}" berhasil dibuat!`, 'success');
            window.closeCreateGroupModal();
            await fetchGroups();
            if (res && res.id) {
                window.selectGroup(res.id);
            }
        } catch (err) {
            showToast('Gagal membuat grup: ' + err.message, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Buat Grup';
            }
        }
    };

    window.openAddGroupMemberModal = function () {
        if (!state.activeContact || !state.activeContact.is_group) return;
        const modal = document.getElementById('addGroupMemberModal');
        const searchInput = document.getElementById('searchAddMemberInput');
        if (searchInput) searchInput.value = '';

        renderAddMemberCandidatesList('');

        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
            if (searchInput) searchInput.focus();
        }
    };

    window.closeAddGroupMemberModal = function () {
        const modal = document.getElementById('addGroupMemberModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    };

    window.filterAddMemberCandidates = function (e) {
        const q = (e.target.value || '').toLowerCase().trim();
        renderAddMemberCandidatesList(q);
    };

    function renderAddMemberCandidatesList(filterText = '') {
        const listEl = document.getElementById('addMembersChecklist');
        if (!listEl) return;

        const currentGroup = state.groups.find(g => Number(g.id) === Number(state.activeContact?.group_id));
        const existingMemberIds = currentGroup && currentGroup.members
            ? currentGroup.members.map(m => Number(m.user_id))
            : [];

        // Currently selected checkboxes to preserve during search filter
        const currentlyChecked = new Set(
            Array.from(document.querySelectorAll('input[name="add_to_group_members"]:checked')).map(cb => Number(cb.value))
        );

        let candidates = (state.contacts || []).filter(c => !existingMemberIds.includes(Number(c.id)));
        if (filterText) {
            candidates = candidates.filter(c =>
                (c.display_name && c.display_name.toLowerCase().includes(filterText)) ||
                (c.username && c.username.toLowerCase().includes(filterText))
            );
        }

        if (candidates.length === 0) {
            listEl.innerHTML = `
                <div style="padding: 1.5rem 1rem; text-align: center; font-size: 0.8125rem; color: var(--text-muted);">
                    ${filterText ? 'Tidak ada kontak yang cocok dengan kata kunci.' : 'Semua teman di kontak Anda sudah menjadi anggota grup ini.'}
                </div>
            `;
            updateAddMemberSubmitCount();
            return;
        }

        listEl.innerHTML = candidates.map(c => {
            const initial = (c.display_name || c.username || 'U').charAt(0).toUpperCase();
            const isChecked = currentlyChecked.has(Number(c.id));
            return `
                <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.45rem 0.65rem; border-radius: 8px; cursor: pointer; transition: background 0.15s ease; background: var(--bg-surface-elevated, rgba(255,255,255,0.03)); border: 1px solid var(--border-subtle, rgba(255,255,255,0.06)); margin-bottom: 2px;">
                    <div style="display: flex; align-items: center; gap: 0.65rem;">
                        <div class="avatar-circle" style="width: 32px; height: 32px; font-size: 0.75rem; flex-shrink: 0; background: linear-gradient(135deg, rgba(124, 58, 237, 0.3), rgba(139, 92, 246, 0.15)); color: #c4b5fd;">${initial}</div>
                        <div>
                            <div style="font-size: 0.8125rem; font-weight: 600; color: var(--text-primary);">${escapeHtml(c.display_name)}</div>
                            <div style="font-size: 0.7rem; color: var(--text-muted);">@${escapeHtml(c.username)}</div>
                        </div>
                    </div>
                    <input type="checkbox" name="add_to_group_members" value="${c.id}" ${isChecked ? 'checked' : ''} onchange="updateAddMemberSubmitCount()" style="width: 17px; height: 17px; accent-color: var(--accent-primary); cursor: pointer;">
                </label>
            `;
        }).join('');

        updateAddMemberSubmitCount();
    }

    window.updateAddMemberSubmitCount = function () {
        const checkboxes = document.querySelectorAll('input[name="add_to_group_members"]:checked');
        const count = checkboxes.length;
        const submitBtn = document.getElementById('btnSubmitAddMembers');
        const badge = document.getElementById('addMemberSelectedBadge');
        if (badge) {
            badge.textContent = `${count} dipilih`;
        }
        if (submitBtn) {
            submitBtn.textContent = count > 0 ? `Tambahkan (${count})` : 'Tambahkan';
        }
    };

    window.handleAddGroupMembersSubmit = async function (e) {
        if (e) e.preventDefault();
        if (!state.activeContact || !state.activeContact.is_group) return;

        const groupId = state.activeContact.group_id;
        const checkboxes = document.querySelectorAll('input[name="add_to_group_members"]:checked');
        const userIds = Array.from(checkboxes).map(cb => Number(cb.value));

        if (userIds.length === 0) {
            showToast('Pilih setidaknya 1 kontak untuk ditambahkan.', 'info');
            return;
        }

        const submitBtn = document.getElementById('btnSubmitAddMembers');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Menambahkan...';
        }

        try {
            const res = await apiRequest(`/groups/${groupId}/members`, {
                method: 'POST',
                body: JSON.stringify({ user_ids: userIds })
            });

            showToast(res?.message || 'Anggota berhasil ditambahkan ke grup!', 'success');
            window.closeAddGroupMemberModal();
            await fetchGroups();
            const updatedGroup = state.groups.find(g => Number(g.id) === Number(groupId));
            if (updatedGroup) {
                state.activeContact = {
                    ...updatedGroup,
                    is_group: true,
                    id: 'group_' + groupId,
                    group_id: Number(groupId)
                };
                updateRightPanelForGroup(updatedGroup);
                const statusLabel = document.getElementById('activeUserOnlineStatus');
                if (statusLabel) {
                    statusLabel.textContent = `${updatedGroup.members_count || (updatedGroup.members ? updatedGroup.members.length : 1)} anggota`;
                }
            }
        } catch (err) {
            showToast('Gagal menambahkan anggota: ' + err.message, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Tambahkan';
            }
        }
    };

    window.handleRemoveGroupMember = async function (userId, memberName) {
        if (!state.activeContact || !state.activeContact.is_group) return;
        const groupId = state.activeContact.group_id;
        const groupName = state.activeContact.name || 'Grup';
        const displayName = memberName || 'anggota ini';
        const confirmed = window.confirm(`Apakah Anda yakin ingin mengeluarkan "${displayName}" dari grup "${groupName}"?`);
        if (!confirmed) return;

        try {
            const res = await apiRequest(`/groups/${groupId}/members/${userId}`, {
                method: 'DELETE'
            });
            showToast(res?.message || `"${displayName}" telah dikeluarkan dari grup.`, 'info');
            await fetchGroups();
            const updatedGroup = state.groups.find(g => Number(g.id) === Number(groupId));
            if (updatedGroup) {
                state.activeContact = {
                    ...updatedGroup,
                    is_group: true,
                    id: 'group_' + groupId,
                    group_id: Number(groupId)
                };
                updateRightPanelForGroup(updatedGroup);
                const statusLabel = document.getElementById('activeUserOnlineStatus');
                if (statusLabel) {
                    statusLabel.textContent = `${updatedGroup.members_count || (updatedGroup.members ? updatedGroup.members.length : 1)} anggota`;
                }
            }
        } catch (err) {
            showToast('Gagal mengeluarkan anggota: ' + err.message, 'error');
        }
    };

    window.openEditGroupModal = function () {
        window.closeChatDropdown();
        if (!state.activeContact || !state.activeContact.is_group) return;
        const currentGroup = state.groups.find(g => Number(g.id) === Number(state.activeContact.group_id));
        if (!currentGroup) return;

        const modal = document.getElementById('editGroupModal');
        const nameInput = document.getElementById('editGroupNameInput');
        const descInput = document.getElementById('editGroupDescInput');
        const avatarPreview = document.getElementById('editGroupAvatarPreview');
        const avatarFileInput = document.getElementById('editGroupAvatarFile');
        const fileNameEl = document.getElementById('editGroupAvatarFileName');

        if (nameInput) nameInput.value = currentGroup.name || '';
        if (descInput) descInput.value = currentGroup.description || '';
        if (avatarFileInput) avatarFileInput.value = '';
        if (fileNameEl) fileNameEl.textContent = '';

        if (avatarPreview) {
            if (currentGroup.avatar) {
                avatarPreview.innerHTML = `<img src="${escapeHtml(currentGroup.avatar)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            } else {
                avatarPreview.innerHTML = `
                    <div class="avatar-circle avatar-pastel-purple" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                    </div>
                `;
            }
        }

        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
            if (nameInput) nameInput.focus();
        }
    };

    window.closeEditGroupModal = function () {
        const modal = document.getElementById('editGroupModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    };

    window.previewGroupAvatar = function (e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast('Ukuran gambar maksimal 5MB.', 'error');
            e.target.value = '';
            return;
        }
        const fileNameEl = document.getElementById('editGroupAvatarFileName');
        if (fileNameEl) fileNameEl.textContent = file.name;

        const reader = new FileReader();
        reader.onload = function (evt) {
            const preview = document.getElementById('editGroupAvatarPreview');
            if (preview) {
                preview.innerHTML = `<img src="${evt.target.result}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            }
        };
        reader.readAsDataURL(file);
    };

    window.handleEditGroupSubmit = async function (e) {
        if (e) e.preventDefault();
        if (!state.activeContact || !state.activeContact.is_group) return;

        const groupId = state.activeContact.group_id;
        const nameInput = document.getElementById('editGroupNameInput');
        const descInput = document.getElementById('editGroupDescInput');
        const avatarFileInput = document.getElementById('editGroupAvatarFile');
        const submitBtn = document.getElementById('btnSubmitEditGroup');

        const name = (nameInput ? nameInput.value : '').trim();
        const description = (descInput ? descInput.value : '').trim();

        if (!name) {
            showToast('Nama grup tidak boleh kosong.', 'error');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Menyimpan...';
        }

        try {
            let res;
            const file = avatarFileInput && avatarFileInput.files ? avatarFileInput.files[0] : null;

            if (file) {
                const formData = new FormData();
                formData.append('name', name);
                formData.append('description', description);
                formData.append('avatar', file);

                const token = localStorage.getItem('zchat_token');
                const response = await fetch(`${API_BASE}/groups/${groupId}`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.message || 'Gagal memperbarui profil grup');
                }
                res = await response.json();
            } else {
                res = await apiRequest(`/groups/${groupId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ name, description })
                });
            }

            showToast('Detail grup berhasil diperbarui!', 'success');
            window.closeEditGroupModal();

            await fetchGroups();
            const updatedGroup = state.groups.find(g => Number(g.id) === Number(groupId));
            if (updatedGroup) {
                state.activeContact = {
                    ...updatedGroup,
                    is_group: true,
                    id: 'group_' + groupId,
                    group_id: Number(groupId)
                };
                const headerName = document.getElementById('activeChatDisplayName');
                if (headerName) headerName.textContent = updatedGroup.name;

                const activeAvatarEl = document.getElementById('activeAvatarCircle');
                if (activeAvatarEl) {
                    if (updatedGroup.avatar) {
                        activeAvatarEl.className = 'avatar-circle';
                        activeAvatarEl.style.overflow = 'hidden';
                        activeAvatarEl.innerHTML = `<img src="${escapeHtml(updatedGroup.avatar)}" alt="${escapeHtml(updatedGroup.name)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                    } else {
                        activeAvatarEl.className = 'avatar-circle avatar-pastel-purple';
                        activeAvatarEl.style.overflow = 'hidden';
                        activeAvatarEl.innerHTML = `
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        `;
                    }
                }

                updateRightPanelForGroup(updatedGroup);
                renderChatsList();
            }
        } catch (err) {
            showToast('Gagal mengubah grup: ' + err.message, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Simpan Perubahan';
            }
        }
    };

    window.handleLeaveGroup = async function () {
        if (!state.activeContact || !state.activeContact.is_group) return;
        const groupId = state.activeContact.group_id;
        const confirmed = window.confirm(`Apakah Anda yakin ingin keluar dari grup "${state.activeContact.name}"?`);
        if (!confirmed) return;

        try {
            await apiRequest(`/groups/${groupId}/members/${state.user.id}`, {
                method: 'DELETE'
            });
            showToast('Anda telah keluar dari grup.', 'info');
            window.closeActiveChat();
            await fetchGroups();
        } catch (err) {
            showToast('Gagal keluar dari grup: ' + err.message, 'error');
        }
    };

    window.handleDeleteGroup = async function () {
        if (!state.activeContact || !state.activeContact.is_group) return;
        const groupId = state.activeContact.group_id;
        const confirmed = window.confirm(`PERINGATAN: Bubarkan grup "${state.activeContact.name}" untuk semua anggota? Tindakan ini tidak dapat dibatalkan.`);
        if (!confirmed) return;

        try {
            await apiRequest(`/groups/${groupId}`, {
                method: 'DELETE'
            });
            showToast('Grup telah dibubarkan.', 'info');
            window.closeActiveChat();
            await fetchGroups();
        } catch (err) {
            showToast('Gagal membubarkan grup: ' + err.message, 'error');
        }
    };

    window.closeActiveChat = function () {
        window.closeChatDropdown();
        clearMyTypingState();
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
            const isGroup = Boolean(state.activeContact && state.activeContact.is_group);
            const infoLabel = document.getElementById('menuItemInfoLabel');
            const editGrpItem = document.getElementById('menuItemEditGroup');
            const addMemItem = document.getElementById('menuItemAddMember');

            if (infoLabel) {
                infoLabel.textContent = isGroup ? 'Informasi Grup' : 'Informasi Kontak';
            }

            const isAdmin = isGroup && (state.activeContact.my_role === 'admin' || Number(state.activeContact.created_by) === Number(state.user?.id));

            if (editGrpItem) editGrpItem.style.display = (isGroup && isAdmin) ? 'flex' : 'none';
            if (addMemItem) addMemItem.style.display = (isGroup && isAdmin) ? 'flex' : 'none';

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
        const avatarEl = document.getElementById('contactModalAvatarCircle') || document.getElementById('infoAvatarCircle');
        const dotEl = document.getElementById('contactModalStatusDot') || document.getElementById('infoStatusDot');
        const nameEl = document.getElementById('contactModalDisplayName') || document.getElementById('infoDisplayName');
        const userEl = document.getElementById('contactModalUsername') || document.getElementById('infoUsername');
        const badgeEl = document.getElementById('contactModalStatusBadge') || document.getElementById('infoStatusBadge');
        const statusTextEl = document.getElementById('contactModalStatusText') || document.getElementById('infoStatusText');
        const presenceEl = document.getElementById('contactModalPresenceText') || document.getElementById('infoPresenceText');
        const joinedEl = document.getElementById('contactModalJoinedDate') || document.getElementById('infoJoinedDate');
        const msgsEl = document.getElementById('contactModalTotalMessages') || document.getElementById('infoTotalMessages');

        if (avatarEl) {
            if (contact.avatar) {
                avatarEl.innerHTML = `<img src="${escapeHtml(contact.avatar)}" alt="${escapeHtml(contact.display_name)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`;
                avatarEl.style.overflow = 'hidden';
            } else {
                avatarEl.textContent = initial;
                avatarEl.style.overflow = '';
            }
        }
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
        AppDB.clearContactChat(state.activeContact.id);
        persistMessages();
        renderActiveMessages();
        renderChatsList();
        showToast('Riwayat obrolan telah dibersihkan dari perangkat Anda.', 'info');
    };

    window.confirmDeleteContact = async function (targetId = null) {
        window.closeChatDropdown();

        const contactId = targetId ? Number(targetId) : (state.activeContact ? state.activeContact.id : null);
        if (!contactId) return;

        const targetContact = state.contacts.find(c => c.id === contactId) || state.activeContact;
        const targetName = targetContact ? (targetContact.display_name || targetContact.username) : 'kontak ini';

        const confirmed = window.confirm(`Hapus "${targetName}" dari daftar kontak Anda? Hubungan kontak akan dihapus.`);
        if (!confirmed) return;

        try {
            await apiRequest(`/contacts/${contactId}`, { method: 'DELETE' });

            state.contacts = state.contacts.filter(c => c.id !== contactId);

            if (state.activeContact && state.activeContact.id === contactId) {
                window.closeActiveChat();
                const panel = document.getElementById('chatInfoPanel');
                if (panel) panel.classList.remove('open');
            }

            window.closeContactInfoModal();
            renderContactsList();
            renderChatsList();
            updateUnreadBadges();

            showToast(`Kontak "${targetName}" berhasil dihapus.`, 'success');
        } catch (err) {
            console.error('Gagal menghapus kontak:', err);
            showToast(err.message || 'Gagal menghapus kontak.', 'error');
        }
    };

    function parseMessageTime(val) {
        if (!val) return Date.now();
        if (typeof val === 'number') return val;
        const str = String(val).replace(' ', 'T');
        const parsed = Date.parse(str);
        return isNaN(parsed) ? Date.now() : parsed;
    }

    function shouldGroupMessages(prevMsg, currMsg) {
        if (!prevMsg || !currMsg) return false;
        if (Number(prevMsg.sender_id) !== Number(currMsg.sender_id)) return false;

        const prevTime = parseMessageTime(prevMsg.created_at);
        const currTime = parseMessageTime(currMsg.created_at);
        const diffMinutes = Math.abs((currTime - prevTime) / (1000 * 60));

        // Nyatu jika dalam rentang 3 menit oleh pengirim yang sama
        return diffMinutes <= 3;
    }

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

        const encryptionBannerHtml = `
            <div class="e2ee-encryption-banner" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin: 0.5rem auto 1rem; padding: 0.45rem 0.95rem; border-radius: 999px; background: rgba(124, 58, 237, 0.08); border: 1px solid rgba(124, 58, 237, 0.2); font-size: 0.72rem; color: var(--text-muted); text-align: center; max-width: 90%;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span>Pesan dalam obrolan ini diamankan dengan enkripsi end-to-end.</span>
            </div>
        `;

        const dateDividerHtml = `
            <div class="date-divider">
                <span class="date-divider-text">HARI INI</span>
            </div>
        `;

        container.innerHTML = encryptionBannerHtml + dateDividerHtml + messages.map((msg, idx) => {
            const isMe = Boolean(state.user && msg.sender_id === state.user.id);
            const rowClass = isMe ? 'me' : 'other';
            const timeText = formatTime(msg.created_at);
            const statusMarker = isMe ? renderStatusCheck(msg.status) : '';
            const isDeleted = Boolean(msg.is_deleted) || msg.body === 'Pesan ini telah dihapus';
            const isEdited = Boolean(msg.is_edited) && !isDeleted;
            const msgIdentifier = msg.id ? String(msg.id) : (msg.client_uuid || '');
            const safeIdAttr = escapeHtml(msgIdentifier);

            // Grouping logic ala WhatsApp (berdempet jika <= 3 menit oleh pengirim yang sama)
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;

            const isGroupedWithPrev = shouldGroupMessages(prevMsg, msg);
            const isGroupedWithNext = shouldGroupMessages(msg, nextMsg);

            let groupClass = 'msg-group-single';
            if (isGroupedWithPrev && isGroupedWithNext) {
                groupClass = 'msg-group-middle';
            } else if (isGroupedWithPrev && !isGroupedWithNext) {
                groupClass = 'msg-group-last';
            } else if (!isGroupedWithPrev && isGroupedWithNext) {
                groupClass = 'msg-group-first';
            }

            if (isDeleted) {
                return `
                    <div class="message-row ${rowClass} ${groupClass}" data-msg-id="${safeIdAttr}">
                        <div class="message-bubble-wrapper">
                            <div class="message-bubble deleted">
                                <span class="bubble-content" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; opacity: 0.7;">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                    </svg>
                                    <span>Pesan ini telah dihapus</span>
                                </span>
                                <span class="bubble-meta">
                                    <span class="meta-time">${timeText}</span>
                                    ${statusMarker}
                                </span>
                            </div>
                        </div>
                    </div>
                `;
            }

            // Quoted reply snippet
            let quoteHtml = '';
            if (msg.reply_to && !isDeleted) {
                const targetReplyId = escapeHtml(msg.reply_to.id || msg.reply_to.client_uuid || '');
                const isRepliedAuthorMe = state.user && Number(msg.reply_to.sender_id) === Number(state.user.id);
                const authorName = isRepliedAuthorMe ? 'Anda' : escapeHtml(msg.reply_to.sender_name || 'Balasan');
                const snippetText = escapeHtml((msg.reply_to.body || '[Lampiran]').substring(0, 75));
                quoteHtml = `
                    <div class="bubble-quote-card" onclick="scrollToMessage('${targetReplyId}')" role="button" tabindex="0" title="Loncat ke pesan asal">
                        <span class="bubble-quote-author">${authorName}</span>
                        <span class="bubble-quote-snippet">${snippetText}</span>
                    </div>
                `;
            }

            // Attachment rendering with image detection and legacy fallback
            let attachmentHtml = '';
            let att = msg.attachment;

            if (!att && msg.body && msg.body.startsWith('[Berkas:') && !isDeleted) {
                const match = msg.body.match(/^\[Berkas:\s*(.+?)\]$/);
                if (match) {
                    const fileName = match[1];
                    const isImg = Boolean(fileName.match(/\.(jpeg|jpg|png|gif|webp|svg)$/i));
                    att = {
                        name: fileName,
                        url: `/uploads/chat/${encodeURIComponent(fileName)}`,
                        type: isImg ? 'image/jpeg' : 'application/octet-stream'
                    };
                }
            }

            if (att && !isDeleted) {
                const fileUrl = att.url || att.dataUrl || '#';
                const isImage = (att.type && att.type.startsWith('image/')) || (att.name && att.name.match(/\.(jpeg|jpg|png|gif|webp|svg)$/i));

                if (isImage) {
                    attachmentHtml = `
                        <div class="bubble-attachment-image">
                            <a href="${fileUrl}" target="_blank" rel="noopener noreferrer" title="Buka gambar penuh">
                                <img src="${fileUrl}" alt="${escapeHtml(att.name || 'Gambar')}" loading="lazy">
                            </a>
                        </div>
                    `;
                } else {
                    attachmentHtml = `
                        <a class="bubble-attachment-file" href="${fileUrl}" download="${escapeHtml(att.name || 'berkas')}" title="Unduh berkas">
                            <div class="bubble-file-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                </svg>
                            </div>
                            <div class="bubble-file-details">
                                <span class="bubble-file-name">${escapeHtml(att.name || 'Dokumen')}</span>
                                <span class="bubble-file-size">${formatFileSize(att.size)}</span>
                            </div>
                        </a>
                    `;
                }
            }

            let renderedBody = '';
            const isPlaceholderBody = att && msg.body && (msg.body === `[Berkas: ${att.name}]` || msg.body.startsWith('[Berkas:'));
            if (!isPlaceholderBody && msg.body) {
                let safeBody = escapeHtml(msg.body).replace(/\n/g, '<br>');
                if (state.inChatSearchQuery && !isDeleted) {
                    try {
                        const regex = new RegExp(`(${escapeRegex(state.inChatSearchQuery)})`, 'gi');
                        safeBody = safeBody.replace(regex, '<mark class="chat-search-highlight">$1</mark>');
                    } catch (e) { }
                }
                renderedBody = `<span class="bubble-content">${safeBody}</span>`;
            }

            let reactionsHtml = '';
            if (msg.reactions && typeof msg.reactions === 'object' && Object.keys(msg.reactions).length > 0 && !isDeleted) {
                const currentName = state.user ? (state.user.display_name || state.user.username) : '';
                reactionsHtml = `
                    <div class="message-reactions-row">
                        ${Object.entries(msg.reactions).map(([em, users]) => {
                    const isMyReaction = users.includes(currentName);
                    return `
                                <button type="button" class="reaction-pill ${isMyReaction ? 'active' : ''}" onclick="toggleMessageReaction('${safeIdAttr}', '${em}')" title="${escapeHtml(users.join(', '))}">
                                    <span>${em}</span>
                                    <span class="reaction-count">${users.length}</span>
                                </button>
                            `;
                }).join('')}
                    </div>
                `;
            }

            let groupSenderHtml = '';
            if (state.activeContact && state.activeContact.is_group && !isMe) {
                const sName = msg.sender_name || 'Anggota';
                groupSenderHtml = `<div class="group-msg-sender" style="font-size: 0.75rem; font-weight: 700; color: #a78bfa; margin-bottom: 3px;">${escapeHtml(sName)}</div>`;
            }

            return `
                <div class="message-row ${rowClass} ${groupClass}" data-msg-id="${safeIdAttr}">
                    <div class="message-bubble-wrapper">
                        <div class="message-bubble" ondblclick="startReplyMessage('${safeIdAttr}')" title="Klik 2x untuk membalas">
                            ${groupSenderHtml}
                            ${quoteHtml}
                            ${attachmentHtml}
                            ${renderedBody}
                            ${isEdited ? '<span class="edited-label">(diedit)</span>' : ''}
                            <span class="bubble-meta">
                                <span class="meta-time">${timeText}</span>
                                ${statusMarker}
                            </span>
                            ${reactionsHtml}
                        </div>
                        <div class="message-actions" role="toolbar" aria-label="Aksi pesan">
                            <button type="button" class="btn-msg-action" onclick="startReplyMessage('${safeIdAttr}')" title="Balas pesan" aria-label="Balas pesan">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="9 17 4 12 9 7"></polyline>
                                    <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
                                </svg>
                            </button>
                            <button type="button" class="btn-msg-action" onclick="toggleMessageReaction('${safeIdAttr}', '👍')" title="Suka" aria-label="Suka">👍</button>
                            <button type="button" class="btn-msg-action" onclick="toggleMessageReaction('${safeIdAttr}', '❤️')" title="Cinta" aria-label="Cinta">❤️</button>
                            ${isMe ? `
                                <button type="button" class="btn-msg-action" onclick="startEditMessage('${safeIdAttr}')" title="Edit pesan" aria-label="Edit pesan">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <button type="button" class="btn-msg-action danger" onclick="confirmDeleteMessage('${safeIdAttr}')" title="Hapus pesan" aria-label="Hapus pesan">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Auto scroll to latest message
        container.scrollTop = container.scrollHeight;

        if (state.activeContact) {
            updateRightPanelMediaAndDocs(state.activeContact.id);
        }
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

    function clearMyTypingState() {
        clearTimeout(state.myTypingTimeout);
        if (state.isCurrentlyTyping && state.activeContact) {
            state.isCurrentlyTyping = false;
            apiRequest('/typing', {
                method: 'POST',
                body: JSON.stringify({ receiver_id: state.activeContact.id, is_typing: false })
            }).catch(() => { });
        }
    }

    window.handleMessageInput = function (e) {
        if (!state.activeContact) return;

        const now = Date.now();
        if (now - state.lastTypingSentAt > 2000) {
            state.lastTypingSentAt = now;
            state.isCurrentlyTyping = true;
            apiRequest('/typing', {
                method: 'POST',
                body: JSON.stringify({ receiver_id: state.activeContact.id, is_typing: true })
            }).catch(() => { });
        }

        clearTimeout(state.myTypingTimeout);
        state.myTypingTimeout = setTimeout(() => {
            if (state.isCurrentlyTyping && state.activeContact) {
                state.isCurrentlyTyping = false;
                apiRequest('/typing', {
                    method: 'POST',
                    body: JSON.stringify({ receiver_id: state.activeContact.id, is_typing: false })
                }).catch(() => { });
            }
        }, 2500);
    };

    function setContactTyping(contactId, isTyping) {
        contactId = Number(contactId);
        if (!state.typingUsers) state.typingUsers = {};
        if (!state.typingTimers) state.typingTimers = {};

        state.typingUsers[contactId] = Boolean(isTyping);

        if (state.activeContact && Number(state.activeContact.id) === contactId) {
            const typingBadge = document.getElementById('activeTypingStatus');
            const typingNameText = document.getElementById('activeTypingNameText');
            const statusLabel = document.getElementById('activeUserOnlineStatus');
            if (typingBadge) {
                typingBadge.style.display = isTyping ? 'inline-flex' : 'none';
            }
            if (typingNameText && isTyping) {
                const partnerName = state.activeContact.display_name || state.activeContact.name || state.activeContact.username || 'Kontak';
                typingNameText.textContent = `${partnerName} sedang mengetik`;
            }
            if (statusLabel) {
                statusLabel.style.display = isTyping ? 'none' : 'inline';
            }
        }

        renderChatsList();

        if (state.typingTimers[contactId]) {
            clearTimeout(state.typingTimers[contactId]);
        }

        if (isTyping) {
            state.typingTimers[contactId] = setTimeout(() => {
                state.typingUsers[contactId] = false;
                if (state.activeContact && Number(state.activeContact.id) === contactId) {
                    const typingBadge = document.getElementById('activeTypingStatus');
                    const statusLabel = document.getElementById('activeUserOnlineStatus');
                    if (typingBadge) typingBadge.style.display = 'none';
                    if (statusLabel) statusLabel.style.display = 'inline';
                }
                renderChatsList();
            }, 3500);
        }
    }

    window.handleSendMessage = async function (e) {
        if (e) e.preventDefault();
        if (!state.activeContact) return;

        const textarea = document.getElementById('messageInput');
        const body = (textarea ? textarea.value : '').trim();
        const hasAttachment = Boolean(state.selectedAttachment);
        if (!body && !hasAttachment) return;

        clearMyTypingState();

        if (state.editingMessageId) {
            await handleUpdateMessage(state.editingMessageId, body);
            return;
        }

        const clientUuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : 'uuid-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

        // Upload lampiran jika belum memiliki url publik
        let finalAttachment = null;
        if (state.selectedAttachment) {
            if (state.selectedAttachment.url) {
                finalAttachment = {
                    url: state.selectedAttachment.url,
                    name: state.selectedAttachment.name,
                    size: state.selectedAttachment.size,
                    type: state.selectedAttachment.type
                };
            } else if (state.selectedAttachment.uploadPromise) {
                const res = await state.selectedAttachment.uploadPromise.catch(() => null);
                if (res && res.url) {
                    finalAttachment = {
                        url: res.url,
                        name: res.name || state.selectedAttachment.name,
                        size: res.size || state.selectedAttachment.size,
                        type: res.type || state.selectedAttachment.type
                    };
                }
            } else if (state.selectedAttachment.fileObj) {
                const res = await uploadAttachmentFile(state.selectedAttachment.fileObj).catch(() => null);
                if (res && res.url) {
                    finalAttachment = {
                        url: res.url,
                        name: res.name || state.selectedAttachment.name,
                        size: res.size || state.selectedAttachment.size,
                        type: res.type || state.selectedAttachment.type
                    };
                }
            }

            if (!finalAttachment && state.selectedAttachment.dataUrl) {
                finalAttachment = {
                    url: state.selectedAttachment.dataUrl,
                    name: state.selectedAttachment.name,
                    size: state.selectedAttachment.size,
                    type: state.selectedAttachment.type
                };
            }
        }

        const replyData = state.replyingTo ? {
            id: state.replyingTo.id || state.replyingTo.client_uuid,
            client_uuid: state.replyingTo.client_uuid,
            sender_id: state.replyingTo.sender_id,
            sender_name: Number(state.replyingTo.sender_id) === Number(state.user.id)
                ? (state.user.display_name || state.user.username)
                : (state.activeContact.display_name || state.activeContact.username),
            body: state.replyingTo.body
        } : null;

        const messageBody = body || (finalAttachment ? `[Berkas: ${finalAttachment.name}]` : '');

        if (state.activeContact.is_group) {
            const groupId = state.activeContact.group_id;
            const chatKey = 'group_' + groupId;
            const newMsg = {
                id: null,
                client_uuid: clientUuid,
                group_id: groupId,
                sender_id: state.user.id,
                sender_name: state.user.display_name || state.user.username,
                body: messageBody,
                reply_to: replyData,
                attachment: finalAttachment,
                status: 'sent',
                is_edited: false,
                is_deleted: false,
                created_at: new Date().toISOString()
            };

            if (!state.chats[chatKey]) state.chats[chatKey] = [];
            state.chats[chatKey].push(newMsg);
            persistMessages();
            renderActiveMessages();
            renderChatsList();

            textarea.value = '';
            textarea.style.height = 'auto';
            window.cancelReplyMessage();
            window.cancelAttachment();

            try {
                const hexKey = state.activeContact.group_key;
                const encryptedPayload = await encryptMessageBody(messageBody, hexKey);

                const savedMsg = await apiRequest(`/groups/${groupId}/messages`, {
                    method: 'POST',
                    body: JSON.stringify({
                        client_uuid: clientUuid,
                        body: encryptedPayload,
                        attachment: finalAttachment,
                        reply_to: replyData
                    })
                });

                if (savedMsg && savedMsg.id) {
                    const target = state.chats[chatKey].find(m => m.client_uuid === clientUuid);
                    if (target) {
                        target.id = savedMsg.id;
                        await AppDB.saveMessage({ ...target, group_id: groupId }, state.user.id);
                        persistMessages();
                        renderActiveMessages();
                    }
                }
            } catch (err) {
                showToast('Gagal mengirim pesan ke grup: ' + err.message, 'error');
            }
            return;
        }

        const newMsg = {
            id: null,
            client_uuid: clientUuid,
            sender_id: state.user.id,
            receiver_id: state.activeContact.id,
            body: messageBody,
            reply_to: replyData,
            attachment: finalAttachment,
            reactions: {},
            status: 'sent',
            is_edited: false,
            is_deleted: false,
            created_at: new Date().toISOString()
        };

        if (!state.chats[state.activeContact.id]) {
            state.chats[state.activeContact.id] = [];
        }
        state.chats[state.activeContact.id].push(newMsg);
        persistMessages();
        renderActiveMessages();
        renderChatsList();

        textarea.value = '';
        textarea.style.height = 'auto';

        window.cancelReplyMessage();
        window.cancelAttachment();

        try {
            const hexKey = getConversationKeyForContact(state.activeContact.id);
            const encryptedPayload = await encryptMessageBody(messageBody, hexKey);

            const savedMsg = await apiRequest('/messages', {
                method: 'POST',
                body: JSON.stringify({
                    client_uuid: clientUuid,
                    receiver_id: state.activeContact.id,
                    body: encryptedPayload,
                    attachment: finalAttachment,
                    reply_to: replyData
                })
            });

            if (savedMsg && savedMsg.id) {
                const target = state.chats[state.activeContact.id].find(m => m.client_uuid === clientUuid);
                if (target) {
                    target.id = savedMsg.id;
                    target.status = savedMsg.status || 'sent';
                    if (savedMsg.attachment) target.attachment = savedMsg.attachment;
                    if (savedMsg.reply_to) target.reply_to = savedMsg.reply_to;
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
        const chatKey = state.activeContact.is_group ? ('group_' + state.activeContact.group_id) : state.activeContact.id;
        const msgs = state.chats[chatKey] || [];
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

        const chatKey = state.activeContact.is_group ? ('group_' + state.activeContact.group_id) : state.activeContact.id;
        const msgs = state.chats[chatKey] || [];
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
            if (state.activeContact.is_group) {
                const hexKey = state.activeContact.group_key;
                const encryptedBody = await encryptMessageBody(newBody, hexKey);
                await apiRequest(`/groups/${state.activeContact.group_id}/messages/${idToCall}`, {
                    method: 'PUT',
                    body: JSON.stringify({ body: encryptedBody })
                });
                showToast('Pesan grup berhasil diedit.', 'success');
                return;
            }

            const hexKey = getConversationKeyForContact(state.activeContact.id);
            const encryptedBody = await encryptMessageBody(newBody, hexKey);

            const res = await apiRequest(`/messages/${idToCall}`, {
                method: 'PUT',
                body: JSON.stringify({
                    body: encryptedBody,
                    receiver_id: state.activeContact.id,
                    client_uuid: target.client_uuid
                })
            });

            if (res) {
                if (res.id && !target.id) target.id = res.id;
                target.body = newBody;
                target.is_edited = true;
                persistMessages();
                renderActiveMessages();
                renderChatsList();
            }
            showToast('Pesan berhasil diedit.', 'success');
        } catch (err) {
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

        const chatKey = state.activeContact.is_group ? ('group_' + state.activeContact.group_id) : state.activeContact.id;
        const msgs = state.chats[chatKey] || [];
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
            if (state.activeContact.is_group) {
                await apiRequest(`/groups/${state.activeContact.group_id}/messages/${idToCall}`, {
                    method: 'DELETE'
                });
                showToast('Pesan grup berhasil dihapus.', 'info');
                return;
            }

            await apiRequest(`/messages/${idToCall}`, {
                method: 'DELETE',
                body: JSON.stringify({
                    receiver_id: state.activeContact.id,
                    client_uuid: target.client_uuid
                })
            });
            showToast('Pesan berhasil dihapus.', 'info');
        } catch (err) {
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

            for (const msg of pendingList) {
                const partnerId = msg.sender_id;
                const hexKey = getConversationKeyForContact(partnerId);
                if (msg.body && msg.body.startsWith('enc:v1:')) {
                    msg.body = await decryptMessageBody(msg.body, hexKey);
                }

                if (!state.chats[partnerId]) {
                    state.chats[partnerId] = [];
                }

                // Cek apakah pesan sudah ada berdasarkan client_uuid atau ID
                const existingMsg = state.chats[partnerId].find(
                    m => (m.client_uuid && m.client_uuid === msg.client_uuid) || (m.id && m.id === msg.id)
                );

                const isCurrentActive = state.activeContact && state.activeContact.id === partnerId;

                if (!existingMsg) {
                    playMessageChime();
                    if (isCurrentActive) {
                        msg.status = 'read';
                        state.chats[partnerId].push(msg);
                        readAckIds.push(msg.id);
                        activeUpdated = true;
                    } else {
                        msg.status = 'delivered';
                        state.chats[partnerId].push(msg);
                        deliveredAckIds.push(msg.id);

                        state.unread[partnerId] = (state.unread[partnerId] || 0) + 1;
                        const sender = state.contacts.find(c => c.id === partnerId);
                        const senderName = sender ? sender.display_name : 'Seseorang';
                        showToast(`Pesan baru dari ${senderName}: "${msg.body.substring(0, 40)}"`, 'info');

                        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                            try {
                                new Notification(senderName, {
                                    body: msg.body.substring(0, 80),
                                    icon: '/favicon.ico'
                                });
                            } catch (e) { }
                        }
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
            }

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
                    }).catch(() => { });
                }

                if (deliveredAckIds.length > 0) {
                    await apiRequest('/messages/ack', {
                        method: 'POST',
                        body: JSON.stringify({
                            message_ids: deliveredAckIds,
                            status: 'delivered'
                        })
                    }).catch(() => { });
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
            for (const u of updates) {
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
                            let decryptedBody = u.body;
                            if (u.body.startsWith('enc:v1:')) {
                                const hexKey = getConversationKeyForContact(partnerId);
                                decryptedBody = await decryptMessageBody(u.body, hexKey);
                            }
                            if (msg.body !== decryptedBody) {
                                msg.body = decryptedBody;
                                msgChanged = true;
                            }
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
            }

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
            await apiRequest('/heartbeat', { method: 'POST' }).catch(() => { });
        } catch (e) {
            // Abaikan error heartbeat di background
        }
    }

    async function checkActiveContactTyping() {
        if (!state.token || !state.activeContact) return;
        try {
            const res = await apiRequest(`/typing-status?contact_id=${state.activeContact.id}`);
            if (res && res.contact_id) {
                setContactTyping(res.contact_id, res.is_typing);
            }
        } catch (e) { }
    }

    function initWebSocket() {
        if (!state.token || !state.user || typeof Pusher === 'undefined') return;
        if (state.reverbSocket) return;

        try {
            const host = window.location.hostname;
            const isHttps = window.location.protocol === 'https:';

            state.reverbSocket = new Pusher('qguotkg6438cbendsfti', {
                wsHost: host,
                wsPort: isHttps ? 443 : 80,
                wssPort: 443,
                forceTLS: isHttps,
                enabledTransports: ['ws', 'wss'],
                activityTimeout: 25000,
                pongTimeout: 10000,
                channelAuthorization: {
                    endpoint: '/api/broadcasting/auth',
                    headers: {
                        Authorization: 'Bearer ' + state.token,
                        Accept: 'application/json'
                    }
                },
                authEndpoint: '/api/broadcasting/auth',
                auth: {
                    headers: {
                        Authorization: 'Bearer ' + state.token,
                        Accept: 'application/json'
                    }
                }
            });

            state.reverbSocket.connection.bind('state_change', (states) => {
                if (states.current === 'unavailable' || states.current === 'failed') {
                    setTimeout(() => {
                        try { state.reverbSocket.connect(); } catch (e) { }
                    }, 2000);
                }
            });

            const channelName = 'private-chat.' + state.user.id;
            const channel = state.reverbSocket.subscribe(channelName);

            channel.bind('group.message.sent', async (data) => {
                const msg = data.message || data;
                await handleIncomingGroupMessage(msg);
            });

            channel.bind('group.message.updated', async (data) => {
                const msg = data.message || data;
                await handleUpdatedGroupMessage(msg);
            });

            channel.bind('message.sent', async (data) => {
                const msg = data.message || data;
                await handleIncomingDirectMessage(msg);
            });

            const onVoiceSignal = async (rawSignal) => {
                let signal = rawSignal;
                if (typeof signal === 'string') {
                    try { signal = JSON.parse(signal); } catch (e) { }
                }
                if (signal && typeof signal.data === 'string') {
                    try { signal.data = JSON.parse(signal.data); } catch (e) { }
                }
                await handleIncomingVoiceSignal(signal);
            };

            channel.bind('voice.signal', onVoiceSignal);
            channel.bind('.voice.signal', onVoiceSignal);
        } catch (e) {
            console.warn('Reverb WebSocket initialization error:', e);
        }
    }

    async function handleIncomingGroupMessage(msg) {
        if (!msg || !msg.group_id) return;
        const groupId = msg.group_id;
        const chatKey = 'group_' + groupId;

        let hexKey = state.conversationKeys[chatKey];
        if (!hexKey) {
            const grp = (state.groups || []).find(g => Number(g.id) === Number(groupId));
            if (grp && grp.group_key) {
                hexKey = grp.group_key;
                state.conversationKeys[chatKey] = hexKey;
            } else {
                await fetchGroups();
                hexKey = state.conversationKeys[chatKey];
            }
        }

        if (msg.body && msg.body.startsWith('enc:v1:') && hexKey) {
            msg.body = await decryptMessageBody(msg.body, hexKey);
        }

        if (!state.chats[chatKey]) state.chats[chatKey] = [];

        const exists = state.chats[chatKey].find(
            x => (x.client_uuid && x.client_uuid === msg.client_uuid) || (x.id && x.id === msg.id)
        );

        if (!exists) {
            state.chats[chatKey].push(msg);
            await AppDB.saveMessage(msg, state.user.id);

            const isCurrentActive = state.activeContact && state.activeContact.is_group && Number(state.activeContact.group_id) === Number(groupId);

            if (isCurrentActive) {
                renderActiveMessages();
                if (Number(msg.sender_id) !== Number(state.user.id)) {
                    playMessageChime();
                }
            } else {
                if (Number(msg.sender_id) !== Number(state.user.id)) {
                    state.unread[chatKey] = (state.unread[chatKey] || 0) + 1;
                    playMessageChime();
                    const group = (state.groups || []).find(g => Number(g.id) === Number(groupId));
                    const groupName = group ? group.name : 'Grup';
                    showToast(`Pesan baru di ${groupName} dari ${msg.sender_name}: "${msg.body.substring(0, 40)}"`, 'info');

                    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                        try {
                            new Notification(groupName, {
                                body: `${msg.sender_name}: ${msg.body.substring(0, 80)}`,
                                icon: '/favicon.ico'
                            });
                        } catch (e) { }
                    }
                }
            }

            renderChatsList();
        }
    }

    async function handleUpdatedGroupMessage(msg) {
        if (!msg || !msg.group_id) return;
        const chatKey = 'group_' + msg.group_id;
        const list = state.chats[chatKey];
        if (!list) return;

        const existing = list.find(x => (x.client_uuid && x.client_uuid === msg.client_uuid) || (x.id && x.id === msg.id));
        if (existing) {
            let hexKey = state.conversationKeys[chatKey];
            if (msg.body && msg.body.startsWith('enc:v1:') && hexKey) {
                msg.body = await decryptMessageBody(msg.body, hexKey);
            }
            existing.body = msg.body;
            existing.is_edited = Boolean(msg.is_edited);
            existing.is_deleted = Boolean(msg.is_deleted);
            await AppDB.saveMessage(existing, state.user.id);

            const isCurrentActive = state.activeContact && state.activeContact.is_group && Number(state.activeContact.group_id) === Number(msg.group_id);
            if (isCurrentActive) {
                renderActiveMessages();
            }
            renderChatsList();
        }
    }

    async function handleIncomingDirectMessage(msg) {
        if (!msg || !msg.sender_id) return;
        const partnerId = Number(msg.sender_id);
        const hexKey = getConversationKeyForContact(partnerId);

        if (msg.body && msg.body.startsWith('enc:v1:')) {
            msg.body = await decryptMessageBody(msg.body, hexKey);
        }

        if (!state.chats[partnerId]) state.chats[partnerId] = [];

        const existing = state.chats[partnerId].find(
            m => (m.client_uuid && m.client_uuid === msg.client_uuid) || (m.id && m.id === msg.id)
        );

        if (!existing) {
            const isCurrentActive = state.activeContact && !state.activeContact.is_group && Number(state.activeContact.id) === partnerId;
            playMessageChime();

            if (isCurrentActive) {
                msg.status = 'read';
                state.chats[partnerId].push(msg);
                renderActiveMessages();
                if (msg.id) {
                    apiRequest('/messages/ack', {
                        method: 'POST',
                        body: JSON.stringify({ message_ids: [msg.id], status: 'read' })
                    }).catch(() => { });
                }
            } else {
                msg.status = 'delivered';
                state.chats[partnerId].push(msg);
                state.unread[partnerId] = (state.unread[partnerId] || 0) + 1;
                const sender = state.contacts.find(c => Number(c.id) === partnerId);
                const senderName = sender ? sender.display_name : 'Seseorang';
                showToast(`Pesan baru dari ${senderName}: "${msg.body.substring(0, 40)}"`, 'info');

                if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                    try {
                        new Notification(senderName, {
                            body: msg.body.substring(0, 80),
                            icon: '/favicon.ico'
                        });
                    } catch (e) { }
                }

                if (msg.id) {
                    apiRequest('/messages/ack', {
                        method: 'POST',
                        body: JSON.stringify({ message_ids: [msg.id], status: 'delivered' })
                    }).catch(() => { });
                }
            }

            await AppDB.saveMessage(msg, state.user.id);
            renderChatsList();
        }
    }

    async function syncGroupMessages() {
        if (!state.token || !state.user) return;

        const since = {};
        (state.groups || []).forEach(g => {
            const chatKey = 'group_' + g.id;
            const msgs = state.chats[chatKey] || [];
            let maxId = 0;
            msgs.forEach(m => {
                if (m.id && Number(m.id) > maxId) maxId = Number(m.id);
            });
            since[g.id] = maxId;
        });

        try {
            const res = await apiRequest('/groups/sync', {
                method: 'POST',
                body: JSON.stringify({ since: since })
            });

            if (res && Array.isArray(res.messages) && res.messages.length > 0) {
                let hasChanges = false;
                let activeUpdated = false;

                for (const m of res.messages) {
                    const chatKey = 'group_' + m.group_id;
                    const hexKey = state.conversationKeys[chatKey];

                    if (m.body && m.body.startsWith('enc:v1:') && hexKey) {
                        m.body = await decryptMessageBody(m.body, hexKey);
                    }

                    if (!state.chats[chatKey]) state.chats[chatKey] = [];

                    const exists = state.chats[chatKey].find(
                        x => (x.client_uuid && x.client_uuid === m.client_uuid) || (x.id && x.id === m.id)
                    );

                    const isCurrentActive = state.activeContact && state.activeContact.is_group && Number(state.activeContact.group_id) === Number(m.group_id);

                    if (!exists) {
                        state.chats[chatKey].push(m);
                        await AppDB.saveMessage(m, state.user.id);
                        hasChanges = true;

                        if (isCurrentActive) {
                            activeUpdated = true;
                            if (Number(m.sender_id) !== Number(state.user.id)) {
                                playMessageChime();
                            }
                        } else {
                            if (Number(m.sender_id) !== Number(state.user.id)) {
                                state.unread[chatKey] = (state.unread[chatKey] || 0) + 1;
                                playMessageChime();
                                const group = (state.groups || []).find(g => Number(g.id) === Number(m.group_id));
                                const groupName = group ? group.name : 'Grup';
                                showToast(`Pesan baru di ${groupName} dari ${m.sender_name}: "${m.body.substring(0, 40)}"`, 'info');

                                if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                                    try {
                                        new Notification(groupName, {
                                            body: `${m.sender_name}: ${m.body.substring(0, 80)}`,
                                            icon: '/favicon.ico'
                                        });
                                    } catch (e) { }
                                }
                            }
                        }
                    } else {
                        if (m.is_edited && !exists.is_edited) {
                            exists.is_edited = true;
                            exists.body = m.body;
                            hasChanges = true;
                            if (isCurrentActive) activeUpdated = true;
                        }
                        const isDel = Boolean(m.is_deleted) || m.body === 'Pesan ini telah dihapus';
                        if (isDel && !exists.is_deleted) {
                            exists.is_deleted = true;
                            exists.body = 'Pesan ini telah dihapus';
                            hasChanges = true;
                            if (isCurrentActive) activeUpdated = true;
                        }
                    }
                }

                if (hasChanges) {
                    persistMessages();
                    renderChatsList();
                }
                if (activeUpdated) {
                    renderActiveMessages();
                }
            }
        } catch (e) { }
    }

    async function syncIncomingVoiceCall() {
        if (!state.token || !state.user) return;
        try {
            const res = await apiRequest('/voice/active-call');
            if (res && res.has_call && res.call) {
                if (res.call.signal_type === 'call-answer') {
                    if (state.voice.active && Number(res.call.sender_id) === Number(state.voice.targetUserId)) {
                        await handleIncomingVoiceSignal(res.call);
                    }
                } else if (res.call.signal_type === 'call-offer') {
                    if (!state.voice.active && !state.voice.incomingCall) {
                        await handleIncomingVoiceSignal(res.call);
                    }
                } else {
                    await handleIncomingVoiceSignal(res.call);
                }
            } else if (res && res.call_ended) {
                if (state.voice.active || state.voice.incomingCall) {
                    handleDisconnectVoiceCall(false);
                    showToast('Panggilan suara telah diakhiri.', 'info');
                    fetchCallLogs();
                }
            } else if (res && !res.has_call && state.voice.incomingCall) {
                stopCallTitleFlash();
                stopIncomingRingtone();
                state.voice.incomingCall = null;
                const modal = document.getElementById('incomingCallModal');
                if (modal) {
                    modal.classList.remove('active');
                    modal.style.display = 'none';
                }
            }
        } catch (e) { }

        // Reconnect WebSocket if disconnected
        if (state.reverbSocket && state.reverbSocket.connection) {
            const s = state.reverbSocket.connection.state;
            if (s === 'disconnected' || s === 'failed') {
                try { state.reverbSocket.connect(); } catch (e) { }
            }
        }
    }

    function startDataSync() {
        if (state.syncInterval) clearInterval(state.syncInterval);
        if (state.heartbeatInterval) clearInterval(state.heartbeatInterval);

        initWebSocket();
        sendHeartbeat();
        fetchContacts();
        fetchRequests();
        fetchGroups();
        fetchCallLogs();
        syncPendingMessages();
        syncMessageStatuses();
        syncGroupMessages();
        syncIncomingVoiceCall();

        state.heartbeatInterval = setInterval(() => {
            sendHeartbeat();
        }, 20000);

        let syncTick = 0;
        state.syncInterval = setInterval(() => {
            syncTick++;
            syncPendingMessages();
            syncMessageStatuses();
            syncGroupMessages();
            fetchRequests();
            syncIncomingVoiceCall();

            if (state.activeContact && !state.activeContact.is_group) {
                checkActiveContactTyping();
            }

            if (syncTick % 2 === 0) {
                fetchContacts();
                fetchGroups();
            }
        }, 2000);
    }

    const RTC_CONFIG = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:openrelay.metered.ca:80' },
            {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelay',
                credential: 'openrelay'
            },
            {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelay',
                credential: 'openrelay'
            },
            {
                urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                username: 'openrelay',
                credential: 'openrelay'
            }
        ],
        iceCandidatePoolSize: 10
    };

    let ringtoneAudioContext = null;
    let ringtoneInterval = null;
    let callTitleFlashInterval = null;
    let originalDocTitle = document.title || 'ZChat';

    function startCallTitleFlash(callerName) {
        if (callTitleFlashInterval) clearInterval(callTitleFlashInterval);
        originalDocTitle = document.title || 'ZChat';
        let toggle = false;
        callTitleFlashInterval = setInterval(() => {
            document.title = toggle ? `📞 Panggilan Masuk dari ${callerName}!` : `🔔 Dering Panggilan...`;
            toggle = !toggle;
        }, 1000);
    }

    function stopCallTitleFlash() {
        if (callTitleFlashInterval) {
            clearInterval(callTitleFlashInterval);
            callTitleFlashInterval = null;
            document.title = originalDocTitle || 'ZChat';
        }
    }

    function playIncomingRingtone() {
        stopIncomingRingtone();
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            ringtoneAudioContext = new AudioCtx();
            if (ringtoneAudioContext.state === 'suspended') {
                ringtoneAudioContext.resume().catch(() => {});
            }

            const playTone = () => {
                if (!ringtoneAudioContext) return;
                try {
                    if (ringtoneAudioContext.state === 'suspended') {
                        ringtoneAudioContext.resume().catch(() => {});
                    }
                    const osc1 = ringtoneAudioContext.createOscillator();
                    const osc2 = ringtoneAudioContext.createOscillator();
                    const gain = ringtoneAudioContext.createGain();

                    osc1.type = 'sine';
                    osc1.frequency.setValueAtTime(440, ringtoneAudioContext.currentTime);
                    osc2.type = 'sine';
                    osc2.frequency.setValueAtTime(480, ringtoneAudioContext.currentTime);

                    gain.gain.setValueAtTime(0.08, ringtoneAudioContext.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ringtoneAudioContext.currentTime + 1.2);

                    osc1.connect(gain);
                    osc2.connect(gain);
                    gain.connect(ringtoneAudioContext.destination);

                    osc1.start();
                    osc2.start();
                    osc1.stop(ringtoneAudioContext.currentTime + 1.2);
                    osc2.stop(ringtoneAudioContext.currentTime + 1.2);
                } catch (e) { }
            };

            playTone();
            ringtoneInterval = setInterval(playTone, 2400);
        } catch (e) { }
    }

    function stopIncomingRingtone() {
        if (ringtoneInterval) {
            clearInterval(ringtoneInterval);
            ringtoneInterval = null;
        }
        if (ringtoneAudioContext) {
            try { ringtoneAudioContext.close(); } catch (e) { }
            ringtoneAudioContext = null;
        }
    }

    async function getMediaStream() {
        if (state.voice.localStream) return state.voice.localStream;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });
            state.voice.localStream = stream;
            initVoiceActivityDetection(stream);
            return stream;
        } catch (err) {
            console.error('Gagal mengakses mikrofon:', err);
            showToast('Tidak dapat mengakses mikrofon. Pastikan izin mikrofon diberikan di browser.', 'error');
            return null;
        }
    }

    function initVoiceActivityDetection(stream) {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            state.voice.audioContext = ctx;
            state.voice.analyser = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            let wasSpeaking = false;

            if (state.voice.analyserInterval) clearInterval(state.voice.analyserInterval);
            state.voice.analyserInterval = setInterval(() => {
                if (!state.voice.active || state.voice.isMuted) {
                    if (wasSpeaking) {
                        setLocalSpeaking(false);
                        wasSpeaking = false;
                    }
                    return;
                }

                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                const avg = sum / dataArray.length;

                const isSpeakingNow = avg > 16;
                if (isSpeakingNow !== wasSpeaking) {
                    wasSpeaking = isSpeakingNow;
                    setLocalSpeaking(isSpeakingNow);
                    broadcastVoiceState({ is_speaking: isSpeakingNow });
                }
            }, 150);
        } catch (e) {
            console.warn('VAD init failed:', e);
        }
    }

    function setLocalSpeaking(speaking) {
        if (!state.user) return;
        const card = document.getElementById('voiceParticipant_' + state.user.id);
        if (card) {
            if (speaking) card.classList.add('is-speaking');
            else card.classList.remove('is-speaking');
        }
    }

    function setRemoteSpeaking(peerId, speaking) {
        const card = document.getElementById('voiceParticipant_' + peerId);
        if (card) {
            if (speaking) card.classList.add('is-speaking');
            else card.classList.remove('is-speaking');
        }
    }

    function normalizeSdp(sdp) {
        if (!sdp || typeof sdp !== 'string') return '';
        const lines = sdp.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
        const cleanLines = lines.map(l => l.trimEnd()).filter(l => l.length > 0);
        return cleanLines.join('\r\n') + '\r\n';
    }

    function addOrQueueIceCandidate(peerId, candidate) {
        if (!candidate) return;
        const pc = state.voice.peerConnections[peerId];
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            try {
                pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => {
                    console.warn('addIceCandidate error:', e);
                });
            } catch (e) { }
        } else {
            if (!state.voice.pendingIceCandidates[peerId]) {
                state.voice.pendingIceCandidates[peerId] = [];
            }
            state.voice.pendingIceCandidates[peerId].push(candidate);
        }
    }

    async function drainPendingIceCandidates(peerId) {
        const pc = state.voice.peerConnections[peerId];
        if (!pc) return;
        const queued = state.voice.pendingIceCandidates[peerId] || [];
        state.voice.pendingIceCandidates[peerId] = [];
        for (const cand of queued) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {
                console.warn('drain candidate error:', e);
            }
        }
    }

    function createPeerConnection(peerId) {
        if (state.voice.peerConnections[peerId]) {
            return state.voice.peerConnections[peerId];
        }

        const pc = new RTCPeerConnection(RTC_CONFIG);
        state.voice.peerConnections[peerId] = pc;

        if (state.voice.localStream) {
            state.voice.localStream.getTracks().forEach(track => {
                pc.addTrack(track, state.voice.localStream);
            });
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendVoiceSignal(peerId, 'ice-candidate', {
                    candidate: event.candidate.candidate,
                    sdpMid: event.candidate.sdpMid,
                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                    usernameFragment: event.candidate.usernameFragment
                });
            }
        };

        pc.ontrack = (event) => {
            let remoteStream = (event.streams && event.streams[0]) ? event.streams[0] : null;
            if (!remoteStream) {
                remoteStream = new MediaStream([event.track]);
            }
            state.voice.remoteStreams[peerId] = remoteStream;
            attachRemoteAudio(peerId, remoteStream);
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                const audioEl = state.voice.audioElements[peerId];
                if (audioEl && audioEl.paused) {
                    audioEl.play().catch(() => {});
                }
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                removePeer(peerId);
            }
        };

        return pc;
    }

    function attachRemoteAudio(peerId, stream) {
        if (!stream) return;
        let audioEl = state.voice.audioElements[peerId];
        if (!audioEl) {
            audioEl = document.createElement('audio');
            audioEl.id = 'remoteAudio_' + peerId;
            audioEl.autoplay = true;
            audioEl.playsInline = true;
            const container = document.getElementById('voiceAudioElements');
            if (container) {
                container.appendChild(audioEl);
            } else {
                document.body.appendChild(audioEl);
            }
            state.voice.audioElements[peerId] = audioEl;
        }

        audioEl.srcObject = stream;
        audioEl.muted = state.voice.isDeafened || false;
        audioEl.volume = 1.0;

        const tryPlay = () => {
            const playPromise = audioEl.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => {
                    console.warn('Autoplay audio blocked, listening for user click to resume:', err);
                    const unlock = () => {
                        audioEl.play().catch(() => {});
                        document.removeEventListener('click', unlock);
                        document.removeEventListener('keydown', unlock);
                    };
                    document.addEventListener('click', unlock, { once: true });
                    document.addEventListener('keydown', unlock, { once: true });
                });
            }
        };
        tryPlay();
    }

    function removePeer(peerId) {
        if (state.voice.peerConnections[peerId]) {
            try { state.voice.peerConnections[peerId].close(); } catch (e) { }
            delete state.voice.peerConnections[peerId];
        }
        if (state.voice.audioElements[peerId]) {
            try { state.voice.audioElements[peerId].remove(); } catch (e) { }
            delete state.voice.audioElements[peerId];
        }
        delete state.voice.remoteStreams[peerId];
        delete state.voice.pendingIceCandidates[peerId];

        state.voice.participants = state.voice.participants.filter(p => Number(p.id) !== Number(peerId));
        renderVoiceParticipantsGrid();

        if (state.voice.roomType === 'direct') {
            handleDisconnectVoiceCall();
        }
    }

    async function sendVoiceSignal(targetId, signalType, data) {
        if (!state.token) return;
        try {
            await apiRequest('/voice/signal', {
                method: 'POST',
                body: JSON.stringify({
                    target_id: Number(targetId),
                    signal_type: signalType,
                    room_type: state.voice.roomType || 'direct',
                    group_id: state.voice.groupId,
                    data: data
                })
            });
        } catch (e) { }
    }

    function broadcastVoiceState(stateData) {
        for (const peerId in state.voice.peerConnections) {
            sendVoiceSignal(peerId, 'room-state', stateData);
        }
    }

    async function handleIncomingVoiceSignal(rawSignal) {
        let signal = rawSignal;
        if (typeof signal === 'string') {
            try { signal = JSON.parse(signal); } catch (e) { }
        }
        if (signal && typeof signal.data === 'string') {
            try { signal.data = JSON.parse(signal.data); } catch (e) { }
        }

        if (!signal || !signal.signal_type) return;

        const senderId = Number(signal.sender_id);
        const myId = Number(state.user ? state.user.id : 0);
        if (senderId === myId) return;

        switch (signal.signal_type) {
            case 'call-offer': {
                if (state.voice.active) {
                    sendVoiceSignal(senderId, 'call-busy', {});
                    return;
                }

                if (signal.room_type === 'group') {
                    const pc = createPeerConnection(senderId);
                    let sdpOffer = signal.data;
                    if (typeof sdpOffer === 'string') {
                        try { sdpOffer = JSON.parse(sdpOffer); } catch (e) { }
                    }
                    const rawSdp = (typeof sdpOffer === 'object' && sdpOffer !== null) ? (sdpOffer.sdp || '') : String(sdpOffer || '');
                    const offerDesc = {
                        type: (typeof sdpOffer === 'object' && sdpOffer && sdpOffer.type) || 'offer',
                        sdp: normalizeSdp(rawSdp)
                    };
                    try {
                        await pc.setRemoteDescription(offerDesc);
                        await drainPendingIceCandidates(senderId);
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        sendVoiceSignal(senderId, 'call-answer', { type: answer.type, sdp: normalizeSdp(answer.sdp) });
                    } catch (e) {
                        console.error('Group voice offer handling error:', e);
                    }
                    return;
                }

                state.voice.incomingCall = signal;
                const callerName = signal.sender_name || 'Seseorang';
                const callerNameEl = document.getElementById('incomingCallerName');
                if (callerNameEl) {
                    callerNameEl.textContent = `${callerName} memanggil Anda...`;
                }
                const avatarEl = document.getElementById('incomingCallAvatar');
                if (avatarEl) {
                    avatarEl.textContent = callerName.substring(0, 2).toUpperCase();
                }
                const modal = document.getElementById('incomingCallModal');
                if (modal) {
                    modal.classList.add('active');
                    modal.style.display = 'flex';
                }

                showToast(`Panggilan suara masuk dari ${callerName}`, 'info');

                if (typeof Notification !== 'undefined') {
                    if (Notification.permission === 'granted') {
                        try {
                            new Notification('Panggilan Suara Masuk', {
                                body: `${callerName} sedang memanggil Anda...`,
                                icon: '/chat-assets/images/logo.svg'
                            });
                        } catch (e) { }
                    } else if (Notification.permission === 'default') {
                        try { Notification.requestPermission(); } catch (e) { }
                    }
                }

                startCallTitleFlash(callerName);
                playMessageChime();
                playIncomingRingtone();
                break;
            }

            case 'call-answer': {
                stopCallTitleFlash();
                stopIncomingRingtone();
                const pc = state.voice.peerConnections[senderId];
                if (pc) {
                    if (pc.signalingState === 'stable') {
                        if (!state.voice.callTimer) {
                            startCallDurationTimer();
                            updateVoiceDockInfo();
                        }
                        return;
                    }
                    let sdpAnswer = signal.data;
                    if (typeof sdpAnswer === 'string') {
                        try { sdpAnswer = JSON.parse(sdpAnswer); } catch (e) { }
                    }
                    const rawSdp = (typeof sdpAnswer === 'object' && sdpAnswer !== null) ? (sdpAnswer.sdp || '') : String(sdpAnswer || '');
                    const answerDesc = {
                        type: (typeof sdpAnswer === 'object' && sdpAnswer && sdpAnswer.type) || 'answer',
                        sdp: normalizeSdp(rawSdp)
                    };
                    try {
                        if (pc.signalingState === 'have-local-offer') {
                            await pc.setRemoteDescription(answerDesc);
                        }
                        await drainPendingIceCandidates(senderId);
                    } catch (e) {
                        console.error('Direct call answer handling error:', e);
                    }
                    startCallDurationTimer();
                    updateVoiceDockInfo();
                    showToast(`Terhubung dengan ${state.voice.targetName}`, 'success');
                }
                break;
            }

            case 'ice-candidate': {
                if (signal.data) {
                    let candData = signal.data;
                    if (typeof candData === 'string') {
                        try { candData = JSON.parse(candData); } catch (e) { }
                    }
                    addOrQueueIceCandidate(senderId, candData);
                }
                break;
            }

            case 'call-rejected': {
                stopCallTitleFlash();
                stopIncomingRingtone();
                handleDisconnectVoiceCall(false);
                showToast(`${signal.sender_name || 'Kontak'} menolak panggilan suara.`, 'info');
                fetchCallLogs();
                break;
            }

            case 'call-busy': {
                stopCallTitleFlash();
                stopIncomingRingtone();
                handleDisconnectVoiceCall(false);
                showToast(`${signal.sender_name || 'Kontak'} sedang dalam panggilan lain.`, 'info');
                fetchCallLogs();
                break;
            }

            case 'call-ended': {
                stopCallTitleFlash();
                stopIncomingRingtone();
                handleDisconnectVoiceCall(false);
                const incomingModal = document.getElementById('incomingCallModal');
                if (incomingModal) {
                    incomingModal.classList.remove('active');
                    incomingModal.style.display = 'none';
                }
                showToast('Panggilan suara telah diakhiri.', 'info');
                fetchCallLogs();
                break;
            }

            case 'room-join': {
                if (state.voice.active && state.voice.roomType === 'group' && Number(state.voice.groupId) === Number(signal.group_id)) {
                    const newcomer = signal.data;
                    if (newcomer && !state.voice.participants.find(p => Number(p.id) === Number(newcomer.id))) {
                        state.voice.participants.push(newcomer);
                        renderVoiceParticipantsGrid();
                        playMessageChime();
                        showToast(`${newcomer.name} bergabung ke ruang suara`, 'info');

                        const stream = await getMediaStream();
                        if (stream) {
                            const pc = createPeerConnection(newcomer.id);
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            sendVoiceSignal(newcomer.id, 'call-offer', offer);
                        }
                    }
                }
                break;
            }

            case 'room-leave': {
                if (state.voice.active && state.voice.roomType === 'group') {
                    const leftUserId = signal.data?.user_id || senderId;
                    removePeer(leftUserId);
                    const leftUser = state.voice.participants.find(p => Number(p.id) === Number(leftUserId));
                    if (leftUser) {
                        showToast(`${leftUser.name} keluar dari ruang suara`, 'info');
                    }
                }
                break;
            }

            case 'room-state': {
                if (signal.data) {
                    if (signal.data.is_speaking !== undefined) {
                        setRemoteSpeaking(senderId, signal.data.is_speaking);
                    }
                    if (signal.data.is_muted !== undefined) {
                        const p = state.voice.participants.find(x => Number(x.id) === senderId);
                        if (p) {
                            p.is_muted = signal.data.is_muted;
                            renderVoiceParticipantsGrid();
                        }
                    }
                }
                break;
            }
        }
    }

    window.handleStartVoiceCall = async function () {
        if (!state.activeContact) {
            showToast('Pilih kontak atau grup terlebih dahulu untuk memulai obrolan suara.', 'info');
            return;
        }

        if (state.voice.active) {
            window.openVoiceStage();
            return;
        }

        if (state.activeContact.is_group) {
            await window.joinGroupVoiceChannel(state.activeContact.group_id, state.activeContact.name);
        } else {
            await window.startDirectVoiceCall(state.activeContact.id, state.activeContact.display_name);
        }
    };

    window.startDirectVoiceCall = async function (targetId, targetName) {
        const stream = await getMediaStream();
        if (!stream) return;

        const callUuid = 'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        state.voice.active = true;
        state.voice.roomType = 'direct';
        state.voice.groupId = null;
        state.voice.targetUserId = Number(targetId);
        state.voice.targetName = targetName;
        state.voice.callUuid = callUuid;
        state.voice.participants = [
            { id: state.user.id, name: state.user.display_name || state.user.username, is_muted: false },
            { id: Number(targetId), name: targetName, is_muted: false }
        ];

        window.openVoiceStage();
        renderVoiceParticipantsGrid();

        const titleEl = document.getElementById('voiceStageTitle');
        if (titleEl) {
            titleEl.textContent = `Panggilan: ${targetName}`;
        }

        const subtitleEl = document.getElementById('voiceStageSubtitle');
        if (subtitleEl) {
            subtitleEl.textContent = `Memanggil ${targetName}...`;
            subtitleEl.style.color = 'var(--text-muted, #94a3b8)';
        }

        try {
            const pc = createPeerConnection(targetId);
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });
            await pc.setLocalDescription(offer);
            await sendVoiceSignal(targetId, 'call-offer', {
                type: offer.type,
                sdp: normalizeSdp(offer.sdp),
                call_uuid: callUuid
            });
            playIncomingRingtone();
        } catch (err) {
            console.error('Error starting direct voice call:', err);
            showToast('Gagal memulai panggilan suara: ' + err.message, 'error');
            handleDisconnectVoiceCall(true);
        }
    };

    window.handleAcceptIncomingCall = async function () {
        stopCallTitleFlash();
        stopIncomingRingtone();
        const incoming = state.voice.incomingCall;
        const modal = document.getElementById('incomingCallModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
        if (!incoming) return;

        const callerId = Number(incoming.sender_id);
        const callerName = incoming.sender_name || 'Kontak';
        const callUuid = incoming.call_uuid || (incoming.data && incoming.data.call_uuid) || null;

        const stream = await getMediaStream();
        if (!stream) {
            sendVoiceSignal(callerId, 'call-rejected', { call_uuid: callUuid });
            return;
        }

        state.voice.active = true;
        state.voice.roomType = 'direct';
        state.voice.groupId = null;
        state.voice.targetUserId = callerId;
        state.voice.targetName = callerName;
        state.voice.callUuid = callUuid;
        state.voice.participants = [
            { id: callerId, name: callerName, is_muted: false },
            { id: state.user.id, name: state.user.display_name || state.user.username, is_muted: false }
        ];

        window.openVoiceStage();
        updateVoiceDockInfo();
        renderVoiceParticipantsGrid();

        try {
            let sdpOffer = incoming.data;
            if (typeof sdpOffer === 'string') {
                try { sdpOffer = JSON.parse(sdpOffer); } catch (e) { }
            }

            const pc = createPeerConnection(callerId);
            const rawSdp = (typeof sdpOffer === 'object' && sdpOffer !== null) ? (sdpOffer.sdp || '') : String(sdpOffer || '');
            const offerDesc = {
                type: (typeof sdpOffer === 'object' && sdpOffer && sdpOffer.type) || 'offer',
                sdp: normalizeSdp(rawSdp)
            };

            await pc.setRemoteDescription(offerDesc);
            await drainPendingIceCandidates(callerId);

            const answer = await pc.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });
            await pc.setLocalDescription(answer);

            await sendVoiceSignal(callerId, 'call-answer', {
                type: answer.type,
                sdp: normalizeSdp(answer.sdp),
                call_uuid: callUuid
            });

            startCallDurationTimer();
            state.voice.incomingCall = null;
            showToast(`Terhubung dengan ${callerName}`, 'success');
        } catch (err) {
            console.error('Error accepting voice call:', err);
            showToast('Gagal menghubungkan obrolan suara: ' + err.message, 'error');
            handleDisconnectVoiceCall(true);
        }
    };

    window.handleDeclineIncomingCall = function () {
        stopCallTitleFlash();
        stopIncomingRingtone();
        const incoming = state.voice.incomingCall;
        const modal = document.getElementById('incomingCallModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
        if (incoming) {
            const callUuid = incoming.call_uuid || (incoming.data && incoming.data.call_uuid) || null;
            sendVoiceSignal(incoming.sender_id, 'call-rejected', { call_uuid: callUuid });
            state.voice.incomingCall = null;
            handleDisconnectVoiceCall(false);
            fetchCallLogs();
        }
    };

    window.joinGroupVoiceChannel = async function (groupId, groupName) {
        const stream = await getMediaStream();
        if (!stream) return;

        try {
            const res = await apiRequest(`/voice/groups/${groupId}/join`, { method: 'POST' });
            if (!res) return;

            state.voice.active = true;
            state.voice.roomType = 'group';
            state.voice.groupId = Number(groupId);
            state.voice.targetUserId = null;
            state.voice.targetName = groupName || 'Grup';

            const existingParticipants = res.participants || [];
            state.voice.participants = [
                ...existingParticipants,
                { id: state.user.id, name: state.user.display_name || state.user.username, is_muted: false }
            ];

            window.openVoiceStage();
            updateVoiceDockInfo();
            startCallDurationTimer();
            renderVoiceParticipantsGrid();

            for (const other of existingParticipants) {
                try {
                    const pc = createPeerConnection(other.id);
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    sendVoiceSignal(other.id, 'call-offer', {
                        type: offer.type,
                        sdp: normalizeSdp(offer.sdp)
                    });
                } catch (e) {
                    console.error('Error connecting to group participant:', e);
                }
            }

            showToast(`Bergabung ke ruang suara ${groupName}`, 'success');
        } catch (e) {
            console.error('Gagal masuk ruang suara grup:', e);
            showToast('Gagal bergabung ke ruang suara grup', 'error');
        }
    };

    window.handleDisconnectVoiceCall = function (notifyPeer = true) {
        stopCallTitleFlash();
        stopIncomingRingtone();

        const incomingModal = document.getElementById('incomingCallModal');
        if (incomingModal) {
            incomingModal.classList.remove('active');
            incomingModal.style.display = 'none';
        }
        const stageModal = document.getElementById('voiceStageModal');
        if (stageModal) {
            stageModal.classList.remove('active');
            stageModal.style.display = 'none';
        }
        hideVoiceDock();

        const currentCallUuid = state.voice.callUuid;
        const currentTargetId = state.voice.targetUserId;
        const currentSeconds = state.voice.callSeconds || 0;
        const currentRoomType = state.voice.roomType;
        const currentGroupId = state.voice.groupId;
        const wasActive = state.voice.active;

        if (notifyPeer) {
            if (currentRoomType === 'group' && currentGroupId) {
                apiRequest(`/voice/groups/${currentGroupId}/leave`, { method: 'POST' }).catch(() => { });
            } else if (currentTargetId) {
                sendVoiceSignal(currentTargetId, 'call-ended', {
                    call_uuid: currentCallUuid,
                    duration: currentSeconds
                });
            } else if (state.voice.incomingCall && state.voice.incomingCall.sender_id) {
                sendVoiceSignal(state.voice.incomingCall.sender_id, 'call-rejected', {
                    call_uuid: state.voice.incomingCall.call_uuid || currentCallUuid
                });
            }
        }

        // 1. Terminate all local audio tracks
        if (state.voice.localStream) {
            state.voice.localStream.getTracks().forEach(track => {
                try { track.stop(); } catch (e) { }
            });
            state.voice.localStream = null;
        }

        // 2. Terminate all remote audio tracks
        for (const peerId in state.voice.remoteStreams) {
            const rs = state.voice.remoteStreams[peerId];
            if (rs && rs.getTracks) {
                rs.getTracks().forEach(t => { try { t.stop(); } catch (e) { } });
            }
        }
        state.voice.remoteStreams = {};

        // 3. Remove and pause all remote audio DOM elements
        for (const peerId in state.voice.audioElements) {
            try {
                const el = state.voice.audioElements[peerId];
                el.pause();
                el.srcObject = null;
                el.remove();
            } catch (e) { }
        }
        state.voice.audioElements = {};

        // 4. Close and clean up all RTCPeerConnections
        for (const peerId in state.voice.peerConnections) {
            try {
                const pc = state.voice.peerConnections[peerId];
                pc.ontrack = null;
                pc.onicecandidate = null;
                pc.onconnectionstatechange = null;
                pc.oniceconnectionstatechange = null;
                pc.close();
            } catch (e) { }
        }
        state.voice.peerConnections = {};

        // 5. Clean up AudioContext & VAD analyser
        if (state.voice.audioContext) {
            try { state.voice.audioContext.close(); } catch (e) { }
            state.voice.audioContext = null;
        }
        if (state.voice.analyserInterval) {
            clearInterval(state.voice.analyserInterval);
            state.voice.analyserInterval = null;
        }

        // 6. Stop and clear duration timer
        if (state.voice.callTimer) {
            clearInterval(state.voice.callTimer);
            state.voice.callTimer = null;
        }

        // 7. Reset all voice state flags
        state.voice.active = false;
        state.voice.roomType = null;
        state.voice.groupId = null;
        state.voice.targetUserId = null;
        state.voice.targetName = '';
        state.voice.callSeconds = 0;
        state.voice.isMuted = false;
        state.voice.isDeafened = false;
        state.voice.participants = [];
        state.voice.incomingCall = null;
        state.voice.pendingIceCandidates = {};
        state.voice.callUuid = null;

        // 8. Refresh call logs
        fetchCallLogs();

        if (wasActive && notifyPeer) {
            showToast('Panggilan suara selesai.', 'info');
        }
    };

    window.toggleVoiceMute = function () {
        if (!state.voice.localStream) return;
        state.voice.isMuted = !state.voice.isMuted;
        state.voice.localStream.getAudioTracks().forEach(track => {
            track.enabled = !state.voice.isMuted;
        });

        const micLabel = document.getElementById('stageMicLabel');
        if (micLabel) micLabel.textContent = state.voice.isMuted ? 'Unmute' : 'Mute';

        const dockBtn = document.getElementById('btnDockToggleMic');
        if (dockBtn) {
            dockBtn.style.color = state.voice.isMuted ? '#ef4444' : 'currentColor';
        }

        broadcastVoiceState({ is_muted: state.voice.isMuted });
        setLocalSpeaking(false);
        showToast(state.voice.isMuted ? 'Mikrofon dimatikan' : 'Mikrofon diaktifkan', 'info');
    };

    window.toggleVoiceDeafen = function () {
        state.voice.isDeafened = !state.voice.isDeafened;
        for (const peerId in state.voice.audioElements) {
            state.voice.audioElements[peerId].muted = state.voice.isDeafened;
        }

        const deafenLabel = document.getElementById('stageDeafenLabel');
        if (deafenLabel) deafenLabel.textContent = state.voice.isDeafened ? 'Undeafen' : 'Deafen';

        const dockBtn = document.getElementById('btnDockToggleDeafen');
        if (dockBtn) {
            dockBtn.style.color = state.voice.isDeafened ? '#ef4444' : 'currentColor';
        }

        showToast(state.voice.isDeafened ? 'Output suara dibisukan' : 'Output suara dinyalakan', 'info');
    };

    window.openVoiceStage = function () {
        const modal = document.getElementById('voiceStageModal');
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex';
            renderVoiceParticipantsGrid();
        }
        hideVoiceDock();
    };

    window.minimizeVoiceStage = function () {
        const modal = document.getElementById('voiceStageModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
        if (state.voice.active) {
            showVoiceDock();
        }
    };

    function showVoiceDock() {
        const dock = document.getElementById('activeVoiceDock');
        if (dock) dock.style.display = 'flex';
    }

    function hideVoiceDock() {
        const dock = document.getElementById('activeVoiceDock');
        if (dock) dock.style.display = 'none';
    }

    function updateVoiceDockInfo() {
        const titleEl = document.getElementById('dockVoiceTitle');
        const stageTitle = document.getElementById('voiceStageTitle');
        const stageSubtitle = document.getElementById('voiceStageSubtitle');

        const title = state.voice.roomType === 'group'
            ? `Ruang Suara: ${state.voice.targetName}`
            : `Panggilan: ${state.voice.targetName}`;

        if (titleEl) titleEl.textContent = title;
        if (stageTitle) stageTitle.textContent = title;
        if (stageSubtitle) {
            const count = state.voice.participants.length;
            const mins = String(Math.floor(state.voice.callSeconds / 60)).padStart(2, '0');
            const secs = String(state.voice.callSeconds % 60).padStart(2, '0');
            if (state.voice.roomType === 'group') {
                stageSubtitle.textContent = `${count} orang terhubung • ${mins}:${secs}`;
                stageSubtitle.style.color = '#10b981';
            } else {
                stageSubtitle.textContent = `Terhubung • ${mins}:${secs}`;
                stageSubtitle.style.color = '#10b981';
            }
        }
    }

    function startCallDurationTimer() {
        if (state.voice.callTimer) clearInterval(state.voice.callTimer);
        state.voice.callSeconds = 0;
        state.voice.callTimer = setInterval(() => {
            state.voice.callSeconds++;
            const mins = String(Math.floor(state.voice.callSeconds / 60)).padStart(2, '0');
            const secs = String(state.voice.callSeconds % 60).padStart(2, '0');
            const durationEl = document.getElementById('dockVoiceDuration');
            if (durationEl) durationEl.textContent = `${mins}:${secs}`;

            const stageSubtitle = document.getElementById('voiceStageSubtitle');
            if (stageSubtitle && state.voice.active) {
                stageSubtitle.textContent = state.voice.roomType === 'group'
                    ? `Terhubung di grup • ${mins}:${secs}`
                    : `Terhubung • ${mins}:${secs}`;
                stageSubtitle.style.color = '#10b981';
            }
        }, 1000);
    }

    function renderVoiceParticipantsGrid() {
        const grid = document.getElementById('voiceParticipantsGrid');
        if (!grid) return;

        const participants = state.voice.participants || [];
        if (participants.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); font-size: 0.875rem;">Belum ada anggota lain di ruang suara.</div>';
            return;
        }

        grid.innerHTML = participants.map(p => {
            const isMe = state.user && Number(p.id) === Number(state.user.id);
            const initial = (p.name || 'U').substring(0, 2).toUpperCase();
            const muteBadge = p.is_muted ? '<span style="font-size: 0.75rem; color: #ef4444; margin-top: 0.25rem;">(Muted)</span>' : '';

            const avatarMarkup = p.avatar
                ? `<img src="${escapeHtml(p.avatar)}" alt="${escapeHtml(p.name)}" class="voice-participant-avatar" style="object-fit: cover;">`
                : `<div class="voice-participant-avatar ${getPastelColorClass(p.name)}">${initial}</div>`;

            return `
                <div id="voiceParticipant_${p.id}" class="voice-participant-card">
                    ${avatarMarkup}
                    <span style="font-size: 0.875rem; font-weight: 600; color: var(--text-main); max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${escapeHtml(p.name)} ${isMe ? '(Anda)' : ''}
                    </span>
                    ${muteBadge}
                </div>
            `;
        }).join('');
    }

    window.handleLocalFilter = function (query) {
        if (state.activeTab === 'contacts') {
            renderContactsList(query);
        } else if (state.activeTab === 'calls') {
            renderCallLogsList(query);
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

    // Tutup dropdown menu atau emoji picker saat klik di luar
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('chatDropdownMenu');
        const btn = document.getElementById('btnChatMenu');
        if (menu && (menu.classList.contains('show') || menu.style.display === 'flex')) {
            if (!menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
                window.closeChatDropdown();
            }
        }

        const emojiPopover = document.getElementById('emojiPickerPopover');
        const btnEmoji = document.getElementById('btnEmojiToggle');
        if (emojiPopover && emojiPopover.style.display === 'flex') {
            if (!emojiPopover.contains(e.target) && (!btnEmoji || !btnEmoji.contains(e.target))) {
                window.toggleEmojiPicker(false);
            }
        }
    });

    // Aksesibilitas Keyboard: Escape dan Focus Trap
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            window.closeChatDropdown();
            window.toggleEmojiPicker(false);
            window.toggleInChatSearch(false);
            window.cancelReplyMessage();
            window.cancelAttachment();

            const profileModal = document.getElementById('userProfileModal');
            if (profileModal && (profileModal.classList.contains('active') || profileModal.style.display === 'flex')) {
                window.closeUserProfileModal();
            }

            const infoModal = document.getElementById('contactInfoModal');
            if (infoModal && infoModal.classList.contains('active')) {
                window.closeContactInfoModal();
            }

            const addModal = document.getElementById('addFriendModal');
            if (addModal && addModal.classList.contains('active')) {
                window.closeAddFriendModal();
            }

            const createGrpModal = document.getElementById('createGroupModal');
            if (createGrpModal && (createGrpModal.classList.contains('active') || createGrpModal.style.display === 'flex')) {
                window.closeCreateGroupModal();
            }

            const addGrpMemModal = document.getElementById('addGroupMemberModal');
            if (addGrpMemModal && (addGrpMemModal.classList.contains('active') || addGrpMemModal.style.display === 'flex')) {
                window.closeAddGroupMemberModal();
            }

            const voiceStageModal = document.getElementById('voiceStageModal');
            if (voiceStageModal && voiceStageModal.style.display === 'flex') {
                window.minimizeVoiceStage();
            }

            if (state.editingMessageId) {
                window.cancelEditMessage();
            }
        }

        // Focus Trap pada Modal Aktif saat menekan Tab / Shift+Tab
        if (e.key === 'Tab') {
            const activeModal = document.querySelector('.modal-overlay.active');
            if (activeModal) {
                const focusableEls = activeModal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
                if (focusableEls && focusableEls.length > 0) {
                    const firstEl = focusableEls[0];
                    const lastEl = focusableEls[focusableEls.length - 1];

                    if (e.shiftKey) {
                        if (document.activeElement === firstEl) {
                            e.preventDefault();
                            lastEl.focus();
                        }
                    } else {
                        if (document.activeElement === lastEl) {
                            e.preventDefault();
                            firstEl.focus();
                        }
                    }
                }
            }
        }
    });

    // ==========================================
    // Pengaturan Tema Gelap / Terang (Dark Mode)
    // ==========================================
    window.initTheme = function () {
        const savedTheme = localStorage.getItem('zchat_theme') || 'dark';
        applyTheme(savedTheme);
    };

    window.toggleTheme = function () {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        showToast(next === 'dark' ? 'Tema Gelap Diaktifkan' : 'Tema Terang Diaktifkan', 'info');
    };

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        if (document.body) document.body.setAttribute('data-theme', theme);
        try {
            localStorage.setItem('zchat_theme', theme);
        } catch (e) { }

        const darkIcon = document.getElementById('themeIconDark');
        const lightIcon = document.getElementById('themeIconLight');
        if (darkIcon && lightIcon) {
            if (theme === 'dark') {
                darkIcon.style.display = 'block';
                lightIcon.style.display = 'none';
            } else {
                darkIcon.style.display = 'none';
                lightIcon.style.display = 'block';
            }
        }
    }

    // ==========================================
    // Mode Streamer (Privasi Layar & Live Stream)
    // ==========================================
    window.initStreamerMode = function () {
        const saved = localStorage.getItem('zchat_streamer_mode') === 'true';
        applyStreamerMode(saved);
    };

    window.toggleStreamerMode = function () {
        const isCurrent = document.body.classList.contains('streamer-mode');
        const next = !isCurrent;
        applyStreamerMode(next);
        try {
            localStorage.setItem('zchat_streamer_mode', next ? 'true' : 'false');
        } catch (e) { }
        showToast(
            next ? 'Mode Streamer Aktif: Pesan & data chat disamarkan.' : 'Mode Streamer Dinonaktifkan.',
            'info'
        );
    };

    function applyStreamerMode(active) {
        if (active) {
            document.body.classList.add('streamer-mode');
            document.documentElement.classList.add('streamer-mode');
        } else {
            document.body.classList.remove('streamer-mode');
            document.documentElement.classList.remove('streamer-mode');
        }

        const iconOff = document.getElementById('streamerIconOff');
        const iconOn = document.getElementById('streamerIconOn');
        const btn = document.getElementById('btnStreamerMode');
        if (iconOff && iconOn) {
            iconOff.style.display = active ? 'none' : 'block';
            iconOn.style.display = active ? 'block' : 'none';
        }
        if (btn) {
            if (active) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    }

    // Jalankan inisialisasi saat DOM siap
    document.addEventListener('DOMContentLoaded', () => {
        window.initTheme();
        window.initStreamerMode();
        initAuth();
    });

})();
