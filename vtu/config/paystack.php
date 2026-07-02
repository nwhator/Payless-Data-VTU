<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Paystack Public Key
    |--------------------------------------------------------------------------
    |
    | Your Paystack public key from https://dashboard.paystack.com/#/settings/developer
    |
    */

    'public_key' => env('PAYSTACK_PUBLIC_KEY'),

    /*
    |--------------------------------------------------------------------------
    | Paystack Secret Key
    |--------------------------------------------------------------------------
    |
    | Your Paystack secret key from https://dashboard.paystack.com/#/settings/developer
    |
    */

    'secret_key' => env('PAYSTACK_SECRET_KEY'),

    /*
    |--------------------------------------------------------------------------
    | Payment URL
    |--------------------------------------------------------------------------
    |
    | Paystack API endpoint
    |
    */

    'payment_url' => env('PAYSTACK_PAYMENT_URL', 'https://api.paystack.co'),

    /*
    |--------------------------------------------------------------------------
    | Transaction Fee Percentage
    |--------------------------------------------------------------------------
    |
    | Percentage fee to add to Paystack transactions (e.g., 2.5 for 2.5%)
    | This fee is NOT applied to wallet transactions.
    |
    */

    'transaction_fee_percentage' => env('PAYSTACK_FEE_PERCENTAGE', 2.5),

    /*
    |--------------------------------------------------------------------------
    | Apply Fee to Transactions
    |--------------------------------------------------------------------------
    |
    | Enable or disable the transaction fee globally
    |
    */

    'enable_transaction_fee' => env('PAYSTACK_ENABLE_FEE', true),

];