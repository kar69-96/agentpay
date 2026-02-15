'use client';

import { detectCardType, CARD_COLORS, type CardType } from '../lib/cardUtils';

interface CreditCardPreviewProps {
  cardNumber: string;
  expiry: string;
  name: string;
  cvvFocused: boolean;
}

export function CreditCardPreview({ cardNumber, expiry, name, cvvFocused }: CreditCardPreviewProps) {
  const clean = cardNumber.replace(/\s/g, '');
  const type = detectCardType(clean);
  const gradient = CARD_COLORS[type];

  const displayNumber = formatDisplay(clean, type);

  return (
    <div className="card-scene w-full max-w-sm mx-auto">
      <div className={`card-inner relative w-full aspect-[1.586/1] ${cvvFocused ? 'flipped' : ''}`}>
        {/* Front */}
        <div className={`card-face absolute inset-0 rounded-2xl p-5 flex flex-col justify-between bg-gradient-to-br ${gradient}`}>
          {/* Card type logo */}
          <div className="flex justify-between items-start">
            <CardChip />
            <CardBrandLogo type={type} />
          </div>

          {/* Number */}
          <div className="font-mono text-lg tracking-[0.15em] text-white/90">
            {displayNumber}
          </div>

          {/* Bottom */}
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Card Holder</p>
              <p className="text-sm text-white/80 font-medium truncate max-w-[180px]">
                {name || 'YOUR NAME'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Expires</p>
              <p className="text-sm text-white/80 font-mono">
                {expiry || 'MM / YY'}
              </p>
            </div>
          </div>
        </div>

        {/* Back */}
        <div className={`card-face card-back absolute inset-0 rounded-2xl flex flex-col bg-gradient-to-br ${gradient}`}>
          {/* Magnetic stripe */}
          <div className="w-full h-12 bg-black/40 mt-6" />

          {/* CVV area */}
          <div className="flex-1 flex items-center px-5">
            <div className="w-full">
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">CVV</p>
              <div className="bg-white/20 rounded px-3 py-2 font-mono text-sm text-white tracking-[0.3em]">
                {'\u2022\u2022\u2022'}
              </div>
            </div>
          </div>

          {/* Brand bottom-right */}
          <div className="flex justify-end p-5 pt-0">
            <CardBrandLogo type={type} />
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDisplay(clean: string, type: CardType): string {
  if (clean.length === 0) {
    return type === 'amex' ? '\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022\u2022' : '\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022';
  }

  if (type === 'amex') {
    const maxLen = 15;
    const padded = clean.padEnd(maxLen, '\u2022');
    return `${padded.slice(0, 4)} ${padded.slice(4, 10)} ${padded.slice(10, 15)}`;
  }

  const maxLen = 16;
  const padded = clean.padEnd(maxLen, '\u2022');
  return `${padded.slice(0, 4)} ${padded.slice(4, 8)} ${padded.slice(8, 12)} ${padded.slice(12, 16)}`;
}

function CardChip() {
  return (
    <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-200/80 to-yellow-400/60 border border-yellow-300/30" />
  );
}

function CardBrandLogo({ type }: { type: CardType }) {
  if (type === 'visa') {
    return <span className="text-xl font-bold italic text-white/80 font-serif">VISA</span>;
  }
  if (type === 'mastercard') {
    return (
      <div className="flex -space-x-2">
        <div className="w-6 h-6 rounded-full bg-red-500/80" />
        <div className="w-6 h-6 rounded-full bg-yellow-500/60" />
      </div>
    );
  }
  if (type === 'amex') {
    return <span className="text-xs font-bold text-white/70 tracking-tight">AMEX</span>;
  }
  if (type === 'discover') {
    return <span className="text-xs font-bold text-white/70">DISCOVER</span>;
  }
  return <div className="w-6 h-6" />;
}
