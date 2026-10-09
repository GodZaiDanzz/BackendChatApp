<?php

namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Events\MessageStatusUpdated;
use App\Jobs\SendPushNotification;
use App\Models\Message;
use Illuminate\Http\Request;

class MessageController extends Controller
{
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
                \Illuminate\Support\Facades\Log::warning('WebSocket broadcast failed (MessageSent): ' . $e->getMessage());
            }

            try {
                SendPushNotification::dispatch($msg);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Push notification queue failed: ' . $e->getMessage());
            }
        }

        return response()->json($msg, 201);
    }

    public function pending(Request $request)
    {
        $messages = Message::where('receiver_id', $request->user()->id)
            ->where('status', 'sent')
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($messages);
    }

    public function ack(Request $request)
    {
        $data = $request->validate([
            'message_ids'   => 'required|array',
            'message_ids.*' => 'integer|exists:messages,id',
            'status'        => 'required|in:delivered,read',
        ]);

        $messages = Message::whereIn('id', $data['message_ids'])
            ->where('receiver_id', $request->user()->id)
            ->get();

        foreach ($messages as $msg) {
            $msg->update(['status' => $data['status']]);
            try {
                broadcast(new MessageStatusUpdated($msg));
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('WebSocket broadcast failed (MessageStatusUpdated): ' . $e->getMessage());
            }
        }

        return response()->json(['message' => 'Acknowledged successfully']);
    }

    public function update(Request $request, $id)
    {
        $data = $request->validate([
            'body' => 'required|string|max:4000',
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

        if (!$msg) {
            return response()->json(['message' => 'Pesan tidak ditemukan atau bukan milik Anda'], 404);
        }

        if ($msg->is_deleted || $msg->body === 'Pesan ini telah dihapus') {
            return response()->json(['message' => 'Pesan yang sudah dihapus tidak dapat diedit'], 422);
        }

        $msg->body = $data['body'];
        if (\Illuminate\Support\Facades\Schema::hasColumn('messages', 'is_edited')) {
            $msg->is_edited = true;
        }
        $msg->save();

        try {
            broadcast(new MessageSent($msg));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('WebSocket broadcast failed (MessageEdit): ' . $e->getMessage());
        }

        return response()->json($msg);
    }

    public function destroy(Request $request, $id)
    {
        $msg = Message::where('sender_id', $request->user()->id)
            ->where(function ($q) use ($id) {
                if (is_numeric($id)) {
                    $q->where('id', (int) $id)->orWhere('client_uuid', $id);
                } else {
                    $q->where('client_uuid', $id);
                }
            })
            ->first();

        if (!$msg) {
            return response()->json(['message' => 'Pesan tidak ditemukan atau bukan milik Anda'], 404);
        }

        $msg->body = 'Pesan ini telah dihapus';
        if (\Illuminate\Support\Facades\Schema::hasColumn('messages', 'is_deleted')) {
            $msg->is_deleted = true;
        }
        $msg->save();

        try {
            broadcast(new MessageSent($msg));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('WebSocket broadcast failed (MessageDelete): ' . $e->getMessage());
        }

        return response()->json([
            'message'     => 'Pesan berhasil dihapus',
            'id'          => $msg->id,
            'client_uuid' => $msg->client_uuid,
            'body'        => $msg->body,
        ]);
    }

    public function statuses(Request $request)
    {
        $userId = $request->user()->id;

        $columns = ['id', 'client_uuid', 'sender_id', 'receiver_id', 'body', 'status', 'updated_at'];
        if (\Illuminate\Support\Facades\Schema::hasColumn('messages', 'is_edited')) {
            $columns[] = 'is_edited';
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('messages', 'is_deleted')) {
            $columns[] = 'is_deleted';
        }

        // Ambil pembaruan pesan yang melibatkan pengguna (sebagai sender maupun receiver)
        $messages = Message::where(function ($q) use ($userId) {
                $q->where('sender_id', $userId)
                  ->orWhere('receiver_id', $userId);
            })
            ->where('updated_at', '>=', now()->subDays(3))
            ->get($columns);

        return response()->json($messages);
    }
}
