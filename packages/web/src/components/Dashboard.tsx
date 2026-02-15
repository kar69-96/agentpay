'use client';

import type { SetupData } from './SetupForm';

interface DashboardProps {
  data: SetupData;
}

export function Dashboard({ data }: DashboardProps) {
  const spent = 0;
  const remaining = data.budget - spent;
  const pct = data.budget > 0 ? (remaining / data.budget) * 100 : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-8 fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
            <rect x="2" y="6" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
            <path d="M16 14h2" />
          </svg>
          <div>
            <h1 className="text-xl font-medium">agentpay</h1>
            <p className="text-sm text-gray-500">Welcome back, {data.name.split(' ')[0]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400 font-medium">Active</span>
        </div>
      </div>

      {/* Balance card */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/50 rounded-2xl p-6 space-y-5 wallet-glow">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Available Balance</p>
            <p className="text-4xl font-bold font-mono mt-2">${remaining.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Budget</p>
            <p className="text-xl font-mono mt-2 text-gray-300">${data.budget.toFixed(2)}</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>${spent.toFixed(2)} spent</span>
            <span>{pct.toFixed(0)}% remaining</span>
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-1.5">
            <div
              className="bg-white rounded-full h-1.5 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Per-Session</p>
          <p className="text-xl font-bold font-mono mt-2">${data.perSessionLimit.toFixed(2)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Transactions</p>
          <p className="text-xl font-bold font-mono mt-2">0</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Pending</p>
          <p className="text-xl font-bold font-mono mt-2">0</p>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Recent Transactions</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500">No transactions yet</p>
          <p className="text-sm text-gray-600 mt-1">Transactions will appear here when your agent makes purchases.</p>
        </div>
      </div>

      {/* Account info */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Account</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
          <div className="flex justify-between p-4">
            <span className="text-sm text-gray-500">Name</span>
            <span className="text-sm font-medium">{data.name}</span>
          </div>
          <div className="flex justify-between p-4">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm font-medium">{data.email}</span>
          </div>
          <div className="flex justify-between p-4">
            <span className="text-sm text-gray-500">Card</span>
            <span className="text-sm font-mono font-medium">
              {'\u2022\u2022\u2022\u2022'} {data.cardNumber.replace(/\s/g, '').slice(-4)}
            </span>
          </div>
          <div className="flex justify-between p-4">
            <span className="text-sm text-gray-500">Vault</span>
            <span className="text-sm font-medium text-green-400">Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
