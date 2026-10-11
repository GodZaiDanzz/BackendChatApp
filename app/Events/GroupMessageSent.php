<?php

namespace App\Events;

use App\Models\GroupMessage;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class GroupMessageSent implements ShouldBroadcastNow
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
        return 'group.message.sent';
    }

    public function broadcastWith(): array
    {
        $sender = $this->message->sender;
        return [
            'id'          => $this->message->id,
            'client_uuid' => $this->message->client_uuid,
            'group_id'    => $this->message->group_id,
            'sender_id'   => $this->message->sender_id,
            'sender_name' => $sender ? ($sender->display_name ?: $sender->username) : 'Pengguna',
            'body'        => $this->message->body,
            'attachment'  => $this->message->attachment,
            'reply_to'    => $this->message->reply_to,
            'is_edited'   => (bool) $this->message->is_edited,
            'is_deleted'  => (bool) $this->message->is_deleted,
            'created_at'  => $this->message->created_at?->toIso8601String(),
        ];
    }
}
