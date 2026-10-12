<?php

namespace App\Policies;

use App\Models\Call;
use App\Models\User;

class CallPolicy
{
    /**
     * Determine whether the user can view the call details.
     */
    public function view(User $user, Call $call): bool
    {
        return (int) $user->id === (int) $call->caller_id || (int) $user->id === (int) $call->callee_id;
    }

    /**
     * Determine whether the user can accept the call (callee only).
     */
    public function accept(User $user, Call $call): bool
    {
        return (int) $user->id === (int) $call->callee_id && $call->status === 'ringing';
    }

    /**
     * Determine whether the user can reject the call (callee only).
     */
    public function reject(User $user, Call $call): bool
    {
        return (int) $user->id === (int) $call->callee_id && $call->status === 'ringing';
    }

    /**
     * Determine whether the user can end the call (either caller or callee).
     */
    public function end(User $user, Call $call): bool
    {
        return (int) $user->id === (int) $call->caller_id || (int) $user->id === (int) $call->callee_id;
    }

    /**
     * Determine whether the user can exchange WebRTC signals (caller or callee).
     */
    public function signal(User $user, Call $call): bool
    {
        return ((int) $user->id === (int) $call->caller_id || (int) $user->id === (int) $call->callee_id)
            && in_array($call->status, ['ringing', 'accepted']);
    }
}
