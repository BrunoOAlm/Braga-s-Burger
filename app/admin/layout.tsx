import { ReactNode } from 'react';
import { AdminAuthProvider } from '@/lib/admin-auth';
import { AdminAuthGate } from '@/components/admin/AdminAuthGate';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminAuthGate>
        <div className="flex min-h-screen bg-neutral-50">
          <AdminSidebar />
          <div className="flex flex-1 flex-col">
            <AdminHeader />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </AdminAuthGate>
    </AdminAuthProvider>
  );
}
