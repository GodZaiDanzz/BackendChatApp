<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(public Message $message) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('chat.' . $this->message->sender_id)];
    }

    public function broadcastAs(): string
    {
        return 'message.status';
    }

    public function broadcastWith(): array
    {
        return [
            'id'          => $this->message->id,
            'message_id'  => $this->message->id,
            'client_uuid' => $this->message->client_uuid,
            'status'      => $this->message->status,
            'sender_id'   => $this->message->sender_id,
            'receiver_id' => $this->message->receiver_id,
            'message'     => [
                'id'          => $this->message->id,
                'message_id'  => $this->message->id,
                'client_uuid' => $this->message->client_uuid,
                'status'      => $this->message->status,
                'sender_id'   => $this->message->sender_id,
                'receiver_id' => $this->message->receiver_id,
            ],
        ];
    }
}
