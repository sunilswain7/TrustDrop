import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { decryptFile } from '@/lib/encryption';
import { readEncryptedFile } from '@/lib/storage';
import { verifyPaymentOnChain } from '@/lib/verification';
import { handlePaymentConfirmed } from '@/lib/release';

// GET /api/agent/download/[id]?txId=0x...
// Agent downloads decrypted file. txId is the on-chain payment hash returned by Locus agent pay flow.
// Trust path: re-verify sessionPaid() on Base before releasing.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await params;
  const { searchParams } = new URL(req.url);
  const txId = searchParams.get('txId');

  if (!txId) {
    return NextResponse.json(
      { error: 'txId query parameter is required' },
      { status: 400 }
    );
  }

  // 1. Find listing
  const listingResult = await query(
    'SELECT * FROM listings WHERE id = $1',
    [listingId]
  );
  if (!listingResult.rows.length) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }
  const listing = listingResult.rows[0] as Record<string, unknown>;
  const sessionId = listing.checkout_session_id as string | null;
  if (!sessionId) {
    return NextResponse.json(
      { error: 'Listing has no checkout session' },
      { status: 409 }
    );
  }

  // 2. Re-verify on-chain — final source of truth
  const verified = await verifyPaymentOnChain(sessionId);
  if (!verified) {
    return NextResponse.json(
      { error: 'Payment not verified on-chain. Wait for confirmation.' },
      { status: 402 }
    );
  }

  // 3. Find or create the purchase record. Webhook/event-listener may have already
  //    recorded it; if not (race condition), trigger the same release pipeline now.
  let purchase = (
    await query<Record<string, unknown>>(
      `SELECT * FROM purchases
       WHERE listing_id = $1 AND payment_tx_hash = $2 AND on_chain_verified = true
       LIMIT 1`,
      [listingId, txId]
    )
  ).rows[0];

  if (!purchase) {
    // Maybe webhook stored it under session without tx hash, or hasn't fired yet.
    purchase = (
      await query<Record<string, unknown>>(
        `SELECT * FROM purchases
         WHERE checkout_session_id = $1 AND on_chain_verified = true
         LIMIT 1`,
        [sessionId]
      )
    ).rows[0];

    if (!purchase) {
      // Neither path has fired — agent paid faster than our listeners. Release now.
      await handlePaymentConfirmed(sessionId, 'event_listener', {
        txHash: txId,
      });
      purchase = (
        await query<Record<string, unknown>>(
          `SELECT * FROM purchases
           WHERE checkout_session_id = $1 AND on_chain_verified = true
           LIMIT 1`,
          [sessionId]
        )
      ).rows[0];
    }

    if (purchase && !purchase.payment_tx_hash) {
      await query(
        'UPDATE purchases SET payment_tx_hash = $1 WHERE id = $2',
        [txId, purchase.id]
      );
      purchase.payment_tx_hash = txId;
    }
  }

  if (!purchase) {
    return NextResponse.json(
      { error: 'Could not resolve purchase record after on-chain verification' },
      { status: 500 }
    );
  }

  // 4. Decrypt
  const encryptedBlob = await readEncryptedFile(listing.encrypted_file_path as string);
  const decryptedFile = decryptFile(encryptedBlob, listing.encryption_key_enc as string);

  // 5. Mark downloaded (idempotent)
  await query('UPDATE purchases SET downloaded = true WHERE id = $1', [purchase.id]);

  console.log(
    `[AGENT DOWNLOAD] listing=${listingId} txId=${txId} purchase=${purchase.id}`
  );

  return new NextResponse(new Uint8Array(decryptedFile), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${listing.title}.${listing.file_type}"`,
      'Content-Length': decryptedFile.length.toString(),
      'X-Tx-Hash': txId,
      'X-Detection-Source': (purchase.detection_source as string) || 'agent_download',
    },
  });
}
