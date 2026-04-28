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

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={
        className ??
        'text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-3 py-2 rounded-lg transition'
      }
    >
      {copied ? 'Copied' : 'Copy Link for Discord'}
    </button>
  );
}
