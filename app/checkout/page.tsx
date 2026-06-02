'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCartStore } from '@/lib/cart-store';
import { useAuth } from '@/lib/auth-context';
import { calcSubtotal } from '@/lib/cart';
import { isOpen } from '@/lib/store-status';
import { estimateTotalMinutes } from '@/lib/delivery-time';
import { buildWhatsAppMessage } from '@/lib/order-message';
import * as api from '@/lib/api-client';
import { ApiError } from '@/lib/api-client';
import { getMenu } from '@/lib/menu-api';
import { toLegacyMenu } from '@/lib/menu-adapter';
import { storeConfig } from '@/config/store';
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

function humanize(err: ApiError): string {
  switch (err.type) {
    case 'store-closed':
      return 'A loja está fechada agora. Confira os horários.';
    case 'product-not-found':
    case 'product-unavailable':
      return 'Um produto do seu carrinho saiu do cardápio. Atualize e tente de novo.';
    case 'delivery-area-not-served':
      return 'Não entregamos no bairro selecionado.';
    case 'order-min-not-met':
      return 'Pedido abaixo do mínimo de R$ 25,00.';
    case 'change-insufficient':
      return 'O troco precisa cobrir o total.';
    case 'coupon-invalid':
    case 'coupon-min-not-met':
      return 'Cupom inválido ou não aplicável.';
    case 'validation-failed':
      return 'Preencha todos os campos obrigatórios.';
    case 'network-error':
      return 'Sem conexão com o servidor. Tente de novo em alguns instantes.';
    default:
      return err.detail || 'Erro ao enviar pedido.';
  }
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutPageInner />
    </Suspense>
  );
}

function CheckoutPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { state: authState } = useAuth();
  const queryOrderId = sp.get('orderId');
  const items = useCartStore((s) => s.items);
  const coupon = useCartStore((s) => s.coupon);

  const [step, setStep] = useState<Step>('identification');
  const [customer, setCustomer] = useState<Customer>(() =>
    authState.status === 'authenticated'
      ? { name: authState.user.name, phone: authState.user.phone }
      : { name: '', phone: '' },
  );

  useEffect(() => {
    if (authState.status === 'authenticated' && !customer.name) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCustomer({
        name: authState.user.name,
        phone: authState.user.phone,
      });
    }
    // intencional: só ressincroniza quando o login resolve, não a cada mudança no customer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.status]);
  const [method, setMethod] = useState<DeliveryMethod>('delivery');
  const [address, setAddress] = useState<Address | null>(null);
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [changeFor, setChangeFor] = useState<number | undefined>(undefined);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [sentEstimate, setSentEstimate] = useState<{ min: number; max: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const subtotal = useMemo(() => calcSubtotal(items), [items]);
  // Desconto vem do POST /coupons/validate (salvo em coupon.discount). O
  // backend recalcula tudo no POST /orders, então qualquer divergência
  // é corrigida lá.
  const discount = coupon?.discount ?? 0;
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

  useEffect(() => {
    if (items.length === 0 && step !== 'sent' && !queryOrderId) {
      router.replace('/');
    }
  }, [items.length, step, router, queryOrderId]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (queryOrderId && step !== 'sent') {
      setOrderId(queryOrderId);
      setSentEstimate({ min: 0, max: 0 });
      setStep('sent');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryOrderId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (items.length === 0 && step !== 'sent' && !queryOrderId) {
    return null;
  }

  if (step === 'sent' && orderId && sentEstimate) {
    return (
      <OrderStatusScreen
        orderId={orderId}
        initialEstimatedMinutes={sentEstimate}
        method={method}
        customer={customer}
        address={method === 'delivery' && address ? address : undefined}
      />
    );
  }

  const submit = async () => {
    if (submitting) return;
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

    setSubmitting(true);
    try {
      // 1) Cria o pedido — passo crítico. Se falhar, nada mais acontece.
      const order = await api.createOrder({
        customer,
        fulfillmentType: method === 'delivery' ? 'DELIVERY' : 'PICKUP',
        address: method === 'delivery' && address ? address : undefined,
        payment: payment.toUpperCase() as 'PIX' | 'CASH' | 'CREDIT' | 'DEBIT',
        changeFor: payment === 'cash' ? changeFor : undefined,
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          notes: i.notes.trim() ? i.notes.trim() : undefined,
        })),
        couponCode: coupon?.code,
      });

      // 2) Busca categorias só pra agrupar a mensagem do WhatsApp. Se /menu
      // falhar, a mensagem sai sem grouping — o pedido JÁ FOI criado e o
      // usuário não deve clicar de novo (evita pedidos duplicados).
      let categories: ReturnType<typeof toLegacyMenu>['categories'] = [];
      try {
        const menu = await getMenu({ revalidate: 300 });
        categories = toLegacyMenu(menu).categories;
      } catch {
        // intencional: degrade gracioso — segue com categories=[]
      }

      const msg = buildWhatsAppMessage({
        orderId: order.displayId,
        customer,
        items,
        categories,
        coupon,
        subtotal: order.totals.subtotal,
        discount: order.totals.discount,
        deliveryFee: order.totals.deliveryFee,
        total: order.totals.total,
        estimatedMinutes: order.estimatedMinutes,
        method,
        address: method === 'delivery' ? address! : undefined,
        payment,
        changeFor: payment === 'cash' ? changeFor : undefined,
        storeBusinessName: storeConfig.whatsappBusinessName,
        storeAddress: storeConfig.address,
      });

      const url = `https://wa.me/${storeConfig.whatsappNumber}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');

      setOrderId(order.id);
      setSentEstimate(order.estimatedMinutes);
      setStep('sent');
    } catch (e) {
      if (e instanceof ApiError) {
        setErrorMessage(humanize(e));
      } else {
        setErrorMessage('Erro ao enviar pedido.');
      }
    } finally {
      setSubmitting(false);
    }
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
