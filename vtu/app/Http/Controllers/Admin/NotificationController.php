<?php

// app/Http/Controllers/Admin/NotificationController.php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class NotificationController extends Controller
{
    /**
     * Admin: Fetch all notifications + agents (for admin dashboard index page).
     */
    public function index()
    {
        // For admin to view all sent notifications, including the receiver details
        $notifications = Notification::with('receiver')
            ->latest()
            ->get();

        // Process image URLs so the admin dashboard gets full URLs
        $notifications->map(function ($notification) {
            if ($notification->image) {
                $notification->image_url = Storage::disk('public')->url($notification->image);
            }
            return $notification;
        });

        // For admin to use in recipient selection
        $agents = User::where('role', 'agent')
            ->select('id', 'name', 'email')
            ->get();

        return response()->json([
            'notifications' => $notifications,
            'agents' => $agents,
        ]);
    }

    /**
     * Admin: Create/send notification(s).
     */
    public function store(Request $request)
    {
        try {
            $data = $request->validate([
                'title' => 'required|string|max:255',
                'body' => 'required|string',
                'image' => 'nullable|image|max:2048',
                'recipients' => 'required|array', // ['all'] or [agent IDs]
            ]);
        } catch (ValidationException $e) {
            return response()->json(['message' => 'Validation Failed', 'errors' => $e->errors()], 422);
        }

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('notifications', 'public');
        }

        $recipients = $data['recipients'];
        $senderId = Auth::id();

        if (in_array('all', $recipients)) {
            $agents = User::where('role', 'agent')->get();
        } else {
            // Note: This needs to handle the recipients coming from the frontend as strings
            $agents = User::whereIn('id', $recipients)
                         ->where('role', 'agent') // Safety check
                         ->get();
        }

        foreach ($agents as $agent) {
            Notification::create([
                'sender_id' => $senderId,
                'receiver_id' => $agent->id,
                'title' => $data['title'],
                'body' => $data['body'],
                // Uses 'image' field for storage path
                'image' => $imagePath, 
            ]);
        }

        return response()->json(['message' => 'Notification sent successfully.'], 200);
    }

    /**
     * Agent: Fetch notifications relevant to the authenticated agent.
     * This is the endpoint hit by the React SupportCenter component.
     */
    public function getAgentNotifications()
    {
        $agentId = Auth::id();

        $notifications = Notification::where('receiver_id', $agentId)
            ->latest()
            // IMPORTANT: Alias 'image' (database field) to 'image_url' 
            // to match the frontend component's interface.
            ->select('id', 'title', 'body', 'image as image_url', 'created_at')
            ->get()
            // Map the collection to ensure the image path is a full URL if it exists
            ->map(function ($notification) {
                if ($notification->image_url) {
                    // Prepend the full storage URL using the public disk
                    $notification->image_url = Storage::disk('public')->url($notification->image_url);
                }
                return $notification;
            });

        return response()->json([
            'notifications' => $notifications,
        ]);
    }

    /**
     * Agent: Mark a notification as read.
     */
    public function markAsRead(Notification $notification)
    {
        // Optional: Add authorization check here if needed (e.g., $notification->receiver_id == Auth::id())
        $notification->update(['is_read' => true]);

        return response()->json([
            'message' => 'Notification marked as read.',
        ]);
    }
}