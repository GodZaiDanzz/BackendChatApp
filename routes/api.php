<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\DeviceController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

Broadcast::routes(['middleware' => ['auth:sanctum']]);

Route::post('/register',   [AuthController::class, 'register'])->middleware('throttle:6,1');
Route::post('/verify-otp', [AuthController::class, 'verifyOtp'])->middleware('throttle:12,1');
Route::post('/resend-otp', [AuthController::class, 'resendOtp'])->middleware('throttle:4,1');
Route::post('/login',      [AuthController::class, 'login'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/users/search', [UserController::class, 'search']);
    Route::get('/contacts', [ContactController::class, 'index']);
    Route::get('/contacts/requests', [ContactController::class, 'requests']);
    Route::post('/contacts', [ContactController::class, 'store']);
    Route::post('/contacts/accept', [ContactController::class, 'accept']);
    Route::post('/contacts/reject', [ContactController::class, 'reject']);
    Route::post('/heartbeat', [ContactController::class, 'heartbeat']);
    Route::post('/devices', [DeviceController::class, 'store']);
    Route::post('/messages', [MessageController::class, 'store'])->middleware('throttle:60,1');
    Route::put('/messages/{id}', [MessageController::class, 'update']);
    Route::delete('/messages/{id}', [MessageController::class, 'destroy']);
    Route::get('/messages/pending', [MessageController::class, 'pending']);
    Route::get('/messages/statuses', [MessageController::class, 'statuses']);
    Route::post('/messages/ack', [MessageController::class, 'ack']);
});
