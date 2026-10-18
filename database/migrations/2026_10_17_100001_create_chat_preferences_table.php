<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('chat_type', 16)->default('direct'); // 'direct' or 'group'
            $table->unsignedBigInteger('target_id'); // contact/user ID or group ID
            $table->boolean('is_pinned')->default(false);
            $table->boolean('is_muted')->default(false);
            $table->timestamp('muted_until')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'chat_type', 'target_id'], 'user_chat_pref_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_preferences');
    }
};
