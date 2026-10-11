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

        \Illuminate\Support\Facades\Log::info('VOICE_SIGNAL: from=' . $sender->id . ' (' . $sender->username . ') to=' . $targetId . ' type=' . $data['signal_type']);

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
