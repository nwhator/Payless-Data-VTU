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
        Schema::table('orders', function (Blueprint $table) {
            $table->string('reference')->nullable()->after('payment_reference');       // vendor reference
            $table->string('transaction_id')->nullable()->after('reference');          // vendor transaction ID
            $table->string('currency', 10)->default('GHS')->after('amount');           // currency
            $table->json('vendor_response')->nullable()->after('transaction_id');      // full API response
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['reference', 'transaction_id', 'currency', 'vendor_response']);
        });
    }

};
