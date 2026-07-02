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
        Schema::create('store_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('agent_stores')->cascadeOnDelete();
            $table->unsignedBigInteger('visits')->default(0);
            $table->unsignedBigInteger('link_orders')->default(0);
            $table->unsignedBigInteger('purchases')->default(0);
            $table->timestamps();
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('store_metrics');
    }
};
