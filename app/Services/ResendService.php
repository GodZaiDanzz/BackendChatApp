<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ResendService
{
    protected string $apiKey;
    protected string $fromEmail;

    public function __construct()
    {
        $this->apiKey = (string) (config('services.resend.key') ?? env('RESEND_API_KEY', ''));
        $this->fromEmail = (string) (config('services.resend.from') ?? env('RESEND_FROM_EMAIL', 'ZChat <onboarding@resend.dev>'));
    }

    /**
     * Send OTP Verification email via Resend API.
     *
     * @param string $toEmail
     * @param string $displayName
     * @param string $otp
     * @return array ['success' => bool, 'simulated' => bool, 'message' => string]
     */
    public function sendOtp(string $toEmail, string $displayName, string $otp): array
    {
        // Jika API Key belum diisi oleh user, lakukan mode simulasi (log) agar sistem tidak error saat pengujian awal
        if (empty($this->apiKey) || str_starts_with($this->apiKey, 'YOUR_')) {
            Log::info("[ResendService - SIMULATION] OTP untuk {$toEmail} ({$displayName}) adalah: {$otp}");
            return [
                'success'   => true,
                'simulated' => true,
                'message'   => 'Kode OTP disimulasikan (RESEND_API_KEY belum dikonfigurasi). Periksa log server untuk melihat kode.',
            ];
        }

        try {
            $html = $this->renderOtpTemplate($displayName, $otp);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type'  => 'application/json',
            ])->timeout(10)->post('https://api.resend.com/emails', [
                'from'    => $this->fromEmail,
                'to'      => [$toEmail],
                'subject' => "Kode Verifikasi Pendaftaran ZChat: {$otp}",
                'html'    => $html,
            ]);

            if ($response->successful()) {
                Log::info("[ResendService] Email OTP berhasil dikirim ke {$toEmail} melalui Resend.");
                return [
                    'success'   => true,
                    'simulated' => false,
                    'message'   => 'Kode verifikasi telah dikirim ke email Anda.',
                ];
            }

            $errorData = $response->json();
            $errorMessage = $errorData['message'] ?? 'Gagal mengirim email melalui Resend';
            Log::error("[ResendService] Resend API error: " . json_encode($errorData));

            return [
                'success'   => false,
                'simulated' => false,
                'message'   => $errorMessage,
            ];
        } catch (\Throwable $e) {
            Log::error("[ResendService] Exception saat kirim email: " . $e->getMessage());
            return [
                'success'   => false,
                'simulated' => false,
                'message'   => 'Koneksi ke layanan email gagal: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Render email HTML template with clean, anti-slop dark styling.
     */
    protected function renderOtpTemplate(string $displayName, string $otp): string
    {
        $safeName = htmlspecialchars($displayName, ENT_QUOTES, 'UTF-8');
        $safeOtp = htmlspecialchars($otp, ENT_QUOTES, 'UTF-8');

        return <<<HTML
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Kode Verifikasi ZChat</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #0c0d12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e5e7eb;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #14151f; border: 1px solid #262738; border-radius: 12px; padding: 32px 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.45);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">ZChat</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #9ca3af;">Verifikasi Pendaftaran Akun Pengguna</p>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.5; color: #d1d5db;">
      Halo <strong>{$safeName}</strong>,
    </p>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.5; color: #9ca3af;">
      Gunakan 6 digit kode verifikasi di bawah ini untuk mengonfirmasi akun ZChat Anda. Kode ini berlaku selama <strong>10 menit</strong>.
    </p>

    <div style="background-color: #1c1e2b; border: 1px dashed #3a3b50; border-radius: 8px; padding: 18px 12px; text-align: center; margin-bottom: 24px;">
      <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #60a5fa; display: inline-block;">{$safeOtp}</span>
    </div>

    <p style="margin: 0 0 20px 0; font-size: 12.5px; color: #9ca3af; line-height: 1.5;">
      Jangan pernah membagikan kode ini kepada siapa pun, termasuk pihak yang mengatasnamakan ZChat. Jika Anda tidak merasa mendaftar di ZChat, abaikan email ini.
    </p>

    <div style="border-top: 1px solid #232435; padding-top: 16px; text-align: center;">
      <p style="margin: 0; font-size: 11.5px; color: #6b7280;">
        Pesan otomatis dikirim oleh ZChat Server Engine.
      </p>
    </div>
  </div>
</body>
</html>
HTML;
    }
}
