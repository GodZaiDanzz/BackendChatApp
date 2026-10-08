<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FriendRequestAccepted implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(public User $accepter, public int $requesterId) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('chat.' . $this->requesterId)];
    }

    public function broadcastAs(): string
    {
        return 'friend.accepted';
    }
}
