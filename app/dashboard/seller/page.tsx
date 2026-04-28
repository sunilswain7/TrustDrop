'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SellerListing {
  id: string;
  title: string;
  price_usdc: string;
  category: string;
  file_type: string;
  preview_url: string;
  preview_version: number;
  status: string;
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
        if (r.status === 401) {
          router.push('/login');
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => setError('Could not load dashboard'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <p className="text-zinc-500">Loading dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <p className="text-red-400">{error || 'No data'}</p>
      </div>
    );
  }

  const active = data.listings.filter((l) => l.status === 'ACTIVE');
  const sold = data.listings.filter((l) => l.status === 'SOLD');

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Seller Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {data.user.display_name || 'Anon'} ·{' '}
            <span className="font-mono">
              {data.user.locus_wallet_address.slice(0, 6)}...{data.user.locus_wallet_address.slice(-4)}
            </span>
          </p>
        </div>
        <Link
          href="/sell"
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          New Listing
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Trust Score" value={data.user.trust_score} accent="emerald" />
        <StatCard label="Total Sales" value={data.earnings.totalSales} accent="blue" />
        <StatCard
          label="Total Earned"
          value={`$${data.earnings.totalEarned.toFixed(2)}`}
          accent="emerald"
        />
        <StatCard label="Active Listings" value={active.length} accent="zinc" />
      </div>

      {/* Active listings */}
      <Section title={`Active Listings (${active.length})`}>
        {active.length === 0 ? (
          <Empty hint="Nothing live. Create a listing to start earning." />
        ) : (
          <div className="grid gap-3">
            {active.map((l) => (
              <ListingRow key={l.id} listing={l} />
            ))}
          </div>
        )}
      </Section>

      {/* Sold listings */}
      <Section title={`Sold (${sold.length})`}>
        {sold.length === 0 ? (
          <Empty hint="No sales yet." />
        ) : (
          <div className="grid gap-3">
            {sold.map((l) => (
              <ListingRow key={l.id} listing={l} />
            ))}
          </div>
        )}
      </Section>

      {/* Recent sales (tx proofs) */}
      <Section title="Recent Sales (on-chain)">
        {data.recentSales.length === 0 ? (
          <Empty hint="No verified sales yet." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/50 text-zinc-400 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Item</th>
                  <th className="text-left px-4 py-3">Price</th>
                  <th className="text-left px-4 py-3">Buyer</th>
                  <th className="text-left px-4 py-3">Detected</th>
                  <th className="text-left px-4 py-3">Tx</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSales.map((s) => (
                  <tr key={s.id} className="border-t border-zinc-800">
                    <td className="px-4 py-3 text-white">{s.title}</td>
                    <td className="px-4 py-3 text-emerald-400">
                      ${parseFloat(s.price_usdc).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                      {s.payer_address
                        ? `${s.payer_address.slice(0, 6)}...${s.payer_address.slice(-4)}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {s.detection_source || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {s.payment_tx_hash ? (
                        <a
                          href={`https://basescan.org/tx/${s.payment_tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 text-xs underline"
                        >
                          BaseScan
                        </a>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: 'emerald' | 'blue' | 'zinc';
}) {
  const color =
    accent === 'emerald'
      ? 'text-emerald-400'
      : accent === 'blue'
      ? 'text-blue-400'
      : 'text-zinc-200';
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold mb-3 text-zinc-200">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ hint }: { hint: string }) {
  return (
    <div className="border border-dashed border-zinc-800 rounded-xl py-10 text-center">
      <p className="text-sm text-zinc-500">{hint}</p>
    </div>
  );
}

function ListingRow({ listing }: { listing: SellerListing }) {
  const isSold = listing.status === 'SOLD';
  return (
    <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
      <div className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden shrink-0">
        {listing.preview_url && listing.preview_url !== 'pending' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.preview_url} alt={listing.title} className="w-full h-full object-cover" />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/listing/${listing.id}`}
            className="text-white font-medium truncate hover:text-emerald-400 transition"
          >
            {listing.title}
          </Link>
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              isSold
                ? 'bg-zinc-800 text-zinc-400'
                : 'bg-emerald-400/10 text-emerald-400'
            }`}
          >
            {listing.status}
          </span>
          <span className="text-xs text-zinc-600">v{listing.preview_version}</span>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          {listing.category} · .{listing.file_type} · {listing.sales_count} sale
          {listing.sales_count === '1' ? '' : 's'}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-emerald-400 font-bold">${parseFloat(listing.price_usdc).toFixed(2)}</p>
        <Link
          href={`/listing/${listing.id}/room`}
          className="text-xs text-zinc-400 hover:text-white transition"
        >
          Open Room →
        </Link>
      </div>
    </div>
  );
}
