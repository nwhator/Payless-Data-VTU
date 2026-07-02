<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\CommissionSetting;

return new class extends Migration {
    public function up(): void {
        Schema::create('commission_settings', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['fixed', 'percent'])->default('fixed');
            $table->decimal('value', 12, 4)->default(0);
            $table->timestamps();
        });

        CommissionSetting::create(['type' => 'fixed', 'value' => 0]);
    }

    public function down(): void {
        Schema::dropIfExists('commission_settings');
    }
};
