'use client';

import { useState } from 'react';
import { BudgetSlider } from './BudgetSlider';
import { encrypt } from '../lib/encrypt';

type Step = 'funds' | 'personal' | 'card' | 'confirm';

interface SetupFormProps {
  initialBudget?: number;
  onComplete?: (data: SetupData) => void;
}

export interface SetupData {
  budget: number;
  perSessionLimit: number;
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  vaultData: string | null;
}

const STEPS: Step[] = ['funds', 'personal', 'card', 'confirm'];

const STEP_LABELS: Record<Step, string> = {
  funds: 'Funds',
  personal: 'Personal',
  card: 'Card',
  confirm: 'Confirm',
};

export function SetupForm({ initialBudget = 100, onComplete }: SetupFormProps) {
  const [step, setStep] = useState<Step>('funds');
  const [budget, setBudget] = useState(initialBudget);
  const [perSessionLimit, setPerSessionLimit] = useState(50);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('US');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [error, setError] = useState('');
  const [encrypting, setEncrypting] = useState(false);

  const currentIdx = STEPS.indexOf(step);

  const goTo = (s: Step) => {
    setError('');
    setStep(s);
  };

  const handleFunds = () => {
    if (budget <= 0) {
      setError('Budget must be greater than $0.');
      return;
    }
    if (perSessionLimit > budget) {
      setError('Per-session limit cannot exceed total budget.');
      return;
    }
    goTo('personal');
  };

  const handlePersonal = () => {
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }
    goTo('card');
  };

  const handleCard = () => {
    if (!cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
      setError('All card fields are required.');
      return;
    }
    goTo('confirm');
  };

  const handleConfirm = async () => {
    setEncrypting(true);
    try {
      const credentials = {
        card: { number: cardNumber, expiry: cardExpiry, cvv: cardCvv },
        name,
        billingAddress: { street, city, state, zip, country },
        shippingAddress: { street, city, state, zip, country },
        email,
        phone,
      };
      const vault = await encrypt(credentials, 'agentpay-default');
      const vaultData = JSON.stringify(vault, null, 2);

      onComplete?.({
        budget,
        perSessionLimit,
        name,
        email,
        phone,
        street,
        city,
        state,
        zip,
        country,
        cardNumber,
        cardExpiry,
        cardCvv,
        vaultData,
      });
    } catch {
      setError('Encryption failed. Please try again.');
    } finally {
      setEncrypting(false);
    }
  };

  const maskCard = (num: string) => {
    const clean = num.replace(/\s/g, '');
    if (clean.length <= 4) return clean;
    return '•••• ' + clean.slice(-4);
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  i < currentIdx
                    ? 'bg-black text-white'
                    : i === currentIdx
                      ? 'bg-black text-white ring-2 ring-offset-2 ring-black'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i < currentIdx ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1 ${i <= currentIdx ? 'text-black font-medium' : 'text-gray-400'}`}>
                {STEP_LABELS[s]}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 mx-1 ${i < currentIdx ? 'bg-black' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{error}</p>
      )}

      {/* Step 1: Add Funds */}
      {step === 'funds' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold">Add Funds</h2>
            <p className="text-sm text-gray-500 mt-1">Configure your total budget and per-session spending limit.</p>
          </div>

          <div className="space-y-4">
            <BudgetSlider value={budget} onChange={setBudget} />

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Per-Session Limit</label>
                <span className="text-sm font-mono">${perSessionLimit.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={budget}
                step={5}
                value={perSessionLimit}
                onChange={(e) => setPerSessionLimit(Number(e.target.value))}
                className="w-full accent-black"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>$0</span>
                <span>${budget.toFixed(0)}</span>
              </div>
            </div>
          </div>

          <button onClick={handleFunds} className="w-full p-3 bg-black text-white rounded-lg hover:bg-gray-800 transition">
            Continue
          </button>
        </div>
      )}

      {/* Step 2: Personal Details */}
      {step === 'personal' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold">Personal Details</h2>
            <p className="text-sm text-gray-500 mt-1">Used for billing and delivery of digital goods.</p>
          </div>

          <div className="space-y-3">
            <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
            <input type="tel" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
            <input type="text" placeholder="Street address" value={street} onChange={(e) => setStreet(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
            <div className="flex gap-3">
              <input type="text" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
              <input type="text" placeholder="State" value={state} onChange={(e) => setState(e.target.value)} className="w-20 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
            </div>
            <div className="flex gap-3">
              <input type="text" placeholder="ZIP" value={zip} onChange={(e) => setZip(e.target.value)} className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
              <input type="text" placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} className="w-20 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => goTo('funds')} className="flex-1 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              Back
            </button>
            <button onClick={handlePersonal} className="flex-1 p-3 bg-black text-white rounded-lg hover:bg-gray-800 transition">
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Credit Card */}
      {step === 'card' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold">Credit Card</h2>
            <p className="text-sm text-gray-500 mt-1">Your card details are encrypted locally. They never leave your device.</p>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Card number"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent font-mono"
            />
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="MM/YY"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(e.target.value)}
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent font-mono"
              />
              <input
                type="text"
                placeholder="CVV"
                value={cardCvv}
                onChange={(e) => setCardCvv(e.target.value)}
                className="w-28 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent font-mono"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => goTo('personal')} className="flex-1 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              Back
            </button>
            <button onClick={handleCard} className="flex-1 p-3 bg-black text-white rounded-lg hover:bg-gray-800 transition">
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 'confirm' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold">Confirm Setup</h2>
            <p className="text-sm text-gray-500 mt-1">Review your details before proceeding.</p>
          </div>

          <div className="space-y-4">
            {/* Funds summary */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Funds</h3>
                <button onClick={() => goTo('funds')} className="text-xs text-gray-400 hover:text-black transition">Edit</button>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Budget</span>
                <span className="text-sm font-mono font-medium">${budget.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Per-Session Limit</span>
                <span className="text-sm font-mono font-medium">${perSessionLimit.toFixed(2)}</span>
              </div>
            </div>

            {/* Personal summary */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Personal</h3>
                <button onClick={() => goTo('personal')} className="text-xs text-gray-400 hover:text-black transition">Edit</button>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Name</span>
                <span className="text-sm font-medium">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Email</span>
                <span className="text-sm font-medium">{email}</span>
              </div>
              {phone && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Phone</span>
                  <span className="text-sm font-medium">{phone}</span>
                </div>
              )}
            </div>

            {/* Card summary */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Payment</h3>
                <button onClick={() => goTo('card')} className="text-xs text-gray-400 hover:text-black transition">Edit</button>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Card</span>
                <span className="text-sm font-mono font-medium">{maskCard(cardNumber)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Expires</span>
                <span className="text-sm font-mono font-medium">{cardExpiry}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => goTo('card')} className="flex-1 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={encrypting}
              className="flex-1 p-3 bg-black text-white rounded-lg hover:bg-gray-800 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {encrypting ? (
                'Encrypting...'
              ) : (
                <>
                  Go to Dashboard
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
