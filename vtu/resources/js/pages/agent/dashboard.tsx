import React, { useState, useEffect, useMemo } from "react";
import { Head } from "@inertiajs/react"; // Import Head
import Sidebar from "@/components/Agent/Sidebar";
import Navbar from "@/components/Agent/Navbar";
import AgentSummary from "@/components/Agent/AgentSummary";
import AgentPurchases from "@/components/Agent/AgentPurchases";
import PricesAndProfit from "@/components/Agent/PricesAndProfit";
import WalletManagement from "@/components/Agent/WalletManagement";
import AgentProfile from "@/components/Agent/AgentProfile";
import SupportCenter from "@/components/Agent/SupportCenter";
import AgentStore from "@/components/Agent/AgentStore";
import AgentCommissions from "@/components/Agent/AgentCommissions";
import AgentWithdrawal from "@/components/Agent/AgentWithdrawal";
import { toast } from "sonner";
// Assuming you have access to the authenticated user object, e.g., via Inertia's usePage or a context.
// For this example, we'll simulate getting the Agent's name.
const AGENT_NAME = "Payless Data Agent";

// --- Helper function to map active tab key to readable title/description ---
const getMetaContent = (activeKey: string) => {
    switch (activeKey) {
        case "overview":
            return {
                title: `${AGENT_NAME} Dashboard | Summary & Quick Actions`,
                description: "View your sales overview, wallet balance, and quick access to agent tools for data top-ups and commission tracking.",
            };
        case "purchases":
            return {
                title: `${AGENT_NAME} | Purchase History & Transactions`,
                description: "Review a detailed list of all your data bundle purchases and transaction history. Track successful and pending orders.",
            };
        case "store":
            return {
                title: `${AGENT_NAME}'s Personalized Storefront Setup`,
                description: "Manage your unique store URL, customize branding, and set up your online presence for selling MTN data bundles.",
            };
        case "pricing":
            return {
                title: `${AGENT_NAME} | Agent Prices & Profit Margins`,
                description: "See your exclusive agent pricing and calculate your profit margins on all available data bundles.",
            };
        case "commissions":
            return {
                title: `${AGENT_NAME} | Commission Earnings Report`,
                description: "Track and manage your commission earnings from sales, referrals, and view payout history.",
            };
        case "wallet":
            return {
                title: `${AGENT_NAME} | Wallet Balance & Funding`,
                description: "Fund your wallet, check your current balance, and view all deposit and withdrawal transactions.",
            };
        case "withdraw":
            return {
                title: `${AGENT_NAME} | Withdraw Funds`,
                description: "Request a withdrawal of your commission earnings to your mobile money or bank account.",
            };
        case "profile":
            return {
                title: `${AGENT_NAME} | Account Profile & Settings`,
                description: "Update your personal information, change passwords, and manage your agent account settings.",
            };
        case "support":
            return {
                title: `${AGENT_NAME} | Support Center & Help Desk`,
                description: "Access support tickets, FAQs, and contact the help desk for assistance with your agent dashboard or orders.",
            };
        default:
            return {
                title: `${AGENT_NAME} | Agent Dashboard`,
                description: "Your comprehensive agent portal for managing data bundle sales, commissions, and wallet funding.",
            };
    }
};

const Dashboard: React.FC = () => {
    const [active, setActive] = useState<string>("overview");
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    
    // --- DYNAMIC META CONTENT ---
    const meta = useMemo(() => getMetaContent(active), [active]);

    // --- EFFECT 1: Handles body scroll lock for mobile sidebar ---
    useEffect(() => {
        document.body.style.overflow = sidebarOpen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [sidebarOpen]);
    
    // --- FUNCTION TO FETCH DATA ON TAB CHANGE ---
    const handleSetActive = async (key: string) => {
        setActive(key);
        setSidebarOpen(false);

        setLoading(true);

        try {
            switch (key) {
                // For simplicity, we keep the loading logic brief, as most components handle their own data.
                case "purchases": 
                case "commissions": 
                case "wallet":
                case "withdraw": {
                    // Simulating a brief data fetch delay for a better UX/loading state feel
                    await new Promise(resolve => setTimeout(resolve, 300));
                    break;
                }
                default:
                    break;
            }
        } catch {
            toast.error(`Failed to load ${key} data.`);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <>
            {/* ---------------------------------------------------- */}
            {/* 💡 META TAGS: Dynamic update based on Active Tab */}
            {/* ---------------------------------------------------- */}
            <Head title={meta.title}>
                <meta name="description" content={meta.description} />
                {/* Standard practice for dashboard/private pages is to prevent indexing */}
                <meta name="robots" content="noindex, nofollow" />
            </Head>

            <div className="min-h-screen bg-[#0B1C24] text-white flex relative">
                <Sidebar
                    active={active}
                    setActive={handleSetActive} 
                    mobileOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />

                <div
                    onClick={() => setSidebarOpen(false)}
                    className={`fixed inset-0 z-20 lg:hidden bg-black/40 transition-opacity ${
                        sidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
                    }`}
                />

                <div className="flex-1 min-w-0 lg:ml-64 transition-all duration-300">
                    <Navbar active={active} setActive={handleSetActive} onMenuClick={() => setSidebarOpen((s) => !s)} />

                    <main className="p-4 sm:p-6">
                        {/* Agent Summary/Overview */}
                        {active === "overview" && (
                            <AgentSummary setActive={handleSetActive} /> 
                        )}

                        {/* Agent Purchases */}
                        {active === "purchases" && <AgentPurchases />} 

                        {/* Agent Store */}
                        {active === "store" && (
                            <AgentStore
                                loading={loading}
                                setLoading={setLoading}
                                setActive={handleSetActive}
                            />
                        )}

                        {/* Prices and Profit */}
                        {active === "pricing" && <PricesAndProfit />}

                        {/* Agent Commissions */}
                        {active === "commissions" && (
                            <AgentCommissions />
                        )}

                        {/* Wallet Management */}
                        {active === "wallet" && (
                            <WalletManagement />
                        )}

                        {/* Withdrawal */}
                        {active === "withdraw" && (
                            <AgentWithdrawal />
                        )}

                        {/* Agent Profile */}
                        {active === "profile" && (
                            <AgentProfile />
                        )}

                        {/* Support Center */}
                        {active === "support" && (
                            <SupportCenter />
                        )}

                        {/* Sales Reports Placeholder */}
                        {active === "reports" && (
                            <div className="p-6 bg-white/5 border border-white/10 rounded-xl text-slate-400">
                                Sales reports coming soon...
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </>
    );
};

export default Dashboard;