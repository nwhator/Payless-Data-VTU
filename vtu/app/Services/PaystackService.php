<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaystackService
{
    protected string $baseUrl;
    protected string $secretKey;

    public function __construct()
    {
        $this->baseUrl = config('services.paystack.base_url', 'https://api.paystack.co');
        $this->secretKey = config('services.paystack.secret_key');
    }

    /**
     * Initializes a Paystack transaction.
     *
     * @param string $email The customer's email.
     * @param float $amount The amount in the base currency (GHS).
     * @param array $metadata Optional metadata to pass to Paystack.
     * @param string|null $callbackUrl The specific URL Paystack should redirect to after payment.
     * @return array|null The Paystack response array or null on failure.
     */
    public function initializeTransaction(
        string $email, 
        float $amount, 
        array $metadata = [], 
        ?string $callbackUrl = null // <-- New optional parameter
    ): ?array
    {
        $payload = [
            'email' => $email,
            'amount' => (int)($amount * 100), // Paystack uses kobo/pesewas
            'metadata' => $metadata,
        ];

        // ONLY add the callback_url if it was explicitly passed by the controller.
        if ($callbackUrl) {
            $payload['callback_url'] = $callbackUrl;
        }

        $response = Http::withToken($this->secretKey)
            ->post("{$this->baseUrl}/transaction/initialize", $payload);

        if ($response->failed()) {
            Log::error('Paystack initialization failed', [
                'email' => $email,
                'amount' => $amount,
                'response' => $response->body(),
            ]);

            return null;
        }

        return $response->json();
    }

    public function verifyTransaction(string $reference): ?array
    {
        $response = Http::withToken($this->secretKey)
            ->get("{$this->baseUrl}/transaction/verify/{$reference}");

        if ($response->failed()) {
            Log::error('Paystack verification failed', [
                'reference' => $reference,
                'response' => $response->body(),
            ]);
            return null;
        }

        return $response->json();
    }
}