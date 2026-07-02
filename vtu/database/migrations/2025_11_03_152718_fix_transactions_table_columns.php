<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            // Drop the old type column if it exists (airtime/data/fund)
            if (Schema::hasColumn('transactions', 'type')) {
                $table->dropColumn('type');
            }
        });

        Schema::table('transactions', function (Blueprint $table) {
            // Add wallet_id if not exists
            if (!Schema::hasColumn('transactions', 'wallet_id')) {
                $table->foreignId('wallet_id')->nullable()->constrained()->nullOnDelete()->after('user_id');
            }

            // Add the correct type column
            if (!Schema::hasColumn('transactions', 'type')) {
                $table->enum('type', ['credit', 'debit'])->after('amount');
            }

            // Add status column
            if (!Schema::hasColumn('transactions', 'status')) {
                $table->enum('status', ['pending', 'successful', 'failed'])->default('pending')->after('type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
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
