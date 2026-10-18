<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('group_message_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained('groups')->cascadeOnDelete();
            $table->unsignedBigInteger('group_message_id')->nullable();
            $table->string('client_uuid', 64);
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['delivered', 'read']);
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->unique(['group_id', 'client_uuid', 'user_id']);
            $table->index(['group_id', 'client_uuid', 'status']);
            $table->index(['group_id', 'group_message_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_message_receipts');
    }
};
