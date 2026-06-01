import { describe, it, expect } from 'vitest';
import { ApiError } from './api-client';
import { humanizeAuth } from './humanize-auth';

describe('humanizeAuth', () => {
  it.each([
    [
      'email-already-taken',
      'Este e-mail já está cadastrado. Use Entrar ou redefina a senha.',
    ],
    ['invalid-credentials', 'E-mail ou senha incorretos.'],
    ['unauthenticated', 'Sua sessão expirou. Faça login de novo.'],
    [
      'reset-token-invalid',
      'Link de redefinição inválido ou expirado. Peça um novo.',
    ],
    [
      'too-many-requests',
      'Muitas tentativas. Aguarde um pouco e tente de novo.',
    ],
    ['validation-failed', 'Confira os campos preenchidos.'],
    [
      'network-error',
      'Sem conexão com o servidor. Tente de novo em alguns instantes.',
    ],
  ])('%s → mensagem específica', (type, expected) => {
    const err = new ApiError(401, type, 'T', 'D');
    expect(humanizeAuth(err)).toBe(expected);
  });

  it('fallback usa err.detail', () => {
    const err = new ApiError(500, 'unknown', 'T', 'Erro inesperado');
    expect(humanizeAuth(err)).toBe('Erro inesperado');
  });
});
