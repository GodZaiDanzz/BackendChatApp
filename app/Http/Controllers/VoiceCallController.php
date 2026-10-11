<?php

namespace App\Http\Controllers;

use App\Events\VoiceSignalSent;
use App\Models\Group;
use App\Models\GroupMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class VoiceCallController extends Controller
{
    public function sendSignal(Request $request)
    {
        $data = $request->validate([
            'target_id'   => 'required|integer',
            'signal_type' => 'required|string|max:50',
            'room_type'   => 'required|string|in:direct,group',
            'group_id'    => 'nullable|integer',
            'data'        => 'nullable',
        ]);

        $sender = $request->user();
        $targetId = (int) $data['target_id'];

        // Normalize SDP line endings if present (ensure valid RFC-4566 CRLF terminating each line)
        if (isset($data['data']) && is_array($data['data']) && isset($data['data']['sdp']) && is_string($data['data']['sdp'])) {
            $rawSdp = $data['data']['sdp'];
            $lines = explode("\n", str_replace(["\r\n", "\r"], "\n", trim($rawSdp)));
            $cleanLines = array_filter(array_map('rtrim', $lines), fn($l) => strlen($l) > 0);
            $data['data']['sdp'] = implode("\r\n", $cleanLines) . "\r\n";
        }

        \Illuminate\Support\Facades\Log::info('VOICE_SIGNAL: from=' . $sender->id . ' (' . $sender->username . ') to=' . $targetId . ' type=' . $data['signal_type']);

        if ($data['signal_type'] === 'call-offer' && $data['room_type'] === 'direct') {
            Cache::put("incoming_call_direct_{$targetId}", [
                'sender_id'     => $sender->id,
                'sender_name'   => $sender->display_name ?: $sender->username,
                'sender_avatar' => $sender->avatar,
                'target_id'     => $targetId,
                'signal_type'   => 'call-offer',
                'room_type'     => 'direct',
                'group_id'      => null,
                'data'          => $data['data'] ?? null,
                'created_at'    => now()->timestamp
            ], 35);
        } elseif (in_array($data['signal_type'], ['call-answer', 'call-rejected', 'call-ended', 'call-busy'])) {
            Cache::forget("incoming_call_direct_{$targetId}");
            Cache::forget("incoming_call_direct_{$sender->id}");
        }

        broadcast(new VoiceSignalSent(
            sender: $sender,
            recipientId: $targetId,
            signalType: $data['signal_type'],
            roomType: $data['room_type'],
            groupId: $data['group_id'] ?? null,
            data: $data['data'] ?? null
        ));

        return response()->json(['status' => 'sent']);
    }

    public function getActiveCall(Request $request)
    {
        $userId = $request->user()->id;
        $call = Cache::get("incoming_call_direct_{$userId}");
        if ($call) {
            if (now()->timestamp - ($call['created_at'] ?? 0) > 30) {
                Cache::forget("incoming_call_direct_{$userId}");
                return response()->json(['has_call' => false]);
            }
            return response()->json(['has_call' => true, 'call' => $call]);
        }
        return response()->json(['has_call' => false]);
    }

    public function joinGroupVoice(Request $request, $id)
    {
        $userId = $request->user()->id;
        $isMember = GroupMember::where('group_id', $id)->where('user_id', $userId)->exists();
        if (!$isMember) {
            return response()->json(['message' => 'Anda bukan anggota grup ini'], 403);
        }

        $cacheKey = "group_voice_{$id}";
        $participants = Cache::get($cacheKey, []);

        $now = now()->timestamp;
        $active = [];
        foreach ($participants as $p) {
            // Drop inactive participants older than 30 minutes
            if (($now - ($p['joined_at'] ?? 0)) < 1800 && (int) $p['id'] !== (int) $userId) {
                $active[] = $p;
            }
        }

        $existingList = $active;

        $userRecord = [
            'id'          => $userId,
            'name'        => $request->user()->display_name ?: $request->user()->username,
            'avatar'      => $request->user()->avatar,
            'joined_at'   => $now,
            'is_muted'    => false,
        ];
        $active[] = $userRecord;

        Cache::put($cacheKey, $active, now()->addHours(2));

        foreach ($existingList as $other) {
            broadcast(new VoiceSignalSent(
                sender: $request->user(),
                recipientId: (int) $other['id'],
                signalType: 'room-join',
                roomType: 'group',
                groupId: (int) $id,
                data: $userRecord
            ));
        }

        return response()->json([
            'group_id'     => (int) $id,
            'participants' => $existingList,
        ]);
    }

    public function leaveGroupVoice(Request $request, $id)
    {
        $userId = $request->user()->id;
        $cacheKey = "group_voice_{$id}";
        $participants = Cache::get($cacheKey, []);

        $remaining = [];
        foreach ($participants as $p) {
            if ((int) $p['id'] !== (int) $userId) {
                $remaining[] = $p;
            }
        }

        Cache::put($cacheKey, $remaining, now()->addHours(2));

        foreach ($remaining as $other) {
            broadcast(new VoiceSignalSent(
                sender: $request->user(),
                recipientId: (int) $other['id'],
                signalType: 'room-leave',
                roomType: 'group',
                groupId: (int) $id,
                data: ['user_id' => $userId]
            ));
        }

        return response()->json(['status' => 'left']);
    }

    public function getGroupVoiceStatus(Request $request, $id)
    {
        $cacheKey = "group_voice_{$id}";
        $participants = Cache::get($cacheKey, []);
        $now = now()->timestamp;

        $active = array_values(array_filter($participants, fn($p) => ($now - ($p['joined_at'] ?? 0)) < 1800));

        return response()->json([
            'group_id'     => (int) $id,
            'count'        => count($active),
            'participants' => $active,
        ]);
    }
}
