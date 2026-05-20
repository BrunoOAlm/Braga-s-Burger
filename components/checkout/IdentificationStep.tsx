'use client';
import type { Customer } from '@/lib/types';
interface Props {
  value: Customer;
  onChange: (c: Customer) => void;
  onNext: () => void;
}
export function IdentificationStep(_props: Props) {
  return <div>Identificação (em construção)</div>;
}
