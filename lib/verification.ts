import { getCheckoutSession } from './locus';

// Verify a Locus checkout session has been paid.
//
// Originally this read sessionPaid(bytes32) on a Payment Router contract on
// Base. In practice Locus settles via ERC-4337 (EntryPoint at 0x0000...0032),
// not via that contract — sessionPaid() reverts on every call. The Locus
// session itself is the source of truth: its status flips to 'PAID' once the
// EntryPoint settlement lands and the payerAddress / paymentTxHash are
// populated. We verify via the Locus API instead.
export async function verifyPaymentOnChain(sessionId: string): Promise<boolean> {
  try {
    const resp = await getCheckoutSession(sessionId);
    const data = (resp?.data || resp) as { status?: string } | undefined;
    return data?.status === 'PAID';
  } catch (err) {
    console.error(`[VERIFY] Locus session lookup failed for ${sessionId}:`, err);
    return false;
  }
}

// On-chain event listener is no longer wired — Locus's EntryPoint settlement
// doesn't surface CheckoutPayment events on the Payment Router contract. The
// webhook path is sole detection now. Kept as a no-op so callers don't need
// to change.
export function startPaymentEventListener(
  _onPaymentDetected: (data: {
    sessionId: string;
    from: string;
    to: string;
    amount: string;
  }) => void
) {
  console.log('[LISTENER] Disabled — verification is via Locus API (webhook path).');
}
