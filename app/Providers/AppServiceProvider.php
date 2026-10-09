<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (is_dir(resource_path('FrontEndChatApp'))) {
            \Illuminate\Support\Facades\View::addLocation(resource_path('FrontEndChatApp'));
            \Illuminate\Support\Facades\View::addNamespace('chat', resource_path('FrontEndChatApp'));
        }
    }
}
