// Service worker mínimo: apenas habilita a flag de "instalável" pra o Chromium.
// Não cacheia nada (YAGNI). Substitua quando offline real for necessário.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // pass-through: deixa o navegador lidar com a request normalmente
});
