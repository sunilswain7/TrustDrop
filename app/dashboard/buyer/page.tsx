'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SkeletonDashboard } from '@/components/Skeleton';
import Sunburst from '@/components/Sunburst';

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
        if (r.status === 401) { router.push('/login'); return null; }
        return r.json();
      })
      .then((d) => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <SkeletonDashboard />;

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div
          className="inline-block border-2 border-[var(--ink)] bg-[var(--accent-coral)] text-white px-6 py-4 font-bold uppercase text-sm"
          style={{ fontFamily: 'var(--font-display)', boxShadow: '4px 4px 0 0 var(--shadow-hard)' }}
        >
          Could not load purchases.
        </div>
      </div>
    );
  }

  const now = Date.now();

  return (
    <div className="bg-[var(--bg-cream)] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-10 relative">
          <Sunburst color="var(--accent-blue)" size={40} rotation={-10} className="absolute -top-3 right-0 opacity-50 hidden sm:block" />
          <p className="label-uppercase mb-1">Your history</p>
          <h1
            className="text-3xl sm:text-4xl text-[var(--ink)]"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
          >
            MY PURCHASES
          </h1>
          <p className="text-sm text-[var(--ink-soft)] mt-1 font-medium">
            {data.user.display_name || 'Anon'} ·{' '}
            <span className="font-mono">{data.user.locus_wallet_address.slice(0, 6)}…{data.user.locus_wallet_address.slice(-4)}</span>
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <StatCard label="Total Purchases" value={data.totals.totalPurchases} accent="yellow" />
          <StatCard label="Total Spent"     value={`$${data.totals.totalSpent.toFixed(2)}`} accent="green" />
          <StatCard label="Trust Score"     value={data.user.trust_score} accent="blue" />
        </div>

        {/* Purchases list */}
        {data.purchases.length === 0 ? (
          <div
            className="border-2 border-dashed border-[var(--ink)] bg-[var(--bg-cream-alt)] py-16 text-center"
          >
            <p
              className="text-[var(--ink-soft)] font-bold uppercase tracking-wide mb-5"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              You haven&apos;t purchased anything yet.
            </p>
            <Link href="/#browse" className="btn-primary">
              Browse Assets
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.purchases.map((p) => {
              const tokenValid =
                p.download_token &&
                p.download_token_expires &&
                new Date(p.download_token_expires).getTime() > now;

              return (
                <div
                  key={p.id}
                  className="flex items-center gap-4 bg-[var(--bg-cream-alt)] border-2 border-[var(--ink)] p-3 transition-all duration-150"
                  style={{ boxShadow: '3px 3px 0 0 var(--shadow-hard)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translate(2px,2px)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '1px 1px 0 0 var(--shadow-hard)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = '';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '3px 3px 0 0 var(--shadow-hard)';
                  }}
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#e8e0cc] border-2 border-[var(--ink)] overflow-hidden shrink-0">
                    {p.preview_url && p.preview_url !== 'pending' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.preview_url} alt={p.title} className="w-full h-full object-cover" />
                    ) : null}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/listing/${p.listing_id}`}
                      className="text-[var(--ink)] font-bold text-sm uppercase truncate block hover:text-[var(--accent-green)] transition-colors"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {p.title}
                    </Link>
                    <p
                      className="text-[11px] text-[var(--ink-soft)] mt-0.5 uppercase tracking-wide font-medium"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {p.category} · .{p.file_type} · {p.seller_name || 'Anon'}{' '}
                      <span className="text-[var(--accent-green)] font-bold">({p.seller_trust})</span>
                    </p>
                    <p className="text-[11px] text-[var(--ink-soft)] mt-0.5 font-medium">
                      {p.detection_source ? `via ${p.detection_source}` : 'pending'} ·{' '}
                      {p.paid_at ? new Date(p.paid_at).toLocaleString() : '—'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                    <p
                      className="font-bold text-[var(--accent-green)] text-sm"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      ${parseFloat(p.price_usdc).toFixed(2)}
                    </p>
                    {p.payment_tx_hash && (
                      <a
                        href={`https://basescan.org/tx/${p.payment_tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold uppercase tracking-wide text-[var(--accent-green)] hover:text-[var(--accent-green-dk)] underline underline-offset-2"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        BaseScan
                      </a>
                    )}
                    {p.downloaded ? (
                      <span
                        className="text-[10px] border border-[var(--ink)] px-2 py-0.5 font-bold uppercase bg-[var(--bg-cream)] text-[var(--ink-soft)]"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        Downloaded
                      </span>
                    ) : tokenValid ? (
                      <a
                        href={`/api/download/${p.download_token}`}
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '11px' }}
                      >
                        Download
                      </a>
                    ) : (
                      <span
                        className="text-[10px] text-[var(--ink-soft)] font-bold uppercase"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        Token expired
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent: 'green' | 'blue' | 'yellow' }) {
  const bg = accent === 'green' ? 'var(--accent-green)' : accent === 'blue' ? 'var(--accent-blue)' : 'var(--accent-yellow)';
  return (
    <div className="card-retro-static p-5">
      <p className="label-uppercase mb-2">{label}</p>
      <p
        className="text-2xl sm:text-3xl font-bold text-[var(--ink)]"
        style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
      >
        {value}
      </p>
      <div className="mt-3 h-1.5 border border-[var(--ink)]" style={{ background: bg }} />
    </div>
  );
}
