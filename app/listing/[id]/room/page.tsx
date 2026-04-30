'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ImprovementRoom from '@/components/ImprovementRoom';
import { SkeletonRoom } from '@/components/Skeleton';

interface User {
  id: string;
  display_name: string | null;
}

interface ListingBasic {
  title: string;
  seller_id: string;
  status: string;
}

export default function RoomPage() {
  const { id: listingId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [listing, setListing] = useState<ListingBasic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/listings/${listingId}`, { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([authData, listingData]) => {
        setUser(authData?.user || null);
        setListing(listingData?.listing || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [listingId]);

  if (loading) {
    return (
      <div
        className="h-[calc(100vh-3.5rem)] flex flex-col bg-[var(--bg-cream)] border-t-2 border-[var(--ink)]"
      >
        <div className="border-b-2 border-[var(--ink)] bg-[var(--bg-cream)] px-4 sm:px-6 py-3 flex items-center gap-4">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-4 w-32" />
        </div>
        <div className="flex-1 overflow-hidden">
          <SkeletonRoom />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center gap-6 bg-[var(--bg-cream)] px-4">
        <p
          className="font-bold text-[var(--ink)] uppercase text-sm tracking-wide"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Log in to use the Improvement Room.
        </p>
        <Link href="/login" className="btn-primary">
          Connect Wallet
        </Link>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center bg-[var(--bg-cream)] px-4">
        <div
          className="border-2 border-[var(--ink)] bg-[var(--accent-coral)] text-white px-6 py-4 font-bold uppercase text-sm"
          style={{ fontFamily: 'var(--font-display)', boxShadow: '4px 4px 0 0 var(--shadow-hard)' }}
        >
          Listing not found.
        </div>
      </div>
    );
  }

  const isSeller = listing.seller_id === user.id;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-[var(--bg-cream)]">
      {/* Top bar */}
      <div className="border-b-2 border-[var(--ink)] bg-[var(--bg-cream)] px-4 sm:px-6 py-3 flex items-center gap-4 shrink-0">
        <Link
          href={`/listing/${listingId}`}
          className="text-[11px] font-bold text-[var(--ink-soft)] hover:text-[var(--accent-green)] transition-colors uppercase tracking-wide"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          ← Back to listing
        </Link>
        <span
          className="text-[10px] border-2 border-[var(--ink)] px-2 py-0.5 font-bold uppercase"
          style={{
            fontFamily: 'var(--font-display)',
            background: isSeller ? 'var(--accent-yellow)' : 'var(--accent-blue)',
            color: 'var(--ink)',
            boxShadow: '2px 2px 0 0 var(--shadow-hard)',
          }}
        >
          {isSeller ? 'You are the seller' : 'You are a buyer'}
        </span>
      </div>

      {/* Room */}
      <div className="flex-1 overflow-hidden">
        <ImprovementRoom
          listingId={listingId as string}
          currentUserId={user.id}
          isSeller={isSeller}
        />
      </div>
    </div>
  );
}
