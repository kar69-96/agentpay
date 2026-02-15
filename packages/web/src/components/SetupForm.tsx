'use client';

import { useState, useRef } from 'react';
import { WalletCard } from './WalletCard';
import { CreditCardPreview } from './CreditCardPreview';
import { encrypt } from '../lib/encrypt';
import {
  formatCardNumber,
  formatExpiry,
  detectCardType,
  getCvvLength,
  luhnCheck,
} from '../lib/cardUtils';

type Step = 'wallet' | 'funds' | 'personal' | 'card' | 'confirm';

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

const STEPS: Step[] = ['wallet', 'funds', 'personal', 'card', 'confirm'];

const STEP_LABELS: Record<Step, string> = {
  wallet: 'Wallet',
  funds: 'Funds',
  personal: 'Details',
  card: 'Card',
  confirm: 'Confirm',
};

export function SetupForm({ initialBudget = 100, onComplete }: SetupFormProps) {
  const [step, setStep] = useState<Step>('wallet');
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  // Wallet
  const [passphrase, setPassphrase] = useState('');
  const [passphraseConfirm, setPassphraseConfirm] = useState('');
  const [walletCreated, setWalletCreated] = useState(false);

  // Funds
  const [budget, setBudget] = useState(initialBudget);
  const [perSessionLimit, setPerSessionLimit] = useState(Math.min(50, initialBudget));

  // Personal
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('US');

  // Card
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cvvFocused, setCvvFocused] = useState(false);
  const cvvRef = useRef<HTMLInputElement>(null);

  // State
  const [error, setError] = useState('');
  const [encrypting, setEncrypting] = useState(false);

  const currentIdx = STEPS.indexOf(step);

  const goTo = (s: Step, dir?: 'forward' | 'back') => {
    const targetIdx = STEPS.indexOf(s);
    setDirection(dir || (targetIdx > currentIdx ? 'forward' : 'back'));
    setError('');
    setStep(s);
  };

  // --- Handlers ---

  const handleWallet = () => {
    if (passphrase.length < 6) {
      setError('Passphrase must be at least 6 characters.');
      return;
    }
    if (passphrase !== passphraseConfirm) {
      setError('Passphrases do not match.');
      return;
    }
    setWalletCreated(true);
    setTimeout(() => goTo('funds', 'forward'), 800);
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
    goTo('personal', 'forward');
  };

  const handlePersonal = () => {
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }
    goTo('card', 'forward');
  };

  const handleCard = () => {
    const cleanNum = cardNumber.replace(/\s/g, '');
    if (!cleanNum || !cardExpiry || !cardCvv) {
      setError('All card fields are required.');
      return;
    }
    if (!luhnCheck(cleanNum)) {
      setError('Invalid card number.');
      return;
    }
    const type = detectCardType(cleanNum);
    if (cardCvv.length < getCvvLength(type)) {
      setError(`CVV must be ${getCvvLength(type)} digits.`);
      return;
    }
    goTo('confirm', 'forward');
  };

  const handleConfirm = async () => {
    setEncrypting(true);
    try {
      const cleanNum = cardNumber.replace(/\s/g, '');
      const cleanExpiry = cardExpiry.replace(/\s/g, '');
      const credentials = {
        card: { number: cleanNum, expiry: cleanExpiry, cvv: cardCvv },
        name,
        billingAddress: { street, city, state: addressState, zip, country },
        shippingAddress: { street, city, state: addressState, zip, country },
        email,
        phone,
      };
      const vault = await encrypt(credentials, passphrase);
      const vaultData = JSON.stringify(vault, null, 2);

      onComplete?.({
        budget,
        perSessionLimit,
        name,
        email,
        phone,
        street,
        city,
        state: addressState,
        zip,
        country,
        cardNumber: cleanNum,
        cardExpiry: cleanExpiry,
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
    return '\u2022\u2022\u2022\u2022 ' + clean.slice(-4);
  };

  const slideClass = direction === 'forward' ? 'slide-in-right' : 'slide-in-left';

  const inputClass = 'w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition';
  const inputClassMono = inputClass + ' font-mono';

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                  i < currentIdx
                    ? 'bg-white text-black'
                    : i === currentIdx
                      ? 'bg-white text-black ring-2 ring-offset-2 ring-white ring-offset-black'
                      : 'bg-gray-800 text-gray-500'
                }`}
              >
                {i < currentIdx ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`text-xs mt-1.5 transition-colors ${i <= currentIdx ? 'text-white font-medium' : 'text-gray-600'}`}>
                {STEP_LABELS[s]}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 mx-1 transition-colors duration-300 ${i < currentIdx ? 'bg-white' : 'bg-gray-800'}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/30 px-4 py-2.5 rounded-xl">{error}</p>
      )}

      {/* Step 1: Create Wallet */}
      {step === 'wallet' && (
        <div key="wallet" className={`space-y-6 ${slideClass}`}>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">Create Your Wallet</h2>
            <p className="text-sm text-gray-400">Choose a passphrase to encrypt your credentials.</p>
          </div>

          <WalletCard passphrase={passphrase} confirmed={walletCreated} />

          {!walletCreated && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 uppercase tracking-wider">Passphrase</label>
                <input
                  type="password"
                  placeholder="Enter a strong passphrase"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className={inputClass}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 uppercase tracking-wider">Confirm</label>
                <input
                  type="password"
                  placeholder="Confirm your passphrase"
                  value={passphraseConfirm}
                  onChange={(e) => setPassphraseConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleWallet()}
                  className={inputClass}
                />
              </div>
              <button
                onClick={handleWallet}
                className="w-full p-3 bg-white text-black rounded-xl font-medium hover:bg-gray-200 transition"
              >
                Create Wallet
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Add Funds */}
      {step === 'funds' && (
        <div key="funds" className={`space-y-6 ${slideClass}`}>
          <div>
            <h2 className="text-2xl font-semibold">Add Funds</h2>
            <p className="text-sm text-gray-400 mt-1">Set your total budget and per-session spending limit.</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <label className="text-xs text-gray-400 uppercase tracking-wider">Budget</label>
                <span className="text-2xl font-mono font-bold">${budget.toFixed(0)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1000}
                step={10}
                value={budget}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setBudget(val);
                  if (perSessionLimit > val) setPerSessionLimit(val);
                }}
                className="w-full dark-slider"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>$0</span>
                <span>$1,000</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <label className="text-xs text-gray-400 uppercase tracking-wider">Per-Session Limit</label>
                <span className="text-2xl font-mono font-bold">${perSessionLimit.toFixed(0)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={budget}
                step={5}
                value={perSessionLimit}
                onChange={(e) => setPerSessionLimit(Number(e.target.value))}
                className="w-full dark-slider"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>$0</span>
                <span>${budget.toFixed(0)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => goTo('wallet', 'back')}
              className="flex-1 p-3 border border-gray-700 rounded-xl text-gray-300 hover:bg-gray-900 transition"
            >
              Back
            </button>
            <button
              onClick={handleFunds}
              className="flex-1 p-3 bg-white text-black rounded-xl font-medium hover:bg-gray-200 transition"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Personal Details */}
      {step === 'personal' && (
        <div key="personal" className={`space-y-6 ${slideClass}`}>
          <div>
            <h2 className="text-2xl font-semibold">Personal Details</h2>
            <p className="text-sm text-gray-400 mt-1">Used for billing and delivery of digital goods.</p>
          </div>

          <div className="space-y-3">
            <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoFocus />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            <input type="tel" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            <input type="text" placeholder="Street address" value={street} onChange={(e) => setStreet(e.target.value)} className={inputClass} />
            <div className="flex gap-3">
              <input type="text" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className={`flex-1 ${inputClass}`} />
              <input type="text" placeholder="State" value={addressState} onChange={(e) => setAddressState(e.target.value)} className={`w-20 ${inputClass}`} />
            </div>
            <div className="flex gap-3">
              <input type="text" placeholder="ZIP" value={zip} onChange={(e) => setZip(e.target.value)} className={`flex-1 ${inputClass}`} />
              <input type="text" placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} className={`w-20 ${inputClass}`} />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => goTo('funds', 'back')} className="flex-1 p-3 border border-gray-700 rounded-xl text-gray-300 hover:bg-gray-900 transition">
              Back
            </button>
            <button onClick={handlePersonal} className="flex-1 p-3 bg-white text-black rounded-xl font-medium hover:bg-gray-200 transition">
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Credit Card */}
      {step === 'card' && (
        <div key="card" className={`space-y-6 ${slideClass}`}>
          <div>
            <h2 className="text-2xl font-semibold">Add Card</h2>
            <p className="text-sm text-gray-400 mt-1">Your card is encrypted locally. It never leaves your device.</p>
          </div>

          <CreditCardPreview
            cardNumber={cardNumber}
            expiry={cardExpiry}
            name={name}
            cvvFocused={cvvFocused}
          />

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-wider">Card Number</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChange={(e) => {
                  const formatted = formatCardNumber(e.target.value);
                  setCardNumber(formatted);
                }}
                maxLength={19}
                className={inputClassMono}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs text-gray-400 uppercase tracking-wider">Expiry</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="MM / YY"
                  value={cardExpiry}
                  onChange={(e) => {
                    const formatted = formatExpiry(e.target.value);
                    setCardExpiry(formatted);
                  }}
                  maxLength={7}
                  className={inputClassMono}
                />
              </div>
              <div className="w-28 space-y-1.5">
                <label className="text-xs text-gray-400 uppercase tracking-wider">CVV</label>
                <input
                  ref={cvvRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="\u2022\u2022\u2022"
                  value={cardCvv}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    const type = detectCardType(cardNumber);
                    const max = getCvvLength(type);
                    setCardCvv(val.slice(0, max));
                  }}
                  onFocus={() => setCvvFocused(true)}
                  onBlur={() => setCvvFocused(false)}
                  maxLength={4}
                  className={inputClassMono}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => goTo('personal', 'back')} className="flex-1 p-3 border border-gray-700 rounded-xl text-gray-300 hover:bg-gray-900 transition">
              Back
            </button>
            <button onClick={handleCard} className="flex-1 p-3 bg-white text-black rounded-xl font-medium hover:bg-gray-200 transition">
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Confirmation */}
      {step === 'confirm' && (
        <div key="confirm" className={`space-y-6 ${slideClass}`}>
          <div>
            <h2 className="text-2xl font-semibold">Review &amp; Lock</h2>
            <p className="text-sm text-gray-400 mt-1">Confirm your details. Once locked, your vault is encrypted.</p>
          </div>

          <div className="space-y-3">
            {/* Wallet summary */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Wallet</h3>
                <button onClick={() => goTo('wallet', 'back')} className="text-xs text-gray-500 hover:text-white transition">Edit</button>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Passphrase</span>
                <span className="text-sm font-mono text-gray-300">{'\u2022'.repeat(Math.min(passphrase.length, 16))}</span>
              </div>
            </div>

            {/* Funds summary */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Funds</h3>
                <button onClick={() => goTo('funds', 'back')} className="text-xs text-gray-500 hover:text-white transition">Edit</button>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Total Budget</span>
                <span className="text-sm font-mono font-medium">${budget.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Per-Session Limit</span>
                <span className="text-sm font-mono font-medium">${perSessionLimit.toFixed(2)}</span>
              </div>
            </div>

            {/* Personal summary */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Personal</h3>
                <button onClick={() => goTo('personal', 'back')} className="text-xs text-gray-500 hover:text-white transition">Edit</button>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Name</span>
                <span className="text-sm font-medium">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Email</span>
                <span className="text-sm font-medium">{email}</span>
              </div>
              {phone && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Phone</span>
                  <span className="text-sm font-medium">{phone}</span>
                </div>
              )}
            </div>

            {/* Card summary */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</h3>
                <button onClick={() => goTo('card', 'back')} className="text-xs text-gray-500 hover:text-white transition">Edit</button>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Card</span>
                <span className="text-sm font-mono font-medium">{maskCard(cardNumber)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Expires</span>
                <span className="text-sm font-mono font-medium">{cardExpiry}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => goTo('card', 'back')} className="flex-1 p-3 border border-gray-700 rounded-xl text-gray-300 hover:bg-gray-900 transition">
              Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={encrypting}
              className="flex-1 p-3 bg-white text-black rounded-xl font-medium hover:bg-gray-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {encrypting ? (
                'Encrypting...'
              ) : (
                <>
                  Lock &amp; Go
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
