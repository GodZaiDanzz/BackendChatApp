<?php

namespace App\Http\Controllers;

use App\Events\CallAccepted;
use App\Events\CallEnded;
use App\Events\CallRejected;
use App\Events\CallSignal;
use App\Events\IncomingCall;
use App\Http\Requests\CallSignalRequest;
use App\Http\Requests\DeviceTokenRequest;
use App\Http\Requests\StartCallRequest;
use App\Models\Call;
use App\Models\Device;
use App\Services\FcmService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CallController extends Controller
{
    use AuthorizesRequests;

    /**
     * Get ICE servers configuration (STUN + time-limited TURN).
     */
    public function iceServers(Request $request): JsonResponse
    {
        $iceServers = [
            [
                'urls' => 'stun:stun.l.google.com:19302',
            ],
        ];

        $turnUrl = config('services.turn.url');
        $turnSecret = config('services.turn.secret');

        if ($turnUrl && $turnSecret) {
            $expiryTimestamp = time() + 3600; // 1 hour validity
            $username = "{$expiryTimestamp}:{$request->user()->id}";
            $credential = base64_encode(hash_hmac('sha1', $username, $turnSecret, true));

            // Support comma-separated turn urls (e.g. turn:host:3478,turns:host:5349)
            $urls = array_values(array_filter(array_map('trim', explode(',', $turnUrl))));

            $iceServers[] = [
                'urls'       => count($urls) === 1 ? $urls[0] : $urls,
                'username'   => $username,
                'credential' => $credential,
            ];
        }

        return response()->json([
            'ice_servers' => $iceServers,
            'iceServers'  => $iceServers,
        ]);
    }

    /**
     * Start a new call.
     */
    public function store(StartCallRequest $request, FcmService $fcmService): JsonResponse
    {
        $user = $request->user();
        $calleeId = (int) $request->validated('callee_id');
        $type = $request->validated('type', 'audio') ?: 'audio';

        // Disallow calling self
        if ((int) $user->id === $calleeId) {
            return response()->json([
                'message' => 'Cannot call yourself.',
                'errors'  => [
                    'callee_id' => ['You cannot start a call with yourself.'],
                ],
            ], 422);
        }

        // Check if callee currently has an active call (ringing or accepted)
        $isBusy = Call::where(function ($q) use ($calleeId) {
            $q->where('caller_id', $calleeId)
              ->orWhere('callee_id', $calleeId);
        })
        ->whereIn('status', ['ringing', 'accepted'])
        ->exists();

        if ($isBusy) {
            $busyCall = Call::create([
                'caller_id'  => $user->id,
                'callee_id'  => $calleeId,
                'type'       => $type,
                'status'     => 'busy',
                'started_at' => now(),
                'ended_at'   => now(),
            ]);

            return response()->json([
                'message' => 'Callee is currently busy on another call.',
                'call'    => $busyCall->load(['caller', 'callee']),
            ], 409);
        }

        $call = DB::transaction(function () use ($user, $calleeId, $type) {
            return Call::create([
                'caller_id'  => $user->id,
                'callee_id'  => $calleeId,
                'type'       => $type,
                'status'     => 'ringing',
                'started_at' => now(),
            ]);
        });

        $call->load(['caller', 'callee']);

        // Broadcast incoming call event
        broadcast(new IncomingCall($call));

        // Send FCM high-priority push notification for background/locked state
        $fcmService->sendIncomingCall($call->callee, $call, $user);

        return response()->json([
            'message' => 'Call initiated successfully.',
            'call'    => $call,
        ], 201);
    }

    /**
     * Accept a ringing call (callee only).
     */
    public function accept(Request $request, Call $call): JsonResponse
    {
        $this->authorize('accept', $call);

        if ($call->status !== 'ringing') {
            return response()->json([
                'message' => 'Call is not in a ringing state.',
            ], 422);
        }

        $call = DB::transaction(function () use ($call) {
            $call->update([
                'status'      => 'accepted',
                'answered_at' => now(),
            ]);
            return $call->fresh(['caller', 'callee']);
        });

        broadcast(new CallAccepted($call));

        return response()->json([
            'message' => 'Call accepted successfully.',
            'call'    => $call,
        ]);
    }

    /**
     * Reject a ringing call (callee only).
     */
    public function reject(Request $request, Call $call): JsonResponse
    {
        $this->authorize('reject', $call);

        if (in_array($call->status, ['accepted', 'rejected', 'missed', 'ended'])) {
            return response()->json([
                'message' => 'Call has already been answered or ended.',
            ], 422);
        }

        $call = DB::transaction(function () use ($call) {
            $call->update([
                'status'   => 'rejected',
                'ended_at' => now(),
            ]);
            return $call->fresh(['caller', 'callee']);
        });

        broadcast(new CallRejected($call, 'rejected'));

        return response()->json([
            'message' => 'Call rejected successfully.',
            'call'    => $call,
        ]);
    }

    /**
     * End an active or ringing call (caller or callee).
     */
    public function end(Request $request, Call $call): JsonResponse
    {
        $this->authorize('end', $call);

        $currentUser = $request->user();
        $peerId = (int) $call->caller_id === (int) $currentUser->id
            ? (int) $call->callee_id
            : (int) $call->caller_id;

        if (!in_array($call->status, ['rejected', 'missed', 'ended'])) {
            $call = DB::transaction(function () use ($call) {
                $call->update([
                    'status'   => 'ended',
                    'ended_at' => now(),
                ]);
                return $call->fresh(['caller', 'callee']);
            });

            broadcast(new CallEnded($call, $peerId, 'ended'));
        }

        return response()->json([
            'message' => 'Call ended successfully.',
            'call'    => $call->loadMissing(['caller', 'callee']),
        ]);
    }

    /**
     * Forward WebRTC signaling messages (offer, answer, ice-candidate).
     */
    public function signal(CallSignalRequest $request, Call $call): JsonResponse
    {
        $this->authorize('signal', $call);

        $currentUser = $request->user();
        $peerId = (int) $call->caller_id === (int) $currentUser->id
            ? (int) $call->callee_id
            : (int) $call->caller_id;

        $type = $request->validated('type');
        $payload = $request->validated('payload');

        broadcast(new CallSignal(
            call: $call,
            recipientId: $peerId,
            senderId: (int) $currentUser->id,
            type: $type,
            payload: $payload
        ));

        return response()->json([
            'success' => true,
        ]);
    }

    /**
     * Retrieve authenticated user's call history (paginated).
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $calls = Call::where(function ($q) use ($userId) {
            $q->where('caller_id', $userId)
              ->orWhere('callee_id', $userId);
        })
        ->with(['caller', 'callee'])
        ->orderByDesc('id')
        ->paginate($request->integer('per_page', 20));

        return response()->json($calls);
    }

    /**
     * Store or update device FCM token for push notifications.
     */
    public function updateDeviceToken(DeviceTokenRequest $request): JsonResponse
    {
        $user = $request->user();
        $token = $request->validated('fcm_token');

        $user->update(['fcm_token' => $token]);

        if (class_exists(Device::class)) {
            Device::updateOrCreate(
                ['fcm_token' => $token],
                ['user_id' => $user->id]
            );
        }

        return response()->json([
            'message'   => 'Device token updated successfully.',
            'fcm_token' => $token,
        ]);
    }
}
