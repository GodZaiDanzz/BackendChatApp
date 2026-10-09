<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ResendService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    /**
     * Pendaftaran Akun Baru dengan Verifikasi Email (Resend API)
     */
    public function register(Request $request, ResendService $resendService)
    {
        $data = $request->validate([
            'username'     => ['required', 'alpha_dash', 'min:3', 'max:30'],
            'display_name' => ['required', 'string', 'max:60'],
            'email'        => ['required', 'email', 'max:100'],
            'password'     => ['required', 'string', 'min:8'],
            'invite_code'  => ['nullable', 'string'],
        ], [
            'username.alpha_dash' => 'Username hanya boleh berisi huruf, angka, strip, dan garis bawah.',
            'username.min'        => 'Username minimal 3 karakter.',
            'email.email'         => 'Format email tidak valid. Masukkan alamat email yang aktif.',
            'password.min'        => 'Password minimal 8 karakter.',
        ]);

        // Cek apakah username sudah dipakai oleh akun yang sudah terverifikasi
        $existingUsername = User::where('username', $data['username'])->first();
        if ($existingUsername && $existingUsername->email_verified_at !== null) {
            return response()->json([
                'message' => 'Username ini sudah digunakan oleh akun lain. Silakan pilih username lain.',
                'errors'  => ['username' => ['Username sudah terdaftar.']]
            ], 422);
        }

        // Cek apakah email sudah dipakai oleh akun yang sudah terverifikasi
        $existingEmail = User::where('email', $data['email'])->first();
        if ($existingEmail && $existingEmail->email_verified_at !== null) {
            return response()->json([
                'message' => 'Alamat email ini sudah terdaftar dan terverifikasi. Silakan langsung masuk ke akun Anda.',
                'errors'  => ['email' => ['Email sudah terdaftar.']]
            ], 422);
        }

        // Generate 6 digit kode OTP acak
        $otp = sprintf('%06d', mt_rand(100000, 999999));
        $expiresAt = now()->addMinutes(10);

        // Jika ada akun yang belum terverifikasi dengan username/email yang sama, perbarui akun tersebut
        $user = $existingEmail ?? $existingUsername;
        if (!$user) {
            $user = new User();
        }

        $user->username = $data['username'];
        $user->display_name = $data['display_name'];
        $user->email = strtolower(trim($data['email']));
        $user->password = Hash::make($data['password']);
        $user->email_verified_at = null; // Belum diverifikasi
        $user->otp_code = $otp;
        $user->otp_expires_at = $expiresAt;
        $user->save();

        // Kirim email kode verifikasi via Resend API
        $resendResult = $resendService->sendOtp($user->email, $user->display_name, $otp);

        return response()->json([
            'status'    => 'verification_required',
            'message'   => $resendResult['message'] ?? 'Kode verifikasi telah dikirim ke email Anda.',
            'email'     => $user->email,
            'simulated' => $resendResult['simulated'] ?? false,
        ], 200);
    }

    /**
     * Verifikasi Kode OTP dari Email
     */
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
            'otp'   => ['required', 'string', 'size:6'],
        ], [
            'otp.size' => 'Kode OTP harus berjumlah 6 digit.',
        ]);

        $email = strtolower(trim($request->email));
        $user = User::where('email', $email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'Pengguna dengan alamat email ini tidak ditemukan.',
            ], 404);
        }

        if ($user->email_verified_at !== null) {
            return response()->json([
                'status'  => 'already_verified',
                'message' => 'Email ini sudah terverifikasi sebelumnya. Silakan langsung masuk.',
            ], 400);
        }

        if (!$user->otp_code || !$user->otp_expires_at) {
            return response()->json([
                'message' => 'Tidak ada kode verifikasi aktif. Silakan minta kode baru.',
            ], 422);
        }

        if (now()->greaterThan($user->otp_expires_at)) {
            return response()->json([
                'message' => 'Kode verifikasi telah kedaluwarsa (masa berlaku 10 menit). Silakan minta kode baru.',
            ], 422);
        }

        if ($user->otp_code !== trim($request->otp)) {
            return response()->json([
                'message' => 'Kode verifikasi yang Anda masukkan tidak sesuai.',
            ], 422);
        }

        // Tandai user telah diverifikasi dan hapus OTP
        $user->email_verified_at = now();
        $user->otp_code = null;
        $user->otp_expires_at = null;
        $user->save();

        // Terbitkan token akses login
        $token = $user->createToken('web')->plainTextToken;

        return response()->json([
            'status'  => 'verified',
            'message' => 'Verifikasi email berhasil! Selamat datang di ZChat.',
            'token'   => $token,
            'user'    => $user,
        ], 200);
    }

    /**
     * Kirim Ulang Kode OTP ke Email
     */
    public function resendOtp(Request $request, ResendService $resendService)
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = strtolower(trim($request->email));
        $user = User::where('email', $email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'Pengguna dengan email ini tidak ditemukan.',
            ], 404);
        }

        if ($user->email_verified_at !== null) {
            return response()->json([
                'message' => 'Email ini sudah terverifikasi. Silakan langsung masuk.',
            ], 400);
        }

        // Buat kode OTP baru
        $otp = sprintf('%06d', mt_rand(100000, 999999));
        $user->otp_code = $otp;
        $user->otp_expires_at = now()->addMinutes(10);
        $user->save();

        // Kirim email via Resend
        $resendResult = $resendService->sendOtp($user->email, $user->display_name, $otp);

        return response()->json([
            'status'    => 'resent',
            'message'   => $resendResult['message'] ?? 'Kode verifikasi baru telah dikirim ke email Anda.',
            'email'     => $user->email,
            'simulated' => $resendResult['simulated'] ?? false,
        ], 200);
    }

    /**
     * Masuk Akun (Mendukung Login via Username atau Email)
     */
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $loginInput = trim($request->username);

        // Cari user berdasarkan username ATAU email
        $user = User::where('username', $loginInput)
            ->orWhere('email', strtolower($loginInput))
            ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Username/email atau password yang Anda masukkan salah.'
            ], 422);
        }

        // Cek apakah email sudah diverifikasi
        if ($user->email_verified_at === null) {
            return response()->json([
                'status'  => 'unverified',
                'message' => 'Akun Anda belum diverifikasi. Silakan masukkan kode OTP yang telah dikirim ke email Anda.',
                'email'   => $user->email,
            ], 403);
        }

        return response()->json([
            'token' => $user->createToken('web')->plainTextToken,
            'user'  => $user,
        ]);
    }

    /**
     * Keluar dari Akun
     */
    public function logout(Request $request)
    {
        $user = $request->user();
        if ($user && \Illuminate\Support\Facades\Schema::hasColumn('users', 'last_seen_at')) {
            $user->update(['last_seen_at' => null]);
        }
        $user->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }
}
