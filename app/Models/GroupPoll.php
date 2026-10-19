<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GroupPoll extends Model
{
    protected $fillable = [
        'group_id',
        'created_by',
        'question',
        'multiple_answers',
        'is_closed',
    ];

    protected $casts = [
        'multiple_answers' => 'boolean',
        'is_closed' => 'boolean',
    ];

    public function group()
    {
        return $this->belongsTo(Group::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function options()
    {
        return $this->hasMany(GroupPollOption::class, 'poll_id');
    }

    public function votes()
    {
        return $this->hasMany(GroupPollVote::class, 'poll_id');
    }
}
