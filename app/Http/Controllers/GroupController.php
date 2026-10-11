<?php

namespace App\Http\Controllers;

use App\Events\GroupMessageSent;
use App\Events\GroupMessageUpdated;
use App\Models\Group;
use App\Models\GroupMember;
use App\Models\GroupMessage;
use App\Services\ChatEncryption;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GroupController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $groups = Group::whereHas('members', function ($q) use ($userId) {
            $q->where('user_id', $userId);
        })
            ->with(['members.user:id,username,display_name,avatar', 'creator:id,username,display_name,avatar'])
            ->get()
            ->map(function ($group) use ($userId) {
                $myMember = $group->members->firstWhere('user_id', $userId);
                $lastMsg = GroupMessage::where('group_id', $group->id)
                    ->with('sender:id,username,display_name')
                    ->latest()
                    ->first();

                return [
                    'id'            => $group->id,
                    'name'          => $group->name,
                    'description'   => $group->description,
                    'avatar'        => $group->avatar,
                    'group_key'     => $group->group_key,
                    'created_by'    => $group->created_by,
                    'created_at'    => $group->created_at?->toIso8601String(),
                    'my_role'       => $myMember ? $myMember->role : 'member',
                    'members_count' => $group->members->count(),
                    'members'       => $group->members->map(function ($m) {
                        return [
                            'user_id'      => $m->user_id,
                            'username'     => $m->user?->username,
                            'display_name' => $m->user?->display_name ?: $m->user?->username,
                            'avatar'       => $m->user?->avatar,
                            'role'         => $m->role,
                            'joined_at'    => $m->joined_at?->toIso8601String(),
                        ];
                    }),
                    'last_message'  => $lastMsg ? [
                        'id'          => $lastMsg->id,
                        'client_uuid' => $lastMsg->client_uuid,
                        'sender_id'   => $lastMsg->sender_id,
                        'sender_name' => $lastMsg->sender?->display_name ?: $lastMsg->sender?->username,
                        'body'        => $lastMsg->body,
                        'attachment'  => $lastMsg->attachment,
                        'created_at'  => $lastMsg->created_at?->toIso8601String(),
                    ] : null,
                ];
            });

        return response()->json($groups);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'         => 'required|string|max:100',
            'description'  => 'nullable|string|max:255',
            'member_ids'   => 'nullable|array',
            'member_ids.*' => 'integer|exists:users,id',
        ]);

        $user = $request->user();
        $groupKey = bin2hex(random_bytes(32));

        $group = DB::transaction(function () use ($data, $user, $groupKey) {
            $grp = Group::create([
                'name'        => trim($data['name']),
                'description' => isset($data['description']) ? trim($data['description']) : null,
                'group_key'   => $groupKey,
                'created_by'  => $user->id,
            ]);

            GroupMember::create([
                'group_id'  => $grp->id,
                'user_id'   => $user->id,
                'role'      => 'admin',
                'joined_at' => now(),
            ]);

            if (!empty($data['member_ids'])) {
                $additionalIds = array_unique(array_filter($data['member_ids'], fn($id) => (int) $id !== (int) $user->id));
                foreach ($additionalIds as $mid) {
                    GroupMember::create([
                        'group_id'  => $grp->id,
                        'user_id'   => $mid,
                        'role'      => 'member',
                        'joined_at' => now(),
                    ]);
                }
            }

            return $grp;
        });

        $group->load(['members.user:id,username,display_name,avatar', 'creator:id,username,display_name,avatar']);

        return response()->json([
            'id'            => $group->id,
            'name'          => $group->name,
            'description'   => $group->description,
            'avatar'        => $group->avatar,
            'group_key'     => $group->group_key,
            'created_by'    => $group->created_by,
            'my_role'       => 'admin',
            'members_count' => $group->members->count(),
            'members'       => $group->members->map(fn($m) => [
                'user_id'      => $m->user_id,
                'username'     => $m->user?->username,
                'display_name' => $m->user?->display_name ?: $m->user?->username,
                'avatar'       => $m->user?->avatar,
                'role'         => $m->role,
            ]),
        ], 201);
    }

    public function sync(Request $request)
    {
        $userId = $request->user()->id;
        $since = $request->input('since', []);

        $groups = Group::whereHas('members', function ($q) use ($userId) {
            $q->where('user_id', $userId);
        })->get();

        $messages = [];

        foreach ($groups as $group) {
            $lastId = isset($since[$group->id]) ? (int) $since[$group->id] : 0;

            if ($lastId === 0) {
                $groupMessages = GroupMessage::where('group_id', $group->id)
                    ->with('sender:id,username,display_name')
                    ->latest()
                    ->limit(50)
                    ->get()
                    ->reverse();
            } else {
                $groupMessages = GroupMessage::where('group_id', $group->id)
                    ->with('sender:id,username,display_name')
                    ->where(function ($q) use ($lastId) {
                        $q->where('id', '>', $lastId)
                          ->orWhere('updated_at', '>=', now()->subMinutes(10));
                    })
                    ->orderBy('created_at', 'asc')
                    ->limit(100)
                    ->get();
            }

            foreach ($groupMessages as $msg) {
                if (!ChatEncryption::isEncrypted($msg->body) && !$msg->is_deleted) {
                    $msg->body = ChatEncryption::encryptWithKey($msg->body, $group->group_key);
                }
                $sender = $msg->sender;
                $messages[] = [
                    'id'          => $msg->id,
                    'client_uuid' => $msg->client_uuid,
                    'group_id'    => $msg->group_id,
                    'sender_id'   => $msg->sender_id,
                    'sender_name' => $sender ? ($sender->display_name ?: $sender->username) : 'Pengguna',
                    'body'        => $msg->body,
                    'attachment'  => $msg->attachment,
                    'reply_to'    => $msg->reply_to,
                    'is_edited'   => (bool) $msg->is_edited,
                    'is_deleted'  => (bool) $msg->is_deleted,
                    'created_at'  => $msg->created_at?->toIso8601String(),
                ];
            }
        }

        return response()->json(['messages' => $messages]);
    }

    public function show(Request $request, $id)
    {
        $group = Group::with(['members.user:id,username,display_name,avatar', 'creator:id,username,display_name,avatar'])->findOrFail($id);

        $myMember = $group->members->firstWhere('user_id', $request->user()->id);
        if (!$myMember) {
            return response()->json(['message' => 'Anda bukan anggota grup ini'], 403);
        }

        return response()->json([
            'id'            => $group->id,
            'name'          => $group->name,
            'description'   => $group->description,
            'avatar'        => $group->avatar,
            'group_key'     => $group->group_key,
            'created_by'    => $group->created_by,
            'created_at'    => $group->created_at?->toIso8601String(),
            'my_role'       => $myMember->role,
            'members_count' => $group->members->count(),
            'members'       => $group->members->map(fn($m) => [
                'user_id'      => $m->user_id,
                'username'     => $m->user?->username,
                'display_name' => $m->user?->display_name ?: $m->user?->username,
                'avatar'       => $m->user?->avatar,
                'role'         => $m->role,
                'joined_at'    => $m->joined_at?->toIso8601String(),
            ]),
        ]);
    }

    public function update(Request $request, $id)
    {
        $group = Group::findOrFail($id);
        $myMember = GroupMember::where('group_id', $id)->where('user_id', $request->user()->id)->first();

        if (!$myMember || $myMember->role !== 'admin') {
            return response()->json(['message' => 'Hanya admin yang dapat mengubah detail grup'], 403);
        }

        $data = $request->validate([
            'name'        => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
        ]);

        $updateData = [
            'name'        => trim($data['name']),
            'description' => isset($data['description']) ? trim($data['description']) : null,
        ];

        if ($request->hasFile('avatar')) {
            $request->validate(['avatar' => 'image|max:5120']);
            $file = $request->file('avatar');
            $filename = 'grp_' . $group->id . '_' . time() . '.' . $file->getClientOriginalExtension();
            $dir = public_path('uploads/groups');
            if (!file_exists($dir)) {
                mkdir($dir, 0755, true);
            }
            $file->move($dir, $filename);
            $updateData['avatar'] = '/uploads/groups/' . $filename;
        } elseif ($request->has('avatar')) {
            $updateData['avatar'] = $request->input('avatar');
        }

        $group->update($updateData);

        $group->load(['members.user:id,username,display_name,avatar', 'creator:id,username,display_name,avatar']);

        return response()->json([
            'id'            => $group->id,
            'name'          => $group->name,
            'description'   => $group->description,
            'avatar'        => $group->avatar,
            'group_key'     => $group->group_key,
            'created_by'    => $group->created_by,
            'created_at'    => $group->created_at?->toIso8601String(),
            'my_role'       => $myMember->role,
            'members_count' => $group->members->count(),
            'members'       => $group->members->map(fn($m) => [
                'user_id'      => $m->user_id,
                'username'     => $m->user?->username,
                'display_name' => $m->user?->display_name ?: $m->user?->username,
                'avatar'       => $m->user?->avatar,
                'role'         => $m->role,
                'joined_at'    => $m->joined_at?->toIso8601String(),
            ]),
            'message'       => 'Detail grup berhasil diperbarui',
        ]);
    }

    public function addMembers(Request $request, $id)
    {
        $group = Group::findOrFail($id);
        $myMember = GroupMember::where('group_id', $id)->where('user_id', $request->user()->id)->first();

        if (!$myMember || $myMember->role !== 'admin') {
            return response()->json(['message' => 'Hanya admin yang dapat menambah anggota grup'], 403);
        }

        $userIds = $request->input('user_ids') ?? $request->input('member_ids');
        if (!is_array($userIds) && $request->filled('user_id')) {
            $userIds = [$request->input('user_id')];
        }

        if (empty($userIds) || !is_array($userIds)) {
            return response()->json(['message' => 'Pilih setidaknya satu anggota untuk ditambahkan'], 422);
        }

        $validUsers = \App\Models\User::whereIn('id', $userIds)->pluck('id');

        foreach ($validUsers as $uid) {
            GroupMember::firstOrCreate(
                ['group_id' => $group->id, 'user_id' => $uid],
                ['role' => 'member', 'joined_at' => now()]
            );
        }

        $group->load('members.user:id,username,display_name,avatar');

        return response()->json([
            'message'       => 'Anggota berhasil ditambahkan',
            'members_count' => $group->members->count(),
            'members'       => $group->members->map(fn($m) => [
                'user_id'      => $m->user_id,
                'username'     => $m->user?->username,
                'display_name' => $m->user?->display_name ?: $m->user?->username,
                'avatar'       => $m->user?->avatar,
                'role'         => $m->role,
                'joined_at'    => $m->joined_at?->toIso8601String(),
            ]),
        ]);
    }

    public function removeMember(Request $request, $id, $userId)
    {
        $group = Group::findOrFail($id);
        $currentUserId = $request->user()->id;
        $targetUserId = (int) $userId;

        $myMember = GroupMember::where('group_id', $id)->where('user_id', $currentUserId)->first();
        if (!$myMember) {
            return response()->json(['message' => 'Anda bukan anggota grup ini'], 403);
        }

        if ($currentUserId !== $targetUserId && $myMember->role !== 'admin') {
            return response()->json(['message' => 'Hanya admin yang dapat mengeluarkan anggota'], 403);
        }

        // Prevent removing the original group creator unless they leave voluntarily
        if ($targetUserId === (int) $group->created_by && $currentUserId !== $targetUserId) {
            return response()->json(['message' => 'Pembuat grup tidak dapat dikeluarkan oleh admin lain'], 422);
        }

        GroupMember::where('group_id', $id)->where('user_id', $targetUserId)->delete();

        $remainingCount = GroupMember::where('group_id', $id)->count();
        if ($remainingCount === 0) {
            $group->delete();
            return response()->json(['message' => 'Grup telah dihapus karena semua anggota telah keluar']);
        }

        // Promote oldest member if all admins leave
        $hasAdmin = GroupMember::where('group_id', $id)->where('role', 'admin')->exists();
        if (!$hasAdmin) {
            $oldestMember = GroupMember::where('group_id', $id)->orderBy('joined_at')->first();
            if ($oldestMember) {
                $oldestMember->update(['role' => 'admin']);
            }
        }

        return response()->json(['message' => 'Anggota berhasil dikeluarkan dari grup']);
    }

    public function destroy(Request $request, $id)
    {
        $group = Group::findOrFail($id);
        $myMember = GroupMember::where('group_id', $id)->where('user_id', $request->user()->id)->first();

        if (!$myMember || $myMember->role !== 'admin') {
            return response()->json(['message' => 'Hanya admin grup yang dapat membubarkan grup'], 403);
        }

        $group->delete();
        return response()->json(['message' => 'Grup berhasil dibubarkan']);
    }

    public function messages(Request $request, $id)
    {
        $isMember = GroupMember::where('group_id', $id)->where('user_id', $request->user()->id)->exists();
        if (!$isMember) {
            return response()->json(['message' => 'Anda bukan anggota grup ini'], 403);
        }

        $group = Group::findOrFail($id);

        $messages = GroupMessage::where('group_id', $id)
            ->with('sender:id,username,display_name')
            ->orderBy('created_at', 'asc')
            ->limit(100)
            ->get()
            ->map(function ($msg) use ($group) {
                // Ensure payload is encrypted with group_key
                if (!ChatEncryption::isEncrypted($msg->body) && !$msg->is_deleted) {
                    $msg->body = ChatEncryption::encryptWithKey($msg->body, $group->group_key);
                }
                $sender = $msg->sender;
                return [
                    'id'          => $msg->id,
                    'client_uuid' => $msg->client_uuid,
                    'group_id'    => $msg->group_id,
                    'sender_id'   => $msg->sender_id,
                    'sender_name' => $sender ? ($sender->display_name ?: $sender->username) : 'Pengguna',
                    'body'        => $msg->body,
                    'attachment'  => $msg->attachment,
                    'reply_to'    => $msg->reply_to,
                    'is_edited'   => (bool) $msg->is_edited,
                    'is_deleted'  => (bool) $msg->is_deleted,
                    'created_at'  => $msg->created_at?->toIso8601String(),
                ];
            });

        return response()->json($messages);
    }

    public function storeMessage(Request $request, $id)
    {
        $isMember = GroupMember::where('group_id', $id)->where('user_id', $request->user()->id)->exists();
        if (!$isMember) {
            return response()->json(['message' => 'Anda bukan anggota grup ini'], 403);
        }

        $group = Group::findOrFail($id);

        $data = $request->validate([
            'client_uuid' => 'required|string|max:64',
            'body'        => 'nullable|string|max:4000',
            'attachment'  => 'nullable|array',
            'reply_to'    => 'nullable|array',
        ]);

        $body = $data['body'] ?? '';
        if (trim($body) === '' && !empty($data['attachment']['name'])) {
            $body = '[Berkas: ' . $data['attachment']['name'] . ']';
        }

        if (!ChatEncryption::isEncrypted($body)) {
            $body = ChatEncryption::encryptWithKey($body, $group->group_key);
        }

        $msg = GroupMessage::firstOrCreate(
            ['client_uuid' => $data['client_uuid']],
            [
                'group_id'   => $group->id,
                'sender_id'  => $request->user()->id,
                'body'       => $body,
                'attachment' => $data['attachment'] ?? null,
                'reply_to'   => $data['reply_to'] ?? null,
            ]
        );

        $msg->load('sender:id,username,display_name');

        if ($msg->wasRecentlyCreated) {
            $otherMembers = GroupMember::where('group_id', $group->id)
                ->where('user_id', '!=', $request->user()->id)
                ->pluck('user_id')
                ->toArray();

            try {
                broadcast(new GroupMessageSent($msg, $otherMembers));
            } catch (\Throwable $e) {
                Log::warning('Group WebSocket broadcast failed: ' . $e->getMessage());
            }
        }

        return response()->json($msg, 201);
    }

    public function updateMessage(Request $request, $id, $messageId)
    {
        $group = Group::findOrFail($id);
        $msg = GroupMessage::where('group_id', $id)
            ->where('sender_id', $request->user()->id)
            ->where(function ($q) use ($messageId) {
                if (is_numeric($messageId)) {
                    $q->where('id', (int) $messageId)->orWhere('client_uuid', $messageId);
                } else {
                    $q->where('client_uuid', $messageId);
                }
            })
            ->firstOrFail();

        if ($msg->is_deleted) {
            return response()->json(['message' => 'Pesan yang sudah terhapus tidak dapat diubah'], 422);
        }

        $data = $request->validate([
            'body' => 'required|string|max:4000',
        ]);

        $body = $data['body'];
        if (!ChatEncryption::isEncrypted($body)) {
            $body = ChatEncryption::encryptWithKey($body, $group->group_key);
        }

        $msg->update([
            'body'      => $body,
            'is_edited' => true,
        ]);

        $otherMembers = GroupMember::where('group_id', $group->id)
            ->where('user_id', '!=', $request->user()->id)
            ->pluck('user_id')
            ->toArray();

        try {
            broadcast(new GroupMessageUpdated($msg, $otherMembers));
        } catch (\Throwable $e) {
            Log::warning('Group update broadcast failed: ' . $e->getMessage());
        }

        return response()->json($msg);
    }

    public function destroyMessage(Request $request, $id, $messageId)
    {
        $group = Group::findOrFail($id);
        $myMember = GroupMember::where('group_id', $id)->where('user_id', $request->user()->id)->first();

        $msg = GroupMessage::where('group_id', $id)
            ->where(function ($q) use ($messageId) {
                if (is_numeric($messageId)) {
                    $q->where('id', (int) $messageId)->orWhere('client_uuid', $messageId);
                } else {
                    $q->where('client_uuid', $messageId);
                }
            })
            ->firstOrFail();

        if ($msg->sender_id !== $request->user()->id && (!$myMember || $myMember->role !== 'admin')) {
            return response()->json(['message' => 'Hanya pengirim atau admin yang dapat menghapus pesan ini'], 403);
        }

        $msg->update([
            'body'       => 'Pesan ini telah dihapus',
            'attachment' => null,
            'is_deleted' => true,
        ]);

        $otherMembers = GroupMember::where('group_id', $group->id)
            ->where('user_id', '!=', $request->user()->id)
            ->pluck('user_id')
            ->toArray();

        try {
            broadcast(new GroupMessageUpdated($msg, $otherMembers));
        } catch (\Throwable $e) {
            Log::warning('Group delete broadcast failed: ' . $e->getMessage());
        }

        return response()->json(['message' => 'Pesan grup berhasil dihapus']);
    }
}
