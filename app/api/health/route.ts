import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/health — readiness probe for Railway / BuildWithLocus.
// Returns 200 only if DB is reachable. Includes env presence (no values).
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {
    database: { ok: false },
    encryption_key: { ok: !!process.env.ENCRYPTION_MASTER_KEY },
    locus_api_key: { ok: !!process.env.LOCUS_API_KEY },
    base_rpc: { ok: !!process.env.BASE_RPC_URL },
    app_url: { ok: !!process.env.NEXT_PUBLIC_APP_URL },
  };

  try {
    const r = await query<{ now: string }>('SELECT NOW()::text AS now');
    checks.database = { ok: true, detail: r.rows[0].now };
  } catch (err) {
    checks.database = {
      ok: false,
      detail: err instanceof Error ? err.message : 'unknown',
    };
  }

  const ok = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      status: ok ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 }
  );
}
