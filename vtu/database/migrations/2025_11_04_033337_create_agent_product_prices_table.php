<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agent_product_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->decimal('added_amount', 10, 2)->default(0);
            $table->decimal('agent_price', 10, 2)->default(0);
            $table->timestamps();

            $table->unique(['agent_id', 'product_id']); // prevent duplicates
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_product_prices');
    }
};
