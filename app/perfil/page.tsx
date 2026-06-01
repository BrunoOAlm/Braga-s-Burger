'use client';

import { ProfileForm } from '@/components/account/ProfileForm';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';
import { AccountGate } from '@/components/account/AccountGate';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await logout();
        router.push('/');
      }}
      className="self-start rounded-full border border-line px-6 py-2 text-sm text-paper hover:bg-surface"
    >
      Sair
    </button>
  );
}

export default function PerfilPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <AccountGate>
        {(user) => (
          <div className="flex flex-col gap-8">
            <ProfileForm initialUser={user} />
            <ChangePasswordForm />
            <LogoutButton />
          </div>
        )}
      </AccountGate>
    </main>
  );
}
