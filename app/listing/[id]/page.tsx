'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import LocusCheckoutButton from '@/components/LocusCheckoutButton';
import TxProof from '@/components/TxProof';
import ShareLink from '@/components/ShareLink';
import DirectCheckoutLink from '@/components/DirectCheckoutLink';

import { SkeletonListingPage } from '@/components/Skeleton';
import Sunburst from '@/components/Sunburst';
import TipButton from '@/components/TipButton';
import type { CheckoutSuccessData } from '@withlocus/checkout-react';

interface Listing {
  id: string;
  title: string;
  description: string;
  price_usdc: string;
  category: string;
  file_type: string;
  preview_url: string;
  preview_gif_url: string | null;
  video_duration: number | null;
  preview_version: number;
  status: string;
  created_at: string;
  checkout_session_id: string | null;
  checkout_url: string | null;
  seller_name: string | null;
  seller_trust: number;
  seller_wallet: string;
  seller_email: string | null;
}

interface PurchaseInfo {
  download_token: string;
  download_token_expires: string;
  downloaded: boolean;
  payment_tx_hash: string | null;
  detection_source: string | null;
}

interface PriceBreakdown {
  originalPrice: string;
  commitments: { amount: string; description: string }[];
  totalCommitted: string;
  finalAmount: string;
}

export default function ListingPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const justPaid = searchParams.get('paid') === 'true';

  const [listing, setListing] = useState<Listing | null>(null);
  const [purchase, setPurchase] = useState<PurchaseInfo | null>(null);
  const [breakdown, setBreakdown] = useState<PriceBreakdown | null>(null);
  const [isSeller, setIsSeller] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchListing = useCallback(() => {
    fetch(`/api/listings/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setListing(data.listing);
          if (data.purchase) setPurchase(data.purchase);
          if (data.breakdown) setBreakdown(data.breakdown);
          if (data.isSeller) setIsSeller(true);
        }
      })
      .catch(() => setError('Failed to load listing'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetch('/api/auth')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setIsAuthenticated(!!data?.user))
      .catch(() => setIsAuthenticated(false));
  }, []);

  useEffect(() => { fetchListing(); }, [fetchListing]);

  useEffect(() => {
    if (!justPaid || !listing || listing.status !== 'ACTIVE') return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/listings/${id}`);
      const data = await res.json();
      if (data.listing?.status === 'SOLD' && data.purchase) {
        setPurchase(data.purchase);
        setListing(data.listing);
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [justPaid, listing, id]);

  const handlePaymentSuccess = useCallback((data: CheckoutSuccessData) => {
    setTxHash(data.txHash);
    const interval = setInterval(async () => {
      const res = await fetch(`/api/listings/${id}`);
      const result = await res.json();
      if (result.purchase) {
        setPurchase(result.purchase);
        setListing(result.listing);
        clearInterval(interval);
      }
    }, 3000);
    setTimeout(() => clearInterval(interval), 120000);
  }, [id]);

  if (loading) return <SkeletonListingPage />;

  if (error || !listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div
          className="inline-block border-2 border-[var(--ink)] bg-[var(--accent-coral)] text-white px-6 py-4 font-bold uppercase text-sm"
          style={{ fontFamily: 'var(--font-display)', boxShadow: '4px 4px 0 0 var(--shadow-hard)' }}
        >
          {error || 'Listing not found'}
        </div>
      </div>
    );
  }

  const displayTxHash = txHash || purchase?.payment_tx_hash;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 relative">
      <Sunburst color="var(--accent-yellow)" size={60} rotation={15} className="absolute top-6 right-2 opacity-30 hidden lg:block" />

      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/#browse"
          className="text-[12px] font-semibold text-[var(--ink-soft)] hover:text-[var(--accent-green)] transition-colors uppercase tracking-wide"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          ← Back to Browse
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">

        {/* Preview */}
        <div>

          <div
            className="border-2 border-[var(--ink)] overflow-hidden relative bg-[#e8e0cc] group/preview"
            style={{ boxShadow: '6px 6px 0 0 var(--shadow-hard)' }}
          >
            {listing.preview_url && listing.preview_url !== 'pending' ? (
              <>
                <img
                  src={listing.preview_url}
                  alt={listing.title}
                  className={`w-full aspect-square object-cover ${listing.preview_gif_url ? 'group-hover/preview:hidden' : ''}`}
                />
                {listing.preview_gif_url && (
                  <img
                    src={listing.preview_gif_url}
                    alt={`${listing.title} preview`}
                    className="w-full aspect-square object-cover hidden group-hover/preview:block"
                  />
                )}
              </>
            ) : (
              <div className="w-full aspect-square flex items-center justify-center">
                <span
                  className="text-[12px] text-[var(--ink-soft)] font-bold uppercase tracking-wide"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Preview generating…
                </span>
              </div>
            )}
            <div
              className="absolute top-3 right-3 border-2 border-[var(--ink)] text-[10px] font-bold px-2 py-0.5 uppercase"
              style={{ background: 'var(--accent-yellow)', fontFamily: 'var(--font-display)', boxShadow: '2px 2px 0 0 var(--shadow-hard)' }}
            >
              v{listing.preview_version}
            </div>
            {listing.video_duration && (
              <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1.5">
                <span className="text-emerald-400">&#9654;</span>
                {Math.floor(listing.video_duration / 60)}:{String(Math.floor(listing.video_duration % 60)).padStart(2, '0')}
              </div>
            )}
          </div>
          {listing.preview_gif_url && (
            <p className="text-xs text-zinc-600 text-center mt-2">Hover to see animated preview</p>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">

          {/* Category + Title */}
          <div>
            <span
              className="inline-block border-2 border-[var(--ink)] text-[10px] font-bold px-3 py-1 uppercase tracking-wider mb-3"
              style={{ background: 'var(--accent-yellow)', fontFamily: 'var(--font-display)', boxShadow: '2px 2px 0 0 var(--shadow-hard)' }}
            >
              {listing.category}
            </span>
            <h1
              className="text-2xl sm:text-3xl text-[var(--ink)] leading-tight"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
            >
              {listing.title.toUpperCase()}
            </h1>
          </div>

          <p className="text-sm text-[var(--ink-soft)] leading-relaxed font-medium">{listing.description}</p>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span
              className="text-4xl font-bold text-[var(--accent-green)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              ${parseFloat(listing.price_usdc).toFixed(2)}
            </span>
            <span
              className="text-[12px] font-bold text-[var(--ink-soft)] uppercase tracking-wide"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              USDC
            </span>
          </div>

          {/* Seller info */}
          <div className="card-retro-static p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="label-uppercase" style={{ marginBottom: 3 }}>Seller</p>
                <p className="text-[var(--ink)] font-bold text-sm uppercase" style={{ fontFamily: 'var(--font-display)' }}>
                  {listing.seller_name || 'Anonymous'}
                </p>
                <p className="text-[11px] text-[var(--ink-soft)] font-mono mt-0.5 truncate">
                  {listing.seller_wallet.slice(0, 6)}…{listing.seller_wallet.slice(-4)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="label-uppercase" style={{ marginBottom: 3 }}>Trust Score</p>
                <p
                  className="text-3xl font-bold text-[var(--accent-green)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {listing.seller_trust}
                </p>
              </div>
            </div>
          </div>

          {/* File info */}
          <div className="border-t-2 border-[var(--ink)] pt-4 space-y-1">
            {[
              { label: 'File type', value: `.${listing.file_type}` },
              { label: 'Status', value: listing.status },
              ...(purchase?.detection_source ? [{ label: 'Verified via', value: purchase.detection_source }] : []),
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-2 text-[12px]">
                <span className="text-[var(--ink-soft)] font-medium uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)', fontSize: '10px' }}>
                  {row.label}:
                </span>
                <span className="text-[var(--ink)] font-bold">{row.value}</span>
              </div>
            ))}
          </div>

          {/* Itemized breakdown */}
          {breakdown && breakdown.commitments.length > 0 && !purchase && (
            <div className="card-retro-static p-4 space-y-3 text-sm">
              <p className="label-uppercase">Itemized Total</p>
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--ink-soft)]">{listing.title} (original)</span>
                <span className="text-[var(--ink)] font-bold">${breakdown.originalPrice}</span>
              </div>
              {breakdown.commitments.map((c, i) => (
                <div key={i} className="flex justify-between text-[13px] text-[var(--accent-green)]">
                  <span className="truncate pr-2" title={c.description}>
                    Commitment: {c.description.slice(0, 40)}{c.description.length > 40 ? '…' : ''}
                  </span>
                  <span>−${c.amount}</span>
                </div>
              ))}
              <div className="border-t-2 border-[var(--ink)] pt-3 flex justify-between font-bold text-[13px]">
                <span className="text-[var(--ink)]">Final due now</span>
                <span className="text-[var(--accent-green)]">${breakdown.finalAmount}</span>
              </div>
            </div>
          )}


          {/* Seller badge */}
          {isSeller && listing.status === 'ACTIVE' && (
            <div
              className="border-2 border-[var(--ink)] bg-[var(--bg-cream-alt)] px-4 py-4 text-center"
              style={{ boxShadow: '3px 3px 0 0 var(--shadow-hard)' }}
            >
              <p className="font-bold text-[13px] text-[var(--ink)] uppercase" style={{ fontFamily: 'var(--font-display)' }}>This is your listing</p>
              <p className="text-[11px] text-[var(--ink-soft)] mt-1">You cannot buy your own product</p>
            </div>
          )}

          {/* Buy / Checkout */}
          {listing.status === 'ACTIVE' && !purchase && !isSeller && (
            <LocusCheckoutButton
              listingId={listing.id}
              sessionId={listing.checkout_session_id}
              checkoutUrl={listing.checkout_url}
              price={breakdown?.finalAmount ?? listing.price_usdc}
              isAuthenticated={isAuthenticated}
              onSuccess={handlePaymentSuccess}
            />
          )}

          {/* Post-purchase download */}
          {purchase && (
            <div className="space-y-4">
              <div
                className="border-2 border-[var(--ink)] bg-[var(--accent-green)] px-4 py-4"
                style={{ boxShadow: '4px 4px 0 0 var(--shadow-hard)' }}
              >
                <p
                  className="font-bold text-sm uppercase text-[var(--ink)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Payment Verified On-Chain
                </p>
                <p className="text-[12px] text-[var(--ink)] mt-1 font-medium opacity-80">
                  Dual verification passed. Your file is ready.
                </p>
              </div>

              {!purchase.downloaded ? (
                <a
                  href={`/api/download/${purchase.download_token}`}
                  className="btn-primary w-full py-3 text-[14px]"
                >
                  Download Decrypted File →
                </a>
              ) : (
                <div
                  className="border-2 border-[var(--ink)] bg-[var(--bg-cream-alt)] text-center py-4 text-[var(--ink-soft)] text-sm font-bold uppercase"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  File already downloaded
                </div>
              )}

              {displayTxHash && <TxProof txHash={displayTxHash} />}

              {new Date(purchase.download_token_expires) > new Date() && (
                <p className="text-[11px] text-[var(--ink-soft)] text-center font-medium">
                  Link expires: {new Date(purchase.download_token_expires).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Sold (not purchased by this user) */}
          {listing.status === 'SOLD' && !purchase && (
            <div
              className="border-2 border-[var(--ink)] bg-[var(--bg-cream-alt)] text-center py-4 text-[var(--ink-soft)] text-sm font-bold uppercase"
              style={{ fontFamily: 'var(--font-display)', boxShadow: '3px 3px 0 0 var(--shadow-hard)' }}
            >
              This item has been sold
            </div>
          )}

          {/* Share links */}
          {listing.status === 'ACTIVE' && (
            <div className="flex flex-wrap gap-3 pt-4 border-t-2 border-[var(--ink)]">
              <ShareLink listingId={listing.id} />
              <DirectCheckoutLink checkoutUrl={listing.checkout_url} disabled={!isAuthenticated} />
            </div>
          )}


          {/* Support Creator tip */}
          {!isSeller && (
            <TipButton
              listingId={listing.id}
              sellerWallet={listing.seller_wallet}
              sellerName={listing.seller_name}
              sellerEmail={listing.seller_email}
            />
          )}

          {/* Improvement room */}
          {listing.status === 'ACTIVE' && (
            <Link
              href={`/listing/${listing.id}/room`}
              className="block text-center text-[12px] font-bold text-[var(--ink-soft)] hover:text-[var(--accent-green)] transition-colors uppercase tracking-wide mt-1"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Open Improvement Room →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
