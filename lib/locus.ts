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
}): Promise<CreateCheckoutSessionResponse['data']> {
  const body: CreateCheckoutSessionRequest = {
    amount: params.amount,
    description: params.description,
    webhookUrl: params.webhookUrl,
    successUrl: params.successUrl,
    metadata: params.metadata,
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

export type { CheckoutWebhookPayload };
