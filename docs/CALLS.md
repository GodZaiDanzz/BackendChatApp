# Dokumentasi Fitur Panggilan Suara & Video 1-on-1 (WebRTC Signaling)

Sistem panggilan suara dan video 1-on-1 pada ZChat dibangun menggunakan arsitektur **WebRTC Peer-to-Peer** dengan Laravel sebagai server **Signaling** dan pencatat riwayat (Call History). Seluruh aliran data media (audio/video) ditransmisikan langsung antar-perangkat (P2P), dibantu oleh STUN/TURN server saat salah satu atau kedua peer berada di belakang NAT/Firewall.

---

## 1. Daftar Endpoint API (REST)

Seluruh endpoint panggilan berada di bawah middleware `auth:sanctum`. Gunakan header:
```http
Authorization: Bearer <SANCTUM_TOKEN>
Accept: application/json
Content-Type: application/json
```

---

### 1.1 GET `/api/calls/ice-servers`
Mengembalikan daftar ICE servers (STUN server publik Google + TURN server self-hosted Coturn). Kredensial TURN di-generate secara dinamis dan bersifat sementara (time-limited, berlaku 1 jam).

- **Method**: `GET`
- **Response `200 OK`**:
```json
{
  "ice_servers": [
    {
      "urls": "stun:stun.l.google.com:19302"
    },
    {
      "urls": "turn:turn.example.com:3478",
      "username": "1773489600:15",
      "credential": "V41sM...HMAC_SHA1_BASE64..."
    }
  ],
  "iceServers": [
    {
      "urls": "stun:stun.l.google.com:19302"
    },
    {
      "urls": "turn:turn.example.com:3478",
      "username": "1773489600:15",
      "credential": "V41sM...HMAC_SHA1_BASE64..."
    }
  ]
}
```

---

### 1.2 POST `/api/calls`
Memulai panggilan baru ke user target (`callee_id`).
Jika callee sedang berada dalam panggilan aktif (`status = ringing` atau `accepted`), panggilan ditolak dengan status `busy` (HTTP 409).
Jika pengguna menelepon dirinya sendiri, ditolak dengan HTTP 422.

- **Method**: `POST`
- **Request Body**:
```json
{
  "callee_id": 2,
  "type": "audio"
}
```
*(Catatan: `type` bernilai `'audio'` atau `'video'`, default `'audio'`)*

- **Response `201 Created`**:
```json
{
  "message": "Call initiated successfully.",
  "call": {
    "id": 101,
    "caller_id": 1,
    "callee_id": 2,
    "type": "audio",
    "status": "ringing",
    "started_at": "2026-10-12T05:40:00.000000Z",
    "answered_at": null,
    "ended_at": null,
    "created_at": "2026-10-12T05:40:00.000000Z",
    "updated_at": "2026-10-12T05:40:00.000000Z",
    "caller": {
      "id": 1,
      "username": "alice",
      "display_name": "Alice Wonderland",
      "avatar": "https://api.example.com/uploads/avatars/alice.jpg"
    },
    "callee": {
      "id": 2,
      "username": "bob",
      "display_name": "Bob Builder",
      "avatar": null
    }
  }
}
```

- **Response `409 Conflict` (Callee Sibuk)**:
```json
{
  "message": "Callee is currently busy on another call.",
  "call": {
    "id": 102,
    "caller_id": 1,
    "callee_id": 2,
    "status": "busy"
  }
}
```

- **Response `422 Unprocessable Content` (Menelepon diri sendiri)**:
```json
{
  "message": "Cannot call yourself.",
  "errors": {
    "callee_id": [
      "You cannot start a call with yourself."
    ]
  }
}
```

---

### 1.3 POST `/api/calls/{call}/accept`
Menerima panggilan yang sedang berdering (`status = ringing`). Hanya dapat dipanggil oleh **callee**.

- **Method**: `POST`
- **Response `200 OK`**:
```json
{
  "message": "Call accepted successfully.",
  "call": {
    "id": 101,
    "caller_id": 1,
    "callee_id": 2,
    "type": "audio",
    "status": "accepted",
    "started_at": "2026-10-12T05:40:00.000000Z",
    "answered_at": "2026-10-12T05:40:05.000000Z",
    "ended_at": null
  }
}
```

---

### 1.4 POST `/api/calls/{call}/reject`
Menolak panggilan yang sedang berdering. Hanya dapat dipanggil oleh **callee**.

- **Method**: `POST`
- **Response `200 OK`**:
```json
{
  "message": "Call rejected successfully.",
  "call": {
    "id": 101,
    "caller_id": 1,
    "callee_id": 2,
    "status": "rejected",
    "ended_at": "2026-10-12T05:40:07.000000Z"
  }
}
```

---

### 1.5 POST `/api/calls/{call}/end`
Mengakhiri panggilan (baik saat berdering maupun saat sedang berbicara). Dapat dipanggil oleh **caller** atau **callee**.

- **Method**: `POST`
- **Response `200 OK`**:
```json
{
  "message": "Call ended successfully.",
  "call": {
    "id": 101,
    "caller_id": 1,
    "callee_id": 2,
    "status": "ended",
    "ended_at": "2026-10-12T05:45:00.000000Z"
  }
}
```

---

### 1.6 POST `/api/calls/{call}/signal`
Meneruskan sinyal WebRTC (SDP Offer, SDP Answer, atau ICE Candidate) ke lawan bicara melalui WebSocket (broadcast).

- **Method**: `POST`
- **Request Body (Contoh Offer / Answer)**:
```json
{
  "type": "offer",
  "payload": {
    "sdp": "v=0\r\no=- 461173... IN IP4 127.0.0.1...",
    "type": "offer"
  }
}
```

- **Request Body (Contoh ICE Candidate)**:
```json
{
  "type": "ice-candidate",
  "payload": {
    "candidate": "candidate:842163049 1 udp 1677729535 192.168.1.100 54321 typ srflx...",
    "sdpMid": "0",
    "sdpMLineIndex": 0
  }
}
```

- **Response `200 OK`**:
```json
{
  "success": true
}
```

---

### 1.7 GET `/api/calls`
Mengambil riwayat panggilan milik pengguna yang sedang login (paginasi).

- **Method**: `GET`
- **Query Params**: `?page=1&per_page=20`
- **Response `200 OK`**:
```json
{
  "current_page": 1,
  "data": [
    {
      "id": 101,
      "caller_id": 1,
      "callee_id": 2,
      "type": "audio",
      "status": "ended",
      "started_at": "2026-10-12T05:40:00.000000Z",
      "answered_at": "2026-10-12T05:40:05.000000Z",
      "ended_at": "2026-10-12T05:45:00.000000Z",
      "caller": {
        "id": 1,
        "username": "alice",
        "display_name": "Alice Wonderland",
        "avatar": "https://api.example.com/uploads/avatars/alice.jpg"
      },
      "callee": {
        "id": 2,
        "username": "bob",
        "display_name": "Bob Builder",
        "avatar": null
      }
    }
  ],
  "total": 1
}
```

---

### 1.8 POST `/api/device-token`
Mendaftarkan FCM Token milik perangkat untuk menerima notifikasi panggilan masuk saat aplikasi berjalan di background atau layar terkunci.

- **Method**: `POST`
- **Request Body**:
```json
{
  "fcm_token": "fXyZ_token_dari_firebase_messaging..."
}
```
- **Response `200 OK`**:
```json
{
  "message": "Device token updated successfully.",
  "fcm_token": "fXyZ_token_dari_firebase_messaging..."
}
```

---

## 2. WebSocket Broadcasting Events

- **Broadcaster**: Reverb / BeyondCode Laravel WebSockets (Pusher Protocol)
- **Channel**: `private-user.{userId}` (pada Laravel Echo di-subscribe sebagai `private-user.${userId}`)

### 2.1 Event `.incoming-call`
Dikirim ke `private-user.{callee_id}` saat panggilan dibuat.
```json
{
  "call_id": 101,
  "caller": {
    "id": 1,
    "name": "Alice Wonderland",
    "avatar": "https://api.example.com/uploads/avatars/alice.jpg"
  },
  "type": "audio",
  "payload": null
}
```

### 2.2 Event `.call-accepted`
Dikirim ke `private-user.{caller_id}` saat callee menerima panggilan.
```json
{
  "call_id": 101,
  "callee": {
    "id": 2,
    "name": "Bob Builder",
    "avatar": null
  },
  "type": "audio"
}
```

### 2.3 Event `.call-rejected`
Dikirim ke `private-user.{caller_id}` saat callee menolak panggilan.
```json
{
  "call_id": 101,
  "reason": "rejected"
}
```

### 2.4 Event `.call-ended`
Dikirim ke lawan bicara saat salah satu pihak mengakhiri panggilan atau panggilan tidak terjawab (`missed`).
```json
{
  "call_id": 101,
  "reason": "ended"
}
```

### 2.5 Event `.call-signal`
Membawa data signaling WebRTC (offer, answer, candidate) langsung ke peer lawan bicara.
```json
{
  "call_id": 101,
  "sender_id": 1,
  "type": "offer",
  "payload": {
    "sdp": "...",
    "type": "offer"
  }
}
```

---

## 3. Push Notification FCM HTTP v1

Saat `POST /api/calls` dieksekusi, backend mengirimkan **data-only message** berprioritas tinggi (`priority: HIGH`) melalui Google FCM HTTP v1 API.

Payload message yang dikirimkan:
```json
{
  "message": {
    "token": "<FCM_DEVICE_TOKEN>",
    "data": {
      "type": "incoming_call",
      "call_id": "101",
      "caller_name": "Alice Wonderland",
      "call_type": "audio"
    },
    "android": {
      "priority": "HIGH"
    }
  }
}
```
*Penting: Data-only message memungkinkan aplikasi Android/iOS membangunkan Native Call Screen (ConnectionService / CallKit / VoIP notification) langsung tanpa terhalang notifikasi banner biasa.*

---

## 4. Housekeeping & Scheduled Task

Untuk mencegah panggilan berdering tanpa henti jika callee tidak merespons, dibuat artisan command:
```bash
php artisan calls:check-missed
```
Command ini mencari semua panggilan dengan status `ringing` yang telah berlangsung lebih dari 45 detik, mengubah statusnya menjadi `missed`, dan mem-broadcast event `.call-ended` (reason: `missed`) ke kedua belah pihak agar UI panggilan otomatis tertutup.

Command ini telah didaftarkan pada scheduler setiap menit (`everyMinute()`).

---

## 5. Konfigurasi Coturn TURN Server (Time-Limited Credentials)

Coturn dipasang pada VPS Ubuntu untuk menyediakan relay koneksi audio/video jika peer tidak bisa terhubung secara direct P2P.

### Edit Konfigurasi: `/etc/turnserver.conf`

Pastikan file `/etc/turnserver.conf` berisi opsi berikut:

```conf
# Port dasar STUN/TURN
listening-port=3478
tls-listening-port=5349

# IP address server (ganti dengan IP publik VPS Anda)
listening-ip=0.0.0.0
external-ip=43.106.152.199

# MODE TIME-LIMITED CREDENTIALS (Wajib)
use-auth-secret
static-auth-secret=your_coturn_static_auth_secret_here
realm=turn.ismc.my.id

# HAPUS / JANGAN GUNAKAN baris berikut:
# lt-cred-mech
# user=username:password

# Port rentang UDP untuk relay media
min-port=49152
max-port=65535

# Fingerprint & logging
fingerprint
verbose
log-file=/var/log/turnserver/turnserver.log
simple-log
```

### Langkah Menjalankan Coturn:
1. Pastikan coturn diaktifkan pada `/etc/default/coturn`:
   ```bash
   TURNSERVER_ENABLED=1
   ```
2. Buka port firewall di VPS:
   ```bash
   ufw allow 3478/tcp
   ufw allow 3478/udp
   ufw allow 5349/tcp
   ufw allow 5349/udp
   ufw allow 49152:65535/udp
   ```
3. Restart layanan coturn:
   ```bash
   systemctl restart coturn
   systemctl enable coturn
   systemctl status coturn
   ```

### Konfigurasi `.env` Laravel:
Tambahkan nilai rahasia dan URL yang sama pada `.env` aplikasi Laravel:
```env
TURN_URL=turn:turn.ismc.my.id:3478
TURN_SECRET=your_coturn_static_auth_secret_here
FCM_PROJECT_ID=zchat-project-id
FCM_CREDENTIALS_PATH=/var/www/chat-api/storage/app/firebase.json
```
