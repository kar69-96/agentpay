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
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, {data.name.split(' ')[0]}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm text-gray-600">Active</span>
        </div>
      </div>

      {/* Balance card */}
      <div className="bg-black text-white rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-400">Available Balance</p>
            <p className="text-4xl font-bold font-mono mt-1">${remaining.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Budget</p>
            <p className="text-lg font-mono">${data.budget.toFixed(2)}</p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>${spent.toFixed(2)} spent</span>
            <span>{pct.toFixed(0)}% remaining</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div className="bg-white rounded-full h-2 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Per-Session Limit</p>
          <p className="text-xl font-bold font-mono mt-1">${data.perSessionLimit.toFixed(2)}</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Transactions</p>
          <p className="text-xl font-bold font-mono mt-1">0</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-xl font-bold font-mono mt-1">0</p>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Transactions</h2>
        <div className="border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-gray-400">No transactions yet</p>
          <p className="text-sm text-gray-300 mt-1">Transactions will appear here when your agent makes purchases.</p>
        </div>
      </div>

      {/* Account info */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Account</h2>
        <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
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
              •••• {data.cardNumber.replace(/\s/g, '').slice(-4)}
            </span>
          </div>
          <div className="flex justify-between p-4">
            <span className="text-sm text-gray-500">Vault</span>
            <span className="text-sm font-medium text-green-600">Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
