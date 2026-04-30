'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ShareLink from '@/components/ShareLink';
import DirectCheckoutLink from '@/components/DirectCheckoutLink';
import { SkeletonDashboard } from '@/components/Skeleton';
import Sunburst from '@/components/Sunburst';


interface SellerListing {
  id: string;
  title: string;
  price_usdc: string;
  category: string;
  file_type: string;
  preview_url: string;
  preview_version: number;
  status: string;
  checkout_session_id: string | null;
  checkout_url: string | null;
  created_at: string;
  updated_at: string;
  sales_count: string;
}

interface SaleRow {
  id: string;
  payment_tx_hash: string | null;
  payer_address: string | null;
  paid_at: string | null;
  detection_source: string | null;
  title: string;
  price_usdc: string;
}

interface SellerData {
  user: {
    id: string;
    display_name: string | null;
    trust_score: number;
    locus_wallet_address: string;
  };
  listings: SellerListing[];
  earnings: { totalEarned: number; totalSales: number };
  recentSales: SaleRow[];
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<SellerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/seller')
      .then((r) => {
        if (r.status === 401) { router.push('/login'); return null; }
        return r.json();
      })
      .then((d) => { if (d) setData(d); })
      .catch(() => setError('Could not load dashboard'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <SkeletonDashboard />;

  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div
          className="inline-block border-2 border-[var(--ink)] bg-[var(--accent-coral)] text-white px-6 py-4 font-bold uppercase text-sm"
          style={{ fontFamily: 'var(--font-display)', boxShadow: '4px 4px 0 0 var(--shadow-hard)' }}
        >
          {error || 'No data'}
        </div>
      </div>
    );
  }

  const active = data.listings.filter((l) => l.status === 'ACTIVE');
  const sold   = data.listings.filter((l) => l.status === 'SOLD');

  return (
    <div className="bg-[var(--bg-cream)] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* Page header */}
        <div className="flex items-start sm:items-center justify-between gap-4 mb-10 flex-wrap">
          <div className="relative">
            <Sunburst color="var(--accent-yellow)" size={40} rotation={10} className="absolute -top-4 -right-8 opacity-60 hidden sm:block" />
            <p className="label-uppercase mb-1">Your store</p>
            <h1
              className="text-3xl sm:text-4xl text-[var(--ink)]"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
            >
              SELLER DASHBOARD
            </h1>
            <p className="text-sm text-[var(--ink-soft)] mt-1 font-medium">
              {data.user.display_name || 'Anon'} ·{' '}
              <span className="font-mono">{data.user.locus_wallet_address.slice(0, 6)}…{data.user.locus_wallet_address.slice(-4)}</span>
            </p>
          </div>
          <Link href="/sell" className="btn-primary shrink-0">
            + New Listing
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard label="Trust Score"      value={data.user.trust_score}                     accent="green" />
          <StatCard label="Total Sales"      value={data.earnings.totalSales}                  accent="blue" />
          <StatCard label="Total Earned"     value={`$${data.earnings.totalEarned.toFixed(2)}`} accent="green" />
          <StatCard label="Active Listings"  value={active.length}                              accent="yellow" />
        </div>

        <div className="h-px my-2" style={{ background: 'linear-gradient(to right, transparent, var(--ink) 15%, var(--ink) 85%, transparent)', opacity: 0.3 }} />

        {/* Active listings */}
        <div className="mt-10 mb-10">
          <h2
            className="text-xl sm:text-2xl text-[var(--ink)] mb-5"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
          >
            ACTIVE LISTINGS ({active.length})
          </h2>
          {active.length === 0 ? (
            <EmptyState hint="Nothing live. Create a listing to start earning." />
          ) : (
            <div className="space-y-3">
              {active.map((l) => <ListingRow key={l.id} listing={l} />)}
            </div>
          )}
        </div>

        <div className="h-px my-2" style={{ background: 'linear-gradient(to right, transparent, var(--ink) 15%, var(--ink) 85%, transparent)', opacity: 0.3 }} />

        {/* Sold listings */}
        <div className="mt-10 mb-10">
          <h2
            className="text-xl sm:text-2xl text-[var(--ink)] mb-5"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
          >
            SOLD ({sold.length})
          </h2>
          {sold.length === 0 ? (
            <EmptyState hint="No sales yet." />
          ) : (
            <div className="space-y-3">
              {sold.map((l) => <ListingRow key={l.id} listing={l} />)}
            </div>
          )}
        </div>

        <hr className="border-t-2 border-dashed border-[var(--ink)] opacity-20 my-2" />

        {/* Recent sales table */}
        <div className="mt-10">
          <h2
            className="text-xl sm:text-2xl text-[var(--ink)] mb-5"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
          >
            RECENT SALES (ON-CHAIN)
          </h2>
          {data.recentSales.length === 0 ? (
            <EmptyState hint="No verified sales yet." />
          ) : (
            <div
              className="border-2 border-[var(--ink)] overflow-x-auto bg-[var(--bg-cream-alt)]"
              style={{ boxShadow: '4px 4px 0 0 var(--shadow-hard)' }}
            >
              <table className="w-full text-sm min-w-[520px]">
                <thead className="border-b-2 border-[var(--ink)] bg-[var(--accent-yellow)]">
                  <tr>
                    {['Item', 'Price', 'Buyer', 'Detected', 'Tx'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-[11px] uppercase tracking-widest font-bold text-[var(--ink)]"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recentSales.map((s, i) => (
                    <tr
                      key={s.id}
                      className="border-t-2 border-[var(--ink)]"
                      style={{ background: i % 2 === 0 ? 'var(--bg-cream-alt)' : 'var(--bg-cream)' }}
                    >
                      <td className="px-4 py-3 text-[var(--ink)] font-bold text-[13px] uppercase" style={{ fontFamily: 'var(--font-display)' }}>
                        {s.title}
                      </td>
                      <td className="px-4 py-3 text-[var(--accent-green)] font-bold text-[13px]" style={{ fontFamily: 'var(--font-display)' }}>
                        ${parseFloat(s.price_usdc).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-[var(--ink-soft)]">
                        {s.payer_address ? `${s.payer_address.slice(0, 6)}…${s.payer_address.slice(-4)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[var(--ink-soft)] font-medium">
                        {s.detection_source || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {s.payment_tx_hash ? (
                          <a
                            href={`https://basescan.org/tx/${s.payment_tx_hash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-bold uppercase tracking-wide text-[var(--accent-green)] hover:text-[var(--accent-green-dk)] underline underline-offset-2"
                            style={{ fontFamily: 'var(--font-display)' }}
                          >
                            BaseScan
                          </a>
                        ) : (
                          <span className="text-[var(--ink-soft)] text-[12px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

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

function EmptyState({ hint }: { hint: string }) {
  return (
    <div
      className="border-2 border-dashed border-[var(--ink)] bg-[var(--bg-cream-alt)] py-12 text-center"
    >
      <p
        className="text-[var(--ink-soft)] font-bold uppercase tracking-wide text-sm"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {hint}
      </p>
    </div>
  );
}

function ListingRow({ listing }: { listing: SellerListing }) {
  const isSold = listing.status === 'SOLD';
  return (
    <div
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
        {listing.preview_url && listing.preview_url !== 'pending' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.preview_url} alt={listing.title} className="w-full h-full object-cover" />
        ) : null}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/listing/${listing.id}`}
            className="text-[var(--ink)] font-bold text-sm uppercase truncate hover:text-[var(--accent-green)] transition-colors"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {listing.title}
          </Link>
          <span
            className="text-[10px] border border-[var(--ink)] px-2 py-0.5 font-bold uppercase shrink-0"
            style={{
              fontFamily: 'var(--font-display)',
              background: isSold ? 'var(--bg-cream)' : 'var(--accent-green)',
              color: 'var(--ink)',
            }}
          >
            {listing.status}
          </span>
          <span
            className="text-[10px] text-[var(--ink-soft)] font-bold uppercase shrink-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            v{listing.preview_version}
          </span>
        </div>
        <p className="text-[11px] font-medium text-[var(--ink-soft)] mt-0.5 uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
          {listing.category} · .{listing.file_type} · {listing.sales_count} sale{listing.sales_count === '1' ? '' : 's'}
        </p>
      </div>

      {/* Actions */}
      <div className="text-right shrink-0 space-y-2">
        <p
          className="font-bold text-[var(--accent-green)] text-sm"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          ${parseFloat(listing.price_usdc).toFixed(2)}
        </p>
        <Link
          href={`/listing/${listing.id}/room`}
          className="block text-[11px] font-bold text-[var(--ink-soft)] hover:text-[var(--accent-green)] transition-colors uppercase"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Open Room →
        </Link>
        {!isSold && (
          <div className="flex gap-2 justify-end mt-1">
            <ShareLink listingId={listing.id} />
            <DirectCheckoutLink checkoutUrl={listing.checkout_url} />
          </div>
        )}
      </div>
    </div>
  );
}
