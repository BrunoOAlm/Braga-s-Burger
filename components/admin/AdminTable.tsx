'use client';
import { ReactNode } from 'react';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
};

export function AdminTable<T>({ columns, rows, rowKey, emptyMessage = 'Nada por aqui.' }: Props<T>) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-neutral-500">{emptyMessage}</p>;
  }
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-neutral-100 text-neutral-700">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`px-3 py-2 font-medium ${c.className ?? ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-t border-neutral-200 hover:bg-neutral-50">
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-2 ${c.className ?? ''}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
