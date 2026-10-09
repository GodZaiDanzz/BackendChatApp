<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MessageReceipt extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'sender_id',
        'client_uuid',
        'message_id',
        'status',
        'created_at',
    ];

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
