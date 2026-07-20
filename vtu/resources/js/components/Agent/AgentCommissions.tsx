import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { DollarSign, CreditCard, History, XCircle, CheckCircle, Info } from 'lucide-react';

interface WalletStats {
    total_commissions: number;
    current_balance?: number;
}

interface CommissionRecord {
    id: string;
    created_at: string;
    product_id: number;
    sale_reference: string;
    sell_price: number;
    profit: number;
    status: string;
}

const CommissionSummary: React.FC<{ stats: WalletStats; balance: number }> = ({ stats, balance }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white/5 p-6 rounded-xl shadow-lg border border-white/10">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-300 uppercase tracking-wider">Wallet Balance</p>
                <DollarSign size={24} className="text-green-400" />
            </div>
            <p className="mt-4 text-3xl font-bold text-white">GH₵ {balance.toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-1">Available to spend on purchases</p>
        </div>

        <div className="bg-white/5 p-6 rounded-xl shadow-lg border border-white/10">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-300 uppercase tracking-wider">Total Earned</p>
                <CreditCard size={24} className="text-yellow-400" />
            </div>
            <p className="mt-4 text-3xl font-bold text-white">GH₵ {stats.total_commissions?.toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-1">Lifetime commission earnings</p>
        </div>
    </div>
);

const getStatusClasses = (status: string) => {
    switch (status?.toLowerCase()) {
        case 'earned': return 'bg-green-600/20 text-green-400';
        default: return 'bg-slate-600/20 text-slate-400';
    }
};

const CommissionHistory: React.FC<{ history: CommissionRecord[]; isHistoryLoading: boolean }> = ({
    history,
    isHistoryLoading
}) => {
    if (isHistoryLoading)
        return (
            <div className="flex justify-center p-6 text-slate-400 bg-white/5 rounded-xl">
                Loading commission history...
            </div>
        );

    if (history.length === 0)
        return (
            <div className="p-10 text-center text-slate-400 bg-white/5 border border-white/10 rounded-xl">
                No commission earnings yet. Make sales to earn commissions!
            </div>
        );

    return (
        <div className="overflow-x-auto bg-white/5 border border-white/10 rounded-xl p-2">
            <table className="w-full text-slate-400 text-sm">
                <thead className="text-white uppercase bg-slate-800/80 text-xs">
                    <tr>
                        <th className="py-3 px-6">Date</th>
                        <th className="py-3 px-6">Reference</th>
                        <th className="py-3 px-6">Sale Price</th>
                        <th className="py-3 px-6">Commission</th>
                        <th className="py-3 px-6">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {history.map((c) => (
                        <tr key={c.id} className="border-b border-white/10">
                            <td className="py-4 px-6">{new Date(c.created_at).toLocaleDateString()}</td>
                            <td className="py-4 px-6 font-mono text-xs">{c.sale_reference?.slice(0, 16)}...</td>
                            <td className="py-4 px-6">GH₵ {c.sell_price?.toFixed(2)}</td>
                            <td className="py-4 px-6 text-green-400 font-bold">+GH₵ {c.profit?.toFixed(2)}</td>
                            <td className="py-4 px-6">
                                <span className={`px-2 py-1 rounded text-xs ${getStatusClasses(c.status)}`}>
                                    {c.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const AgentCommissions: React.FC = () => {
    const [stats, setStats] = useState<WalletStats | null>(null);
    const [balance, setBalance] = useState<number>(0);
    const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setIsHistoryLoading(true);

        try {
            const statsResponse = await axios.get<WalletStats>('/wallet/stats');
            setStats(statsResponse.data);
            setBalance(statsResponse.data.current_balance ?? 0);

            const historyResponse = await axios.get<{ data: CommissionRecord[] }>('/commissions');
            setCommissions(historyResponse.data.data);
        } catch (error) {
            toast.error("Failed to load commission data.");
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
                Commission Center
            </h1>

            {isLoading ? (
                <div className="p-10 text-center text-slate-400 bg-white/5 rounded-xl">
                    Loading financial summary...
                </div>
            ) : stats ? (
                <CommissionSummary stats={stats} balance={balance} />
            ) : (
                <div className="p-10 text-center text-red-400 bg-red-900/20 border border-red-700/50 rounded-xl">
                    Error loading wallet statistics.
                </div>
            )}

            <div className="flex items-center gap-2 mb-4 text-white">
                <History size={20} />
                <h2 className="text-xl font-semibold">Commission History</h2>
            </div>

            <CommissionHistory
                history={commissions}
                isHistoryLoading={isHistoryLoading}
            />
        </div>
    );
};

export default AgentCommissions;
