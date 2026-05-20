'use client';

interface Props {
  message: string | null;
}

export function OrderToast({ message }: Props) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded border border-line bg-surface px-4 py-3 text-sm text-paper shadow-lg"
    >
      {message}
    </div>
  );
}
