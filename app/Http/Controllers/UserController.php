<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function search(Request $request)
    {
        $query = $request->query('q', '');

        if (empty($query)) {
            return response()->json([]);
        }

        $users = User::where('id', '!=', $request->user()->id)
            ->where(function ($q) use ($query) {
                $q->where('username', 'like', "%{$query}%")
                  ->orWhere('display_name', 'like', "%{$query}%");
            })
            ->limit(20)
            ->get(['id', 'username', 'display_name']);

        return response()->json($users);
    }
}
