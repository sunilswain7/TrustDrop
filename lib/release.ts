import { verifyPaymentOnChain } from './verification';
import { query } from './db';
import { sendPayment } from './locus';
import crypto from 'crypto';

interface PaymentDetails {
  txHash?: string;
  payerAddress?: string;
  paidAt?: string;
}

export async function handlePaymentConfirmed(
  sessionId: string,
  source: 'webhook' | 'event_listener',
  paymentDetails?: PaymentDetails
): Promise<{ downloadToken: string; expires: Date } | null> {
  console.log(`[${source.toUpperCase()}] Payment detected for session: ${sessionId}`);

  // 1. Check if already processed (prevents double-release)
  const existing = await query(
    'SELECT id FROM purchases WHERE checkout_session_id = $1 AND on_chain_verified = true',
    [sessionId]
  );
  if (existing.rows.length > 0) {
    console.log(`[SKIP] Session ${sessionId} already processed`);
    return null;
  }

  // 2. ALWAYS verify on-chain — regardless of which path triggered this
  const verified = await verifyPaymentOnChain(sessionId);
  console.log(`[VERIFY] sessionPaid(${sessionId}) → ${verified}`);

  if (!verified) {
    console.error(`[REJECT] ${source} fired but sessionPaid() returned false: ${sessionId}`);
    return null;
  }

  // 3. Find the listing
  const listing = await query(
    'SELECT * FROM listings WHERE checkout_session_id = $1',
    [sessionId]
  );
  if (!listing.rows.length) {
    console.error(`[REJECT] No listing found for session: ${sessionId}`);
    return null;
  }

  const listingRow = listing.rows[0] as Record<string, unknown>;

  // 4. Generate one-time download token
  const downloadToken = crypto.randomUUID();
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // 5. Try to resolve buyer user by wallet (anonymous wallets stay null)
  let buyerId: string | null = null;
  if (paymentDetails?.payerAddress) {
    const buyerLookup = await query<{ id: string }>(
      'SELECT id FROM users WHERE LOWER(locus_wallet_address) = LOWER($1) LIMIT 1',
      [paymentDetails.payerAddress]
    );
    if (buyerLookup.rows.length) {
      buyerId = buyerLookup.rows[0].id;
    }
  }

  // 6. Create purchase record
  await query(
    `INSERT INTO purchases
     (listing_id, buyer_id, buyer_wallet_address, checkout_session_id,
      payment_tx_hash, payer_address, paid_at, on_chain_verified,
      download_token, download_token_expires, detection_source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10)`,
    [
      listingRow.id,
      buyerId,
      paymentDetails?.payerAddress || 'unknown',
      sessionId,
      paymentDetails?.txHash || null,
      paymentDetails?.payerAddress || null,
      paymentDetails?.paidAt || new Date().toISOString(),
      downloadToken,
      expires.toISOString(),
      source,
    ]
  );

  // 7. Update listing status
  await query('UPDATE listings SET status = $1, updated_at = NOW() WHERE id = $2', [
    'SOLD',
    listingRow.id,
  ]);

  // 8. Update trust scores
  await query('UPDATE users SET trust_score = trust_score + 1 WHERE id = $1', [
    listingRow.seller_id,
  ]);

  // 9. Outcome A: release any HELD commitments to the seller and mark APPLIED.
  // The buyer's final payment was already discounted by these amounts, so the
  // platform now owes the seller the held funds.
  if (buyerId) {
    const held = await query<{
      id: string;
      amount_usdc: string;
      checkout_session_id: string;
    }>(
      `SELECT id, amount_usdc, checkout_session_id
       FROM commitments
       WHERE listing_id = $1 AND buyer_id = $2 AND status = 'HELD'`,
      [listingRow.id, buyerId]
    );

    const sellerWalletResult = await query<{ locus_wallet_address: string }>(
      `SELECT locus_wallet_address FROM users WHERE id = $1`,
      [listingRow.seller_id]
    );
    const sellerWallet = sellerWalletResult.rows[0]?.locus_wallet_address;

    for (const c of held.rows) {
      try {
        // Re-verify the original commitment payment exists on-chain.
        const commitPaid = await verifyPaymentOnChain(c.checkout_session_id);
        if (!commitPaid || !sellerWallet) {
          console.warn(`[RELEASE] Skipping commitment ${c.id}: not verifiable on-chain`);
          continue;
        }
        const { txHash } = await sendPayment({
          to: sellerWallet,
          amount: c.amount_usdc,
          reason: `Commitment APPLIED — listing ${listingRow.id}`,
        });
        await query(
          `UPDATE commitments
           SET status = 'APPLIED', resolved_at = NOW(),
               payment_tx_hash = COALESCE(payment_tx_hash, $2)
           WHERE id = $1`,
          [c.id, txHash]
        );
        console.log(`[RELEASE] Commitment ${c.id} APPLIED → ${txHash}`);
      } catch (err) {
        console.error(`[RELEASE] Failed to apply commitment ${c.id}:`, err);
      }
    }
  }

  console.log(`[RELEASE] Dual verification passed (${source}). Download token generated.`);
  return { downloadToken, expires };
}
