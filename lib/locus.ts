import type {
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CheckoutWebhookPayload,
} from '@withlocus/checkout-react';

const LOCUS_API_BASE = process.env.LOCUS_API_BASE || 'https://beta-api.paywithlocus.com/api';

function getApiKey(): string {
  const key = process.env.LOCUS_API_KEY;
  if (!key) throw new Error('LOCUS_API_KEY is not set');
  return key;
}

async function locusRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${LOCUS_API_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(`[LOCUS] ${res.status} ${path}:`, data);
    throw new Error(data.message || `Locus API error: ${res.status}`);
  }

  return data;
}

// Create a Checkout session for a listing
export async function createCheckoutSession(params: {
  amount: string;
  description?: string;
  webhookUrl: string;
  successUrl?: string;
  metadata?: Record<string, string>;
  receiptConfig?: { enabled?: boolean; merchantName?: string };
}): Promise<CreateCheckoutSessionResponse['data']> {
  const body: CreateCheckoutSessionRequest = {
    amount: params.amount,
    description: params.description,
    webhookUrl: params.webhookUrl,
    successUrl: params.successUrl,
    metadata: params.metadata,
    receiptConfig: params.receiptConfig,
    expiresInMinutes: 30,
  };

  const res = await locusRequest('/checkout/sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return res.data;
}

// Cancel a Checkout session (used when seller updates price in Improvement Room)
export async function cancelCheckoutSession(sessionId: string) {
  return locusRequest(`/checkout/sessions/${sessionId}/cancel`, {
    method: 'POST',
  });
}

// Get session details
export async function getCheckoutSession(sessionId: string) {
  return locusRequest(`/checkout/sessions/${sessionId}`);
}

// Agent-facing: preflight check
export async function agentPreflight(sessionId: string) {
  return locusRequest(`/checkout/agent/preflight/${sessionId}`);
}

// Check wallet balance
export async function getBalance() {
  return locusRequest('/pay/balance');
}

// Send USDC from the platform wallet to a recipient.
// Used for commitment fee release/refund.
export async function sendPayment(params: {
  to: string;
  amount: string;
  reason?: string;
}): Promise<{ txHash: string; transactionId: string }> {
  const res = await locusRequest('/pay/send', {
    method: 'POST',
    body: JSON.stringify({
      to_address: params.to,
      amount: parseFloat(params.amount),
      memo: params.reason || 'TrustDrop payout',
    }),
  });
  const data = res?.data || res;
  const transactionId = data?.transaction_id as string | undefined;
  if (!transactionId) {
    throw new Error('pay/send did not return a transaction_id');
  }
  return { txHash: transactionId, transactionId };
}

// Verify webhook signature (HMAC-SHA256)
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}

// Send USDC to an email address via Locus escrow.
// Recipient gets a claim link; unclaimed funds return after expiry.
export async function sendEmailPayment(params: {
  email: string;
  amount: string;
  memo?: string;
  expiresInDays?: number;
}): Promise<{ escrowId: string; expiresAt: string }> {
  const res = await locusRequest('/pay/send-email', {
    method: 'POST',
    body: JSON.stringify({
      email: params.email,
      amount: parseFloat(params.amount),
      memo: params.memo || 'TrustDrop payout',
      ...(params.expiresInDays ? { expires_in_days: params.expiresInDays } : {}),
    }),
  });
  const data = res?.data || res;
  return { escrowId: data.escrow_id, expiresAt: data.expires_at };
}

export type { CheckoutWebhookPayload };
