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
      <div
        className="bg-[var(--bg-cream-alt)] border-2 border-[var(--ink)] overflow-hidden transition-all duration-150"
        style={{ boxShadow: '4px 4px 0 0 var(--shadow-hard)' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '2px 2px 0 0 var(--shadow-hard)';
          (e.currentTarget as HTMLDivElement).style.transform = 'translate(2px, 2px)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '4px 4px 0 0 var(--shadow-hard)';
          (e.currentTarget as HTMLDivElement).style.transform = '';
        }}
      >
        {/* Preview image */}
        <div className="aspect-square bg-[#e8e0cc] relative overflow-hidden border-b-2 border-[var(--ink)]">
          {preview_url && preview_url !== 'pending' ? (
            <img
              src={preview_url}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[11px] text-[var(--ink-soft)] font-semibold uppercase tracking-wide">
                No preview
              </span>
            </div>
          )}
          {/* Category badge */}
          <span
            className="absolute top-2 left-2 text-[10px] border-2 border-[var(--ink)] px-2 py-0.5 font-semibold uppercase tracking-wider"
            style={{
              background: 'var(--accent-yellow)',
              fontFamily: 'var(--font-display)',
              boxShadow: '2px 2px 0 0 var(--shadow-hard)',
            }}
          >
            {category}
          </span>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3
            className="text-[13px] text-[var(--ink)] truncate uppercase"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}
          >
            {title}
          </h3>
          <div className="flex items-center justify-between mt-2">
            <span
              className="font-bold text-[15px] text-[var(--accent-green)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              ${parseFloat(price_usdc).toFixed(2)}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--ink-soft)]">
              <span>{seller_name || 'Anon'}</span>
              <span className="text-[var(--accent-green)] font-bold">({seller_trust})</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
