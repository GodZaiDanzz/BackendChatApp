<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageReactionUpdated implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public string $messageType,
        public int $messageId,
        public array $reactions,
        public array $recipientIds
    ) {}

    public function broadcastOn(): array
    {
        $channels = [];
        foreach ($this->recipientIds as $userId) {
            $channels[] = new PrivateChannel('chat.' . $userId);
        }
        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'message.reaction';
    }

    public function broadcastWith(): array
    {
        return [
            'message_type' => $this->messageType,
            'message_id'   => $this->messageId,
            'reactions'    => $this->reactions,
        ];
    }
}
