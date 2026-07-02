<?php

namespace App\Http\Controllers;

use App\Models\AgentStore;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Intervention\Image\Facades\Image;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use Illuminate\Support\Facades\Log;
use Intervention\Image\Encoders\JpegEncoder;

class AgentStoreController extends Controller
{
    /**
     * Show current agent's store details
     */
    public function show()
    {
        $store = AgentStore::where('user_id', Auth::id())->first();

        return response()->json([
            'success' => true,
            'store' => $store
        ]);
    }

    /**
     * Create or update store settings
     */
    public function generateBanner(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:120',
            'slug' => 'nullable|string|max:120',
        ]);

        $name = trim($request->name);
        $slug = $request->slug ?: Str::slug($name);
        $wordCount = str_word_count($name);

        // Define marketing text variations
        $multiWordPhrases = [
            "Get Affordable Data from {$name}",
            "Power Your Connectivity with {$name}",
            "Top Up Instantly with {$name}",
            "Fast, Reliable Data — Only at {$name}",
            "Stay Connected. Stay Smart. Powered by {$name}",
            "Your Trusted Data Partner — {$name}",
            "Data Deals You’ll Love from {$name}",
            "Experience Seamless Data Service with {$name}",
            "Affordable Data, Trusted by Many — {$name}",
            "Simplify Your Data Life with {$name}",
        ];

        // Smart text logic
        if ($wordCount === 1) {
            if (rand(0, 1) === 0) {
                $text = "{$name} — Your Affordable Data Partner";
            } else {
                $text = "Get Affordable Data from {$name} Store";
            }
        } else {
            $text = $multiWordPhrases[array_rand($multiWordPhrases)];
        }

        // Create manager instance
        $manager = new ImageManager(new Driver());

        // Create banner 1200x400
        $image = $manager->create(1200, 400)->fill('#042028');

        // Add banner text
        $fontPath = resource_path('fonts/Inter_24pt-Bold.ttf');
        // $image->text($text, 600, 200, function ($font) use ($fontPath) {
        //     if (file_exists($fontPath)) {
        //         $font->file($fontPath);
        //     }
        //     $font->size(36);
        //     $font->color('#ffffff');
        //     $font->align('center');
        //     $font->valign('center');
        // });

        // Ensure directory
        if (!Storage::disk('public')->exists('banners')) {
            Storage::disk('public')->makeDirectory('banners');
        }

        // Encode using JpegEncoder class (v3)
       $encoded = $image->encode(new JpegEncoder(85));

        $filename = 'banners/' . now()->format('Ymd') . '_' . Str::random(8) . '.jpg';
        Storage::disk('public')->put($filename, (string) $encoded);

        $url = asset('storage/' . $filename);

        return response()->json(['url' => $url, 'text' => $text]);
    }

    /**
     * Update or create store
     */
    public function update(Request $request)
    {
        $userId = Auth::id();

        $data = $request->only([
            'store_name',
            'store_description',
            'store_slug',
            'banner_image',
            'banner_text',
            'logo_url',
            'whatsapp_number',
        ]);

        $request->validate([
            'store_name' => 'required|string|max:100',
            'store_slug' => 'required|string|max:100|unique:agent_stores,store_slug,' . optional(AgentStore::where('user_id', $userId)->first())->id,
            'store_description' => 'nullable|string|max:255',
            'banner_text' => 'nullable|string|max:255',
            'whatsapp_number' => 'nullable|string|max:20',
        ]);

        $store = AgentStore::updateOrCreate(
            ['user_id' => $userId],
            [
                'store_name' => $data['store_name'],
                'description' => $data['store_description'] ?? null,
                'store_slug' => $data['store_slug'],
                'banner_text' => $data['banner_text'] ?? null,
            ]
        );

        //  Handle banner image
        if ($request->filled('banner_image')) {
            $store->banner_image = $request->input('banner_image');
        }

        //  Handle logo upload or URL
        if ($request->hasFile('logo_file')) {
            $file = $request->file('logo_file');
            $path = $file->store('logos', 'public');
            
            $store->logo = 'storage/' . $path; 
            
        } elseif ($request->filled('logo_url')) {
            
            $store->logo = $request->input('logo_url');
        }

        //  Handle WhatsApp number (optional)
        if ($request->filled('whatsapp_number')) {
            $number = preg_replace('/[^0-9]/', '', $request->whatsapp_number); // digits only

            // Format Ghanaian numbers (0xxx → 233xxx)
            if (str_starts_with($number, '0')) {
                $number = '233' . substr($number, 1);
            }

            $store->whatsapp_number = $request->whatsapp_number;
            $store->whatsapp_link = "https://wa.me/{$number}";
        } else {
            // keep null if not provided (first time creation)
            $store->whatsapp_number = $store->whatsapp_number ?? null;
            $store->whatsapp_link = $store->whatsapp_link ?? null;
        }

        $store->save();

        return response()->json(['success' => true, 'store' => $store]);
    }

    /**
     * Publish store
     */
    public function publish()
    {
        $agentId = Auth::id();

        $unpricedProducts = Product::whereDoesntHave('agentPrices', function ($q) use ($agentId) {
            $q->where('agent_id', $agentId);
        })->count();

        if ($unpricedProducts > 0) {
            return response()->json([
                'success' => false,
                'message' => "Please set prices for all products before publishing your store."
            ], 422);
        }

        AgentStore::where('user_id', $agentId)->update(['publish' => 'published']);

        return response()->json([
            'success' => true,
            'message' => 'Your store has been published successfully!'
        ]);
    }

    /**
     * Unpublish store
     */
    public function unpublish()
    {
        AgentStore::where('user_id', Auth::id())
            ->update(['publish' => 'draft']);

        return response()->json([
            'success' => true,
            'message' => 'Your store has been set to draft.'
        ]);
    }

    /**
     * Check if slug is available
     */
    public function checkSlug(Request $request)
    {
        $request->validate([
            'slug' => 'required|string|max:100',
        ]);

        $exists = AgentStore::where('store_slug', $request->slug)
            ->where('user_id', '!=', Auth::id())
            ->exists();

        return response()->json([
            'available' => !$exists,
        ]);
    }

    /**
     * Public store (viewed by customers)
     */
    public function publicStore($slug)
    {
        $store = AgentStore::where('store_slug', $slug)
            ->where('publish', 'published')
            ->firstOrFail();

        // track visit
        $metric = \App\Models\StoreMetric::firstOrCreate(['store_id' => $store->id]);
        $metric->increment('visits');

        $agentId = $store->user_id;

        $products = Product::query()
            ->select('products.id', 'products.product_code', 'products.category', 'products.capacity', 'products.validity')
            ->whereHas('agentPrices', function ($q) use ($agentId) {
                $q->where('agent_id', $agentId);
            })
            ->with(['agentPrices' => function ($query) use ($agentId) {
                $query->where('agent_id', $agentId)->select('product_id', 'agent_price');
            }])
            ->get()
            ->map(function ($product) {
                $agentPrice = $product->agentPrices->first();
                return [
                    'id' => $product->id,
                    'product_code' => $product->product_code,
                    'category' => $product->category,
                    'capacity' => $product->capacity,
                    'validity' => $product->validity,
                    'price' => $agentPrice->agent_price ?? null,
                ];
            });

        return inertia('PublicStore', [
            'store' => $store,
            'products' => $products,
        ]);
    }

    /**
     * Delete store
     */
    public function destroy(AgentStore $store)
    {
        if ($store->user_id !== Auth::id()) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $store->delete();

        return response()->json(['success' => true]);
    }
}
