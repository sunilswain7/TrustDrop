import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

// GET /api/dashboard/seller — listings, earnings, trust score for current seller
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (user as { id: string }).id;

  const listingsResult = await query(
    `SELECT l.id, l.title, l.price_usdc, l.category, l.file_type,
            l.preview_url, l.preview_version, l.status,
            l.checkout_url, l.created_at, l.updated_at,
            (SELECT COUNT(*) FROM purchases p
              WHERE p.listing_id = l.id AND p.on_chain_verified = true) AS sales_count
     FROM listings l
     WHERE l.seller_id = $1
     ORDER BY l.created_at DESC`,
    [userId]
  );

  const earningsResult = await query(
    `SELECT COALESCE(SUM(l.price_usdc), 0) AS total_earned,
            COUNT(*) AS total_sales
     FROM purchases p
     JOIN listings l ON p.listing_id = l.id
     WHERE l.seller_id = $1 AND p.on_chain_verified = true`,
    [userId]
  );

  const recentSales = await query(
    `SELECT p.id, p.payment_tx_hash, p.payer_address, p.paid_at,
            p.detection_source, l.title, l.price_usdc
     FROM purchases p
     JOIN listings l ON p.listing_id = l.id
     WHERE l.seller_id = $1 AND p.on_chain_verified = true
     ORDER BY p.paid_at DESC NULLS LAST
     LIMIT 20`,
    [userId]
  );

  const earnings = earningsResult.rows[0] as { total_earned: string; total_sales: string };

  return NextResponse.json({
    user: {
      id: userId,
      display_name: (user as { display_name: string | null }).display_name,
      trust_score: (user as { trust_score: number }).trust_score,
      locus_wallet_address: (user as { locus_wallet_address: string }).locus_wallet_address,
    },
    listings: listingsResult.rows,
    earnings: {
      totalEarned: parseFloat(earnings.total_earned),
      totalSales: parseInt(earnings.total_sales),
    },
    recentSales: recentSales.rows,
  });
}
