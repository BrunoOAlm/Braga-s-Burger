'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/cart-store';
import { calcDiscount, calcSubtotal } from '@/lib/cart';
import { isOpen } from '@/lib/store-status';
import { estimateTotalMinutes } from '@/lib/delivery-time';
import { generateOrderId } from '@/lib/order-id';
import { buildWhatsAppMessage } from '@/lib/order-message';
import { storeConfig } from '@/config/store';
import { categories } from '@/data/menu';
import { deliveryAreas } from '@/data/delivery';
import { IdentificationStep } from '@/components/checkout/IdentificationStep';
import { DeliveryStep } from '@/components/checkout/DeliveryStep';
import { PaymentStep } from '@/components/checkout/PaymentStep';
import { ReviewStep } from '@/components/checkout/ReviewStep';
import { OrderStatusScreen } from '@/components/checkout/OrderStatusScreen';
import { OrderToast } from '@/components/ui/OrderToast';
import type { Address, Customer, DeliveryMethod, PaymentMethod } from '@/lib/types';

type Step = 'identification' | 'delivery' | 'payment' | 'review' | 'sent';

const rangeFor = (m: number) => ({ min: m - 5, max: m + 5 });

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const coupon = useCartStore((s) => s.coupon);

  const [step, setStep] = useState<Step>('identification');
  const [customer, setCustomer] = useState<Customer>({ name: '', phone: '' });
  const [method, setMethod] = useState<DeliveryMethod>('delivery');
  const [address, setAddress] = useState<Address | null>(null);
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [changeFor, setChangeFor] = useState<number | undefined>(undefined);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [sentEstimate, setSentEstimate] = useState<{ min: number; max: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const subtotal = useMemo(() => calcSubtotal(items), [items]);
  const discount = useMemo(() => calcDiscount(subtotal, coupon), [subtotal, coupon]);
  const fee = useMemo(() => {
    if (method !== 'delivery' || !address) return 0;
    return (
      deliveryAreas.find(
        (a) => a.neighborhood.toLowerCase() === address.neighborhood.toLowerCase(),
      )?.fee ?? 0
    );
  }, [method, address]);
  const total = subtotal - discount + fee;
  const estimateMinutes = estimateTotalMinutes(method, storeConfig.averagePrepTime, fee);
  const estimatedRange = rangeFor(estimateMinutes);

  if (items.length === 0 && step !== 'sent') {
    router.replace('/');
    return null;
  }

  if (step === 'sent' && orderId && sentEstimate) {
    return (
      <OrderStatusScreen
        orderId={orderId}
        estimatedMinutes={sentEstimate}
        method={method}
        customer={customer}
        address={method === 'delivery' && address ? address : undefined}
      />
    );
  }

  const submit = () => {
    setErrorMessage(null);

    if (!isOpen(new Date(), storeConfig.openingHours)) {
      setErrorMessage('A loja está fechada agora. Confira os horários e tente de novo.');
      return;
    }
    if (subtotal < storeConfig.minOrder) {
      setErrorMessage(
        `Pedido mínimo: R$ ${storeConfig.minOrder.toFixed(2).replace('.', ',')}`,
      );
      return;
    }
    if (method === 'delivery' && (!address || fee === 0)) {
      setErrorMessage('Selecione um bairro atendido.');
      return;
    }
    if (!payment) {
      setErrorMessage('Selecione uma forma de pagamento.');
      return;
    }

    const id = generateOrderId();
    const msg = buildWhatsAppMessage({
      orderId: id,
      customer,
      items,
      categories,
      coupon,
      subtotal,
      discount,
      deliveryFee: fee,
      total,
      estimatedMinutes: estimatedRange,
      method,
      address: method === 'delivery' ? address! : undefined,
      payment,
      changeFor: payment === 'cash' ? changeFor : undefined,
      storeBusinessName: storeConfig.whatsappBusinessName,
      storeAddress: storeConfig.address,
    });

    const url = `https://wa.me/${storeConfig.whatsappNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');

    setOrderId(id);
    setSentEstimate(estimatedRange);
    setStep('sent');
  };

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
            subtotal={subtotal}
            deliveryFee={fee}
            discount={discount}
            total={total}
            method={method}
            estimatedRange={estimatedRange}
            onSubmit={submit}
            onBack={() => setStep('payment')}
          />
        )}
      </div>

      <OrderToast message={errorMessage} />
    </main>
  );
}
