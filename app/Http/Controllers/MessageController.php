<?php

namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Events\MessageStatusUpdated;
use App\Events\UserTyping;
use App\Jobs\SendPushNotification;
use App\Models\Message;
use App\Models\MessageReceipt;
use App\Services\ChatEncryption;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class MessageController extends Controller
{
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:25600',
        ]);

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $ext = strtolower($file->getClientOriginalExtension());
        $mime = $file->getMimeType() ?: 'application/octet-stream';
        $size = $file->getSize();

        $filename = time() . '_' . Str::random(12) . ($ext ? '.' . $ext : '');
        $uploadDir = public_path('uploads/chat');
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $file->move($uploadDir, $filename);

        return response()->json([
            'url'  => '/uploads/chat/' . $filename,
            'name' => $originalName,
            'size' => $size,
            'type' => $mime,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'client_uuid' => 'required|string|max:64',
            'receiver_id' => 'required|exists:users,id',
            'body'        => 'nullable|string|max:4000',
            'attachment'  => 'nullable|array',
            'reply_to'    => 'nullable|array',
        ]);

        $senderId = $request->user()->id;
        $receiverId = (int) $data['receiver_id'];

        $body = $data['body'] ?? '';
        if (trim($body) === '' && !empty($data['attachment']['name'])) {
            $body = '[Berkas: ' . $data['attachment']['name'] . ']';
        }

        if (!ChatEncryption::isEncrypted($body)) {
            $body = ChatEncryption::encrypt($body, $senderId, $receiverId);
        }

        $msg = Message::firstOrCreate(
            ['client_uuid' => $data['client_uuid']],
            [
                'sender_id'   => $senderId,
                'receiver_id' => $receiverId,
                'body'        => $body,
                'attachment'  => $data['attachment'] ?? null,
                'reply_to'    => $data['reply_to'] ?? null,
                'status'      => 'sent',
            ]
        );

        if ($msg->wasRecentlyCreated) {
            try {
                broadcast(new MessageSent($msg));
            } catch (\Throwable $e) {
                Log::warning('WebSocket broadcast failed (MessageSent): ' . $e->getMessage());
            }

            try {
                SendPushNotification::dispatch($msg);
            } catch (\Throwable $e) {
                Log::warning('Push notification queue failed: ' . $e->getMessage());
            }
        }

        return response()->json($msg, 201);
    }

    /**
     * Get pending messages for recipient from ephemeral MySQL queue
     */
    public function pending(Request $request)
    {
        $messages = Message::where('receiver_id', $request->user()->id)
            ->where('status', 'sent')
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($msg) {
                if (!ChatEncryption::isEncrypted($msg->body) && !$msg->is_deleted) {
                    $msg->body = ChatEncryption::encrypt($msg->body, $msg->sender_id, $msg->receiver_id);
                }
                $msg->plain_body = ChatEncryption::decrypt($msg->body, $msg->sender_id, $msg->receiver_id);
                return $msg;
            });

        return response()->json($messages);
    }

    /**
     * Acknowledge receipt of messages:
     * - Records temporary status receipt for sender (so checkmark turns delivered/read)
     * - Broadcasts status update via WebSocket
     * - PURGES the message from MySQL so MySQL does not store permanent chat history
     */
    public function ack(Request $request)
    {
        $data = $request->validate([
            'message_ids'   => 'nullable|array',
            'message_ids.*' => 'integer',
            'client_uuids'  => 'nullable|array',
            'sender_id'     => 'nullable|integer',
            'status'        => 'required|in:delivered,read',
        ]);

        $userId = $request->user()->id;

        if (!empty($data['message_ids'])) {
            $messages = Message::whereIn('id', $data['message_ids'])
                ->where('receiver_id', $userId)
                ->get();

            foreach ($messages as $msg) {
                // 1. Simpan receipt sementara untuk pengirim agar ceklis terupdate (updateOrCreate jika status naik)
                try {
                    MessageReceipt::updateOrCreate(
                        [
                            'sender_id'   => $msg->sender_id,
                            'client_uuid' => $msg->client_uuid,
                        ],
                        [
                            'message_id'  => $msg->id,
                            'status'      => $data['status'],
                        ]
                    );
                } catch (\Throwable $e) {
                    Log::warning('Failed saving message receipt: ' . $e->getMessage());
                }

                // 2. Broadcast status update secara real-time ke pengirim
                $msg->status = $data['status'];
                try {
                    broadcast(new MessageStatusUpdated($msg));
                } catch (\Throwable $e) {
                    Log::warning('WebSocket broadcast failed (MessageStatusUpdated): ' . $e->getMessage());
                }

                // 3. Hapus pesan dari MySQL (Store-and-Forward Ephemeral Architecture)
                $msg->delete();
            }
        }

        // Jika penerima menandai status dengan client_uuids dan sender_id (delivered atau read)
        if (!empty($data['client_uuids']) && !empty($data['sender_id'])) {
            foreach ($data['client_uuids'] as $uuid) {
                try {
                    MessageReceipt::updateOrCreate(
                        ['sender_id' => (int)$data['sender_id'], 'client_uuid' => $uuid],
                        ['status' => $data['status']]
                    );
                } catch (\Throwable $e) {}

                try {
                    $dummy = new Message([
                        'sender_id'   => (int)$data['sender_id'],
                        'receiver_id' => $userId,
                        'client_uuid' => $uuid,
                        'status'      => $data['status'],
                    ]);
                    broadcast(new MessageStatusUpdated($dummy));
                } catch (\Throwable $e) {}
            }
        }

        return response()->json(['message' => 'Acknowledged successfully']);
    }

    /**
     * Update message content (Edit)
     */
    public function update(Request $request, $id)
    {
        $data = $request->validate([
            'body'        => 'required|string|max:4000',
            'receiver_id' => 'nullable|exists:users,id',
            'client_uuid' => 'nullable|string',
        ]);

        $msg = Message::where('sender_id', $request->user()->id)
            ->where(function ($q) use ($id) {
                if (is_numeric($id)) {
                    $q->where('id', (int) $id)->orWhere('client_uuid', $id);
                } else {
                    $q->where('client_uuid', $id);
                }
            })
            ->first();

        $targetReceiverId = $msg ? (int) $msg->receiver_id : (int) $receiverId;
        $updatedBody = $data['body'];
        if ($targetReceiverId && !ChatEncryption::isEncrypted($updatedBody)) {
            $updatedBody = ChatEncryption::encrypt($updatedBody, $request->user()->id, $targetReceiverId);
        }

        if ($msg) {
            if ($msg->is_deleted || $msg->body === 'Pesan ini telah dihapus') {
                return response()->json(['message' => 'Pesan yang sudah dihapus tidak dapat diedit'], 422);
            }

            $msg->body = $updatedBody;
            if (Schema::hasColumn('messages', 'is_edited')) {
                $msg->is_edited = true;
            }
            $msg->save();

            try {
                broadcast(new MessageSent($msg));
            } catch (\Throwable $e) {
                Log::warning('WebSocket broadcast failed (MessageEdit): ' . $e->getMessage());
            }

            return response()->json($msg);
        } else {
            // Jika pesan di MySQL sudah dihapus karena telah terkirim sebelumnya,
            // buat ephemeral action message jika penerima sedang offline, atau broadcast langsung
            $clientUuid = $request->input('client_uuid') ?: (!is_numeric($id) ? $id : null);

            if ($receiverId && $clientUuid) {
                $safeUuid = (is_string($clientUuid) && strlen($clientUuid) <= 36)
                    ? $clientUuid
                    : Str::uuid()->toString();

                $actionMsg = Message::updateOrCreate(
                    ['client_uuid' => $safeUuid],
                    [
                        'sender_id'   => $request->user()->id,
                        'receiver_id' => $receiverId,
                        'body'        => $updatedBody,
                        'status'      => 'sent',
                        'is_edited'   => true,
                    ]
                );

                try {
                    broadcast(new MessageSent($actionMsg));
                } catch (\Throwable $e) {}
            }

            return response()->json([
                'client_uuid' => $clientUuid,
                'body'        => $updatedBody,
                'is_edited'   => true,
            ]);
        }
    }

    /**
     * Destroy message content (Delete for everyone)
     */
    public function destroy(Request $request, $id)
    {
        $clientUuid = $request->input('client_uuid') ?: (!is_numeric($id) ? $id : null);
        $receiverId = $request->input('receiver_id');

        $msg = Message::where('sender_id', $request->user()->id)
            ->where(function ($q) use ($id, $clientUuid) {
                if (is_numeric($id)) {
                    $q->where('id', (int) $id);
                } else {
                    $q->where('client_uuid', $id);
                }
                if ($clientUuid) {
                    $q->orWhere('client_uuid', $clientUuid);
                }
            })
            ->first();

        if ($msg) {
            $msg->body = 'Pesan ini telah dihapus';
            if (Schema::hasColumn('messages', 'is_deleted')) {
                $msg->is_deleted = true;
            }
            $msg->save();

            try {
                broadcast(new MessageSent($msg));
            } catch (\Throwable $e) {
                Log::warning('WebSocket broadcast failed (MessageDelete): ' . $e->getMessage());
            }

            return response()->json([
                'message'     => 'Pesan berhasil dihapus',
                'id'          => $msg->id,
                'client_uuid' => $msg->client_uuid,
                'body'        => $msg->body,
                'is_deleted'  => true,
            ]);
        } else {
            if ($receiverId && $clientUuid) {
                $safeUuid = (is_string($clientUuid) && strlen($clientUuid) <= 36)
                    ? $clientUuid
                    : Str::uuid()->toString();

                $actionMsg = Message::updateOrCreate(
                    ['client_uuid' => $safeUuid],
                    [
                        'sender_id'   => $request->user()->id,
                        'receiver_id' => $receiverId,
                        'body'        => 'Pesan ini telah dihapus',
                        'status'      => 'sent',
                        'is_deleted'  => true,
                    ]
                );

                try {
                    broadcast(new MessageSent($actionMsg));
                } catch (\Throwable $e) {}
            }

            return response()->json([
                'message'     => 'Pesan berhasil dihapus',
                'client_uuid' => $clientUuid,
                'body'        => 'Pesan ini telah dihapus',
                'is_deleted'  => true,
            ]);
        }
    }

    /**
     * Sync delivery/read statuses for sender and purge delivered status receipts
     */
    public function statuses(Request $request)
    {
        $userId = $request->user()->id;

        // Ambil ephemeral receipts untuk status pesan yang telah diterima lawan bicara (dalam 5 menit terakhir)
        $receipts = MessageReceipt::where('sender_id', $userId)
            ->where('created_at', '>=', now()->subMinutes(5))
            ->get();

        $results = [];
        if ($receipts->isNotEmpty()) {
            foreach ($receipts as $r) {
                $results[] = [
                    'id'          => $r->message_id,
                    'message_id'  => $r->message_id,
                    'client_uuid' => $r->client_uuid,
                    'status'      => $r->status,
                ];
            }
        }

        // Hapus receipts yang sudah kedaluwarsa (> 5 menit) agar tabel tetap bersih
        try {
            MessageReceipt::where('created_at', '<', now()->subMinutes(5))->delete();
        } catch (\Throwable $e) {}

        // Cek juga jika ada antrean pesan di tabel messages yang statusnya berubah
        $columns = ['id', 'client_uuid', 'sender_id', 'receiver_id', 'body', 'status', 'updated_at'];
        if (Schema::hasColumn('messages', 'is_edited')) {
            $columns[] = 'is_edited';
        }
        if (Schema::hasColumn('messages', 'is_deleted')) {
            $columns[] = 'is_deleted';
        }

        $pendingUpdates = Message::where('sender_id', $userId)
            ->where('status', '!=', 'sent')
            ->get($columns);

        foreach ($pendingUpdates as $p) {
            $results[] = $p;
        }

        return response()->json($results);
    }

    /**
     * Broadcast user typing indicator and record in fast cache
     */
    public function typing(Request $request)
    {
        $data = $request->validate([
            'receiver_id' => 'required|exists:users,id',
            'is_typing'   => 'nullable|boolean',
        ]);

        $senderId = $request->user()->id;
        $receiverId = (int) $data['receiver_id'];
        $isTyping = $request->boolean('is_typing', true);

        $cacheKey = "typing:{$senderId}:to:{$receiverId}";
        if ($isTyping) {
            Cache::put($cacheKey, true, now()->addSeconds(4));
        } else {
            Cache::forget($cacheKey);
        }

        try {
            broadcast(new UserTyping($senderId, $receiverId, $isTyping));
        } catch (\Throwable $e) {
            Log::warning('Typing broadcast failed: ' . $e->getMessage());
        }

        return response()->json(['status' => 'ok', 'is_typing' => $isTyping]);
    }

    /**
     * Check if a contact is typing to the current user (fast polling fallback)
     */
    public function typingStatus(Request $request)
    {
        $receiverId = $request->user()->id;
        $contactId = $request->query('contact_id');

        if ($contactId) {
            $isTyping = (bool) Cache::get("typing:{$contactId}:to:{$receiverId}", false);
            return response()->json([
                'contact_id' => (int) $contactId,
                'is_typing'  => $isTyping,
            ]);
        }

        return response()->json(['is_typing' => false]);
    }
}
