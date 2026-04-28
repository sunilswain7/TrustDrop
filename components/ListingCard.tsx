'use client';

import Link from 'next/link';

interface ListingCardProps {
  id: string;
  title: string;
  price_usdc: string;
  category: string;
  file_type: string;
  preview_url: string;
  seller_name: string | null;
  seller_trust: number;
}

export default function ListingCard({
  id,
  title,
  price_usdc,
  category,
  preview_url,
  seller_name,
  seller_trust,
}: ListingCardProps) {
  return (
    <Link href={`/listing/${id}`} className="group block">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition">
        {/* Preview */}
        <div className="aspect-square bg-zinc-800 relative overflow-hidden">
          {preview_url && preview_url !== 'pending' ? (
            <img
              src={preview_url}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">
              No preview
            </div>
          )}
          <span className="absolute top-2 left-2 text-xs bg-zinc-900/80 text-zinc-300 px-2 py-1 rounded">
            {category}
          </span>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="text-white font-medium truncate group-hover:text-emerald-400 transition">
            {title}
          </h3>
          <div className="flex items-center justify-between mt-2">
            <span className="text-emerald-400 font-bold">
              ${parseFloat(price_usdc).toFixed(2)}
            </span>
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <span>{seller_name || 'Anon'}</span>
              <span className="text-emerald-400/60">({seller_trust})</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
