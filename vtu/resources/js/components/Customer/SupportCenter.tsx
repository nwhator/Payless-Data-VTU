import React from 'react';
import { Mail, MessageSquare } from 'lucide-react';

// --- CONSTANTS ---
const AGENT_SUPPORT_EMAIL = "admin@smarttopup.net";

// --- MAIN COMPONENT ---
const SupportCenter: React.FC = () => {
    // --- RENDER ---
    return (
        <div className="space-y-8 p-0 bg-transparent text-white font-inter max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold border-b border-white/20 pb-4 flex items-center gap-3">
                <MessageSquare size={28} className="text-[#00C4FF]" /> Customer Support Center
            </h1>

            {/* Support Contact Information Card */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-xl border border-[#33d8ff]/20 shadow-2xl">
                <h2 className="text-xl font-semibold mb-3 flex items-center text-[#00C4FF] border-b border-white/10 pb-2">
                    <Mail size={20} className="mr-2" /> Direct Support Contact
                </h2>
                <p className="text-slate-300 mb-4">
                    For any urgent complaints, transaction/order issues, or support requests regarding your customer account, please send an email directly to our dedicated support team.
                </p>
                <div className="flex items-center p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                    <Mail size={20} className="text-red-400 mr-3" />
                    <a 
                        href={`mailto:${AGENT_SUPPORT_EMAIL}`} 
                        className="text-lg font-medium text-red-300 hover:text-red-500 transition break-all"
                    >
                        {AGENT_SUPPORT_EMAIL}
                    </a>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                    We prioritize Agent inquiries and aim to provide a detailed response within 24 hours.
                </p>
            </div>
            
            {/* Removed the Notifications Section entirely */}
        </div>
    );
};

export default SupportCenter;