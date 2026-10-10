<?php

namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Events\MessageStatusUpdated;
use App\Events\UserTyping;
use App\Jobs\SendPushNotification;
use App\Models\Message;
use App\Models\MessageReceipt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class MessageController extends Controller
{
    /**
     * Store a new message in ephemeral MySQL queue and broadcast
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'client_uuid' => 'required|uuid',
            'receiver_id' => 'required|exists:users,id',
            'body'        => 'required|string|max:4000',
        ]);

        $msg = Message::firstOrCreate(
            ['client_uuid' => $data['client_uuid']],
            [
                'sender_id'   => $request->user()->id,
                'receiver_id' => $data['receiver_id'],
                'body'        => $data['body'],
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
            ->get();

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
            'message_ids'   => 'required|array',
            'message_ids.*' => 'integer',
            'status'        => 'required|in:delivered,read',
        ]);

        $messages = Message::whereIn('id', $data['message_ids'])
            ->where('receiver_id', $request->user()->id)
            ->get();

        foreach ($messages as $msg) {
            // 1. Simpan receipt sementara untuk pengirim agar ceklis terupdate
            try {
                MessageReceipt::create([
                    'sender_id'   => $msg->sender_id,
                    'client_uuid' => $msg->client_uuid,
                    'message_id'  => $msg->id,
                    'status'      => $data['status'],
                ]);
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
            // Pesan sudah tersimpan aman di database lokal (IndexedDB/SQLite) perangkat penerima!
            $msg->delete();
        }

        return response()->json(['message' => 'Acknowledged and pruned from MySQL successfully']);
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

        $receiverId = $request->input('receiver_id');

        if ($msg) {
            if ($msg->is_deleted || $msg->body === 'Pesan ini telah dihapus') {
                return response()->json(['message' => 'Pesan yang sudah dihapus tidak dapat diedit'], 422);
            }

            $msg->body = $data['body'];
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
                        'body'        => $data['body'],
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
                'body'        => $data['body'],
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

        // Ambil ephemeral receipts untuk status pesan yang telah diterima lawan bicara
        $receipts = MessageReceipt::where('sender_id', $userId)->get();

        $results = [];
        if ($receipts->isNotEmpty()) {
            foreach ($receipts as $r) {
                $results[] = [
                    'id'          => $r->message_id,
                    'client_uuid' => $r->client_uuid,
                    'status'      => $r->status,
                ];
            }

            // Hapus receipts yang sudah diambil pengirim agar MySQL tetap bersih
            MessageReceipt::whereIn('id', $receipts->pluck('id'))->delete();
        }

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
