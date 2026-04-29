import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

// GET /api/listings/:id — listing detail
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await query(
    `SELECT l.*, u.display_name as seller_name, u.trust_score as seller_trust,
            u.locus_wallet_address as seller_wallet
     FROM listings l
     JOIN users u ON l.seller_id = u.id
     WHERE l.id = $1`,
    [id]
  );

  if (!result.rows.length) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  // Check if current user has a purchase for this listing
  let purchase = null;
  const user = await getCurrentUser();
  if (user) {
    const purchaseResult = await query(
      `SELECT download_token, download_token_expires, downloaded,
              payment_tx_hash, detection_source
       FROM purchases WHERE listing_id = $1 AND buyer_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [id, (user as { id: string }).id]
    );
    if (purchaseResult.rows.length) {
      purchase = purchaseResult.rows[0];
    }
  }

  // Also check by session for unauthenticated/different-wallet purchases
  if (!purchase) {
    const listing = result.rows[0] as Record<string, unknown>;
    if (listing.status === 'SOLD' && listing.checkout_session_id) {
      const purchaseResult = await query(
        `SELECT download_token, download_token_expires, downloaded,
                payment_tx_hash, detection_source
         FROM purchases WHERE checkout_session_id = $1 AND on_chain_verified = true
         ORDER BY created_at DESC LIMIT 1`,
        [listing.checkout_session_id]
      );
      if (purchaseResult.rows.length) {
        purchase = purchaseResult.rows[0];
      }
    }
  }

  // For logged-in buyers, include any HELD commitments + price breakdown.
  let breakdown = null;
  if (user) {
    const userId = (user as { id: string }).id;
    const heldResult = await query<{ id: string; amount_usdc: string; requested_changes: string }>(
      `SELECT id, amount_usdc, requested_changes
       FROM commitments
       WHERE listing_id = $1 AND buyer_id = $2 AND status = 'HELD'`,
      [id, userId]
    );
    const listingRow = result.rows[0] as Record<string, unknown>;
    const originalPrice = parseFloat(String(listingRow.price_usdc));
    const totalCommitted = heldResult.rows.reduce((sum, c) => sum + parseFloat(c.amount_usdc), 0);
    breakdown = {
      originalPrice: originalPrice.toFixed(2),
      commitments: heldResult.rows.map((c) => ({
        amount: parseFloat(c.amount_usdc).toFixed(2),
        description: c.requested_changes,
      })),
      totalCommitted: totalCommitted.toFixed(2),
      finalAmount: Math.max(0, originalPrice - totalCommitted).toFixed(2),
    };
  }

  const listingRow = result.rows[0] as Record<string, unknown>;
  const isSeller = user ? (user as { id: string }).id === listingRow.seller_id : false;

  return NextResponse.json({ listing: result.rows[0], purchase, breakdown, isSeller });
}

// PUT /api/listings/:id — update listing (seller only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (user as { id: string }).id;

  // Verify ownership
  const listing = await query(
    'SELECT * FROM listings WHERE id = $1 AND seller_id = $2',
    [id, userId]
  );

  if (!listing.rows.length) {
    return NextResponse.json({ error: 'Listing not found or not yours' }, { status: 404 });
  }

  const body = await req.json();
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (body.title) {
    updates.push(`title = $${paramIdx}`);
    values.push(body.title);
    paramIdx++;
  }

  if (body.description) {
    updates.push(`description = $${paramIdx}`);
    values.push(body.description);
    paramIdx++;
  }

  if (body.price !== undefined) {
    updates.push(`price_usdc = $${paramIdx}`);
    values.push(body.price);
    paramIdx++;
  }

  if (body.status) {
    updates.push(`status = $${paramIdx}`);
    values.push(body.status);
    paramIdx++;
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  updates.push('updated_at = NOW()');
  values.push(id);

  await query(
    `UPDATE listings SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
    values
  );

  return NextResponse.json({ success: true });
}
