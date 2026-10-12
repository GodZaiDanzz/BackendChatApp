<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Call extends Model
{
    use HasFactory;

    protected $fillable = [
        'caller_id',
        'callee_id',
        'type',
        'status',
        'started_at',
        'answered_at',
        'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at'  => 'datetime',
            'answered_at' => 'datetime',
            'ended_at'    => 'datetime',
        ];
    }

    public function caller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'caller_id');
    }

    public function callee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'callee_id');
    }
}
