<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use App\Models\Group;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('groups', function (Blueprint $table) {
            $table->string('invite_code', 32)->nullable()->unique()->after('group_key');
        });

        // Populate existing groups with random invite codes
        Group::whereNull('invite_code')->get()->each(function ($g) {
            $g->invite_code = Str::lower(Str::random(10));
            $g->saveQuietly();
        });
    }

    public function down(): void
    {
        Schema::table('groups', function (Blueprint $table) {
            $table->dropColumn('invite_code');
        });
    }
};
