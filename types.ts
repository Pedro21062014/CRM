export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  imageUrl?: string;
  stock: number;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  createdAt: any;
}

export enum OrderStatus {
  NEW = 'new',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  status: OrderStatus;
  createdAt: any;
}

// Store Builder Types
export type SectionType = 'hero' | 'products' | 'text' | 'image';

export interface StoreSection {
  id: string;
  type: SectionType;
  title?: string;
  content?: string; // For text or hero subtitle
  imageUrl?: string; // For hero or image section
  backgroundColor?: string;
  textColor?: string;
  layout?: 'grid' | 'list'; // For products
}

export interface StoreConfig {
  storeName: string;
  themeColor: string;
  logoUrl?: string;
  sections: StoreSection[];
}