'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ImprovementRoom from '@/components/ImprovementRoom';

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
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [listing, setListing] = useState<ListingBasic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth').then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/listings/${listingId}`).then((r) => r.json()),
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
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-zinc-500">Loading room...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-400">You need to log in to use the Improvement Room.</p>
        <Link
          href="/login"
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg transition"
        >
          Connect Wallet
        </Link>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-red-400">Listing not found.</p>
      </div>
    );
  }

  const isSeller = listing.seller_id === user.id;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Back link */}
      <div className="border-b border-zinc-800 px-4 py-2 flex items-center gap-4">
        <Link
          href={`/listing/${listingId}`}
          className="text-sm text-zinc-400 hover:text-white transition"
        >
          &larr; Back to listing
        </Link>
        <span className="text-xs text-zinc-600">
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
