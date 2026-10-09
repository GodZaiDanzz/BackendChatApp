<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/chat', function () {
    return view('index');
});

Route::get('/chat-assets/{type}/{file}', function (string $type, string $file) {
    $mimeTypes = [
        'css' => 'text/css',
        'js'  => 'application/javascript',
        'svg' => 'image/svg+xml',
    ];

    if (!isset($mimeTypes[$type])) {
        abort(404);
    }

    $cleanFile = basename($file);
    $path = resource_path("FrontEndChatApp/{$type}/{$cleanFile}");

    if (!file_exists($path)) {
        abort(404);
    }

    return response()->file($path, [
        'Content-Type'  => $mimeTypes[$type],
        'Cache-Control' => 'no-cache, private',
    ]);
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
