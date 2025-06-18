export function generateGiftCardCode(): string {
  // Generate a 16-digit gift card code
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join('');
}

export function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });
}

export function validateGiftCardCode(code: string): boolean {
  return /^\d{16}$/.test(code);
}

export function validateAmount(amount: number): boolean {
  return amount > 0 && amount <= 50000; // Max $500
}