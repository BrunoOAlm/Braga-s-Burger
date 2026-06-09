'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/Switch';
import { useAdminAuth } from '@/lib/admin-auth';

const SOUND_KEY = 'admin-sound-enabled';

export function AdminHeader() {
  const { admin, logout } = useAdminAuth();
  const router = useRouter();
  const [sound, setSound] = useState(true);

  useEffect(() => {
    // Hidratação pós-SSR: estado inicial usa default (true) porque SSR não acessa
    // window. Sincronizamos no client lendo localStorage uma vez no mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSound(localStorage.getItem(SOUND_KEY) !== 'false');
  }, []);

  function toggleSound(next: boolean) {
    setSound(next);
    localStorage.setItem(SOUND_KEY, next ? 'true' : 'false');
  }

  async function handleLogout() {
    await logout();
    router.replace('/admin/entrar');
  }

  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
      <div className="text-sm text-neutral-600">
        {admin && <>Logado como <strong>{admin.email}</strong></>}
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          Som
          <Switch checked={sound} onChange={toggleSound} aria-label="Som" />
        </label>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
