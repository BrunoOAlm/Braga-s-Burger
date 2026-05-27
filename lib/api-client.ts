import type {
  CreateOrderRequest,
  OrderResponse,
  ProblemDetails,
} from './types-api';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly type: string,
    readonly title: string,
    readonly detail: string,
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      'network-error',
      'Sem conexão',
      'Não consegui falar com o servidor.',
    );
  }

  if (res.ok) {
    return (await res.json()) as T;
  }

  let problem: ProblemDetails = {};
  try {
    problem = (await res.json()) as ProblemDetails;
  } catch {
    // resposta de erro sem corpo JSON — usa defaults
  }
  throw new ApiError(
    res.status,
    problem.type?.split('/').pop() ?? 'unknown',
    problem.title ?? 'Erro',
    problem.detail ?? `HTTP ${res.status}`,
  );
}

export async function createOrder(
  body: CreateOrderRequest,
): Promise<OrderResponse> {
  return request<OrderResponse>('POST', '/orders', body);
}

export async function getOrder(id: string): Promise<OrderResponse> {
  return request<OrderResponse>('GET', `/orders/${id}`);
}
