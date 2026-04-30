'use client';

import { useState, useCallback } from 'react';
import { LocusCheckout, type CheckoutSuccessData } from '@withlocus/checkout-react';

interface TipButtonProps {
  listingId: string;
  sellerWallet: string;
  sellerName: string | null;
  sellerEmail: string | null;
}

type DeliveryMethod = 'wallet' | 'email';

const PRESETS = ['1.00', '3.00', '5.00'];

export default function TipButton({ listingId, sellerWallet, sellerName, sellerEmail }: TipButtonProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('1.00');
  const [method, setMethod] = useState<DeliveryMethod>('wallet');
  const [emailInput, setEmailInput] = useState(sellerEmail || '');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tipped, setTipped] = useState(false);
  const [error, setError] = useState('');

  const handleTip = useCallback(async () => {
    if (method === 'email' && (!emailInput || !emailInput.includes('@'))) {
      setError('Please enter a valid email address');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const body: Record<string, string> = { amount, sellerWallet, sellerName: sellerName || '', listingId, deliveryMethod: method };
      if (method === 'email') body.email = emailInput;
      const res = await fetch('/api/tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
  }, [amount, sellerWallet, sellerName, listingId, method, emailInput]);

  const handleSuccess = useCallback((_data: CheckoutSuccessData) => {
    setTipped(true);
    setShowCheckout(false);
    setOpen(false);
  }, []);

  if (tipped) {
    return (
      <div
        className="border-2 border-[var(--ink)] bg-[var(--accent-green)] text-white px-4 py-3 text-center text-sm font-bold uppercase"
        style={{ fontFamily: 'var(--font-display)', boxShadow: '4px 4px 0 0 var(--shadow-hard)' }}
      >
        Thanks for supporting {sellerName || 'this creator'}!
        {method === 'email' && (
          <p className="text-xs font-normal normal-case mt-1 opacity-80">
            They&apos;ll receive an email with a link to claim the USDC.
          </p>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary w-full py-3 text-[13px]"
      >
        Support this Creator
      </button>
    );
  }

  return (
    <div className="card-retro-static p-4 space-y-3">
      <p
        className="text-sm text-[var(--ink)] font-bold uppercase tracking-wide"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Tip {sellerName || 'this creator'}
      </p>

      {error && (
        <div
          className="border-2 border-[var(--ink)] bg-[var(--accent-coral)] text-white px-3 py-2 text-xs font-semibold"
          style={{ boxShadow: '2px 2px 0 0 var(--shadow-hard)' }}
        >
          {error}
        </div>
      )}

      {showCheckout && sessionId ? (
        <div className="border-2 border-[var(--ink)] overflow-hidden" style={{ boxShadow: '4px 4px 0 0 var(--shadow-hard)' }}>
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
          {/* Delivery method toggle */}
          <div className="flex border-2 border-[var(--ink)] overflow-hidden" style={{ borderRadius: '2px' }}>
            <button
              onClick={() => setMethod('wallet')}
              className="flex-1 py-2 text-xs font-bold uppercase transition"
              style={{
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.06em',
                background: method === 'wallet' ? 'var(--accent-yellow)' : 'var(--bg-cream-alt)',
                color: 'var(--ink)',
                borderRight: '2px solid var(--ink)',
              }}
            >
              Send to Wallet
            </button>
            <button
              onClick={() => setMethod('email')}
              className="flex-1 py-2 text-xs font-bold uppercase transition"
              style={{
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.06em',
                background: method === 'email' ? 'var(--accent-yellow)' : 'var(--bg-cream-alt)',
                color: 'var(--ink)',
              }}
            >
              Send via Email
            </button>
          </div>

          {/* Email input */}
          {method === 'email' && (
            <div className="space-y-1">
              <input
                type="email"
                placeholder="Creator's email address"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="input-retro text-sm"
              />
              {sellerEmail && emailInput === sellerEmail && (
                <p className="text-[11px] text-[var(--accent-green)] font-semibold">Auto-filled from creator&apos;s profile</p>
              )}
              {!sellerEmail && (
                <p className="text-[11px] text-[var(--ink-soft)]">Creator hasn&apos;t set an email — enter one manually</p>
              )}
            </div>
          )}

          {/* Amount presets */}
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(p)}
                className="flex-1 py-2 text-sm font-bold border-2 border-[var(--ink)] transition"
                style={{
                  fontFamily: 'var(--font-display)',
                  background: amount === p ? 'var(--accent-green)' : 'var(--bg-cream-alt)',
                  color: amount === p ? '#fff' : 'var(--ink)',
                  boxShadow: amount === p ? '2px 2px 0 0 var(--shadow-hard)' : 'none',
                }}
              >
                ${p}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)] text-sm font-bold">$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-retro pl-7 text-sm"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="btn-secondary flex-1 py-2 text-[12px]"
            >
              Cancel
            </button>
            <button
              onClick={handleTip}
              disabled={creating || !parseFloat(amount) || (method === 'email' && (!emailInput || !emailInput.includes('@')))}
              className="btn-primary flex-1 py-2 text-[12px]"
            >
              {creating ? 'Sending...' : `Send $${parseFloat(amount || '0').toFixed(2)}`}
            </button>
          </div>

          <p className="text-[11px] text-[var(--ink-soft)] text-center font-medium">
            {method === 'wallet'
              ? '100% goes to the creator via Locus Pay'
              : 'Creator receives an email with a link to claim USDC'}
          </p>
        </>
      )}
    </div>
  );
}
