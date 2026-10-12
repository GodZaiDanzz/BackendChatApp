<?php

namespace App\Events;

use App\Models\Call;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CallRejected implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Call $call,
        public string $reason = 'rejected'
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->call->caller_id),
        ];
    }

    public function broadcastAs(): string
    {
        return '.call-rejected';
    }

    public function broadcastWith(): array
    {
        return [
            'call_id' => $this->call->id,
            'reason'  => $this->reason,
        ];
    }
}
