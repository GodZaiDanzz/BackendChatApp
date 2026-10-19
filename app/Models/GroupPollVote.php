<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GroupPollVote extends Model
{
    protected $fillable = [
        'poll_id',
        'option_id',
        'user_id',
    ];

    public function poll()
    {
        return $this->belongsTo(GroupPoll::class, 'poll_id');
    }

    public function option()
    {
        return $this->belongsTo(GroupPollOption::class, 'option_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
