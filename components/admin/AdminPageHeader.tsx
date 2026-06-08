'use client';
import { ReactNode } from 'react';

type Props = { title: string; action?: ReactNode };

export function AdminPageHeader({ title, action }: Props) {
  return (
    <header className="flex items-center justify-between border-b border-neutral-200 pb-4">
      <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
      {action}
    </header>
  );
}
