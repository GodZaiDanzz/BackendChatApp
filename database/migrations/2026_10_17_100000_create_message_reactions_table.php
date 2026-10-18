<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('message_reactions', function (Blueprint $table) {
            $table->id();
            $table->string('message_type', 16)->default('direct'); // 'direct' or 'group'
            $table->unsignedBigInteger('message_id');
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('emoji', 32);
            $table->timestamps();

            $table->index(['message_type', 'message_id']);
            $table->unique(['message_type', 'message_id', 'user_id', 'emoji'], 'msg_reaction_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_reactions');
    }
};
