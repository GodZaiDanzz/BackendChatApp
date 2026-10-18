<?php

namespace App\Http\Controllers;

use App\Events\MessageReactionUpdated;
use App\Models\GroupMember;
use App\Models\GroupMessage;
use App\Models\Message;
use App\Models\MessageReaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ReactionController extends Controller
{
    /**
     * Toggle an emoji reaction on a message (direct or group).
     */
    public function toggle(Request $request): JsonResponse
    {
        $data = $request->validate([
            'message_type' => 'required|string|in:direct,group',
            'message_id'   => 'required|integer',
            'emoji'        => 'required|string|max:32',
        ]);

        $user = $request->user();
        $messageType = $data['message_type'];
        $messageId = (int) $data['message_id'];
        $emoji = trim($data['emoji']);

        // Check if reaction already exists
        $existing = MessageReaction::where('message_type', $messageType)
            ->where('message_id', $messageId)
            ->where('user_id', $user->id)
            ->where('emoji', $emoji)
            ->first();

        if ($existing) {
            $existing->delete();
        } else {
            MessageReaction::create([
                'message_type' => $messageType,
                'message_id'   => $messageId,
                'user_id'      => $user->id,
                'emoji'        => $emoji,
            ]);
        }

        // Aggregate current reactions for this message
        $aggregated = $this->aggregateReactions($messageType, $messageId);

        // Determine recipients for real-time broadcast
        $recipients = [];
        if ($messageType === 'direct') {
            $msg = Message::find($messageId);
            if ($msg) {
                $recipients = array_unique([$msg->sender_id, $msg->receiver_id]);
            } else {
                $recipients = [$user->id];
            }
        } else {
            $gMsg = GroupMessage::find($messageId);
            if ($gMsg) {
                $recipients = GroupMember::where('group_id', $gMsg->group_id)
                    ->pluck('user_id')
                    ->all();
            }
        }

        try {
            if (!empty($recipients)) {
                broadcast(new MessageReactionUpdated($messageType, $messageId, $aggregated, $recipients));
            }
        } catch (\Throwable $e) {
            Log::warning('Broadcast reaction failed: ' . $e->getMessage());
        }

        return response()->json([
            'message_type' => $messageType,
            'message_id'   => $messageId,
            'reactions'    => $aggregated,
        ]);
    }

    /**
     * Batch fetch reactions for multiple messages.
     */
    public function batch(Request $request): JsonResponse
    {
        $data = $request->validate([
            'message_type'  => 'required|string|in:direct,group',
            'message_ids'   => 'required|array',
            'message_ids.*' => 'integer',
        ]);

        $reactions = MessageReaction::where('message_type', $data['message_type'])
            ->whereIn('message_id', $data['message_ids'])
            ->with('user:id,username,display_name')
            ->get();

        $result = [];
        foreach ($reactions as $r) {
            $mId = $r->message_id;
            $em = $r->emoji;
            $name = $r->user?->display_name ?: $r->user?->username ?: 'Pengguna';

            if (!isset($result[$mId])) {
                $result[$mId] = [];
            }
            if (!isset($result[$mId][$em])) {
                $result[$mId][$em] = [];
            }
            $result[$mId][$em][] = $name;
        }

        return response()->json(['reactions' => $result]);
    }

    /**
     * Helper to aggregate reactions into { emoji: [username, ...] }
     */
    protected function aggregateReactions(string $messageType, int $messageId): array
    {
        $all = MessageReaction::where('message_type', $messageType)
            ->where('message_id', $messageId)
            ->with('user:id,username,display_name')
            ->get();

        $res = [];
        foreach ($all as $item) {
            $em = $item->emoji;
            $name = $item->user?->display_name ?: $item->user?->username ?: 'Pengguna';
            if (!isset($res[$em])) {
                $res[$em] = [];
            }
            $res[$em][] = $name;
        }

        return $res;
    }
}
