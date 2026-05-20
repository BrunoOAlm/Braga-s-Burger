/**
 * Gera um identificador "#XXXX" (4 dígitos) a partir dos últimos 4 dígitos do timestamp atual.
 *
 * Sem backend, não temos numeração sequencial global. Para uma loja de bairro com volume
 * baixo, a chance de duas pessoas gerarem o mesmo ID no mesmo segundo é desprezível.
 * Substituído por sequencial real quando o sub-projeto 3 trouxer o backend.
 */
export function generateOrderId(): string {
  const last4 = Date.now().toString().slice(-4).padStart(4, '0');
  return `#${last4}`;
}
