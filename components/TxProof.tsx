'use client';

interface TxProofProps {
  txHash: string;
  label?: string;
}

export default function TxProof({ txHash, label }: TxProofProps) {
  const shortHash = `${txHash.slice(0, 10)}...${txHash.slice(-8)}`;

  return (
    <a
      href={`https://basescan.org/tx/${txHash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 border-2 border-[var(--ink)] px-3 py-2 bg-[var(--bg-cream-alt)] transition-all"
      style={{ boxShadow: '3px 3px 0 0 var(--shadow-hard)', fontSize: '12px' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = '1px 1px 0 0 var(--shadow-hard)';
        (e.currentTarget as HTMLAnchorElement).style.transform = 'translate(2px, 2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = '3px 3px 0 0 var(--shadow-hard)';
        (e.currentTarget as HTMLAnchorElement).style.transform = '';
      }}
    >
      <span className="text-[var(--ink-soft)] font-semibold uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)', fontSize: '10px' }}>
        {label || 'On-chain proof'}
      </span>
      <code className="text-[var(--accent-green)] font-mono text-[11px] font-bold">{shortHash}</code>
      <svg className="w-3 h-3 text-[var(--ink-soft)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}
