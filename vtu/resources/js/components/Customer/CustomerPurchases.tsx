// src/components/Customer/CustomerPurchases.tsx

import React from 'react';

/* -----------------------------------
   PROPS INTERFACE
------------------------------------ */
interface Order {
  id: string;
  reference: string;
  source: string;
  bundle: string; // e.g., "MTN 2GB"
  recipient: string; // e.g., "054xxxxxxx"
  amount: string; // e.g., "GHS 12.50"
  paymentStatus: string;
  status: string; // e.g., "SUCCESS"
  statusColor: string; // e.g., "text-green-400"
  date: string; // e.g., "Nov 14, 2025"
  time: string; // e.g., "06:50 PM"
}

interface CustomerPurchasesProps {
  loading: boolean;
  orders: Order[];
}

/* -----------------------------------
   MAIN COMPONENT
------------------------------------ */
const CustomerPurchases: React.FC<CustomerPurchasesProps> = ({ loading, orders }) => {

  if (loading) return <div className="p-4 text-center text-gray-400">Loading purchases...</div>;
  
  if (orders.length === 0) {
    return (
      <div className="p-6 text-center border border-gray-700 rounded-xl bg-[#071821]">
        <h3 className="text-xl font-semibold mb-2">No Purchases Yet</h3>
        <p className="text-gray-400">Start by purchasing a bundle from the dashboard overview.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Your Purchase History</h2>
      
      <div className="grid gap-4">
        {orders.map(order => (
          <div 
            key={order.id} 
            // Removed any hover/click effects to ensure non-clickable
            className="p-4 rounded-xl border border-gray-700 bg-[#071821] shadow-lg"
          >
            <div className="flex justify-between items-start mb-2">
              {/* Bundle/Product Name (The main item) */}
              <div className="font-bold text-xl text-white">
                {order.bundle}
              </div>
              
              {/* Amount Paid */}
              <div className="font-extrabold text-xl text-green-400">
                {order.amount}
              </div>
            </div>
            
            {/* Secondary Details: Recipient and Status */}
            <div className="flex justify-between items-center text-sm">
                <div className="text-gray-400">
                    Recipient: <span className="font-semibold text-gray-200">{order.recipient}</span>
                </div>
                <div className={`font-semibold ${order.statusColor}`}>
                    {order.status}
                </div>
            </div>

            {/* Tertiary Details: Date and Time */}
            <div className="flex justify-between items-center text-xs mt-2 border-t border-gray-800 pt-2">
                <span className="text-gray-500">Ref: {order.reference || order.id}</span>
                <span className="text-gray-500">
                    {order.date} at {order.time}
                </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerPurchases;
