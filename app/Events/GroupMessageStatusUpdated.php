<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class GroupMessageStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public int $groupId,
        public int $senderId,
        public string $clientUuid,
        public ?int $messageId,
        public string $status, // 'delivered' or 'read'
        public int $readCount = 0,
        public int $deliveredCount = 0,
        public int $targetCount = 0
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('chat.' . $this->senderId)];
    }

    public function broadcastAs(): string
    {
        return 'group.message.status';
    }

    public function broadcastWith(): array
    {
        return [
            'group_id'        => $this->groupId,
            'client_uuid'     => $this->clientUuid,
            'message_id'      => $this->messageId,
            'id'              => $this->messageId,
            'status'          => $this->status,
            'read_count'      => $this->readCount,
            'delivered_count' => $this->deliveredCount,
            'target_count'    => $this->targetCount,
        ];
    }
}
