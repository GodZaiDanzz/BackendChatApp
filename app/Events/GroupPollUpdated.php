<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class GroupPollUpdated implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public int $groupId,
        public array $pollData,
        protected array $recipientIds = []
    ) {}

    public function broadcastOn(): array
    {
        return array_map(
            fn($uid) => new PrivateChannel('chat.' . $uid),
            $this->recipientIds
        );
    }

    public function broadcastAs(): string
    {
        return 'group.poll.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'group_id'  => $this->groupId,
            'poll'      => $this->pollData,
        ];
    }
}
