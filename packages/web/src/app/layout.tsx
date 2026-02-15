import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgentPay',
  description: 'Local-first payments for AI agents',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
