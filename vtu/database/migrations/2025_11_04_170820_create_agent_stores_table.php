<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agent_stores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('store_name')->nullable(); // e.g. Augustine Data Hub
            $table->string('store_slug')->unique(); // used for /store/slug
            $table->string('description')->nullable(); // short about/bio
            $table->string('banner_image')->nullable(); // banner for store page
            $table->string('logo')->nullable(); // store logo
            $table->string('whatsapp_number')->nullable(); // for share/contact
            $table->boolean('active')->default(true); // store on/off
            $table->json('meta')->nullable(); // any future extras
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_stores');
    }
};
