<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pinned_chat_messages', function (Blueprint $table) {
            $table->id();
            $table->string('chat_type', 16)->default('direct'); // 'direct' or 'group'
            $table->string('conversation_key', 64)->index();    // e.g. '1:2' or 'group:5'
            $table->unsignedBigInteger('target_id');             // other user id or group id
            $table->unsignedBigInteger('message_id');
            $table->string('client_uuid')->nullable()->index();
            $table->foreignId('pinned_by_id')->constrained('users')->cascadeOnDelete();
            $table->string('sender_name')->nullable();
            $table->text('body_snippet')->nullable();
            $table->boolean('has_attachment')->default(false);
            $table->string('attachment_type')->nullable();
            $table->timestamps();

            $table->unique(['conversation_key', 'message_id'], 'conv_msg_pin_unique');
            $table->index(['conversation_key', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pinned_chat_messages');
    }
};
