<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('group_message_receipts') && !Schema::hasColumn('group_message_receipts', 'sender_id')) {
            Schema::table('group_message_receipts', function (Blueprint $table) {
                $table->unsignedBigInteger('sender_id')->nullable()->after('client_uuid');
                $table->index(['group_id', 'client_uuid', 'sender_id']);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('group_message_receipts') && Schema::hasColumn('group_message_receipts', 'sender_id')) {
            Schema::table('group_message_receipts', function (Blueprint $table) {
                $table->dropIndex(['group_id', 'client_uuid', 'sender_id']);
                $table->dropColumn('sender_id');
            });
        }
    }
};
