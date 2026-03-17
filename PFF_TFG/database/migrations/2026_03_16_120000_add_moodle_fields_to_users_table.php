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
        Schema::table('users', function (Blueprint $table): void {
            $table->string('moodle_username')->nullable()->after('email');
            $table->text('moodle_password')->nullable()->after('password');
            $table->json('moodle_notification_preferences')->nullable()->after('moodle_password');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'moodle_username',
                'moodle_password',
                'moodle_notification_preferences',
            ]);
        });
    }
};
