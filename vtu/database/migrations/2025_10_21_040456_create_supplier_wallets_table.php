<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\SupplierWallet;

return new class extends Migration {
    public function up(): void {
        Schema::create('supplier_wallets', function (Blueprint $table) {
            $table->id();
            $table->decimal('balance', 14, 2)->default(0);
            $table->string('currency', 8)->default('GHS');
            $table->timestamps();
        });

        // seed initial record cleanly using model
        SupplierWallet::create(['balance' => 0, 'currency' => 'GHS']);
    }

    public function down(): void {
        Schema::dropIfExists('supplier_wallets');
    }
};
