<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\DeviceController;
use App\Http\Controllers\GroupController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

Broadcast::routes(['middleware' => ['auth:sanctum']]);

Route::post('/register',   [AuthController::class, 'register'])->middleware('throttle:6,1');
Route::post('/verify-otp', [AuthController::class, 'verifyOtp'])->middleware('throttle:12,1');
Route::post('/resend-otp', [AuthController::class, 'resendOtp'])->middleware('throttle:4,1');
Route::post('/login',      [AuthController::class, 'login'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return response()->json($request->user());
    });
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/user/profile', [UserController::class, 'updateProfile']);
    Route::get('/users/search', [UserController::class, 'search']);
    Route::get('/contacts', [ContactController::class, 'index']);
    Route::get('/contacts/requests', [ContactController::class, 'requests']);
    Route::post('/contacts', [ContactController::class, 'store']);
    Route::post('/contacts/accept', [ContactController::class, 'accept']);
    Route::post('/contacts/reject', [ContactController::class, 'reject']);
    Route::delete('/contacts/{id}', [ContactController::class, 'destroy']);
    Route::post('/heartbeat', [ContactController::class, 'heartbeat']);
    Route::post('/devices', [DeviceController::class, 'store']);
    Route::post('/messages/upload', [MessageController::class, 'upload']);
    Route::post('/messages', [MessageController::class, 'store'])->middleware('throttle:60,1');
    Route::put('/messages/{id}', [MessageController::class, 'update']);
    Route::delete('/messages/{id}', [MessageController::class, 'destroy']);
    Route::get('/messages/pending', [MessageController::class, 'pending']);
    Route::get('/messages/statuses', [MessageController::class, 'statuses']);
    Route::post('/messages/ack', [MessageController::class, 'ack']);
    Route::post('/typing', [MessageController::class, 'typing']);
    Route::get('/typing-status', [MessageController::class, 'typingStatus']);

    // Group messaging and management
    Route::get('/groups', [GroupController::class, 'index']);
    Route::post('/groups', [GroupController::class, 'store']);
    Route::post('/groups/sync', [GroupController::class, 'sync']);
    Route::get('/groups/{id}', [GroupController::class, 'show']);
    Route::put('/groups/{id}', [GroupController::class, 'update']);
    Route::delete('/groups/{id}', [GroupController::class, 'destroy']);
    Route::post('/groups/{id}/members', [GroupController::class, 'addMembers']);
    Route::delete('/groups/{id}/members/{userId}', [GroupController::class, 'removeMember']);
    Route::get('/groups/{id}/messages', [GroupController::class, 'messages']);
    Route::post('/groups/{id}/messages', [GroupController::class, 'storeMessage']);
    Route::put('/groups/{id}/messages/{messageId}', [GroupController::class, 'updateMessage']);
    Route::delete('/groups/{id}/messages/{messageId}', [GroupController::class, 'destroyMessage']);

    // WebRTC Voice Channels and Calls
    Route::post('/voice/signal', [\App\Http\Controllers\VoiceCallController::class, 'sendSignal']);
    Route::get('/voice/active-call', [\App\Http\Controllers\VoiceCallController::class, 'getActiveCall']);
    Route::get('/voice/call-logs', [\App\Http\Controllers\VoiceCallController::class, 'getCallLogs']);
    Route::post('/voice/groups/{id}/join', [\App\Http\Controllers\VoiceCallController::class, 'joinGroupVoice']);
    Route::post('/voice/groups/{id}/leave', [\App\Http\Controllers\VoiceCallController::class, 'leaveGroupVoice']);
    Route::get('/voice/groups/{id}/status', [\App\Http\Controllers\VoiceCallController::class, 'getGroupVoiceStatus']);
});
