import type { Coupon } from '@/lib/types';

export const coupons: Coupon[] = [
  { code: 'BEMVINDO10', type: 'percent', value: 10 },
  { code: 'FRETE5', type: 'fixed', value: 5, minSubtotal: 40 },
];
