<?php

namespace App\Http\Controllers;

use App\Models\BlockedUser;
use App\Models\User;
use Illuminate\Http\Request;

class BlockController extends Controller
{
    /**
     * Get list of users blocked by current user
     */
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $blocked = BlockedUser::where('user_id', $userId)
            ->with('blockedUser:id,username,display_name,avatar')
            ->latest()
            ->get()
            ->map(function ($item) {
                return [
                    'id'           => $item->blockedUser?->id,
                    'username'     => $item->blockedUser?->username,
                    'display_name' => $item->blockedUser?->display_name ?: $item->blockedUser?->username,
                    'avatar'       => $item->blockedUser?->avatar,
                    'blocked_at'   => $item->created_at?->toIso8601String(),
                ];
            })
            ->filter(fn($u) => $u['id'] !== null)
            ->values();

        return response()->json($blocked);
    }

    /**
     * Block a user
     */
    public function block(Request $request, $id)
    {
        $userId = $request->user()->id;
        $targetId = (int) $id;

        if ($userId === $targetId) {
            return response()->json(['message' => 'Anda tidak dapat memblokir diri sendiri'], 422);
        }

        $targetUser = User::findOrFail($targetId);

        BlockedUser::firstOrCreate([
            'user_id'         => $userId,
            'blocked_user_id' => $targetId,
        ]);

        return response()->json([
            'message'      => "Pengguna {$targetUser->display_name} berhasil diblokir",
            'blocked_user' => [
                'id'           => $targetUser->id,
                'username'     => $targetUser->username,
                'display_name' => $targetUser->display_name ?: $targetUser->username,
            ],
        ]);
    }

    /**
     * Unblock a user
     */
    public function unblock(Request $request, $id)
    {
        $userId = $request->user()->id;
        $targetId = (int) $id;

        $deleted = BlockedUser::where('user_id', $userId)
            ->where('blocked_user_id', $targetId)
            ->delete();

        return response()->json([
            'message' => $deleted ? 'Pengguna berhasil dibuka blokirnya' : 'Pengguna tidak ditemukan dalam daftar blokir',
            'unblocked_id' => $targetId,
        ]);
    }
}
