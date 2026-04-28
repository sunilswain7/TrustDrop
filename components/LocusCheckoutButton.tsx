'use client';

import { useState, useCallback } from 'react';
import { LocusCheckout, type CheckoutSuccessData } from '@withlocus/checkout-react';

interface LocusCheckoutButtonProps {
  listingId: string;
  sessionId: string | null;
  checkoutUrl?: string | null;
  price: string;
  onSuccess?: (data: CheckoutSuccessData) => void;
}

export default function LocusCheckoutButton({
  listingId,
  sessionId: initialSessionId,
  checkoutUrl: initialCheckoutUrl,
  price,
  onSuccess,
}: LocusCheckoutButtonProps) {
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(initialCheckoutUrl ?? null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [creating, setCreating] = useState(false);
  const [paid, setPaid] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState('');

  const ensureSession = useCallback(async () => {
    // Always (re)create the session on Buy click. The cached one on the listing
    // may be stale — its amount might not reflect a buyer-specific commitment
    // deduction, and the buyer wallet identity changes per buyer.
    setCreating(true);
    setError('');

    try {
      const res = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create checkout session');
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
  }, [listingId]);

  const handleSuccess = useCallback((data: CheckoutSuccessData) => {
    console.log('[CHECKOUT] Payment success:', data);
    setPaid(true);
    setTxHash(data.txHash);
    setShowCheckout(false);
    onSuccess?.(data);
  }, [onSuccess]);

  const handleError = useCallback((err: Error) => {
    console.error('[CHECKOUT] Error:', err);
    setError(err.message);
    setShowCheckout(false);
  }, []);

  if (paid) {
    return (
      <div className="space-y-3">
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-4 rounded-lg text-center">
          <p className="font-semibold text-lg">Payment Confirmed!</p>
          <p className="text-sm mt-1">Your download link will appear shortly.</p>
        </div>
        {txHash && (
          <a
            href={`https://basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-sm text-zinc-400 hover:text-emerald-400 transition"
          >
            View on BaseScan
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {showCheckout && sessionId ? (
        <div className="rounded-xl overflow-hidden border border-zinc-700">
          <LocusCheckout
            sessionId={sessionId}
            onSuccess={handleSuccess}
            onCancel={() => setShowCheckout(false)}
            onError={handleError}
            mode="embedded"
            {...(checkoutUrl ? { checkoutUrl } : {})}
          />
        </div>
      ) : (
        <button
          onClick={ensureSession}
          disabled={creating}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium py-4 rounded-lg transition text-lg"
        >
          {creating ? 'Preparing Checkout...' : `Buy Now — $${parseFloat(price).toFixed(2)} USDC`}
        </button>
      )}

      <p className="text-xs text-zinc-600 text-center">
        Powered by Locus Checkout. USDC on Base. No chargebacks.
      </p>
    </div>
  );
}
