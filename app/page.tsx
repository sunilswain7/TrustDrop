'use client';

import { useEffect, useMemo, useState } from 'react';
import ListingCard from '@/components/ListingCard';
import FloatingDecor from '@/components/FloatingDecor';
import SectionDivider from '@/components/SectionDivider';
import Sunburst from '@/components/Sunburst';
import { SkeletonListingCard } from '@/components/Skeleton';
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

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => { setPage(0); }, [category]);

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
      .catch(() => { setListings([]); setPagination(null); })
      .finally(() => setLoading(false));
  }, [category, searchTerm, page]);

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

  const scrollToBrowse = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[var(--bg-cream)] py-20 sm:py-28 md:py-36">
        <FloatingDecor variant="shoe"          className="top-10 right-[4%]  w-20 md:w-28 rotate-12 hidden md:block" delay={0} />
        <FloatingDecor variant="abstract_blob" className="bottom-8 left-[3%] w-24 md:w-32 -rotate-6 hidden md:block" delay={1} />
        <FloatingDecor variant="tshirt"        className="top-16 left-[7%]   w-14 md:w-20 hidden lg:block" delay={0.7} />

        <Sunburst color="var(--accent-yellow)" size={90}  rotation={15}  className="absolute top-8  right-[12%] hidden md:block" />
        <Sunburst color="var(--accent-blue)"   size={50}  rotation={-10} className="absolute bottom-12 left-[10%] hidden lg:block" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span
            className="inline-block border-2 border-[var(--ink)] px-4 py-1 text-[11px] font-bold uppercase tracking-widest mb-8"
            style={{ fontFamily: 'var(--font-display)', background: 'var(--accent-yellow)', boxShadow: '3px 3px 0 0 var(--shadow-hard)' }}
          >
            CRYPTO-POWERED FILE MARKET
          </span>

          <h1
            className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl leading-none mb-6 text-[var(--ink)]"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}
          >
            TRUST<span style={{ color: 'var(--accent-green)' }}>DROP</span>
          </h1>

          <p className="text-base sm:text-lg text-[var(--ink-soft)] max-w-xl mx-auto mb-10 leading-relaxed font-medium">
            Files encrypted until on-chain payment.
            <br className="hidden sm:block" />
            Zero chargebacks. Zero scams. Trust the chain.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/sell" className="btn-primary text-[14px] px-6 py-3">
              Start Selling
            </Link>
            <a href="#browse" onClick={scrollToBrowse} className="btn-secondary text-[14px] px-6 py-3">
              Browse Assets
            </a>
          </div>

        </div>
      </section>

      <SectionDivider />

      {/* ── How TrustDrop Works (Workflow) ── */}
      <section className="bg-[var(--ink)] py-16 sm:py-20 md:py-24">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <FloatingDecor variant="shoe" className="top-4 right-[3%] w-16 hidden md:block opacity-30" delay={0.4} />

          <div className="text-center mb-12">
            <p
              className="text-[11px] font-bold uppercase tracking-widest mb-3 text-[var(--bg-cream)]"
              style={{ fontFamily: 'var(--font-display)', opacity: 0.5 }}
            >
              The Workflow
            </p>
            <h2
              className="text-3xl sm:text-4xl text-[var(--bg-cream)]"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
            >
              HOW TRUSTDROP WORKS
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: '01',
                title: 'Upload & Secure',
                desc: 'Sellers upload digital assets. Files are AES-256 encrypted instantly — only a safe watermarked preview is public.',
                accent: 'var(--accent-yellow)',
              },
              {
                step: '02',
                title: 'Review & Negotiate',
                desc: 'Buyers review the preview and chat directly with the seller in the Improvement Room to fine-tune the deal.',
                accent: 'var(--accent-blue)',
              },
              {
                step: '03',
                title: 'Secure Payment',
                desc: 'Buyer pays in USDC on Base. Our system verifies on-chain and instantly releases the decrypted file.',
                accent: 'var(--accent-green)',
              },
              {
                step: '04',
                title: 'AI Ready',
                desc: 'AI agents can browse, negotiate, and purchase assets fully autonomously using the same trustless process.',
                accent: 'var(--accent-coral)',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="card-retro p-6 sm:p-8"
              >
                <span
                  className="inline-block border-2 border-[var(--ink)] text-[var(--ink)] font-bold text-sm px-3 py-1 mb-5"
                  style={{ background: item.accent, fontFamily: 'var(--font-display)', boxShadow: '2px 2px 0 0 var(--shadow-hard)' }}
                >
                  {item.step}
                </span>
                <h3
                  className="text-[var(--ink)] text-lg mb-3 uppercase"
                  style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}
                >
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--ink-soft)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── How It Works ── */}
      {/* ── The Improvement Room ── */}
      <section className="bg-[var(--bg-cream-alt)] py-16 sm:py-20 md:py-24">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <FloatingDecor variant="keychain" className="top-4 right-4 w-14 hidden md:block" delay={0.8} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            {/* Left — text */}
            <div>
              <p className="label-uppercase mb-3">Unique Feature</p>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl text-[var(--ink)] mb-6 leading-none"
                style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
              >
                THE IMPROVEMENT ROOM
              </h2>
              <p className="text-[15px] text-[var(--ink-soft)] leading-relaxed font-medium mb-8 max-w-md">
                Every deal deserves room to breathe. The Improvement Room is a private live space where buyer and seller negotiate, iterate, and finalise — before a single dollar moves.
              </p>
              <p className="text-[13px] text-[var(--ink-soft)] leading-relaxed mb-8 max-w-md">
                No email chains. No Discord disputes. No escrow middlemen. Just a direct channel between two parties with the blockchain as the final arbiter.
              </p>
              <Link href="/sell" className="btn-primary">
                Open a Room →
              </Link>
            </div>

            {/* Right — 3 feature callouts */}
            <div className="space-y-4">
              {[
                {
                  icon: '💬',
                  label: 'Live Chat',
                  title: 'Real-Time Negotiation',
                  desc: 'Buyer and seller talk over WebSocket with HTTP polling as fallback. Prices, timelines, scope — all agreed before payment.',
                  accent: 'var(--accent-yellow)',
                },
                {
                  icon: '📁',
                  label: 'Asset Versioning',
                  title: 'Iterate on the Fly',
                  desc: 'Seller uploads improved file versions mid-deal. Each update re-encrypts with a fresh AES-256 key and auto-generates a new watermarked preview. The buyer sees v1, v2, v3 — live.',
                  accent: 'var(--accent-blue)',
                },
                {
                  icon: '🔒',
                  label: 'Commitment System',
                  title: 'Skin in the Game',
                  desc: 'Buyer deposits 20% to formally request changes. Funds are held on-chain — paid to the seller on delivery, or auto-refunded after 48 hours if the seller ghosts.',
                  accent: 'var(--accent-green)',
                },
              ].map((f) => (
                <div
                  key={f.label}
                  className="border-2 border-[var(--ink)] bg-[var(--bg-cream)] p-5 flex gap-5 items-start"
                  style={{ boxShadow: '4px 4px 0 0 var(--shadow-hard)' }}
                >
                  <span
                    className="shrink-0 text-lg border-2 border-[var(--ink)] w-10 h-10 flex items-center justify-center font-bold"
                    style={{ background: f.accent, boxShadow: '2px 2px 0 0 var(--shadow-hard)' }}
                  >
                    {f.icon}
                  </span>
                  <div>
                    <p className="label-uppercase mb-1">{f.label}</p>
                    <h4
                      className="text-[var(--ink)] text-sm mb-1 uppercase"
                      style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}
                    >
                      {f.title}
                    </h4>
                    <p className="text-[12px] text-[var(--ink-soft)] leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── Browse Marketplace ── */}
      <section id="browse" className="bg-[var(--bg-cream-alt)] py-16 sm:py-20">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          {/* Section header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 pb-4 border-b-2 border-[var(--ink)]">
            <div>
              <p className="label-uppercase mb-1">Marketplace</p>
              <div className="flex items-center gap-3">
                <h2
                  className="text-2xl sm:text-3xl text-[var(--ink)]"
                  style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
                >
                  BROWSE ASSETS
                </h2>
                <FloatingDecor variant="toy_car" className="w-12 h-8 relative bottom-1 hidden sm:block" delay={0.2} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`pill-nav text-[12px] ${category === cat.value ? 'pill-nav-active' : ''}`}
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search title or description…"
              className="input-retro flex-1"
            />
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min="0"
                step="0.01"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Min $"
                className="input-retro w-24"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max $"
                className="input-retro w-24"
              />
              {(searchInput || minPrice || maxPrice) && (
                <button
                  onClick={() => { setSearchInput(''); setMinPrice(''); setMaxPrice(''); }}
                  className="btn-secondary text-[11px]"
                  style={{ padding: '8px 12px', fontSize: '11px', whiteSpace: 'nowrap' }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonListingCard key={i} />
              ))}
            </div>
          ) : visibleListings.length === 0 ? (
            <div
              className="text-center py-16 border-2 border-dashed border-[var(--ink)] bg-[var(--bg-cream)]"
              style={{ boxShadow: '4px 4px 0 0 var(--shadow-hard)' }}
            >
              <p
                className="text-[var(--ink-soft)] font-bold uppercase tracking-wide"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {priceFilterActive || searchTerm ? 'No listings match your filters.' : 'No listings yet.'}
              </p>
              {!priceFilterActive && !searchTerm && (
                <Link href="/sell" className="btn-primary mt-4">
                  Be the first to sell
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {visibleListings.map((listing) => (
                  <ListingCard key={listing.id} {...listing} />
                ))}
              </div>

              {pagination && totalPages > 1 && !priceFilterActive && (
                <div className="flex items-center justify-center gap-4 mt-10 pt-6 border-t-2 border-[var(--ink)]">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="btn-secondary disabled:opacity-40"
                    style={{ padding: '8px 16px', fontSize: '12px' }}
                  >
                    ← Prev
                  </button>
                  <span
                    className="text-[12px] font-bold text-[var(--ink)] border-2 border-[var(--ink)] px-4 py-1"
                    style={{ fontFamily: 'var(--font-display)', background: 'var(--bg-cream-alt)' }}
                  >
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!pagination.hasMore}
                    className="btn-secondary disabled:opacity-40"
                    style={{ padding: '8px 16px', fontSize: '12px' }}
                  >
                    Next →
                  </button>
                </div>
              )}
              {priceFilterActive && (
                <p className="text-[11px] text-[var(--ink-soft)] text-center mt-4 font-medium">
                  Price filter applies to current page only. Clear to paginate.
                </p>
              )}
            </>
          )}
        </div>
      </section>

      <SectionDivider />

      {/* ── Agent-Ready API ── */}
      <section style={{ background: 'var(--ink)' }} className="py-16 sm:py-20 md:py-24 border-t-2 border-b-2 border-[var(--ink)]">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <Sunburst color="var(--accent-green)" size={70} rotation={20} className="absolute -top-6 right-[2%] opacity-40 hidden lg:block" />
          <Sunburst color="var(--accent-yellow)" size={40} rotation={-10} className="absolute -bottom-4 left-[2%] opacity-30 hidden lg:block" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            {/* Left — text */}
            <div>
              <p
                className="label-uppercase mb-3"
                style={{ color: 'var(--accent-yellow)' }}
              >
                For Developers
              </p>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl mb-6 leading-none"
                style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', color: 'var(--bg-cream)' }}
              >
                BUILT FOR AI AGENTS
              </h2>
              <p
                className="text-[15px] leading-relaxed font-medium mb-6 max-w-md"
                style={{ color: 'rgba(250,243,224,0.75)' }}
              >
                TrustDrop isn&apos;t just for humans. AI agents can autonomously discover listings, initiate payments through Locus&apos;s agent payment flow, and stream the decrypted file — no browser, no UI, no manual steps.
              </p>
              <p
                className="text-[13px] leading-relaxed mb-8 max-w-md"
                style={{ color: 'rgba(250,243,224,0.55)' }}
              >
                The agent pipeline uses the exact same <code className="font-mono text-[var(--accent-green)]">sessionPaid()</code> on-chain verification as the human buyer flow. Same trust guarantees. Same AES-256 decryption. Zero exceptions.
              </p>
              <a
                href="https://docs.paywithlocus.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ borderColor: 'var(--accent-green)', color: 'var(--accent-green)', background: 'transparent' }}
              >
                Locus Agent Docs →
              </a>
            </div>

            {/* Right — API flow terminal */}
            <div className="space-y-3">
              {[
                {
                  method: 'GET',
                  endpoint: '/api/agent/discover',
                  label: '01  Discover',
                  desc: 'Browse all active listings. Each result includes the Locus agent payment endpoint, price, and preview URL.',
                  accent: 'var(--accent-yellow)',
                },
                {
                  method: 'POST',
                  endpoint: 'Locus Agent Pay',
                  label: '02  Pay',
                  desc: 'Agent calls Locus preflight, initiates USDC payment on Base, and polls until the transaction confirms.',
                  accent: 'var(--accent-blue)',
                },
                {
                  method: 'CHECK',
                  endpoint: 'sessionPaid() on Base',
                  label: '03  Verify',
                  desc: 'TrustDrop re-runs sessionPaid() on the Base Payment Router contract. No txId is trusted blindly — on-chain is the source of truth.',
                  accent: 'var(--accent-green)',
                },
                {
                  method: 'GET',
                  endpoint: '/api/agent/download/[id]',
                  label: '04  Download',
                  desc: 'Server decrypts the file server-side and streams it back. One-shot — the token expires after first use.',
                  accent: 'var(--accent-coral)',
                },
              ].map((step) => (
                <div
                  key={step.label}
                  className="border-2 p-4 flex gap-4 items-start"
                  style={{ borderColor: 'rgba(250,243,224,0.15)', background: 'rgba(250,243,224,0.05)' }}
                >
                  <span
                    className="shrink-0 text-[10px] font-bold border px-2 py-1 font-mono uppercase tracking-wider mt-0.5"
                    style={{ color: step.accent, borderColor: step.accent }}
                  >
                    {step.method}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span
                        className="text-[11px] font-bold uppercase tracking-widest"
                        style={{ fontFamily: 'var(--font-display)', color: 'rgba(250,243,224,0.45)' }}
                      >
                        {step.label}
                      </span>
                      <code
                        className="text-[12px] font-mono truncate"
                        style={{ color: step.accent }}
                      >
                        {step.endpoint}
                      </code>
                    </div>
                    <p
                      className="text-[12px] leading-relaxed"
                      style={{ color: 'rgba(250,243,224,0.6)' }}
                    >
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust stats — green section ── */}
      <section className="bg-[var(--accent-green)] border-t-2 border-b-2 border-[var(--ink)] py-14 sm:py-18">
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <Sunburst color="var(--accent-yellow)" size={60} rotation={20} className="absolute top-4 right-6 hidden sm:block" />
          <Sunburst color="#FFF8E7" size={36} rotation={-10} className="absolute bottom-4 left-8 hidden sm:block" />

          <h2
            className="text-3xl sm:text-4xl md:text-5xl text-[var(--ink)] mb-4"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
          >
            ZERO CHARGEBACKS.<br className="hidden sm:block" /> ZERO SCAMS.
          </h2>
          <p className="text-[var(--ink)] font-medium text-base max-w-lg mx-auto mb-10 opacity-80">
            Every transaction is verified on-chain. No middlemen, no disputes, no reversals.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { stat: 'AES-256', label: 'Encryption standard' },
              { stat: 'USDC', label: 'Stable on Base' },
              { stat: 'On-chain', label: 'Payment verification' },
            ].map((item) => (
              <div key={item.stat} className="border-2 border-[var(--ink)] bg-[var(--bg-cream)] p-5 text-center" style={{ boxShadow: '4px 4px 0 0 var(--shadow-hard)' }}>
                <p className="text-2xl font-bold text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)' }}>{item.stat}</p>
                <p className="text-sm text-[var(--ink-soft)] mt-1 font-medium uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)', fontSize: '11px' }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA — coral section ── */}
      <section className="bg-[var(--accent-coral)] border-b-2 border-[var(--ink)] py-14 sm:py-20">
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <Sunburst color="var(--accent-yellow)" size={70} rotation={-15} className="absolute top-2 left-4 hidden sm:block" />

          <h2
            className="text-3xl sm:text-4xl md:text-5xl text-white mb-4"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
          >
            READY TO SELL?
          </h2>
          <p className="text-white/90 font-medium text-base max-w-md mx-auto mb-8">
            List your digital asset in minutes. Your file stays encrypted until a buyer pays on-chain.
          </p>
          <Link
            href="/sell"
            className="btn-primary text-[14px] px-8 py-3"
            style={{ background: 'var(--bg-cream)', color: 'var(--ink)' }}
          >
            Start Selling Now
          </Link>
        </div>
      </section>

      <SectionDivider />

      {/* ── Footer ── */}
      <footer className="bg-[var(--bg-cream)] border-t-2 border-[var(--ink)]">
        {/* Payment badges — infinite scrolling ticker */}
        <div className="border-b-2 border-[var(--ink)] py-3 overflow-hidden">
          <div
            className="animate-marquee flex items-center"
            style={{ width: 'max-content', gap: '0px' }}
          >
            {/* Two identical sets — animation shifts exactly -50% for seamless loop */}
            {[0, 1].flatMap((half) =>
              Array(4).fill(['USDC', 'Base', 'EVM', 'Locus', 'AES-256', 'On-Chain', 'sessionPaid()', 'Base Mainnet']).flat().map((badge, i) => (
                <span
                  key={`${half}-${i}`}
                  className="shrink-0 inline-flex items-center"
                >
                  <span
                    className="border-2 border-[var(--ink)] px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider bg-[var(--bg-cream-alt)]"
                    style={{ fontFamily: 'var(--font-display)', boxShadow: '2px 2px 0 0 var(--shadow-hard)' }}
                  >
                    {badge}
                  </span>
                  {/* dot separator */}
                  <span
                    className="mx-4 w-1.5 h-1.5 rounded-full bg-[var(--ink)] opacity-30 shrink-0"
                  />
                </span>
              ))
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <p
                className="text-[var(--ink)] text-xl mb-3"
                style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
              >
                TRUST<span style={{ color: 'var(--accent-green)' }}>DROP</span>
              </p>
              <p className="text-[13px] text-[var(--ink-soft)] leading-relaxed font-medium">
                Trustless digital marketplace.<br />
                Files encrypted until on-chain payment.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--accent-green)] border border-[var(--ink)]" />
                <span className="text-[11px] text-[var(--ink-soft)] uppercase tracking-wide font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                  USDC on Base
                </span>
              </div>

              {/* Hands logo + Powered by Locus */}
              <div className="mt-6">
                <img
                  src="/image-Photoroom.png"
                  alt="TrustDrop exchange — two hands meeting at a crosshair"
                  className="w-full max-w-[220px] block"
                />
                <p
                  className="mt-2 text-[11px] text-[var(--ink-soft)] uppercase tracking-widest font-bold"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Powered by Locus
                </p>
              </div>
            </div>

            {/* Marketplace links */}
            <div>
              <h4 className="label-uppercase mb-4">Marketplace</h4>
              <ul className="space-y-3">
                {[
                  { href: '/#browse', label: 'Browse Assets', scroll: true },
                  { href: '/sell', label: 'Start Selling' },
                  { href: '/dashboard/seller', label: 'My Sales' },
                  { href: '/dashboard/buyer', label: 'My Purchases' },
                ].map((link) => (
                  <li key={link.href}>
                    {link.scroll ? (
                      <a href={link.href} onClick={scrollToBrowse} className="text-[13px] text-[var(--ink-soft)] hover:text-[var(--accent-green)] transition-colors font-medium">
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="text-[13px] text-[var(--ink-soft)] hover:text-[var(--accent-green)] transition-colors font-medium">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Platform links */}
            <div>
              <h4 className="label-uppercase mb-4">Platform</h4>
              <ul className="space-y-3">
                <li><Link href="/login" className="text-[13px] text-[var(--ink-soft)] hover:text-[var(--accent-green)] transition-colors font-medium">Connect Wallet</Link></li>
                <li><a href="https://docs.paywithlocus.com/features/send-types" target="_blank" rel="noopener noreferrer" className="text-[13px] text-[var(--ink-soft)] hover:text-[var(--accent-green)] transition-colors font-medium">How It Works</a></li>
                <li><a href="#" className="text-[13px] text-[var(--ink-soft)] hover:text-[var(--accent-green)] transition-colors font-medium">Security</a></li>
              </ul>
            </div>

            {/* Start selling CTA card */}
            <div
              className="border-2 border-[var(--ink)] p-5 flex flex-col gap-4"
              style={{ background: 'var(--accent-green)', boxShadow: '4px 4px 0 0 var(--shadow-hard)' }}
            >
              <h4
                className="text-[var(--ink)] text-base uppercase"
                style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}
              >
                Join TrustDrop
              </h4>
              <p className="text-[12px] text-[var(--ink)] font-medium leading-relaxed opacity-80">
                List your first asset today. No chargebacks, ever.
              </p>
              <Link
                href="/sell"
                className="btn-primary w-full justify-center"
                style={{
                  background: 'var(--accent-yellow)',
                  color: 'var(--ink)',
                }}
              >
                Start Selling
              </Link>
              <a
                href="https://github.com/sunilswain7/TrustDrop"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[var(--ink)] text-center font-semibold underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
              >
                View on GitHub →
              </a>
            </div>

          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t-2 border-[var(--ink)] px-4 sm:px-6 py-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-[var(--ink-soft)] font-medium">
              © {new Date().getFullYear()} TrustDrop. All rights reserved.
            </span>
            <span
              className="text-[11px] text-[var(--ink-soft)] font-bold uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Zero chargebacks · Zero scams
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
