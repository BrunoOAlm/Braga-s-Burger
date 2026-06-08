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

export function useAdminProducts(): Resource<AdminProduct> {
  const [state, setState] = useState<State<AdminProduct>>({ status: 'loading' });

  const refetch = useCallback(async () => {
    try {
      const items = await adminApi.listProducts();
      setState({ status: 'loaded', items });
    } catch (e) {
      if (e instanceof ApiError) {
        setState({ status: 'error', error: e });
      } else {
        setState({ status: 'error', error: new ApiError(0, 'unknown', 'Erro', String(e)) });
      }
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return toResource(state, refetch);
}

export function useAdminCategories(): Resource<AdminCategory> {
  const [state, setState] = useState<State<AdminCategory>>({ status: 'loading' });

  const refetch = useCallback(async () => {
    try {
      const items = await adminApi.listCategories();
      setState({ status: 'loaded', items });
    } catch (e) {
      if (e instanceof ApiError) {
        setState({ status: 'error', error: e });
      } else {
        setState({ status: 'error', error: new ApiError(0, 'unknown', 'Erro', String(e)) });
      }
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return toResource(state, refetch);
}

export function useAdminCoupons(): Resource<AdminCoupon> {
  const [state, setState] = useState<State<AdminCoupon>>({ status: 'loading' });

  const refetch = useCallback(async () => {
    try {
      const items = await adminApi.listCoupons();
      setState({ status: 'loaded', items });
    } catch (e) {
      if (e instanceof ApiError) {
        setState({ status: 'error', error: e });
      } else {
        setState({ status: 'error', error: new ApiError(0, 'unknown', 'Erro', String(e)) });
      }
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return toResource(state, refetch);
}
