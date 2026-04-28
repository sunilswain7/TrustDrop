'use client';

import { useEffect, useMemo, useState } from 'react';
import ListingCard from '@/components/ListingCard';
import Link from 'next/link';

interface Listing {
  id: string;
  title: string;
  price_usdc: string;
  category: string;
  file_type: string;
  preview_url: string;
  seller_name: string | null;
  seller_trust: number;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'roblox', label: 'Roblox' },
  { value: 'minecraft', label: 'Minecraft' },
  { value: 'blender', label: 'Blender' },
  { value: 'unity', label: 'Unity' },
  { value: 'texture', label: 'Textures' },
  { value: 'other', label: 'Other' },
];

const PAGE_SIZE = 12;

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [category, setCategory] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  // Debounce search input → searchTerm
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(0);
  }, [category]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (searchTerm) params.set('q', searchTerm);
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(page * PAGE_SIZE));

    fetch(`/api/listings?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setListings(data.listings || []);
        setPagination(data.pagination || null);
      })
      .catch(() => {
        setListings([]);
        setPagination(null);
      })
      .finally(() => setLoading(false));
  }, [category, searchTerm, page]);

  // Client-side price filter (server doesn't accept price range yet)
  const visibleListings = useMemo(() => {
    const min = minPrice ? parseFloat(minPrice) : null;
    const max = maxPrice ? parseFloat(maxPrice) : null;
    if (min === null && max === null) return listings;
    return listings.filter((l) => {
      const price = parseFloat(l.price_usdc);
      if (min !== null && price < min) return false;
      if (max !== null && price > max) return false;
      return true;
    });
  }, [listings, minPrice, maxPrice]);

  const totalPages = pagination ? Math.ceil(pagination.total / PAGE_SIZE) : 0;
  const priceFilterActive = minPrice !== '' || maxPrice !== '';

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4">
          Trust<span className="text-emerald-400">Drop</span>
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
          Trustless marketplace for digital creators. Files encrypted until on-chain payment.
          Zero chargebacks. Zero scams.
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <Link
            href="/sell"
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            Start Selling
          </Link>
          <a
            href="#browse"
            className="border border-zinc-700 hover:border-zinc-500 text-zinc-300 px-6 py-3 rounded-lg transition"
          >
            Browse Assets
          </a>
        </div>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {[
          {
            title: 'Encrypted Until Paid',
            desc: 'Files locked with AES-256. Only a watermarked preview is visible.',
          },
          {
            title: 'On-Chain Verification',
            desc: 'Dual-path payment detection. sessionPaid() on Base is the final truth.',
          },
          {
            title: 'No Chargebacks',
            desc: 'USDC on-chain is final. Seller gets paid, buyer gets the file. Done.',
          },
        ].map((item) => (
          <div key={item.title} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-2">{item.title}</h3>
            <p className="text-sm text-zinc-400">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Browse */}
      <div id="browse">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h2 className="text-2xl font-bold">Browse Assets</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`text-sm px-3 py-1.5 rounded-lg transition ${
                  category === cat.value
                    ? 'bg-emerald-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-col md:flex-row gap-3 mb-6 bg-zinc-900/40 border border-zinc-800 rounded-xl p-3">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search title or description…"
            className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-emerald-500 outline-none rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600"
          />
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Min $"
              className="w-24 bg-zinc-900 border border-zinc-800 focus:border-emerald-500 outline-none rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max $"
              className="w-24 bg-zinc-900 border border-zinc-800 focus:border-emerald-500 outline-none rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600"
            />
            {(searchInput || minPrice || maxPrice) && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setMinPrice('');
                  setMaxPrice('');
                }}
                className="text-sm text-zinc-400 hover:text-white px-3"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-zinc-800 rounded-xl" />
                <div className="h-4 bg-zinc-800 rounded mt-3 w-3/4" />
                <div className="h-3 bg-zinc-800 rounded mt-2 w-1/2" />
              </div>
            ))}
          </div>
        ) : visibleListings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-lg">
              {priceFilterActive || searchTerm
                ? 'No listings match your filters.'
                : 'No listings yet.'}
            </p>
            {!priceFilterActive && !searchTerm && (
              <Link
                href="/sell"
                className="text-emerald-400 hover:text-emerald-300 mt-2 inline-block"
              >
                Be the first to sell
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {visibleListings.map((listing) => (
                <ListingCard key={listing.id} {...listing} />
              ))}
            </div>

            {/* Pagination */}
            {pagination && totalPages > 1 && !priceFilterActive && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <span className="text-sm text-zinc-500">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pagination.hasMore}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
            {priceFilterActive && (
              <p className="text-xs text-zinc-600 text-center mt-6">
                Price filter applied to current page only. Clear it to paginate.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
