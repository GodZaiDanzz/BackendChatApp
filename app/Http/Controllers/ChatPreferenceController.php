<?php

namespace App\Http\Controllers;

use App\Models\ChatPreference;
use App\Models\GroupMessage;
use App\Models\Message;
use App\Models\StarredMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatPreferenceController extends Controller
{
    /**
     * Get user's pinned and muted chat preferences.
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $prefs = ChatPreference::where('user_id', $userId)->get();

        $pinnedDirect = $prefs->where('chat_type', 'direct')->where('is_pinned', true)->pluck('target_id')->values();
        $pinnedGroups = $prefs->where('chat_type', 'group')->where('is_pinned', true)->pluck('target_id')->values();

        $mutedDirect = $prefs->where('chat_type', 'direct')->where('is_muted', true)->pluck('target_id')->values();
        $mutedGroups = $prefs->where('chat_type', 'group')->where('is_muted', true)->pluck('target_id')->values();

        return response()->json([
            'pinned' => [
                'direct' => $pinnedDirect,
                'group'  => $pinnedGroups,
            ],
            'muted' => [
                'direct' => $mutedDirect,
                'group'  => $mutedGroups,
            ],
            'pinned_direct_ids' => $pinnedDirect,
            'pinned_group_ids'  => $pinnedGroups,
            'muted_direct_ids'  => $mutedDirect,
            'muted_group_ids'   => $mutedGroups,
        ]);
    }

    /**
     * Toggle pinned status for a direct contact or group.
     */
    public function togglePin(Request $request): JsonResponse
    {
        $chatType = $request->input('chat_type') ?: $request->input('target_type');
        $request->merge(['chat_type' => $chatType]);

        $data = $request->validate([
            'chat_type' => 'required|string|in:direct,group',
            'target_id' => 'required|integer',
        ]);

        $userId = $request->user()->id;
        $pref = ChatPreference::firstOrCreate(
            [
                'user_id'   => $userId,
                'chat_type' => $data['chat_type'],
                'target_id' => $data['target_id'],
            ]
        );

        $pref->is_pinned = !$pref->is_pinned;
        $pref->save();

        return response()->json([
            'chat_type'   => $pref->chat_type,
            'target_type' => $pref->chat_type,
            'target_id'   => $pref->target_id,
            'is_pinned'   => (bool) $pref->is_pinned,
            'message'     => $pref->is_pinned ? 'Obrolan berhasil disematkan ke atas.' : 'Sematkan obrolan dibatalkan.',
        ]);
    }

    /**
     * Toggle mute status for a direct contact or group.
     */
    public function toggleMute(Request $request): JsonResponse
    {
        $chatType = $request->input('chat_type') ?: $request->input('target_type');
        $request->merge(['chat_type' => $chatType]);

        $data = $request->validate([
            'chat_type' => 'required|string|in:direct,group',
            'target_id' => 'required|integer',
        ]);

        $userId = $request->user()->id;
        $pref = ChatPreference::firstOrCreate(
            [
                'user_id'   => $userId,
                'chat_type' => $data['chat_type'],
                'target_id' => $data['target_id'],
            ]
        );

        $pref->is_muted = !$pref->is_muted;
        $pref->save();

        return response()->json([
            'chat_type'   => $pref->chat_type,
            'target_type' => $pref->chat_type,
            'target_id'   => $pref->target_id,
            'is_muted'    => (bool) $pref->is_muted,
            'message'     => $pref->is_muted ? 'Notifikasi obrolan berhasil dibisukan.' : 'Notifikasi obrolan diaktifkan kembali.',
        ]);
    }

    /**
     * Get all starred messages for the user.
     */
    public function starred(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $starred = StarredMessage::where('user_id', $userId)
            ->latest()
            ->get();

        $items = [];
        foreach ($starred as $item) {
            $msgData = null;
            if ($item->message_type === 'direct') {
                $msg = Message::find($item->message_id);
                if ($msg) {
                    $msgData = [
                        'id'          => $msg->id,
                        'client_uuid' => $msg->client_uuid,
                        'sender_id'   => $msg->sender_id,
                        'receiver_id' => $msg->receiver_id,
                        'body'        => $msg->body,
                        'attachment'  => $msg->attachment,
                        'created_at'  => $msg->created_at?->toIso8601String(),
                    ];
                }
            } else {
                $gMsg = GroupMessage::with('sender:id,username,display_name')->find($item->message_id);
                if ($gMsg) {
                    $msgData = [
                        'id'          => $gMsg->id,
                        'group_id'    => $gMsg->group_id,
                        'client_uuid' => $gMsg->client_uuid,
                        'sender_id'   => $gMsg->sender_id,
                        'sender_name' => $gMsg->sender?->display_name ?: $gMsg->sender?->username,
                        'body'        => $gMsg->body,
                        'attachment'  => $gMsg->attachment,
                        'created_at'  => $gMsg->created_at?->toIso8601String(),
                    ];
                }
            }

            if ($msgData) {
                $items[] = [
                    'starred_id'   => $item->id,
                    'message_type' => $item->message_type,
                    'message_id'   => $item->message_id,
                    'starred_at'   => $item->created_at?->toIso8601String(),
                    'message'      => $msgData,
                ];
            }
        }

        return response()->json([
            'starred'          => $items,
            'starred_messages' => $items,
        ]);
    }

    /**
     * Toggle starred status on a message.
     */
    public function toggleStar(Request $request): JsonResponse
    {
        $data = $request->validate([
            'message_type' => 'required|string|in:direct,group',
            'message_id'   => 'required|integer',
        ]);

        $userId = $request->user()->id;
        $messageType = $data['message_type'];
        $messageId = (int) $data['message_id'];

        $existing = StarredMessage::where('user_id', $userId)
            ->where('message_type', $messageType)
            ->where('message_id', $messageId)
            ->first();

        if ($existing) {
            $existing->delete();
            $isStarred = false;
            $msg = 'Bintang pesan dihapus.';
        } else {
            StarredMessage::create([
                'user_id'      => $userId,
                'message_type' => $messageType,
                'message_id'   => $messageId,
            ]);
            $isStarred = true;
            $msg = 'Pesan berhasil dibintangi.';
        }

        return response()->json([
            'message_type' => $messageType,
            'message_id'   => $messageId,
            'is_starred'   => $isStarred,
            'message'      => $msg,
        ]);
    }
}
