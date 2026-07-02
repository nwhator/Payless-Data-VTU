export interface User {
 id: number;
 name: string;
 email: string;
 role: string;
}

export interface Product {
  id: number;
 name: string;
 capacity: string;
 price: number; // <-- This will now hold customer_price
 customer_price: number; // <-- NEW FIELD
 currency: string;
 product_code: string;
 validity: string;
}

export type ModalStage = 'auth' | 'summary' | 'fund';