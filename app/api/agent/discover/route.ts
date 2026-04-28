import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const LOCUS_API_BASE = process.env.LOCUS_API_BASE || 'https://beta-api.paywithlocus.com/api';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// GET /api/agent/discover — JSON listing search for AI agent buyers.
// No auth required. Agents pay via Locus agent endpoints, then call /api/agent/download/[id]?txId=…
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const search = searchParams.get('q');
  const maxPrice = searchParams.get('maxPrice');
  const minTrust = searchParams.get('minTrust');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const offset = parseInt(searchParams.get('offset') || '0');

  let sql = `
    SELECT l.id, l.title, l.description, l.price_usdc, l.category,
           l.file_type, l.file_size_bytes, l.preview_url, l.preview_version,
           l.checkout_session_id, l.checkout_url, l.created_at,
           u.display_name as seller_name,
           u.trust_score as seller_trust,
           u.locus_wallet_address as seller_wallet
    FROM listings l
    JOIN users u ON l.seller_id = u.id
    WHERE l.status = 'ACTIVE'
      AND l.checkout_session_id IS NOT NULL
  `;
  const params: unknown[] = [];
  let idx = 1;

  if (category) {
    sql += ` AND l.category = $${idx}`;
    params.push(category);
    idx++;
  }

  if (search) {
    sql += ` AND (l.title ILIKE $${idx} OR l.description ILIKE $${idx})`;
    params.push(`%${search}%`);
    idx++;
  }

  if (maxPrice) {
    sql += ` AND l.price_usdc <= $${idx}`;
    params.push(parseFloat(maxPrice));
    idx++;
  }

  if (minTrust) {
    sql += ` AND u.trust_score >= $${idx}`;
    params.push(parseInt(minTrust));
    idx++;
  }

  sql += ` ORDER BY u.trust_score DESC, l.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
  params.push(limit, offset);

  const result = await query(sql, params);

  const listings = result.rows.map((row) => {
    const r = row as Record<string, unknown>;
    const sessionId = r.checkout_session_id as string;
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      price: parseFloat(r.price_usdc as string),
      currency: 'USDC',
      category: r.category,
      fileType: r.file_type,
      fileSizeBytes: parseInt(r.file_size_bytes as string),
      previewUrl: `${APP_URL}${r.preview_url as string}`,
      previewVersion: r.preview_version,
      seller: {
        name: r.seller_name,
        wallet: r.seller_wallet,
        trustScore: r.seller_trust,
      },
      checkout: {
        sessionId,
        preflightUrl: `${LOCUS_API_BASE}/checkout/agent/preflight/${sessionId}`,
        payUrl: `${LOCUS_API_BASE}/checkout/agent/pay/${sessionId}`,
        pollUrlTemplate: `${LOCUS_API_BASE}/checkout/agent/payments/{txId}`,
      },
      downloadUrlTemplate: `${APP_URL}/api/agent/download/${r.id}?txId={txId}`,
      createdAt: r.created_at,
    };
  });

  return NextResponse.json({
    count: listings.length,
    listings,
    docs: {
      flow: [
        '1. GET /api/agent/discover to find listings',
        '2. GET checkout.preflightUrl to inspect cost & seller',
        '3. POST checkout.payUrl with { payerEmail } to pay',
        '4. GET checkout.pollUrlTemplate (with txId) until status=CONFIRMED',
        '5. GET downloadUrlTemplate (with txId) to retrieve decrypted file',
      ],
    },
  });
}
