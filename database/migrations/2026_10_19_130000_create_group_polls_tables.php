<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('group_polls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained('groups')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('question', 255);
            $table->boolean('multiple_answers')->default(false);
            $table->boolean('is_closed')->default(false);
            $table->timestamps();

            $table->index(['group_id', 'created_at']);
        });

        Schema::create('group_poll_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('poll_id')->constrained('group_polls')->cascadeOnDelete();
            $table->string('option_text', 255);
            $table->timestamps();
        });

        Schema::create('group_poll_votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('poll_id')->constrained('group_polls')->cascadeOnDelete();
            $table->foreignId('option_id')->constrained('group_poll_options')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['poll_id', 'option_id', 'user_id']);
            $table->index(['poll_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_poll_votes');
        Schema::dropIfExists('group_poll_options');
        Schema::dropIfExists('group_polls');
    }
};
