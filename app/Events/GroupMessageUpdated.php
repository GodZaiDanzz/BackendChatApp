<?php

namespace App\Events;

use App\Models\GroupMessage;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class GroupMessageUpdated implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    protected array $recipientIds;

    public function __construct(public GroupMessage $message, array $recipientIds = [])
    {
        $this->recipientIds = $recipientIds;
    }

    public function broadcastOn(): array
    {
        return array_map(
            fn($uid) => new PrivateChannel('chat.' . $uid),
            $this->recipientIds
        );
    }

    public function broadcastAs(): string
    {
        return 'group.message.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'id'          => $this->message->id,
            'client_uuid' => $this->message->client_uuid,
            'group_id'    => $this->message->group_id,
            'sender_id'   => $this->message->sender_id,
            'body'        => $this->message->body,
            'is_edited'   => (bool) $this->message->is_edited,
            'is_deleted'  => (bool) $this->message->is_deleted,
        ];
    }
}
