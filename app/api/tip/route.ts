import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createCheckoutSession } from '@/lib/locus';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// POST /api/tip — create a checkout session for a creator tip
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { amount, sellerWallet, sellerName, listingId } = (await req.json()) as {
    amount: string;
    sellerWallet: string;
    sellerName?: string;
    listingId: string;
  };

  const tipAmount = parseFloat(amount);
  if (!tipAmount || tipAmount < 0.01 || !sellerWallet || !listingId) {
    return NextResponse.json({ error: 'Invalid tip amount or missing fields' }, { status: 400 });
  }

  const session = await createCheckoutSession({
    amount: String(tipAmount),
    description: `Tip for ${sellerName || 'creator'} via TrustDrop`,
    webhookUrl: `${APP_URL}/api/tip/webhook`,
    successUrl: `${APP_URL}/listing/${listingId}?tipped=true`,
    metadata: {
      type: 'tip',
      listingId,
      sellerWallet,
      buyerId: (user as { id: string }).id,
    },
  });

  return NextResponse.json({
    sessionId: session.id,
    checkoutUrl: session.checkoutUrl,
  });
}
