import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { createCheckoutSession } from '@/lib/locus';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const COMMITMENT_PCT = 0.20;

// POST /api/room/:id/commit — buyer initiates a commitment fee request
// Creates a Locus Checkout session for 20% of the current listing price,
// payable to the platform wallet (default for any session created with our key).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (user as { id: string }).id;
  const { message } = (await req.json()) as { message?: string };

  if (!message || !message.trim()) {
    return NextResponse.json(
      { error: 'A change request message is required' },
      { status: 400 }
    );
  }

  const listingResult = await query(
    `SELECT id, seller_id, price_usdc, status, title FROM listings WHERE id = $1`,
    [listingId]
  );

  if (!listingResult.rows.length) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  const listing = listingResult.rows[0] as {
    id: string;
    seller_id: string;
    price_usdc: string;
    status: string;
    title: string;
  };

  if (listing.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Listing is not active' }, { status: 400 });
  }

  if (listing.seller_id === userId) {
    return NextResponse.json({ error: 'Sellers cannot commit on their own listings' }, { status: 400 });
  }

  // Block parallel HELD commitments by the same buyer for this listing.
  const existingHeld = await query(
    `SELECT id FROM commitments
     WHERE listing_id = $1 AND buyer_id = $2 AND status = 'HELD'`,
    [listingId, userId]
  );
  if (existingHeld.rows.length) {
    return NextResponse.json(
      { error: 'You already have a pending commitment on this listing' },
      { status: 409 }
    );
  }

  const commitmentAmount = (parseFloat(listing.price_usdc) * COMMITMENT_PCT).toFixed(2);

  const session = await createCheckoutSession({
    amount: commitmentAmount,
    description: `TrustDrop commitment — ${listing.title}`,
    webhookUrl: `${APP_URL}/api/checkout/webhook`,
    successUrl: `${APP_URL}/listing/${listingId}/room`,
    metadata: {
      type: 'commitment',
      listingId,
      buyerId: userId,
      sellerId: listing.seller_id,
      requestedChanges: message.trim().slice(0, 500),
    },
  });

  return NextResponse.json({
    sessionId: session.id,
    checkoutUrl: session.checkoutUrl,
    amount: commitmentAmount,
  });
}
