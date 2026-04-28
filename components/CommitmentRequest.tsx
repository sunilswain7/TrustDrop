'use client';

import { useState } from 'react';
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
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showInput, setShowInput] = useState(false);

  const estimate = (parseFloat(currentPrice) * 0.2).toFixed(2);

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
      setAmount(data.amount);
      setPhase('paying');
    } catch {
      setError('Network error');
      setPhase('error');
    }
  }

  async function handleSuccess(data: CheckoutSuccessData) {
    setPhase('confirming');
    try {
      const res = await fetch(`/api/room/${listingId}/commit/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, txHash: data.txHash }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Confirmation failed');
        setPhase('error');
        return;
      }
      setPhase('done');
      setMessage('');
      setShowInput(false);
      onConfirmed?.();
    } catch {
      setError('Confirmation network error');
      setPhase('error');
    }
  }

  function reset() {
    setPhase('idle');
    setSessionId(null);
    setAmount('');
    setError('');
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
            refunded if seller doesn't deliver in 48h.
          </p>
        </div>
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
        <div className="rounded-lg overflow-hidden border border-zinc-700">
          <LocusCheckout
            sessionId={sessionId}
            mode="popup"
            onSuccess={handleSuccess}
            onCancel={reset}
            onError={(e) => {
              setError(e.message);
              setPhase('error');
            }}
          />
        </div>
      )}

      {phase === 'confirming' && (
        <p className="text-sm text-zinc-400 text-center py-2">
          Verifying on-chain… (this is the same `sessionPaid()` check as the final purchase)
        </p>
      )}

      {phase === 'done' && (
        <p className="text-sm text-emerald-400 text-center py-2">
          Commitment locked. Seller has 48h to deliver.
        </p>
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
