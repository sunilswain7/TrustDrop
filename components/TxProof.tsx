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
      className="inline-flex items-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-2 rounded-lg transition"
    >
      <span className="text-zinc-400">{label || 'On-chain proof'}:</span>
      <code className="text-emerald-400 font-mono text-xs">{shortHash}</code>
      <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}
