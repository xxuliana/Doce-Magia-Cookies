export interface Product {
  id: string | number;
  emoji: string;
  name: string;
  desc: string;
  price: number;
  isNew: boolean;
  stock: number;
  category: string;
  image?: string;
}

export interface CartItem extends Product {
  qty: number;
}

export interface Order {
  id: string | number;
  client: string;
  phone: string;
  delivery: 'retirada' | 'delivery';
  address: string;
  items: CartItem[];
  total: number;
  obs: string;
  status: 'pending' | 'preparing' | 'shipping' | 'completed' | 'canceled';
  date: string;
  isNew?: boolean;
  pointsRedeemed?: number;
  discountValue?: number;
  userId?: string | null;
  paymentMethod?: 'pix' | 'card_credit' | 'card_debit';
  paymentId?: string;
  installments?: number;
  isScheduled?: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
  paidAmount?: number;
  remainingAmount?: number;
}

export interface StockLevels {
  [key: string | number]: number;
}

export interface AppSettings {
  whatsappNumber: string;
  deliveryFee: number;
  messageTemplate1: string; // Order Confirmation
  messageTemplate2: string; // In Production
  messageTemplate3: string; // Out for Delivery
  messageTemplate4: string; // Ready for Pickup
  messageTemplate5: string; // Canceled
  loyaltyEnabled: boolean;
  pointsPerReal: number;
  realPerPoint: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  points: number;
  isAdmin?: boolean;
}
