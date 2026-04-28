/**
 * scripts/smoke.ts — local smoke test
 *
 * Hits free, non-paid endpoints to verify the app boots and the major routes respond.
 * Does NOT call Locus, Base RPC, or any paid resource.
 *
 * Usage:
 *   APP_URL=http://localhost:3000 npx tsx scripts/smoke.ts
 *   (defaults to http://localhost:3000 if APP_URL is unset)
 */

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

interface Check {
  name: string;
  fn: () => Promise<{ ok: boolean; detail?: string }>;
}

async function jsonGet(path: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${APP_URL}${path}`);
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

const checks: Check[] = [
  {
    name: 'GET /api/health',
    fn: async () => {
      const { status, body } = await jsonGet('/api/health');
      const data = body as { status?: string; checks?: Record<string, { ok: boolean }> };
      if (status !== 200) {
        return {
          ok: false,
          detail: `HTTP ${status} — ${JSON.stringify(data?.checks)}`,
        };
      }
      return { ok: true, detail: data.status };
    },
  },
  {
    name: 'GET /api/listings (browse)',
    fn: async () => {
      const { status, body } = await jsonGet('/api/listings?limit=1');
      const data = body as { listings?: unknown[]; pagination?: { total: number } };
      if (status !== 200) return { ok: false, detail: `HTTP ${status}` };
      if (!Array.isArray(data.listings)) return { ok: false, detail: 'no listings array' };
      return { ok: true, detail: `total=${data.pagination?.total ?? '?'}` };
    },
  },
  {
    name: 'GET /api/agent/discover',
    fn: async () => {
      const { status, body } = await jsonGet('/api/agent/discover?limit=1');
      const data = body as { count?: number; listings?: unknown[]; docs?: unknown };
      if (status !== 200) return { ok: false, detail: `HTTP ${status}` };
      if (!Array.isArray(data.listings)) return { ok: false, detail: 'no listings' };
      if (!data.docs) return { ok: false, detail: 'no docs block' };
      return { ok: true, detail: `count=${data.count}` };
    },
  },
  {
    name: 'GET /api/auth (unauthenticated)',
    fn: async () => {
      const { status, body } = await jsonGet('/api/auth');
      const data = body as { user?: unknown };
      if (status !== 401 || data?.user !== null) {
        return { ok: false, detail: `expected 401 with user:null, got ${status}` };
      }
      return { ok: true, detail: '401 as expected' };
    },
  },
  {
    name: 'GET / (landing page renders)',
    fn: async () => {
      const res = await fetch(APP_URL);
      if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
      const html = await res.text();
      if (!html.includes('TrustDrop')) {
        return { ok: false, detail: 'page did not contain "TrustDrop"' };
      }
      return { ok: true };
    },
  },
];

async function main() {
  console.log(`Smoke testing: ${APP_URL}\n`);
  let pass = 0;
  let fail = 0;

  for (const check of checks) {
    process.stdout.write(`  ${check.name.padEnd(45)} `);
    try {
      const result = await check.fn();
      if (result.ok) {
        console.log(`OK ${result.detail ? `(${result.detail})` : ''}`);
        pass++;
      } else {
        console.log(`FAIL — ${result.detail || 'unknown'}`);
        fail++;
      }
    } catch (err) {
      console.log(`THROWN — ${err instanceof Error ? err.message : err}`);
      fail++;
    }
  }

  console.log(`\n${pass} pass, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
