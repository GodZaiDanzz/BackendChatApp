<?php

namespace App\Providers;

use App\Models\Call;
use App\Policies\CallPolicy;
use Illuminate\Support\Facades\Gate;
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
        Gate::policy(Call::class, CallPolicy::class);

        if (is_dir(resource_path('FrontEndChatApp'))) {
            \Illuminate\Support\Facades\View::addLocation(resource_path('FrontEndChatApp'));
            \Illuminate\Support\Facades\View::addNamespace('chat', resource_path('FrontEndChatApp'));
        }
    }
}
