import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendPayment } from '@/lib/locus';
import { verifyPaymentOnChain } from '@/lib/verification';
import { broadcastToRoom } from '@/lib/websocket';

// POST /api/room/:id/check-deadline
// Called on Room load by either party. Refunds the buyer for any HELD commitment
// where the deadline has passed AND the seller has not posted a preview_update
// after the commitment was created (Outcome C).
//
// No auth: this is read-mostly and any side-effect requires on-chain proof of
// the original payment + the deadline being genuinely past.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await params;

  const expired = await query<{
    id: string;
    buyer_id: string;
    amount_usdc: string;
    checkout_session_id: string;
    created_at: string;
  }>(
    `SELECT id, buyer_id, amount_usdc, checkout_session_id, created_at
     FROM commitments
     WHERE listing_id = $1 AND status = 'HELD' AND deadline < NOW()`,
    [listingId]
  );

  const refunded: Array<{ id: string; txHash: string }> = [];

  for (const c of expired.rows) {
    // If the seller delivered a preview update AFTER the commitment was created,
    // the commitment is not eligible for refund — it should be resolved by the
    // final-purchase flow or a buyer reject. Skip it.
    const sellerDelivered = await query<{ id: string }>(
      `SELECT id FROM room_messages
       WHERE listing_id = $1 AND sender_role = 'seller'
         AND message_type = 'preview_update'
         AND created_at > $2
       LIMIT 1`,
      [listingId, c.created_at]
    );
    if (sellerDelivered.rows.length) continue;

    // Re-verify the original commitment payment was real before refunding.
    const onChainPaid = await verifyPaymentOnChain(c.checkout_session_id);
    if (!onChainPaid) continue;

    // Look up buyer wallet.
    const buyerResult = await query<{ locus_wallet_address: string }>(
      `SELECT locus_wallet_address FROM users WHERE id = $1`,
      [c.buyer_id]
    );
    if (!buyerResult.rows.length) continue;

    try {
      const { txHash } = await sendPayment({
        to: buyerResult.rows[0].locus_wallet_address,
        amount: c.amount_usdc,
        reason: `Commitment refund (deadline) — listing ${listingId}`,
      });

      await query(
        `UPDATE commitments
         SET status = 'REFUNDED', resolved_at = NOW()
         WHERE id = $1`,
        [c.id]
      );

      const systemContent = `Seller did not deliver in time. Commitment fee ($${parseFloat(c.amount_usdc).toFixed(2)} USDC) refunded to buyer.`;
      await query(
        `INSERT INTO room_messages (listing_id, sender_id, sender_role, message_type, content)
         VALUES ($1, $2, 'buyer', 'system', $3)`,
        [listingId, c.buyer_id, systemContent]
      );

      broadcastToRoom(listingId, {
        type: 'system',
        senderId: c.buyer_id,
        senderRole: 'buyer',
        content: systemContent,
        timestamp: new Date().toISOString(),
      });

      refunded.push({ id: c.id, txHash });
    } catch (err) {
      console.error(`[CHECK-DEADLINE] Failed to refund commitment ${c.id}:`, err);
    }
  }

  return NextResponse.json({ refunded });
}
