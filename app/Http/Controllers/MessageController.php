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
            broadcast(new MessageSent($msg));
            SendPushNotification::dispatch($msg);
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
            broadcast(new MessageStatusUpdated($msg));
        }

        return response()->json(['message' => 'Acknowledged successfully']);
    }
}
