<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'username'     => 'required|alpha_dash|min:3|max:30|unique:users',
            'display_name' => 'required|max:60',
            'password'     => 'required|min:8',
            'invite_code'  => 'required',
        ]);

        abort_if($data['invite_code'] !== config('app.invite_code', env('INVITE_CODE')), 403, 'Kode undangan salah');

        $user = User::create([
            'username'     => $data['username'],
            'display_name' => $data['display_name'],
            'password'     => Hash::make($data['password']),
        ]);

        return response()->json([
            'token' => $user->createToken('android')->plainTextToken,
            'user'  => $user,
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required',
            'password' => 'required',
        ]);

        $user = User::where('username', $request->username)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Username atau password salah'], 422);
        }

        return response()->json([
            'token' => $user->createToken('android')->plainTextToken,
            'user'  => $user,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }
}
