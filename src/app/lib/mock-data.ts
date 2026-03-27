export type ProductStatus = 'Received' | 'In Repair' | 'Tested' | 'Listed' | 'Sold';

export interface Product {
  id: string;
  name: string;
  status: ProductStatus;
  condition: string;
  cost: number;
  repairCost: number;
  salePrice?: number;
  purchaseDate: string;
  warrantyEndDate: string;
  nextServiceDate: string;
  paymentDueDate?: string;
  customerId?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalSpent: number;
  lastPurchaseDate: string;
}

export interface Sale {
  id: string;
  productId: string;
  customerId: string;
  amount: number;
  date: string;
  paymentMethod: string;
}

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'C1', name: 'James Wilson', email: 'james.wilson@email.com', phone: '555-0101', totalSpent: 1250, lastPurchaseDate: '2023-12-15' },
  { id: 'C2', name: 'Sophia Miller', email: 'sophia.m@email.com', phone: '555-0202', totalSpent: 850, lastPurchaseDate: '2024-01-10' },
  { id: 'C3', name: 'Robert Chen', email: 'r.chen@email.com', phone: '555-0303', totalSpent: 2100, lastPurchaseDate: '2024-02-05' },
  { id: 'C4', name: 'Emily Davis', email: 'emily.d@email.com', phone: '555-0404', totalSpent: 450, lastPurchaseDate: '2023-11-20' },
];

export const MOCK_PRODUCTS: Product[] = [
  { 
    id: 'P1', 
    name: 'iPhone 13 Pro (Graphite)', 
    status: 'Sold', 
    condition: 'Excellent', 
    cost: 450, 
    repairCost: 50, 
    salePrice: 750, 
    purchaseDate: '2023-11-15', 
    warrantyEndDate: '2024-11-15', 
    nextServiceDate: '2024-05-15',
    customerId: 'C1'
  },
  { 
    id: 'P2', 
    name: 'MacBook Air M1 (Silver)', 
    status: 'Listed', 
    condition: 'Good', 
    cost: 550, 
    repairCost: 120, 
    purchaseDate: '2024-01-05', 
    warrantyEndDate: '2025-01-05', 
    nextServiceDate: '2024-07-05'
  },
  { 
    id: 'P3', 
    name: 'Sony WH-1000XM4', 
    status: 'In Repair', 
    condition: 'Fair', 
    cost: 80, 
    repairCost: 40, 
    purchaseDate: '2024-02-10', 
    warrantyEndDate: '2025-02-10', 
    nextServiceDate: '2024-08-10'
  },
  { 
    id: 'P4', 
    name: 'iPad Pro 11-inch (3rd Gen)', 
    status: 'Tested', 
    condition: 'Excellent', 
    cost: 350, 
    repairCost: 20, 
    purchaseDate: '2024-02-01', 
    warrantyEndDate: '2025-02-01', 
    nextServiceDate: '2024-08-01'
  },
  { 
    id: 'P5', 
    name: 'Canon EOS R6 Body', 
    status: 'Sold', 
    condition: 'Excellent', 
    cost: 1200, 
    repairCost: 150, 
    salePrice: 1850, 
    purchaseDate: '2023-12-01', 
    warrantyEndDate: '2024-12-01', 
    nextServiceDate: '2024-06-01',
    customerId: 'C3'
  },
];

export const MOCK_SALES: Sale[] = [
  { id: 'S1', productId: 'P1', customerId: 'C1', amount: 750, date: '2023-12-15', paymentMethod: 'Credit Card' },
  { id: 'S2', productId: 'P5', customerId: 'C3', amount: 1850, date: '2024-02-05', paymentMethod: 'Bank Transfer' },
];