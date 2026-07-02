<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            // Drop the old 'type' column if it exists
            if (Schema::hasColumn('transactions', 'type')) {
                $table->dropColumn('type');
            }

            // Add the new 'wallet_id' foreign key
            if (!Schema::hasColumn('transactions', 'wallet_id')) {
                $table->foreignId('wallet_id')->nullable()->constrained()->nullOnDelete()->after('user_id');
            }

            // Add the new 'type' enum
            if (!Schema::hasColumn('transactions', 'type')) {
                $table->enum('type', ['credit', 'debit'])->after('amount');
            }

            // Add status column (if missing)
            if (!Schema::hasColumn('transactions', 'status')) {
                $table->enum('status', ['pending', 'successful', 'failed'])->default('pending')->after('type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            // Reverse changes safely
            if (Schema::hasColumn('transactions', 'wallet_id')) {
                $table->dropForeign(['wallet_id']);
                $table->dropColumn('wallet_id');
            }

            if (Schema::hasColumn('transactions', 'type')) {
                $table->dropColumn('type');
            }

            if (Schema::hasColumn('transactions', 'status')) {
                $table->dropColumn('status');
            }
        });
    }
};
