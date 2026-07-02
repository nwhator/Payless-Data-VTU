import React from "react";

// --- UNIFIED TYPE DEFINITION (Must be identical to parent) ---
interface UserDetail {
    id: number;
    name: string;
    email: string;
    role: "agent" | "customer" | string;
    balance?: number; // Must be optional
    sales_commission?: number; // Must be optional
    commission_earned?: number; // Must be optional
}

interface Props {
    users: UserDetail[];
    // FIX: Change prop signature to match the simple function passed from the parent
    setSelectedUser: (user: UserDetail) => void; 
    columns: string[];
    selectedTab: "all" | "agents" | "customers";
}

const UserTable: React.FC<Props> = ({ users, setSelectedUser, columns, selectedTab }) => {
    return (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl shadow-lg w-full min-w-0">
            <table className="w-full text-sm text-left table-auto text-slate-300">
                <thead className="text-xs uppercase bg-slate-800/80 text-white">
                    <tr>
                        {columns.map((col, i) => (
                            <th key={i} className="p-4">{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => {
                        let lastColumnValue: number | undefined;

                        if (selectedTab === "agents") {
                            lastColumnValue = user.commission_earned;
                        } else if (selectedTab === "customers") {
                            lastColumnValue = user.balance;
                        }
                        
                        return (
                            <tr
                                key={user.id}
                                onClick={() => setSelectedUser(user)}
                                className="border-t border-white/10 hover:bg-white/5 transition cursor-pointer"
                            >
                                <td className="p-4 text-white font-medium">{user.name}</td>
                                <td className="p-4 text-slate-300">{user.email}</td>
                                <td className="p-4 text-slate-300 capitalize">{user.role}</td>

                                {(selectedTab === "agents" || selectedTab === "customers") && (
                                    <td 
                                        className={`p-4 font-semibold whitespace-nowrap ${
                                            selectedTab === "agents" ? "text-green-400" : "text-blue-400"
                                        }`}
                                    >
                                        {lastColumnValue !== undefined && lastColumnValue !== null 
                                            ? `GHS ${lastColumnValue.toFixed(2)}` 
                                            : "N/A"}
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                    {!users.length && (
                        <tr>
                            <td colSpan={columns.length} className="p-6 text-center text-slate-500">
                                No users found for this category.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default UserTable;