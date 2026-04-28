'use client';

import { useState } from 'react';
import { useLocusCheckout } from '@withlocus/checkout-react';

interface DirectCheckoutLinkProps {
  sessionId: string | null;
  className?: string;
}

export default function DirectCheckoutLink({ sessionId, className }: DirectCheckoutLinkProps) {
  const { getCheckoutUrl } = useLocusCheckout();
  const [copied, setCopied] = useState(false);

  if (!sessionId) return null;

  async function handleCopy() {
    if (!sessionId) return;
    const url = getCheckoutUrl(sessionId);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fall through silently.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={
        className ??
        'text-sm bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 px-3 py-2 rounded-lg transition'
      }
    >
      {copied ? 'Copied' : 'Copy Direct Pay Link'}
    </button>
  );
}
