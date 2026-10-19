<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    /**
     * Get all active sessions/tokens for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $currentToken = $user->currentAccessToken();
        $currentTokenId = $currentToken ? $currentToken->id : null;

        $tokens = $user->tokens()
            ->orderByDesc('last_used_at')
            ->orderByDesc('created_at')
            ->get();

        $sessions = $tokens->map(function ($token) use ($currentTokenId) {
            $isCurrent = $token->id === $currentTokenId;
            $parsed = self::parseDeviceName($token->name);

            return [
                'id'           => $token->id,
                'name'         => $parsed['friendly_name'],
                'device_type'  => $parsed['device_type'],
                'browser'      => $parsed['browser'],
                'os'           => $parsed['os'],
                'is_current'   => $isCurrent,
                'last_used_at' => $token->last_used_at ? $token->last_used_at->diffForHumans() : ($isCurrent ? 'Aktif sekarang' : 'Belum pernah digunakan'),
                'created_at'   => $token->created_at ? $token->created_at->format('d M Y, H:i') : null,
            ];
        });

        return response()->json([
            'sessions'      => $sessions,
            'total_count'   => $sessions->count(),
            'current_token_id' => $currentTokenId,
        ]);
    }

    /**
     * Terminate / Revoke a specific session.
     */
    public function destroy(int $id, Request $request): JsonResponse
    {
        $user = $request->user();
        $currentToken = $user->currentAccessToken();
        $isCurrent = $currentToken && $currentToken->id === $id;

        $token = $user->tokens()->find($id);
        if (!$token) {
            return response()->json(['message' => 'Sesi tidak ditemukan atau sudah kedaluwarsa.'], 404);
        }

        $token->delete();

        return response()->json([
            'message'    => 'Sesi berhasil dikeluarkan.',
            'is_current' => $isCurrent,
        ]);
    }

    /**
     * Terminate all other sessions except the current one.
     */
    public function revokeOthers(Request $request): JsonResponse
    {
        $user = $request->user();
        $currentToken = $user->currentAccessToken();

        if (!$currentToken) {
            return response()->json(['message' => 'Sesi aktif tidak valid.'], 400);
        }

        $deletedCount = $user->tokens()
            ->where('id', '!=', $currentToken->id)
            ->delete();

        return response()->json([
            'status'        => 'success',
            'message'       => "Berhasil mengeluarkan {$deletedCount} sesi perangkat lain.",
            'revoked_count' => $deletedCount,
        ]);
    }

    /**
     * Helper to parse user-agent or token name into friendly device/browser info.
     */
    public static function parseDeviceName(?string $name): array
    {
        if (empty($name) || $name === 'web') {
            return [
                'friendly_name' => 'Browser Web',
                'device_type'   => 'desktop',
                'browser'       => 'Web Browser',
                'os'            => 'Desktop',
            ];
        }

        $lower = strtolower($name);

        // Detect OS
        $os = 'Desktop';
        $deviceType = 'desktop';
        if (str_contains($lower, 'windows')) {
            $os = 'Windows';
            $deviceType = 'desktop';
        } elseif (str_contains($lower, 'iphone')) {
            $os = 'iOS (iPhone)';
            $deviceType = 'mobile';
        } elseif (str_contains($lower, 'ipad')) {
            $os = 'iPadOS';
            $deviceType = 'tablet';
        } elseif (str_contains($lower, 'android')) {
            $os = 'Android';
            $deviceType = 'mobile';
        } elseif (str_contains($lower, 'macintosh') || str_contains($lower, 'mac os')) {
            $os = 'macOS';
            $deviceType = 'desktop';
        } elseif (str_contains($lower, 'linux')) {
            $os = 'Linux';
            $deviceType = 'desktop';
        }

        // Detect Browser
        $browser = 'Browser';
        if (str_contains($lower, 'edg')) {
            $browser = 'Microsoft Edge';
        } elseif (str_contains($lower, 'chrome') || str_contains($lower, 'crios')) {
            $browser = 'Google Chrome';
        } elseif (str_contains($lower, 'firefox') || str_contains($lower, 'fxios')) {
            $browser = 'Mozilla Firefox';
        } elseif (str_contains($lower, 'safari') && !str_contains($lower, 'chrome')) {
            $browser = 'Apple Safari';
        } elseif (str_contains($lower, 'opr') || str_contains($lower, 'opera')) {
            $browser = 'Opera';
        }

        // Check if name is already formatted
        if (!str_contains($name, 'Mozilla/') && !str_contains($name, 'AppleWebKit')) {
            return [
                'friendly_name' => $name,
                'device_type'   => $deviceType,
                'browser'       => $browser,
                'os'            => $os,
            ];
        }

        $friendly = "{$browser} di {$os}";

        return [
            'friendly_name' => $friendly,
            'device_type'   => $deviceType,
            'browser'       => $browser,
            'os'            => $os,
        ];
    }
}
