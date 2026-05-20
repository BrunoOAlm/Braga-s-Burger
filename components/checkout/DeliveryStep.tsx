'use client';
import type { Address, DeliveryMethod } from '@/lib/types';
interface Props {
  method: DeliveryMethod;
  address: Address | null;
  onMethodChange: (m: DeliveryMethod) => void;
  onAddressChange: (a: Address | null) => void;
  onNext: () => void;
  onBack: () => void;
}
export function DeliveryStep(_props: Props) {
  return <div>Entrega (em construção)</div>;
}
