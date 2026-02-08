'use client';

import { QRCodeSVG } from 'qrcode.react';

interface QRCodeProps {
  url: string;
  size?: number;
}

export function QRCodeDisplay({ url, size = 200 }: QRCodeProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <QRCodeSVG value={url} size={size} />
      <p className="text-sm text-gray-500 break-all max-w-xs text-center">{url}</p>
    </div>
  );
}
