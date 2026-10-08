<?php

namespace App\Http\Controllers;

use App\Events\FriendRequestAccepted;
use App\Events\FriendRequestSent;
use App\Models\Contact;
use App\Models\User;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    /**
     * Get accepted contacts for logged-in user.
     */
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $idsAsUser = Contact::where('user_id', $userId)->where('status', 'accepted')->pluck('contact_id')->toArray();
        $idsAsContact = Contact::where('contact_id', $userId)->where('status', 'accepted')->pluck('user_id')->toArray();

        $allFriendIds = array_unique(array_merge($idsAsUser, $idsAsContact));
        $contacts = User::whereIn('id', $allFriendIds)->get(['id', 'username', 'display_name']);

        return response()->json($contacts);
    }

    /**
     * Get pending friend requests received by logged-in user.
     */
    public function requests(Request $request)
    {
        $userId = $request->user()->id;

        $requesterIds = Contact::where('contact_id', $userId)->where('status', 'pending')->pluck('user_id');
        $requesters = User::whereIn('id', $requesterIds)->get(['id', 'username', 'display_name']);

        return response()->json($requesters);
    }

    /**
     * Send a friend request.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'contact_id' => 'required|exists:users,id',
        ]);

        $myId = $request->user()->id;
        $targetId = (int) $data['contact_id'];

        if ($targetId === $myId) {
            return response()->json(['message' => 'Tidak bisa menambahkan diri sendiri'], 422);
        }

        $existing = Contact::where(function ($q) use ($myId, $targetId) {
            $q->where('user_id', $myId)->where('contact_id', $targetId);
        })->orWhere(function ($q) use ($myId, $targetId) {
            $q->where('user_id', $targetId)->where('contact_id', $myId);
        })->first();

        if ($existing) {
            if ($existing->status === 'accepted') {
                return response()->json(['message' => 'Sudah menjadi teman'], 422);
            }
            if ($existing->status === 'pending') {
                return response()->json(['message' => 'Permintaan pertemanan sudah dikirim sebelumnya'], 422);
            }
        }

        $contact = Contact::create([
            'user_id'    => $myId,
            'contact_id' => $targetId,
            'status'     => 'pending',
        ]);

        // Broadcast real-time friend request event to receiver
        broadcast(new FriendRequestSent($request->user(), $targetId))->toOthers();

        return response()->json(['message' => 'Permintaan pertemanan berhasil dikirim', 'contact' => $contact], 201);
    }

    /**
     * Accept friend request.
     */
    public function accept(Request $request)
    {
        $data = $request->validate([
            'requester_id' => 'required|exists:users,id',
        ]);

        $myId = $request->user()->id;
        $requesterId = (int) $data['requester_id'];

        $contact = Contact::where('user_id', $requesterId)
            ->where('contact_id', $myId)
            ->where('status', 'pending')
            ->first();

        if (!$contact) {
            return response()->json(['message' => 'Permintaan pertemanan tidak ditemukan'], 404);
        }

        $contact->update(['status' => 'accepted']);

        // Broadcast real-time friend accepted event to requester
        broadcast(new FriendRequestAccepted($request->user(), $requesterId))->toOthers();

        return response()->json(['message' => 'Permintaan pertemanan diterima']);
    }

    /**
     * Reject friend request.
     */
    public function reject(Request $request)
    {
        $data = $request->validate([
            'requester_id' => 'required|exists:users,id',
        ]);

        $myId = $request->user()->id;
        $requesterId = (int) $data['requester_id'];

        Contact::where('user_id', $requesterId)
            ->where('contact_id', $myId)
            ->where('status', 'pending')
            ->delete();

        return response()->json(['message' => 'Permintaan pertemanan ditolak']);
    }
}
