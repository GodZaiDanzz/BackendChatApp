<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GroupMessage extends Model
{
    protected $fillable = [
        'client_uuid',
        'group_id',
        'sender_id',
        'body',
        'attachment',
        'reply_to',
        'is_edited',
        'is_deleted',
    ];

    protected $casts = [
        'attachment' => 'array',
        'reply_to'   => 'array',
        'is_edited'  => 'boolean',
        'is_deleted' => 'boolean',
    ];

    public function group()
    {
        return $this->belongsTo(Group::class);
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function receipts()
    {
        return $this->hasMany(GroupMessageReceipt::class, 'client_uuid', 'client_uuid');
    }
}
