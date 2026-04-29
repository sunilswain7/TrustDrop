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

  const confirmPayment = useCallback(async (sid: string, txHash?: string, retry = 0): Promise<boolean> => {
    try {
      const res = await fetch(`/api/room/${listingId}/commit/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, txHash }),
      });
      const result = await res.json();
      if (res.status === 409 && retry < 5) {
        // Payment not yet visible on-chain — retry after delay
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
        className="shrink-0 text-sm bg-violet-500/10 hover:bg-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed border border-violet-500/30 text-violet-300 px-3 py-2 rounded-lg transition"
        title={`Commit ~$${estimate} to request changes`}
      >
        Request Changes
      </button>
    );
  }

  return (
    <div className="border-t border-zinc-800 p-4 bg-violet-500/5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-violet-300">Commit to request changes</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Pay 20% (≈ ${estimate}) to the platform. Released to seller on delivery,
            refunded if seller doesn't deliver in time.
          </p>
        </div>
        {phase !== 'confirming' && phase !== 'done' && (
          <button
            type="button"
            onClick={() => {
              reset();
              setShowInput(false);
              setMessage('');
            }}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Cancel
          </button>
        )}
      </div>

      {phase === 'idle' && (
        <>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the changes you want…"
            rows={3}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="button"
            onClick={startCommit}
            disabled={!message.trim()}
            className="w-full bg-violet-500 hover:bg-violet-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition"
          >
            Continue — Pay ${estimate} commitment
          </button>
        </>
      )}

      {phase === 'creating' && (
        <p className="text-sm text-zinc-400 text-center py-2">Preparing checkout…</p>
      )}

      {phase === 'paying' && sessionId && (
        <div className="rounded-lg overflow-hidden border border-zinc-700 max-h-[350px] overflow-y-auto">
          <LocusCheckout
            sessionId={sessionId}
            mode="embedded"
            onSuccess={handleSuccess}
            onCancel={reset}
            onError={(e) => {
              setError(e.message);
              setPhase('error');
            }}
            {...(checkoutUrl ? { checkoutUrl } : {})}
          />
        </div>
      )}

      {phase === 'confirming' && (
        <div className="text-center py-4 space-y-2">
          <div className="inline-block w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-400">
            Verifying payment on-chain…{confirmRetries > 0 ? ` (attempt ${confirmRetries + 1}/6)` : ''}
          </p>
        </div>
      )}

      {phase === 'done' && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
          <p className="text-sm text-emerald-400 font-medium">Commitment locked!</p>
          <p className="text-xs text-zinc-500 mt-1">Seller has been notified. Timer started.</p>
        </div>
      )}

      {phase === 'error' && (
        <>
          <p className="text-sm text-red-400">{error}</p>
          <button
            type="button"
            onClick={reset}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm py-2 rounded-lg"
          >
            Try again
          </button>
        </>
      )}

      {amount && phase !== 'idle' && (
        <p className="text-xs text-zinc-600 text-center">Amount: ${amount} USDC</p>
      )}
    </div>
  );
}
