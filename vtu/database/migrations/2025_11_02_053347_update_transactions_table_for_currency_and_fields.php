<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            // ✅ Add new columns
            $table->string('user_role')->nullable()->after('user_id'); // admin, agent, customer
            $table->string('currency')->default('GHS')->after('amount'); // Ghanaian cedi
            $table->string('description')->nullable()->after('reference');
            
            // ✅ Modify type if needed (convert enum to string)
            $table->string('type')->change(); // allows 'credit', 'debit', etc.
            
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['user_role', 'currency', 'description']);
            $table->enum('type', ['airtime', 'data', 'fund'])->change();
          
        });
    }
};

