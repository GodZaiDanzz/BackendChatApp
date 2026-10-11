<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VoiceSignalSent implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public User $sender,
        public int $recipientId,
        public string $signalType,
        public string $roomType,
        public ?int $groupId = null,
        public mixed $data = null
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('chat.' . $this->recipientId)];
    }

    public function broadcastAs(): string
    {
        return 'voice.signal';
    }

    public function broadcastWith(): array
    {
        return [
            'sender_id'     => $this->sender->id,
            'sender_name'   => $this->sender->display_name ?: $this->sender->username,
            'sender_avatar' => $this->sender->avatar,
            'target_id'     => $this->recipientId,
            'signal_type'   => $this->signalType,
            'room_type'     => $this->roomType,
            'group_id'      => $this->groupId,
            'data'          => $this->data,
        ];
    }
}
