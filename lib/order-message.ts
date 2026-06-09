export function buildContactMessage(orderId: string): string {
  return `Olá, sobre o pedido ${orderId}.`;
}

export function buildHelpMessage(orderId: string): string {
  return `Olá, preciso de ajuda com o pedido ${orderId}.`;
}
