export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  imageUrl?: string;
  stock: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    zip: string;
    complement?: string;
  };
  lastOrderDate?: any;
  totalOrders?: number;
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
  merchantId?: string; // Para rastreamento local
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    zip: string;
    complement?: string;
  };
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    imageUrl?: string;
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
  description?: string; // Slogan ou info extra (ex: "Aberto das 18h as 23h")
  themeColor: string;
  logoUrl?: string;
  bannerUrl?: string; // Capa estilo iFood
  sections: StoreSection[];
}