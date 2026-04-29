import { NextRequest, NextResponse } from 'next/server';
import { sendPayment, verifyWebhookSignature, getCheckoutSession } from '@/lib/locus';

// POST /api/tip/webhook — forward tip payment to seller wallet
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  let payload: { event: string; data: { sessionId: string } };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const webhookSecret = process.env.LOCUS_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = req.headers.get('x-locus-signature') || '';
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  if (payload.event !== 'checkout.session.completed') {
    return NextResponse.json({ ok: true });
  }

  const sessionId = payload.data.sessionId;
  console.log(`[TIP-WEBHOOK] Received tip payment for session ${sessionId}`);

  try {
    const sessionResp = await getCheckoutSession(sessionId);
    const session = (sessionResp?.data || sessionResp) as {
      amount?: string;
      status?: string;
      metadata?: Record<string, string>;
    };

    const meta = session.metadata || {};
    if (meta.type !== 'tip' || !meta.sellerWallet) {
      console.warn('[TIP-WEBHOOK] Not a tip session or missing sellerWallet');
      return NextResponse.json({ ok: true });
    }

    const { txHash } = await sendPayment({
      to: meta.sellerWallet,
      amount: session.amount || '0',
      reason: `TrustDrop tip — listing ${meta.listingId}`,
    });

    console.log(`[TIP-WEBHOOK] Forwarded $${session.amount} tip to ${meta.sellerWallet}, tx: ${txHash}`);
  } catch (err) {
    console.error('[TIP-WEBHOOK] Failed to forward tip:', err);
  }

  return NextResponse.json({ ok: true });
}
