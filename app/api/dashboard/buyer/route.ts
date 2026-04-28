import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

// GET /api/dashboard/buyer — purchases, downloads, tx proof links
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (user as { id: string }).id;
  const wallet = (user as { locus_wallet_address: string }).locus_wallet_address;

  const purchasesResult = await query(
    `SELECT p.id, p.listing_id, p.payment_tx_hash, p.payer_address,
            p.paid_at, p.detection_source, p.download_token,
            p.download_token_expires, p.downloaded, p.on_chain_verified,
            p.created_at,
            l.title, l.category, l.file_type, l.price_usdc, l.preview_url,
            u.display_name AS seller_name, u.trust_score AS seller_trust
     FROM purchases p
     JOIN listings l ON p.listing_id = l.id
     JOIN users u ON l.seller_id = u.id
     WHERE p.buyer_id = $1
        OR LOWER(p.buyer_wallet_address) = LOWER($2)
     ORDER BY p.created_at DESC`,
    [userId, wallet]
  );

  const totalsResult = await query(
    `SELECT COALESCE(SUM(l.price_usdc), 0) AS total_spent,
            COUNT(*) AS total_purchases
     FROM purchases p
     JOIN listings l ON p.listing_id = l.id
     WHERE (p.buyer_id = $1 OR LOWER(p.buyer_wallet_address) = LOWER($2))
       AND p.on_chain_verified = true`,
    [userId, wallet]
  );

  const totals = totalsResult.rows[0] as { total_spent: string; total_purchases: string };

  return NextResponse.json({
    user: {
      id: userId,
      display_name: (user as { display_name: string | null }).display_name,
      trust_score: (user as { trust_score: number }).trust_score,
      locus_wallet_address: (user as { locus_wallet_address: string }).locus_wallet_address,
    },
    purchases: purchasesResult.rows,
    totals: {
      totalSpent: parseFloat(totals.total_spent),
      totalPurchases: parseInt(totals.total_purchases),
    },
  });
}
