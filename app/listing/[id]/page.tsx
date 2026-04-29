'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import LocusCheckoutButton from '@/components/LocusCheckoutButton';
import TxProof from '@/components/TxProof';
import ShareLink from '@/components/ShareLink';
import DirectCheckoutLink from '@/components/DirectCheckoutLink';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);

  const fetchListing = useCallback(() => {
    fetch(`/api/listings/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setListing(data.listing);
          if (data.purchase) setPurchase(data.purchase);
          if (data.breakdown) setBreakdown(data.breakdown);
        }
      })
      .catch(() => setError('Failed to load listing'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  // Poll for download token after payment
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
    // Start polling for download token
    const interval = setInterval(async () => {
      const res = await fetch(`/api/listings/${id}`);
      const result = await res.json();
      if (result.purchase) {
        setPurchase(result.purchase);
        setListing(result.listing);
        clearInterval(interval);
      }
    }, 3000);

    setTimeout(() => clearInterval(interval), 120000); // stop after 2 min
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-zinc-800 rounded-xl" />
          <div className="h-8 bg-zinc-800 rounded w-1/2" />
          <div className="h-4 bg-zinc-800 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-red-400">{error || 'Listing not found'}</p>
      </div>
    );
  }

  const displayTxHash = txHash || purchase?.payment_tx_hash;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Preview */}
        <div>
          <div className="relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group/preview">
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
              <div className="w-full aspect-square flex items-center justify-center text-zinc-600">
                Preview generating...
              </div>
            )}
            <div className="absolute top-3 right-3 bg-zinc-900/80 text-xs text-zinc-400 px-2 py-1 rounded">
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
        <div className="space-y-6">
          <div>
            <span className="text-xs uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
              {listing.category}
            </span>
            <h1 className="text-3xl font-bold mt-3">{listing.title}</h1>
          </div>

          <p className="text-zinc-400 leading-relaxed">{listing.description}</p>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-emerald-400">
              ${parseFloat(listing.price_usdc).toFixed(2)}
            </span>
            <span className="text-zinc-500">USDC</span>
          </div>

          {/* Seller info */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Seller</p>
                <p className="text-white font-medium">
                  {listing.seller_name || 'Anonymous'}
                </p>
                <p className="text-xs text-zinc-600 font-mono mt-1">
                  {listing.seller_wallet.slice(0, 6)}...{listing.seller_wallet.slice(-4)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-zinc-400">Trust Score</p>
                <p className="text-2xl font-bold text-emerald-400">{listing.seller_trust}</p>
              </div>
            </div>
          </div>

          {/* File info */}
          <div className="text-sm text-zinc-500 space-y-1">
            <p>File type: .{listing.file_type}</p>
            <p>Status: {listing.status}</p>
            {purchase?.detection_source && (
              <p>Verified via: {purchase.detection_source}</p>
            )}
          </div>

          {/* Itemized breakdown when buyer has commitments on this listing */}
          {breakdown && breakdown.commitments.length > 0 && !purchase && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm space-y-2">
              <p className="text-zinc-400 font-medium">Your itemized total</p>
              <div className="flex justify-between">
                <span className="text-zinc-400">{listing.title} (original)</span>
                <span className="text-zinc-300">${breakdown.originalPrice}</span>
              </div>
              {breakdown.commitments.map((c, i) => (
                <div key={i} className="flex justify-between text-violet-300">
                  <span className="truncate pr-2" title={c.description}>
                    Commitment: {c.description.slice(0, 40)}{c.description.length > 40 ? '…' : ''}
                  </span>
                  <span>−${c.amount}</span>
                </div>
              ))}
              <div className="border-t border-zinc-800 pt-2 flex justify-between font-semibold">
                <span className="text-white">Final due now</span>
                <span className="text-emerald-400">${breakdown.finalAmount}</span>
              </div>
              <p className="text-xs text-zinc-600">
                Locus receipt is configured ({'{'}<code>enabled</code>, <code>merchantName</code>{'}'}). Locus emails its own
                receipt for the final amount; this panel is the full itemized breakdown.
              </p>
            </div>
          )}

          {/* Buy / Download section */}
          {listing.status === 'ACTIVE' && !purchase && (
            <LocusCheckoutButton
              listingId={listing.id}
              sessionId={listing.checkout_session_id}
              checkoutUrl={listing.checkout_url}
              price={breakdown?.finalAmount ?? listing.price_usdc}
              onSuccess={handlePaymentSuccess}
            />
          )}

          {/* Post-purchase: download */}
          {purchase && (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <p className="text-emerald-400 font-semibold">Payment Verified On-Chain</p>
                <p className="text-sm text-zinc-400 mt-1">
                  Dual verification passed. Your file is ready for download.
                </p>
              </div>

              {!purchase.downloaded ? (
                <a
                  href={`/api/download/${purchase.download_token}`}
                  className="block w-full text-center bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-4 rounded-lg transition text-lg"
                >
                  Download Decrypted File
                </a>
              ) : (
                <div className="bg-zinc-800 text-center py-4 rounded-lg text-zinc-400">
                  File already downloaded
                </div>
              )}

              {displayTxHash && <TxProof txHash={displayTxHash} />}

              {new Date(purchase.download_token_expires) > new Date() && (
                <p className="text-xs text-zinc-600 text-center">
                  Download link expires: {new Date(purchase.download_token_expires).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {listing.status === 'SOLD' && !purchase && (
            <div className="bg-zinc-800 text-center py-4 rounded-lg text-zinc-400">
              This item has been sold
            </div>
          )}

          {/* Share / Discord links */}
          {listing.status === 'ACTIVE' && (
            <div className="flex flex-wrap gap-2">
              <ShareLink listingId={listing.id} />
              <DirectCheckoutLink checkoutUrl={listing.checkout_url} />
            </div>
          )}

          {/* Improvement Room link */}
          {listing.status === 'ACTIVE' && (
            <Link
              href={`/listing/${listing.id}/room`}
              className="block text-center text-sm text-zinc-400 hover:text-emerald-400 transition"
            >
              Open Improvement Room
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
