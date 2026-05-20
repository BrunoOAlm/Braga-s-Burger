'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferred || dismissed) return null;

  const install = async () => {
    await deferred.prompt();
    setDeferred(null);
  };

  return (
    <div
      role="region"
      aria-label="Instalar aplicativo"
      className="fixed bottom-6 left-6 z-40 max-w-xs rounded border border-line bg-surface p-4 text-sm text-paper shadow-lg"
    >
      <p>Instale nosso app de delivery pra pedir mais rápido.</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={install}
          className="cursor-pointer rounded bg-paper px-3 py-1 font-semibold text-ink hover:bg-white"
        >
          Instalar
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="cursor-pointer rounded border border-line px-3 py-1 hover:border-paper"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
