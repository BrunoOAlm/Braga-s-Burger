import { ApiError } from './api-client';
import type { ProblemDetails } from './types-api';

export { ApiError };

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

type ReqInit = Omit<RequestInit, 'body'> & { body?: unknown; signal?: AbortSignal };

async function req<T>(path: string, init: ReqInit = {}): Promise<T> {
  const { body, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      credentials: 'include',
      ...rest,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(headers ?? {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      'network-error',
      'Sem conexão',
      'Não consegui falar com o servidor.',
    );
  }

  if (res.status === 204) return undefined as T;

  if (res.ok) {
    return (await res.json()) as T;
  }

  let problem: ProblemDetails = {};
  try {
    problem = (await res.json()) as ProblemDetails;
  } catch {
    /* sem body */
  }
  throw new ApiError(
    res.status,
    problem.type?.split('/').pop() ?? 'unknown',
    problem.title ?? 'Erro',
    problem.detail ?? `HTTP ${res.status}`,
  );
}

// === Tipos partilhados ===

export type OrderStatus = 'RECEIVED' | 'PREPARING' | 'OUT' | 'DELIVERED' | 'CANCELLED';

export type AdminOrder = {
  id: string;
  displayId: string;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number; notes?: string }>;
  totals: { subtotal: number; discount: number; deliveryFee: number; total: number };
  createdAt: string;
};

export type AdminOrderList = {
  items: AdminOrder[];
  page: number;
  size: number;
  total: number;
};

export type AdminProduct = {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  priceFrom?: number;
  imageUrl?: string;
  featured: boolean;
  available: boolean;
  displayOrder: number;
};

export type AdminCategory = {
  id: string;
  name: string;
  displayOrder: number;
  layout: 'grid' | 'list';
};

export type AdminCoupon = {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minSubtotal?: number;
  validFrom?: string;
  validUntil?: string;
  active: boolean;
};

export type AdminUser = { id: string; email: string; name: string; createdAt: string };

// === Auth ===

export const me = (signal?: AbortSignal) => req<AdminUser>('/auth/admin/me', { signal });
export const login = (email: string, password: string) =>
  req<void>('/auth/admin/login', { method: 'POST', body: { email, password } });
export const logout = () => req<void>('/auth/admin/logout', { method: 'POST' });

// === Orders ===

export type GetOrdersParams = { status?: string; page?: number; size?: number; signal?: AbortSignal };

export function getOrders({ status, page, size, signal }: GetOrdersParams = {}) {
  const qs = new URLSearchParams();
  if (status) qs.set('status', status);
  if (page !== undefined) qs.set('page', String(page));
  if (size !== undefined) qs.set('size', String(size));
  const suffix = qs.toString() ? `?${qs}` : '';
  return req<AdminOrderList>(`/admin/orders${suffix}`, { signal });
}

export const updateOrderStatus = (id: string, to: OrderStatus) =>
  req<AdminOrder>(`/admin/orders/${id}/status`, {
    method: 'PATCH',
    body: { to },
  });

// === Products ===

export const listProducts = (params?: { categoryId?: string }, signal?: AbortSignal) => {
  const qs = params?.categoryId ? `?categoryId=${encodeURIComponent(params.categoryId)}` : '';
  return req<AdminProduct[]>(`/admin/products${qs}`, { signal });
};
export const createProduct = (p: AdminProduct) =>
  req<AdminProduct>('/admin/products', { method: 'POST', body: p });
export const updateProduct = (id: string, patch: Partial<AdminProduct>) =>
  req<AdminProduct>(`/admin/products/${id}`, { method: 'PATCH', body: patch });
export const deleteProduct = (id: string) =>
  req<void>(`/admin/products/${id}`, { method: 'DELETE' });

// === Categories ===

export const listCategories = (signal?: AbortSignal) =>
  req<AdminCategory[]>('/admin/categories', { signal });
export const createCategory = (c: AdminCategory) =>
  req<AdminCategory>('/admin/categories', { method: 'POST', body: c });
export const updateCategory = (id: string, patch: Partial<AdminCategory>) =>
  req<AdminCategory>(`/admin/categories/${id}`, { method: 'PATCH', body: patch });
export const deleteCategory = (id: string) =>
  req<void>(`/admin/categories/${id}`, { method: 'DELETE' });

// === Coupons ===

export const listCoupons = (signal?: AbortSignal) =>
  req<AdminCoupon[]>('/admin/coupons', { signal });
export const createCoupon = (c: AdminCoupon) =>
  req<AdminCoupon>('/admin/coupons', { method: 'POST', body: c });
export const updateCoupon = (code: string, patch: Partial<AdminCoupon>) =>
  req<AdminCoupon>(`/admin/coupons/${code}`, { method: 'PATCH', body: patch });
export const deleteCoupon = (code: string) =>
  req<void>(`/admin/coupons/${code}`, { method: 'DELETE' });
