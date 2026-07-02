import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast, Toaster } from 'sonner';
import { DollarSign, Clock, CreditCard, Send, History, XCircle, CheckCircle, Info } from 'lucide-react';

// --- LIVE API DATA TYPES ---
interface WalletStats {
    total_commissions: number;
    pending_withdrawals: number;
}

interface WithdrawalRequest {
    id: string;
    user_id: string;
    amount: number;
    request_date: string;
    status: 'pending' | 'approved' | 'declined';
    processor: string;
    account_details: string;
    decline_reason: string | null;
}

// --- CONSTANTS ---
// ⭐ Minimum withdrawal amount set to GH₵ 20
const MIN_WITHDRAWAL_AMOUNT = 20.00; 

const WITHDRAWAL_PROCESSORS = [
    'MTN Mobile Money',
    'Vodafone Cash',
    'AirtelTigo Cash',
    'Bank Transfer (Local)',
];

const getStatusClasses = (status: string) => {
    switch (status?.toLowerCase()) {
        case 'approved': return 'bg-green-600/20 text-green-400';
        case 'pending': return 'bg-yellow-600/20 text-yellow-400';
        case 'declined': return 'bg-red-600/20 text-red-400';
        default: return 'bg-slate-600/20 text-slate-400';
    }
};


const CommissionSummary: React.FC<{ stats: WalletStats }> = ({ stats }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">

        <div className="bg-white/5 p-6 rounded-xl shadow-lg border border-white/10">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-300 uppercase tracking-wider">Total Commissions</p>
                <CreditCard size={24} className="text-yellow-400" />
            </div>

            <p className="mt-4 text-3xl font-bold text-white">
                GH₵ {stats.total_commissions?.toFixed(2)}
            </p>

            <p className="text-xs text-slate-400 mt-1">Overall commission earnings</p>
        </div>

        <div className="bg-white/5 p-6 rounded-xl shadow-lg border border-white/10">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-300 uppercase tracking-wider">Pending Requests</p>
                <Clock size={24} className="text-red-400" />
            </div>

            <p className="mt-4 text-3xl font-bold text-white">
                GH₵ {stats.pending_withdrawals?.toFixed(2)}
            </p>

            <p className="text-xs text-slate-400 mt-1">Waiting for admin approval</p>
        </div>
    </div>
);



const WithdrawalForm: React.FC<{ commissionBalance: number; onWithdrawalSuccess: () => void }> = ({
    commissionBalance,
    onWithdrawalSuccess
}) => {
    const [amount, setAmount] = useState<number>(0);
    const [processor, setProcessor] = useState<string>(WITHDRAWAL_PROCESSORS[0]);
    const [accountDetails, setAccountDetails] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Start loader/submission state immediately
        setIsSubmitting(true);
        const finalAmount = parseFloat(amount.toFixed(2));
        
        // Validation checks (These will fire the toast and stop if they fail)
        if (finalAmount <= 0) {
            toast.error("Amount must be greater than zero.");
            setIsSubmitting(false); // Stop loader
            return;
        }

        // Check against the minimum limit
        if (finalAmount < MIN_WITHDRAWAL_AMOUNT) {
            // This is the error message for 2 cedes or anything under 50
            toast.error(`The minimum withdrawal amount is GH₵ ${MIN_WITHDRAWAL_AMOUNT.toFixed(2)}.`);
            setIsSubmitting(false); // Stop loader
            return;
        }

        if (finalAmount > commissionBalance) {
            toast.error(`You can only withdraw up to GH₵ ${commissionBalance.toFixed(2)}.`);
            setIsSubmitting(false); // Stop loader
            return;
        }
        if (!accountDetails.trim()) {
            toast.error("Please enter account details.");
            setIsSubmitting(false); // Stop loader
            return;
        }
        // *** END VALIDATION CHECKS ***
        
        // Start toast loading indicator (This is what you wanted to see)
        const toastId = toast.loading(`Submitting GH₵ ${finalAmount.toFixed(2)} request...`);


        try {
            await axios.post('/withdraw', {
                amount: finalAmount,
                processor,
                account_details: accountDetails,
            });

            toast.success(`Withdrawal request for GH₵ ${finalAmount.toFixed(2)} submitted!`, {
                id: toastId,
            });

            setAmount(0);
            setAccountDetails('');
            onWithdrawalSuccess();
        } catch (error) {
            const msg = axios.isAxiosError(error)
                ? error.response?.data?.message || "Server error. Check minimum limit."
                : "Network error.";
            toast.error(msg, { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate if the button should be visibly disabled based on incomplete data (but not minimum amount check)
    const isFormInvalid = isSubmitting || amount <= 0 || amount > commissionBalance || accountDetails.trim() === '';
    
    return (
        <form onSubmit={handleSubmit} className="bg-white/5 p-6 rounded-xl border border-white/10 shadow-xl">

            <h3 className="text-xl font-semibold mb-4 text-white flex items-center">
                <Send size={20} className="mr-2 text-[#00C4FF]" /> Request Payout
            </h3>
            
            {/* Display minimum withdrawal information */}
            <div className="flex items-start p-3 mb-4 rounded-lg bg-yellow-900/50 border border-yellow-700/50 text-yellow-300 text-sm">
                <Info size={16} className="mt-0.5 mr-2 flex-shrink-0" />
                <p>
                    Note: The minimum withdrawal amount is <span className="font-bold">GH₵ {MIN_WITHDRAWAL_AMOUNT.toFixed(2)}</span>.
                </p>
            </div>


            <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-1">
                    Withdrawal Amount (Commission Available: GH₵ {commissionBalance.toFixed(2)})
                </label>

                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    // Removed min attribute to allow user input of small numbers, relying on JS validation
                    step="0.01"
                    className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                    placeholder={`e.g., 50.00 (Minimum GH₵ ${MIN_WITHDRAWAL_AMOUNT.toFixed(2)})`}
                    required
                />
            </div>

            <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-1">Payment Processor</label>
                <select
                    value={processor}
                    onChange={(e) => setProcessor(e.target.value)}
                    className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                >
                    {WITHDRAWAL_PROCESSORS.map(p => <option key={p}>{p}</option>)}
                </select>
            </div>

            <div className="mb-6">
                <label className="block text-sm text-slate-400 mb-1">Account / Wallet Details</label>
                <textarea
                    value={accountDetails}
                    onChange={(e) => setAccountDetails(e.target.value)}
                    rows={2}
                    className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                    placeholder="MoMo Number or Bank details"
                />
            </div>

            <button
                type="submit"
                // ⭐ FIX: Button is now only disabled if essential fields are missing/invalid, 
                // NOT if the amount is simply below the minimum. This ensures handleSubmit runs 
                // and shows the correct toast message and loader.
                disabled={isFormInvalid}
                className={`w-full py-3 font-bold rounded-lg transition-colors 
                    ${
                        isFormInvalid
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-[#00C4FF] text-slate-900 hover:bg-opacity-90'
                    }
                `}
            >
                {isSubmitting ? "Submitting..." : `Submit (GH₵ ${amount.toFixed(2)})`}
            </button>
        </form>
    );
};



const WithdrawalHistory: React.FC<{ history: WithdrawalRequest[]; isHistoryLoading: boolean }> = ({
    history,
    isHistoryLoading
}) => {

    const renderStatusBadge = (status: string, reason: string | null) => {
        const classes = getStatusClasses(status);
        const Icon =
            status.toLowerCase() === 'approved' ? CheckCircle :
            status.toLowerCase() === 'pending' ? Clock :
            XCircle;

        return (
            <div className={`flex items-center text-xs px-2.5 py-1 rounded-full ${classes}`}>
                <Icon size={14} className="mr-1" />
                {status}
                {status === 'declined' && reason && (
                    <span className="ml-2 text-white/50" title={`Reason: ${reason}`}>
                        <Info size={14} />
                    </span>
                )}
            </div>
        );
    };

    if (isHistoryLoading)
        return (
            <div className="flex justify-center p-6 text-slate-400 bg-white/5 rounded-xl">
                Loading withdrawal history...
            </div>
        );

    if (history.length === 0)
        return (
            <div className="p-10 text-center text-slate-400 bg-white/5 border border-white/10 rounded-xl">
                No withdrawal requests found.
            </div>
        );

    return (
        <div className="overflow-x-auto bg-white/5 border border-white/10 rounded-xl p-2">
            <table className="w-full text-slate-400 text-sm">
                <thead className="text-white uppercase bg-slate-800/80 text-xs">
                    <tr>
                        <th className="py-3 px-6">ID</th>
                        <th className="py-3 px-6">Date</th>
                        <th className="py-3 px-6">Amount</th>
                        <th className="py-3 px-6">Processor</th>
                        <th className="py-3 px-6">Status</th>
                        <th className="py-3 px-6">Details</th>
                    </tr>
                </thead>
                <tbody>
                    {history.map((req) => (
                        <tr key={req.id} className="border-b border-white/10">
                            <td className="py-4 px-6">{req.id}</td>
                            <td className="py-4 px-6">{req.request_date}</td>
                            <td className="py-4 px-6 text-yellow-400 font-bold">{req.amount.toFixed(2)}</td>
                            <td className="py-4 px-6">{req.processor}</td>
                            <td className="py-4 px-6">{renderStatusBadge(req.status, req.decline_reason)}</td>
                            <td className="py-4 px-6 truncate max-w-[160px]" title={req.account_details}>
                                {req.account_details}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};



const AgentCommissions: React.FC = () => {
    // Reverted state initialization to original (no mock data)
    const [stats, setStats] = useState<WalletStats | null>(null);
    const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRequest[]>([]);
    const [activeTab, setActiveTab] = useState<'request' | 'history'>('request');
    const [isLoading, setIsLoading] = useState(true);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);

    // Default to 0 until stats are loaded
    const commissionBalance = stats?.total_commissions || 0;

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setIsHistoryLoading(true);

        try {
            // This is the user's original logic which will now execute:
            const statsResponse = await axios.get<WalletStats>('/wallet/stats');
            setStats(statsResponse.data);

            const historyResponse = await axios.get<{ data: WithdrawalRequest[] }>('/withdrawals');
            setWithdrawalHistory(
                historyResponse.data.data.map(req => ({
                    ...req,
                    amount: parseFloat(req.amount.toString()),
                    request_date: (req.request_date ?? "").toString().split("T")[0],
                }))
            );
        } catch (error) {
            // Since this will fail in the preview environment without a backend, 
            // the default state will show the loading message indefinitely or 
            // an error toast will appear.
            toast.error("Failed to load initial data. Check backend connection.");
        } finally {
            setIsLoading(false);
            setIsHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="space-y-8 p-4 sm:p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-extrabold text-white pb-4 border-b border-white/10">
                Commission & Payout Center
            </h1>

            {isLoading ? (
                <div className="p-10 text-center text-slate-400 bg-white/5 rounded-xl">
                    Loading financial summary...
                </div>
            ) : (
                stats ? (
                    <CommissionSummary stats={stats} />
                ) : (
                    // Display an error or helpful message if stats failed to load
                    <div className="p-10 text-center text-red-400 bg-red-900/20 border border-red-700/50 rounded-xl">
                        Error loading wallet statistics. Commission balance defaulted to GH₵ 0.00.
                    </div>
                )
            )}

            {/* TABS */}
            <div className="flex border-b border-white/10 text-slate-300">
                <button
                    onClick={() => setActiveTab('request')}
                    className={`px-4 py-2 flex items-center ${
                        activeTab === 'request'
                            ? 'text-[#00C4FF] border-b-2 border-[#00C4FF]'
                            : 'hover:text-white'
                    }`}
                >
                    <Send size={18} className="mr-2" /> Request Payout
                </button>

                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 flex items-center ${
                        activeTab === 'history'
                            ? 'text-[#00C4FF] border-b-2 border-[#00C4FF]'
                            : 'hover:text-white'
                    }`}
                >
                    <History size={18} className="mr-2" /> Withdrawal History
                </button>
            </div>

            <div className="pt-4">
                {activeTab === 'request' && !isLoading && (
                    <WithdrawalForm
                        commissionBalance={commissionBalance}
                        onWithdrawalSuccess={fetchData}
                    />
                )}

                {activeTab === 'history' && (
                    <WithdrawalHistory
                        history={withdrawalHistory}
                        isHistoryLoading={isHistoryLoading}
                    />
                )}
            </div>
        </div>
    );
};

export default AgentCommissions;