<?php

// database/migrations/2025_10_31_000000_create_withdrawal_requests_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('withdrawal_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');          // agent requesting
            $table->unsignedBigInteger('wallet_id');        // wallet referenced
            $table->decimal('amount', 16, 2);
            $table->string('payout_method')->nullable();    // e.g. "bank:GTB", "paystack"
            $table->text('note')->nullable();               // agent note
            $table->string('status')->default('pending');   // pending, approved, declined
            $table->unsignedBigInteger('processed_by')->nullable(); // admin id who processed
            $table->text('decline_reason')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('wallet_id')->references('id')->on('wallets')->cascadeOnDelete();
            $table->foreign('processed_by')->references('id')->on('users')->nullOnDelete();
            $table->index(['status']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('withdrawal_requests');
    }
};
