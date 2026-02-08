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
        <h1 className="text-3xl font-bold text-center mb-2">AgentPay Setup</h1>
        <p className="text-gray-500 text-center mb-8">
          Your credentials are encrypted locally in your browser. They never leave your device.
        </p>
        <SetupForm initialBudget={budget} onComplete={setSetupData} />
      </div>
    </main>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SetupContent />
    </Suspense>
  );
}
