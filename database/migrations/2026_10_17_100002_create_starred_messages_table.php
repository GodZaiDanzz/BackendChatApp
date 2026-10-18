<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('starred_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('message_type', 16)->default('direct'); // 'direct' or 'group'
            $table->unsignedBigInteger('message_id');
            $table->timestamps();

            $table->unique(['user_id', 'message_type', 'message_id'], 'user_starred_msg_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('starred_messages');
    }
};
