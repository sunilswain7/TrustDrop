import { NextRequest, NextResponse } from 'next/server';
import { handlePaymentConfirmed } from '@/lib/release';
import { verifyWebhookSignature } from '@/lib/locus';
import type { CheckoutWebhookPayload } from '@withlocus/checkout-react';

// POST /api/checkout/webhook — PATH 1: Locus webhook notification
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  let payload: CheckoutWebhookPayload;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Verify webhook signature if secret is configured
  const webhookSecret = process.env.LOCUS_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = req.headers.get('x-locus-signature') || '';
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error('[WEBHOOK] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  const { event, data } = payload;

  console.log(`[WEBHOOK] Received event: ${event} for session: ${data.sessionId}`);

  // Only process paid events
  if (event !== 'checkout.session.paid') {
    console.log(`[WEBHOOK] Ignoring event: ${event}`);
    return NextResponse.json({ received: true });
  }

  const result = await handlePaymentConfirmed(data.sessionId, 'webhook', {
    txHash: data.paymentTxHash,
    payerAddress: data.payerAddress,
    paidAt: data.paidAt,
  });

  if (!result) {
    // Already processed or failed verification — still ack the webhook
    return NextResponse.json({ received: true });
  }

  console.log(`[WEBHOOK] Payment confirmed. Download token: ${result.downloadToken}`);
  return NextResponse.json({ success: true, downloadToken: result.downloadToken });
}
