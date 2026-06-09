import type {
  ChangePasswordRequest,
  CreateOrderRequest,
  ForgotRequest,
  LoginRequest,
  OrderResponse,
  OrdersPage,
  ProblemDetails,
  ResetRequest,
  SignupRequest,
  UpdateMeRequest,
  User,
} from './types-api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

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
      credentials: 'include',
    });
  } catch {
    throw new ApiError(
      0,
      'network-error',
      'Sem conexão',
      'Não consegui falar com o servidor.',
    );
  }

  if (res.status === 204) {
    return undefined as T;
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

// ── SP4b: auth do cliente ─────────────────────────────────────────

export async function signup(body: SignupRequest): Promise<User> {
  return request<User>('POST', '/auth/signup', body);
}

export async function login(body: LoginRequest): Promise<void> {
  await request<void>('POST', '/auth/login', body);
}

export async function logout(): Promise<void> {
  await request<void>('POST', '/auth/logout');
}

export async function forgotPassword(body: ForgotRequest): Promise<void> {
  await request<void>('POST', '/auth/forgot', body);
}

export async function resetPassword(body: ResetRequest): Promise<void> {
  await request<void>('POST', '/auth/reset', body);
}

export async function getMe(): Promise<User> {
  return request<User>('GET', '/me');
}

export async function updateMe(body: UpdateMeRequest): Promise<User> {
  return request<User>('PATCH', '/me', body);
}

export async function changePassword(
  body: ChangePasswordRequest,
): Promise<void> {
  await request<void>('POST', '/me/change-password', body);
}

export async function listMyOrders(
  limit = 20,
  offset = 0,
): Promise<OrdersPage> {
  return request<OrdersPage>(
    'GET',
    `/me/orders?limit=${limit}&offset=${offset}`,
  );
}
