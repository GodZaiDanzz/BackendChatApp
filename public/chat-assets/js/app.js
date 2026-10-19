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

        async function getAllRawRecords() {
            const db = await open();
            if (!db) return [];

            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(STORE_MESSAGES, 'readonly');
                    const store = tx.objectStore(STORE_MESSAGES);
                    const req = store.getAll();
                    req.onsuccess = () => resolve(req.result || []);
                    req.onerror = () => resolve([]);
                } catch (e) {
                    resolve([]);
                }
            });
        }

        async function restoreRecordsBatch(records) {
            if (!records || !Array.isArray(records) || records.length === 0) return 0;
            const db = await open();
            if (!db) return 0;

            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(STORE_MESSAGES, 'readwrite');
                    const store = tx.objectStore(STORE_MESSAGES);
                    let count = 0;
                    records.forEach(item => {
                        if (item && item.client_uuid) {
                            store.put(item);
                            count++;
                        }
                    });
                    tx.oncomplete = () => resolve(count);
                    tx.onerror = () => resolve(0);
                } catch (e) {
                    resolve(0);
                }
            });
        }

        return {
            open,
            saveMessage,
            saveMessagesBatch,
            getAllChats,
            clearContactChat,
            getAllRawRecords,
            restoreRecordsBatch
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
        inChatSearchMatches: [],
        inChatSearchIndex: -1,
        blockedUsers: [],
        blockedUserIds: new Set(),
        activeEmojiCategory: 'popular',
        isSelectionMode: false,
        selectedMessageIds: new Set(),
        typingUsers: {},
        typingTimers: {},
        isCurrentlyTyping: false,
        lastTypingSentAt: 0,
        myTypingTimeout: null,
        conversationKeys: {},
        callLogs: [],
        pinnedChats: { direct: new Set(), group: new Set() },
        mutedChats: { direct: new Set(), group: new Set() },
        pinnedMessages: {},
        currentPinnedIndex: 0,
        activeSessions: [],
        polls: {},
        mentionState: {
            active: false,
            query: '',
            selectedIndex: 0,
            matches: [],
            triggerIndex: -1
        },
        forwardingMessage: null,
        forwardSelectedRecipients: new Set(),
        voiceNote: {
            isRecording: false,
            mediaRecorder: null,
            audioChunks: [],
            timerInterval: null,
            seconds: 0,
            stream: null
        },
        lightbox: {
            items: [],
            currentIndex: 0,
            zoom: 1,
            panX: 0,
            panY: 0,
            isDragging: false,
            startX: 0,
            startY: 0
        },
        voiceNoteAnalyser: {
            audioCtx: null,
            analyser: null,
            animFrame: null
        },
        voice: {
            active: false,
            isVideo: false,
            cameraOff: false,
            roomType: null,
            groupId: null,
            targetUserId: null,
            targetName: '',
            callUuid: null,
            localStream: null,
            isMuted: false,
            isDeafened: false,
            isScreenSharing: false,
            screenStream: null,
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
        const date = new Date(typeof isoString === 'string' ? isoString.replace(' ', 'T') : isoString);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Helper: Ambil key tanggal lokal YYYY-MM-DD
    function getMessageDateKey(dateInput) {
        if (!dateInput) return '';
        const d = new Date(typeof dateInput === 'string' ? dateInput.replace(' ', 'T') : dateInput);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Helper: Format Pemisah Tanggal ala WhatsApp (HARI INI, KEMARIN, 18 OKTOBER 2026)
    function formatMessageDateDivider(dateInput) {
        if (!dateInput) return 'HARI INI';
        const d = new Date(typeof dateInput === 'string' ? dateInput.replace(' ', 'T') : dateInput);
        if (isNaN(d.getTime())) return 'HARI INI';

        const now = new Date();
        const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

        const msgKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        if (msgKey === todayKey) {
            return 'HARI INI';
        }
        if (msgKey === yesterdayKey) {
            return 'KEMARIN';
        }

        const day = d.getDate();
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        const monthName = months[d.getMonth()] || '';
        const year = d.getFullYear();

        return `${day} ${monthName} ${year}`.toUpperCase();
    }

    // Helper: Format status Terakhir Dilihat ala WhatsApp
    function formatLastSeen(lastSeenAt, isOnline) {
        if (isOnline) return 'online';
        if (!lastSeenAt) return 'Offline';

        const d = new Date(typeof lastSeenAt === 'string' ? lastSeenAt.replace(' ', 'T') : lastSeenAt);
        if (isNaN(d.getTime())) return 'Offline';

        const now = new Date();
        const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

        const seenKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;

        if (seenKey === todayKey) {
            return `terakhir dilihat hari ini pukul ${timeStr}`;
        }
        if (seenKey === yesterdayKey) {
            return `terakhir dilihat kemarin pukul ${timeStr}`;
        }

        const day = d.getDate();
        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
            'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
        ];
        const monthName = months[d.getMonth()] || '';

        if (d.getFullYear() === now.getFullYear()) {
            return `terakhir dilihat ${day} ${monthName} pukul ${timeStr}`;
        } else {
            const year = d.getFullYear();
            return `terakhir dilihat ${day}/${String(d.getMonth() + 1).padStart(2, '0')}/${year} pukul ${timeStr}`;
        }
    }

    // Helper: Format ringkas status kontak untuk daftar sidebar
    function formatLastSeenShort(lastSeenAt, isOnline) {
        if (isOnline) return 'Online';
        if (!lastSeenAt) return 'Offline';

        const d = new Date(typeof lastSeenAt === 'string' ? lastSeenAt.replace(' ', 'T') : lastSeenAt);
        if (isNaN(d.getTime())) return 'Offline';

        const now = new Date();
        const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

        const seenKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;

        if (seenKey === todayKey) {
            return timeStr;
        }
        if (seenKey === yesterdayKey) {
            return 'Kemarin';
        }

        const day = d.getDate();
        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
            'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
        ];
        const monthName = months[d.getMonth()] || '';

        return `${day} ${monthName}`;
    }

    // Helper: Perbarui indikator dan teks status kontak/grup aktif di header dan panel kanan
    function updateActiveUserOnlineStatus(target) {
        if (!target) return;
        const isGroup = Boolean(target.is_group || target.isGroup);
        const dot = document.getElementById('activeStatusDot');
        const smallDot = document.getElementById('activeStatusSmallDot');
        const statusLabel = document.getElementById('activeUserOnlineStatus');

        if (isGroup) {
            if (dot) {
                dot.className = 'status-indicator-dot online';
                dot.title = 'Grup Aktif';
            }
            if (smallDot) {
                smallDot.className = 'presence-dot online';
                smallDot.style.display = 'none';
            }
            if (statusLabel) {
                statusLabel.className = 'user-status-text';
                statusLabel.textContent = `${target.members_count || (target.members ? target.members.length : 1)} anggota`;
            }
            return;
        }

        const isOnline = Boolean(target.is_online);
        if (dot) {
            dot.className = `status-indicator-dot ${isOnline ? 'online' : 'offline'}`;
            dot.title = isOnline ? 'Online' : 'Offline';
        }
        if (smallDot) {
            smallDot.className = `presence-dot ${isOnline ? 'online' : 'offline'}`;
            smallDot.style.display = isOnline ? 'inline-block' : 'none';
        }
        if (statusLabel) {
            statusLabel.className = `user-status-text ${isOnline ? 'online' : 'offline'}`;
            statusLabel.textContent = formatLastSeen(target.last_seen_at, isOnline);
        }

        // Sinkronisasi status di panel info kanan jika kontak yang sama terbuka
        const infoDot = document.getElementById('infoStatusDot');
        if (infoDot) {
            infoDot.className = `status-indicator-dot ${isOnline ? 'online' : 'offline'}`;
        }
        const infoPresence = document.getElementById('infoPresenceText');
        if (infoPresence && state.activeContact && !state.activeContact.is_group && Number(state.activeContact.id) === Number(target.id)) {
            infoPresence.textContent = formatLastSeen(target.last_seen_at, isOnline);
        }
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

    // Helper: Render SVG Checkmarks / Group Read Status (Ceklis 1, Ceklis 2, Mata)
    function renderStatusCheck(status, isGroup = false) {
        if (isGroup && status === 'read') {
            // Icon Mata (Semua anggota telah membaca pesan)
            return `<span class="status-check read group-read" title="Dibaca oleh semua anggota">
                <svg width="16" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            </span>`;
        } else if (status === 'read') {
            // Ceklis 2 Putih/Cyan (Pesan telah dibaca)
            return `<span class="status-check read" title="Dibaca">
                <svg width="16" height="13" viewBox="0 0 28 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6L7 17l-5-5"></path>
                    <path d="M26 6l-11 11-2-2"></path>
                </svg>
            </span>`;
        } else if (status === 'delivered') {
            // Ceklis 2 (Tersampaikan ke semua anggota di grup / tersampaikan ke penerima)
            const title = isGroup ? 'Tersampaikan ke semua anggota' : 'Tersampaikan';
            return `<span class="status-check delivered" title="${title}">
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

    // Helper: Render Checkmarks / Group Read Status di luar chat (Daftar Chat Sidebar)
    function renderListStatusCheck(status, isGroup = false) {
        if (isGroup && status === 'read') {
            // Icon Mata Biru/Cyan (Dibaca semua anggota)
            return `<span class="list-item-status-check read group-read" title="Dibaca semua anggota" style="display: inline-flex; align-items: center; color: #38bdf8; margin-left: 0.5rem; flex-shrink: 0;">
                <svg width="15" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            </span>`;
        } else if (status === 'read') {
            // Ceklis 2 Biru/Cyan (Dibaca)
            return `<span class="list-item-status-check read" title="Dibaca" style="display: inline-flex; align-items: center; color: #38bdf8; margin-left: 0.5rem; flex-shrink: 0;">
                <svg width="15" height="13" viewBox="0 0 28 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6L7 17l-5-5"></path>
                    <path d="M26 6l-11 11-2-2"></path>
                </svg>
            </span>`;
        } else if (status === 'delivered') {
            // Ceklis 2 Abu-abu (Tersampaikan)
            const title = isGroup ? 'Tersampaikan ke semua anggota' : 'Tersampaikan';
            return `<span class="list-item-status-check delivered" title="${title}" style="display: inline-flex; align-items: center; color: var(--text-muted, #9ca3af); margin-left: 0.5rem; flex-shrink: 0;">
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

    // ==========================================
    // Custom Confirmation Dialog System
    // ==========================================
    let confirmModalResolver = null;

    window.showConfirmModal = function (options) {
        if (typeof options === 'string') {
            options = { message: options };
        }
        const config = Object.assign({
            title: 'Konfirmasi Tindakan',
            message: 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
            confirmText: 'Lanjutkan',
            cancelText: 'Batal',
            type: 'danger',
            icon: 'trash'
        }, options || {});

        const modalEl = document.getElementById('confirmModal');
        if (!modalEl) {
            return Promise.resolve(false);
        }

        const titleEl = document.getElementById('confirmModalTitle');
        const messageEl = document.getElementById('confirmModalMessage');
        const iconBoxEl = document.getElementById('confirmModalIconBox');
        const iconSvg = document.getElementById('confirmModalIconSvg');
        const confirmBtn = document.getElementById('confirmModalConfirmBtn');
        const cancelBtn = document.getElementById('confirmModalCancelBtn');

        if (titleEl) titleEl.textContent = config.title;
        if (messageEl) messageEl.textContent = config.message;
        if (confirmBtn) {
            confirmBtn.textContent = config.confirmText;
            confirmBtn.className = `btn-confirm-submit ${config.type || 'danger'}`;
        }
        if (cancelBtn) cancelBtn.textContent = config.cancelText;

        if (iconBoxEl) {
            iconBoxEl.className = `confirm-icon-box ${config.type || 'danger'}`;
        }

        if (iconSvg) {
            const iconKey = config.icon || (config.type === 'primary' ? 'info' : 'trash');
            let svgHtml = '';
            if (iconKey === 'alert') {
                svgHtml = '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>';
            } else if (iconKey === 'user-minus') {
                svgHtml = '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="11" x2="23" y2="11"></line>';
            } else if (iconKey === 'user-x') {
                svgHtml = '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line>';
            } else if (iconKey === 'log-out') {
                svgHtml = '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>';
            } else if (iconKey === 'info') {
                svgHtml = '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>';
            } else {
                svgHtml = '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>';
            }
            iconSvg.innerHTML = svgHtml;
        }

        return new Promise((resolve) => {
            confirmModalResolver = resolve;
            modalEl.style.display = 'flex';
            requestAnimationFrame(() => {
                modalEl.classList.add('active');
                if (confirmBtn) confirmBtn.focus();
            });
        });
    };

    window.closeConfirmModal = function (result = false) {
        const modalEl = document.getElementById('confirmModal');
        if (modalEl) {
            modalEl.classList.remove('active');
            setTimeout(() => {
                modalEl.style.display = 'none';
            }, 150);
        }
        if (typeof confirmModalResolver === 'function') {
            const resolve = confirmModalResolver;
            confirmModalResolver = null;
            resolve(Boolean(result));
        }
    };

    // Override browser default window.confirm to avoid ugly native popups
    window.confirm = function (message) {
        console.warn('Native window.confirm() was called. Please use await window.showConfirmModal() instead.', message);
        return false;
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
    async function apiRequest(endpoint, options = {}, maybeBody = null) {
        // Normalize polymorphic signature: apiRequest('/path', 'POST', { ... })
        if (typeof options === 'string') {
            const method = options.toUpperCase();
            options = {
                method,
                ...(maybeBody ? { body: (typeof maybeBody === 'string' || maybeBody instanceof FormData) ? maybeBody : JSON.stringify(maybeBody) } : {})
            };
        } else if (options && options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
            options.body = JSON.stringify(options.body);
        }

        const headers = {
            'Accept': 'application/json',
            ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
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
        window.fetchBlockedUsers();
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

        const settingsHeaderEl = document.getElementById('settingsHeaderUsername');
        if (settingsHeaderEl) {
            const uName = (state.user && (state.user.display_name || state.user.username)) || 'zaidan';
            settingsHeaderEl.textContent = uName.toLowerCase();
        }

        // Update In-Sidebar Edit Profil elements
        const subpanelAvatar = document.getElementById('subpanelAvatarCircle');
        const subpanelName = document.getElementById('subpanelDisplayNameInput');
        const subpanelUser = document.getElementById('subpanelUsernameText');
        const subpanelPhone = document.getElementById('subpanelPhoneInput');
        const btnDeleteSubAvatar = document.getElementById('btnDeleteSubpanelAvatar');

        if (subpanelName && document.activeElement !== subpanelName) {
            subpanelName.value = state.user.display_name || '';
        }
        if (subpanelUser) {
            subpanelUser.textContent = state.user.username || '';
        }
        if (subpanelPhone && document.activeElement !== subpanelPhone) {
            subpanelPhone.value = state.user.phone_number || '';
        }
        if (btnDeleteSubAvatar) {
            btnDeleteSubAvatar.style.display = state.user.avatar ? 'inline-flex' : 'none';
        }
        if (subpanelAvatar) {
            if (state.user.avatar) {
                subpanelAvatar.innerHTML = `
                    <img src="${escapeHtml(state.user.avatar)}" alt="${escapeHtml(state.user.display_name)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">
                    <div class="subpanel-avatar-overlay">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                        </svg>
                        <span>UBAH FOTO</span>
                    </div>
                `;
            } else {
                subpanelAvatar.innerHTML = `
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                        <circle cx="12" cy="13" r="4"></circle>
                        <line x1="19" y1="5" x2="19" y2="9"></line>
                        <line x1="17" y1="7" x2="21" y2="7"></line>
                    </svg>
                    <div class="subpanel-avatar-overlay">
                        <span>TAMBAH FOTO</span>
                    </div>
                `;
            }
        }

        // Update Account subpanel details
        const subAccountEmail = document.getElementById('subpanelAccountEmail');
        const subAccountUser = document.getElementById('subpanelAccountUsername');
        if (subAccountEmail) subAccountEmail.textContent = state.user.email || 'Belum diatur';
        if (subAccountUser) subAccountUser.textContent = `@${state.user.username || ''}`;
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
        const phone = (document.getElementById('regPhone')?.value || '').trim();
        const password = document.getElementById('regPassword').value;
        const btn = document.getElementById('registerBtn');

        if (!displayName || !username || !email || !phone || !password) {
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
                    phone_number: phone,
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

            // Sinkronisasi status online & last seen kontak yang sedang aktif di chat window
            if (state.activeContact && !state.activeContact.is_group) {
                const freshActive = state.contacts.find(c => Number(c.id) === Number(state.activeContact.id));
                if (freshActive) {
                    state.activeContact = { ...state.activeContact, ...freshActive };
                    updateActiveUserOnlineStatus(state.activeContact);
                }
            }

            updateUnreadBadges();
            renderContactsList();
            renderChatsList();
        } catch (e) {
            console.error('Gagal mengambil daftar kontak:', e);
        }
    }

    async function fetchChatPreferences() {
        if (!state.token) return;
        try {
            const data = await apiRequest('/chat-preferences');
            if (data) {
                state.pinnedChats = {
                    direct: new Set((data.pinned_direct_ids || []).map(Number)),
                    group: new Set((data.pinned_group_ids || []).map(Number))
                };
                state.mutedChats = {
                    direct: new Set((data.muted_direct_ids || []).map(Number)),
                    group: new Set((data.muted_group_ids || []).map(Number))
                };
                renderChatsList();
                updateChatPreferencesUI();
            }
        } catch (e) {
            console.warn('Gagal memuat preferensi obrolan:', e);
        }
    }

    function isChatMuted(id, isGroup = false) {
        if (!id) return false;
        const numId = Number(id);
        if (isGroup) {
            return state.mutedChats?.group?.has(numId) ?? false;
        }
        return state.mutedChats?.direct?.has(numId) ?? false;
    }

    function isChatPinned(id, isGroup = false) {
        if (!id) return false;
        const numId = Number(id);
        if (isGroup) {
            return state.pinnedChats?.group?.has(numId) ?? false;
        }
        return state.pinnedChats?.direct?.has(numId) ?? false;
    }

    function updateChatPreferencesUI() {
        if (!state.activeContact) return;
        const isGroup = Boolean(state.activeContact.is_group);
        const targetId = isGroup ? Number(state.activeContact.group_id || state.activeContact.id) : Number(state.activeContact.id);
        const pinned = isChatPinned(targetId, isGroup);
        const muted = isChatMuted(targetId, isGroup);

        const pinLabel = document.getElementById('menuItemPinLabel');
        if (pinLabel) {
            pinLabel.textContent = pinned ? 'Lepas Sematan Obrolan' : 'Sematkan Obrolan';
        }

        const muteLabel = document.getElementById('menuItemMuteLabel');
        if (muteLabel) {
            muteLabel.textContent = muted ? 'Bunyikan Notifikasi' : 'Bisukan Notifikasi';
        }

        const infoMuteBtn = document.getElementById('btnInfoMuteToggle');
        const infoMuteLabel = document.getElementById('infoMuteLabel');
        if (infoMuteBtn) {
            infoMuteBtn.classList.toggle('active', muted);
            infoMuteBtn.style.color = muted ? '#ef4444' : '';
        }
        if (infoMuteLabel) {
            infoMuteLabel.textContent = muted ? 'Dibisukan' : 'Senyap';
        }

        const groupModalMuteBtn = document.getElementById('btnGroupModalMute');
        const groupModalMuteLabel = document.getElementById('groupModalMuteLabel');
        if (groupModalMuteBtn) {
            groupModalMuteBtn.classList.toggle('active', muted);
            groupModalMuteBtn.style.color = muted ? '#ef4444' : '';
        }
        if (groupModalMuteLabel) {
            groupModalMuteLabel.textContent = muted ? 'Dibisukan' : 'Senyap';
        }
    }

    window.handleTogglePinCurrentChat = async function () {
        if (!state.activeContact) return;
        const isGroup = Boolean(state.activeContact.is_group);
        const targetId = isGroup ? Number(state.activeContact.group_id || state.activeContact.id) : Number(state.activeContact.id);
        const targetType = isGroup ? 'group' : 'direct';

        try {
            const res = await apiRequest('/chat-preferences/pin', {
                method: 'POST',
                body: JSON.stringify({
                    target_type: targetType,
                    target_id: targetId
                })
            });
            if (res) {
                if (res.is_pinned) {
                    if (isGroup) state.pinnedChats.group.add(targetId);
                    else state.pinnedChats.direct.add(targetId);
                    showToast('Obrolan disematkan ke atas 📌', 'success');
                } else {
                    if (isGroup) state.pinnedChats.group.delete(targetId);
                    else state.pinnedChats.direct.delete(targetId);
                    showToast('Sematan obrolan dilepas', 'info');
                }
                renderChatsList();
                updateChatPreferencesUI();
            }
        } catch (e) {
            showToast('Gagal mengubah status sematan: ' + e.message, 'error');
        }
    };

    window.handleToggleMuteCurrentChat = async function () {
        if (!state.activeContact) return;
        const isGroup = Boolean(state.activeContact.is_group);
        const targetId = isGroup ? Number(state.activeContact.group_id || state.activeContact.id) : Number(state.activeContact.id);
        const targetType = isGroup ? 'group' : 'direct';

        try {
            const res = await apiRequest('/chat-preferences/mute', {
                method: 'POST',
                body: JSON.stringify({
                    target_type: targetType,
                    target_id: targetId
                })
            });
            if (res) {
                if (res.is_muted) {
                    if (isGroup) state.mutedChats.group.add(targetId);
                    else state.mutedChats.direct.add(targetId);
                    showToast('Notifikasi obrolan dibisukan 🔕', 'info');
                } else {
                    if (isGroup) state.mutedChats.group.delete(targetId);
                    else state.mutedChats.direct.delete(targetId);
                    showToast('Notifikasi obrolan dibunyikan 🔔', 'success');
                }
                renderChatsList();
                updateChatPreferencesUI();
            }
        } catch (e) {
            showToast('Gagal mengubah status bisu notifikasi: ' + e.message, 'error');
        }
    };

    window.handleToggleStarMessage = async function (msgIdentifier) {
        if (!state.activeContact) return;
        const isGroup = Boolean(state.activeContact.is_group);
        const chatKey = state.activeContact.id;
        const msgs = state.chats[chatKey] || [];
        const msg = msgs.find(m => String(m.id) === String(msgIdentifier) || (m.client_uuid && String(m.client_uuid) === String(msgIdentifier)));
        if (!msg || !msg.id) {
            showToast('Pesan belum tersinkronisasi ke server', 'info');
            return;
        }

        try {
            const res = await apiRequest('/starred-messages/toggle', {
                method: 'POST',
                body: JSON.stringify({
                    message_type: isGroup ? 'group' : 'direct',
                    message_id: msg.id
                })
            });
            if (res) {
                msg.is_starred = Boolean(res.is_starred);
                persistMessages();
                renderActiveMessages();
                showToast(res.is_starred ? 'Pesan dibintangi ⭐' : 'Bintang pesan dihapus', 'info');
            }
        } catch (e) {
            showToast('Gagal membintangi pesan: ' + e.message, 'error');
        }
    };

    async function fetchRequests() {
        try {
            const data = await apiRequest('/contacts/requests');
            const incomingList = Array.isArray(data) ? data : [];

            if (!state.knownRequestIds) {
                state.knownRequestIds = new Set();
                state.requestsInitialLoaded = false;
            }

            state.requests = incomingList;
            const reqCount = state.requests.length;

            // Update badge counter permintaan di Nav Rail & Sidebar
            const railReqBadge = document.getElementById('railRequestsBadge');
            const sidebarBadge = document.getElementById('requestCounterBadge');

            if (railReqBadge) {
                if (reqCount > 0) {
                    railReqBadge.style.display = 'inline-flex';
                    railReqBadge.textContent = reqCount > 99 ? '99+' : reqCount;
                } else {
                    railReqBadge.style.display = 'none';
                }
            }

            if (sidebarBadge) {
                if (reqCount > 0) {
                    sidebarBadge.style.display = 'inline-block';
                    sidebarBadge.textContent = reqCount;
                } else {
                    sidebarBadge.style.display = 'none';
                }
            }

            // Deteksi permintaan pertemanan baru yang belum pernah diterima di sesi ini
            const newRequests = incomingList.filter(r => !state.knownRequestIds.has(r.id));
            if (state.requestsInitialLoaded && newRequests.length > 0) {
                newRequests.forEach(req => {
                    playMessageChime();
                    const reqName = req.display_name || req.username || 'Pengguna';
                    const reqUser = req.username ? ` (@${req.username})` : '';
                    showToast(`Permintaan pertemanan baru dari ${reqName}${reqUser}!`, 'info');

                    if (window.Notification && Notification.permission === 'granted') {
                        try {
                            new Notification('ZChat - Permintaan Pertemanan', {
                                body: `${reqName}${reqUser} mengirimkan permintaan pertemanan kepada Anda.`,
                                icon: req.avatar || undefined
                            });
                        } catch (e) { }
                    }
                });

                if (railReqBadge) {
                    railReqBadge.classList.add('pulse');
                    setTimeout(() => railReqBadge.classList.remove('pulse'), 4000);
                }
            }

            state.knownRequestIds = new Set(incomingList.map(r => r.id));
            state.requestsInitialLoaded = true;

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
            const statusLabelText = isOnline ? 'Online' : (contact.last_seen_at ? formatLastSeenShort(contact.last_seen_at, false) : 'Offline');
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
                            <span class="user-status-text ${isOnline ? 'online' : 'offline'}">${statusLabelText}</span>
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
            const isPinned = state.pinnedChats && state.pinnedChats.direct && state.pinnedChats.direct.has(Number(contact.id));
            const isMuted = state.mutedChats && state.mutedChats.direct && state.mutedChats.direct.has(Number(contact.id));
            conversationItems.push({
                is_group: false,
                id: contact.id,
                raw: contact,
                display_name: contact.display_name,
                username: contact.username,
                is_online: Boolean(contact.is_online),
                is_pinned: Boolean(isPinned),
                is_muted: Boolean(isMuted),
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
            const isPinned = state.pinnedChats && state.pinnedChats.group && state.pinnedChats.group.has(Number(group.id));
            const isMuted = state.mutedChats && state.mutedChats.group && state.mutedChats.group.has(Number(group.id));
            conversationItems.push({
                is_group: true,
                id: chatKey,
                group_id: group.id,
                raw: group,
                display_name: group.name,
                username: `${group.members_count || (group.members ? group.members.length : 1)} anggota`,
                is_online: true,
                is_pinned: Boolean(isPinned),
                is_muted: Boolean(isMuted),
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

        conversationItems.sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) {
                return a.is_pinned ? -1 : 1;
            }
            return b.lastTime - a.lastTime;
        });

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
            const metaTagsHtml = `
                <span class="chat-meta-tags">
                    ${item.is_pinned ? '<span class="chat-pin-icon" title="Disematkan"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.77V6a3 3 0 0 0-6 0v4.77a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24Z"></path></svg></span>' : ''}
                    ${item.is_muted ? '<span class="chat-mute-icon" title="Notifikasi dibisukan"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg></span>' : ''}
                </span>
            `;

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
                const statusCheckHtml = isMeLastMsg ? renderListStatusCheck(lastMsg.status, true) : '';

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
                                    ${metaTagsHtml}
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
            const statusCheckHtml = isMeLastMsg ? renderListStatusCheck(lastMsg.status, false) : '';
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
                            <span class="list-item-title" style="display: flex; align-items: center; gap: 4px;">
                                <span>${escapeHtml(contact.display_name)}</span>
                                ${metaTagsHtml}
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
            if (state.knownRequestIds) state.knownRequestIds.delete(requesterId);
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
            if (state.knownRequestIds) state.knownRequestIds.delete(requesterId);
            await fetchRequests();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    // Navigation Rail Tab Switching & Controls
    window.switchRailTab = function (tab) {
        state.activeTab = tab;

        // On mobile screen, tapping a rail tab closes active chat to return to list view
        if (window.innerWidth <= 768) {
            const viewport = document.querySelector('.app-viewport');
            if (viewport && viewport.classList.contains('show-chat')) {
                window.closeActiveChat();
            }
        }

        const btnChats = document.getElementById('railBtnChats');
        const btnContacts = document.getElementById('railBtnContacts');
        const btnRequests = document.getElementById('railBtnRequests');
        const btnCalls = document.getElementById('railBtnCalls');
        const btnSettings = document.getElementById('btnRailSettings');

        const panelChats = document.getElementById('panelChats');
        const panelContacts = document.getElementById('panelContacts');
        const panelRequests = document.getElementById('panelRequests');
        const panelCalls = document.getElementById('panelCalls');
        const panelSettings = document.getElementById('panelSettings');
        const panelSubpanel = document.getElementById('panelSettingsSubpanel');

        const defaultHeader = document.getElementById('sidebarDefaultHeader');
        const settingsHeader = document.getElementById('sidebarSettingsHeader');
        const subpanelHeader = document.getElementById('sidebarSubpanelHeader');
        const defaultSearch = document.getElementById('sidebarDefaultSearch');
        const settingsSearch = document.getElementById('sidebarSettingsSearch');
        const defaultCategory = document.getElementById('sidebarDefaultCategory');
        const sectionLabel = document.getElementById('sidebarSectionLabel');
        const settingsUserHeader = document.getElementById('settingsHeaderUsername');

        [btnChats, btnContacts, btnRequests, btnCalls, btnSettings].forEach(b => { if (b) b.classList.remove('active'); });

        if (panelChats) panelChats.style.display = 'none';
        if (panelContacts) panelContacts.style.display = 'none';
        if (panelRequests) panelRequests.style.display = 'none';
        if (panelCalls) panelCalls.style.display = 'none';
        if (panelSettings) panelSettings.style.display = 'none';
        if (panelSubpanel) panelSubpanel.style.display = 'none';
        if (subpanelHeader) subpanelHeader.style.display = 'none';

        if (tab === 'settings') {
            if (btnSettings) btnSettings.classList.add('active');
            if (defaultHeader) defaultHeader.style.display = 'none';
            if (subpanelHeader) subpanelHeader.style.display = 'none';
            if (settingsHeader) settingsHeader.style.display = 'flex';
            if (defaultSearch) defaultSearch.style.display = 'none';
            if (settingsSearch) settingsSearch.style.display = 'block';
            if (defaultCategory) defaultCategory.style.display = 'none';
            if (panelSettings) panelSettings.style.display = 'block';

            if (settingsUserHeader) {
                const uName = (state.user && (state.user.display_name || state.user.username)) || 'zaidan';
                settingsUserHeader.textContent = uName.toLowerCase();
            }

            // Reset filter
            const filterInput = document.getElementById('settingsFilterInput');
            if (filterInput) {
                filterInput.value = '';
                filterSettingsList('');
            }
        } else {
            // Restore default chat sidebar header & search
            if (defaultHeader) defaultHeader.style.display = 'flex';
            if (settingsHeader) settingsHeader.style.display = 'none';
            if (subpanelHeader) subpanelHeader.style.display = 'none';
            if (defaultSearch) defaultSearch.style.display = 'block';
            if (settingsSearch) settingsSearch.style.display = 'none';
            if (defaultCategory) defaultCategory.style.display = 'flex';

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
        }
    };

    window.filterSettingsList = function (query) {
        const items = document.querySelectorAll('#settingsMenuList .settings-item');
        const emptyEl = document.getElementById('settingsEmptyFilter');
        const q = (query || '').toLowerCase().trim();
        let visibleCount = 0;

        items.forEach(item => {
            const title = (item.querySelector('.settings-item-title')?.textContent || '').toLowerCase();
            const desc = (item.querySelector('.settings-item-desc')?.textContent || '').toLowerCase();
            const keywords = (item.getAttribute('data-keywords') || '').toLowerCase();

            if (!q || title.includes(q) || desc.includes(q) || keywords.includes(q)) {
                item.style.display = 'flex';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });

        if (emptyEl) {
            emptyEl.style.display = (visibleCount === 0 && q) ? 'block' : 'none';
        }
    };

    // In-Sidebar Settings Subpanel Controller (No Center-Screen Modals)
    window.openSettingsSubpanel = function (panelId) {
        const settingsHeader = document.getElementById('sidebarSettingsHeader');
        const settingsSearch = document.getElementById('sidebarSettingsSearch');
        const panelSettings = document.getElementById('panelSettings');
        const subpanelHeader = document.getElementById('sidebarSubpanelHeader');
        const subpanelTitle = document.getElementById('settingsSubpanelTitle');
        const panelSubpanel = document.getElementById('panelSettingsSubpanel');

        const subpanels = document.querySelectorAll('#panelSettingsSubpanel .subpanel-content');
        subpanels.forEach(sp => { sp.style.display = 'none'; });

        const titles = {
            'profile': 'Edit profil',
            'account': 'Akun',
            'privacy': 'Privasi',
            'chat': 'Chat',
            'notifications': 'Notifikasi',
            'keyboard': 'Pintasan keyboard',
            'help': 'Bantuan dan masukan'
        };

        const targetId = 'subpanel' + panelId.charAt(0).toUpperCase() + panelId.slice(1);
        const targetEl = document.getElementById(targetId);

        if (targetEl) {
            targetEl.style.display = 'flex';
            if (subpanelTitle) subpanelTitle.textContent = titles[panelId] || 'Pengaturan';

            if (settingsHeader) settingsHeader.style.display = 'none';
            if (settingsSearch) settingsSearch.style.display = 'none';
            if (panelSettings) panelSettings.style.display = 'none';

            if (subpanelHeader) subpanelHeader.style.display = 'flex';
            if (panelSubpanel) panelSubpanel.style.display = 'block';

            // Populate specific subpanel states
            if (panelId === 'profile') {
                updateCurrentUserUI();
            } else if (panelId === 'account') {
                const subAccountEmail = document.getElementById('subpanelAccountEmail');
                const subAccountUser = document.getElementById('subpanelAccountUsername');
                if (subAccountEmail && state.user) subAccountEmail.textContent = state.user.email || 'Belum diatur';
                if (subAccountUser && state.user) subAccountUser.textContent = `@${state.user.username || ''}`;
            } else if (panelId === 'privacy') {
                const streamerToggle = document.getElementById('subpanelStreamerToggle');
                if (streamerToggle) streamerToggle.checked = Boolean(state.streamerMode);
            } else if (panelId === 'notifications') {
                const soundToggle = document.getElementById('subpanelSoundToggle');
                if (soundToggle) soundToggle.checked = Boolean(state.soundEnabled);
            } else if (panelId === 'chat') {
                updateSubpanelThemeLabel();
            }
        }
    };

    window.backToSettingsMain = function () {
        const settingsHeader = document.getElementById('sidebarSettingsHeader');
        const settingsSearch = document.getElementById('sidebarSettingsSearch');
        const panelSettings = document.getElementById('panelSettings');
        const subpanelHeader = document.getElementById('sidebarSubpanelHeader');
        const panelSubpanel = document.getElementById('panelSettingsSubpanel');

        if (subpanelHeader) subpanelHeader.style.display = 'none';
        if (panelSubpanel) panelSubpanel.style.display = 'none';

        if (settingsHeader) settingsHeader.style.display = 'flex';
        if (settingsSearch) settingsSearch.style.display = 'block';
        if (panelSettings) panelSettings.style.display = 'block';

        const filterInput = document.getElementById('settingsFilterInput');
        if (filterInput) {
            filterInput.value = '';
            filterSettingsList('');
        }
    };

    window.updateSubpanelThemeLabel = function () {
        const desc = document.getElementById('subpanelThemeDesc');
        if (desc) {
            const curTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            desc.textContent = curTheme === 'dark' ? 'Mode Gelap Obsidian (Aktif)' : 'Mode Terang (Aktif)';
        }
    };

    window.copyPhoneNumber = function () {
        const input = document.getElementById('subpanelPhoneInput');
        const phone = (input && input.value) || (state.user && state.user.phone_number) || '089637351685';
        navigator.clipboard.writeText(phone).then(() => {
            showToast('Nomor telepon disalin ke papan klip!', 'success');
        }).catch(() => {
            showToast('Nomor telepon: ' + phone, 'info');
        });
    };

    window.handleSaveProfileSubpanel = async function () {
        const nameInput = document.getElementById('subpanelDisplayNameInput');
        const phoneInput = document.getElementById('subpanelPhoneInput');
        const btnSave = document.getElementById('btnSaveSubpanelProfile');
        const newName = (nameInput ? nameInput.value : '').trim();
        const newPhone = (phoneInput ? phoneInput.value : '').trim();

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
                body: JSON.stringify({ display_name: newName, phone_number: newPhone })
            });

            if (updated) {
                state.user.display_name = updated.display_name || newName;
                if (updated.avatar !== undefined) {
                    state.user.avatar = updated.avatar;
                }
                if (updated.phone_number !== undefined) {
                    state.user.phone_number = updated.phone_number;
                }
                localStorage.setItem('zchat_user', JSON.stringify(state.user));
                updateCurrentUserUI();
                showToast('Profil WhatsApp berhasil diperbarui!', 'success');
            }
        } catch (err) {
            showToast('Gagal memperbarui profil: ' + err.message, 'error');
        } finally {
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.innerHTML = `
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Simpan Perubahan</span>
                `;
            }
        }
    };

    window.requestBrowserNotificationPermission = function () {
        if (!('Notification' in window)) {
            showToast('Browser ini tidak mendukung notifikasi desktop.', 'info');
            return;
        }
        if (Notification.permission === 'granted') {
            showToast('Izin notifikasi desktop sudah aktif.', 'success');
            return;
        }
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showToast('Izin notifikasi desktop berhasil diberikan.', 'success');
            } else {
                showToast('Izin notifikasi tidak diberikan.', 'info');
            }
        });
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

    window.toggleRightInfoPanel = function (action) {
        const panel = document.getElementById('chatInfoPanel');
        const backdrop = document.getElementById('infoPanelBackdrop');
        if (!panel) return;

        let shouldOpen;
        if (action === true) {
            shouldOpen = true;
        } else if (action === false) {
            shouldOpen = false;
        } else {
            shouldOpen = !panel.classList.contains('open');
        }

        if (shouldOpen) {
            panel.classList.add('open');
            if (backdrop) backdrop.classList.add('active');
            if (state.activeContact) {
                if (state.activeContact.is_group) {
                    const groupId = Number(state.activeContact.group_id || String(state.activeContact.id).replace('group_', ''));
                    const group = (state.groups || []).find(g => Number(g.id) === groupId) || state.activeContact;
                    updateRightPanelForGroup(group);
                } else {
                    updateRightPanelMediaAndDocs(state.activeContact.id);
                }
            }
        } else {
            panel.classList.remove('open');
            if (backdrop) backdrop.classList.remove('active');
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
                const imgUrl = img.url || '';
                const imgName = escapeHtml(img.name || 'Gambar');
                if (!imgUrl) return '';
                const jsSafeUrl = imgUrl.replace(/'/g, "\\'");
                const jsSafeName = imgName.replace(/'/g, "\\'");
                return `
                    <button type="button" class="media-thumb-card" title="${imgName}" onclick="openMediaLightbox('${jsSafeUrl}', { name: '${jsSafeName}' })" style="background-image: url('${imgUrl}'); background-size: cover; background-position: center; border: 1px solid var(--border-card); display: block; width: 100%; cursor: pointer;">
                    </button>
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

    // Modal detail grup: Media & Dokumen populator
    function renderGroupModalMediaAndDocs(groupId) {
        const mediaContainer = document.getElementById('groupModalMediaGrid');
        const docsContainer = document.getElementById('groupModalDocsList');
        const mediaCountEl = document.getElementById('groupModalMediaCount');
        const docsCountEl = document.getElementById('groupModalDocsCount');

        if (!groupId || !mediaContainer || !docsContainer) return;

        const chatKey = 'group_' + groupId;
        const messages = state.chats[chatKey] || [];
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
            const recentImages = images.slice(-12).reverse();
            mediaContainer.innerHTML = recentImages.map(img => {
                const imgUrl = img.url || '';
                const imgName = escapeHtml(img.name || 'Gambar');
                if (!imgUrl) return '';
                const jsSafeUrl = imgUrl.replace(/'/g, "\\'");
                const jsSafeName = imgName.replace(/'/g, "\\'");
                return `
                    <button type="button" class="media-thumb-card" title="${imgName}" onclick="openMediaLightbox('${jsSafeUrl}', { name: '${jsSafeName}' })" style="background-image: url('${imgUrl}'); background-size: cover; background-position: center; border: 1px solid var(--border-card); display: block; width: 100%; cursor: pointer;">
                    </button>
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

    // Header klik: Jika grup buka modal info grup (media/dokumen), jika kontak buka panel kanan
    window.handleActiveChatHeaderClick = function () {
        if (!state.activeContact) return;
        const isGroup = Boolean(state.activeContact.is_group || state.activeContact.isGroup || String(state.activeContact.id).startsWith('group_') || state.activeContact.group_id);
        if (isGroup) {
            window.openGroupInfoModal();
        } else {
            window.toggleRightInfoPanel();
        }
    };

    window.handleDropdownInfoClick = function () {
        window.closeChatDropdown();
        if (!state.activeContact) return;
        const isGroup = Boolean(state.activeContact.is_group || state.activeContact.isGroup || String(state.activeContact.id).startsWith('group_') || state.activeContact.group_id);
        if (isGroup) {
            window.openGroupInfoModal();
        } else {
            window.toggleRightInfoPanel(true);
        }
    };

    // Modal Informasi & Media Grup
    window.openGroupInfoModal = function () {
        if (!state.activeContact) return;
        const isGroup = Boolean(state.activeContact.is_group || state.activeContact.isGroup || String(state.activeContact.id).startsWith('group_') || state.activeContact.group_id);
        if (!isGroup) {
            if (typeof window.openContactInfoModal === 'function') {
                window.openContactInfoModal();
            }
            return;
        }

        const groupId = Number(state.activeContact.group_id || String(state.activeContact.id).replace('group_', ''));
        const group = (state.groups || []).find(g => Number(g.id) === groupId) || state.activeContact;

        const modal = document.getElementById('groupInfoModal');
        if (!modal) {
            console.error('Modal #groupInfoModal tidak ditemukan di DOM!');
            return;
        }

        const avatarEl = document.getElementById('groupModalAvatarCircle');
        const nameEl = document.getElementById('groupModalName');
        const descEl = document.getElementById('groupModalDescription');
        const membersSubEl = document.getElementById('groupModalMembersSubtitle');
        const btnHeaderEdit = document.getElementById('btnGroupModalEditHeader');
        const btnEditAction = document.getElementById('btnGroupModalEditAction');
        const btnLeaveAction = document.getElementById('btnGroupModalLeaveAction');
        const btnDeleteAction = document.getElementById('btnGroupModalDeleteAction');

        if (avatarEl) {
            if (group.avatar) {
                avatarEl.className = 'avatar-circle group-modal-avatar';
                avatarEl.style.overflow = 'hidden';
                avatarEl.innerHTML = `<img src="${escapeHtml(group.avatar)}" alt="${escapeHtml(group.name)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            } else {
                avatarEl.className = 'avatar-circle group-modal-avatar avatar-pastel-purple';
                avatarEl.style.overflow = 'hidden';
                avatarEl.innerHTML = `
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                `;
            }
        }

        if (nameEl) nameEl.textContent = group.name || 'Grup';
        if (descEl) descEl.textContent = group.description || 'Grup Obrolan ZChat';
        const count = group.members ? group.members.length : (group.members_count || 1);
        if (membersSubEl) membersSubEl.textContent = `${count} anggota`;

        const isAdmin = group.my_role === 'admin' || (Number(group.created_by) === Number(state.user?.id));
        if (btnHeaderEdit) btnHeaderEdit.style.display = isAdmin ? 'inline-flex' : 'none';
        if (btnEditAction) btnEditAction.style.display = isAdmin ? 'inline-flex' : 'none';
        if (btnDeleteAction) btnDeleteAction.style.display = isAdmin ? 'inline-flex' : 'none';
        if (btnLeaveAction) btnLeaveAction.style.display = 'inline-flex';

        // Update status senyap modal
        const isMuted = isChatMuted(groupId, true);
        const muteBtn = document.getElementById('btnGroupModalMute');
        const muteLabel = document.getElementById('groupModalMuteLabel');
        if (muteBtn) {
            muteBtn.classList.toggle('active', isMuted);
            muteBtn.style.color = isMuted ? '#ef4444' : '';
        }
        if (muteLabel) {
            muteLabel.textContent = isMuted ? 'Dibisukan' : 'Senyap';
        }

        // Tampilkan kode undangan grup
        const inviteDisplayEl = document.getElementById('groupModalInviteCodeDisplay');
        if (inviteDisplayEl) {
            inviteDisplayEl.textContent = group.invite_code || '-';
        }
        const btnRegenerate = document.getElementById('btnRegenerateInviteCode');
        if (btnRegenerate) {
            btnRegenerate.style.display = isAdmin ? 'inline-flex' : 'none';
        }

        renderGroupModalMediaAndDocs(groupId);

        modal.style.display = 'flex';
        modal.classList.add('active');
        modal.classList.add('show');
    };

    window.closeGroupInfoModal = function () {
        const modal = document.getElementById('groupInfoModal');
        if (modal) {
            modal.classList.remove('active');
            modal.classList.remove('show');
            modal.style.display = 'none';
        }
    };

    window.copyGroupInviteLink = function () {
        if (!state.activeContact) return;
        const groupId = Number(state.activeContact.group_id || state.activeContact.id);
        const group = (state.groups || []).find(g => Number(g.id) === groupId) || state.activeContact;
        const code = group.invite_code;
        if (!code) {
            showToast('Kode undangan tidak tersedia untuk grup ini.', 'error');
            return;
        }
        const origin = window.location.origin;
        const inviteLink = `${origin}/join/${code}`;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(inviteLink).then(() => {
                showToast('Tautan undangan grup berhasil disalin ke papan klip!', 'success');
            }).catch(() => {
                prompt('Salin tautan undangan grup di bawah ini:', inviteLink);
            });
        } else {
            prompt('Salin tautan undangan grup di bawah ini:', inviteLink);
        }
    };

    window.handleRegenerateInviteCode = async function () {
        if (!state.activeContact) return;
        const groupId = Number(state.activeContact.group_id || state.activeContact.id);
        const confirmed = await showConfirmModal({
            title: 'Perbarui Kode Undangan?',
            message: 'Tautan dan kode undangan lama tidak akan dapat digunakan lagi setelah kode baru dibuat. Lanjutkan?',
            confirmText: 'Buat Baru',
            cancelText: 'Batal',
            type: 'warning',
            icon: 'refresh'
        });
        if (!confirmed) return;

        try {
            const res = await apiRequest(`/groups/${groupId}/invite-code/regenerate`, {
                method: 'POST'
            });
            if (res && res.invite_code) {
                state.activeContact.invite_code = res.invite_code;
                const targetGroup = (state.groups || []).find(g => Number(g.id) === groupId);
                if (targetGroup) targetGroup.invite_code = res.invite_code;

                const displayEl = document.getElementById('groupModalInviteCodeDisplay');
                if (displayEl) displayEl.textContent = res.invite_code;

                showToast('Kode undangan baru berhasil dibuat!', 'success');
            }
        } catch (err) {
            showToast('Gagal memperbarui kode undangan: ' + err.message, 'error');
        }
    };

    window.handleSimulatedAction = function (name) {
        showToast(`${name} sedang disiapkan.`, 'info');
    };

    function playMessageChime(sourceId = null, isGroup = false) {
        if (!state.soundEnabled) return;
        if (sourceId && isChatMuted(sourceId, isGroup)) return;
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
        const subBadgeEl = document.getElementById('subpanelAvatarInfoBadge');
        const btnDelete = document.getElementById('btnDeleteUserAvatar');
        const subBtnDelete = document.getElementById('btnDeleteSubpanelAvatar');

        const updateBadge = (html, text) => {
            if (badgeEl) {
                if (html) badgeEl.innerHTML = html; else if (text) badgeEl.textContent = text;
            }
            if (subBadgeEl) {
                if (html) subBadgeEl.innerHTML = html; else if (text) subBadgeEl.textContent = text;
            }
        };

        updateBadge('<span style="color: #a78bfa;">Mengonversi ke 500x500 WebP...</span>', null);

        try {
            const result = await compressAndCropProfileImage(file, 500, 0.85);

            // Tampilkan preview instan
            if (avatarEl) {
                avatarEl.innerHTML = `<img src="${result.dataUrl}" alt="Preview" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`;
                avatarEl.className = 'avatar-circle';
            }

            const origKb = Math.round(result.originalSize / 1024);
            const compKb = Math.round(result.compressedSize / 1024);
            updateBadge(`<span style="color: #10b981;">Terkonversi: ${compKb} KB (dari ${origKb} KB) • Mengunggah...</span>`, null);

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
                if (subBtnDelete) subBtnDelete.style.display = 'inline-flex';
                updateBadge(`<span style="color: #10b981;">Foto WhatsApp terpasang (${compKb} KB)!</span>`, null);
                showToast('Foto profil WhatsApp berhasil diperbarui!', 'success');
            }
        } catch (err) {
            console.error('Avatar upload error:', err);
            showToast(err.message || 'Gagal mengunggah foto profil', 'error');
            updateBadge(null, 'Ukuran standar WhatsApp (500x500) • Maks 10MB');
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
        const confirmed = await showConfirmModal({
            title: 'Hapus Foto Profil?',
            message: 'Apakah Anda yakin ingin menghapus foto profil akun Anda?',
            confirmText: 'Hapus Foto',
            cancelText: 'Batal',
            type: 'danger',
            icon: 'trash'
        });
        if (!confirmed) return;

        const avatarEl = document.getElementById('profileModalAvatar');
        const badgeEl = document.getElementById('userAvatarInfoBadge');
        const subBadgeEl = document.getElementById('subpanelAvatarInfoBadge');
        const btnDelete = document.getElementById('btnDeleteUserAvatar');
        const subBtnDelete = document.getElementById('btnDeleteSubpanelAvatar');

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
            if (subBtnDelete) subBtnDelete.style.display = 'none';
            if (badgeEl) {
                badgeEl.textContent = 'Ukuran standar WhatsApp (500x500) • Maks 10MB';
                badgeEl.style.color = 'var(--text-muted)';
            }
            if (subBadgeEl) {
                subBadgeEl.textContent = 'Ukuran standar WhatsApp (500x500) • Maks 10MB';
                subBadgeEl.style.color = 'var(--text-muted)';
            }
            showToast('Foto profil berhasil dihapus.', 'info');
        } catch (err) {
            console.error('Delete avatar error:', err);
            showToast(err.message || 'Gagal menghapus foto profil', 'error');
        }
    };

    // Open User Profile in sidebar subpanel (Never popup modal in center of screen)
    window.openUserProfileModal = function () {
        if (typeof switchRailTab === 'function') {
            switchRailTab('settings');
        }
        if (typeof openSettingsSubpanel === 'function') {
            openSettingsSubpanel('profile');
        }
    };

    window.closeUserProfileModal = function () {
        const modal = document.getElementById('userProfileModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
        if (typeof backToSettingsMain === 'function') {
            backToSettingsMain();
        }
    };

    // Modal compatibility aliases - redirect to in-sidebar subpanels (No center-screen modals)
    window.openAccountSecurityModal = function () {
        if (typeof switchRailTab === 'function') switchRailTab('settings');
        if (typeof openSettingsSubpanel === 'function') openSettingsSubpanel('account');
    };
    window.closeAccountSecurityModal = function () {
        if (typeof backToSettingsMain === 'function') backToSettingsMain();
    };
    window.openPrivacySettingsModal = function () {
        if (typeof switchRailTab === 'function') switchRailTab('settings');
        if (typeof openSettingsSubpanel === 'function') openSettingsSubpanel('privacy');
    };
    window.closePrivacySettingsModal = function () {
        if (typeof backToSettingsMain === 'function') backToSettingsMain();
    };
    window.openChatSettingsModal = function () {
        if (typeof switchRailTab === 'function') switchRailTab('settings');
        if (typeof openSettingsSubpanel === 'function') openSettingsSubpanel('chat');
    };
    window.closeChatSettingsModal = function () {
        if (typeof backToSettingsMain === 'function') backToSettingsMain();
    };
    window.openNotificationSettingsModal = function () {
        if (typeof switchRailTab === 'function') switchRailTab('settings');
        if (typeof openSettingsSubpanel === 'function') openSettingsSubpanel('notifications');
    };
    window.closeNotificationSettingsModal = function () {
        if (typeof backToSettingsMain === 'function') backToSettingsMain();
    };
    window.openKeyboardShortcutsModal = function () {
        if (typeof switchRailTab === 'function') switchRailTab('settings');
        if (typeof openSettingsSubpanel === 'function') openSettingsSubpanel('keyboard');
    };
    window.closeKeyboardShortcutsModal = function () {
        if (typeof backToSettingsMain === 'function') backToSettingsMain();
    };
    window.openHelpModal = function () {
        if (typeof switchRailTab === 'function') switchRailTab('settings');
        if (typeof openSettingsSubpanel === 'function') openSettingsSubpanel('help');
    };
    window.closeHelpModal = function () {
        if (typeof backToSettingsMain === 'function') backToSettingsMain();
    };

    window.handleSaveProfile = async function (e) {
        if (e) e.preventDefault();
        const nameInput = document.getElementById('profileDisplayNameInput');
        const phoneInput = document.getElementById('profilePhoneInput');
        const btnSave = document.getElementById('btnSaveProfile');
        const newName = (nameInput ? nameInput.value : '').trim();
        const newPhone = (phoneInput ? phoneInput.value : '').trim();

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
                body: JSON.stringify({ display_name: newName, phone_number: newPhone })
            });

            if (updated) {
                state.user.display_name = updated.display_name || newName;
                if (updated.avatar !== undefined) {
                    state.user.avatar = updated.avatar;
                }
                if (updated.phone_number !== undefined) {
                    state.user.phone_number = updated.phone_number;
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
        if (!msgId) return;
        const rawId = String(msgId).trim();
        const safeId = CSS.escape(rawId);
        const row = document.querySelector(`.message-row[data-msg-id="${safeId}"]`) ||
                    document.querySelector(`.message-row[data-msg-uuid="${safeId}"]`);
        if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.classList.remove('reply-highlight-pulse');
            void row.offsetWidth; // Trigger DOM reflow to re-trigger pulse
            row.classList.add('reply-highlight-pulse');
            setTimeout(() => {
                row.classList.remove('reply-highlight-pulse');
            }, 1400);
        } else {
            if (typeof showToast === 'function') {
                showToast('Pesan asli tidak ditemukan di riwayat percakapan saat ini.', 'info');
            }
        }
    };

    // ==========================================
    // In-Chat Search Navigation & Match Jumping
    // ==========================================
    window.toggleInChatSearch = function (show) {
        const bar = document.getElementById('inChatSearchBar');
        const input = document.getElementById('inChatSearchInput');
        if (!bar) return;

        const willShow = (typeof show === 'boolean') ? show : (bar.style.display === 'none' || !bar.style.display);
        if (willShow) {
            bar.style.display = 'block';
            if (input) {
                input.focus();
                input.select();
            }
            if (input && input.value.trim()) {
                window.handleInChatSearch({ target: input });
            }
        } else {
            bar.style.display = 'none';
            state.inChatSearchQuery = '';
            state.inChatSearchMatches = [];
            state.inChatSearchIndex = -1;
            if (input) input.value = '';
            const countEl = document.getElementById('inChatSearchCount');
            if (countEl) countEl.textContent = '0 hasil';
            if (state.activeContact) {
                renderMessages();
            }
        }
    };

    window.handleInChatSearch = function (e) {
        const query = (e.target.value || '').trim();
        state.inChatSearchQuery = query;
        if (!query) {
            state.inChatSearchMatches = [];
            state.inChatSearchIndex = -1;
            const countEl = document.getElementById('inChatSearchCount');
            if (countEl) countEl.textContent = '0 hasil';
            renderMessages();
            return;
        }

        renderMessages();

        const marks = Array.from(document.querySelectorAll('#messagesContainer mark.search-highlight'));
        state.inChatSearchMatches = marks;
        state.inChatSearchIndex = marks.length > 0 ? 0 : -1;

        updateInChatSearchUI();
        if (marks.length > 0) {
            jumpToSearchMatch(0);
        }
    };

    window.handleInChatSearchKeydown = function (e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            window.toggleInChatSearch(false);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                window.prevInChatSearchMatch();
            } else {
                window.nextInChatSearchMatch();
            }
        }
    };

    window.nextInChatSearchMatch = function () {
        if (!state.inChatSearchMatches || state.inChatSearchMatches.length === 0) return;
        state.inChatSearchIndex = (state.inChatSearchIndex + 1) % state.inChatSearchMatches.length;
        jumpToSearchMatch(state.inChatSearchIndex);
    };

    window.prevInChatSearchMatch = function () {
        if (!state.inChatSearchMatches || state.inChatSearchMatches.length === 0) return;
        state.inChatSearchIndex = (state.inChatSearchIndex - 1 + state.inChatSearchMatches.length) % state.inChatSearchMatches.length;
        jumpToSearchMatch(state.inChatSearchIndex);
    };

    function jumpToSearchMatch(index) {
        const marks = state.inChatSearchMatches;
        if (!marks || index < 0 || index >= marks.length) return;

        marks.forEach((m, idx) => {
            if (idx === index) {
                m.classList.add('search-highlight-active');
                m.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                m.classList.remove('search-highlight-active');
            }
        });
        updateInChatSearchUI();
    }

    function updateInChatSearchUI() {
        const countEl = document.getElementById('inChatSearchCount');
        const prevBtn = document.getElementById('btnInChatSearchPrev');
        const nextBtn = document.getElementById('btnInChatSearchNext');
        const total = state.inChatSearchMatches ? state.inChatSearchMatches.length : 0;
        const current = total > 0 ? (state.inChatSearchIndex + 1) : 0;

        if (countEl) {
            countEl.textContent = total > 0 ? `${current} dari ${total}` : '0 hasil';
        }
        if (prevBtn) prevBtn.disabled = total <= 1;
        if (nextBtn) nextBtn.disabled = total <= 1;
    }

    // ==========================================
    // Block & Unblock Contact Management
    // ==========================================
    window.fetchBlockedUsers = async function () {
        if (!state.token) return [];
        try {
            const res = await apiRequest('/blocked-users');
            if (Array.isArray(res)) {
                state.blockedUsers = res;
                state.blockedUserIds = new Set(res.map(u => Number(u.id)));

                const countEl = document.getElementById('subpanelBlockedCount');
                if (countEl) {
                    countEl.textContent = `${res.length} kontak`;
                }

                renderBlockedUsersList();
                updateActiveChatBlockState();
                return res;
            }
        } catch (err) {
            console.warn('Gagal memuat daftar kontak diblokir:', err);
        }
        return [];
    };

    window.openBlockedUsersModal = function () {
        const modal = document.getElementById('blockedUsersModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
        const filterInput = document.getElementById('searchBlockedUsersInput');
        if (filterInput) filterInput.value = '';
        window.fetchBlockedUsers();
    };

    window.closeBlockedUsersModal = function () {
        const modal = document.getElementById('blockedUsersModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    };

    window.filterBlockedUsersList = function (query) {
        const q = (query || '').toLowerCase().trim();
        if (!q) {
            renderBlockedUsersList();
            return;
        }
        const filtered = (state.blockedUsers || []).filter(u => {
            const name = (u.display_name || u.name || '').toLowerCase();
            const username = (u.username || '').toLowerCase();
            return name.includes(q) || username.includes(q);
        });
        renderBlockedUsersList(filtered);
    };

    function renderBlockedUsersList(filteredList = null) {
        const list = document.getElementById('blockedUsersList');
        if (!list) return;

        const users = filteredList !== null ? filteredList : (state.blockedUsers || []);
        if (users.length === 0) {
            list.innerHTML = `
                <div class="empty-state" style="padding: 2rem 0; text-align: center;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted); margin: 0 auto 0.5rem; opacity: 0.6;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                    </svg>
                    <p class="empty-state-desc" style="color: var(--text-muted); font-size: 0.85rem;">Tidak ada kontak yang sedang diblokir.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = users.map(u => {
            const displayName = escapeHtml(u.display_name || u.name || u.username);
            const username = escapeHtml(u.username ? `@${u.username}` : (u.email || ''));
            const pastelClass = getPastelColorClass(displayName);
            const initials = displayName.split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase() || 'U';

            let avatarHtml = `<div class="avatar-circle ${pastelClass}" style="width: 38px; height: 38px; font-size: 0.8rem;">${initials}</div>`;
            if (u.avatar) {
                avatarHtml = `
                    <div class="avatar-circle" style="width: 38px; height: 38px; overflow: hidden; padding: 0;">
                        <img src="${escapeHtml(u.avatar)}" alt="${displayName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
                    </div>
                `;
            }

            return `
                <div class="blocked-user-item">
                    <div class="blocked-user-left">
                        ${avatarHtml}
                        <div style="min-width: 0;">
                            <div class="blocked-user-name">${displayName}</div>
                            <div class="blocked-user-sub">${username}</div>
                        </div>
                    </div>
                    <button type="button" class="btn-unblock-pill" onclick="unblockContact(${u.id})">
                        Buka Blokir
                    </button>
                </div>
            `;
        }).join('');
    }

    window.handleToggleBlockContact = async function () {
        if (!state.activeContact || state.activeContact.is_group) return;
        const targetId = Number(state.activeContact.id);
        const contactName = state.activeContact.display_name || state.activeContact.username || 'Kontak ini';

        if (state.blockedUserIds && state.blockedUserIds.has(targetId)) {
            await window.unblockContact(targetId);
        } else {
            openConfirmModal({
                title: 'Blokir Kontak?',
                message: `Apakah Anda yakin ingin memblokir ${contactName}? Kontak yang diblokir tidak akan bisa mengirimkan pesan atau melakukan panggilan kepada Anda.`,
                confirmText: 'Blokir',
                danger: true,
                onConfirm: async () => {
                    try {
                        await apiRequest(`/contacts/${targetId}/block`, { method: 'POST' });
                        showToast(`${contactName} berhasil diblokir.`, 'success');
                        await window.fetchBlockedUsers();
                    } catch (err) {
                        showToast(err.message || 'Gagal memblokir kontak.', 'error');
                    }
                }
            });
        }
    };

    window.unblockContact = async function (targetUserId) {
        try {
            await apiRequest(`/contacts/${targetUserId}/unblock`, { method: 'POST' });
            showToast('Blokir kontak berhasil dibuka.', 'success');
            await window.fetchBlockedUsers();
        } catch (err) {
            showToast(err.message || 'Gagal membuka blokir kontak.', 'error');
        }
    };

    window.updateActiveChatBlockState = function () {
        const banner = document.getElementById('blockedContactBanner');
        const form = document.getElementById('messageForm');
        const textarea = document.getElementById('messageInput');
        const btnSend = document.getElementById('btnSendMessage');
        const btnRecord = document.getElementById('btnVoiceNoteRecord');
        const menuBlock = document.getElementById('menuItemBlockContact');
        const menuBlockLabel = document.getElementById('menuItemBlockContactLabel');
        const panelBlock = document.getElementById('btnBlockContactAction');
        const panelBlockLabel = document.getElementById('btnBlockContactActionLabel');

        if (!state.activeContact || state.activeContact.is_group) {
            if (banner) banner.style.display = 'none';
            if (form) form.classList.remove('chat-input-disabled');
            if (textarea) textarea.disabled = false;
            if (btnSend) btnSend.disabled = false;
            if (btnRecord) btnRecord.disabled = false;
            if (menuBlock) menuBlock.style.display = 'none';
            if (panelBlock) panelBlock.style.display = 'none';
            return;
        }

        if (menuBlock) menuBlock.style.display = 'flex';
        if (panelBlock) panelBlock.style.display = 'flex';

        const isBlocked = state.blockedUserIds && state.blockedUserIds.has(Number(state.activeContact.id));
        if (isBlocked) {
            if (banner) banner.style.display = 'flex';
            if (form) form.classList.add('chat-input-disabled');
            if (textarea) textarea.disabled = true;
            if (btnSend) btnSend.disabled = true;
            if (btnRecord) btnRecord.disabled = true;

            if (menuBlockLabel) menuBlockLabel.textContent = 'Buka Blokir';
            if (panelBlockLabel) panelBlockLabel.textContent = 'Buka Blokir';
            if (panelBlock) {
                panelBlock.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                panelBlock.style.background = 'rgba(16, 185, 129, 0.1)';
                panelBlock.style.color = '#10b981';
            }
        } else {
            if (banner) banner.style.display = 'none';
            if (form) form.classList.remove('chat-input-disabled');
            if (textarea) textarea.disabled = false;
            if (btnSend) btnSend.disabled = false;
            if (btnRecord) btnRecord.disabled = false;

            if (menuBlockLabel) menuBlockLabel.textContent = 'Blokir Kontak';
            if (panelBlockLabel) panelBlockLabel.textContent = 'Blokir Kontak';
            if (panelBlock) {
                panelBlock.style.borderColor = 'rgba(245, 158, 11, 0.35)';
                panelBlock.style.background = 'rgba(245, 158, 11, 0.1)';
                panelBlock.style.color = '#fbbf24';
            }
        }
    };

    // ==========================================
    // Local Encrypted Backup & Restore (.zchat)
    // ==========================================
    let selectedBackupFile = null;

    async function deriveKeyFromPassword(password, saltUint8, usage) {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            enc.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: saltUint8,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            usage
        );
    }

    function bufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    function base64ToBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    window.openBackupRestoreModal = async function () {
        const modal = document.getElementById('backupRestoreModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
        window.switchBackupTab('export');

        try {
            const raw = await AppDB.getAllRawRecords();
            const totalMsgsEl = document.getElementById('backupTotalMessages');
            const totalChatsEl = document.getElementById('backupTotalChats');
            if (totalMsgsEl) totalMsgsEl.textContent = (raw ? raw.length : 0).toLocaleString();
            if (totalChatsEl) totalChatsEl.textContent = Object.keys(state.chats || {}).length.toLocaleString();
        } catch (e) { }
    };

    window.closeBackupRestoreModal = function () {
        const modal = document.getElementById('backupRestoreModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
        selectedBackupFile = null;
        const pwExport = document.getElementById('backupExportPassword');
        const pwImport = document.getElementById('backupImportPassword');
        const fileInput = document.getElementById('backupFileInput');
        const fileNameEl = document.getElementById('backupFileSelectedName');
        const pwGroup = document.getElementById('backupImportPasswordGroup');
        const btnRestore = document.getElementById('btnRunRestoreBackup');

        if (pwExport) pwExport.value = '';
        if (pwImport) pwImport.value = '';
        if (fileInput) fileInput.value = '';
        if (fileNameEl) fileNameEl.textContent = 'Pilih Berkas Cadangan';
        if (pwGroup) pwGroup.style.display = 'none';
        if (btnRestore) {
            btnRestore.disabled = true;
            btnRestore.style.opacity = '0.5';
            btnRestore.style.cursor = 'not-allowed';
        }
    };

    window.switchBackupTab = function (tab) {
        const exportPanel = document.getElementById('backupExportPanel');
        const importPanel = document.getElementById('backupImportPanel');
        const tabExport = document.getElementById('tabBackupExport');
        const tabImport = document.getElementById('tabBackupImport');

        if (tab === 'export') {
            if (exportPanel) exportPanel.style.display = 'flex';
            if (importPanel) importPanel.style.display = 'none';
            if (tabExport) {
                tabExport.className = 'btn-action-primary';
            }
            if (tabImport) {
                tabImport.className = 'btn-outline-action';
            }
        } else {
            if (exportPanel) exportPanel.style.display = 'none';
            if (importPanel) importPanel.style.display = 'flex';
            if (tabExport) {
                tabExport.className = 'btn-outline-action';
            }
            if (tabImport) {
                tabImport.className = 'btn-action-primary';
            }
        }
    };

    window.handleExportBackup = async function () {
        try {
            const records = await AppDB.getAllRawRecords();
            if (!records || records.length === 0) {
                showToast('Tidak ada riwayat pesan di penyimpanan lokal untuk dicadangkan.', 'info');
                return;
            }

            const pwInput = document.getElementById('backupExportPassword');
            const password = (pwInput ? pwInput.value : '').trim();

            const meta = {
                app: 'ZChat',
                exported_at: new Date().toISOString(),
                user_id: state.user ? state.user.id : null,
                user_name: state.user ? (state.user.display_name || state.user.username) : 'User',
                records_count: records.length
            };

            let exportPayload = null;

            if (password) {
                if (!window.crypto || !window.crypto.subtle) {
                    showToast('Enkripsi WebCrypto tidak didukung pada browser Anda.', 'error');
                    return;
                }
                const salt = crypto.getRandomValues(new Uint8Array(16));
                const iv = crypto.getRandomValues(new Uint8Array(12));
                const key = await deriveKeyFromPassword(password, salt, ['encrypt']);

                const enc = new TextEncoder();
                const plainJson = JSON.stringify({ meta, records });
                const cipherBuffer = await crypto.subtle.encrypt(
                    { name: 'AES-GCM', iv },
                    key,
                    enc.encode(plainJson)
                );

                exportPayload = JSON.stringify({
                    app: 'ZChat',
                    encrypted: true,
                    salt: bufferToBase64(salt),
                    iv: bufferToBase64(iv),
                    ciphertext: bufferToBase64(cipherBuffer),
                    exported_at: meta.exported_at,
                    records_count: records.length
                }, null, 2);
            } else {
                exportPayload = JSON.stringify({
                    app: 'ZChat',
                    encrypted: false,
                    meta,
                    records
                }, null, 2);
            }

            const blob = new Blob([exportPayload], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const dateStr = new Date().toISOString().slice(0, 10);
            const uName = state.user ? state.user.username : 'user';
            a.href = url;
            a.download = `zchat_backup_${uName}_${dateStr}.zchat`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast(`Cadangan ${records.length} pesan berhasil diunduh.`, 'success');
            if (pwInput) pwInput.value = '';
            window.closeBackupRestoreModal();
        } catch (err) {
            console.error('Error saat mengekspor cadangan:', err);
            showToast('Gagal membuat berkas cadangan: ' + err.message, 'error');
        }
    };

    window.handleBackupFileSelected = function (e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        selectedBackupFile = file;

        const nameEl = document.getElementById('backupFileSelectedName');
        const pwGroup = document.getElementById('backupImportPasswordGroup');
        const btnRestore = document.getElementById('btnRunRestoreBackup');

        if (nameEl) nameEl.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

        const reader = new FileReader();
        reader.onload = function (evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                if (parsed.encrypted) {
                    if (pwGroup) pwGroup.style.display = 'block';
                } else {
                    if (pwGroup) pwGroup.style.display = 'none';
                }
                if (btnRestore) {
                    btnRestore.disabled = false;
                    btnRestore.style.opacity = '1';
                    btnRestore.style.cursor = 'pointer';
                }
            } catch (err) {
                showToast('Format berkas cadangan tidak valid (harus .zchat atau .json).', 'error');
                if (btnRestore) {
                    btnRestore.disabled = true;
                    btnRestore.style.opacity = '0.5';
                    btnRestore.style.cursor = 'not-allowed';
                }
            }
        };
        reader.readAsText(file);
    };

    window.handleImportBackup = async function () {
        if (!selectedBackupFile) {
            showToast('Pilih berkas cadangan terlebih dahulu.', 'info');
            return;
        }

        const btnRestore = document.getElementById('btnRunRestoreBackup');
        if (btnRestore) {
            btnRestore.disabled = true;
            btnRestore.innerHTML = '<span>Memulihkan pesan...</span>';
        }

        const reader = new FileReader();
        reader.onload = async function (evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                let recordsToRestore = [];

                if (parsed.encrypted) {
                    const pwInput = document.getElementById('backupImportPassword');
                    const password = (pwInput ? pwInput.value : '').trim();
                    if (!password) {
                        showToast('Masukkan kata sandi untuk membuka cadangan terenkripsi ini.', 'error');
                        if (btnRestore) {
                            btnRestore.disabled = false;
                            btnRestore.innerHTML = `
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                <span>Pulihkan Riwayat Chat Sekarang</span>
                            `;
                        }
                        if (pwInput) pwInput.focus();
                        return;
                    }

                    if (!window.crypto || !window.crypto.subtle) {
                        throw new Error('Enkripsi WebCrypto tidak didukung.');
                    }

                    const salt = new Uint8Array(base64ToBuffer(parsed.salt));
                    const iv = new Uint8Array(base64ToBuffer(parsed.iv));
                    const cipherBuffer = base64ToBuffer(parsed.ciphertext);

                    const key = await deriveKeyFromPassword(password, salt, ['decrypt']);
                    const decryptedBuffer = await crypto.subtle.decrypt(
                        { name: 'AES-GCM', iv },
                        key,
                        cipherBuffer
                    );

                    const dec = new TextDecoder();
                    const decryptedJson = JSON.parse(dec.decode(decryptedBuffer));
                    recordsToRestore = decryptedJson.records || [];
                } else {
                    recordsToRestore = parsed.records || [];
                }

                if (!Array.isArray(recordsToRestore) || recordsToRestore.length === 0) {
                    showToast('Berkas cadangan tidak memiliki data pesan yang valid.', 'error');
                    return;
                }

                const restoredCount = await AppDB.restoreRecordsBatch(recordsToRestore);
                const grouped = await AppDB.getAllChats(state.user ? state.user.id : null);
                if (grouped) {
                    state.chats = grouped;
                    persistMessages();
                    renderChatsList();
                    if (state.activeContact) {
                        renderMessages();
                    }
                }

                showToast(`Berhasil memulihkan ${restoredCount} pesan dari cadangan!`, 'success');
                window.closeBackupRestoreModal();
            } catch (err) {
                console.error('Gagal memulihkan cadangan:', err);
                showToast('Gagal memulihkan: Kata sandi salah atau berkas rusak.', 'error');
            } finally {
                if (btnRestore) {
                    btnRestore.disabled = false;
                    btnRestore.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>Pulihkan Riwayat Chat Sekarang</span>
                    `;
                }
            }
        };
        reader.readAsText(selectedBackupFile);
    };

    // ==========================================
    // Media Lightbox Gallery (Fullscreen Preview)
    // ==========================================
    window.openMediaLightbox = function (targetUrl, directMeta = null) {
        if (!state.activeContact) return;

        const currentContactId = state.activeContact.id;
        const messages = state.chats[currentContactId] || [];

        const mediaItems = [];
        messages.forEach(msg => {
            if (msg.is_deleted || msg.body === 'Pesan ini telah dihapus') return;
            let att = msg.attachment;

            if (!att && msg.body && msg.body.startsWith('[Berkas:')) {
                const match = msg.body.match(/^\[Berkas:\s*(.+?)\]$/);
                if (match) {
                    const fName = match[1];
                    const isImg = Boolean(fName.match(/\.(jpeg|jpg|png|gif|webp|svg)$/i));
                    const isVid = Boolean(fName.match(/\.(mp4|webm|mov|mkv)$/i));
                    if (isImg || isVid) {
                        att = {
                            name: fName,
                            url: `/uploads/chat/${encodeURIComponent(fName)}`,
                            type: isImg ? 'image/jpeg' : 'video/mp4'
                        };
                    }
                }
            }

            if (att && (att.url || att.dataUrl)) {
                const url = att.url || att.dataUrl;
                const name = (att.name || '').toLowerCase();
                const type = (att.type || '').toLowerCase();
                const isImg = type.startsWith('image/') || Boolean(name.match(/\.(jpeg|jpg|png|gif|webp|svg)$/i));
                const isVid = type.startsWith('video/') || Boolean(name.match(/\.(mp4|webm|mov|mkv)$/i));

                if (isImg || isVid) {
                    const isMe = Number(msg.sender_id) === Number(state.user ? state.user.id : 0);
                    const senderName = isMe ? 'Anda' : (msg.sender_name || state.activeContact.display_name || state.activeContact.username);
                    const timestamp = formatTime(msg.created_at);

                    mediaItems.push({
                        url: url,
                        name: att.name || (isVid ? 'Video' : 'Gambar'),
                        isVideo: isVid,
                        sender: senderName,
                        timestamp: timestamp,
                        id: msg.id || msg.client_uuid
                    });
                }
            }
        });

        let foundIdx = mediaItems.findIndex(m => m.url === targetUrl);
        if (foundIdx === -1) {
            const fallbackItem = {
                url: targetUrl,
                name: (directMeta && directMeta.name) || 'Media',
                isVideo: Boolean(directMeta && directMeta.isVideo),
                sender: (directMeta && directMeta.sender) || (state.activeContact.display_name || 'Kontak'),
                timestamp: (directMeta && directMeta.timestamp) || 'Baru saja'
            };
            mediaItems.unshift(fallbackItem);
            foundIdx = 0;
        }

        state.lightbox.items = mediaItems;
        state.lightbox.currentIndex = foundIdx >= 0 ? foundIdx : 0;
        state.lightbox.zoom = 1;
        state.lightbox.panX = 0;
        state.lightbox.panY = 0;

        renderLightboxMedia();
        renderLightboxFilmstrip();
        initLightboxPanAndZoom();

        const modal = document.getElementById('mediaLightboxModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
    };

    window.closeMediaLightbox = function () {
        const modal = document.getElementById('mediaLightboxModal');
        const videoEl = document.getElementById('lightboxVideo');
        if (videoEl && !videoEl.paused) {
            videoEl.pause();
        }
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
        state.lightbox.zoom = 1;
        state.lightbox.panX = 0;
        state.lightbox.panY = 0;
    };

    window.lightboxNext = function () {
        const { items, currentIndex } = state.lightbox;
        if (!items || items.length <= 1) return;
        state.lightbox.currentIndex = (currentIndex + 1) % items.length;
        state.lightbox.zoom = 1;
        state.lightbox.panX = 0;
        state.lightbox.panY = 0;
        renderLightboxMedia();
        updateLightboxFilmstripActive();
    };

    window.lightboxPrev = function () {
        const { items, currentIndex } = state.lightbox;
        if (!items || items.length <= 1) return;
        state.lightbox.currentIndex = (currentIndex - 1 + items.length) % items.length;
        state.lightbox.zoom = 1;
        state.lightbox.panX = 0;
        state.lightbox.panY = 0;
        renderLightboxMedia();
        updateLightboxFilmstripActive();
    };

    window.lightboxSelectIndex = function (index) {
        if (!state.lightbox.items || index < 0 || index >= state.lightbox.items.length) return;
        state.lightbox.currentIndex = index;
        state.lightbox.zoom = 1;
        state.lightbox.panX = 0;
        state.lightbox.panY = 0;
        renderLightboxMedia();
        updateLightboxFilmstripActive();
    };

    function renderLightboxMedia() {
        const { items, currentIndex, zoom } = state.lightbox;
        const currentItem = items[currentIndex];
        if (!currentItem) return;

        const imgEl = document.getElementById('lightboxImage');
        const vidEl = document.getElementById('lightboxVideo');
        const titleEl = document.getElementById('lightboxMediaTitle');
        const senderEl = document.getElementById('lightboxSenderName');
        const timeEl = document.getElementById('lightboxTimestamp');
        const badgeEl = document.getElementById('lightboxCounterBadge');
        const resetZoomBtn = document.getElementById('btnLightboxResetZoom');
        const prevBtn = document.getElementById('btnLightboxPrev');
        const nextBtn = document.getElementById('btnLightboxNext');

        if (titleEl) titleEl.textContent = currentItem.name;
        if (senderEl) senderEl.textContent = currentItem.sender;
        if (timeEl) timeEl.textContent = currentItem.timestamp;
        if (badgeEl) badgeEl.textContent = `${currentIndex + 1} dari ${items.length}`;
        if (resetZoomBtn) resetZoomBtn.textContent = `${Math.round(zoom * 100)}%`;

        if (prevBtn) prevBtn.disabled = items.length <= 1;
        if (nextBtn) nextBtn.disabled = items.length <= 1;

        if (currentItem.isVideo) {
            if (imgEl) imgEl.style.display = 'none';
            if (vidEl) {
                vidEl.style.display = 'block';
                vidEl.src = currentItem.url;
            }
        } else {
            if (vidEl) {
                if (!vidEl.paused) vidEl.pause();
                vidEl.style.display = 'none';
            }
            if (imgEl) {
                imgEl.style.display = 'block';
                imgEl.src = currentItem.url;
                applyLightboxImageTransform();
            }
        }
    }

    function applyLightboxImageTransform() {
        const imgEl = document.getElementById('lightboxImage');
        const resetBtn = document.getElementById('btnLightboxResetZoom');
        const { zoom, panX, panY } = state.lightbox;
        if (!imgEl) return;

        imgEl.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
        if (zoom > 1) {
            imgEl.classList.add('is-zoomed');
        } else {
            imgEl.classList.remove('is-zoomed');
        }
        if (resetBtn) resetBtn.textContent = `${Math.round(zoom * 100)}%`;
    }

    window.lightboxZoomIn = function () {
        state.lightbox.zoom = Math.min(4, +(state.lightbox.zoom + 0.25).toFixed(2));
        applyLightboxImageTransform();
    };

    window.lightboxZoomOut = function () {
        state.lightbox.zoom = Math.max(0.5, +(state.lightbox.zoom - 0.25).toFixed(2));
        if (state.lightbox.zoom <= 1) {
            state.lightbox.panX = 0;
            state.lightbox.panY = 0;
        }
        applyLightboxImageTransform();
    };

    window.lightboxResetZoom = function () {
        state.lightbox.zoom = 1;
        state.lightbox.panX = 0;
        state.lightbox.panY = 0;
        applyLightboxImageTransform();
    };

    window.toggleLightboxZoom = function (e) {
        if (e) e.stopPropagation();
        if (state.lightbox.zoom > 1) {
            window.lightboxResetZoom();
        } else {
            state.lightbox.zoom = 2;
            applyLightboxImageTransform();
        }
    };

    window.lightboxDownloadCurrent = function () {
        const { items, currentIndex } = state.lightbox;
        const currentItem = items[currentIndex];
        if (!currentItem || !currentItem.url) return;

        const a = document.createElement('a');
        a.href = currentItem.url;
        a.download = currentItem.name || 'media';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('Mengunduh media...', 'info');
    };

    function renderLightboxFilmstrip() {
        const strip = document.getElementById('lightboxThumbStrip');
        const list = document.getElementById('lightboxThumbList');
        if (!strip || !list) return;

        const items = state.lightbox.items || [];
        if (items.length <= 1) {
            strip.style.display = 'none';
            return;
        }

        strip.style.display = 'flex';
        list.innerHTML = items.map((item, idx) => {
            const isActive = idx === state.lightbox.currentIndex;
            const bg = item.isVideo
                ? `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fff;"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg></div>`
                : '';
            return `
                <div class="lightbox-thumb-item ${isActive ? 'active' : ''}" style="background-image: url('${escapeHtml(item.url)}');" onclick="lightboxSelectIndex(${idx})" title="${escapeHtml(item.name)}">
                    ${bg}
                </div>
            `;
        }).join('');
    }

    function updateLightboxFilmstripActive() {
        const items = document.querySelectorAll('#lightboxThumbList .lightbox-thumb-item');
        items.forEach((thumb, idx) => {
            if (idx === state.lightbox.currentIndex) {
                thumb.classList.add('active');
                thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            } else {
                thumb.classList.remove('active');
            }
        });
    }

    window.handleLightboxStageClick = function (e) {
        if (e.target.id === 'lightboxMediaWrapper' || e.target.classList.contains('lightbox-stage')) {
            window.closeMediaLightbox();
        }
    };

    function initLightboxPanAndZoom() {
        const img = document.getElementById('lightboxImage');
        const wrapper = document.getElementById('lightboxMediaWrapper');
        if (!img || img._hasPanListener) return;
        img._hasPanListener = true;

        img.addEventListener('mousedown', (e) => {
            if (state.lightbox.zoom <= 1) return;
            e.preventDefault();
            state.lightbox.isDragging = true;
            state.lightbox.startX = e.clientX - state.lightbox.panX;
            state.lightbox.startY = e.clientY - state.lightbox.panY;
            img.classList.add('is-dragging');
        });

        window.addEventListener('mousemove', (e) => {
            if (!state.lightbox.isDragging) return;
            state.lightbox.panX = e.clientX - state.lightbox.startX;
            state.lightbox.panY = e.clientY - state.lightbox.startY;
            applyLightboxImageTransform();
        });

        window.addEventListener('mouseup', () => {
            if (state.lightbox.isDragging) {
                state.lightbox.isDragging = false;
                img.classList.remove('is-dragging');
            }
        });

        wrapper?.addEventListener('wheel', (e) => {
            const modal = document.getElementById('mediaLightboxModal');
            if (!modal || modal.style.display !== 'flex') return;
            const videoEl = document.getElementById('lightboxVideo');
            if (videoEl && videoEl.style.display !== 'none') return;

            e.preventDefault();
            if (e.deltaY < 0) {
                window.lightboxZoomIn();
            } else {
                window.lightboxZoomOut();
            }
        }, { passive: false });
    }

    // ==========================================
    // Pinned Messages Controller (Fase 3)
    // ==========================================

    window.loadPinnedMessages = async function (contactId, isGroup = false) {
        if (!contactId) return;
        const chatType = isGroup ? 'group' : 'direct';
        const rawTargetId = isGroup && String(contactId).startsWith('group_')
            ? String(contactId).replace('group_', '')
            : contactId;

        try {
            const res = await apiRequest(`/pinned-messages?chat_type=${chatType}&target_id=${rawTargetId}`);
            if (res && Array.isArray(res.pinned_messages)) {
                state.pinnedMessages[contactId] = res.pinned_messages;
                state.currentPinnedIndex = 0;
            } else {
                state.pinnedMessages[contactId] = [];
            }
        } catch (e) {
            console.warn('Gagal memuat pesan tersemat:', e);
            state.pinnedMessages[contactId] = state.pinnedMessages[contactId] || [];
        }

        renderPinnedMessageBanner();
    };

    window.renderPinnedMessageBanner = function () {
        const banner = document.getElementById('pinnedMessageBanner');
        if (!banner) return;

        if (!state.activeContact) {
            banner.style.display = 'none';
            return;
        }

        const chatKey = state.activeContact.id;
        const pinnedList = state.pinnedMessages[chatKey] || [];

        if (pinnedList.length === 0) {
            banner.style.display = 'none';
            return;
        }

        banner.style.display = 'flex';

        if (state.currentPinnedIndex >= pinnedList.length) state.currentPinnedIndex = 0;
        if (state.currentPinnedIndex < 0) state.currentPinnedIndex = pinnedList.length - 1;

        const current = pinnedList[state.currentPinnedIndex];
        const counterEl = document.getElementById('pinnedBannerCounter');
        const prevBtn = document.getElementById('btnPinnedPrev');
        const nextBtn = document.getElementById('btnPinnedNext');
        const authorEl = document.getElementById('pinnedBannerAuthor');
        const snippetEl = document.getElementById('pinnedBannerSnippet');

        if (pinnedList.length > 1) {
            if (counterEl) {
                counterEl.style.display = 'inline-block';
                counterEl.textContent = `${state.currentPinnedIndex + 1} dari ${pinnedList.length}`;
            }
            if (prevBtn) prevBtn.style.display = 'inline-flex';
            if (nextBtn) nextBtn.style.display = 'inline-flex';
        } else {
            if (counterEl) counterEl.style.display = 'none';
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
        }

        if (authorEl) {
            authorEl.textContent = `${current.sender_name || 'Pengguna'}:`;
        }

        if (snippetEl) {
            let text = current.body_snippet || '';
            if (!text && current.has_attachment) {
                const attIcon = current.attachment_type === 'image' ? '📷 Foto' : (current.attachment_type === 'video' ? '🎬 Video' : (current.attachment_type === 'audio' ? '🎵 Pesan Suara' : '📎 Berkas'));
                text = attIcon;
            }
            snippetEl.textContent = text || 'Pesan tersemat';
        }
    };

    window.cyclePinnedMessage = function (delta) {
        if (!state.activeContact) return;
        const chatKey = state.activeContact.id;
        const pinnedList = state.pinnedMessages[chatKey] || [];
        if (pinnedList.length <= 1) return;

        state.currentPinnedIndex = (state.currentPinnedIndex + delta + pinnedList.length) % pinnedList.length;
        renderPinnedMessageBanner();
    };

    window.jumpToCurrentPinnedMessage = function () {
        if (!state.activeContact) return;
        const chatKey = state.activeContact.id;
        const pinnedList = state.pinnedMessages[chatKey] || [];
        if (pinnedList.length === 0) return;

        const current = pinnedList[state.currentPinnedIndex];
        if (current) {
            window.scrollToMessage(current.message_id || current.client_uuid);
        }
    };

    window.togglePinMessage = async function (msgIdentifier) {
        if (!state.activeContact) return;
        const isGroup = Boolean(state.activeContact.is_group);
        const chatKey = state.activeContact.id;
        const rawTargetId = isGroup && String(chatKey).startsWith('group_')
            ? String(chatKey).replace('group_', '')
            : chatKey;
        const msgs = state.chats[chatKey] || [];
        const msg = msgs.find(m => String(m.id) === String(msgIdentifier) || (m.client_uuid && String(m.client_uuid) === String(msgIdentifier)));

        if (!msg || !msg.id) {
            showToast('Pesan belum tersinkronisasi ke server', 'info');
            return;
        }

        try {
            const res = await apiRequest('/pinned-messages/toggle', 'POST', {
                chat_type: isGroup ? 'group' : 'direct',
                target_id: rawTargetId,
                message_id: msg.id
            });

            if (res && res.pinned_messages) {
                state.pinnedMessages[chatKey] = res.pinned_messages;
                state.currentPinnedIndex = 0;
                renderPinnedMessageBanner();
                renderActiveMessages();
                showToast(res.is_pinned ? 'Pesan berhasil disematkan' : 'Sematan pesan dilepas', 'success');
            }
        } catch (e) {
            console.error('Gagal menyematkan pesan:', e);
            showToast('Gagal mengubah status sematan pesan', 'error');
        }
    };

    window.unpinCurrentMessage = async function () {
        if (!state.activeContact) return;
        const chatKey = state.activeContact.id;
        const pinnedList = state.pinnedMessages[chatKey] || [];
        if (pinnedList.length === 0) return;

        const current = pinnedList[state.currentPinnedIndex];
        if (current && current.message_id) {
            window.togglePinMessage(current.message_id);
        }
    };

    // ==========================================
    // Active Sessions & Multi-Device Controller (Fase 3)
    // ==========================================

    window.openActiveSessionsModal = async function () {
        const modal = document.getElementById('activeSessionsModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
        await loadActiveSessions();
    };

    window.closeActiveSessionsModal = function () {
        const modal = document.getElementById('activeSessionsModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    };

    window.loadActiveSessions = async function () {
        const loadingEl = document.getElementById('activeSessionsLoading');
        const listEl = document.getElementById('activeSessionsList');
        if (!listEl) return;

        if (loadingEl) loadingEl.style.display = 'flex';

        try {
            const res = await apiRequest('/auth/sessions');
            if (res && Array.isArray(res.sessions)) {
                state.activeSessions = res.sessions;
                renderActiveSessionsList();
            }
        } catch (e) {
            console.error('Gagal memuat daftar sesi:', e);
            listEl.innerHTML = `
                <div class="empty-state" style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                    Gagal memuat sesi aktif. Silakan coba beberapa saat lagi.
                </div>
            `;
        } finally {
            if (loadingEl) loadingEl.style.display = 'none';
        }
    };

    function renderActiveSessionsList() {
        const listEl = document.getElementById('activeSessionsList');
        if (!listEl) return;

        const sessions = state.activeSessions || [];
        if (sessions.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state" style="padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                    Tidak ada sesi aktif ditemukan.
                </div>
            `;
            return;
        }

        listEl.innerHTML = sessions.map(s => {
            const isCurrent = Boolean(s.is_current);
            const iconSvg = s.device_type === 'mobile'
                ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`
                : (s.device_type === 'tablet'
                    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`
                    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`);

            const badgeHtml = isCurrent
                ? `<span class="session-badge-current">
                     <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>
                     Perangkat Ini (Aktif)
                   </span>`
                : `<span style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(s.last_used_at)}</span>`;

            const actionBtn = isCurrent
                ? ''
                : `<button type="button" class="session-btn-revoke" onclick="revokeSession(${s.id}, '${escapeHtml(s.name).replace(/'/g, "\\'")}')" title="Keluarkan perangkat ini">
                     Keluarkan
                   </button>`;

            return `
                <div class="session-card-item ${isCurrent ? 'is-current' : ''}">
                    <div class="session-icon-box" aria-hidden="true">
                        ${iconSvg}
                    </div>
                    <div class="session-info-main">
                        <div class="session-title-row">
                            <span class="session-title">${escapeHtml(s.name)}</span>
                            ${badgeHtml}
                        </div>
                        <div class="session-meta-row">
                            <span>Dibuat: ${escapeHtml(s.created_at || 'Baru saja')}</span>
                            ${!isCurrent ? `<span>• Terakhir aktif: ${escapeHtml(s.last_used_at)}</span>` : ''}
                        </div>
                    </div>
                    ${actionBtn}
                </div>
            `;
        }).join('');
    }

    window.revokeSession = async function (id, deviceName) {
        if (!id) return;
        try {
            const res = await apiRequest(`/auth/sessions/${id}`, 'DELETE');
            if (res) {
                showToast(`Sesi "${deviceName || 'Perangkat'}" telah dikeluarkan.`, 'info');
                await loadActiveSessions();
            }
        } catch (e) {
            console.error('Gagal mengeluarkan sesi:', e);
            showToast('Gagal mengeluarkan sesi perangkat.', 'error');
        }
    };

    window.confirmRevokeOtherSessions = function () {
        openConfirmModal(
            'Keluar dari Semua Perangkat Lain?',
            'Anda akan tetap masuk di perangkat ini, namun seluruh sesi aplikasi atau browser lain yang terhubung akan segera dihentikan.',
            async () => {
                try {
                    const res = await apiRequest('/auth/sessions/revoke-others', 'POST');
                    if (res) {
                        showToast(res.message || 'Semua sesi perangkat lain telah dikeluarkan.', 'success');
                        await loadActiveSessions();
                    }
                } catch (e) {
                    console.error('Gagal mengeluarkan sesi lain:', e);
                    showToast('Gagal mengeluarkan sesi perangkat lain.', 'error');
                }
            },
            'Ya, Keluarkan Semua',
            'Batal'
        );
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

    window.toggleMessageReaction = async function (msgIdentifier, emoji) {
        if (!state.activeContact || !state.user) return;
        const chatKey = state.activeContact.id;
        const msgs = state.chats[chatKey] || [];
        const target = msgs.find(m => String(m.id) === String(msgIdentifier) || (m.client_uuid && String(m.client_uuid) === String(msgIdentifier)));
        if (!target) return;

        if (!target.reactions) target.reactions = {};
        const userName = state.user.display_name || state.user.username;

        // Optimistic UI toggle
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

        // Persist to backend database if message has an ID
        if (target.id) {
            try {
                const res = await apiRequest('/reactions/toggle', {
                    method: 'POST',
                    body: JSON.stringify({
                        message_id: target.id,
                        message_type: state.activeContact.is_group ? 'group' : 'direct',
                        emoji: emoji
                    })
                });
                if (res && res.reactions) {
                    target.reactions = res.reactions;
                    try { await AppDB.saveMessage(target, state.user.id); } catch (e) { }
                    persistMessages();
                    renderActiveMessages();
                }
            } catch (err) {
                console.warn('Gagal sinkronisasi reaksi ke server:', err);
            }
        }
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
                <div class="empty-state" style="padding: 2rem 0;">
                    <div class="btn-spinner" style="margin: 0 auto 0.6rem; width: 22px; height: 22px; border-width: 2.5px; border-top-color: var(--accent-primary);"></div>
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
                const pastelClass = getPastelColorClass(user.display_name || user.username);
                const isFriend = state.contacts.some(c => Number(c.id) === Number(user.id));
                const userAvatarHtml = user.avatar
                    ? `<img src="${escapeHtml(user.avatar)}" alt="${escapeHtml(user.display_name)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`
                    : initial;

                return `
                    <div class="search-user-row">
                        <div class="search-user-left">
                            <div class="avatar-circle ${pastelClass}" style="width: 36px; height: 36px; font-size: 0.85rem; overflow: hidden; display: flex; align-items: center; justify-content: center;">${userAvatarHtml}</div>
                            <div class="search-user-info">
                                <div class="search-user-name">${escapeHtml(user.display_name)}</div>
                                <div class="search-user-handle">@${escapeHtml(user.username)}</div>
                            </div>
                        </div>

                        ${isFriend ? `
                            <span class="search-user-badge">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                <span>Sudah Teman</span>
                            </span>
                        ` : `
                            <button type="button" class="btn-action-primary" style="padding: 0.35rem 0.85rem; font-size: 0.8125rem; min-height: 32px;" onclick="handleAddFriendSubmit(${user.id}, this)">
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

        if (state.isSelectionMode) {
            window.exitSelectMessagesMode();
        }

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

        updateActiveUserOnlineStatus(contact);

        const typingBadge = document.getElementById('activeTypingStatus');
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
        const infoPresence = document.getElementById('infoPresenceText');
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
        if (infoPresence) {
            infoPresence.textContent = formatLastSeen(contact.last_seen_at, isOnline);
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
            loadPinnedMessages(contact.id, false);
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

        // Sembunyikan Discord group sidebar, tampilkan direct contact info panel
        const directContent = document.getElementById('directChatInfoContent');
        const groupContent = document.getElementById('groupMembersSidebarContent');
        if (directContent) directContent.style.display = 'block';
        if (groupContent) groupContent.style.display = 'none';
        const btnToggleMemberList = document.getElementById('btnToggleMemberList');
        if (btnToggleMemberList) btnToggleMemberList.style.display = 'none';

        const btnCreatePoll = document.getElementById('btnCreatePoll');
        if (btnCreatePoll) btnCreatePoll.style.display = 'none';
        const mentionBox = document.getElementById('mentionAutocompleteBox');
        if (mentionBox) mentionBox.style.display = 'none';
        state.mentionState.active = false;

        window.closeChatDropdown();
        updateChatPreferencesUI();
        window.updateActiveChatBlockState();

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

    async function acknowledgeGroupMessages(groupId, status = 'read', clientUuids = null) {
        if (!groupId || !state.user) return;
        try {
            const payload = { status };
            if (Array.isArray(clientUuids) && clientUuids.length > 0) {
                payload.client_uuids = clientUuids;
            }
            await apiRequest(`/groups/${groupId}/messages/ack`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        } catch (e) {
            // Silently handle
        }
    }

    window.selectGroup = async function (groupId) {
        const group = (state.groups || []).find(g => Number(g.id) === Number(groupId));
        if (!group) return;

        if (state.isSelectionMode) {
            window.exitSelectMessagesMode();
        }

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

        updateActiveUserOnlineStatus(state.activeContact);
        const typingBadge = document.getElementById('activeTypingStatus');
        if (typingBadge) typingBadge.style.display = 'none';

        // Tampilkan tombol toggle daftar anggota di header obrolan grup
        const btnToggleMemberList = document.getElementById('btnToggleMemberList');
        if (btnToggleMemberList) btnToggleMemberList.style.display = 'flex';

        // Tampilkan tombol Buat Polling Grup
        const btnCreatePoll = document.getElementById('btnCreatePoll');
        if (btnCreatePoll) btnCreatePoll.style.display = 'inline-flex';

        // Ambil polling untuk grup ini
        if (typeof fetchGroupPolls === 'function') {
            fetchGroupPolls(groupId);
        }

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
            if (Array.isArray(apiMsgs) && apiMsgs.length > 0) {
                const hexKey = group.group_key;
                if (!state.chats[chatKey]) state.chats[chatKey] = [];
                const existingUuids = new Set(state.chats[chatKey].map(m => m.client_uuid).filter(Boolean));
                const existingIds = new Set(state.chats[chatKey].map(m => m.id).filter(Boolean));

                const newToSave = [];
                for (const m of apiMsgs) {
                    if (m.client_uuid && existingUuids.has(m.client_uuid)) {
                        const existing = state.chats[chatKey].find(x => x.client_uuid === m.client_uuid);
                        if (existing && m.status) existing.status = m.status;
                        continue;
                    }
                    if (m.id && existingIds.has(m.id)) continue;

                    if (m.body && m.body.startsWith('enc:v1:')) {
                        m.body = await decryptMessageBody(m.body, hexKey);
                    }
                    state.chats[chatKey].push(m);
                    newToSave.push({ ...m, group_id: groupId });
                }

                if (newToSave.length > 0) {
                    state.chats[chatKey].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                    await AppDB.saveMessagesBatch(newToSave, state.user.id);
                    persistMessages();
                }
                acknowledgeGroupMessages(groupId, 'read');
            } else if (state.chats[chatKey] && state.chats[chatKey].length > 0) {
                acknowledgeGroupMessages(groupId, 'read');
            }
        } catch (e) {
            console.warn('Gagal memuat pesan grup:', e);
        }

        try {
            renderActiveMessages();
            renderChatsList();
            updateRightPanelMediaAndDocs(chatKey);
            loadPinnedMessages(groupId, true);
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

        updateChatPreferencesUI();
        window.updateActiveChatBlockState();

        const input = document.getElementById('messageInput');
        if (input) input.focus();
    };

    // Sidebar Kanan Khusus Grup Ala Discord (Hanya daftar member terorganisir per role)
    function updateRightPanelForGroup(group) {
        const directContent = document.getElementById('directChatInfoContent');
        const groupContent = document.getElementById('groupMembersSidebarContent');
        if (directContent) directContent.style.display = 'none';
        if (groupContent) groupContent.style.display = 'flex';

        const totalBadge = document.getElementById('discordTotalMembersBadge');
        const totalCount = group.members ? group.members.length : (group.members_count || 1);
        if (totalBadge) totalBadge.textContent = totalCount;

        const isCurrentCreator = Number(group.created_by) === Number(state.user?.id);
        const isAdmin = group.my_role === 'admin' || isCurrentCreator;

        const btnDiscordAdd = document.getElementById('btnDiscordAddMember');
        if (btnDiscordAdd) {
            btnDiscordAdd.style.display = isAdmin ? 'inline-flex' : 'none';
        }

        const allMembers = group.members || [];
        const admins = [];
        const regularMembers = [];

        allMembers.forEach(m => {
            const isOwner = Number(m.user_id) === Number(group.created_by);
            const isMemAdmin = m.role === 'admin';
            if (isOwner || isMemAdmin) {
                admins.push(m);
            } else {
                regularMembers.push(m);
            }
        });

        // Sort admins: Owner paling atas, lalu urutkan nama
        admins.sort((a, b) => {
            const aIsOwner = Number(a.user_id) === Number(group.created_by);
            const bIsOwner = Number(b.user_id) === Number(group.created_by);
            if (aIsOwner && !bIsOwner) return -1;
            if (!aIsOwner && bIsOwner) return 1;
            return (a.display_name || a.username || '').localeCompare(b.display_name || b.username || '');
        });

        // Sort regular members alfabetis
        regularMembers.sort((a, b) => (a.display_name || a.username || '').localeCompare(b.display_name || b.username || ''));

        function renderDiscordMemberCard(m) {
            const isMe = Number(m.user_id) === Number(state.user?.id);
            const isOwner = Number(m.user_id) === Number(group.created_by);
            const isMemAdmin = m.role === 'admin';
            const isOnline = Boolean(m.is_online);
            const canKick = isAdmin && !isMe && (!isOwner || isCurrentCreator);

            const initial = (m.display_name || m.username || 'U').charAt(0).toUpperCase();
            const pastelClass = getPastelColorClass(m.display_name || m.username);
            const avatarInner = m.avatar
                ? `<img src="${escapeHtml(m.avatar)}" alt="${escapeHtml(m.display_name)}" class="discord-member-img">`
                : `<div class="avatar-circle discord-avatar-circle ${pastelClass}">${initial}</div>`;

            let roleBadgeHtml = '';
            if (isOwner) {
                roleBadgeHtml = `<span class="discord-badge discord-badge-owner">Owner</span>`;
            } else if (isMemAdmin) {
                roleBadgeHtml = `<span class="discord-badge discord-badge-admin">Admin</span>`;
            } else {
                roleBadgeHtml = `<span class="discord-badge discord-badge-member">Anggota</span>`;
            }

            return `
                <div class="discord-member-card">
                    <div class="discord-member-left">
                        <div class="discord-avatar-wrapper">
                            ${avatarInner}
                            <span class="discord-status-dot ${isOnline ? 'online' : 'offline'}" title="${isOnline ? 'Online' : 'Offline'}"></span>
                        </div>
                        <div class="discord-member-meta">
                            <div class="discord-member-name">
                                <span class="discord-name-text">${escapeHtml(m.display_name)}</span>
                                ${isMe ? '<span class="discord-me-tag">(Anda)</span>' : ''}
                            </div>
                            <div class="discord-member-handle">@${escapeHtml(m.username)}</div>
                        </div>
                    </div>
                    <div class="discord-member-right">
                        ${roleBadgeHtml}
                        ${canKick ? `
                            <button type="button" class="btn-discord-kick" title="Keluarkan ${escapeHtml(m.display_name || m.username)} dari grup" onclick="handleRemoveGroupMember(${m.user_id}, '${escapeHtml(m.display_name || m.username)}')">
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
        }

        const adminSection = document.getElementById('discordAdminSection');
        const adminList = document.getElementById('discordAdminList');
        const adminCount = document.getElementById('discordAdminCount');

        const memberSection = document.getElementById('discordMemberSection');
        const memberList = document.getElementById('discordMemberList');
        const memberCount = document.getElementById('discordMemberCount');

        if (adminCount) adminCount.textContent = admins.length;
        if (adminList) {
            adminList.innerHTML = admins.length > 0
                ? admins.map(renderDiscordMemberCard).join('')
                : '<div class="discord-empty-members">Belum ada admin</div>';
        }
        if (adminSection) {
            adminSection.style.display = admins.length > 0 ? 'block' : 'none';
        }

        if (memberCount) memberCount.textContent = regularMembers.length;
        if (memberList) {
            memberList.innerHTML = regularMembers.length > 0
                ? regularMembers.map(renderDiscordMemberCard).join('')
                : '<div class="discord-empty-members">Belum ada anggota biasa</div>';
        }
        if (memberSection) {
            memberSection.style.display = 'block';
        }

        window.closeChatDropdown();
    }

    window.openCreateGroupModal = function () {
        const modal = document.getElementById('createGroupModal');
        const nameInput = document.getElementById('groupNameInput');
        const descInput = document.getElementById('groupDescInput');
        const membersList = document.getElementById('createGroupMembersList');

        if (nameInput) nameInput.value = '';
        if (descInput) descInput.value = '';

        const countBadge = document.getElementById('createGroupSelectedCount');
        if (countBadge) countBadge.textContent = '0 dipilih';

        if (membersList) {
            if (!state.contacts || state.contacts.length === 0) {
                membersList.innerHTML = `
                    <div style="padding: 1.5rem 1rem; text-align: center; font-size: 0.8125rem; color: var(--text-muted);">
                        Belum ada kontak teman. Tambahkan teman terlebih dahulu untuk diundang ke grup.
                    </div>
                `;
            } else {
                membersList.innerHTML = state.contacts.map(c => {
                    const initial = (c.display_name || c.username || 'U').charAt(0).toUpperCase();
                    const pastelClass = getPastelColorClass(c.display_name || c.username);
                    let avatarHtml = `<div class="avatar-circle ${pastelClass}" style="width: 32px; height: 32px; font-size: 0.75rem;">${initial}</div>`;
                    if (c.avatar) {
                        avatarHtml = `
                            <div class="avatar-circle" style="width: 32px; height: 32px; overflow: hidden; padding: 0;">
                                <img src="${escapeHtml(c.avatar)}" alt="${escapeHtml(c.display_name)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
                            </div>
                        `;
                    }
                    return `
                        <label class="member-select-item">
                            <div class="member-select-left">
                                ${avatarHtml}
                                <div class="member-select-info">
                                    <div class="member-select-name">${escapeHtml(c.display_name)}</div>
                                    <div class="member-select-handle">@${escapeHtml(c.username)}</div>
                                </div>
                            </div>
                            <input type="checkbox" name="selected_group_members" value="${c.id}" class="member-select-checkbox" onchange="updateCreateGroupSelectedCount()">
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

    window.updateCreateGroupSelectedCount = function () {
        const countBadge = document.getElementById('createGroupSelectedCount');
        const checked = document.querySelectorAll('input[name="selected_group_members"]:checked');
        if (countBadge) {
            countBadge.textContent = `${checked.length} dipilih`;
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
            const pastelClass = getPastelColorClass(c.display_name || c.username);
            const isChecked = currentlyChecked.has(Number(c.id));
            let avatarHtml = `<div class="avatar-circle ${pastelClass}" style="width: 32px; height: 32px; font-size: 0.75rem;">${initial}</div>`;
            if (c.avatar) {
                avatarHtml = `
                    <div class="avatar-circle" style="width: 32px; height: 32px; overflow: hidden; padding: 0;">
                        <img src="${escapeHtml(c.avatar)}" alt="${escapeHtml(c.display_name)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
                    </div>
                `;
            }

            return `
                <label class="member-select-item ${isChecked ? 'selected' : ''}">
                    <div class="member-select-left">
                        ${avatarHtml}
                        <div class="member-select-info">
                            <div class="member-select-name">${escapeHtml(c.display_name)}</div>
                            <div class="member-select-handle">@${escapeHtml(c.username)}</div>
                        </div>
                    </div>
                    <input type="checkbox" name="add_to_group_members" value="${c.id}" ${isChecked ? 'checked' : ''} onchange="updateAddMemberSubmitCount()" class="member-select-checkbox">
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
        const confirmed = await showConfirmModal({
            title: 'Keluarkan Anggota?',
            message: `Apakah Anda yakin ingin mengeluarkan "${displayName}" dari grup "${groupName}"?`,
            confirmText: 'Keluarkan',
            cancelText: 'Batal',
            type: 'danger',
            icon: 'user-minus'
        });
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
        const groupName = state.activeContact.name || 'Grup';
        const confirmed = await showConfirmModal({
            title: 'Keluar dari Grup?',
            message: `Apakah Anda yakin ingin keluar dari grup "${groupName}"? Anda tidak akan menerima pesan baru dari grup ini lagi.`,
            confirmText: 'Keluar Grup',
            cancelText: 'Batal',
            type: 'danger',
            icon: 'log-out'
        });
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
        const groupName = state.activeContact.name || 'Grup';
        const confirmed = await showConfirmModal({
            title: 'Bubarkan Grup?',
            message: `PERINGATAN: Bubarkan grup "${groupName}" untuk semua anggota? Seluruh riwayat obrolan dan data grup akan dihapus secara permanen.`,
            confirmText: 'Bubarkan Grup',
            cancelText: 'Batal',
            type: 'danger',
            icon: 'alert'
        });
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

    /* ==========================================================================
       GROUP POLLS (POLLING / VOTING)
       ========================================================================== */
    window.fetchGroupPolls = async function (groupId) {
        if (!groupId) return;
        try {
            const res = await apiRequest(`/groups/${groupId}/polls`);
            if (res && res.data && Array.isArray(res.data)) {
                res.data.forEach(poll => {
                    state.polls[poll.id] = poll;
                });
                renderActiveMessages();
            }
        } catch (err) {
            console.error('Gagal mengambil data polling grup:', err);
        }
    };

    window.openCreatePollModal = function () {
        if (!state.activeContact || !state.activeContact.is_group) {
            showToast('Fitur polling hanya tersedia di dalam obrolan grup.', 'warning');
            return;
        }
        const modal = document.getElementById('createPollModal');
        if (!modal) return;

        const questionInput = document.getElementById('pollQuestionInput');
        if (questionInput) questionInput.value = '';

        const container = document.getElementById('pollOptionsContainer');
        if (container) {
            container.innerHTML = `
                <div class="poll-option-row">
                    <span class="poll-option-number">1</span>
                    <input type="text" class="form-input poll-opt-input" placeholder="Opsi 1" required maxlength="200">
                </div>
                <div class="poll-option-row">
                    <span class="poll-option-number">2</span>
                    <input type="text" class="form-input poll-opt-input" placeholder="Opsi 2" required maxlength="200">
                </div>
            `;
        }

        const multipleCheck = document.getElementById('pollMultipleAnswers');
        if (multipleCheck) multipleCheck.checked = false;

        updatePollOptionNumbers();
        modal.classList.add('active');
        if (questionInput) questionInput.focus();
    };

    window.closeCreatePollModal = function () {
        const modal = document.getElementById('createPollModal');
        if (modal) modal.classList.remove('active');
    };

    function updatePollOptionNumbers() {
        const container = document.getElementById('pollOptionsContainer');
        if (!container) return;
        const rows = container.querySelectorAll('.poll-option-row');
        const countLabel = document.getElementById('pollOptionCountLabel');
        if (countLabel) countLabel.textContent = `${rows.length}/6 Opsi`;

        const addBtn = document.getElementById('btnAddPollOption');
        if (addBtn) addBtn.style.display = rows.length >= 6 ? 'none' : 'flex';

        rows.forEach((row, idx) => {
            const numSpan = row.querySelector('.poll-option-number');
            if (numSpan) numSpan.textContent = idx + 1;

            const input = row.querySelector('.poll-opt-input');
            if (input) input.placeholder = `Opsi ${idx + 1}`;

            let removeBtn = row.querySelector('.btn-remove-poll-opt');
            if (rows.length > 2) {
                if (!removeBtn) {
                    removeBtn = document.createElement('button');
                    removeBtn.type = 'button';
                    removeBtn.className = 'btn-icon btn-remove-poll-opt';
                    removeBtn.title = 'Hapus opsi';
                    removeBtn.setAttribute('aria-label', `Hapus opsi ${idx + 1}`);
                    removeBtn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    `;
                    removeBtn.onclick = function () {
                        removePollOptionRow(removeBtn);
                    };
                    row.appendChild(removeBtn);
                }
            } else if (removeBtn) {
                removeBtn.remove();
            }
        });
    }

    window.addPollOptionRow = function () {
        const container = document.getElementById('pollOptionsContainer');
        if (!container) return;
        const rows = container.querySelectorAll('.poll-option-row');
        if (rows.length >= 6) {
            showToast('Maksimal 6 opsi polling diperbolehkan.', 'warning');
            return;
        }

        const newRow = document.createElement('div');
        newRow.className = 'poll-option-row';
        newRow.innerHTML = `
            <span class="poll-option-number">${rows.length + 1}</span>
            <input type="text" class="form-input poll-opt-input" placeholder="Opsi ${rows.length + 1}" required maxlength="200">
        `;
        container.appendChild(newRow);
        updatePollOptionNumbers();

        const input = newRow.querySelector('.poll-opt-input');
        if (input) input.focus();
    };

    window.removePollOptionRow = function (btn) {
        const row = btn.closest('.poll-option-row');
        if (row) {
            row.remove();
            updatePollOptionNumbers();
        }
    };

    window.submitCreatePoll = async function () {
        if (!state.activeContact || !state.activeContact.is_group) {
            showToast('Grup tidak aktif.', 'error');
            return;
        }
        const groupId = state.activeContact.id || state.activeContact.group_id;
        const questionInput = document.getElementById('pollQuestionInput');
        const question = questionInput ? questionInput.value.trim() : '';

        if (!question) {
            showToast('Pertanyaan polling wajib diisi.', 'error');
            return;
        }

        const container = document.getElementById('pollOptionsContainer');
        const inputs = container ? container.querySelectorAll('.poll-opt-input') : [];
        const options = [];
        inputs.forEach(inp => {
            const val = inp.value.trim();
            if (val) options.push(val);
        });

        if (options.length < 2) {
            showToast('Minimal 2 opsi pilihan harus diisi.', 'error');
            return;
        }

        const multipleCheck = document.getElementById('pollMultipleAnswers');
        const isMultiple = multipleCheck ? multipleCheck.checked : false;

        const submitBtn = document.getElementById('btnSubmitCreatePoll');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Membuat...</span>';
        }

        try {
            const res = await apiRequest(`/groups/${groupId}/polls`, {
                method: 'POST',
                body: JSON.stringify({
                    question: question,
                    options: options,
                    is_multiple_choice: isMultiple
                })
            });

            if (res && res.data) {
                state.polls[res.data.id] = res.data;
            }

            closeCreatePollModal();
            showToast('Polling berhasil dibuat!', 'success');
        } catch (err) {
            showToast('Gagal membuat polling: ' + (err.message || 'Terjadi kesalahan'), 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Kirim Polling</span>';
            }
        }
    };

    window.renderPollCardHtml = function (pollId, isMe, msg) {
        const poll = state.polls ? state.polls[pollId] : null;

        if (!poll) {
            if (!state.pollsFetching) state.pollsFetching = {};
            if (!state.pollsFetching[pollId]) {
                state.pollsFetching[pollId] = true;
                const grpId = msg.group_id || (state.activeContact ? state.activeContact.id : null);
                if (grpId) {
                    apiRequest(`/groups/${grpId}/polls/${pollId}`).then(res => {
                        if (res && res.data) {
                            state.polls[pollId] = res.data;
                            renderActiveMessages();
                        }
                    }).catch(() => {}).finally(() => {
                        delete state.pollsFetching[pollId];
                    });
                }
            }
            return `
                <div class="poll-card poll-card-loading" style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.8125rem;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
                            <line x1="12" y1="2" x2="12" y2="6"></line>
                            <line x1="12" y1="18" x2="12" y2="22"></line>
                            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                            <line x1="2" y1="12" x2="6" y2="12"></line>
                            <line x1="18" y1="12" x2="22" y2="12"></line>
                            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                        </svg>
                        <span>Memuat data polling...</span>
                    </div>
                </div>
            `;
        }

        const isClosed = poll.status === 'closed';
        const totalVotes = poll.total_votes || (poll.options || []).reduce((acc, opt) => acc + (opt.votes_count || 0), 0);
        const currentUserId = state.user ? state.user.id : null;
        const isCreator = poll.creator_id === currentUserId;
        const myRole = state.activeContact ? (state.activeContact.role || 'member') : 'member';
        const canClose = !isClosed && (isCreator || myRole === 'admin' || myRole === 'creator');

        let optionsHtml = '';
        (poll.options || []).forEach(opt => {
            const votesCount = opt.votes_count || 0;
            const pct = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
            const hasVoted = Boolean(opt.has_voted);
            const optClass = `poll-option-item ${hasVoted ? 'voted' : ''} ${isClosed ? 'closed' : ''}`;
            const clickHandler = isClosed ? '' : `onclick="handleVotePoll(${poll.group_id}, ${poll.id}, ${opt.id})"`;
            const keydownHandler = isClosed ? '' : `onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();handleVotePoll(${poll.group_id}, ${poll.id}, ${opt.id});}"`;

            const iconHtml = hasVoted
                ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="color: var(--accent-primary); flex-shrink: 0;"><polyline points="20 6 9 17 4 12"></polyline></svg>`
                : (poll.is_multiple_choice
                    ? `<span class="poll-checkbox-indicator"></span>`
                    : `<span class="poll-radio-indicator"></span>`);

            optionsHtml += `
                <div class="${optClass}"
                     tabindex="${isClosed ? '-1' : '0'}"
                     role="button"
                     aria-pressed="${hasVoted ? 'true' : 'false'}"
                     aria-label="Pilih opsi: ${escapeHtml(opt.option_text)}. ${votesCount} suara, ${pct} persen"
                     ${clickHandler}
                     ${keydownHandler}>
                    <div class="poll-bar-fill" style="width: ${pct}%;"></div>
                    <div class="poll-option-content">
                        <div class="poll-opt-text-wrap">
                            ${iconHtml}
                            <span class="poll-opt-text">${escapeHtml(opt.option_text)}</span>
                        </div>
                        <div class="poll-opt-meta">
                            <span class="poll-opt-pct">${pct}%</span>
                            <span class="poll-opt-count">(${votesCount})</span>
                        </div>
                    </div>
                </div>
            `;
        });

        const closeBtnHtml = canClose ? `
            <button type="button" class="btn-close-poll" onclick="handleClosePoll(${poll.group_id}, ${poll.id})" aria-label="Tutup polling ini" title="Tutup polling">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <span>Tutup Polling</span>
            </button>
        ` : '';

        return `
            <div class="poll-card ${isClosed ? 'poll-card-closed' : ''}" role="region" aria-label="Polling: ${escapeHtml(poll.question)}">
                <div class="poll-header">
                    <div class="poll-header-title">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="poll-icon">
                            <line x1="18" y1="20" x2="18" y2="10"></line>
                            <line x1="12" y1="20" x2="12" y2="4"></line>
                            <line x1="6" y1="20" x2="6" y2="14"></line>
                        </svg>
                        <h4 class="poll-question">${escapeHtml(poll.question)}</h4>
                    </div>
                    <div class="poll-badges">
                        ${isClosed ? '<span class="poll-badge badge-closed">Selesai</span>' : ''}
                        <span class="poll-badge">${poll.is_multiple_choice ? 'Pilihan Ganda' : 'Pilihan Tunggal'}</span>
                    </div>
                </div>

                <div class="poll-options-list">
                    ${optionsHtml}
                </div>

                <div class="poll-footer">
                    <span class="poll-total-votes" aria-live="polite">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <span>${totalVotes} suara total</span>
                    </span>
                    ${closeBtnHtml}
                </div>
            </div>
        `;
    };

    window.handleVotePoll = async function (groupId, pollId, optionId) {
        const poll = state.polls ? state.polls[pollId] : null;
        if (poll && poll.status === 'closed') {
            showToast('Polling telah ditutup.', 'info');
            return;
        }

        try {
            const res = await apiRequest(`/groups/${groupId}/polls/${pollId}/vote`, {
                method: 'POST',
                body: JSON.stringify({
                    option_ids: [optionId]
                })
            });

            if (res && res.data) {
                state.polls[pollId] = res.data;
                renderActiveMessages();
            }
        } catch (err) {
            showToast('Gagal memberikan suara: ' + (err.message || 'Terjadi kesalahan'), 'error');
        }
    };

    window.handleClosePoll = async function (groupId, pollId) {
        const confirmed = await showConfirmModal({
            title: 'Tutup Polling?',
            message: 'Anggota grup tidak akan dapat memberikan suara lagi setelah polling ditutup. Lanjutkan?',
            confirmText: 'Tutup Polling',
            cancelText: 'Batal',
            type: 'warning',
            icon: 'lock'
        });
        if (!confirmed) return;

        try {
            const res = await apiRequest(`/groups/${groupId}/polls/${pollId}/close`, {
                method: 'POST'
            });

            if (res && res.data) {
                state.polls[pollId] = res.data;
                renderActiveMessages();
                showToast('Polling berhasil ditutup.', 'info');
            }
        } catch (err) {
            showToast('Gagal menutup polling: ' + (err.message || 'Terjadi kesalahan'), 'error');
        }
    };

    /* ==========================================================================
       FORWARD MESSAGES (TERUSKAN PESAN)
       ========================================================================== */
    window.openForwardModal = function (msgId, event) {
        if (event) event.stopPropagation();

        const activeChatId = state.activeContact ? state.activeContact.id : null;
        let msg = null;
        if (activeChatId && state.chats[activeChatId]) {
            msg = state.chats[activeChatId].find(m => String(m.id) === String(msgId) || String(m.client_uuid) === String(msgId));
        }
        if (!msg && state.chats) {
            for (const k in state.chats) {
                if (Array.isArray(state.chats[k])) {
                    msg = state.chats[k].find(m => String(m.id) === String(msgId) || String(m.client_uuid) === String(msgId));
                    if (msg) break;
                }
            }
        }

        if (!msg) {
            showToast('Pesan tidak ditemukan untuk diteruskan.', 'error');
            return;
        }

        state.forwardingMessage = msg;
        state.forwardSelectedRecipients = [];

        const modal = document.getElementById('forwardMessageModal');
        if (!modal) return;

        const previewEl = document.getElementById('forwardPreviewText');
        if (previewEl) {
            let snippet = '';
            if (msg.body && !msg.body.startsWith('[Polling:')) {
                snippet = msg.body;
            } else if (msg.attachment) {
                let att = null;
                try {
                    att = typeof msg.attachment === 'string' ? JSON.parse(msg.attachment) : msg.attachment;
                } catch (e) {
                    att = null;
                }
                if (att && att.type === 'poll') {
                    snippet = '[Polling Grup]';
                } else if (att && (att.type === 'image' || att.url)) {
                    snippet = '📷 ' + (att.original_name || 'Gambar');
                } else if (att && (att.type === 'document' || att.original_name)) {
                    snippet = '📄 ' + (att.original_name || 'Dokumen');
                } else if (att && att.type === 'audio') {
                    snippet = '🎤 Pesan Suara';
                } else {
                    snippet = '[Lampiran Media]';
                }
            } else {
                snippet = '(Pesan kosong)';
            }
            previewEl.textContent = snippet.length > 100 ? snippet.substring(0, 100) + '...' : snippet;
        }

        const searchInput = document.getElementById('forwardSearchInput');
        if (searchInput) searchInput.value = '';

        renderForwardRecipientsList('');
        updateForwardSelectedCount();

        modal.classList.add('active');
        if (searchInput) searchInput.focus();
    };

    window.closeForwardModal = function () {
        const modal = document.getElementById('forwardMessageModal');
        if (modal) modal.classList.remove('active');
        state.forwardingMessage = null;
        state.forwardSelectedRecipients = [];
    };

    window.handleForwardSearchInput = function (e) {
        const query = e.target.value.trim().toLowerCase();
        renderForwardRecipientsList(query);
    };

    function renderForwardRecipientsList(query) {
        const container = document.getElementById('forwardRecipientsList');
        if (!container) return;

        const allItems = [];

        (state.contacts || []).forEach(contact => {
            const name = contact.name || contact.username || 'Kontak';
            const username = contact.username || '';
            const phone = contact.phone || '';
            const key = `user_${contact.id}`;
            allItems.push({
                key: key,
                id: contact.id,
                type: 'contact',
                name: name,
                subtext: username ? `@${username}` : (phone || 'Kontak Pribadi'),
                avatar: contact.avatar || null,
                searchStr: `${name} ${username} ${phone}`.toLowerCase()
            });
        });

        (state.groups || []).forEach(group => {
            const name = group.name || 'Grup';
            const key = `group_${group.id}`;
            allItems.push({
                key: key,
                id: group.id,
                type: 'group',
                name: name,
                subtext: `${group.members_count || (group.members ? group.members.length : 0)} anggota`,
                avatar: group.avatar || null,
                searchStr: `${name}`.toLowerCase()
            });
        });

        const filtered = query
            ? allItems.filter(item => item.searchStr.includes(query))
            : allItems;

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.8125rem;">
                    Tidak ada kontak atau grup yang cocok.
                </div>
            `;
            return;
        }

        let html = '';
        filtered.forEach(item => {
            const isSelected = state.forwardSelectedRecipients.includes(item.key);
            const avatarHtml = item.avatar
                ? `<img src="${item.avatar}" alt="" class="avatar-circle avatar-sm" style="object-fit: cover;">`
                : `<div class="avatar-circle avatar-pastel-purple avatar-sm">${item.name.charAt(0).toUpperCase()}</div>`;

            const badgeHtml = item.type === 'group'
                ? `<span class="badge badge-purple" style="font-size: 0.65rem; padding: 2px 6px;">Grup</span>`
                : '';

            html += `
                <label class="forward-recipient-item ${isSelected ? 'selected' : ''}">
                    <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0;">
                        ${avatarHtml}
                        <div style="display: flex; flex-direction: column; min-width: 0; flex: 1;">
                            <div style="display: flex; align-items: center; gap: 0.4rem;">
                                <span class="forward-recipient-name">${escapeHtml(item.name)}</span>
                                ${badgeHtml}
                            </div>
                            <span class="forward-recipient-type">${escapeHtml(item.subtext)}</span>
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        class="forward-recipient-checkbox"
                        value="${item.key}"
                        ${isSelected ? 'checked' : ''}
                        onchange="toggleForwardRecipient('${item.key}', this.checked)"
                        aria-label="Pilih ${escapeHtml(item.name)}"
                    >
                </label>
            `;
        });

        container.innerHTML = html;
    }

    window.toggleForwardRecipient = function (key, isChecked) {
        if (isChecked) {
            if (!state.forwardSelectedRecipients.includes(key)) {
                state.forwardSelectedRecipients.push(key);
            }
        } else {
            state.forwardSelectedRecipients = state.forwardSelectedRecipients.filter(k => k !== key);
        }
        updateForwardSelectedCount();

        const container = document.getElementById('forwardRecipientsList');
        if (container) {
            const chk = container.querySelector(`input[value="${key}"]`);
            if (chk) {
                const label = chk.closest('.forward-recipient-item');
                if (label) {
                    if (isChecked) label.classList.add('selected');
                    else label.classList.remove('selected');
                }
            }
        }
    };

    function updateForwardSelectedCount() {
        const count = state.forwardSelectedRecipients.length;
        const countLabel = document.getElementById('forwardSelectedCountLabel');
        if (countLabel) {
            countLabel.textContent = `${count} dipilih`;
        }
        const submitBtn = document.getElementById('btnSubmitForward');
        if (submitBtn) {
            submitBtn.disabled = count === 0;
        }
    }

    window.submitForwardMessage = async function () {
        const msg = state.forwardingMessage;
        if (!msg) {
            showToast('Tidak ada pesan untuk diteruskan.', 'error');
            return;
        }
        const recipients = [...state.forwardSelectedRecipients];
        if (recipients.length === 0) {
            showToast('Pilih minimal satu penerima pesan.', 'warning');
            return;
        }

        const submitBtn = document.getElementById('btnSubmitForward');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Meneruskan...</span>';
        }

        let successCount = 0;
        const rawBody = msg.body || '';

        let forwardAttachment = null;
        if (msg.attachment) {
            if (typeof msg.attachment === 'string') {
                try {
                    forwardAttachment = JSON.parse(msg.attachment);
                } catch (e) {
                    forwardAttachment = {};
                }
            } else {
                forwardAttachment = { ...msg.attachment };
            }
        }
        if (!forwardAttachment) forwardAttachment = {};
        forwardAttachment.is_forwarded = true;

        for (const targetKey of recipients) {
            try {
                const clientUuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
                    ? crypto.randomUUID()
                    : 'uuid-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

                if (targetKey.startsWith('user_')) {
                    const targetUserId = Number(targetKey.replace('user_', ''));
                    const hexKey = getConversationKeyForContact(targetUserId);
                    const encryptedBody = await encryptMessageBody(rawBody, hexKey);

                    const savedMsg = await apiRequest('/messages', {
                        method: 'POST',
                        body: JSON.stringify({
                            client_uuid: clientUuid,
                            receiver_id: targetUserId,
                            body: encryptedBody,
                            attachment: forwardAttachment,
                            reply_to: null
                        })
                    });

                    if (savedMsg && savedMsg.id) {
                        const localMsg = {
                            id: savedMsg.id,
                            client_uuid: clientUuid,
                            sender_id: state.user.id,
                            receiver_id: targetUserId,
                            body: rawBody,
                            attachment: forwardAttachment,
                            reply_to: null,
                            reactions: {},
                            status: 'sent',
                            created_at: new Date().toISOString()
                        };
                        if (!state.chats[targetUserId]) state.chats[targetUserId] = [];
                        state.chats[targetUserId].push(localMsg);
                        if (typeof AppDB !== 'undefined' && AppDB.saveMessage) {
                            try { await AppDB.saveMessage(localMsg, state.user.id); } catch (e) {}
                        }
                        successCount++;
                    }
                } else if (targetKey.startsWith('group_')) {
                    const targetGroupId = Number(targetKey.replace('group_', ''));
                    const targetGroup = (state.groups || []).find(g => Number(g.id) === targetGroupId);
                    const hexKey = targetGroup ? targetGroup.group_key : null;
                    const encryptedBody = hexKey ? await encryptMessageBody(rawBody, hexKey) : rawBody;

                    const savedMsg = await apiRequest(`/groups/${targetGroupId}/messages`, {
                        method: 'POST',
                        body: JSON.stringify({
                            client_uuid: clientUuid,
                            body: encryptedBody,
                            attachment: forwardAttachment,
                            reply_to: null
                        })
                    });

                    if (savedMsg && savedMsg.id) {
                        const chatKey = `group_${targetGroupId}`;
                        const localMsg = {
                            id: savedMsg.id,
                            client_uuid: clientUuid,
                            sender_id: state.user.id,
                            group_id: targetGroupId,
                            body: rawBody,
                            attachment: forwardAttachment,
                            reply_to: null,
                            reactions: {},
                            status: 'sent',
                            created_at: new Date().toISOString()
                        };
                        if (!state.chats[chatKey]) state.chats[chatKey] = [];
                        state.chats[chatKey].push(localMsg);
                        if (typeof AppDB !== 'undefined' && AppDB.saveMessage) {
                            try { await AppDB.saveMessage(localMsg, state.user.id); } catch (e) {}
                        }
                        successCount++;
                    }
                }
            } catch (err) {
                console.error(`Gagal meneruskan pesan ke ${targetKey}:`, err);
            }
        }

        closeForwardModal();
        if (successCount > 0) {
            persistMessages();
            renderActiveMessages();
            renderChatsList();
            showToast(`Pesan berhasil diteruskan ke ${successCount} obrolan.`, 'success');
        } else {
            showToast('Gagal meneruskan pesan ke penerima yang dipilih.', 'error');
        }
    };

    /* ==========================================================================
       JOIN GROUP VIA INVITE CODE / LINK
       ========================================================================== */
    window.openJoinGroupModal = function () {
        const modal = document.getElementById('joinGroupModal');
        if (!modal) return;
        const input = document.getElementById('joinGroupCodeInput');
        if (input) input.value = '';
        modal.classList.add('active');
        if (input) input.focus();
    };

    window.closeJoinGroupModal = function () {
        const modal = document.getElementById('joinGroupModal');
        if (modal) modal.classList.remove('active');
    };

    window.submitJoinGroupByCode = async function () {
        const input = document.getElementById('joinGroupCodeInput');
        if (!input) return;
        let rawVal = input.value.trim();
        if (!rawVal) {
            showToast('Silakan masukkan kode atau tautan undangan.', 'warning');
            return;
        }

        let inviteCode = rawVal;
        const joinIdx = rawVal.indexOf('/join/');
        if (joinIdx !== -1) {
            inviteCode = rawVal.substring(joinIdx + 6).split(/[?#/]/)[0];
        }
        inviteCode = inviteCode.trim();

        if (!inviteCode) {
            showToast('Format kode undangan tidak valid.', 'error');
            return;
        }

        const submitBtn = document.getElementById('btnSubmitJoinGroup');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Bergabung...</span>';
        }

        try {
            const res = await apiRequest('/groups/join-by-code', {
                method: 'POST',
                body: JSON.stringify({
                    invite_code: inviteCode
                })
            });

            closeJoinGroupModal();
            showToast(res.message || 'Berhasil bergabung dengan grup!', 'success');
            await fetchGroups();

            if (res.data && res.data.id) {
                selectGroup(res.data.id);
            }
        } catch (err) {
            showToast('Gagal bergabung dengan grup: ' + (err.message || 'Kode undangan tidak valid'), 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Gabung Grup</span>';
            }
        }
    };

    window.closeActiveChat = function () {
        if (state.isSelectionMode) window.exitSelectMessagesMode();
        window.closeChatDropdown();
        clearMyTypingState();
        state.activeContact = null;

        const activeWindow = document.getElementById('activeChatWindow');
        const emptyState = document.getElementById('noChatSelected');
        const viewport = document.querySelector('.app-viewport');
        const infoPanel = document.getElementById('chatInfoPanel');
        const infoBackdrop = document.getElementById('infoPanelBackdrop');

        if (activeWindow) activeWindow.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
        if (viewport) viewport.classList.remove('show-chat');
        if (infoPanel) infoPanel.classList.remove('open');
        if (infoBackdrop) infoBackdrop.classList.remove('active');

        window.toggleInChatSearch(false);
        window.updateActiveChatBlockState();

        const pinnedBanner = document.getElementById('pinnedMessageBanner');
        if (pinnedBanner) pinnedBanner.style.display = 'none';

        const btnCreatePoll = document.getElementById('btnCreatePoll');
        if (btnCreatePoll) btnCreatePoll.style.display = 'none';
        const mentionBox = document.getElementById('mentionAutocompleteBox');
        if (mentionBox) mentionBox.style.display = 'none';
        state.mentionState.active = false;

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
            const delContactItem = document.getElementById('menuItemDeleteContact');
            const leaveGrpItem = document.getElementById('menuItemLeaveGroup');
            const delGrpItem = document.getElementById('menuItemDeleteGroup');

            if (infoLabel) {
                infoLabel.textContent = isGroup ? 'Informasi Grup' : 'Informasi Kontak';
            }

            const isAdmin = isGroup && (state.activeContact.my_role === 'admin' || Number(state.activeContact.created_by) === Number(state.user?.id));

            const setItemVisibility = (el, show) => {
                if (!el) return;
                if (show) {
                    el.classList.remove('d-none');
                    el.style.setProperty('display', 'flex', 'important');
                } else {
                    el.classList.add('d-none');
                    el.style.setProperty('display', 'none', 'important');
                }
            };

            setItemVisibility(editGrpItem, isGroup && isAdmin);
            setItemVisibility(addMemItem, isGroup && isAdmin);
            setItemVisibility(delContactItem, !isGroup);
            setItemVisibility(leaveGrpItem, isGroup);
            setItemVisibility(delGrpItem, isGroup && isAdmin);

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
            presenceEl.textContent = isOnline ? 'Sedang Aktif Sekarang' : (contact.last_seen_at ? formatLastSeen(contact.last_seen_at, false) : 'Sedang Tidak Aktif');
        }
        const phoneEl = document.getElementById('contactModalPhoneText');
        if (phoneEl) {
            phoneEl.textContent = contact.phone_number || '-';
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

        const blockBtn = document.getElementById('contactModalBlockBtn');
        const blockBtnText = document.getElementById('contactModalBlockBtnText');
        const isBlocked = (state.blockedUserIds && state.blockedUserIds.has(Number(contact.id))) || Boolean(contact.is_blocked);
        if (blockBtn && blockBtnText) {
            if (isBlocked) {
                blockBtnText.textContent = 'Buka Blokir';
                blockBtn.className = 'btn-outline-action contact-modal-btn';
            } else {
                blockBtnText.textContent = 'Blokir Kontak';
                blockBtn.className = 'btn-outline-warning contact-modal-btn';
            }
        }

        if (modal) {
            modal.classList.add('active');
        }
    };

    window.handleContactModalToggleBlock = async function () {
        if (!state.activeContact) return;
        await window.handleToggleBlockContact();
        const contact = state.activeContact;
        const blockBtn = document.getElementById('contactModalBlockBtn');
        const blockBtnText = document.getElementById('contactModalBlockBtnText');
        const isBlocked = (state.blockedUserIds && state.blockedUserIds.has(Number(contact.id))) || Boolean(contact.is_blocked);
        if (blockBtn && blockBtnText) {
            if (isBlocked) {
                blockBtnText.textContent = 'Buka Blokir';
                blockBtn.className = 'btn-outline-action contact-modal-btn';
            } else {
                blockBtnText.textContent = 'Blokir Kontak';
                blockBtn.className = 'btn-outline-warning contact-modal-btn';
            }
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

    window.clearActiveChatMessages = async function () {
        window.closeChatDropdown();

        if (!state.activeContact) return;
        const contactName = state.activeContact.display_name || state.activeContact.name || 'kontak ini';

        const confirmed = await showConfirmModal({
            title: 'Bersihkan Obrolan?',
            message: `Hapus seluruh riwayat pesan lokal bersama ${contactName}? Riwayat obrolan di perangkat Anda akan dibersihkan.`,
            confirmText: 'Bersihkan',
            cancelText: 'Batal',
            type: 'danger',
            icon: 'trash'
        });
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

        const confirmed = await showConfirmModal({
            title: 'Hapus Kontak?',
            message: `Hapus "${targetName}" dari daftar kontak Anda? Hubungan kontak dan riwayat obrolan akan dihapus.`,
            confirmText: 'Hapus Kontak',
            cancelText: 'Batal',
            type: 'danger',
            icon: 'user-x'
        });
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

        // Jangan pernah satukan pesan jika berbeda tanggal kalender
        if (getMessageDateKey(prevMsg.created_at) !== getMessageDateKey(currMsg.created_at)) {
            return false;
        }

        const prevTime = parseMessageTime(prevMsg.created_at);
        const currTime = parseMessageTime(currMsg.created_at);
        const diffMinutes = Math.abs((currTime - prevTime) / (1000 * 60));

        // Nyatu jika dalam rentang 3 menit oleh pengirim yang sama
        return diffMinutes <= 3;
    }

    function renderActiveMessages() {
        const renderMessages = renderActiveMessages;
        window.renderMessages = renderActiveMessages;
        window.renderActiveMessages = renderActiveMessages;
        const container = document.getElementById('messagesContainer');
        if (!container || !state.activeContact) return;

        if (state.isSelectionMode) {
            container.classList.add('selection-mode-active');
        } else {
            container.classList.remove('selection-mode-active');
        }

        const prevScrollTop = container.scrollTop;
        const wasNearBottom = (container.scrollHeight - container.scrollTop - container.clientHeight) < 100;

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

        const currentChatKey = state.activeContact ? state.activeContact.id : null;
        const currentPinnedList = currentChatKey ? (state.pinnedMessages[currentChatKey] || []) : [];

        let lastRenderedDateKey = null;

        const messagesHtml = messages.map((msg, idx) => {
            const isMe = Boolean(state.user && msg.sender_id === state.user.id);
            const rowClass = isMe ? 'me' : 'other';
            const timeText = formatTime(msg.created_at);
            const isGroup = Boolean(state.activeContact && (state.activeContact.is_group || state.activeContact.isGroup));
            const statusMarker = isMe ? renderStatusCheck(msg.status, isGroup) : '';
            const isDeleted = Boolean(msg.is_deleted) || msg.body === 'Pesan ini telah dihapus';
            const isEdited = Boolean(msg.is_edited) && !isDeleted;
            const isPinned = Boolean(msg.id && currentPinnedList.some(p => Number(p.message_id) === Number(msg.id)));
            const msgIdentifier = msg.id ? String(msg.id) : (msg.client_uuid || '');
            const safeIdAttr = escapeHtml(msgIdentifier);

            // Pisahkan chat setiap tanggal seperti WhatsApp (HARI INI, KEMARIN, 18 OKTOBER 2026, dll.)
            const msgDateKey = getMessageDateKey(msg.created_at) || getMessageDateKey(new Date());
            let dateDividerHtml = '';
            if (msgDateKey !== lastRenderedDateKey) {
                lastRenderedDateKey = msgDateKey;
                const dividerText = formatMessageDateDivider(msg.created_at || new Date());
                dateDividerHtml = `
                    <div class="date-divider">
                        <span class="date-divider-text">${dividerText}</span>
                    </div>
                `;
            }

            const isSelected = state.isSelectionMode && state.selectedMessageIds.has(safeIdAttr);
            const selectedClass = isSelected ? 'selected' : '';
            const rowOnClick = state.isSelectionMode && !isDeleted ? `onclick="toggleSelectMessage('${safeIdAttr}', event)"` : '';

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

            const checkboxHtml = !isDeleted ? `
                <div class="msg-checkbox ${isSelected ? 'checked' : ''}" onclick="toggleSelectMessage('${safeIdAttr}', event)" title="Pilih pesan">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
            ` : '';

            if (isDeleted) {
                return dateDividerHtml + `
                    <div class="message-row ${rowClass} ${groupClass}" data-msg-id="${safeIdAttr}" data-msg-uuid="${escapeHtml(msg.client_uuid || '')}">
                        <div class="msg-selection-wrap">
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
                const isVideo = (att.type && att.type.startsWith('video/')) || (att.name && att.name.match(/\.(mp4|webm|mov|mkv)$/i));
                const isAudio = (att.type && att.type.startsWith('audio/')) || (att.name && att.name.match(/\.(webm|ogg|mp3|wav|m4a|aac)$/i)) || Boolean(att.is_audio);

                if (isAudio) {
                    const audioId = 'audio_' + (msg.id || msg.client_uuid || Math.random().toString(36).substr(2, 9));
                    const barHeights = [25, 45, 70, 35, 75, 95, 80, 50, 70, 90, 45, 80, 60, 40, 70, 90, 75, 55, 35, 65, 85, 55, 40, 65, 45, 30, 45, 25];
                    const barsHtml = barHeights.map((h, i) => `<span class="vn-bar" style="height: ${h}%;" data-idx="${i}"></span>`).join('');

                    attachmentHtml = `
                        <div class="vn-player-wrapper voice-note-bubble" data-audio-id="${audioId}">
                            <button type="button" class="vn-play-btn voice-note-play-btn" onclick="event.stopPropagation(); togglePlayVoiceNote('${audioId}')" aria-label="Putar rekaman suara" title="Putar">
                                <svg class="vn-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="6 4 20 12 6 20 6 4"></polygon>
                                </svg>
                            </button>
                            <div class="vn-content">
                                <div class="vn-waveform-track voice-note-waveform" onmousedown="event.stopPropagation(); initVoiceNoteScrubbing('${audioId}', event)" onclick="event.stopPropagation(); seekVoiceNote('${audioId}', event)" title="Klik atau seret untuk memajukan / memundurkan">
                                    ${barsHtml}
                                </div>
                                <div class="vn-info-row">
                                    <span class="vn-timer voice-note-duration" id="duration_${audioId}">0:00</span>
                                    <button type="button" class="vn-speed-btn" id="speed_${audioId}" onclick="event.stopPropagation(); toggleVoiceNoteSpeed('${audioId}', event)" title="Ubah kecepatan (1x, 1.5x, 2x)">1x</button>
                                </div>
                            </div>
                            <audio id="${audioId}" src="${fileUrl}" preload="metadata" ontimeupdate="updateVoiceNoteProgress('${audioId}')" onended="onVoiceNoteEnded('${audioId}')" onloadedmetadata="initVoiceNoteDuration('${audioId}')" onplay="onVoiceNotePlay('${audioId}')" onpause="onVoiceNotePause('${audioId}')"></audio>
                        </div>
                    `;
                } else if (isImage) {
                    const safeName = escapeHtml(att.name || 'Gambar');
                    const jsSafeUrl = fileUrl.replace(/'/g, "\\'");
                    const jsSafeName = safeName.replace(/'/g, "\\'");
                    attachmentHtml = `
                        <div class="bubble-attachment-image">
                            <button type="button" class="bubble-lightbox-trigger" onclick="event.stopPropagation(); openMediaLightbox('${jsSafeUrl}', { name: '${jsSafeName}' })" title="Buka dalam Lightbox Galeri">
                                <img src="${fileUrl}" alt="${safeName}" loading="lazy">
                                <span class="lightbox-hint-badge" title="Perbesar Layar Penuh">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <polyline points="9 21 3 21 3 15"></polyline>
                                        <line x1="21" y1="3" x2="14" y2="10"></line>
                                        <line x1="3" y1="21" x2="10" y2="14"></line>
                                    </svg>
                                </span>
                            </button>
                        </div>
                    `;
                } else if (isVideo) {
                    const safeName = escapeHtml(att.name || 'Video');
                    const jsSafeUrl = fileUrl.replace(/'/g, "\\'");
                    const jsSafeName = safeName.replace(/'/g, "\\'");
                    attachmentHtml = `
                        <div class="bubble-attachment-image bubble-attachment-video">
                            <button type="button" class="bubble-lightbox-trigger video-trigger" onclick="event.stopPropagation(); openMediaLightbox('${jsSafeUrl}', { name: '${jsSafeName}', isVideo: true })" title="Putar video dalam Lightbox">
                                <video src="${fileUrl}" preload="metadata" muted></video>
                                <div class="video-play-overlay">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                        <polygon points="6 4 20 12 6 20 6 4"></polygon>
                                    </svg>
                                </div>
                            </button>
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
            let pollCardHtml = '';
            let hasMentionMe = false;

            const isForwarded = Boolean(msg.is_forwarded || (att && att.is_forwarded));
            const forwardedBadgeHtml = isForwarded ? `
                <div class="msg-forwarded-badge">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 17 20 12 15 7"></polyline>
                        <path d="M4 18v-2a4 4 0 0 1 4-4h12"></path>
                    </svg>
                    <span>Diteruskan</span>
                </div>
            ` : '';

            // Cek apakah pesan ini adalah polling grup
            let pollId = null;
            if (att && (att.type === 'poll' || att.poll_id)) {
                pollId = Number(att.poll_id);
            } else if (msg.body && msg.body.startsWith('[Polling:')) {
                if (att && att.poll_id) {
                    pollId = Number(att.poll_id);
                } else {
                    const matchPoll = msg.body.match(/^\[Polling:\s*(.+?)\]$/);
                    // Jika ada polling di state dengan pertanyaan cocok
                    if (matchPoll) {
                        const foundPoll = Object.values(state.polls || {}).find(p => p.question === matchPoll[1]);
                        if (foundPoll) pollId = Number(foundPoll.id);
                    }
                }
            }

            if (pollId && !isDeleted) {
                if (typeof renderPollCardHtml === 'function') {
                    pollCardHtml = renderPollCardHtml(pollId, isMe, msg);
                }
            }

            const isPlaceholderBody = att && msg.body && (msg.body === `[Berkas: ${att.name}]` || msg.body.startsWith('[Berkas:') || msg.body.startsWith('[Pesan Suara') || (pollCardHtml && msg.body.startsWith('[Polling:')));
            if (!isPlaceholderBody && msg.body && !pollCardHtml) {
                let safeBody = escapeHtml(msg.body).replace(/\n/g, '<br>');
                if (state.inChatSearchQuery && !isDeleted) {
                    try {
                        const regex = new RegExp(`(${escapeRegex(state.inChatSearchQuery)})`, 'gi');
                        safeBody = safeBody.replace(regex, '<mark class="search-highlight">$1</mark>');
                    } catch (e) { }
                }

                // Mention @username highlight
                if (isGroup && !isDeleted) {
                    const myUsername = (state.user?.username || '').toLowerCase();
                    safeBody = safeBody.replace(/@([a-zA-Z0-9_]+)/g, (fullMatch, uName) => {
                        const isMeMentioned = uName.toLowerCase() === myUsername || uName.toLowerCase() === 'all';
                        if (isMeMentioned) hasMentionMe = true;
                        return `<span class="mention-tag ${isMeMentioned ? 'mention-me' : ''}">@${escapeHtml(uName)}</span>`;
                    });
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
                groupSenderHtml = `<div class="group-msg-sender">${escapeHtml(sName)}</div>`;
            }

            const mentionRowClass = hasMentionMe ? 'has-mention-me' : '';

            return dateDividerHtml + `
                <div class="message-row ${rowClass} ${groupClass} ${selectedClass} ${mentionRowClass}" data-msg-id="${safeIdAttr}" data-msg-uuid="${escapeHtml(msg.client_uuid || '')}" ${rowOnClick}>
                    <div class="msg-selection-wrap">
                        ${!isMe ? checkboxHtml : ''}
                        <div class="message-bubble-wrapper">
                            <div class="message-bubble" ondblclick="startReplyMessage('${safeIdAttr}')" title="${state.isSelectionMode ? 'Klik untuk memilih/membatalkan' : 'Klik 2x untuk membalas'}">
                                ${forwardedBadgeHtml}
                                ${groupSenderHtml}
                                ${quoteHtml}
                                ${attachmentHtml}
                                ${pollCardHtml}
                                ${renderedBody}
                                ${isEdited ? '<span class="edited-label">(diedit)</span>' : ''}
                                <span class="bubble-meta">
                                    <span class="meta-time">${timeText}</span>
                                    ${statusMarker}
                                </span>
                                ${reactionsHtml}
                            </div>
                            <div class="message-actions" role="toolbar" aria-label="Aksi pesan">
                                <button type="button" class="btn-msg-action" onclick="toggleSelectMessage('${safeIdAttr}', event)" title="Pilih pesan" aria-label="Pilih pesan">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="9 11 12 14 22 4"></polyline>
                                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                    </svg>
                                </button>
                                <button type="button" class="btn-msg-action" onclick="startReplyMessage('${safeIdAttr}', event)" title="Balas pesan" aria-label="Balas pesan">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="9 17 4 12 9 7"></polyline>
                                        <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
                                    </svg>
                                </button>
                                <button type="button" class="btn-msg-action" onclick="openForwardModal('${safeIdAttr}', event)" title="Teruskan pesan" aria-label="Teruskan pesan">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="15 17 20 12 15 7"></polyline>
                                        <path d="M4 18v-2a4 4 0 0 1 4-4h12"></path>
                                    </svg>
                                </button>
                                <button type="button" class="btn-msg-action ${msg.is_starred ? 'active' : ''}" onclick="handleToggleStarMessage('${safeIdAttr}')" title="${msg.is_starred ? 'Hapus bintang' : 'Bintangi pesan'}" aria-label="Bintang pesan">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="${msg.is_starred ? '#f59e0b' : 'none'}" stroke="${msg.is_starred ? '#f59e0b' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                    </svg>
                                </button>
                                <button type="button" class="btn-msg-action ${isPinned ? 'active' : ''}" onclick="togglePinMessage('${safeIdAttr}')" title="${isPinned ? 'Lepas sematan' : 'Sematkan pesan'}" aria-label="Sematkan pesan">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="${isPinned ? '#a78bfa' : 'none'}" stroke="${isPinned ? '#a78bfa' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <line x1="12" y1="17" x2="12" y2="22"></line>
                                        <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24Z"></path>
                                    </svg>
                                </button>
                                <button type="button" class="btn-msg-action" onclick="toggleMessageReaction('${safeIdAttr}', '👍')" title="Suka" aria-label="Suka">👍</button>
                                <button type="button" class="btn-msg-action" onclick="toggleMessageReaction('${safeIdAttr}', '❤️')" title="Cinta" aria-label="Cinta">❤️</button>
                                <button type="button" class="btn-msg-action" onclick="toggleMessageReaction('${safeIdAttr}', '😂')" title="Tertawa" aria-label="Tertawa">😂</button>
                                <button type="button" class="btn-msg-action" onclick="toggleMessageReaction('${safeIdAttr}', '🙏')" title="Terima kasih" aria-label="Terima kasih">🙏</button>
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
                        ${isMe ? checkboxHtml : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = encryptionBannerHtml + messagesHtml;

        if (state.isSelectionMode || !wasNearBottom) {
            container.scrollTop = prevScrollTop;
        } else {
            container.scrollTop = container.scrollHeight;
        }

        if (state.activeContact) {
            updateRightPanelMediaAndDocs(state.activeContact.id);
        }

        if (state.isSelectionMode) {
            updateSelectionUI();
        }
    }

    window.handleMessageKeydown = function (e) {
        if (state.mentionState && state.mentionState.active) {
            const box = document.getElementById('mentionAutocompleteBox');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                state.mentionState.selectedIndex = (state.mentionState.selectedIndex + 1) % state.mentionState.matches.length;
                updateMentionSelectionUI();
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                state.mentionState.selectedIndex = (state.mentionState.selectedIndex - 1 + state.mentionState.matches.length) % state.mentionState.matches.length;
                updateMentionSelectionUI();
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                const selected = state.mentionState.matches[state.mentionState.selectedIndex];
                if (selected) {
                    window.selectMentionMember(selected.username);
                }
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                if (box) box.style.display = 'none';
                state.mentionState.active = false;
                return;
            }
        }

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

    function updateMentionSelectionUI() {
        const box = document.getElementById('mentionAutocompleteBox');
        if (!box) return;
        const items = box.querySelectorAll('.mention-autocomplete-item');
        items.forEach((item, idx) => {
            const isSel = idx === state.mentionState.selectedIndex;
            item.classList.toggle('active', isSel);
            item.setAttribute('aria-selected', isSel);
            if (isSel) {
                item.scrollIntoView({ block: 'nearest' });
            }
        });
    }

    window.selectMentionMember = function (username) {
        const input = document.getElementById('messageInput');
        const box = document.getElementById('mentionAutocompleteBox');
        if (!input) return;

        const val = input.value;
        const triggerIdx = state.mentionState.triggerIndex;
        if (triggerIdx !== -1) {
            const cursor = input.selectionStart || val.length;
            const before = val.slice(0, triggerIdx);
            const after = val.slice(cursor);
            input.value = `${before}@${username} ${after}`;
            const newCursor = triggerIdx + username.length + 2;
            input.setSelectionRange(newCursor, newCursor);
        }
        if (box) box.style.display = 'none';
        state.mentionState.active = false;
        input.focus();
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

        // Mention autocomplete detection in group chat
        if (state.activeContact.is_group) {
            const input = document.getElementById('messageInput');
            const box = document.getElementById('mentionAutocompleteBox');
            if (input && box) {
                const val = input.value;
                const cursor = input.selectionStart || 0;
                const textBeforeCursor = val.slice(0, cursor);
                const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);

                if (match) {
                    const query = match[1].toLowerCase();
                    const currentGroupId = Number(state.activeContact.group_id);
                    const currentGroup = (state.groups || []).find(g => Number(g.id) === currentGroupId);
                    const members = (currentGroup && currentGroup.members) ? currentGroup.members : (state.activeContact.members || []);

                    const filtered = members.filter(m => {
                        const u = (m.username || '').toLowerCase();
                        const d = (m.display_name || '').toLowerCase();
                        return u.includes(query) || d.includes(query);
                    });

                    if (filtered.length > 0) {
                        state.mentionState.active = true;
                        state.mentionState.query = query;
                        state.mentionState.matches = filtered;
                        state.mentionState.selectedIndex = Math.min(state.mentionState.selectedIndex, filtered.length - 1);
                        state.mentionState.triggerIndex = textBeforeCursor.lastIndexOf('@');

                        box.innerHTML = filtered.map((m, idx) => {
                            const isSel = idx === state.mentionState.selectedIndex;
                            const initial = (m.display_name || m.username || 'U').charAt(0).toUpperCase();
                            const pastelClass = getPastelColorClass(m.display_name || m.username);
                            const avatarInner = m.avatar
                                ? `<img src="${escapeHtml(m.avatar)}" alt="${escapeHtml(m.display_name)}" style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover;">`
                                : `<div class="avatar-circle ${pastelClass}" style="width: 26px; height: 26px; font-size: 0.7rem;">${initial}</div>`;

                            return `
                                <div class="mention-autocomplete-item ${isSel ? 'active' : ''}" role="option" aria-selected="${isSel}" onclick="selectMentionMember('${escapeHtml(m.username)}')">
                                    ${avatarInner}
                                    <div>
                                        <div class="mention-item-name">${escapeHtml(m.display_name)}</div>
                                        <div class="mention-item-handle">@${escapeHtml(m.username)}</div>
                                    </div>
                                </div>
                            `;
                        }).join('');
                        box.style.display = 'block';
                    } else {
                        box.style.display = 'none';
                        state.mentionState.active = false;
                    }
                } else {
                    box.style.display = 'none';
                    state.mentionState.active = false;
                }
            }
        }

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
                    updateActiveUserOnlineStatus(state.activeContact);
                }
                renderChatsList();
            }, 3500);
        }
    }

    window.handleSendMessage = async function (e, explicitBody = null) {
        if (e) e.preventDefault();
        if (!state.activeContact) return;

        if (!state.activeContact.is_group && state.blockedUserIds && state.blockedUserIds.has(Number(state.activeContact.id))) {
            showToast('Anda telah memblokir kontak ini. Buka blokir untuk mengirim pesan.', 'error');
            return;
        }

        const textarea = document.getElementById('messageInput');
        const body = (explicitBody !== null ? explicitBody : (textarea ? textarea.value : '')).trim();
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

            if (explicitBody === null && textarea) {
                textarea.value = '';
                textarea.style.height = 'auto';
            }
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

        if (explicitBody === null && textarea) {
            textarea.value = '';
            textarea.style.height = 'auto';
        }

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
    // Voice Note (Pesan Suara) Handlers
    // ==========================================

    window.startVoiceNoteRecording = async function () {
        if (!state.activeContact) {
            showToast('Pilih kontak atau grup terlebih dahulu.', 'info');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            state.voiceNote.stream = stream;
            state.voiceNote.audioChunks = [];
            state.voiceNote.seconds = 0;

            let mimeType = 'audio/webm;codecs=opus';
            if (typeof MediaRecorder !== 'undefined') {
                if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                    if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
                        mimeType = 'audio/ogg;codecs=opus';
                    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                        mimeType = 'audio/mp4';
                    } else {
                        mimeType = '';
                    }
                }
            }

            const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
            state.voiceNote.mediaRecorder = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    state.voiceNote.audioChunks.push(event.data);
                }
            };

            mediaRecorder.start(200);
            state.voiceNote.isRecording = true;

            const form = document.getElementById('messageForm');
            const bar = document.getElementById('voiceNoteRecordingBar');
            const timerEl = document.getElementById('voiceNoteDurationText');
            if (form) form.style.display = 'none';
            if (bar) bar.style.display = 'flex';
            if (timerEl) timerEl.textContent = '00:00';

            // Real-Time Live Recording Waveform via Web Audio API
            try {
                const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
                if (AudioCtxClass) {
                    const audioCtx = new AudioCtxClass();
                    const analyser = audioCtx.createAnalyser();
                    analyser.fftSize = 64;
                    analyser.smoothingTimeConstant = 0.5;
                    const source = audioCtx.createMediaStreamSource(stream);
                    source.connect(analyser);

                    state.voiceNoteAnalyser.audioCtx = audioCtx;
                    state.voiceNoteAnalyser.analyser = analyser;

                    const waveformContainer = document.getElementById('voiceNoteLiveWaveform');
                    if (waveformContainer) {
                        const BAR_COUNT = 16;
                        waveformContainer.innerHTML = Array.from({ length: BAR_COUNT }, (_, i) => `<span class="vn-live-bar" id="vnLiveBar_${i}"></span>`).join('');
                        const dataArray = new Uint8Array(analyser.frequencyBinCount);

                        const updateLiveBars = () => {
                            if (!state.voiceNote.isRecording) return;
                            analyser.getByteFrequencyData(dataArray);

                            for (let i = 0; i < BAR_COUNT; i++) {
                                const barEl = document.getElementById(`vnLiveBar_${i}`);
                                if (barEl) {
                                    const binIdx = Math.min(i + 1, dataArray.length - 1);
                                    const val = dataArray[binIdx] || 0;
                                    const heightPx = Math.max(4, Math.round((val / 255) * 22));
                                    barEl.style.height = `${heightPx}px`;
                                    barEl.style.background = val > 130 ? 'var(--primary-color, #7c3aed)' : '#ef4444';
                                }
                            }
                            state.voiceNoteAnalyser.animFrame = requestAnimationFrame(updateLiveBars);
                        };
                        state.voiceNoteAnalyser.animFrame = requestAnimationFrame(updateLiveBars);
                    }
                }
            } catch (vizErr) {
                console.warn('Voice note live waveform init error:', vizErr);
            }

            if (state.voiceNote.timerInterval) clearInterval(state.voiceNote.timerInterval);
            state.voiceNote.timerInterval = setInterval(() => {
                state.voiceNote.seconds++;
                const mins = String(Math.floor(state.voiceNote.seconds / 60)).padStart(2, '0');
                const secs = String(state.voiceNote.seconds % 60).padStart(2, '0');
                if (timerEl) timerEl.textContent = `${mins}:${secs}`;
            }, 1000);

        } catch (err) {
            console.error('Gagal mengakses mikrofon untuk rekaman suara:', err);
            showToast('Tidak dapat merekam: Pastikan izin mikrofon telah diberikan di browser.', 'error');
        }
    };

    window.cancelVoiceNoteRecording = function () {
        if (!state.voiceNote.isRecording && !state.voiceNote.mediaRecorder) return;
        cleanupVoiceNoteRecording();
        showToast('Rekaman suara dibatalkan', 'info');
    };

    function cleanupVoiceNoteRecording() {
        if (state.voiceNoteAnalyser.animFrame) {
            cancelAnimationFrame(state.voiceNoteAnalyser.animFrame);
            state.voiceNoteAnalyser.animFrame = null;
        }
        if (state.voiceNoteAnalyser.audioCtx) {
            try { state.voiceNoteAnalyser.audioCtx.close(); } catch (e) { }
            state.voiceNoteAnalyser.audioCtx = null;
            state.voiceNoteAnalyser.analyser = null;
        }
        const waveformContainer = document.getElementById('voiceNoteLiveWaveform');
        if (waveformContainer) waveformContainer.innerHTML = '';

        if (state.voiceNote.timerInterval) {
            clearInterval(state.voiceNote.timerInterval);
            state.voiceNote.timerInterval = null;
        }
        if (state.voiceNote.mediaRecorder && state.voiceNote.mediaRecorder.state !== 'inactive') {
            try { state.voiceNote.mediaRecorder.stop(); } catch (e) { }
        }
        if (state.voiceNote.stream) {
            state.voiceNote.stream.getTracks().forEach(t => { try { t.stop(); } catch (e) { } });
            state.voiceNote.stream = null;
        }
        state.voiceNote.mediaRecorder = null;
        state.voiceNote.audioChunks = [];
        state.voiceNote.isRecording = false;
        state.voiceNote.seconds = 0;

        const form = document.getElementById('messageForm');
        const bar = document.getElementById('voiceNoteRecordingBar');
        if (bar) bar.style.display = 'none';
        if (form) form.style.display = 'flex';
    }

    window.stopAndSendVoiceNoteRecording = async function () {
        if (!state.voiceNote.isRecording || !state.voiceNote.mediaRecorder) return;
        const durationSec = state.voiceNote.seconds;
        if (durationSec < 1) {
            showToast('Pesan suara terlalu singkat.', 'info');
            cleanupVoiceNoteRecording();
            return;
        }

        const recorder = state.voiceNote.mediaRecorder;
        recorder.onstop = async () => {
            const blobType = recorder.mimeType || 'audio/webm';
            const audioBlob = new Blob(state.voiceNote.audioChunks, { type: blobType });
            const ext = blobType.includes('ogg') ? 'ogg' : (blobType.includes('mp4') ? 'mp4' : 'webm');
            const fileName = `voice_note_${Date.now()}.${ext}`;
            const audioFile = new File([audioBlob], fileName, { type: blobType });

            cleanupVoiceNoteRecording();

            showToast('Mengunggah pesan suara...', 'info');
            try {
                const uploadRes = await uploadAttachmentFile(audioFile);
                if (uploadRes && uploadRes.url) {
                    state.selectedAttachment = {
                        name: fileName,
                        size: audioFile.size,
                        type: blobType,
                        url: uploadRes.url,
                        is_audio: true,
                        duration: durationSec
                    };
                    const mins = Math.floor(durationSec / 60);
                    const secs = String(durationSec % 60).padStart(2, '0');
                    await window.handleSendMessage(null, `[Pesan Suara ${mins}:${secs}]`);
                    showToast('Pesan suara terkirim!', 'success');
                }
            } catch (err) {
                console.error('Gagal mengirim pesan suara:', err);
                showToast('Gagal mengirim pesan suara: ' + err.message, 'error');
            }
        };

        try {
            recorder.stop();
        } catch (e) {
            cleanupVoiceNoteRecording();
        }
    };

    window.togglePlayVoiceNote = function (audioId) {
        const audioEl = document.getElementById(audioId);
        if (!audioEl) return;

        // Pause any other playing voice notes
        document.querySelectorAll('audio[id^="audio_"]').forEach(other => {
            if (other.id !== audioId && !other.paused) {
                other.pause();
                const otherWrapper = other.closest('.vn-player-wrapper, .voice-note-bubble');
                const otherBtn = otherWrapper?.querySelector('.vn-play-btn, .voice-note-play-btn');
                if (otherBtn) {
                    otherBtn.setAttribute('aria-label', 'Putar rekaman suara');
                    otherBtn.setAttribute('title', 'Putar');
                    otherBtn.innerHTML = `
                        <svg class="vn-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="6 4 20 12 6 20 6 4"></polygon>
                        </svg>
                    `;
                }
                otherWrapper?.classList.remove('is-playing');
            }
        });

        if (audioEl.paused) {
            audioEl.play().then(() => {
                window.onVoiceNotePlay(audioId);
            }).catch(err => console.warn('Gagal memutar audio:', err));
        } else {
            audioEl.pause();
            window.onVoiceNotePause(audioId);
        }
    };

    window.onVoiceNotePlay = function (audioId) {
        const audioEl = document.getElementById(audioId);
        if (!audioEl) return;
        const wrapper = audioEl.closest('.vn-player-wrapper, .voice-note-bubble');
        const btn = wrapper?.querySelector('.vn-play-btn, .voice-note-play-btn');
        if (btn) {
            btn.setAttribute('aria-label', 'Jeda rekaman suara');
            btn.setAttribute('title', 'Jeda');
            btn.innerHTML = `
                <svg class="vn-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1.5"></rect>
                    <rect x="14" y="4" width="4" height="16" rx="1.5"></rect>
                </svg>
            `;
        }
        wrapper?.classList.add('is-playing');
    };

    window.onVoiceNotePause = function (audioId) {
        const audioEl = document.getElementById(audioId);
        if (!audioEl) return;
        const wrapper = audioEl.closest('.vn-player-wrapper, .voice-note-bubble');
        const btn = wrapper?.querySelector('.vn-play-btn, .voice-note-play-btn');
        if (btn) {
            btn.setAttribute('aria-label', 'Putar rekaman suara');
            btn.setAttribute('title', 'Putar');
            btn.innerHTML = `
                <svg class="vn-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="6 4 20 12 6 20 6 4"></polygon>
                </svg>
            `;
        }
        wrapper?.classList.remove('is-playing');
    };

    window.updateVoiceNoteProgress = function (audioId) {
        const audioEl = document.getElementById(audioId);
        if (!audioEl) return;
        const wrapper = audioEl.closest('.vn-player-wrapper, .voice-note-bubble');
        const durEl = document.getElementById(`duration_${audioId}`);

        const current = audioEl.currentTime || 0;
        const duration = audioEl.duration || 0;

        if (wrapper && duration > 0) {
            const bars = wrapper.querySelectorAll('.vn-bar');
            if (bars.length > 0) {
                const fraction = Math.max(0, Math.min(1, current / duration));
                const activeThreshold = Math.floor(fraction * bars.length);
                bars.forEach((bar, idx) => {
                    if (idx <= activeThreshold && fraction > 0) {
                        bar.classList.add('active');
                    } else {
                        bar.classList.remove('active');
                    }
                });
            }
        }

        if (durEl) {
            const mins = Math.floor(current / 60);
            const secs = String(Math.floor(current % 60)).padStart(2, '0');
            durEl.textContent = `${mins}:${secs}`;
        }
    };

    window.seekVoiceNote = function (audioId, event) {
        window.initVoiceNoteScrubbing(audioId, event);
    };

    window.initVoiceNoteScrubbing = function (audioId, event) {
        if (event) event.stopPropagation();
        const audioEl = document.getElementById(audioId);
        if (!audioEl || !audioEl.duration || isNaN(audioEl.duration)) return;

        const track = event.currentTarget || event.target.closest('.vn-waveform-track');
        if (!track) return;
        const rect = track.getBoundingClientRect();

        const updateFromClientX = (clientX) => {
            const clickX = clientX - rect.left;
            const fraction = Math.max(0, Math.min(1, clickX / rect.width));
            audioEl.currentTime = fraction * audioEl.duration;
            window.updateVoiceNoteProgress(audioId);
        };

        updateFromClientX(event.clientX);
        track.classList.add('scrubbing');

        const onMouseMove = (moveEv) => {
            moveEv.preventDefault();
            updateFromClientX(moveEv.clientX);
        };

        const onMouseUp = () => {
            track.classList.remove('scrubbing');
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            if (audioEl.paused) {
                audioEl.play().then(() => {
                    window.onVoiceNotePlay(audioId);
                }).catch(() => { });
            }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    window.toggleVoiceNoteSpeed = function (audioId, event) {
        if (event) event.stopPropagation();
        const audioEl = document.getElementById(audioId);
        if (!audioEl) return;

        const speedBtn = document.getElementById(`speed_${audioId}`);
        let nextSpeed = 1;
        if (audioEl.playbackRate === 1) nextSpeed = 1.5;
        else if (audioEl.playbackRate === 1.5) nextSpeed = 2;
        else nextSpeed = 1;

        audioEl.playbackRate = nextSpeed;
        if (speedBtn) {
            speedBtn.textContent = `${nextSpeed}x`;
        }
    };

    window.onVoiceNoteEnded = function (audioId) {
        const audioEl = document.getElementById(audioId);
        if (!audioEl) return;
        window.onVoiceNotePause(audioId);

        const wrapper = audioEl.closest('.vn-player-wrapper, .voice-note-bubble');
        if (wrapper) {
            wrapper.querySelectorAll('.vn-bar').forEach(b => b.classList.remove('active'));
        }

        const durEl = document.getElementById(`duration_${audioId}`);
        if (durEl && audioEl.duration && !isNaN(audioEl.duration)) {
            const mins = Math.floor(audioEl.duration / 60);
            const secs = String(Math.floor(audioEl.duration % 60)).padStart(2, '0');
            durEl.textContent = `${mins}:${secs}`;
        } else if (durEl) {
            durEl.textContent = '0:00';
        }
    };

    window.initVoiceNoteDuration = function (audioId) {
        const audioEl = document.getElementById(audioId);
        if (!audioEl || !audioEl.duration || isNaN(audioEl.duration)) return;
        const durEl = document.getElementById(`duration_${audioId}`);
        if (durEl && audioEl.paused && (audioEl.currentTime === 0 || !audioEl.currentTime)) {
            const mins = Math.floor(audioEl.duration / 60);
            const secs = String(Math.floor(audioEl.duration % 60)).padStart(2, '0');
            durEl.textContent = `${mins}:${secs}`;
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

        const confirmed = await showConfirmModal({
            title: 'Hapus Pesan?',
            message: 'Hapus pesan ini untuk semua orang dalam obrolan? Tindakan ini tidak dapat dibatalkan.',
            confirmText: 'Hapus untuk Semua Orang',
            cancelText: 'Batal',
            type: 'danger',
            icon: 'trash'
        });
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

    // ==========================================
    // Bulk Message Selection & Deletion System
    // ==========================================
    window.enterSelectMessagesMode = function (initialMsgId = null) {
        window.closeChatDropdown();
        if (!state.activeContact) return;

        state.isSelectionMode = true;
        state.selectedMessageIds = new Set();
        if (initialMsgId) {
            state.selectedMessageIds.add(String(initialMsgId));
        }

        const bar = document.getElementById('chatSelectionBar');
        if (bar) {
            bar.style.display = 'flex';
        }

        renderActiveMessages();
        updateSelectionUI();
    };

    window.exitSelectMessagesMode = function () {
        state.isSelectionMode = false;
        state.selectedMessageIds.clear();

        const bar = document.getElementById('chatSelectionBar');
        if (bar) {
            bar.style.display = 'none';
        }

        const container = document.getElementById('messagesContainer');
        if (container) {
            container.classList.remove('selection-mode-active');
        }

        renderActiveMessages();
    };

    window.toggleSelectMessage = function (msgIdentifier, event) {
        if (event) {
            event.stopPropagation();
        }

        const safeId = String(msgIdentifier);

        if (!state.isSelectionMode) {
            window.enterSelectMessagesMode(safeId);
            return;
        }

        if (state.selectedMessageIds.has(safeId)) {
            state.selectedMessageIds.delete(safeId);
        } else {
            state.selectedMessageIds.add(safeId);
        }

        updateSelectionUI();
        updateMessageRowSelectionDOM(safeId);
    };

    function updateMessageRowSelectionDOM(specificMsgId = null) {
        const container = document.getElementById('messagesContainer');
        if (!container) return;

        if (specificMsgId) {
            const row = container.querySelector(`.message-row[data-msg-id="${specificMsgId}"]`);
            if (row) {
                const isSelected = state.selectedMessageIds.has(specificMsgId);
                row.classList.toggle('selected', isSelected);
                const cb = row.querySelector('.msg-checkbox');
                if (cb) {
                    cb.classList.toggle('checked', isSelected);
                }
            }
        } else {
            const rows = container.querySelectorAll('.message-row[data-msg-id]');
            rows.forEach(row => {
                const id = row.getAttribute('data-msg-id');
                const isSelected = state.selectedMessageIds.has(id);
                row.classList.toggle('selected', isSelected);
                const cb = row.querySelector('.msg-checkbox');
                if (cb) {
                    cb.classList.toggle('checked', isSelected);
                }
            });
        }
    }

    window.toggleSelectAllMessages = function () {
        if (!state.activeContact) return;
        const chatKey = state.activeContact.is_group ? ('group_' + state.activeContact.group_id) : state.activeContact.id;
        const msgs = (state.chats[chatKey] || []).filter(m => !m.is_deleted && m.body !== 'Pesan ini telah dihapus');

        if (msgs.length === 0) return;

        const allSelected = msgs.every(m => {
            const id = m.id ? String(m.id) : (m.client_uuid || '');
            return state.selectedMessageIds.has(id);
        });

        if (allSelected) {
            state.selectedMessageIds.clear();
        } else {
            msgs.forEach(m => {
                const id = m.id ? String(m.id) : (m.client_uuid || '');
                if (id) state.selectedMessageIds.add(id);
            });
        }

        updateSelectionUI();
        updateMessageRowSelectionDOM();
    };

    function updateSelectionUI() {
        const count = state.selectedMessageIds.size;
        const countBadge = document.getElementById('selectedMessagesCountBadge');
        if (countBadge) {
            countBadge.textContent = count;
        }

        const deleteBtn = document.getElementById('btnBulkDeleteMessages');
        if (deleteBtn) {
            deleteBtn.disabled = (count === 0);
            const labelSpan = deleteBtn.querySelector('span');
            if (labelSpan) {
                labelSpan.textContent = count > 0 ? `Hapus (${count})` : 'Hapus';
            }
        }

        if (state.activeContact) {
            const chatKey = state.activeContact.is_group ? ('group_' + state.activeContact.group_id) : state.activeContact.id;
            const msgs = (state.chats[chatKey] || []).filter(m => !m.is_deleted && m.body !== 'Pesan ini telah dihapus');
            const allSelected = msgs.length > 0 && msgs.every(m => {
                const id = m.id ? String(m.id) : (m.client_uuid || '');
                return state.selectedMessageIds.has(id);
            });

            const selectAllLabel = document.getElementById('btnSelectAllLabel');
            if (selectAllLabel) {
                selectAllLabel.textContent = allSelected ? 'Batal Pilih Semua' : 'Pilih Semua';
            }
        }
    }

    window.confirmBulkDeleteMessages = async function () {
        if (!state.activeContact) return;
        const selectedIds = Array.from(state.selectedMessageIds);
        if (selectedIds.length === 0) {
            showToast('Pilih setidaknya satu pesan untuk dihapus.', 'info');
            return;
        }

        const count = selectedIds.length;
        const confirmed = await showConfirmModal({
            title: `Hapus ${count} Pesan?`,
            message: `Hapus ${count} pesan yang dipilih untuk semua orang dalam obrolan? Tindakan ini tidak dapat dibatalkan.`,
            confirmText: `Hapus (${count})`,
            cancelText: 'Batal',
            type: 'danger',
            icon: 'trash'
        });
        if (!confirmed) return;

        const chatKey = state.activeContact.is_group ? ('group_' + state.activeContact.group_id) : state.activeContact.id;
        const msgs = state.chats[chatKey] || [];

        // Optimistic delete
        selectedIds.forEach(id => {
            const target = msgs.find(m => String(m.id) === String(id) || (m.client_uuid && String(m.client_uuid) === String(id)));
            if (target) {
                target.body = 'Pesan ini telah dihapus';
                target.is_deleted = true;
                target.attachment = null;
            }
        });

        persistMessages();
        window.exitSelectMessagesMode();
        renderChatsList();

        try {
            if (state.activeContact.is_group) {
                await apiRequest(`/groups/${state.activeContact.group_id}/messages/batch-delete`, {
                    method: 'POST',
                    body: JSON.stringify({ ids: selectedIds })
                });
            } else {
                await apiRequest('/messages/batch-delete', {
                    method: 'POST',
                    body: JSON.stringify({
                        ids: selectedIds,
                        receiver_id: state.activeContact.id
                    })
                });
            }
            showToast(`${count} pesan berhasil dihapus untuk semua orang.`, 'success');
        } catch (err) {
            console.error('Batch delete error:', err);
            showToast('Pesan telah dihapus lokal, namun gagal memperbarui server: ' + err.message, 'warning');
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

            const onGroupPollUpdated = (data) => {
                const poll = data.poll || data;
                if (poll && poll.id) {
                    state.polls[poll.id] = poll;
                    if (state.activeContact && state.activeContact.is_group && Number(state.activeContact.group_id) === Number(poll.group_id)) {
                        renderActiveMessages();
                    }
                }
            };
            channel.bind('group.poll.updated', onGroupPollUpdated);
            channel.bind('.group.poll.updated', onGroupPollUpdated);

            channel.bind('message.sent', async (data) => {
                const msg = data.message || data;
                await handleIncomingDirectMessage(msg);
            });

            const onMessageStatus = async (data) => {
                const msg = data.message || data;
                if (!msg || !msg.status) return;

                let hasChanges = false;
                for (const partnerId in state.chats) {
                    const list = state.chats[partnerId];
                    const found = list.find(m => (m.client_uuid && m.client_uuid === msg.client_uuid) || (m.id && m.id === (msg.id || msg.message_id)));
                    if (found) {
                        if (found.status !== msg.status && !(found.status === 'read' && msg.status === 'delivered')) {
                            found.status = msg.status;
                            hasChanges = true;
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
            };

            channel.bind('message.status', onMessageStatus);
            channel.bind('.message.status', onMessageStatus);
            channel.bind('message.status_updated', onMessageStatus);

            const onGroupMessageStatus = async (data) => {
                const info = data.message || data;
                if (!info || !info.status) return;

                const chatKey = info.group_id ? ('group_' + info.group_id) : null;
                let hasChanges = false;

                const targetChats = chatKey && state.chats[chatKey] ? [state.chats[chatKey]] : Object.values(state.chats);

                for (const list of targetChats) {
                    if (!Array.isArray(list)) continue;
                    const found = list.find(m => (m.client_uuid && m.client_uuid === info.client_uuid) || (m.id && m.id === (info.id || info.message_id)));
                    if (found) {
                        found.status = info.status;
                        if (info.read_count !== undefined) found.read_count = info.read_count;
                        if (info.delivered_count !== undefined) found.delivered_count = info.delivered_count;
                        if (info.target_count !== undefined) found.target_count = info.target_count;
                        hasChanges = true;
                    }
                }

                if (hasChanges) {
                    persistMessages();
                    if (state.activeContact) {
                        renderActiveMessages();
                    }
                    renderChatsList();
                }
            };

            channel.bind('group.message.status', onGroupMessageStatus);
            channel.bind('.group.message.status', onGroupMessageStatus);

            const onPinnedUpdated = (data) => {
                const info = data.message || data;
                if (!info) return;
                const chatKey = info.chat_type === 'group' ? ('group_' + info.target_id) : info.target_id;
                state.pinnedMessages[chatKey] = info.pinned_messages || [];
                if (state.activeContact && (state.activeContact.id === chatKey || String(state.activeContact.id) === String(info.target_id))) {
                    renderPinnedMessageBanner();
                    renderActiveMessages();
                }
            };
            channel.bind('message.pinned_updated', onPinnedUpdated);
            channel.bind('.message.pinned_updated', onPinnedUpdated);

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

            const onFriendRequest = async (data) => {
                const requester = data.requester || data;
                const reqName = requester.display_name || requester.username || 'Seseorang';
                const reqUser = requester.username ? ` (@${requester.username})` : '';
                playMessageChime();
                showToast(`Permintaan pertemanan baru dari ${reqName}${reqUser}!`, 'info');

                const railReqBadge = document.getElementById('railRequestsBadge');
                if (railReqBadge) {
                    railReqBadge.classList.add('pulse');
                    setTimeout(() => railReqBadge.classList.remove('pulse'), 4000);
                }
                await fetchRequests();
            };
            channel.bind('friend.request', onFriendRequest);
            channel.bind('.friend.request', onFriendRequest);

            const onFriendAccepted = async (data) => {
                const accepter = data.accepter || data;
                const name = accepter.display_name || accepter.username || 'Teman';
                playMessageChime();
                showToast(`${name} telah menerima permintaan pertemanan Anda!`, 'success');
                await fetchContacts();
            };
            channel.bind('friend.accepted', onFriendAccepted);
            channel.bind('.friend.accepted', onFriendAccepted);

            const onMessageReaction = async (data) => {
                if (!data || !data.message_id) return;
                const msgId = Number(data.message_id);
                const reactions = data.reactions || {};
                let found = false;
                for (const key in state.chats) {
                    const list = state.chats[key];
                    const m = list.find(item => Number(item.id) === msgId);
                    if (m) {
                        m.reactions = reactions;
                        found = true;
                        try { await AppDB.saveMessage(m, state.user.id); } catch (e) { }
                        break;
                    }
                }
                if (found) {
                    persistMessages();
                    if (state.activeContact) {
                        renderActiveMessages();
                    }
                }
            };
            channel.bind('message.reaction', onMessageReaction);
            channel.bind('.message.reaction', onMessageReaction);
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
                    acknowledgeGroupMessages(groupId, 'read', [msg.client_uuid]);
                }
            } else {
                if (Number(msg.sender_id) !== Number(state.user.id)) {
                    state.unread[chatKey] = (state.unread[chatKey] || 0) + 1;
                    playMessageChime();
                    acknowledgeGroupMessages(groupId, 'delivered', [msg.client_uuid]);
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
                                acknowledgeGroupMessages(m.group_id, 'read', [m.client_uuid]);
                            }
                        } else {
                            if (Number(m.sender_id) !== Number(state.user.id)) {
                                state.unread[chatKey] = (state.unread[chatKey] || 0) + 1;
                                playMessageChime();
                                acknowledgeGroupMessages(m.group_id, 'delivered', [m.client_uuid]);
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
        fetchChatPreferences();
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

            if (syncTick % 6 === 0) {
                fetchChatPreferences();
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

    async function getMediaStream(withVideo = false) {
        if (state.voice.localStream) {
            const hasVideo = state.voice.localStream.getVideoTracks().length > 0;
            if (withVideo && !hasVideo) {
                try {
                    const vidStream = await navigator.mediaDevices.getUserMedia({
                        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
                    });
                    const vidTrack = vidStream.getVideoTracks()[0];
                    state.voice.localStream.addTrack(vidTrack);
                    for (const pid in state.voice.peerConnections) {
                        const pc = state.voice.peerConnections[pid];
                        try { pc.addTrack(vidTrack, state.voice.localStream); } catch (e) { }
                    }
                } catch (err) {
                    console.warn('Gagal menambah track kamera:', err);
                }
            }
            return state.voice.localStream;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: withVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false
            });
            state.voice.localStream = stream;
            initVoiceActivityDetection(stream);
            return stream;
        } catch (err) {
            console.error('Gagal mengakses perangkat media:', err);
            showToast('Tidak dapat mengakses mikrofon atau kamera. Pastikan izin telah diberikan di browser.', 'error');
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

            if (state.voice.isVideo || event.track.kind === 'video') {
                const remoteVid = document.getElementById('remoteVideoElement');
                if (remoteVid) {
                    remoteVid.srcObject = remoteStream;
                    remoteVid.play().catch(e => console.warn('Remote video playback error:', e));
                }
            }
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

        if (!state.activeContact.is_group && state.blockedUserIds && state.blockedUserIds.has(Number(state.activeContact.id))) {
            showToast('Anda telah memblokir kontak ini. Buka blokir untuk melakukan panggilan.', 'error');
            return;
        }

        if (state.activeContact.is_group) {
            await window.joinGroupVoiceChannel(state.activeContact.group_id, state.activeContact.name);
        } else {
            await window.startDirectVoiceCall(state.activeContact.id, state.activeContact.display_name, false);
        }
    };

    window.handleStartVideoCall = async function () {
        if (!state.activeContact) {
            showToast('Pilih kontak atau grup terlebih dahulu.', 'info');
            return;
        }

        if (state.voice.active) {
            window.openVoiceStage();
            return;
        }

        if (!state.activeContact.is_group && state.blockedUserIds && state.blockedUserIds.has(Number(state.activeContact.id))) {
            showToast('Anda telah memblokir kontak ini. Buka blokir untuk melakukan panggilan.', 'error');
            return;
        }

        if (state.activeContact.is_group) {
            showToast('Panggilan video grup akan tersedia di versi berikutnya.', 'info');
            return;
        }

        await window.startDirectVoiceCall(state.activeContact.id, state.activeContact.display_name, true);
    };

    window.handleToggleCamera = function () {
        if (!state.voice.localStream) return;
        const vidTracks = state.voice.localStream.getVideoTracks();
        if (vidTracks.length === 0) return;
        const willEnable = !vidTracks[0].enabled;
        vidTracks.forEach(t => t.enabled = willEnable);
        state.voice.cameraOff = !willEnable;

        const btn = document.getElementById('btnStageToggleCamera');
        if (btn) {
            btn.classList.toggle('muted', !willEnable);
            btn.title = willEnable ? 'Matikan Kamera' : 'Nyalakan Kamera';
        }
        showToast(willEnable ? 'Kamera diaktifkan' : 'Kamera dimatikan', 'info');
    };

    window.startDirectVoiceCall = async function (targetId, targetName, isVideo = false) {
        state.voice.isVideo = Boolean(isVideo);
        state.voice.cameraOff = false;
        const stream = await getMediaStream(isVideo);
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
            titleEl.textContent = `${isVideo ? 'Panggilan Video' : 'Panggilan'}: ${targetName}`;
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
                offerToReceiveVideo: Boolean(isVideo)
            });
            await pc.setLocalDescription(offer);
            await sendVoiceSignal(targetId, 'call-offer', {
                type: offer.type,
                sdp: normalizeSdp(offer.sdp),
                call_uuid: callUuid,
                is_video: Boolean(isVideo)
            });
            playIncomingRingtone();
        } catch (err) {
            console.error('Error starting call:', err);
            showToast('Gagal memulai panggilan: ' + err.message, 'error');
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
        const isVideo = Boolean(incoming.is_video || (incoming.data && incoming.data.is_video));
        state.voice.isVideo = isVideo;

        const stream = await getMediaStream(isVideo);
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
                offerToReceiveVideo: isVideo
            });
            await pc.setLocalDescription(answer);

            await sendVoiceSignal(callerId, 'call-answer', {
                type: answer.type,
                sdp: normalizeSdp(answer.sdp),
                call_uuid: callUuid,
                is_video: isVideo
            });

            startCallDurationTimer();
            state.voice.incomingCall = null;
            showToast(`Terhubung dengan ${callerName}`, 'success');
        } catch (err) {
            console.error('Error accepting call:', err);
            showToast('Gagal menghubungkan panggilan: ' + err.message, 'error');
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

        if (state.voice.isScreenSharing && typeof window.stopScreenShare === 'function') {
            window.stopScreenShare();
        }
        const screenBtn = document.getElementById('btnStageToggleScreenShare');
        if (screenBtn) {
            screenBtn.style.display = 'none';
            screenBtn.classList.remove('active');
        }

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

        // 1. Terminate all local audio & video tracks
        if (state.voice.localStream) {
            state.voice.localStream.getTracks().forEach(track => {
                try { track.stop(); } catch (e) { }
            });
            state.voice.localStream = null;
        }

        // Clean up video elements and container
        const localVid = document.getElementById('localVideoElement');
        if (localVid) {
            try { localVid.pause(); } catch (e) { }
            localVid.srcObject = null;
        }
        const remoteVid = document.getElementById('remoteVideoElement');
        if (remoteVid) {
            try { remoteVid.pause(); } catch (e) { }
            remoteVid.srcObject = null;
        }
        const vidContainer = document.getElementById('videoCallContainer');
        if (vidContainer) vidContainer.style.display = 'none';
        const camBtn = document.getElementById('btnStageToggleCamera');
        if (camBtn) {
            camBtn.style.display = 'none';
            camBtn.classList.remove('muted');
        }
        state.voice.isVideo = false;
        state.voice.cameraOff = false;

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
            showToast('Panggilan selesai.', 'info');
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

            const vidContainer = document.getElementById('videoCallContainer');
            const camBtn = document.getElementById('btnStageToggleCamera');
            if (state.voice.isVideo) {
                if (vidContainer) vidContainer.style.display = 'flex';
                if (camBtn) camBtn.style.display = 'flex';
                if (state.voice.localStream) {
                    const localVid = document.getElementById('localVideoElement');
                    if (localVid) {
                        localVid.srcObject = state.voice.localStream;
                        localVid.play().catch(() => {});
                    }
                }
            } else {
                if (vidContainer) vidContainer.style.display = 'none';
                if (camBtn) camBtn.style.display = 'none';
            }

            const screenBtn = document.getElementById('btnStageToggleScreenShare');
            if (screenBtn) screenBtn.style.display = 'inline-flex';
        }
        hideVoiceDock();
    };

    window.toggleScreenShare = async function () {
        if (!state.voice.active) {
            showToast('Anda harus berada dalam panggilan untuk membagikan layar.', 'info');
            return;
        }

        if (state.voice.isScreenSharing) {
            window.stopScreenShare();
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            showToast('Peramban web Anda belum mendukung fitur berbagi layar.', 'error');
            return;
        }

        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'always' },
                audio: false
            });

            const screenTrack = screenStream.getVideoTracks()[0];
            if (!screenTrack) return;

            state.voice.screenStream = screenStream;
            state.voice.isScreenSharing = true;

            // Replace track di setiap peer connection
            for (const pid in state.voice.peerConnections) {
                const pc = state.voice.peerConnections[pid];
                const senders = pc.getSenders();
                const videoSender = senders.find(s => s.track && s.track.kind === 'video');
                if (videoSender) {
                    videoSender.replaceTrack(screenTrack);
                } else {
                    try { pc.addTrack(screenTrack, screenStream); } catch (e) { }
                }
            }

            // Tampilkan stream layar di video lokal / container jika ada
            const localVid = document.getElementById('localVideoElement');
            if (localVid) {
                localVid.srcObject = screenStream;
                localVid.play().catch(() => {});
            }

            const btn = document.getElementById('btnStageToggleScreenShare');
            if (btn) {
                btn.classList.add('active');
                btn.title = 'Hentikan Berbagi Layar';
            }

            screenTrack.onended = () => {
                window.stopScreenShare();
            };

            showToast('Berbagi layar diaktifkan', 'success');
        } catch (err) {
            if (err.name !== 'NotAllowedError') {
                console.error('Screen sharing error:', err);
                showToast('Gagal membagikan layar: ' + err.message, 'error');
            }
        }
    };

    window.stopScreenShare = function () {
        if (state.voice.screenStream) {
            state.voice.screenStream.getTracks().forEach(t => {
                try { t.stop(); } catch (e) { }
            });
            state.voice.screenStream = null;
        }
        state.voice.isScreenSharing = false;

        const camTrack = state.voice.localStream ? state.voice.localStream.getVideoTracks()[0] : null;
        for (const pid in state.voice.peerConnections) {
            const pc = state.voice.peerConnections[pid];
            const senders = pc.getSenders();
            const videoSender = senders.find(s => s.track && s.track.kind === 'video');
            if (videoSender) {
                if (camTrack) {
                    videoSender.replaceTrack(camTrack);
                } else {
                    try { pc.removeTrack(videoSender); } catch (e) { }
                }
            }
        }

        const localVid = document.getElementById('localVideoElement');
        if (localVid) {
            localVid.srcObject = camTrack ? state.voice.localStream : null;
            if (camTrack) localVid.play().catch(() => {});
        }

        const btn = document.getElementById('btnStageToggleScreenShare');
        if (btn) {
            btn.classList.remove('active');
            btn.title = 'Bagi Layar';
        }
        showToast('Berbagi layar dihentikan', 'info');
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

    // Aksesibilitas Keyboard: Escape, Navigasi Lightbox, dan Focus Trap
    document.addEventListener('keydown', (e) => {
        // Media Lightbox Gallery Keyboard Navigation & Controls
        const lightboxModal = document.getElementById('mediaLightboxModal');
        const isLightboxActive = lightboxModal && (lightboxModal.classList.contains('active') || lightboxModal.style.display === 'flex');

        if (isLightboxActive) {
            if (e.key === 'Escape') {
                e.preventDefault();
                window.closeMediaLightbox();
                return;
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                window.lightboxNext();
                return;
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                window.lightboxPrev();
                return;
            }
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                window.lightboxZoomIn();
                return;
            }
            if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                window.lightboxZoomOut();
                return;
            }
            if (e.key === '0') {
                e.preventDefault();
                window.lightboxResetZoom();
                return;
            }
        }

        if (e.key === 'Escape') {
            const confirmModal = document.getElementById('confirmModal');
            if (confirmModal && (confirmModal.classList.contains('active') || confirmModal.style.display === 'flex')) {
                window.closeConfirmModal(false);
                return;
            }

            if (state.isSelectionMode) {
                window.exitSelectMessagesMode();
                return;
            }

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

            window.closeGroupInfoModal();
            window.closeBlockedUsersModal();
            window.closeBackupRestoreModal();
            window.closeActiveSessionsModal();

            if (state.editingMessageId) {
                window.cancelEditMessage();
            }
        }

        // Ctrl+F / Cmd+F: Buka pencarian pesan di dalam percakapan aktif
        if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
            if (state.activeContact) {
                e.preventDefault();
                window.toggleInChatSearch(true);
                return;
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

        const mobDark = document.getElementById('mobileThemeIconDark');
        const mobLight = document.getElementById('mobileThemeIconLight');
        if (mobDark && mobLight) {
            if (theme === 'dark') {
                mobDark.style.display = 'block';
                mobLight.style.display = 'none';
            } else {
                mobDark.style.display = 'none';
                mobLight.style.display = 'block';
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
