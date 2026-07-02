<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Drop unneeded old columns
            $table->dropColumn(['sku', 'type', 'api_code', 'base_price', 'display_price', 'meta']);

            // Modify existing network column to enum
            $table->enum('network', ['MTN', 'Telcel', 'Airtel', 'Glo', 'Vodafone'])->nullable()->change();

            // Add new columns
            $table->string('product_code')->unique()->after('id');
            $table->string('category')->nullable()->after('name');
            $table->string('capacity')->nullable()->after('category');
            $table->decimal('capacity_value', 8, 2)->nullable()->after('capacity');
            $table->string('capacity_unit')->nullable()->after('capacity_value');
            $table->string('validity')->nullable()->after('capacity_unit');
            $table->decimal('price', 10, 2)->after('validity');
            $table->string('currency', 10)->default('GHS')->after('price');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Recreate dropped columns
            $table->string('sku')->nullable();
            $table->enum('type', ['data', 'airtime']);
            $table->string('api_code')->nullable();
            $table->decimal('base_price', 12, 2);
            $table->decimal('display_price', 12, 2);
            $table->json('meta')->nullable();

            // Revert network column to string
            $table->string('network')->nullable()->change();

            // Drop new columns
            $table->dropColumn([
                'product_code',
                'category',
                'capacity',
                'capacity_value',
                'capacity_unit',
                'validity',
                'price',
                'currency',
            ]);
        });
    }
};
