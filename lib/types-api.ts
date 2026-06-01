// Tipos espelhando o JSON do backend Java/Spring (sub-projeto 3).
// Espelha 1:1 os DTOs em backend/src/main/java/com/bragas/api/order/dto/.

export type OrderStatus =
  | 'RECEIVED'
  | 'PREPARING'
  | 'OUT'
  | 'DELIVERED'
  | 'CANCELLED';

export type FulfillmentType = 'DELIVERY' | 'PICKUP';

export type PaymentMethodApi = 'PIX' | 'CASH' | 'CREDIT' | 'DEBIT';

export interface ApiAddress {
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  complement?: string;
  reference?: string;
}

export interface CreateOrderRequest {
  customer: { name: string; phone: string };
  fulfillmentType: FulfillmentType;
  address?: ApiAddress;
  payment: PaymentMethodApi;
  changeFor?: number;
  items: { productId: string; quantity: number; notes?: string }[];
  couponCode?: string;
}

export interface OrderItemResponse {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  notes?: string;
}

export interface OrderTotals {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
}

export interface OrderTimestamps {
  receivedAt: string;
  preparingAt: string | null;
  outAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
}

export interface OrderResponse {
  id: string;
  displayId: string;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  customer: { name: string; phone: string };
  address?: ApiAddress;
  payment: PaymentMethodApi;
  changeFor?: number | null;
  items: OrderItemResponse[];
  couponCode?: string | null;
  totals: OrderTotals;
  estimatedMinutes: { min: number; max: number };
  createdAt: string;
  userId?: string | null;
  timestamps: OrderTimestamps;
}

// Problem Details (RFC 7807) — formato dos erros do backend.
export interface ProblemDetails {
  type?: string;
  title?: string;
  detail?: string;
  status?: number;
  instance?: string;
}

// ── SP4b: auth do cliente ─────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotRequest {
  email: string;
}

export interface ResetRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateMeRequest {
  name?: string;
  phone?: string;
}

export interface OrderSummary {
  id: string;
  displayId: string;
  status: OrderStatus;
  total: number;
  itemsCount: number;
  createdAt: string;
}

export interface OrdersPage {
  items: OrderSummary[];
  total: number;
  limit: number;
  offset: number;
}
