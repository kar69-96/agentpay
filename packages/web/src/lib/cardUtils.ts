export type CardType = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';

export function detectCardType(number: string): CardType {
  const clean = number.replace(/\s/g, '');
  if (/^4/.test(clean)) return 'visa';
  if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return 'mastercard';
  if (/^3[47]/.test(clean)) return 'amex';
  if (/^6(?:011|5)/.test(clean)) return 'discover';
  return 'unknown';
}

export function luhnCheck(number: string): boolean {
  const clean = number.replace(/\s/g, '');
  if (clean.length < 13) return false;
  let sum = 0;
  let alternate = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let n = parseInt(clean[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

export function formatCardNumber(value: string): string {
  const clean = value.replace(/\D/g, '');
  const type = detectCardType(clean);
  if (type === 'amex') {
    const parts = [clean.slice(0, 4), clean.slice(4, 10), clean.slice(10, 15)];
    return parts.filter(Boolean).join(' ');
  }
  const parts = [clean.slice(0, 4), clean.slice(4, 8), clean.slice(8, 12), clean.slice(12, 16)];
  return parts.filter(Boolean).join(' ');
}

export function formatExpiry(value: string): string {
  const clean = value.replace(/\D/g, '');
  if (clean.length === 0) return '';
  if (clean.length === 1) {
    if (parseInt(clean, 10) > 1) return '0' + clean + ' / ';
    return clean;
  }
  const month = clean.slice(0, 2);
  const m = parseInt(month, 10);
  if (m > 12) return '12 / ' + clean.slice(2, 4);
  if (clean.length <= 2) return month + (clean.length === 2 ? ' / ' : '');
  return month + ' / ' + clean.slice(2, 4);
}

export function getMaxCardLength(type: CardType): number {
  return type === 'amex' ? 15 : 16;
}

export function getCvvLength(type: CardType): number {
  return type === 'amex' ? 4 : 3;
}

export function maskCardNumber(number: string): string {
  const clean = number.replace(/\s/g, '');
  if (clean.length <= 4) return clean;
  return '\u2022\u2022\u2022\u2022 ' + clean.slice(-4);
}

export const CARD_COLORS: Record<CardType, string> = {
  visa: 'from-blue-900 to-blue-700',
  mastercard: 'from-red-900 to-orange-700',
  amex: 'from-gray-700 to-gray-500',
  discover: 'from-orange-800 to-orange-600',
  unknown: 'from-gray-800 to-gray-600',
};
