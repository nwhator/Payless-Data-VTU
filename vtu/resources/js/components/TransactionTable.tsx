import React from "react";
import type { Transaction } from "@/types/transaction";

export default function TransactionTable({ items }: { items: Transaction[] }) {
  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500">
            <th className="py-2">Ref</th>
            <th className="py-2">Type</th>
            <th className="py-2">Phone</th>
            <th className="py-2">Amount</th>
            <th className="py-2">Status</th>
            <th className="py-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="py-2">{t.reference}</td>
              <td className="py-2">{t.type}</td>
              <td className="py-2">{(t.meta as { phone?: string })?.phone ?? "—"}</td>
              <td className="py-2">₵{Number(t.amount).toFixed(2)}</td>
              <td className="py-2">{t.status}</td>
              <td className="py-2">{new Date(t.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
