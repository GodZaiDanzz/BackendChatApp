<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PinnedChatMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'chat_type',
        'conversation_key',
        'target_id',
        'message_id',
        'client_uuid',
        'pinned_by_id',
        'sender_name',
        'body_snippet',
        'has_attachment',
        'attachment_type',
    ];

    protected $casts = [
        'has_attachment' => 'boolean',
        'target_id'      => 'integer',
        'message_id'     => 'integer',
    ];

    public function pinnedBy()
    {
        return $this->belongsTo(User::class, 'pinned_by_id');
    }

    /**
     * Compute standardized conversation key.
     */
    public static function computeConversationKey(string $chatType, int $userA, int $targetId): string
    {
        if ($chatType === 'group') {
            return 'group:' . $targetId;
        }

        $min = min($userA, $targetId);
        $max = max($userA, $targetId);
        return "{$min}:{$max}";
    }
}
