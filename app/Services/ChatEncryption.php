<?php

namespace App\Services;

class ChatEncryption
{
    /**
     * Derive a deterministic 256-bit pairwise key between two users.
     */
    public static function deriveKey(int $userA, int $userB): string
    {
        $minId = min($userA, $userB);
        $maxId = max($userA, $userB);
        $masterKey = config('app.key') ?: 'zchat_default_master_encryption_key';

        return hash_hmac('sha256', "zchat_e2ee_{$minId}_{$maxId}", $masterKey);
    }

    /**
     * Determine whether payload is already encrypted.
     */
    public static function isEncrypted(?string $payload): bool
    {
        if (empty($payload)) {
            return false;
        }

        return str_starts_with($payload, 'enc:v1:');
    }

    /**
     * Encrypt plaintext string using AES-256-GCM.
     */
    public static function encrypt(string $plainText, int $userA, int $userB): string
    {
        $hexKey = self::deriveKey($userA, $userB);
        $binaryKey = hex2bin($hexKey);
        $iv = openssl_random_pseudo_bytes(12);
        $tag = '';

        $cipher = openssl_encrypt($plainText, 'aes-256-gcm', $binaryKey, OPENSSL_RAW_DATA, $iv, $tag);
        if ($cipher === false) {
            return $plainText;
        }

        return 'enc:v1:' . base64_encode($iv) . ':' . base64_encode($cipher . $tag);
    }

    /**
     * Decrypt ciphertext payload using AES-256-GCM.
     */
    public static function decrypt(string $payload, int $userA, int $userB): string
    {
        if (!self::isEncrypted($payload)) {
            return $payload;
        }

        $body = substr($payload, 7);
        $segments = explode(':', $body, 2);
        if (count($segments) !== 2) {
            return $payload;
        }

        $iv = base64_decode($segments[0]);
        $rawCipherWithTag = base64_decode($segments[1]);
        if (strlen($rawCipherWithTag) < 16) {
            return $payload;
        }

        $ciphertext = substr($rawCipherWithTag, 0, -16);
        $tag = substr($rawCipherWithTag, -16);
        $binaryKey = hex2bin(self::deriveKey($userA, $userB));

        $decrypted = openssl_decrypt($ciphertext, 'aes-256-gcm', $binaryKey, OPENSSL_RAW_DATA, $iv, $tag);
        return $decrypted !== false ? $decrypted : $payload;
    }
}
