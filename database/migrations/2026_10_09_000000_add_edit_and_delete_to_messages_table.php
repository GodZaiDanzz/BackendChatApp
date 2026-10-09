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
            if (!Schema::hasColumn('messages', 'is_edited')) {
                $table->boolean('is_edited')->default(false)->after('status');
            }
            if (!Schema::hasColumn('messages', 'is_deleted')) {
                $table->boolean('is_deleted')->default(false)->after('status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            if (Schema::hasColumn('messages', 'is_edited')) {
                $table->dropColumn('is_edited');
            }
            if (Schema::hasColumn('messages', 'is_deleted')) {
                $table->dropColumn('is_deleted');
            }
        });
    }
};
