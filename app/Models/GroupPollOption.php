<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GroupPollOption extends Model
{
    protected $fillable = [
        'poll_id',
        'option_text',
    ];

    public function poll()
    {
        return $this->belongsTo(GroupPoll::class, 'poll_id');
    }

    public function votes()
    {
        return $this->hasMany(GroupPollVote::class, 'option_id');
    }
}
