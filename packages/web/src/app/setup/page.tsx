'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SetupForm, type SetupData } from '../../components/SetupForm';
import { Dashboard } from '../../components/Dashboard';

function SetupContent() {
  const searchParams = useSearchParams();
  const budget = Number(searchParams.get('budget')) || 100;
  const [setupData, setSetupData] = useState<SetupData | null>(null);

  if (setupData) {
    return (
      <main className="min-h-screen p-8 pt-12">
        <Dashboard data={setupData} />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10 space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
              <rect x="2" y="6" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
              <path d="M16 14h2" />
            </svg>
            <span className="font-medium text-gray-400">agentpay</span>
          </div>
          <h1 className="text-3xl font-semibold">Set Up Your Wallet</h1>
          <p className="text-gray-500 text-sm">
            Your credentials are encrypted locally. They never leave your device.
          </p>
        </div>
        <SetupForm initialBudget={budget} onComplete={setSetupData} />
      </div>
    </main>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>}>
      <SetupContent />
    </Suspense>
  );
}
