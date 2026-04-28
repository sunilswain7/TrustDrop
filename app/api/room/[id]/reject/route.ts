import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { sendPayment } from '@/lib/locus';
import { verifyPaymentOnChain } from '@/lib/verification';
import { broadcastToRoom } from '@/lib/websocket';

// POST /api/room/:id/reject — buyer rejects the seller's improved version.
// Releases the commitment fee to the seller via /pay/send (Outcome B).
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (user as { id: string }).id;

  // Find the buyer's HELD commitment for this listing.
  const heldResult = await query<{
    id: string;
    seller_id: string;
    amount_usdc: string;
    checkout_session_id: string;
  }>(
    `SELECT id, seller_id, amount_usdc, checkout_session_id
     FROM commitments
     WHERE listing_id = $1 AND buyer_id = $2 AND status = 'HELD'
     ORDER BY created_at DESC LIMIT 1`,
    [listingId, userId]
  );

  if (!heldResult.rows.length) {
    return NextResponse.json({ error: 'No active commitment to reject' }, { status: 404 });
  }

  const commitment = heldResult.rows[0];

  // Re-verify the original commitment payment is real on-chain before releasing funds.
  const onChainPaid = await verifyPaymentOnChain(commitment.checkout_session_id);
  if (!onChainPaid) {
    return NextResponse.json(
      { error: 'Original commitment payment not visible on-chain' },
      { status: 409 }
    );
  }

  // Look up seller wallet.
  const sellerResult = await query<{ locus_wallet_address: string }>(
    `SELECT locus_wallet_address FROM users WHERE id = $1`,
    [commitment.seller_id]
  );
  if (!sellerResult.rows.length) {
    return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
  }

  const sellerWallet = sellerResult.rows[0].locus_wallet_address;

  // Release funds to the seller.
  const { txHash } = await sendPayment({
    to: sellerWallet,
    amount: commitment.amount_usdc,
    reason: `Commitment release — listing ${listingId}`,
  });

  // Mark the commitment resolved.
  await query(
    `UPDATE commitments
     SET status = 'RELEASED_TO_SELLER', resolved_at = NOW(), payment_tx_hash = COALESCE(payment_tx_hash, $2)
     WHERE id = $1`,
    [commitment.id, txHash]
  );

  const systemContent = `Buyer rejected. Commitment fee ($${parseFloat(commitment.amount_usdc).toFixed(2)} USDC) sent to seller.`;
  await query(
    `INSERT INTO room_messages (listing_id, sender_id, sender_role, message_type, content)
     VALUES ($1, $2, 'buyer', 'system', $3)`,
    [listingId, userId, systemContent]
  );

  broadcastToRoom(listingId, {
    type: 'system',
    senderId: userId,
    senderRole: 'buyer',
    content: systemContent,
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({
    commitmentId: commitment.id,
    txHash,
    status: 'RELEASED_TO_SELLER',
  });
}
