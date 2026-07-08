import React, { useState } from 'react';
import axios from 'axios';
import { Loader2, TrendingUp, Zap, DollarSign, Wallet } from 'lucide-react'; 

// We need the user type, specifically for the email.
interface CustomerUser {
    id: number;
    name: string;
    email: string;
    role: "customer" | "agent";
    upgrade_status?: string | null;
}

interface Props {
    upgradeFee: number; // in GHS
    user: CustomerUser; // <--- NEW PROP: User object containing the email
    onUpgrade?: () => void;
}

const AgentUpgrade: React.FC<Props> = ({ upgradeFee, user, onUpgrade }) => { // <--- Receive user prop
    const [loading, setLoading] = useState(false);

    if (user.upgrade_status === 'pending') {
        return (
            <div className="space-y-8 max-w-4xl mx-auto">
                <header className="text-center space-y-3 p-6 rounded-xl bg-[#071821] border border-gray-700">
                    <h1 className="text-3xl font-extrabold text-amber-400">
                        Upgrade Pending Approval ⏳
                    </h1>
                    <p className="text-gray-300 text-lg max-w-2xl mx-auto">
                        Your payment has been received and verified successfully. An admin is currently reviewing your request.
                    </p>
                </header>
                <div className="p-8 text-center rounded-xl bg-[#00121A] border border-amber-500">
                    <p className="text-xl font-semibold mb-2 text-white">
                        Status: Pending Admin Review
                    </p>
                    <p className="text-gray-400 text-sm mb-6">
                        No further action is required. Your account will be upgraded to an Agent account shortly.
                    </p>
                    <div className="flex justify-center space-x-6 text-sm">
                        <p className="text-gray-500">Secured by Paystack • Payment Complete</p>
                    </div>
                </div>
            </div>
        );
    }

    if (user.upgrade_status === 'approved' || user.role === 'agent') {
        return (
            <div className="space-y-8 max-w-4xl mx-auto">
                <header className="text-center space-y-3 p-6 rounded-xl bg-[#071821] border border-gray-700">
                    <h1 className="text-3xl font-extrabold text-[#4DFF8F]">
                        Upgrade Approved! 🎉
                    </h1>
                    <p className="text-gray-300 text-lg max-w-2xl mx-auto">
                        Your account has been successfully upgraded to an Agent account.
                    </p>
                </header>
                <div className="p-8 text-center rounded-xl bg-[#00121A] border border-green-500">
                    <p className="text-xl font-semibold mb-2 text-white">
                        Status: Active Agent
                    </p>
                    <p className="text-gray-400 text-sm mb-6">
                        Please reload the page or click below to access the Agent Portal.
                    </p>
                    <a
                        href="/agent/dashboard"
                        className="inline-block bg-[#4DFF8F] hover:bg-[#39cc70] text-black font-extrabold px-6 py-3 rounded-lg text-lg transition duration-200"
                    >
                        Go to Agent Dashboard
                    </a>
                </div>
            </div>
        );
    }

    // Focus on concrete, financial advantages
    const benefits = [
        { 
            icon: DollarSign, 
            title: "Highest Profit Margins", 
            description: "Your primary source of income. Earn a much higher commission rate on every single sale compared to regular customers." 
        },
        { 
            icon: Wallet, 
            title: "Wholesale Pricing", 
            description: "Access the cheapest bundle prices on the platform. This means greater savings for personal use and bigger profits when you sell." 
        },
        { 
            icon: TrendingUp, 
            title: "Scale Your Income", 
            description: "There's no limit to what you can earn. The more you sell to friends, family, or customers, the more you profit." 
        },
        { 
            icon: Zap, 
            title: "Instant Setup", 
            description: "Pay the fee now, and your account will be upgraded immediately. No waiting period, start earning right away." 
        },
    ];

    const initiate = async () => {
        if (!user.email) {
            alert('Cannot initiate payment: User email is missing.');
            return;
        }

        try {
            setLoading(true);
            
            // --- UPDATE: Pass user.email in the payload ---
            const res = await axios.post('/customer/upgrade/initialize', { 
                user_id: user.id,
                amount: upgradeFee,
                email: user.email, // <--- Paystack requires this for initialization
            }); 
            
            if (res.data && res.data.authorization_url) {
                // Redirect to Paystack's payment page
                window.location.href = res.data.authorization_url; 
            } else {
                alert('Payment initialization failed. Server did not return a valid payment URL.');
            }
        } catch (err: any) {
            console.error(err);
            alert(err?.response?.data?.message || 'Payment initialization failed. Please check your internet connection or try again later.');
        } finally {
            // Note: In a successful scenario, the redirect happens before this runs.
            // This primarily covers API errors.
            setLoading(false);
            if (onUpgrade) onUpgrade(); 
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <header className="text-center space-y-3 p-6 rounded-xl bg-[#071821] border border-gray-700">
                <h1 className="text-3xl font-extrabold text-[#4DFF8F]">
                    Stop Paying Customer Prices. Start Earning.
                </h1>
                <p className="text-gray-300 text-lg max-w-2xl mx-auto">
                    As a standard user, you leave money on the table. Upgrade to an Agent account to unlock wholesale rates and convert your purchases into a reliable profit stream.
                </p>
            </header>

            {/* 1. BENEFIT GRID - Clean, direct list */}
            <div className="grid md:grid-cols-2 gap-8 p-6">
                {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start space-x-4 bg-[#071821] p-5 rounded-lg border border-gray-700 hover:border-[#4DFF8F] transition duration-200">
                        <benefit.icon size={20} className="text-[#4DFF8F] mt-1 flex-shrink-0" />
                        <div>
                            <h3 className="text-lg font-bold text-white">{benefit.title}</h3>
                            <p className="text-gray-400 text-sm mt-0.5">{benefit.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* 2. CALL TO ACTION & PRICING */}
            <div className="p-8 text-center rounded-xl bg-[#00121A] border border-[#4DFF8F]">
                
                <p className="text-xl font-semibold mb-2 text-white">
                    One-Time Upgrade Fee:
                </p>
                <h2 className="text-5xl font-extrabold text-[#4DFF8F] mb-6">
                    GHS {upgradeFee.toFixed(2)}
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                    A small investment for lifetime access to Agent margins and pricing.
                </p>

                <button 
                    onClick={initiate} 
                    disabled={loading} 
                    className={`w-full md:w-2/3 lg:w-1/2 mx-auto py-3 rounded-lg text-black font-extrabold text-xl shadow-lg transform transition duration-200 
                        ${loading 
                            ? 'bg-gray-500 cursor-not-allowed flex items-center justify-center' 
                            : 'bg-[#4DFF8F] hover:bg-[#39cc70] hover:scale-[1.02]'
                        }`
                    }
                >
                    {loading ? (
                        <>
                            <Loader2 size={20} className="animate-spin mr-2" /> 
                            Processing Payment...
                        </>
                    ) : (
                        `Pay GHS ${upgradeFee.toFixed(2)} and Become an Agent`
                    )}
                </button>
                
                <div className="mt-5 flex justify-center space-x-6 text-sm">
                    <p className="text-gray-500">Upgrade is instant and final.</p>
                    <h6 
                        className="text-gray-500 hover:text-white underline transition duration-150"
                    >
                        T's & C's Applies
                    </h6>
                </div>
                {/* Displaying user's email for transparency (optional, but confirms data is being used) */}
                <p className="text-xs text-gray-600 mt-3">
                    Payment will be processed for: **{user.email}**
                </p>
            </div>
        </div>
    );
};

export default AgentUpgrade;