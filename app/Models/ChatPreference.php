<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatPreference extends Model
{
    protected $fillable = [
        'user_id',
        'chat_type',
        'target_id',
        'is_pinned',
        'is_muted',
        'muted_until',
    ];

    protected $casts = [
        'is_pinned'   => 'boolean',
        'is_muted'    => 'boolean',
        'muted_until' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
