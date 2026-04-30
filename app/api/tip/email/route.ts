import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sendEmailPayment } from '@/lib/locus';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { amount, email, sellerName, listingId } = (await req.json()) as {
    amount: string;
    email: string;
    sellerName?: string;
    listingId: string;
  };

  const tipAmount = parseFloat(amount);
  if (!tipAmount || tipAmount < 0.01) {
    return NextResponse.json({ error: 'Invalid tip amount' }, { status: 400 });
  }
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }
  if (!listingId) {
    return NextResponse.json({ error: 'Missing listingId' }, { status: 400 });
  }

  try {
    const { escrowId, expiresAt } = await sendEmailPayment({
      email,
      amount: String(tipAmount),
      memo: `TrustDrop tip for ${sellerName || 'creator'} — listing ${listingId}`,
      expiresInDays: 30,
    });

    return NextResponse.json({ escrowId, expiresAt });
  } catch (err) {
    console.error('[TIP-EMAIL] Failed:', err);
    const message = err instanceof Error ? err.message : 'Failed to send tip via email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
