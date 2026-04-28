import { cookies } from 'next/headers';
import { query } from './db';
import crypto from 'crypto';

const SESSION_COOKIE = 'trustdrop_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-in-prod';

// Simple HMAC-based session token: userId.hmac
function createSessionToken(userId: string): string {
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(userId).digest('hex');
  return `${userId}.${hmac}`;
}

function verifySessionToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [userId, hmac] = parts;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(userId).digest('hex');
  if (hmac !== expected) return null;
  return userId;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionToken) return null;

  const userId = verifySessionToken(sessionToken);
  if (!userId) return null;

  const result = await query(
    'SELECT id, email, display_name, locus_wallet_address, trust_score, created_at FROM users WHERE id = $1',
    [userId]
  );

  return result.rows[0] || null;
}

export async function loginOrRegister(params: {
  walletAddress: string;
  email?: string;
  displayName?: string;
}) {
  // Check if user exists
  let result = await query(
    'SELECT id FROM users WHERE locus_wallet_address = $1',
    [params.walletAddress]
  );

  let userId: string;

  if (result.rows.length > 0) {
    userId = (result.rows[0] as { id: string }).id;
  } else {
    // Register new user
    const insertResult = await query(
      `INSERT INTO users (locus_wallet_address, email, display_name)
       VALUES ($1, $2, $3) RETURNING id`,
      [params.walletAddress, params.email || null, params.displayName || null]
    );
    userId = (insertResult.rows[0] as { id: string }).id;
  }

  // Set session cookie
  const token = createSessionToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  return userId;
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
