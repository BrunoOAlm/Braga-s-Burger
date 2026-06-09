'use client';
import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth';

const LOGIN_PATH = '/admin/entrar';

export function AdminAuthGate({ children }: { children: ReactNode }) {
  const { admin, loading } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === LOGIN_PATH) return;
    if (!loading && !admin) {
      const next = encodeURIComponent(pathname || '/admin');
      router.replace(`${LOGIN_PATH}?next=${next}`);
    }
  }, [admin, loading, pathname, router]);

  if (pathname === LOGIN_PATH) {
    return <div className="min-h-screen bg-neutral-50 text-neutral-900">{children}</div>;
  }
  if (loading) {
    return <div className="p-8 text-center text-sm text-neutral-500">Carregando…</div>;
  }
  if (!admin) return null;
  return <>{children}</>;
}
