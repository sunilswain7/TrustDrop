import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createCheckoutSession } from '@/lib/locus';
import { query } from '@/lib/db';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// POST /api/checkout/create — create a Locus Checkout session for a listing
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { listingId } = await req.json();
  if (!listingId) {
    return NextResponse.json({ error: 'listingId is required' }, { status: 400 });
  }

  // Get listing
  const result = await query(
    `SELECT l.*, u.locus_wallet_address as seller_wallet
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

  // Cancel existing session if any
  if (listing.checkout_session_id) {
    try {
      const { cancelCheckoutSession } = await import('@/lib/locus');
      await cancelCheckoutSession(listing.checkout_session_id as string);
      console.log(`[CHECKOUT] Cancelled old session: ${listing.checkout_session_id}`);
    } catch (err) {
      console.warn('[CHECKOUT] Could not cancel old session:', err);
    }
  }

  // Create new Locus Checkout session
  const session = await createCheckoutSession({
    amount: String(listing.price_usdc),
    description: `TrustDrop: ${listing.title}`,
    webhookUrl: `${APP_URL}/api/checkout/webhook`,
    successUrl: `${APP_URL}/listing/${listingId}?paid=true`,
    metadata: {
      listingId: listingId,
      sellerWallet: listing.seller_wallet as string,
    },
  });

  // Update listing with session info
  await query(
    'UPDATE listings SET checkout_session_id = $1, checkout_url = $2, updated_at = NOW() WHERE id = $3',
    [session.id, session.checkoutUrl, listingId]
  );

  console.log(`[CHECKOUT] Session created: ${session.id} for listing ${listingId} — $${listing.price_usdc} USDC`);

  return NextResponse.json({
    sessionId: session.id,
    checkoutUrl: session.checkoutUrl,
    expiresAt: session.expiresAt,
  });
}
