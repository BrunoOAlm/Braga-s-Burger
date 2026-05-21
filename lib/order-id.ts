/**
 * Gera um identificador "#XXXX" (4 dígitos) a partir dos últimos 4 dígitos do timestamp atual.
 *
 * @deprecated since 2026-05-21 (SP4a). O backend agora dita o `displayId` e o front
 * apenas usa o que vier no response de `POST /orders`. A função fica no repositório
 * por compatibilidade com testes existentes, mas não deve ser chamada em runtime.
 */
export function generateOrderId(): string {
  const last4 = Date.now().toString().slice(-4).padStart(4, '0');
  return `#${last4}`;
}
