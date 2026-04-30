'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ListingCardProps {
  id: string;
  title: string;
  price_usdc: string;
  category: string;
  file_type: string;
  preview_url: string;
  preview_gif_url?: string | null;
  video_duration?: number | null;
  seller_name: string | null;
  seller_trust: number;
}

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'webm', 'mkv'];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ListingCard({
  id,
  title,
  price_usdc,
  category,
  file_type,
  preview_url,
  preview_gif_url,
  video_duration,
  seller_name,
  seller_trust,
}: ListingCardProps) {
  const [hovering, setHovering] = useState(false);
  const isVideo = VIDEO_EXTENSIONS.includes(file_type?.toLowerCase() ?? '');

  return (
    <Link href={`/listing/${id}`} className="group block">
      <div
        className="bg-[var(--bg-cream-alt)] border-2 border-[var(--ink)] overflow-hidden transition-all duration-150"
        style={{ boxShadow: '4px 4px 0 0 var(--shadow-hard)' }}
        onMouseEnter={(e) => {
          setHovering(true);
          (e.currentTarget as HTMLDivElement).style.boxShadow = '2px 2px 0 0 var(--shadow-hard)';
          (e.currentTarget as HTMLDivElement).style.transform = 'translate(2px, 2px)';
        }}
        onMouseLeave={(e) => {
          setHovering(false);
          (e.currentTarget as HTMLDivElement).style.boxShadow = '4px 4px 0 0 var(--shadow-hard)';
          (e.currentTarget as HTMLDivElement).style.transform = '';
        }}
      >
        {/* Preview image */}
        <div className="aspect-square bg-[#e8e0cc] relative overflow-hidden border-b-2 border-[var(--ink)]">
          {preview_url && preview_url !== 'pending' ? (
            <>
              <img
                src={hovering && preview_gif_url ? preview_gif_url : preview_url}
                alt={title}
                className="w-full h-full object-cover"
              />
              {/* Video duration badge */}
              {isVideo && video_duration && (
                <span
                  className="absolute bottom-2 right-2 text-[10px] font-bold px-2 py-0.5 border border-[var(--ink)] flex items-center gap-1"
                  style={{ background: 'rgba(17,17,17,0.75)', color: '#fff', fontFamily: 'var(--font-display)' }}
                >
                  <span style={{ color: 'var(--accent-green)' }}>▶</span>
                  {formatDuration(video_duration)}
                </span>
              )}
              {/* GIF hover hint */}
              {preview_gif_url && !hovering && (
                <span
                  className="absolute bottom-2 left-2 text-[9px] font-bold px-1.5 py-0.5 border border-[var(--ink)] uppercase tracking-wider"
                  style={{ background: 'var(--accent-yellow)', fontFamily: 'var(--font-display)', boxShadow: '1px 1px 0 0 var(--shadow-hard)' }}
                >
                  GIF
                </span>
              )}
            </>
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
