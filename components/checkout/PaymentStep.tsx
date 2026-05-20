'use client';
import type { PaymentMethod } from '@/lib/types';
interface Props {
  payment: PaymentMethod | null;
  changeFor: number | undefined;
  onPaymentChange: (p: PaymentMethod) => void;
  onChangeForChange: (v: number | undefined) => void;
  onNext: () => void;
  onBack: () => void;
}
export function PaymentStep(_props: Props) {
  return <div>Pagamento (em construção)</div>;
}
