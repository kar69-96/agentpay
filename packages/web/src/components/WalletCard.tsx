'use client';

interface WalletCardProps {
  passphrase: string;
  confirmed: boolean;
}

export function WalletCard({ passphrase, confirmed }: WalletCardProps) {
  const strength = getStrength(passphrase);

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className={`
          w-full max-w-sm aspect-[1.586/1] rounded-2xl p-6 flex flex-col justify-between
          bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/50
          transition-all duration-700 ease-out
          ${passphrase.length > 0 ? 'wallet-glow opacity-100 scale-100' : 'opacity-60 scale-[0.97]'}
          ${confirmed ? 'border-green-500/40' : ''}
        `}
      >
        {/* Top row */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
              <rect x="2" y="6" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
              <path d="M16 14h2" />
            </svg>
            <span className="text-sm font-serif italic text-gray-400">agentpay</span>
          </div>
          {confirmed && (
            <div className="fade-in-up">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-green-400">
                <path d="M6 10l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>

        {/* Center */}
        <div className="space-y-1">
          {confirmed ? (
            <div className="fade-in-up">
              <p className="text-lg font-semibold text-white">Wallet Created</p>
              <p className="text-xs text-gray-400">AES-256-GCM encrypted vault</p>
            </div>
          ) : (
            <>
              <div className="flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                      passphrase.length > i * 3
                        ? strength.color
                        : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
              <p className={`text-xs transition-colors duration-300 ${
                passphrase.length === 0 ? 'text-gray-600' : strength.textColor
              }`}>
                {passphrase.length === 0 ? 'Enter a passphrase to activate' : strength.label}
              </p>
            </>
          )}
        </div>

        {/* Bottom row */}
        <div className="flex justify-between items-end">
          <div className="text-xs text-gray-500 font-mono">
            {confirmed ? 'SECURED' : 'PENDING'}
          </div>
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  confirmed
                    ? 'bg-green-400'
                    : passphrase.length > i * 4
                      ? 'bg-white'
                      : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getStrength(passphrase: string): { label: string; color: string; textColor: string } {
  const len = passphrase.length;
  if (len === 0) return { label: '', color: 'bg-gray-700', textColor: 'text-gray-600' };
  if (len < 6) return { label: 'weak', color: 'bg-red-500', textColor: 'text-red-400' };
  if (len < 10) return { label: 'decent', color: 'bg-yellow-500', textColor: 'text-yellow-400' };
  if (len < 16) return { label: 'strong', color: 'bg-green-500', textColor: 'text-green-400' };
  return { label: 'unbreakable', color: 'bg-green-400', textColor: 'text-green-300' };
}
