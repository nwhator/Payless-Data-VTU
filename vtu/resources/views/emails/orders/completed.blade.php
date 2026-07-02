<x-mail::message>
# ✅ Order #{{ $order->id }} Completed

Hello Admin,

A new order has just been **completed** by the vendor API.

<x-mail::panel>
**Network:** {{ strtoupper($order->network) }}  
**Recipient:** {{ $order->recipient }}  
**Data Volume:** {{ $order->data_volume }} GB  
**Amount:** ₵{{ number_format($order->amount, 2) }}  
**Payment Status:** {{ ucfirst($order->payment_status) }}  
**Status:** {{ ucfirst($order->status) }}  
**Date:** {{ $order->updated_at->format('M d, Y h:i A') }}
</x-mail::panel>

<x-mail::button :url="url('/admin/orders/' . $order->id)">
View Order
</x-mail::button>

Thanks,<br>
**Smart Top-Up Team**
</x-mail::message>
