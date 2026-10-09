<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class UserTyping implements ShouldBroadcastNow
{
    use Dispatchable;

    public function __construct(
        public int $sender_id,
        public int $receiver_id,
        public bool $is_typing = true
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('chat.' . $this->receiver_id)];
    }

    public function broadcastAs(): string
    {
        return 'user.typing';
    }

    public function broadcastWith(): array
    {
        return [
            'sender_id'   => $this->sender_id,
            'receiver_id' => $this->receiver_id,
            'is_typing'   => $this->is_typing,
        ];
    }
}
