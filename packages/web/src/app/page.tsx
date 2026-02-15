import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center space-y-6 fade-in-up">
        <div className="flex items-center justify-center gap-2">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
            <rect x="2" y="6" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
            <path d="M16 14h2" />
          </svg>
          <span className="text-2xl font-medium text-gray-400">agentpay</span>
        </div>
        <h1 className="text-5xl font-semibold">
          <span className="text-white">Wallets</span>{' '}
          <span className="text-gray-500">for your Agent</span>
        </h1>
        <p className="text-gray-500 max-w-md mx-auto">
          Give your AI agent a secure way to pay. Credentials encrypted locally, human approval required.
        </p>
        <Link
          href="/setup"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-medium hover:bg-gray-200 transition"
        >
          Get Started
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </main>
  );
}
