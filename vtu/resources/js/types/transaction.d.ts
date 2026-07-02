// resources/js/types/transaction.d.ts
export interface TransactionMeta {
  [key: string]: unknown;
}

export interface Transaction {
  id: number;
  reference: string;
  user_id: number;
  product_id?: number | null;
  amount: number;
  supplier_amount?: number | null;
  commission?: number | null;
  status: string;
  type?: string;
  meta?: TransactionMeta | null;
  created_at: string;
  updated_at: string;
}
