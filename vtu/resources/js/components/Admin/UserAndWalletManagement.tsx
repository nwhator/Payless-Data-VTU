import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import WalletActionPanel from "./WalletActionPanel";
import UserTabs from "./UserTabs";
import UserTable from "./UserTable";

// --- UNIFIED TYPE DEFINITIONS ---
interface UserDetail {
    id: number;
    name: string;
    email: string;
    role: "agent" | "customer" | string;
    balance?: number; // Must be optional
    sales_commission?: number; // Must be optional
    commission_earned?: number; // Must be optional
}

interface UserResponse {
    data: UserDetail[];
}

const UserAndWalletManagement: React.FC = () => {
    // Component State for Data and UI
    const [users, setUsers] = useState<UserDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedTab, setSelectedTab] = useState<"all" | "agents" | "customers">("all");
    const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);

    // DEDICATED HANDLER to pass to UserTable (Fix 1)
    const handleSelectUser = (user: UserDetail) => {
        setSelectedUser(user);
    };

    // 1. Data Fetching Effect
    useEffect(() => {
        // ... (fetch logic remains the same)
        const fetchUsers = async () => {
            setLoading(true);
            setError(null);
            setSelectedUser(null);

            try {
                const response = await axios.get<UserResponse>("/admin/users");
                setUsers(response.data.data);
            } catch (err) {
                console.error("Failed to fetch users:", err);
                const msg =
                    axios.isAxiosError(err) && err.response?.data?.message
                        ? err.response.data.message
                        : "Failed to load user data.";
                setError(msg);
                toast.error(msg);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    // 2. Smart filtering based on tab
    const filteredUsers = useMemo(() => {
        if (selectedUser) {
            const userRole = selectedUser.role === 'agent' ? 'agents' : 'customers';
            if (selectedTab !== 'all' && selectedTab !== userRole) {
                setSelectedUser(null);
            }
        }

        if (selectedTab === "agents") return users.filter(u => u.role === "agent");
        if (selectedTab === "customers") return users.filter(u => u.role === "customer");
        return users;
    }, [selectedTab, users, selectedUser]);

    // 3. Smart columns based on tab (Unchanged)
    const columns = useMemo(() => {
        if (selectedTab === "agents") {
            return ["Name", "Email", "Role", "Sales Commission"];
        } else if (selectedTab === "customers") {
            return ["Name", "Email", "Role", "Balance"];
        } else {
            return ["Name", "Email", "Role"];
        }
    }, [selectedTab]);

    // 4. Panel Visibility (Unchanged)
    const showWalletPanel = selectedTab === "agents" || selectedTab === "customers";

    // --- RENDER LOGIC ---
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 text-white/70">
                <Loader2 className="w-8 h-8 animate-spin mr-2" />
                Loading user data...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-900/30 rounded-xl border border-red-700/50 text-red-300">
                <p className="font-semibold">Error:</p>
                <p>{error}</p>
                <p className="mt-2 text-sm">
                    Please check the API route: <code>GET /admin/users</code>
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <UserTabs selected={selectedTab} setSelected={setSelectedTab} />

            <div className={`grid grid-cols-1 ${showWalletPanel ? "lg:grid-cols-3" : ""} gap-6`}>
                <div className={showWalletPanel ? "lg:col-span-2" : "col-span-1"}>
                    <UserTable
                        users={filteredUsers}
                        // Use the dedicated handler (Fix 1 applied)
                        setSelectedUser={handleSelectUser} 
                        columns={columns}
                        selectedTab={selectedTab}
                    />
                </div>

                {showWalletPanel && (
                    <div className="h-full"> 
                        {selectedUser ? (
                            <WalletActionPanel 
                                user={selectedUser} 
                                // The setter here is correct because updatedUser is explicitly typed as UserDetail
                                setUser={(updatedUser: UserDetail) => {
                                    setUsers(prevUsers => prevUsers.map(u => 
                                        u.id === updatedUser.id ? updatedUser : u
                                    ));
                                    setSelectedUser(updatedUser);
                                }}
                            />
                        ) : (
                            <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-700/50 text-slate-400 text-center h-full flex items-center justify-center">
                                Select a user to manage wallet
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default UserAndWalletManagement;