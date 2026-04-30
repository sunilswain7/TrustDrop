'use client';

import { useState } from 'react';

interface DirectCheckoutLinkProps {
  checkoutUrl: string | null;
  disabled?: boolean;
  className?: string;
}

export default function DirectCheckoutLink({ checkoutUrl, disabled = false, className }: DirectCheckoutLinkProps) {
  const [copied, setCopied] = useState(false);

  if (!checkoutUrl) return null;

  async function handleCopy() {
    if (!checkoutUrl || disabled) return;
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
      disabled={disabled}
      className={
        className ??
        (disabled
          ? 'btn-secondary opacity-40 cursor-not-allowed text-[11px]'
          : 'btn-primary text-[11px]')
      }
      style={{ fontSize: '11px', padding: '6px 12px' }}
      title={disabled ? 'Connect wallet to copy payment link' : undefined}
    >
      {copied ? '✓ Copied' : 'Direct Pay Link'}
    </button>
  );
}
