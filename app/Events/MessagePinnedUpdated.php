<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessagePinnedUpdated implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public string $chatType,
        public int $targetId,
        public string $conversationKey,
        public array $pinnedMessages,
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
        return 'message.pinned_updated';
    }

    public function broadcastWith(): array
    {
        return [
            'chat_type'        => $this->chatType,
            'target_id'        => $this->targetId,
            'conversation_key' => $this->conversationKey,
            'pinned_messages'  => $this->pinnedMessages,
        ];
    }
}
