<?php

namespace App\Events;

use App\Models\Call;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CallAccepted implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Call $call
    ) {
        $this->call->loadMissing(['caller', 'callee']);
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->call->caller_id),
        ];
    }

    public function broadcastAs(): string
    {
        return '.call-accepted';
    }

    public function broadcastWith(): array
    {
        $callee = $this->call->callee;

        return [
            'call_id' => $this->call->id,
            'callee'  => [
                'id'     => $callee->id,
                'name'   => $callee->display_name ?: $callee->username,
                'avatar' => $callee->avatar,
            ],
            'type'    => $this->call->type,
        ];
    }
}
