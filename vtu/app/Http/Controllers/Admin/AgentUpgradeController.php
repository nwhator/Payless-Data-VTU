<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AgentUpgrade;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use App\Models\Transaction;

class AgentUpgradeController extends Controller
{
    public function index()
    {
        $agentRequests = AgentUpgrade::with('user')
            ->whereIn('status', ['pending', 'approved', 'declined'])
            ->latest()
            ->get();

        return response()->json([
            'agentRequests' => $agentRequests,
        ]);
    }

    public function approve($id)
    {
        try {
            $upgrade = AgentUpgrade::findOrFail($id);
            $user = $upgrade->user;

            if ($upgrade->status !== 'pending') {
                return response()->json([
                    'message' => 'Request is already processed.',
                    'new_status' => $upgrade->status
                ], 400);
            }

            if (!$this->hasVerifiedPayment($upgrade)) {
                return response()->json([
                    'message' => 'Payment has not been verified for this upgrade request.',
                    'new_status' => $upgrade->status
                ], 422);
            }

            DB::transaction(function () use ($upgrade, $user) {
                $upgrade->update(['status' => 'approved']);
                $user->update(['role' => 'agent']);
            });

            return response()->json([
                'message' => "{$user->name} has been upgraded to Agent successfully!",
                'new_status' => 'approved'
            ], 200);

        } catch (\Exception $e) {
            Log::error("Agent approval failed for ID {$id}: " . $e->getMessage());

            return response()->json([
                'message' => 'Agent approval failed due to a server error.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function decline($id)
    {
        try {
            $upgrade = AgentUpgrade::findOrFail($id);

            if ($upgrade->status !== 'pending') {
                return response()->json([
                    'message' => 'Request is already processed.',
                    'new_status' => $upgrade->status
                ], 400);
            }

            $upgrade->update(['status' => 'declined']);

            return response()->json([
                'message' => "{$upgrade->user->name}'s upgrade request was declined.",
                'new_status' => 'declined'
            ], 200);

        } catch (\Exception $e) {
            Log::error("Agent decline failed for ID {$id}: " . $e->getMessage());

            return response()->json([
                'message' => 'Agent decline failed due to a server error.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function hasVerifiedPayment(AgentUpgrade $upgrade): bool
    {
        if (!$upgrade->payment_reference) {
            return false;
        }

        return Transaction::where('paystack_ref', $upgrade->payment_reference)
            ->whereIn('status', ['completed', 'success', 'successful'])
            ->exists();
    }
}
