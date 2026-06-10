import type {
  CouponValidationRequest,
  CouponValidationResponse,
  MenuResponse,
} from './types-api';

const BASE_URL =
  typeof window === 'undefined'
    ? `${process.env.BACKEND_URL ?? 'http://localhost:8080'}/api/v1`
    : (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1');

export async function getMenu(opts?: { revalidate?: number }): Promise<MenuResponse> {
  const res = await fetch(`${BASE_URL}/menu`, {
    next: { revalidate: opts?.revalidate ?? 300 },
  });
  if (!res.ok) {
    throw new Error(`getMenu failed: HTTP ${res.status}`);
  }
  return (await res.json()) as MenuResponse;
}

export async function validateCoupon(
  body: CouponValidationRequest,
): Promise<CouponValidationResponse> {
  const res = await fetch(`${BASE_URL}/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`validateCoupon failed: HTTP ${res.status}`);
  }
  return (await res.json()) as CouponValidationResponse;
}
