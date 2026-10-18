<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GroupMessageReceipt extends Model
{
    protected $fillable = [
        'group_id',
        'group_message_id',
        'client_uuid',
        'user_id',
        'status',
        'delivered_at',
        'read_at',
    ];

    protected $casts = [
        'delivered_at' => 'datetime',
        'read_at'      => 'datetime',
    ];

    public function group()
    {
        return $this->belongsTo(Group::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function groupMessage()
    {
        return $this->belongsTo(GroupMessage::class, 'group_message_id');
    }
}
