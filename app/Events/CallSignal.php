<?php

namespace App\Events;

use App\Models\Call;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CallSignal implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Call $call,
        public int $recipientId,
        public int $senderId,
        public string $type,
        public mixed $payload
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->recipientId),
        ];
    }

    public function broadcastAs(): string
    {
        return '.call-signal';
    }

    public function broadcastWith(): array
    {
        return [
            'call_id'   => $this->call->id,
            'sender_id' => $this->senderId,
            'type'      => $this->type,
            'payload'   => $this->payload,
        ];
    }
}
