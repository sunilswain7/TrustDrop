'use client';

import { useState } from 'react';

interface DirectCheckoutLinkProps {
  checkoutUrl: string | null;
  className?: string;
}

export default function DirectCheckoutLink({ checkoutUrl, className }: DirectCheckoutLinkProps) {
  const [copied, setCopied] = useState(false);

  if (!checkoutUrl) return null;

  async function handleCopy() {
    if (!checkoutUrl) return;
    try {
      await navigator.clipboard.writeText(checkoutUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can fail in some browser contexts; fall through silently.
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
