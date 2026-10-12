<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function search(Request $request)
    {
        $query = $request->query('q', '');

        if (empty($query)) {
            return response()->json([]);
        }

        $users = User::where('id', '!=', $request->user()->id)
            ->where(function ($q) use ($query) {
                $q->where('username', 'like', "%{$query}%")
                  ->orWhere('display_name', 'like', "%{$query}%");
            })
            ->limit(20)
            ->get(['id', 'username', 'display_name', 'avatar']);

        return response()->json($users);
    }

    public function updateProfile(Request $request)
    {
        $data = $request->validate([
            'display_name' => 'required|string|max:100',
            'phone_number' => 'nullable|string|max:25',
            'avatar'       => 'nullable|image|max:10240',
        ]);

        $user = $request->user();
        $user->display_name = trim($data['display_name']);
        if (isset($data['phone_number'])) {
            $user->phone_number = trim($data['phone_number']);
        }

        if ($request->hasFile('avatar')) {
            $file = $request->file('avatar');
            $dir = public_path('uploads/avatars');
            if (!file_exists($dir)) {
                mkdir($dir, 0755, true);
            }

            if ($user->avatar && str_starts_with($user->avatar, '/uploads/avatars/')) {
                $oldPath = public_path(ltrim($user->avatar, '/'));
                if (file_exists($oldPath)) {
                    @unlink($oldPath);
                }
            }

            $filename = 'user_' . $user->id . '_' . time() . '.' . $file->getClientOriginalExtension();
            $file->move($dir, $filename);
            $user->avatar = '/uploads/avatars/' . $filename;
        }

        $user->save();

        return response()->json([
            'id'           => $user->id,
            'username'     => $user->username,
            'display_name' => $user->display_name,
            'email'        => $user->email,
            'phone_number' => $user->phone_number,
            'avatar'       => $user->avatar,
        ]);
    }

    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|max:10240',
        ]);

        $user = $request->user();
        $file = $request->file('avatar');
        $dir = public_path('uploads/avatars');
        if (!file_exists($dir)) {
            mkdir($dir, 0755, true);
        }

        if ($user->avatar && str_starts_with($user->avatar, '/uploads/avatars/')) {
            $oldPath = public_path(ltrim($user->avatar, '/'));
            if (file_exists($oldPath)) {
                @unlink($oldPath);
            }
        }

        $filename = 'user_' . $user->id . '_' . time() . '.' . $file->getClientOriginalExtension();
        $file->move($dir, $filename);
        $user->avatar = '/uploads/avatars/' . $filename;
        $user->save();

        return response()->json([
            'message'      => 'Foto profil berhasil diperbarui',
            'id'           => $user->id,
            'username'     => $user->username,
            'display_name' => $user->display_name,
            'email'        => $user->email,
            'avatar'       => $user->avatar,
        ]);
    }

    public function deleteAvatar(Request $request)
    {
        $user = $request->user();
        if ($user->avatar && str_starts_with($user->avatar, '/uploads/avatars/')) {
            $oldPath = public_path(ltrim($user->avatar, '/'));
            if (file_exists($oldPath)) {
                @unlink($oldPath);
            }
        }

        $user->avatar = null;
        $user->save();

        return response()->json([
            'message'      => 'Foto profil berhasil dihapus',
            'id'           => $user->id,
            'username'     => $user->username,
            'display_name' => $user->display_name,
            'email'        => $user->email,
            'avatar'       => null,
        ]);
    }
}
