<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FriendRequestSent implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(public User $requester, public int $receiverId) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('chat.' . $this->receiverId)];
    }

    public function broadcastAs(): string
    {
        return 'friend.request';
    }
}
