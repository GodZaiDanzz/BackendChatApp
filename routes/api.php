<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CallController;
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
    Route::post('/user/profile', [UserController::class, 'updateProfile']);
    Route::post('/user/avatar', [UserController::class, 'uploadAvatar']);
    Route::delete('/user/avatar', [UserController::class, 'deleteAvatar']);
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
    Route::post('/messages/batch-delete', [MessageController::class, 'batchDestroy']);
    Route::get('/messages/pending', [MessageController::class, 'pending']);
    Route::get('/messages/statuses', [MessageController::class, 'statuses']);
    Route::post('/messages/ack', [MessageController::class, 'ack']);
    Route::post('/typing', [MessageController::class, 'typing']);
    Route::get('/typing-status', [MessageController::class, 'typingStatus']);

    // Message Reactions
    Route::post('/reactions/toggle', [\App\Http\Controllers\ReactionController::class, 'toggle']);
    Route::post('/reactions/batch', [\App\Http\Controllers\ReactionController::class, 'batch']);

    // Chat Preferences (Pin, Mute, Starred Messages)
    Route::get('/chats/preferences', [\App\Http\Controllers\ChatPreferenceController::class, 'index']);
    Route::get('/chat-preferences', [\App\Http\Controllers\ChatPreferenceController::class, 'index']);
    Route::post('/chats/pin', [\App\Http\Controllers\ChatPreferenceController::class, 'togglePin']);
    Route::post('/chat-preferences/pin', [\App\Http\Controllers\ChatPreferenceController::class, 'togglePin']);
    Route::post('/chats/mute', [\App\Http\Controllers\ChatPreferenceController::class, 'toggleMute']);
    Route::post('/chat-preferences/mute', [\App\Http\Controllers\ChatPreferenceController::class, 'toggleMute']);
    Route::get('/messages/starred', [\App\Http\Controllers\ChatPreferenceController::class, 'starred']);
    Route::get('/starred-messages', [\App\Http\Controllers\ChatPreferenceController::class, 'starred']);
    Route::post('/messages/star', [\App\Http\Controllers\ChatPreferenceController::class, 'toggleStar']);
    Route::post('/starred-messages/toggle', [\App\Http\Controllers\ChatPreferenceController::class, 'toggleStar']);

    // Group messaging and management
    Route::get('/groups', [GroupController::class, 'index']);
    Route::post('/groups', [GroupController::class, 'store']);
    Route::post('/groups/sync', [GroupController::class, 'sync']);
    Route::get('/groups/{id}', [GroupController::class, 'show']);
    Route::put('/groups/{id}', [GroupController::class, 'update']);
    Route::post('/groups/{id}', [GroupController::class, 'update']);
    Route::delete('/groups/{id}', [GroupController::class, 'destroy']);
    Route::post('/groups/{id}/members', [GroupController::class, 'addMembers']);
    Route::delete('/groups/{id}/members/{userId}', [GroupController::class, 'removeMember']);
    Route::get('/groups/{id}/messages', [GroupController::class, 'messages']);
    Route::post('/groups/{id}/messages', [GroupController::class, 'storeMessage']);
    Route::put('/groups/{id}/messages/{messageId}', [GroupController::class, 'updateMessage']);
    Route::delete('/groups/{id}/messages/{messageId}', [GroupController::class, 'destroyMessage']);
    Route::post('/groups/{id}/messages/batch-delete', [GroupController::class, 'batchDestroyMessages']);

    // WebRTC Voice Channels and Calls
    Route::post('/voice/signal', [\App\Http\Controllers\VoiceCallController::class, 'sendSignal']);
    Route::get('/voice/active-call', [\App\Http\Controllers\VoiceCallController::class, 'getActiveCall']);
    Route::get('/voice/call-logs', [\App\Http\Controllers\VoiceCallController::class, 'getCallLogs']);
    Route::post('/voice/groups/{id}/join', [\App\Http\Controllers\VoiceCallController::class, 'joinGroupVoice']);
    Route::post('/voice/groups/{id}/leave', [\App\Http\Controllers\VoiceCallController::class, 'leaveGroupVoice']);
    Route::get('/voice/groups/{id}/status', [\App\Http\Controllers\VoiceCallController::class, 'getGroupVoiceStatus']);

    // Device token registration
    Route::post('/device-token', [CallController::class, 'updateDeviceToken']);

    // 1-on-1 WebRTC Calls
    Route::get('/calls/ice-servers', [CallController::class, 'iceServers']);
    Route::get('/calls', [CallController::class, 'index']);
    Route::post('/calls', [CallController::class, 'store']);
    Route::post('/calls/{call}/accept', [CallController::class, 'accept']);
    Route::post('/calls/{call}/reject', [CallController::class, 'reject']);
    Route::post('/calls/{call}/end', [CallController::class, 'end']);
    Route::post('/calls/{call}/signal', [CallController::class, 'signal']);
});
