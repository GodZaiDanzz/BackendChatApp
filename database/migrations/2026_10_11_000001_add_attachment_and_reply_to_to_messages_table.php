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
        Schema::table('messages', function (Blueprint $table) {
            if (!Schema::hasColumn('messages', 'attachment')) {
                $table->json('attachment')->nullable()->after('body');
            }
            if (!Schema::hasColumn('messages', 'reply_to')) {
                $table->json('reply_to')->nullable()->after('attachment');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            if (Schema::hasColumn('messages', 'reply_to')) {
                $table->dropColumn('reply_to');
            }
            if (Schema::hasColumn('messages', 'attachment')) {
                $table->dropColumn('attachment');
            }
        });
    }
};
