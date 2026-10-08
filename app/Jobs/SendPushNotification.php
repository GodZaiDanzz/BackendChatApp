<?php

namespace App\Jobs;

use App\Models\Device;
use App\Models\Message;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Kreait\Laravel\Firebase\Facades\Firebase;
use Kreait\Firebase\Messaging\CloudMessage;

class SendPushNotification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Message $message) {}

    public function handle(): void
    {
        $tokens = Device::where('user_id', $this->message->receiver_id)->pluck('fcm_token');

        foreach ($tokens as $token) {
            try {
                Firebase::messaging()->send(
                    CloudMessage::withTarget('token', $token)->withData(['type' => 'new_message'])
                );
            } catch (\Throwable $e) {
                // Ignore invalid or expired token errors gracefully
            }
        }
    }
}
