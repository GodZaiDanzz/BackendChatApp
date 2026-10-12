<?php

namespace App\Events;

use App\Models\Call;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CallEnded implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    /**
     * @param Call $call
     * @param int|array $recipientId
     * @param string $reason
     */
    public function __construct(
        public Call $call,
        public int|array $recipientId,
        public string $reason = 'ended'
    ) {}

    public function broadcastOn(): array
    {
        $recipients = is_array($this->recipientId) ? $this->recipientId : [$this->recipientId];

        return array_map(
            fn($id) => new PrivateChannel('user.' . $id),
            $recipients
        );
    }

    public function broadcastAs(): string
    {
        return '.call-ended';
    }

    public function broadcastWith(): array
    {
        return [
            'call_id' => $this->call->id,
            'reason'  => $this->reason,
        ];
    }
}
