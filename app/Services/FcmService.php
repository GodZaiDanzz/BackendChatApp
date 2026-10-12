<?php

namespace App\Services;

use App\Models\Call;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FcmService
{
    /**
     * Send high priority incoming call data message via FCM HTTP v1.
     *
     * @param User|string $callee
     * @param Call $call
     * @param User|null $caller
     * @return bool
     */
    public function sendIncomingCall(User|string $callee, Call $call, ?User $caller = null): bool
    {
        $tokens = [];

        if ($callee instanceof User) {
            if (!empty($callee->fcm_token)) {
                $tokens[] = $callee->fcm_token;
            }
            // Also collect any tokens from devices table if present
            if (method_exists($callee, 'devices')) {
                foreach ($callee->devices()->pluck('fcm_token') as $devToken) {
                    if (!empty($devToken) && !in_array($devToken, $tokens)) {
                        $tokens[] = $devToken;
                    }
                }
            }
            if (!$caller) {
                $caller = $call->caller;
            }
        } elseif (is_string($callee)) {
            $tokens[] = $callee;
        }

        if (empty($tokens)) {
            return false;
        }

        $callerName = $caller ? ($caller->display_name ?: $caller->username) : 'Someone';

        $dataPayload = [
            'type'        => 'incoming_call',
            'call_id'     => (string) $call->id,
            'caller_name' => (string) $callerName,
            'call_type'   => (string) ($call->type ?? 'audio'),
        ];

        $sentCount = 0;
        foreach ($tokens as $token) {
            if ($this->sendDataMessage($token, $dataPayload)) {
                $sentCount++;
            }
        }

        return $sentCount > 0;
    }

    /**
     * Send a raw high-priority data-only message using FCM HTTP v1.
     */
    public function sendDataMessage(string $fcmToken, array $data): bool
    {
        try {
            $credentials = $this->getServiceAccountCredentials();
            if (!$credentials) {
                Log::warning('FCM: Service account credentials not found or unreadable.');
                return false;
            }

            $projectId = config('services.fcm.project_id') ?: ($credentials['project_id'] ?? null);
            if (!$projectId) {
                Log::warning('FCM: Project ID not configured.');
                return false;
            }

            $accessToken = $this->getAccessToken($credentials);
            if (!$accessToken) {
                Log::warning('FCM: Failed to obtain OAuth2 access token.');
                return false;
            }

            // Ensure all data values are string (FCM HTTP v1 constraint)
            $stringData = [];
            foreach ($data as $k => $v) {
                $stringData[(string) $k] = is_string($v) ? $v : json_encode($v);
            }

            $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";

            $response = Http::withToken($accessToken)
                ->timeout(5)
                ->post($url, [
                    'message' => [
                        'token'   => $fcmToken,
                        'data'    => $stringData,
                        'android' => [
                            'priority' => 'HIGH',
                        ],
                    ],
                ]);

            if ($response->successful()) {
                return true;
            }

            Log::warning('FCM HTTP v1 error: ' . $response->body());
            return false;
        } catch (\Throwable $e) {
            Log::error('FCM send failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Retrieve and cache Google OAuth2 Access Token for Firebase Messaging.
     */
    protected function getAccessToken(array $credentials): ?string
    {
        $clientEmail = $credentials['client_email'] ?? null;
        $privateKey  = $credentials['private_key'] ?? null;

        if (!$clientEmail || !$privateKey) {
            return null;
        }

        $cacheKey = 'fcm_oauth_token_' . md5($clientEmail);

        return Cache::remember($cacheKey, 3000, function () use ($clientEmail, $privateKey) {
            $now = time();
            $header = ['alg' => 'RS256', 'typ' => 'JWT'];
            $claim = [
                'iss'   => $clientEmail,
                'sub'   => $clientEmail,
                'aud'   => 'https://oauth2.googleapis.com/token',
                'iat'   => $now,
                'exp'   => $now + 3600,
                'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            ];

            $base64UrlHeader = $this->base64UrlEncode(json_encode($header));
            $base64UrlClaim  = $this->base64UrlEncode(json_encode($claim));
            $dataToSign      = $base64UrlHeader . '.' . $base64UrlClaim;

            $signature = '';
            $success = openssl_sign($dataToSign, $signature, $privateKey, OPENSSL_ALGO_SHA256);
            if (!$success) {
                Log::error('FCM: OpenSSL failed to sign assertion.');
                return null;
            }

            $jwt = $dataToSign . '.' . $this->base64UrlEncode($signature);

            $response = Http::asForm()->timeout(5)->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion'  => $jwt,
            ]);

            if ($response->successful()) {
                return $response->json('access_token');
            }

            Log::error('FCM OAuth2 exchange failed: ' . $response->body());
            return null;
        });
    }

    /**
     * Locate and load the Firebase service account JSON.
     */
    protected function getServiceAccountCredentials(): ?array
    {
        $path = config('services.fcm.credentials_path');

        $candidates = [
            $path,
            env('FIREBASE_CREDENTIALS'),
            storage_path('app/firebase.json'),
            base_path('firebase.json'),
        ];

        foreach ($candidates as $candidate) {
            if ($candidate && file_exists($candidate) && is_readable($candidate)) {
                $content = file_get_contents($candidate);
                $json = json_decode($content, true);
                if (is_array($json) && !empty($json['client_email'])) {
                    return $json;
                }
            }
        }

        return null;
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
