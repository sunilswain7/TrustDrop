'use client';

import { useState, useCallback } from 'react';
import { LocusCheckout, type CheckoutSuccessData } from '@withlocus/checkout-react';

interface TipButtonProps {
  listingId: string;
  sellerWallet: string;
  sellerName: string | null;
}

const PRESETS = ['1.00', '3.00', '5.00'];

export default function TipButton({ listingId, sellerWallet, sellerName }: TipButtonProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('1.00');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tipped, setTipped] = useState(false);
  const [error, setError] = useState('');

  const handleTip = useCallback(async () => {
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, sellerWallet, sellerName, listingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create tip session');
        return;
      }
      setSessionId(data.sessionId);
      setCheckoutUrl(data.checkoutUrl || null);
      setShowCheckout(true);
    } catch {
      setError('Network error');
    } finally {
      setCreating(false);
    }
  }, [amount, sellerWallet, sellerName, listingId]);

  const handleSuccess = useCallback((_data: CheckoutSuccessData) => {
    setTipped(true);
    setShowCheckout(false);
    setOpen(false);
  }, []);

  if (tipped) {
    return (
      <div className="bg-violet-500/10 border border-violet-500/30 text-violet-400 px-4 py-3 rounded-lg text-center text-sm">
        Thanks for supporting {sellerName || 'this creator'}!
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-400 font-medium py-3 rounded-lg transition text-sm"
      >
        Support this Creator
      </button>
    );
  }

  return (
    <div className="bg-zinc-900 border border-violet-500/30 rounded-lg p-4 space-y-3">
      <p className="text-sm text-zinc-300 font-medium">
        Tip {sellerName || 'this creator'}
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded text-xs">
          {error}
        </div>
      )}

      {showCheckout && sessionId ? (
        <div className="rounded-xl overflow-hidden border border-zinc-700">
          <LocusCheckout
            sessionId={sessionId}
            onSuccess={handleSuccess}
            onCancel={() => { setShowCheckout(false); setOpen(false); }}
            onError={(err: Error) => { setError(err.message); setShowCheckout(false); }}
            mode="embedded"
            {...(checkoutUrl ? { checkoutUrl } : {})}
          />
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(p)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  amount === p
                    ? 'bg-violet-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                ${p}
              </button>
            ))}
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 py-2 rounded-lg text-sm text-zinc-400 bg-zinc-800 hover:bg-zinc-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleTip}
              disabled={creating || !parseFloat(amount)}
              className="flex-1 py-2 rounded-lg text-sm font-medium bg-violet-500 hover:bg-violet-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white transition"
            >
              {creating ? 'Creating...' : `Send $${parseFloat(amount || '0').toFixed(2)}`}
            </button>
          </div>

          <p className="text-xs text-zinc-600 text-center">
            100% goes to the creator via Locus Pay
          </p>
        </>
      )}
    </div>
  );
}
