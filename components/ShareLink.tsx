'use client';

import { useState } from 'react';

interface ShareLinkProps {
  listingId: string;
  className?: string;
}

export default function ShareLink({ listingId, className }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/listing/${listingId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail in some browsers; fall back silently.
    }
  }

  const defaultClass =
    'btn-secondary text-[11px] py-1.5 px-3';

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={className ?? defaultClass}
      style={className ? undefined : { fontSize: '11px', padding: '6px 12px' }}
    >
      {copied ? '✓ Copied' : 'Copy Link'}
    </button>
  );
}
