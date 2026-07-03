import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, Bell, MessageSquare, Clock, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';

// --- TYPE DEFINITIONS ---
interface Notification {
    id: number;
    title: string;
    body: string;
    image_url?: string;
    created_at: string;
}

const AGENT_SUPPORT_EMAIL = "admin@paylessdata.net";

// --- MAIN COMPONENT ---
const SupportCenter: React.FC = () => {
    // --- STATE MANAGEMENT ---
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- DATA FETCHING LOGIC (Replacing MOCK DATA) ---
    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const fetchNotifications = async () => {
            try {
                // NOTE: This assumes your Laravel/backend route for agents is '/agent/notifications'
                const response = await axios.get<{ notifications: Notification[] }>('/agent/notifications', {
                    signal: controller.signal,
                });

                if (isMounted) {
                    // Assuming the API returns notifications inside a 'notifications' key
                    const fetchedNotes = response.data.notifications || [];
                    
                    // Sort by newest first
                    fetchedNotes.sort((a, b) => 
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    );
                    
                    setNotifications(fetchedNotes);
                    setError(null);
                }
            } catch (err) {
                if (!axios.isCancel(err) && isMounted) {
                    const message = axios.isAxiosError(err) && err.response 
                        ? err.response.data.message || 'Failed to fetch notifications.'
                        : 'Network error or unable to reach API.';
                    
                    setError(message);
                    toast.error("Error loading announcements: " + message);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchNotifications();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, []);

    // --- RENDER HELPERS ---
    const renderNotifications = () => {
        if (loading) {
            return (
                <div className="flex justify-center py-10 text-slate-400">
                    <Loader2 className="animate-spin mr-2 text-[#00C4FF]" size={24} /> 
                    <span className="text-lg">Loading latest announcements...</span>
                </div>
            );
        }

        if (error) {
            return (
                <div className="text-center text-red-400 py-10 border border-red-800/50 rounded-lg bg-red-900/10 flex items-center justify-center gap-2">
                    <Info size={20} /> Error: {error}
                </div>
            );
        }

        if (notifications.length === 0) {
            return (
                <div className="text-center text-slate-500 py-6 border border-dashed border-white/10 rounded-lg">
                    No new announcements from the administration.
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {notifications.map((note) => (
                    <div 
                        key={note.id} 
                        className="bg-white/5 p-4 rounded-xl border border-white/10 hover:border-[#00C4FF]/40 transition duration-200 shadow-lg"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-bold text-[#00C4FF]">{note.title}</h3>
                            <div className="flex items-center text-xs text-slate-400 whitespace-nowrap">
                                <Clock size={14} className="mr-1" />
                                {new Date(note.created_at).toLocaleDateString(undefined, {
                                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                            </div>
                        </div>
                        {note.image_url && (
                            <img 
                                src={note.image_url} 
                                alt="Notification attachment" 
                                className="mb-3 rounded-lg max-h-40 object-cover w-full"
                                // Fallback image if URL fails
                                onError={(e) => {
                                    (e.target as HTMLImageElement).onerror = null; 
                                    (e.target as HTMLImageElement).src="https://placehold.co/400x100/1E3A4B/00C4FF?text=Image+Unavailable"; 
                                }}
                            />
                        )}
                        <p className="text-slate-300">{note.body}</p>
                    </div>
                ))}
            </div>
        );
    };

    // --- RENDER ---
    return (
        <div className="space-y-8 p-6 md:p-10 bg-slate-900 min-h-screen text-white font-inter">
            <h1 className="text-3xl font-bold border-b border-[#00C4FF]/20 pb-4 flex items-center gap-3">
                <Bell size={28} className="text-[#00C4FF]" /> Agent Support Hub
            </h1>

            {/* Support Contact Information Card */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-xl border border-[#33d8ff]/20 shadow-2xl">
                <h2 className="text-xl font-semibold mb-3 flex items-center text-[#00C4FF] border-b border-white/10 pb-2">
                    <MessageSquare size={20} className="mr-2" /> Need Help? Contact Support
                </h2>
                <p className="text-slate-300 mb-4">
                    For any complaints, issues, or support requests regarding commissions, payments, or the system, please send an email directly to our dedicated support team.
                </p>
                <div className="flex items-center p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                    <Mail size={20} className="text-red-400 mr-3" />
                    <a 
                        href={`mailto:${AGENT_SUPPORT_EMAIL}`} 
                        className="text-lg font-medium text-red-300 hover:text-red-500 transition"
                    >
                        {AGENT_SUPPORT_EMAIL}
                    </a>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                    We aim to respond to all support inquiries within 24 hours.
                </p>
            </div>

            {/* Notifications Section */}
            <div>
                <h2 className="text-2xl font-semibold mb-4 flex items-center text-white border-b border-white/10 pb-2">
                    <Bell size={20} className="mr-2 text-yellow-400" /> Administrative Announcements
                </h2>
                
                {renderNotifications()}
            </div>
        </div>
    );
};

export default SupportCenter;