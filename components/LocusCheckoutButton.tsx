'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LocusCheckout, type CheckoutSuccessData } from '@withlocus/checkout-react';

interface LocusCheckoutButtonProps {
  listingId: string;
  sessionId: string | null;
  checkoutUrl?: string | null;
  price: string;
  isAuthenticated?: boolean;
  onSuccess?: (data: CheckoutSuccessData) => void;
}

export default function LocusCheckoutButton({
  listingId,
  sessionId: initialSessionId,
  checkoutUrl: initialCheckoutUrl,
  price,
  isAuthenticated = false,
  onSuccess,
}: LocusCheckoutButtonProps) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(initialCheckoutUrl ?? null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [creating, setCreating] = useState(false);
  const [paid, setPaid] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState('');

  const ensureSession = useCallback(async () => {
    if (!isAuthenticated) {
      router.push('/login?reason=checkout');
      return;
    }

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
        if (res.status === 401) {
          router.push('/login?reason=checkout');
          return;
        }
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
  }, [listingId, isAuthenticated, router]);

  const handleSuccess = useCallback((data: CheckoutSuccessData) => {
    setPaid(true);
    setTxHash(data.txHash);
    setShowCheckout(false);
    onSuccess?.(data);
  }, [onSuccess]);

  const handleError = useCallback((err: Error) => {
    setError(err.message);
    setShowCheckout(false);
  }, []);

  if (paid) {
    return (
      <div className="space-y-3">
        <div
          className="border-2 border-[var(--ink)] bg-[var(--accent-green)] text-[var(--ink)] px-4 py-4 text-center"
          style={{ boxShadow: '4px 4px 0 0 var(--shadow-hard)' }}
        >
          <p className="font-bold text-lg uppercase" style={{ fontFamily: 'var(--font-display)' }}>
            Payment Confirmed!
          </p>
          <p className="text-sm mt-1 font-medium">Your download link will appear shortly.</p>
        </div>
        {txHash && (
          <a
            href={`https://basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-[12px] text-[var(--ink-soft)] hover:text-[var(--accent-green)] transition font-semibold uppercase tracking-wide"
          >
            View on BaseScan →
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="border-2 border-[var(--ink)] bg-[var(--accent-coral)] text-white px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      {showCheckout && sessionId ? (
        <div className="border-2 border-[var(--ink)] bg-white overflow-hidden" style={{ boxShadow: '4px 4px 0 0 var(--shadow-hard)' }}>
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
          className="btn-primary w-full py-3 text-[14px]"
        >
          {creating ? 'Preparing…' : `Buy Now — $${parseFloat(price).toFixed(2)} USDC`}
        </button>
      )}

      <p className="text-[11px] text-[var(--ink-soft)] text-center font-medium uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
        Powered by Locus · USDC on Base · No chargebacks
      </p>
    </div>
  );
}
