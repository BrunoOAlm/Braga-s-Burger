import { ApiError } from './api-client';

export function humanizeAuth(err: ApiError): string {
  switch (err.type) {
    case 'email-already-taken':
      return 'Este e-mail já está cadastrado. Use Entrar ou redefina a senha.';
    case 'invalid-credentials':
      return 'E-mail ou senha incorretos.';
    case 'unauthenticated':
      return 'Sua sessão expirou. Faça login de novo.';
    case 'reset-token-invalid':
      return 'Link de redefinição inválido ou expirado. Peça um novo.';
    case 'too-many-requests':
      return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
    case 'validation-failed':
      return 'Confira os campos preenchidos.';
    case 'network-error':
      return 'Sem conexão com o servidor. Tente de novo em alguns instantes.';
    default:
      return err.detail || 'Algo deu errado. Tente de novo.';
  }
}
