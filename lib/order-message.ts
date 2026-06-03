import { formatPrice } from './format';
import { groupByCategory } from './cart';
import type {
  Address,
  Category,
  CartItem,
  Coupon,
  Customer,
  DeliveryMethod,
  PaymentMethod,
} from './types';

export interface OrderForMessage {
  orderId: string;
  customer: Customer;
  items: CartItem[];
  categories: Category[];
  coupon: Coupon | null;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  estimatedMinutes: { min: number; max: number };
  method: DeliveryMethod;
  address?: Address;
  payment: PaymentMethod;
  changeFor?: number;
  storeBusinessName: string;
  storeAddress: string;
}

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  credit: 'Cartão de crédito',
  debit: 'Cartão de débito',
};

function itemLine(item: OrderForMessage['items'][number]): string[] {
  const sub = item.product.price * item.quantity;
  const lines = [`• ${item.quantity}x ${item.product.name} — ${formatPrice(sub)}`];
  if (item.notes.trim().length > 0) {
    lines.push(`   ↳ Obs: ${item.notes.trim()}`);
  }
  return lines;
}

function itemsBlock(order: OrderForMessage): string {
  const groups = groupByCategory(order.items, order.categories);
  // Fallback: se categories veio vazio (ex.: GET /menu falhou no checkout),
  // emite lista flat para não enviar mensagem sem itens.
  if (groups.length === 0 && order.items.length > 0) {
    return order.items.flatMap(itemLine).join('\n');
  }
  return groups
    .map((g) => {
      const lines = [g.category.name.toUpperCase()];
      for (const item of g.items) {
        lines.push(...itemLine(item));
      }
      return lines.join('\n');
    })
    .join('\n\n');
}

function summaryBlock(order: OrderForMessage): string {
  const lines = [`Subtotal: ${formatPrice(order.subtotal)}`];
  if (order.method === 'delivery') {
    lines.push(`Taxa de entrega: ${formatPrice(order.deliveryFee)}`);
  }
  if (order.discount > 0) {
    lines.push(`Desconto: -${formatPrice(order.discount)}`);
  }
  lines.push(`*Total: ${formatPrice(order.total)}*`);
  return lines.join('\n');
}

function deliveryOrPickupBlock(order: OrderForMessage): string {
  if (order.method === 'pickup') {
    return `🏪 *Retirada no local*\n${order.storeAddress}`;
  }
  const a = order.address!;
  const lines = [
    '🛵 *Entrega*',
    `${a.street}, ${a.number} — ${a.neighborhood}, Rio de Janeiro`,
  ];
  if (a.complement?.trim()) lines.push(`Complemento: ${a.complement}`);
  if (a.reference?.trim()) lines.push(`Referência: ${a.reference}`);
  return lines.join('\n');
}

function paymentBlock(order: OrderForMessage): string {
  const header =
    order.method === 'pickup' ? '💳 *Pagamento no balcão*' : '💳 *Pagamento na entrega*';
  const lines = [header, PAYMENT_LABEL[order.payment]];
  if (order.payment === 'cash' && order.changeFor !== undefined) {
    lines.push(`Troco para ${formatPrice(order.changeFor)}`);
  }
  return lines.join('\n');
}

export function buildWhatsAppMessage(order: OrderForMessage): string {
  const { min, max } = order.estimatedMinutes;
  return [
    `*NOVO PEDIDO — ${order.storeBusinessName}*  ${order.orderId}`,
    '',
    '👤 *Cliente*',
    `${order.customer.name} — ${order.customer.phone}`,
    '',
    '🍔 *Itens*',
    '',
    itemsBlock(order),
    '',
    '💰 *Resumo*',
    summaryBlock(order),
    '',
    `🕗 Tempo estimado: ${min}–${max} min`,
    '',
    deliveryOrPickupBlock(order),
    '',
    paymentBlock(order),
  ].join('\n');
}

export function buildContactMessage(orderId: string): string {
  return `Olá, sobre o pedido ${orderId}.`;
}

export function buildHelpMessage(orderId: string): string {
  return `Olá, preciso de ajuda com o pedido ${orderId}.`;
}
