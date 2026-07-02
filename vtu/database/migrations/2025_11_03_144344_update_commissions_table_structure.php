<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('commissions', function (Blueprint $table) {
            // Remove old columns that are no longer needed
            $table->dropForeign(['agent_id']);
            $table->dropForeign(['transaction_id']);
            $table->dropColumn(['agent_id', 'transaction_id', 'amount']);

            // Add new structure
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('role', ['admin', 'agent']);
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('sale_reference');
            $table->decimal('cost_price', 12, 2);
            $table->decimal('sell_price', 12, 2);
            $table->decimal('profit', 12, 2);
            $table->string('type'); // e.g. data, airtime, etc.
        });
    }

    public function down(): void {
        Schema::table('commissions', function (Blueprint $table) {
            // Revert to old structure if needed
            $table->dropForeign(['user_id']);
            $table->dropForeign(['product_id']);
            $table->dropColumn([
                'user_id',
                'role',
                'product_id',
                'sale_reference',
                'cost_price',
                'sell_price',
                'profit',
                'type',
            ]);

            $table->foreignId('agent_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('transaction_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
        });
    }
};
