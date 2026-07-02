export interface ProductMeta {
  [key: string]: unknown;
}

export interface Product {
  id: number;
  sku?: string;
  name: string;
  type: "data" | "airtime";
  supplier_price: number;
  display_price: number;
  active: boolean;
  meta?: ProductMeta | null;
}
