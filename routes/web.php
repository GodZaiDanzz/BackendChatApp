<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/download/chat.apk', function () {
    $path = public_path('download/chat.apk');
    if (file_exists($path)) {
        return response()->download($path);
    }
    return response()->json([
        'message' => 'APK belum diunggah ke server. Selesaikan rilis rilis APK di Fase 6.',
    ], 404);
});
