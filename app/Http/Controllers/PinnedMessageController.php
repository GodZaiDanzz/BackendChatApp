<?php

namespace App\Http\Controllers;

use App\Events\MessagePinnedUpdated;
use App\Models\GroupMember;
use App\Models\GroupMessage;
use App\Models\Message;
use App\Models\PinnedChatMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PinnedMessageController extends Controller
{
    /**
     * Get all pinned messages for a specific conversation.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'chat_type' => 'required|in:direct,group',
            'target_id' => 'required|numeric',
        ]);

        $user = $request->user();
        $chatType = $request->chat_type;
        $targetId = (int) $request->target_id;

        $convKey = PinnedChatMessage::computeConversationKey($chatType, $user->id, $targetId);

        $pinned = PinnedChatMessage::where('conversation_key', $convKey)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'chat_type'        => $chatType,
            'target_id'        => $targetId,
            'conversation_key' => $convKey,
            'pinned_messages'  => $pinned,
        ]);
    }

    /**
     * Toggle pin/unpin for a message in a conversation.
     */
    public function toggle(Request $request): JsonResponse
    {
        $request->validate([
            'chat_type'  => 'required|in:direct,group',
            'target_id'  => 'required|numeric',
            'message_id' => 'required|numeric',
        ]);

        $user = $request->user();
        $chatType = $request->chat_type;
        $targetId = (int) $request->target_id;
        $messageId = (int) $request->message_id;

        $convKey = PinnedChatMessage::computeConversationKey($chatType, $user->id, $targetId);

        // Fetch the message
        $msg = null;
        if ($chatType === 'direct') {
            $msg = Message::with('sender')->find($messageId);
        } else {
            $msg = GroupMessage::with('sender')->find($messageId);
        }

        if (!$msg) {
            return response()->json(['message' => 'Pesan tidak ditemukan.'], 404);
        }

        // Check if already pinned
        $existing = PinnedChatMessage::where('conversation_key', $convKey)
            ->where('message_id', $messageId)
            ->first();

        $isPinned = false;

        if ($existing) {
            $existing->delete();
            $isPinned = false;
        } else {
            $senderName = $msg->sender ? ($msg->sender->display_name ?: $msg->sender->username) : 'Pengguna';
            $snippet = $msg->body ? mb_substr($msg->body, 0, 140) : '';

            $hasAttachment = !empty($msg->attachment);
            $attachmentType = null;
            if ($hasAttachment && is_array($msg->attachment)) {
                $type = strtolower($msg->attachment['type'] ?? '');
                $name = strtolower($msg->attachment['name'] ?? '');
                if (str_starts_with($type, 'image/') || preg_match('/\.(jpeg|jpg|png|gif|webp|svg)$/i', $name)) {
                    $attachmentType = 'image';
                } elseif (str_starts_with($type, 'video/') || preg_match('/\.(mp4|webm|mov|mkv)$/i', $name)) {
                    $attachmentType = 'video';
                } elseif (str_starts_with($type, 'audio/') || preg_match('/\.(mp3|wav|ogg|webm|m4a)$/i', $name)) {
                    $attachmentType = 'audio';
                } else {
                    $attachmentType = 'file';
                }
            }

            PinnedChatMessage::create([
                'chat_type'        => $chatType,
                'conversation_key' => $convKey,
                'target_id'        => $targetId,
                'message_id'       => $messageId,
                'client_uuid'      => $msg->client_uuid,
                'pinned_by_id'     => $user->id,
                'sender_name'      => $senderName,
                'body_snippet'     => $snippet,
                'has_attachment'   => $hasAttachment,
                'attachment_type'  => $attachmentType,
            ]);

            $isPinned = true;
        }

        $allPinned = PinnedChatMessage::where('conversation_key', $convKey)
            ->orderByDesc('created_at')
            ->get();

        // Broadcast to participants
        $recipients = [];
        if ($chatType === 'direct') {
            $recipients = array_values(array_unique([$user->id, $targetId]));
        } else {
            $recipients = GroupMember::where('group_id', $targetId)
                ->pluck('user_id')
                ->all();
        }

        try {
            if (!empty($recipients)) {
                broadcast(new MessagePinnedUpdated(
                    $chatType,
                    $targetId,
                    $convKey,
                    $allPinned->toArray(),
                    $recipients
                ));
            }
        } catch (\Throwable $e) {
            Log::warning('Broadcast message.pinned_updated failed: ' . $e->getMessage());
        }

        return response()->json([
            'is_pinned'       => $isPinned,
            'message_id'      => $messageId,
            'chat_type'       => $chatType,
            'target_id'       => $targetId,
            'pinned_messages' => $allPinned,
        ]);
    }

    /**
     * Unpin a specific message or all pinned messages.
     */
    public function unpin(Request $request): JsonResponse
    {
        $request->validate([
            'chat_type'  => 'required|in:direct,group',
            'target_id'  => 'required|numeric',
            'message_id' => 'nullable|numeric',
        ]);

        $user = $request->user();
        $chatType = $request->chat_type;
        $targetId = (int) $request->target_id;
        $convKey = PinnedChatMessage::computeConversationKey($chatType, $user->id, $targetId);

        if ($request->filled('message_id')) {
            PinnedChatMessage::where('conversation_key', $convKey)
                ->where('message_id', (int) $request->message_id)
                ->delete();
        } else {
            PinnedChatMessage::where('conversation_key', $convKey)->delete();
        }

        $allPinned = PinnedChatMessage::where('conversation_key', $convKey)
            ->orderByDesc('created_at')
            ->get();

        $recipients = [];
        if ($chatType === 'direct') {
            $recipients = array_values(array_unique([$user->id, $targetId]));
        } else {
            $recipients = GroupMember::where('group_id', $targetId)
                ->pluck('user_id')
                ->all();
        }

        try {
            if (!empty($recipients)) {
                broadcast(new MessagePinnedUpdated(
                    $chatType,
                    $targetId,
                    $convKey,
                    $allPinned->toArray(),
                    $recipients
                ));
            }
        } catch (\Throwable $e) {
            Log::warning('Broadcast unpin failed: ' . $e->getMessage());
        }

        return response()->json([
            'status'          => 'success',
            'pinned_messages' => $allPinned,
        ]);
    }
}
