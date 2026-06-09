'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as adminApi from './admin-api';
import { AdminOrder, ApiError } from './admin-api';

const POLL_MS = 10_000;

const ACTIVE = 'RECEIVED,PREPARING,OUT';
const HISTORY = 'DELIVERED,CANCELLED';

export function useOrderQueue(scope: 'active' | 'history') {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [newOrder, setNewOrder] = useState<AdminOrder | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const firstPollDoneRef = useRef(false);
  const pollRef = useRef<() => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    // Reset de tracking ao trocar de scope: evita alerta espúrio na primeira poll da nova aba
    // e impede que IDs vistos em 'history' contaminem a detecção em 'active'.
    seenIdsRef.current = new Set();
    firstPollDoneRef.current = false;

    let cancelled = false;
    let abortCtrl: AbortController | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      if (document.hidden) return;
      abortCtrl?.abort();
      abortCtrl = new AbortController();
      try {
        const status = scope === 'active' ? ACTIVE : HISTORY;
        const res = await adminApi.getOrders({ status, size: 100, signal: abortCtrl.signal });
        if (cancelled) return;
        if (scope === 'active' && firstPollDoneRef.current) {
          // Detecção por ID (não por count): sobrevive a cancel+novo no mesmo intervalo
          // de polling, que mantinha o count igual e perdia o alerta.
          const newest = res.items.find((o) => !seenIdsRef.current.has(o.id));
          if (newest) setNewOrder(newest);
        }
        seenIdsRef.current = new Set(res.items.map((o) => o.id));
        firstPollDoneRef.current = true;
        setOrders(res.items);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e as ApiError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    pollRef.current = poll;
    poll();
    intervalId = setInterval(poll, POLL_MS);

    function onVisibility() {
      if (!document.hidden) poll();
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      abortCtrl?.abort();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [scope]);

  const refetch = useCallback(() => pollRef.current(), []);

  return {
    orders,
    loading,
    error,
    newOrder,
    clearNewOrder: () => setNewOrder(null),
    refetch,
  };
}

const SOUND_KEY = 'admin-sound-enabled';

let audioEl: HTMLAudioElement | null = null;

export function playNewOrderSound() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(SOUND_KEY) === 'false') return;
  if (!audioEl) {
    audioEl = new Audio('/admin/new-order.mp3');
  }
  audioEl.currentTime = 0;
  audioEl.play().catch(() => {
    /* sem áudio */
  });
}
