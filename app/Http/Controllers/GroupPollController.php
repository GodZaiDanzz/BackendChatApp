<?php

namespace App\Http\Controllers;

use App\Events\GroupMessageSent;
use App\Events\GroupPollUpdated;
use App\Models\Group;
use App\Models\GroupMember;
use App\Models\GroupMessage;
use App\Models\GroupPoll;
use App\Models\GroupPollOption;
use App\Models\GroupPollVote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class GroupPollController extends Controller
{
    public function index(Request $request, $groupId)
    {
        $userId = $request->user()->id;
        $isMember = GroupMember::where('group_id', $groupId)->where('user_id', $userId)->exists();
        if (!$isMember) {
            return response()->json(['message' => 'Anda bukan anggota grup ini'], 403);
        }

        $polls = GroupPoll::where('group_id', $groupId)
            ->with(['creator:id,username,display_name,avatar', 'options.votes.user:id,username,display_name,avatar'])
            ->latest()
            ->get()
            ->map(fn($p) => $this->formatPoll($p, $userId));

        return response()->json($polls);
    }

    public function show(Request $request, $groupId, $pollId)
    {
        $userId = $request->user()->id;
        $isMember = GroupMember::where('group_id', $groupId)->where('user_id', $userId)->exists();
        if (!$isMember) {
            return response()->json(['message' => 'Anda bukan anggota grup ini'], 403);
        }

        $poll = GroupPoll::where('group_id', $groupId)
            ->where('id', $pollId)
            ->with(['creator:id,username,display_name,avatar', 'options.votes.user:id,username,display_name,avatar'])
            ->firstOrFail();

        return response()->json($this->formatPoll($poll, $userId));
    }

    public function store(Request $request, $groupId)
    {
        $user = $request->user();
        $isMember = GroupMember::where('group_id', $groupId)->where('user_id', $user->id)->exists();
        if (!$isMember) {
            return response()->json(['message' => 'Anda bukan anggota grup ini'], 403);
        }

        $data = $request->validate([
            'question'         => 'required|string|max:255',
            'options'          => 'required|array|min:2|max:8',
            'options.*'        => 'required|string|max:200',
            'multiple_answers' => 'nullable|boolean',
        ]);

        $poll = DB::transaction(function () use ($data, $user, $groupId) {
            $p = GroupPoll::create([
                'group_id'         => $groupId,
                'created_by'       => $user->id,
                'question'         => trim($data['question']),
                'multiple_answers' => !empty($data['multiple_answers']),
                'is_closed'        => false,
            ]);

            foreach ($data['options'] as $optText) {
                if (trim($optText) !== '') {
                    GroupPollOption::create([
                        'poll_id'     => $p->id,
                        'option_text' => trim($optText),
                    ]);
                }
            }

            // Create notification message in group feed
            $msg = GroupMessage::create([
                'client_uuid' => Str::uuid()->toString(),
                'group_id'    => $groupId,
                'sender_id'   => $user->id,
                'body'        => "📊 Polling: " . trim($data['question']),
                'attachment'  => [
                    'type'             => 'poll',
                    'poll_id'          => $p->id,
                    'question'         => trim($data['question']),
                    'multiple_answers' => !empty($data['multiple_answers']),
                ],
            ]);

            return [$p, $msg];
        });

        [$createdPoll, $message] = $poll;

        $createdPoll->load(['creator:id,username,display_name,avatar', 'options.votes.user:id,username,display_name,avatar']);
        $formatted = $this->formatPoll($createdPoll, $user->id);

        // Broadcast to group members
        $memberIds = GroupMember::where('group_id', $groupId)
            ->where('user_id', '!=', $user->id)
            ->pluck('user_id')
            ->toArray();

        if (!empty($memberIds)) {
            broadcast(new GroupMessageSent($message, $memberIds))->toOthers();
            broadcast(new GroupPollUpdated((int) $groupId, $formatted, $memberIds))->toOthers();
        }

        return response()->json([
            'message' => 'Polling berhasil dibuat',
            'poll'    => $formatted,
            'feed_message' => $message,
        ], 201);
    }

    public function vote(Request $request, $groupId, $pollId)
    {
        $user = $request->user();
        $isMember = GroupMember::where('group_id', $groupId)->where('user_id', $user->id)->exists();
        if (!$isMember) {
            return response()->json(['message' => 'Anda bukan anggota grup ini'], 403);
        }

        $poll = GroupPoll::where('group_id', $groupId)->where('id', $pollId)->firstOrFail();
        if ($poll->is_closed) {
            return response()->json(['message' => 'Polling ini telah ditutup'], 400);
        }

        $data = $request->validate([
            'option_id' => 'required|integer|exists:group_poll_options,id',
        ]);
        $optionId = (int) $data['option_id'];

        // Verify option belongs to this poll
        $validOption = GroupPollOption::where('poll_id', $poll->id)->where('id', $optionId)->exists();
        if (!$validOption) {
            return response()->json(['message' => 'Opsi tidak valid untuk polling ini'], 422);
        }

        DB::transaction(function () use ($poll, $user, $optionId) {
            $existingVote = GroupPollVote::where('poll_id', $poll->id)
                ->where('option_id', $optionId)
                ->where('user_id', $user->id)
                ->first();

            if ($existingVote) {
                // Toggle off / cancel vote
                $existingVote->delete();
            } else {
                if (!$poll->multiple_answers) {
                    // Remove other votes by user
                    GroupPollVote::where('poll_id', $poll->id)
                        ->where('user_id', $user->id)
                        ->delete();
                }

                GroupPollVote::create([
                    'poll_id'   => $poll->id,
                    'option_id' => $optionId,
                    'user_id'   => $user->id,
                ]);
            }
        });

        $poll->load(['creator:id,username,display_name,avatar', 'options.votes.user:id,username,display_name,avatar']);
        $formatted = $this->formatPoll($poll, $user->id);

        $memberIds = GroupMember::where('group_id', $groupId)->pluck('user_id')->toArray();
        if (!empty($memberIds)) {
            broadcast(new GroupPollUpdated((int) $groupId, $formatted, $memberIds));
        }

        return response()->json($formatted);
    }

    public function close(Request $request, $groupId, $pollId)
    {
        $user = $request->user();
        $myMember = GroupMember::where('group_id', $groupId)->where('user_id', $user->id)->first();
        if (!$myMember) {
            return response()->json(['message' => 'Anda bukan anggota grup ini'], 403);
        }

        $poll = GroupPoll::where('group_id', $groupId)->where('id', $pollId)->firstOrFail();
        $canClose = $myMember->role === 'admin' || (int) $poll->created_by === (int) $user->id;
        if (!$canClose) {
            return response()->json(['message' => 'Hanya admin atau pembuat polling yang dapat menutup polling ini'], 403);
        }

        $poll->is_closed = true;
        $poll->save();

        $poll->load(['creator:id,username,display_name,avatar', 'options.votes.user:id,username,display_name,avatar']);
        $formatted = $this->formatPoll($poll, $user->id);

        $memberIds = GroupMember::where('group_id', $groupId)->pluck('user_id')->toArray();
        if (!empty($memberIds)) {
            broadcast(new GroupPollUpdated((int) $groupId, $formatted, $memberIds));
        }

        return response()->json($formatted);
    }

    private function formatPoll(GroupPoll $poll, int $currentUserId): array
    {
        $allVotes = $poll->options->flatMap->votes;
        $totalVotes = $allVotes->count();
        $totalUniqueVoters = $allVotes->pluck('user_id')->unique()->count();

        $options = $poll->options->map(function ($opt) use ($totalVotes, $currentUserId) {
            $votesCount = $opt->votes->count();
            $pct = $totalVotes > 0 ? round(($votesCount / $totalVotes) * 100, 1) : 0;
            $isVotedByMe = $opt->votes->contains('user_id', $currentUserId);

            return [
                'id'              => $opt->id,
                'option_text'     => $opt->option_text,
                'votes_count'     => $votesCount,
                'percentage'      => $pct,
                'is_voted_by_me'  => $isVotedByMe,
                'voters'          => $opt->votes->map(fn($v) => [
                    'id'           => $v->user?->id,
                    'name'         => $v->user?->display_name ?: $v->user?->username,
                    'username'     => $v->user?->username,
                    'avatar'       => $v->user?->avatar,
                ]),
            ];
        });

        return [
            'id'                  => $poll->id,
            'group_id'            => $poll->group_id,
            'question'            => $poll->question,
            'multiple_answers'    => (bool) $poll->multiple_answers,
            'is_closed'           => (bool) $poll->is_closed,
            'created_by'          => $poll->created_by,
            'creator_name'        => $poll->creator?->display_name ?: $poll->creator?->username,
            'creator_avatar'      => $poll->creator?->avatar,
            'created_at'          => $poll->created_at?->toIso8601String(),
            'total_votes'         => $totalVotes,
            'total_unique_voters' => $totalUniqueVoters,
            'options'             => $options,
        ];
    }
}
