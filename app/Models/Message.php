<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    protected $fillable = [
        'client_uuid',
        'sender_id',
        'receiver_id',
        'body',
        'attachment',
        'reply_to',
        'status',
        'is_edited',
        'is_deleted',
    ];

    protected $casts = [
        'attachment' => 'array',
        'reply_to'   => 'array',
        'is_edited'  => 'boolean',
        'is_deleted' => 'boolean',
    ];

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'receiver_id');
    }
}
