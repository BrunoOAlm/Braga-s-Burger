'use client';
import { AdminCoupon } from '@/lib/admin-api';
import { AdminTable, Column } from './AdminTable';
import { InlineToggle } from './InlineToggle';
import { RowActions } from './RowActions';

type Props = {
  coupons: AdminCoupon[];
  onEdit: (c: AdminCoupon) => void;
  onDelete: (c: AdminCoupon) => void;
  onToggleActive: (c: AdminCoupon, next: boolean) => Promise<unknown>;
};

function fmtValue(c: AdminCoupon) {
  return c.type === 'percent'
    ? `${c.value}%`
    : c.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';
}

export function CouponsTable({ coupons, onEdit, onDelete, onToggleActive }: Props) {
  const columns: Column<AdminCoupon>[] = [
    { key: 'code', header: 'Código', render: (c) => c.code },
    { key: 'type', header: 'Tipo', render: (c) => c.type },
    { key: 'value', header: 'Valor', render: fmtValue },
    {
      key: 'min',
      header: 'Min subtotal',
      render: (c) => (c.minSubtotal != null ? `R$ ${c.minSubtotal}` : '—'),
    },
    {
      key: 'validity',
      header: 'Validade',
      render: (c) => `${fmtDate(c.validFrom)} → ${fmtDate(c.validUntil)}`,
    },
    {
      key: 'active',
      header: 'Ativo',
      render: (c) => (
        <InlineToggle
          initial={c.active}
          label="Ativo"
          onToggle={(next) => onToggleActive(c, next)}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (c) => <RowActions onEdit={() => onEdit(c)} onDelete={() => onDelete(c)} />,
    },
  ];
  return (
    <AdminTable
      columns={columns}
      rows={coupons}
      rowKey={(c) => c.code}
      emptyMessage="Nenhum cupom cadastrado."
    />
  );
}
