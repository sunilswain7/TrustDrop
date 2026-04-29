import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { verifyPaymentOnChain } from '@/lib/verification';
import { getCheckoutSession } from '@/lib/locus';
import { broadcastToRoom } from '@/lib/websocket';

// TODO: set back to 48 before launch
const COMMITMENT_DEADLINE_MINUTES = 5;

// POST /api/room/:id/commit/confirm
// Called from the buyer client after the popup checkout's onSuccess.
// Re-verifies the payment on-chain (the same dual-verification model as final purchase),
// inserts the commitment row, posts a system message, archives nothing.
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
  const { sessionId, txHash } = (await req.json()) as {
    sessionId?: string;
    txHash?: string;
  };

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  // Idempotency: if we've already inserted a row for this session, return it.
  const existing = await query<{ id: string; amount_usdc: string }>(
    `SELECT id, amount_usdc FROM commitments WHERE checkout_session_id = $1`,
    [sessionId]
  );
  if (existing.rows.length) {
    return NextResponse.json({
      commitmentId: existing.rows[0].id,
      amount: existing.rows[0].amount_usdc,
      alreadyConfirmed: true,
    });
  }

  // Pull metadata from the Locus session to know what we're confirming.
  // We don't trust the client to tell us listingId/buyerId/sellerId/amount.
  const sessionResp = await getCheckoutSession(sessionId);
  const sessionData = (sessionResp?.data || sessionResp) as {
    id: string;
    amount?: string;
    status?: string;
    metadata?: Record<string, string>;
  };

  const meta = sessionData.metadata || {};
  if (meta.type !== 'commitment') {
    return NextResponse.json({ error: 'Session is not a commitment' }, { status: 400 });
  }
  if (meta.listingId !== listingId) {
    return NextResponse.json({ error: 'Session listingId mismatch' }, { status: 400 });
  }
  if (meta.buyerId !== userId) {
    return NextResponse.json({ error: 'Session does not belong to you' }, { status: 403 });
  }

  // On-chain re-verify. Don't trust webhook, don't trust client.
  const onChainPaid = await verifyPaymentOnChain(sessionId);
  if (!onChainPaid) {
    return NextResponse.json(
      { error: 'Payment not yet visible on-chain. Try again in a few seconds.' },
      { status: 409 }
    );
  }

  const amount = sessionData.amount as string;
  const sellerId = meta.sellerId;
  const requestedChanges = meta.requestedChanges || '';
  const deadline = new Date(Date.now() + COMMITMENT_DEADLINE_MINUTES * 60 * 1000);

  const insertResult = await query<{ id: string }>(
    `INSERT INTO commitments
     (listing_id, buyer_id, seller_id, amount_usdc, checkout_session_id,
      payment_tx_hash, requested_changes, deadline, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'HELD')
     RETURNING id`,
    [listingId, userId, sellerId, amount, sessionId, txHash || null, requestedChanges, deadline]
  );

  const commitmentId = insertResult.rows[0].id;

  // Post the buyer's actual change request as a normal text message,
  // then a system message that the commitment is locked.
  if (requestedChanges) {
    await query(
      `INSERT INTO room_messages (listing_id, sender_id, sender_role, message_type, content)
       VALUES ($1, $2, 'buyer', 'text', $3)`,
      [listingId, userId, requestedChanges]
    );
  }

  const systemContent = `Commitment locked: $${parseFloat(amount).toFixed(2)} USDC held by platform. Seller has ${COMMITMENT_DEADLINE_MINUTES}m to deliver.`;
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
    commitmentId,
    amount,
    deadline: deadline.toISOString(),
  });
}
