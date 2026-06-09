'use client';

import { useCallback, useEffect, useState } from 'react';
import * as adminApi from './admin-api';
import { AdminCategory, AdminCoupon, AdminProduct, ApiError } from './admin-api';

type Resource<T> = {
  items: T[];
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
};

type State<T> =
  | { status: 'loading' }
  | { status: 'loaded'; items: T[] }
  | { status: 'error'; error: ApiError };

function toResource<T>(state: State<T>, refetch: () => Promise<void>): Resource<T> {
  return {
    items: state.status === 'loaded' ? state.items : [],
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    refetch,
  };
}

async function fetchToState<T>(fetcher: () => Promise<T[]>): Promise<State<T>> {
  try {
    const items = await fetcher();
    return { status: 'loaded', items };
  } catch (e) {
    const error = e instanceof ApiError ? e : new ApiError(0, 'unknown', 'Erro', String(e));
    return { status: 'error', error };
  }
}

function useFetchResource<T>(fetcher: () => Promise<T[]>): Resource<T> {
  const [state, setState] = useState<State<T>>({ status: 'loading' });

  const refetch = useCallback(async () => {
    setState(await fetchToState(fetcher));
  }, [fetcher]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await fetchToState(fetcher);
      if (!cancelled) setState(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  return toResource(state, refetch);
}

export const useAdminProducts = (): Resource<AdminProduct> => useFetchResource(adminApi.listProducts);
export const useAdminCategories = (): Resource<AdminCategory> => useFetchResource(adminApi.listCategories);
export const useAdminCoupons = (): Resource<AdminCoupon> => useFetchResource(adminApi.listCoupons);
