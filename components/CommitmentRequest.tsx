'use client';

import { useState, useEffect, useCallback } from 'react';
import { LocusCheckout, type CheckoutSuccessData } from '@withlocus/checkout-react';

interface CommitmentRequestProps {
  listingId: string;
  currentPrice: string;
  disabled?: boolean;
  onConfirmed?: () => void;
}

type Phase = 'idle' | 'creating' | 'paying' | 'confirming' | 'done' | 'error';

export default function CommitmentRequest({
  listingId,
  currentPrice,
  disabled,
  onConfirmed,
}: CommitmentRequestProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showInput, setShowInput] = useState(false);
  const [confirmRetries, setConfirmRetries] = useState(0);

  const estimate = (parseFloat(currentPrice) * 0.2).toFixed(2);

  // Auto-dismiss the "done" state after 3 seconds
  useEffect(() => {
    if (phase === 'done') {
      const t = setTimeout(() => {
        setShowInput(false);
        setPhase('idle');
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [phase]);

  async function startCommit() {
    setError('');
    if (!message.trim()) {
      setError('Describe the changes you want');
      return;
    }
    setPhase('creating');
    try {
      const res = await fetch(`/api/room/${listingId}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create commitment');
        setPhase('error');
        return;
      }
      setSessionId(data.sessionId);
      setCheckoutUrl(data.checkoutUrl || null);
      setAmount(data.amount);
      setPhase('paying');
    } catch {
      setError('Network error');
      setPhase('error');
    }
  }

  // Retries up to 5 times on 409 (payment not yet on-chain)
  const confirmPayment = useCallback(async (sid: string, txHash?: string, retry = 0): Promise<boolean> => {
    try {
      const res = await fetch(`/api/room/${listingId}/commit/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, txHash }),
      });
      const result = await res.json();
      if (res.status === 409 && retry < 5) {
        setConfirmRetries(retry + 1);
        await new Promise((r) => setTimeout(r, 3000));
        return confirmPayment(sid, txHash, retry + 1);
      }
      if (!res.ok) {
        setError(result.error || 'Confirmation failed');
        setPhase('error');
        return false;
      }
      return true;
    } catch {
      setError('Confirmation network error');
      setPhase('error');
      return false;
    }
  }, [listingId]);

  async function handleSuccess(data: CheckoutSuccessData) {
    setPhase('confirming');
    setConfirmRetries(0);
    const ok = await confirmPayment(sessionId!, data.txHash);
    if (ok) {
      setPhase('done');
      setMessage('');
      onConfirmed?.();
    }
  }

  function reset() {
    setPhase('idle');
    setSessionId(null);
    setAmount('');
    setError('');
    setConfirmRetries(0);
  }

  if (!showInput && phase === 'idle') {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setShowInput(true)}
        className="btn-secondary text-[11px] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ padding: '6px 14px' }}
        title={`Commit ~$${estimate} to request changes`}
      >
        Request Changes
      </button>
    );
  }

  return (
    <div className="border-t-2 border-[var(--ink)] p-4 bg-[var(--bg-cream-alt)] space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-[13px] text-[var(--ink)] uppercase" style={{ fontFamily: 'var(--font-display)' }}>
            Commit to request changes
          </p>
          <p className="text-[12px] text-[var(--ink-soft)] mt-1 leading-relaxed">
            Pay 20% (≈ ${estimate}) held until delivery or refunded after 48h.
          </p>
        </div>
        {/* Hide cancel during confirming/done — can't interrupt on-chain verification */}
        {phase !== 'confirming' && phase !== 'done' && (
          <button
            type="button"
            onClick={() => { reset(); setShowInput(false); setMessage(''); }}
            className="text-[11px] font-bold text-[var(--ink-soft)] hover:text-[var(--accent-coral)] transition-colors uppercase shrink-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Cancel
          </button>
        )}
      </div>

      {phase === 'idle' && (
        <div className="space-y-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the changes you want…"
            rows={3}
            className="input-retro resize-none"
          />
          {error && (
            <p className="text-[12px] text-[var(--accent-coral)] font-semibold">{error}</p>
          )}
          <button
            type="button"
            onClick={startCommit}
            disabled={!message.trim()}
            className="btn-primary w-full"
          >
            Continue — Pay ${estimate} commitment
          </button>
        </div>
      )}

      {phase === 'creating' && (
        <p className="text-[13px] text-[var(--ink-soft)] font-semibold text-center py-2 uppercase" style={{ fontFamily: 'var(--font-display)' }}>
          Preparing checkout…
        </p>
      )}

      {phase === 'paying' && sessionId && (
        <div className="border-2 border-[var(--ink)] overflow-hidden bg-white max-h-[350px] overflow-y-auto" style={{ boxShadow: '3px 3px 0 0 var(--shadow-hard)' }}>
          <LocusCheckout
            sessionId={sessionId}
            mode="embedded"
            onSuccess={handleSuccess}
            onCancel={reset}
            onError={(e) => { setError(e.message); setPhase('error'); }}
            {...(checkoutUrl ? { checkoutUrl } : {})}
          />
        </div>
      )}

      {phase === 'confirming' && (
        <div className="text-center py-4 space-y-2">
          <p className="text-[13px] text-[var(--ink-soft)] font-semibold uppercase" style={{ fontFamily: 'var(--font-display)' }}>
            Verifying on-chain…{confirmRetries > 0 ? ` (attempt ${confirmRetries + 1}/6)` : ''}
          </p>
          <div className="flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)]"
                style={{ animation: `skeleton-pulse 1s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div
          className="border-2 border-[var(--ink)] bg-[var(--accent-green)] px-4 py-3 text-center"
          style={{ boxShadow: '3px 3px 0 0 var(--shadow-hard)' }}
        >
          <p className="text-[13px] font-bold text-[var(--ink)] uppercase" style={{ fontFamily: 'var(--font-display)' }}>
            Commitment locked!
          </p>
          <p className="text-[11px] text-[var(--ink)] mt-1 font-medium opacity-80">
            Seller has been notified. 48h timer started.
          </p>
        </div>
      )}

      {phase === 'error' && (
        <div className="space-y-3">
          <p className="text-[12px] text-[var(--accent-coral)] font-semibold text-center">{error}</p>
          <button type="button" onClick={reset} className="btn-secondary w-full">
            Try again
          </button>
        </div>
      )}

      {amount && phase !== 'idle' && (
        <p className="text-[11px] text-[var(--ink-soft)] font-semibold text-center uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
          Amount: ${amount} USDC
        </p>
      )}
    </div>
  );
}
