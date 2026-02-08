import QRCode from 'qrcode';

export async function qrCommand(options: { budget?: string; message?: string }): Promise<void> {
  const params = new URLSearchParams();
  if (options.budget) params.set('budget', options.budget);
  if (options.message) params.set('msg', options.message);

  const baseUrl = process.env.AGENTPAY_WEB_URL ?? 'http://localhost:3000';
  const url = `${baseUrl}/setup${params.toString() ? `?${params.toString()}` : ''}`;

  console.log('Scan this QR code to set up AgentPay:\n');

  const qrString = await QRCode.toString(url, { type: 'terminal', small: true });
  console.log(qrString);
  console.log(`\nURL: ${url}`);
}
