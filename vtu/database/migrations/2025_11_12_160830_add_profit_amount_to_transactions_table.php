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
        Schema::table('transactions', function (Blueprint $table) {
            // Admin's raw cost for the product (needed to calculate profit)
            $table->decimal('cost_price', 12, 2)->default(0.00)->after('amount');
            
            // The calculated profit margin for this specific transaction
            $table->decimal('profit_amount', 12, 2)->default(0.00)->after('cost_price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn('cost_price');
            $table->dropColumn('profit_amount');
        });
    }
};
