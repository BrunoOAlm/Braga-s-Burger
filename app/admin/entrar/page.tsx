import { Suspense } from 'react';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';

export default function EntrarPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
