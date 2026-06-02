'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/lib/cart-store';
import { calcSubtotal } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import { validateCoupon } from '@/lib/menu-api';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: Props) {
  const items = useCartStore((s) => s.items);
  const coupon = useCartStore((s) => s.coupon);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const setNotes = useCartStore((s) => s.setNotes);
  const applyCoupon = useCartStore((s) => s.applyCoupon);
  const removeCoupon = useCartStore((s) => s.removeCoupon);

  const subtotal = useMemo(() => calcSubtotal(items), [items]);
  const discount = coupon?.discount ?? 0;
  const total = Math.max(0, subtotal - discount);

  const [codeInput, setCodeInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  // Re-valida o cupom quando o subtotal muda — backend pode recalcular
  // discount (mudou o tipo) ou invalidar (caiu abaixo do min_subtotal).
  useEffect(() => {
    if (!coupon) return;
    const handle = setTimeout(() => {
      validateCoupon({ code: coupon.code, subtotal })
        .then((res) => {
          if (!res.valid) {
            removeCoupon();
            setCouponError('Cupom não é mais válido.');
          } else if (res.discount !== coupon.discount) {
            applyCoupon({
              code: coupon.code,
              type: res.type ?? coupon.type,
              value: res.value ?? coupon.value,
              discount: res.discount,
            });
          }
        })
        .catch(() => { /* falha de rede — mantém estado atual */ });
    }, 400);
    return () => clearTimeout(handle);
    // intencional: roda quando subtotal muda; coupon entra como dep para
    // pegar o code mais recente sem disparar loop (applyCoupon só dispara
    // efeito se discount mudou).
  }, [subtotal, coupon, applyCoupon, removeCoupon]);

  const handleApplyCoupon = async () => {
    if (applying) return;
    setCouponError(null);
    const code = codeInput.trim();
    if (!code) return;
    setApplying(true);
    try {
      const res = await validateCoupon({ code, subtotal });
      if (!res.valid) {
        setCouponError('Cupom inválido ou não aplicável.');
        return;
      }
      applyCoupon({
        code: code.toUpperCase(),
        type: res.type ?? 'fixed',
        value: res.value ?? 0,
        discount: res.discount,
      });
      setCodeInput('');
    } catch {
      setCouponError('Erro ao validar cupom. Tente de novo.');
    } finally {
      setApplying(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-label="Carrinho"
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-ink p-6 text-paper shadow-2xl sm:max-w-lg"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-extrabold">Carrinho</h2>
          <button
            type="button"
            aria-label="Fechar carrinho"
            onClick={onClose}
            className="cursor-pointer rounded-full p-2 hover:bg-surface-hover"
          >
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <p className="mt-12 text-center text-muted">Seu carrinho está vazio.</p>
        ) : (
          <>
            <ul className="mt-6 flex-1 space-y-4 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="rounded border border-line bg-surface p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{item.product.name}</p>
                      <p className="text-sm text-muted">{formatPrice(item.product.price)}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remover ${item.product.name}`}
                      onClick={() => removeItem(item.id)}
                      className="cursor-pointer text-muted hover:text-paper"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Diminuir quantidade de ${item.product.name}`}
                      onClick={() => setQuantity(item.id, item.quantity - 1)}
                      className="cursor-pointer rounded-full border border-line px-2 py-0.5 text-sm hover:border-paper"
                    >
                      −
                    </button>
                    <span className="min-w-6 text-center font-semibold">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label={`Aumentar quantidade de ${item.product.name}`}
                      onClick={() => setQuantity(item.id, item.quantity + 1)}
                      className="cursor-pointer rounded-full border border-line px-2 py-0.5 text-sm hover:border-paper"
                    >
                      +
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Observação (opcional)"
                    aria-label={`Observação para ${item.product.name}`}
                    value={item.notes}
                    onChange={(e) => setNotes(item.id, e.target.value)}
                    className="mt-2 w-full rounded border border-line bg-ink px-2 py-1 text-sm text-paper placeholder:text-faint focus:border-paper focus:outline-none"
                  />
                </li>
              ))}
            </ul>

            <div className="mt-4 border-t border-line pt-4">
              <label className="block text-sm" htmlFor="coupon-input">
                Cupom
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="coupon-input"
                  type="text"
                  placeholder="Código"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  className="flex-1 rounded border border-line bg-ink px-2 py-1 text-sm text-paper placeholder:text-faint focus:border-paper focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={applying}
                  className="cursor-pointer rounded border border-line px-3 py-1 text-sm hover:border-paper disabled:cursor-wait disabled:opacity-60"
                >
                  {applying ? 'Validando...' : 'Aplicar cupom'}
                </button>
              </div>
              {couponError && <p className="mt-1 text-sm text-faint">{couponError}</p>}
              {coupon && (
                <p className="mt-2 flex items-center justify-between text-sm">
                  <span>Cupom: {coupon.code}</span>
                  <button
                    type="button"
                    onClick={() => removeCoupon()}
                    className="cursor-pointer text-muted hover:text-paper"
                  >
                    remover
                  </button>
                </p>
              )}

              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                {discount > 0 && (
                  <div className="flex justify-between text-muted">
                    <span>Desconto</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                onClick={onClose}
                className="mt-4 block w-full rounded bg-paper px-4 py-3 text-center font-semibold text-ink transition-colors hover:bg-white"
              >
                Fechar pedido
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
