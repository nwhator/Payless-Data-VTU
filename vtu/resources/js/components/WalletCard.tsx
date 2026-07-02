import { Card } from "./ui/card";
import { formatCurrency } from "@/lib/formatCurrency";

export default function WalletCard({ balance = 0 }: { balance?: number }) {
  return (
    <Card>
      <p className="text-xs uppercase text-gray-500">Wallet</p>
      <p className="text-2xl font-bold mt-2">{formatCurrency(balance)}</p>
    </Card>
  );
}
