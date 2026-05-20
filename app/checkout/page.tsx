'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/cart-store';
import { IdentificationStep } from '@/components/checkout/IdentificationStep';
import { DeliveryStep } from '@/components/checkout/DeliveryStep';
import { PaymentStep } from '@/components/checkout/PaymentStep';
import { ReviewStep } from '@/components/checkout/ReviewStep';
import { OrderStatusScreen } from '@/components/checkout/OrderStatusScreen';
import { OrderToast } from '@/components/ui/OrderToast';
import type { Address, Customer, DeliveryMethod, PaymentMethod } from '@/lib/types';

type Step = 'identification' | 'delivery' | 'payment' | 'review' | 'sent';

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);

  const [step, setStep] = useState<Step>('identification');
  const [customer, setCustomer] = useState<Customer>({ name: '', phone: '' });
  const [method, setMethod] = useState<DeliveryMethod>('delivery');
  const [address, setAddress] = useState<Address | null>(null);
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [changeFor, setChangeFor] = useState<number | undefined>(undefined);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [estimatedMinutes, setEstimatedMinutes] = useState<{ min: number; max: number }>({
    min: 20,
    max: 30,
  });
  const [errorMessage] = useState<string | null>(null);

  // Carrinho vazio e checkout não enviado → volta pro home
  if (items.length === 0 && step !== 'sent') {
    router.replace('/');
    return null;
  }

  if (step === 'sent' && orderId) {
    return <OrderStatusScreen orderId={orderId} estimatedMinutes={estimatedMinutes} />;
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-paper">
      <h1 className="font-heading text-3xl font-extrabold">Finalizar pedido</h1>

      <div className="mt-8">
        {step === 'identification' && (
          <IdentificationStep
            value={customer}
            onChange={setCustomer}
            onNext={() => setStep('delivery')}
          />
        )}

        {step === 'delivery' && (
          <DeliveryStep
            method={method}
            address={address}
            onMethodChange={setMethod}
            onAddressChange={setAddress}
            onNext={() => setStep('payment')}
            onBack={() => setStep('identification')}
          />
        )}

        {step === 'payment' && (
          <PaymentStep
            payment={payment}
            changeFor={changeFor}
            onPaymentChange={setPayment}
            onChangeForChange={setChangeFor}
            onNext={() => setStep('review')}
            onBack={() => setStep('delivery')}
          />
        )}

        {step === 'review' && (
          <ReviewStep
            onSubmit={() => {
              // Implementação completa virá na Task 21 (envio + validações + WhatsApp).
              setOrderId('#0000');
              setStep('sent');
            }}
            onBack={() => setStep('payment')}
          />
        )}
      </div>

      <OrderToast message={errorMessage} />
    </main>
  );
}
