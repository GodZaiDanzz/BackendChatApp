<?php

namespace App\Events;

use App\Models\Call;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class IncomingCall implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Call $call,
        public mixed $payload = null
    ) {
        $this->call->loadMissing(['caller', 'callee']);
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->call->callee_id),
        ];
    }

    public function broadcastAs(): string
    {
        return '.incoming-call';
    }

    public function broadcastWith(): array
    {
        $caller = $this->call->caller;

        return [
            'call_id' => $this->call->id,
            'caller'  => [
                'id'     => $caller->id,
                'name'   => $caller->display_name ?: $caller->username,
                'avatar' => $caller->avatar,
            ],
            'type'    => $this->call->type,
            'payload' => $this->payload,
        ];
    }
}
