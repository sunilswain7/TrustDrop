import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createCheckoutSession } from '@/lib/locus';
import { query } from '@/lib/db';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// POST /api/checkout/create — create a Locus Checkout session for the final purchase.
// Subtracts any HELD commitments (already paid by the buyer) from the amount.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (user as { id: string }).id;
  const { listingId } = await req.json();
  if (!listingId) {
    return NextResponse.json({ error: 'listingId is required' }, { status: 400 });
  }

  const result = await query(
    `SELECT l.*, u.locus_wallet_address as seller_wallet, u.display_name as seller_name
     FROM listings l JOIN users u ON l.seller_id = u.id
     WHERE l.id = $1`,
    [listingId]
  );

  if (!result.rows.length) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  const listing = result.rows[0] as Record<string, unknown>;

  if (listing.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Listing is not active' }, { status: 400 });
  }

  // Compute commitment credit owed to this buyer for this listing.
  const heldCommitments = await query<{
    id: string;
    amount_usdc: string;
    requested_changes: string;
  }>(
    `SELECT id, amount_usdc, requested_changes
     FROM commitments
     WHERE listing_id = $1 AND buyer_id = $2 AND status = 'HELD'`,
    [listingId, userId]
  );

  const originalPrice = parseFloat(String(listing.price_usdc));
  const totalCommitted = heldCommitments.rows.reduce(
    (sum, c) => sum + parseFloat(c.amount_usdc),
    0
  );
  const finalAmountNum = Math.max(0, originalPrice - totalCommitted);
  const finalAmount = finalAmountNum.toFixed(2);

  // Cancel existing session (will be replaced with one carrying the final amount).
  if (listing.checkout_session_id) {
    try {
      const { cancelCheckoutSession } = await import('@/lib/locus');
      await cancelCheckoutSession(listing.checkout_session_id as string);
      console.log(`[CHECKOUT] Cancelled old session: ${listing.checkout_session_id}`);
    } catch (err) {
      console.warn('[CHECKOUT] Could not cancel old session:', err);
    }
  }

  const sellerName = (listing.seller_name as string | null) || 'TrustDrop seller';

  const session = await createCheckoutSession({
    amount: finalAmount,
    description: `TrustDrop: ${listing.title}`,
    webhookUrl: `${APP_URL}/api/checkout/webhook`,
    successUrl: `${APP_URL}/listing/${listingId}?paid=true`,
    metadata: {
      type: 'purchase',
      listingId: listingId,
      sellerWallet: listing.seller_wallet as string,
      buyerId: userId,
      sellerId: String(listing.seller_id),
      fileHash: String(listing.original_file_hash),
      previewVersion: String(listing.preview_version),
    },
    receiptConfig: {
      enabled: true,
      merchantName: sellerName,
    },
  });

  await query(
    'UPDATE listings SET checkout_session_id = $1, checkout_url = $2, updated_at = NOW() WHERE id = $3',
    [session.id, session.checkoutUrl, listingId]
  );

  console.log(
    `[CHECKOUT] Session created: ${session.id} for listing ${listingId} — original $${originalPrice.toFixed(2)}, committed $${totalCommitted.toFixed(2)}, final $${finalAmount} USDC`
  );

  return NextResponse.json({
    sessionId: session.id,
    checkoutUrl: session.checkoutUrl,
    expiresAt: session.expiresAt,
    breakdown: {
      originalPrice: originalPrice.toFixed(2),
      commitments: heldCommitments.rows.map((c) => ({
        amount: parseFloat(c.amount_usdc).toFixed(2),
        description: c.requested_changes,
      })),
      totalCommitted: totalCommitted.toFixed(2),
      finalAmount,
    },
  });
}
