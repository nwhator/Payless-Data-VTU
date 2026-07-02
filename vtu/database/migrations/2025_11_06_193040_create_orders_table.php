<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();

            // 🔹 Relationships
            $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // buyer (customer)
            $table->foreignId('agent_id')->nullable()->constrained('users')->nullOnDelete(); // store owner (agent)
            $table->foreignId('store_id')->nullable()->constrained('agent_stores')->nullOnDelete();

            // 🔹 Order info
            $table->string('network'); // e.g. MTN, AirtelTigo
            $table->string('recipient'); // phone number or account
            $table->decimal('data_volume', 8, 2)->nullable(); // GB or MB
            $table->decimal('amount', 10, 2); // purchase amount

            // 🔹 Payment & status tracking
            $table->string('payment_status')->default('pending'); // pending | successful | failed
            $table->string('status')->default('processing'); // processing | completed | failed | refunded
            $table->string('payment_reference')->nullable();

            // 🔹 Analytics
            $table->string('order_source')->nullable(); // e.g. 'agent_store', 'dashboard'
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
