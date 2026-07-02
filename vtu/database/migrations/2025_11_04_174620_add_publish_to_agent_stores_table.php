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
    Schema::table('agent_stores', function (Blueprint $table) {
        $table->enum('publish', ['draft', 'published'])->default('draft')->after('active');
    });
}

public function down(): void
{
    Schema::table('agent_stores', function (Blueprint $table) {
        $table->dropColumn('publish');
    });
}

};
