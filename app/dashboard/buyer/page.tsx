'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Purchase {
  id: string;
  listing_id: string;
  payment_tx_hash: string | null;
  payer_address: string | null;
  paid_at: string | null;
  detection_source: string | null;
  download_token: string | null;
  download_token_expires: string | null;
  downloaded: boolean;
  on_chain_verified: boolean;
  created_at: string;
  title: string;
  category: string;
  file_type: string;
  price_usdc: string;
  preview_url: string;
  seller_name: string | null;
  seller_trust: number;
}

interface BuyerData {
  user: {
    id: string;
    display_name: string | null;
    trust_score: number;
    locus_wallet_address: string;
  };
  purchases: Purchase[];
  totals: { totalSpent: number; totalPurchases: number };
}

export default function BuyerDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<BuyerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/buyer')
      .then((r) => {
        if (r.status === 401) {
          router.push('/login');
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <p className="text-zinc-500">Loading purchases...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <p className="text-red-400">Could not load purchases.</p>
      </div>
    );
  }

  const now = Date.now();

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Purchases</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {data.user.display_name || 'Anon'} ·{' '}
          <span className="font-mono">
            {data.user.locus_wallet_address.slice(0, 6)}...{data.user.locus_wallet_address.slice(-4)}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <Stat label="Total Purchases" value={data.totals.totalPurchases} />
        <Stat label="Total Spent" value={`$${data.totals.totalSpent.toFixed(2)}`} />
        <Stat label="Trust Score" value={data.user.trust_score} accent />
      </div>

      {data.purchases.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-xl py-16 text-center">
          <p className="text-zinc-500 mb-3">You haven&apos;t purchased anything yet.</p>
          <Link
            href="/"
            className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Browse Assets
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {data.purchases.map((p) => {
            const tokenValid =
              p.download_token &&
              p.download_token_expires &&
              new Date(p.download_token_expires).getTime() > now;
            return (
              <div
                key={p.id}
                className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-3"
              >
                <div className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden shrink-0">
                  {p.preview_url && p.preview_url !== 'pending' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.preview_url} alt={p.title} className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/listing/${p.listing_id}`}
                    className="text-white font-medium truncate hover:text-emerald-400 transition"
                  >
                    {p.title}
                  </Link>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {p.category} · .{p.file_type} · {p.seller_name || 'Anon'}{' '}
                    <span className="text-emerald-400/60">({p.seller_trust})</span>
                  </p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {p.detection_source ? `via ${p.detection_source}` : 'pending'} ·{' '}
                    {p.paid_at ? new Date(p.paid_at).toLocaleString() : '—'}
                  </p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <p className="text-emerald-400 font-bold">
                    ${parseFloat(p.price_usdc).toFixed(2)}
                  </p>
                  {p.payment_tx_hash ? (
                    <a
                      href={`https://basescan.org/tx/${p.payment_tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-zinc-400 hover:text-emerald-400 underline"
                    >
                      BaseScan
                    </a>
                  ) : null}
                  {p.downloaded ? (
                    <span className="text-xs text-zinc-500">Downloaded</span>
                  ) : tokenValid ? (
                    <a
                      href={`/api/download/${p.download_token}`}
                      className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded transition"
                    >
                      Download
                    </a>
                  ) : (
                    <span className="text-xs text-zinc-600">Token expired</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ? 'text-emerald-400' : 'text-zinc-200'}`}>
        {value}
      </p>
    </div>
  );
}
