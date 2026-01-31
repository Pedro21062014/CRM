
export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  imageUrl?: string;
  stock: number;
  orderIndex?: number;
  createdAt?: any;
  updatedAt?: any;
}

export type ClientType = 'common' | 'commercial';

// Adicionando tipos de status para funil de vendas
export type ClientStatus = 'potential' | 'negotiation' | 'converted' | 'active' | 'loyal';

export interface Client {
  id: string;
  clientType: ClientType; // 'common' or 'commercial'
  name: string; // Nome do Cliente ou Razão Social
  email?: string;
  phone: string;
  address?: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    zip: string;
    complement?: string;
  };
  // Campos específicos para Pontos Comerciais
  contactPerson?: string; // Responsável pela compra
  purchasePotential?: number; // Potencial de compra
  bestBuyDay?: string; // Melhor dia de compra
  lastVisit?: string; // Data da última visita (ISO string YYYY-MM-DD para simplificar formulários)
  nextVisit?: string; // Data da próxima visita (Programação)
  notes?: string; // Observações
  status?: ClientStatus; // Classificação do funil
  
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
  rating?: number; // 1 to 5
  review?: string;
  paymentMethod?: string;
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

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId?: string;
}

export interface StoreConfig {
  storeName: string;
  description?: string; // Slogan ou info extra (ex: "Aberto das 18h as 23h")
  whatsapp?: string; // Número para receber pedidos
  themeColor: string;
  logoUrl?: string;
  bannerUrl?: string; // Capa estilo iFood
  sections: StoreSection[];
  ratingSum?: number;
  ratingCount?: number;
  // Integração Meta
  metaWhatsApp?: WhatsAppConfig;
}