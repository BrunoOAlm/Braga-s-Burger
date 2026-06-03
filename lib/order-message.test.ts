import { describe, it, expect } from 'vitest';
import {
  buildWhatsAppMessage,
  buildContactMessage,
  buildHelpMessage,
} from './order-message';
import type { OrderForMessage } from './order-message';
import type { Product, Category } from './types';

const product = (id: string, categoryId: string, name: string, price: number): Product => ({
  id,
  categoryId,
  name,
  description: '',
  price,
  priceFrom: false,
  imageUrl: null,
  featured: false,
  available: true,
});

const cats: Category[] = [
  { id: 'burgers', name: 'Burgers', order: 1, layout: 'grid' },
  { id: 'porcoes', name: 'Porções', order: 4, layout: 'grid' },
];

const baseOrder = (): OrderForMessage => ({
  orderId: '#3417',
  customer: { name: 'Bruno Almeida', phone: '(21) 99999-9999' },
  items: [
    {
      id: '1',
      product: product('chicken', 'burgers', 'Chicken', 25.9),
      quantity: 1,
      notes: '',
    },
    {
      id: '2',
      product: product('crispy-catupiry', 'burgers', 'Crispy Catupiry', 39.9),
      quantity: 2,
      notes: 'sem cebola',
    },
    {
      id: '3',
      product: product('fritas-grande', 'porcoes', 'Fritas Grande', 29.9),
      quantity: 1,
      notes: '',
    },
  ],
  categories: cats,
  coupon: null,
  subtotal: 135.6,
  discount: 0,
  deliveryFee: 4.99,
  total: 140.59,
  estimatedMinutes: { min: 30, max: 40 },
  method: 'delivery',
  address: {
    cep: '20000-000',
    street: 'Rua Tenente Abel Cunha',
    number: '10',
    neighborhood: 'Higienópolis',
    complement: 'apto 304',
    reference: 'prédio cinza',
  },
  payment: 'credit',
  storeBusinessName: 'Bragas Lanches',
  storeAddress: 'Higienópolis, Zona Norte — Rio de Janeiro',
});

describe('buildWhatsAppMessage', () => {
  it('cabeçalho com nome da loja e número do pedido', () => {
    const msg = buildWhatsAppMessage(baseOrder());
    expect(msg).toMatch(/\*NOVO PEDIDO — Bragas Lanches\*\s+#3417/);
  });

  it('cliente com nome e telefone', () => {
    const msg = buildWhatsAppMessage(baseOrder());
    expect(msg).toContain('👤 *Cliente*');
    expect(msg).toContain('Bruno Almeida — (21) 99999-9999');
  });

  it('itens agrupados por categoria em maiúsculas', () => {
    const msg = buildWhatsAppMessage(baseOrder());
    expect(msg).toContain('BURGERS');
    expect(msg).toContain('PORÇÕES');
    expect(msg.indexOf('BURGERS')).toBeLessThan(msg.indexOf('PORÇÕES'));
  });

  it('linha de item com qtd, nome e subtotal', () => {
    const msg = buildWhatsAppMessage(baseOrder());
    expect(msg).toContain('• 1x Chicken — R$ 25,90');
    expect(msg).toContain('• 2x Crispy Catupiry — R$ 79,80');
    expect(msg).toContain('• 1x Fritas Grande — R$ 29,90');
  });

  it('observação aparece em linha separada quando há', () => {
    const msg = buildWhatsAppMessage(baseOrder());
    expect(msg).toContain('   ↳ Obs: sem cebola');
  });

  it('resumo com subtotal, taxa e total na modalidade Entrega', () => {
    const msg = buildWhatsAppMessage(baseOrder());
    expect(msg).toContain('Subtotal: R$ 135,60');
    expect(msg).toContain('Taxa de entrega: R$ 4,99');
    expect(msg).toContain('*Total: R$ 140,59*');
  });

  it('sem linha de taxa quando é Retirada', () => {
    const o = baseOrder();
    o.method = 'pickup';
    o.deliveryFee = 0;
    o.total = 135.6;
    const msg = buildWhatsAppMessage(o);
    expect(msg).not.toContain('Taxa de entrega:');
  });

  it('linha de desconto só quando há cupom', () => {
    const o = baseOrder();
    o.coupon = { code: 'BEMVINDO10', type: 'percent', value: 10 };
    o.discount = 13.56;
    o.total = 127.03;
    const msg = buildWhatsAppMessage(o);
    expect(msg).toContain('Desconto: -R$ 13,56');
  });

  it('tempo estimado', () => {
    const msg = buildWhatsAppMessage(baseOrder());
    expect(msg).toContain('🕗 Tempo estimado: 30–40 min');
  });

  it('bloco de entrega com endereço completo', () => {
    const msg = buildWhatsAppMessage(baseOrder());
    expect(msg).toContain('🛵 *Entrega*');
    expect(msg).toContain('Rua Tenente Abel Cunha, 10 — Higienópolis, Rio de Janeiro');
    expect(msg).toContain('Complemento: apto 304');
    expect(msg).toContain('Referência: prédio cinza');
  });

  it('omite complemento e referência se vazios', () => {
    const o = baseOrder();
    o.address = { ...o.address!, complement: undefined, reference: undefined };
    const msg = buildWhatsAppMessage(o);
    expect(msg).not.toContain('Complemento:');
    expect(msg).not.toContain('Referência:');
  });

  it('modalidade Retirada substitui o bloco de Entrega', () => {
    const o = baseOrder();
    o.method = 'pickup';
    o.address = undefined;
    const msg = buildWhatsAppMessage(o);
    expect(msg).toContain('🏪 *Retirada no local*');
    expect(msg).toContain('Higienópolis, Zona Norte — Rio de Janeiro');
    expect(msg).not.toContain('🛵');
  });

  it('cabeçalho de pagamento "na entrega" pra delivery', () => {
    const msg = buildWhatsAppMessage(baseOrder());
    expect(msg).toContain('💳 *Pagamento na entrega*');
  });

  it('cabeçalho de pagamento "no balcão" pra retirada', () => {
    const o = baseOrder();
    o.method = 'pickup';
    o.address = undefined;
    const msg = buildWhatsAppMessage(o);
    expect(msg).toContain('💳 *Pagamento no balcão*');
  });

  it('rotula forma de pagamento por extenso', () => {
    const cases: Array<[OrderForMessage['payment'], string]> = [
      ['pix', 'Pix'],
      ['cash', 'Dinheiro'],
      ['credit', 'Cartão de crédito'],
      ['debit', 'Cartão de débito'],
    ];
    for (const [code, label] of cases) {
      const o = baseOrder();
      o.payment = code;
      expect(buildWhatsAppMessage(o)).toContain(label);
    }
  });

  it('troco aparece só em Dinheiro com changeFor', () => {
    const o = baseOrder();
    o.payment = 'cash';
    o.changeFor = 200;
    expect(buildWhatsAppMessage(o)).toContain('Troco para R$ 200,00');
  });

  it('sem troco em Dinheiro sem changeFor', () => {
    const o = baseOrder();
    o.payment = 'cash';
    o.changeFor = undefined;
    expect(buildWhatsAppMessage(o)).not.toContain('Troco');
  });

  it('fallback flat (sem grouping) quando categories=[] (ex.: GET /menu falhou)', () => {
    const o = baseOrder();
    o.categories = [];
    const msg = buildWhatsAppMessage(o);
    // Não há cabeçalhos de categoria
    expect(msg).not.toContain('BURGERS');
    expect(msg).not.toContain('PORÇÕES');
    // Mas todos os itens aparecem
    expect(msg).toContain('• 1x Chicken — R$ 25,90');
    expect(msg).toContain('• 2x Crispy Catupiry — R$ 79,80');
    expect(msg).toContain('• 1x Fritas Grande — R$ 29,90');
    // E a observação também
    expect(msg).toContain('   ↳ Obs: sem cebola');
  });
});

describe('buildContactMessage', () => {
  it('monta uma mensagem curta com o número do pedido', () => {
    expect(buildContactMessage('#3417')).toBe('Olá, sobre o pedido #3417.');
  });
});

describe('buildHelpMessage', () => {
  it('monta um pedido de ajuda com o número do pedido', () => {
    expect(buildHelpMessage('#3417')).toBe(
      'Olá, preciso de ajuda com o pedido #3417.',
    );
  });
});
