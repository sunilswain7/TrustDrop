import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendPayment } from '@/lib/locus';
import { verifyPaymentOnChain } from '@/lib/verification';
import { broadcastToRoom } from '@/lib/websocket';

// TODO: set back to longer value before launch
const BUYER_RESPONSE_MINUTES = 5;

// POST /api/room/:id/check-deadline
// Handles two expired-commitment scenarios:
//   Outcome C — seller didn't deliver → refund buyer
//   Outcome D — seller delivered but buyer ghosted → pay seller
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await params;

  const expired = await query<{
    id: string;
    buyer_id: string;
    seller_id: string;
    amount_usdc: string;
    checkout_session_id: string;
    created_at: string;
    deadline: string;
  }>(
    `SELECT id, buyer_id, seller_id, amount_usdc, checkout_session_id, created_at, deadline
     FROM commitments
     WHERE listing_id = $1 AND status = 'HELD' AND deadline < NOW()`,
    [listingId]
  );

  const resolved: Array<{ id: string; txHash: string; outcome: string }> = [];

  for (const c of expired.rows) {
    // Did the seller deliver after the commitment was created?
    const sellerDelivered = await query<{ id: string; created_at: string }>(
      `SELECT id, created_at FROM room_messages
       WHERE listing_id = $1 AND sender_role = 'seller'
         AND message_type = 'preview_update'
         AND created_at > $2
       ORDER BY created_at DESC LIMIT 1`,
      [listingId, c.created_at]
    );

    // Re-verify the original commitment payment was real
    const onChainPaid = await verifyPaymentOnChain(c.checkout_session_id);
    if (!onChainPaid) continue;

    if (!sellerDelivered.rows.length) {
      // OUTCOME C: Seller didn't deliver → refund buyer
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
          `UPDATE commitments SET status = 'REFUNDED', resolved_at = NOW() WHERE id = $1`,
          [c.id]
        );

        const msg = `Seller did not deliver in time. Commitment fee ($${parseFloat(c.amount_usdc).toFixed(2)} USDC) refunded to buyer.`;
        await query(
          `INSERT INTO room_messages (listing_id, sender_id, sender_role, message_type, content)
           VALUES ($1, $2, 'buyer', 'system', $3)`,
          [listingId, c.buyer_id, msg]
        );
        broadcastToRoom(listingId, {
          type: 'system', senderId: c.buyer_id, senderRole: 'buyer',
          content: msg, timestamp: new Date().toISOString(),
        });

        resolved.push({ id: c.id, txHash, outcome: 'refunded_buyer' });
      } catch (err) {
        console.error(`[CHECK-DEADLINE] Failed to refund commitment ${c.id}:`, err);
      }
    } else {
      // OUTCOME D: Seller delivered, but buyer hasn't acted.
      // Give the buyer a grace period after seller delivery, then release to seller.
      const deliveryTime = new Date(sellerDelivered.rows[0].created_at).getTime();
      const gracePeriodMs = BUYER_RESPONSE_MINUTES * 60 * 1000;
      const graceExpired = Date.now() > deliveryTime + gracePeriodMs;

      if (!graceExpired) continue;

      // Buyer ghosted — release commitment to seller
      const sellerResult = await query<{ locus_wallet_address: string }>(
        `SELECT locus_wallet_address FROM users WHERE id = $1`,
        [c.seller_id]
      );
      if (!sellerResult.rows.length) continue;

      try {
        const { txHash } = await sendPayment({
          to: sellerResult.rows[0].locus_wallet_address,
          amount: c.amount_usdc,
          reason: `Commitment released (buyer inactive) — listing ${listingId}`,
        });

        await query(
          `UPDATE commitments SET status = 'RELEASED', resolved_at = NOW() WHERE id = $1`,
          [c.id]
        );

        const msg = `Buyer did not respond after delivery. Commitment fee ($${parseFloat(c.amount_usdc).toFixed(2)} USDC) released to seller for their work.`;
        await query(
          `INSERT INTO room_messages (listing_id, sender_id, sender_role, message_type, content)
           VALUES ($1, $2, 'seller', 'system', $3)`,
          [listingId, c.seller_id, msg]
        );
        broadcastToRoom(listingId, {
          type: 'system', senderId: c.seller_id, senderRole: 'seller',
          content: msg, timestamp: new Date().toISOString(),
        });

        resolved.push({ id: c.id, txHash, outcome: 'released_to_seller' });
      } catch (err) {
        console.error(`[CHECK-DEADLINE] Failed to release commitment ${c.id} to seller:`, err);
      }
    }
  }

  return NextResponse.json({ resolved });
}
