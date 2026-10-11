<?php

namespace App\Http\Controllers;

use App\Events\VoiceSignalSent;
use App\Models\CallLog;
use App\Models\Group;
use App\Models\GroupMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

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
        $signalType = $data['signal_type'];
        $roomType = $data['room_type'];

        // Normalize SDP line endings if present (ensure valid RFC-4566 CRLF terminating each line)
        if (isset($data['data']) && is_array($data['data']) && isset($data['data']['sdp']) && is_string($data['data']['sdp'])) {
            $rawSdp = $data['data']['sdp'];
            $lines = explode("\n", str_replace(["\r\n", "\r"], "\n", trim($rawSdp)));
            $cleanLines = array_filter(array_map('rtrim', $lines), fn($l) => strlen($l) > 0);
            $data['data']['sdp'] = implode("\r\n", $cleanLines) . "\r\n";
        }

        \Illuminate\Support\Facades\Log::info('VOICE_SIGNAL: from=' . $sender->id . ' (' . $sender->username . ') to=' . $targetId . ' type=' . $signalType);

        $pairKey = min($sender->id, $targetId) . '_' . max($sender->id, $targetId);

        // Extract or generate Call UUID
        $callUuid = null;
        if (!empty($request->input('call_uuid'))) {
            $callUuid = (string) $request->input('call_uuid');
        } elseif (isset($data['data']) && is_array($data['data']) && !empty($data['data']['call_uuid'])) {
            $callUuid = (string) $data['data']['call_uuid'];
        }

        if ($signalType === 'call-offer' && $roomType === 'direct') {
            if (!$callUuid) {
                $callUuid = 'call_' . Str::random(16);
                if (is_array($data['data'])) {
                    $data['data']['call_uuid'] = $callUuid;
                } else {
                    $data['data'] = ['call_uuid' => $callUuid];
                }
            }

            // Create initial CallLog record (status: missed until answered/rejected)
            try {
                CallLog::create([
                    'call_uuid'        => $callUuid,
                    'caller_id'        => $sender->id,
                    'receiver_id'      => $targetId,
                    'room_type'        => 'direct',
                    'status'           => 'missed',
                    'duration'         => 0,
                    'started_at'       => now(),
                ]);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('CallLog create error: ' . $e->getMessage());
            }

            Cache::put("active_call_pair_{$pairKey}", [
                'call_uuid'  => $callUuid,
                'caller_id'  => $sender->id,
                'target_id'  => $targetId,
                'status'     => 'calling',
                'started_at' => now()->timestamp,
            ], 3600);

            Cache::put("incoming_call_direct_{$targetId}", [
                'sender_id'     => $sender->id,
                'sender_name'   => $sender->display_name ?: $sender->username,
                'sender_avatar' => null,
                'target_id'     => $targetId,
                'signal_type'   => 'call-offer',
                'room_type'     => 'direct',
                'group_id'      => null,
                'call_uuid'     => $callUuid,
                'data'          => $data['data'] ?? null,
                'created_at'    => now()->timestamp
            ], 35);
        } elseif ($signalType === 'call-answer' && $roomType === 'direct') {
            $activePair = Cache::get("active_call_pair_{$pairKey}");
            $callUuid = $callUuid ?: ($activePair['call_uuid'] ?? null);

            try {
                $callLog = $callUuid ? CallLog::where('call_uuid', $callUuid)->first() : null;
                if (!$callLog) {
                    $callLog = CallLog::where('caller_id', $targetId)
                        ->where('receiver_id', $sender->id)
                        ->latest()
                        ->first();
                }

                if ($callLog) {
                    $callLog->update([
                        'status'     => 'answered',
                        'started_at' => now(),
                    ]);
                    $callUuid = $callLog->call_uuid;
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('CallLog answer update error: ' . $e->getMessage());
            }

            Cache::put("active_call_pair_{$pairKey}", [
                'call_uuid'  => $callUuid,
                'caller_id'  => $targetId,
                'target_id'  => $sender->id,
                'status'     => 'answered',
                'started_at' => now()->timestamp,
            ], 7200);

            Cache::forget("incoming_call_direct_{$sender->id}");
            Cache::put("call_answer_direct_{$targetId}", [
                'sender_id'     => $sender->id,
                'sender_name'   => $sender->display_name ?: $sender->username,
                'sender_avatar' => $sender->avatar,
                'target_id'     => $targetId,
                'signal_type'   => 'call-answer',
                'room_type'     => 'direct',
                'group_id'      => null,
                'call_uuid'     => $callUuid,
                'data'          => $data['data'] ?? null,
                'created_at'    => now()->timestamp
            ], 30);
        } elseif ($signalType === 'call-rejected' && $roomType === 'direct') {
            $activePair = Cache::get("active_call_pair_{$pairKey}");
            $callUuid = $callUuid ?: ($activePair['call_uuid'] ?? null);

            if ($callUuid) {
                try {
                    CallLog::where('call_uuid', $callUuid)->update([
                        'status'            => 'rejected',
                        'ended_at'          => now(),
                        'ended_by_user_id'  => $sender->id,
                        'duration'          => 0,
                    ]);
                } catch (\Exception $e) { }
            }

            Cache::forget("active_call_pair_{$pairKey}");
            Cache::forget("incoming_call_direct_{$targetId}");
            Cache::forget("incoming_call_direct_{$sender->id}");
            Cache::forget("call_answer_direct_{$targetId}");
            Cache::forget("call_answer_direct_{$sender->id}");
            Cache::put("call_ended_direct_{$targetId}", ['call_uuid' => $callUuid, 'reason' => 'rejected', 'ended_by' => $sender->id], 15);
        } elseif ($signalType === 'call-busy' && $roomType === 'direct') {
            $activePair = Cache::get("active_call_pair_{$pairKey}");
            $callUuid = $callUuid ?: ($activePair['call_uuid'] ?? null);

            if ($callUuid) {
                try {
                    CallLog::where('call_uuid', $callUuid)->update([
                        'status'            => 'busy',
                        'ended_at'          => now(),
                        'ended_by_user_id'  => $sender->id,
                        'duration'          => 0,
                    ]);
                } catch (\Exception $e) { }
            }

            Cache::forget("active_call_pair_{$pairKey}");
            Cache::forget("incoming_call_direct_{$targetId}");
            Cache::forget("incoming_call_direct_{$sender->id}");
            Cache::forget("call_answer_direct_{$targetId}");
            Cache::forget("call_answer_direct_{$sender->id}");
            Cache::put("call_ended_direct_{$targetId}", ['call_uuid' => $callUuid, 'reason' => 'busy', 'ended_by' => $sender->id], 15);
        } elseif ($signalType === 'call-ended' && $roomType === 'direct') {
            $activePair = Cache::get("active_call_pair_{$pairKey}");
            $callUuid = $callUuid ?: ($activePair['call_uuid'] ?? null);
            $clientDuration = (isset($data['data']) && is_array($data['data']) && isset($data['data']['duration']))
                ? (int) $data['data']['duration']
                : null;

            try {
                $callLog = $callUuid ? CallLog::where('call_uuid', $callUuid)->first() : null;
                if (!$callLog) {
                    $callLog = CallLog::where(function($q) use ($sender, $targetId) {
                        $q->where('caller_id', $sender->id)->where('receiver_id', $targetId);
                    })->orWhere(function($q) use ($sender, $targetId) {
                        $q->where('caller_id', $targetId)->where('receiver_id', $sender->id);
                    })->latest()->first();
                }

                if ($callLog && !$callLog->ended_at) {
                    $duration = $clientDuration !== null
                        ? $clientDuration
                        : ($callLog->status === 'answered' ? max(0, now()->diffInSeconds($callLog->started_at ?? now())) : 0);

                    $callLog->update([
                        'ended_at'          => now(),
                        'ended_by_user_id'  => $sender->id,
                        'duration'          => $duration,
                    ]);
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('CallLog end update error: ' . $e->getMessage());
            }

            Cache::forget("active_call_pair_{$pairKey}");
            Cache::forget("incoming_call_direct_{$targetId}");
            Cache::forget("incoming_call_direct_{$sender->id}");
            Cache::forget("call_answer_direct_{$targetId}");
            Cache::forget("call_answer_direct_{$sender->id}");
            Cache::put("call_ended_direct_{$targetId}", ['call_uuid' => $callUuid, 'reason' => 'ended', 'ended_by' => $sender->id], 15);
        }

        broadcast(new VoiceSignalSent(
            sender: $sender,
            recipientId: $targetId,
            signalType: $signalType,
            roomType: $roomType,
            groupId: $data['group_id'] ?? null,
            data: $data['data'] ?? null
        ));

        return response()->json(['status' => 'sent', 'call_uuid' => $callUuid]);
    }

    public function getActiveCall(Request $request)
    {
        $userId = $request->user()->id;

        // 1. Check if user is being called (incoming offer)
        $call = Cache::get("incoming_call_direct_{$userId}");
        if ($call) {
            if (now()->timestamp - ($call['created_at'] ?? 0) > 30) {
                Cache::forget("incoming_call_direct_{$userId}");
            } else {
                return response()->json(['has_call' => true, 'call' => $call]);
            }
        }

        // 2. Check if an outgoing call by this user was answered
        $answer = Cache::get("call_answer_direct_{$userId}");
        if ($answer) {
            if (now()->timestamp - ($answer['created_at'] ?? 0) > 25) {
                Cache::forget("call_answer_direct_{$userId}");
            } else {
                return response()->json(['has_call' => true, 'call' => $answer]);
            }
        }

        // 3. Check if active direct call was ended by peer
        $ended = Cache::get("call_ended_direct_{$userId}");
        if ($ended) {
            Cache::forget("call_ended_direct_{$userId}");
            return response()->json(['has_call' => false, 'call_ended' => true, 'ended' => $ended]);
        }

        return response()->json(['has_call' => false]);
    }

    public function getCallLogs(Request $request)
    {
        $userId = $request->user()->id;
        $logs = CallLog::with([
                'caller:id,username,display_name',
                'receiver:id,username,display_name',
                'endedBy:id,username,display_name'
            ])
            ->where(function ($q) use ($userId) {
                $q->where('caller_id', $userId)
                  ->orWhere('receiver_id', $userId);
            })
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        $data = $logs->map(function ($log) use ($userId) {
            $isCaller = (int) $log->caller_id === (int) $userId;
            $otherUser = $isCaller ? $log->receiver : $log->caller;

            $statusLabel = match($log->status) {
                'answered' => 'Terjawab',
                'rejected' => 'Ditolak',
                'missed'   => $isCaller ? 'Tidak Terjawab' : 'Panggilan Tak Terjawab',
                'busy'     => 'Sedang Sibuk',
                default    => 'Selesai'
            };

            $endedByName = null;
            if ($log->endedBy) {
                $endedByName = ((int) $log->ended_by_user_id === (int) $userId)
                    ? 'Anda'
                    : ($log->endedBy->display_name ?: $log->endedBy->username);
            }

            $mins = floor($log->duration / 60);
            $secs = $log->duration % 60;
            $formattedDuration = sprintf('%02d:%02d', $mins, $secs);

            return [
                'id'                 => $log->id,
                'call_uuid'          => $log->call_uuid,
                'direction'          => $isCaller ? 'outgoing' : 'incoming',
                'room_type'          => $log->room_type,
                'other_user'         => $otherUser ? [
                    'id'           => $otherUser->id,
                    'username'     => $otherUser->username,
                    'display_name' => $otherUser->display_name ?: $otherUser->username,
                    'avatar'       => null,
                ] : null,
                'caller'             => $log->caller ? [
                    'id'           => $log->caller->id,
                    'name'         => $log->caller->display_name ?: $log->caller->username,
                    'avatar'       => null,
                ] : null,
                'receiver'           => $log->receiver ? [
                    'id'           => $log->receiver->id,
                    'name'         => $log->receiver->display_name ?: $log->receiver->username,
                    'avatar'       => null,
                ] : null,
                'status'             => $log->status,
                'status_label'       => $statusLabel,
                'duration'           => $log->duration,
                'duration_formatted' => $formattedDuration,
                'started_at'         => $log->started_at?->toIso8601String(),
                'ended_at'           => $log->ended_at?->toIso8601String(),
                'ended_by_name'      => $endedByName,
                'created_at_human'   => $log->created_at ? $log->created_at->diffForHumans() : '',
                'created_at_time'    => $log->created_at ? $log->created_at->format('H:i') : '',
                'created_at_date'    => $log->created_at ? $log->created_at->format('d M Y') : '',
            ];
        });

        return response()->json(['call_logs' => $data]);
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
