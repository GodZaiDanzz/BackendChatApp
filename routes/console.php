<?php

use App\Models\Message;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(function () {
    Message::whereIn('status', ['delivered', 'read'])
        ->where('created_at', '<', now()->subDays(7))
        ->delete();
})->daily();
