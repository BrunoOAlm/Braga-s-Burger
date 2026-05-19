export function formatPrice(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export function formatProductPrice(product: { price: number; priceFrom: boolean }): string {
  const formatted = formatPrice(product.price);
  return product.priceFrom ? `A partir de ${formatted}` : formatted;
}
