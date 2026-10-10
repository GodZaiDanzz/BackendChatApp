<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('messages')) {
            Schema::table('messages', function (Blueprint $table) {
                $table->string('client_uuid', 100)->change();
            });
        }

        if (Schema::hasTable('message_receipts')) {
            Schema::table('message_receipts', function (Blueprint $table) {
                $table->string('client_uuid', 100)->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('messages')) {
            Schema::table('messages', function (Blueprint $table) {
                $table->uuid('client_uuid')->change();
            });
        }

        if (Schema::hasTable('message_receipts')) {
            Schema::table('message_receipts', function (Blueprint $table) {
                $table->uuid('client_uuid')->change();
            });
        }
    }
};
