# TrustDrop

Trustless marketplace for digital creators. Files encrypted with AES-256 until on-chain USDC payment is verified by `sessionPaid()` on the Base Payment Router contract.

Built for the Locus hackathon.

## What it does

- Sellers upload digital assets (Roblox models, Blender scenes, Minecraft schematics, textures, etc.). Files are encrypted before storage and only a watermarked low-res preview is public.
- Buyers see the preview, can negotiate in an Improvement Room (real-time chat where the seller can iterate on the asset and adjust price), then pay via Locus Checkout.
- Payment is detected through two independent paths — webhook from Locus and a direct `CheckoutPayment` event listener on Base — and both feed into a single release pipeline that re-verifies on-chain via `sessionPaid()` before generating a one-time download token.
- AI agents can discover and purchase listings programmatically through `/api/agent/*` endpoints with the same Locus agent payment flow as humans.

## Stack

- Next.js 16 App Router (Turbopack), React 19, TypeScript
- Tailwind CSS 4
- PostgreSQL (`pg`)
- AES-256-CBC encryption with a master key wrapping per-file keys
- ethers.js v6 for Base mainnet reads
- Sharp for preview generation + watermarking
- `@withlocus/checkout-react` for embedded Checkout
- `ws` for the Improvement Room WebSocket

## Project layout

```
app/
  page.tsx                       Landing + browse with search/category/price filters
  sell/page.tsx                  Upload form
  login/page.tsx                 Wallet connect
  listing/[id]/page.tsx          Listing detail + Locus Checkout
  listing/[id]/room/page.tsx     Improvement Room (chat + version updates)
  dashboard/seller/page.tsx      Seller earnings, listings, recent on-chain sales
  dashboard/buyer/page.tsx       Buyer purchases + BaseScan tx links
  api/
    auth/                        Session cookie login/logout
    listings/                    CRUD + browse
    checkout/create/             Create Locus Checkout session
    checkout/webhook/            PATH 1 — Locus payment webhook (HMAC verified)
    download/[token]/            Authenticated buyer download
    room/[id]/                   Improvement Room messages + seller updates
    agent/discover/              Agent listing discovery
    agent/download/[id]/         Agent download (txId-based)
    health/                      Readiness probe
    previews/                    Static preview serving

lib/
  encryption.ts                  AES-256 encrypt/decrypt + key wrapping
  verification.ts                sessionPaid() + CheckoutPayment event listener
  release.ts                     Shared payment handler (both paths call this)
  start-listener.ts              Boots the blockchain event listener
  locus.ts                       Locus Checkout API client
  preview.ts                     Sharp resize + watermark
  storage.ts                     File I/O (Railway Volume in prod)
  websocket.ts                   ws-based room broadcaster
  auth.ts                        HMAC session cookie
  db.ts                          PostgreSQL pool
  listing-agent.ts               Price suggestion stub (Brave Search not wired)

instrumentation.ts               Next.js boot hook → starts the event listener
migrations/001_init.sql          Schema (users, listings, room_messages, purchases)
```

## Setup

1. Copy env template and fill in values:
   ```bash
   cp .env.example .env.local
   # generate ENCRYPTION_MASTER_KEY:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Install deps and apply schema:
   ```bash
   npm install
   psql "$DATABASE_URL" -f migrations/001_init.sql
   ```

3. Run dev server:
   ```bash
   npm run dev
   ```

4. Verify health: `GET http://localhost:3000/api/health` should return `{ status: "ok" }`.

## Deploy (Railway / BuildWithLocus)

The repo includes `railway.json` with:
- `npm ci && npm run build` build command
- `/api/health` healthcheck path (30s timeout)
- Volume mount at `/data` (matches `DATA_DIR=/data/files`, `PREVIEW_DIR=/data/previews`)

Required service env vars: see `.env.example`. Critical secrets:
- `DATABASE_URL` (Railway Postgres plugin)
- `ENCRYPTION_MASTER_KEY` (generate fresh, save it — losing this loses every encrypted file)
- `LOCUS_API_KEY`, `LOCUS_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL` (the deployed origin — needed for webhook callbacks)

After first deploy, run `migrations/001_init.sql` against the production DB.

## Key flows

**Buy:** Buyer clicks the Locus Checkout button → pays USDC → Locus webhook fires AND Base event listener fires → both call `handlePaymentConfirmed()` → dedup → `sessionPaid()` re-verified on-chain → one-time download token issued → buyer downloads decrypted file.

**Improvement Room:** Buyer + seller chat over WebSocket (with HTTP polling fallback). Seller can upload an improved version (re-encrypted with a new key, new preview generated, system message broadcast) or change the price (old Locus session cancelled, new one created).

**Agent buy:** Agent calls `/api/agent/discover` → gets listings with embedded Locus agent endpoints → calls Locus preflight + pay + poll → calls `/api/agent/download/[id]?txId=…` → server re-verifies `sessionPaid()` → file streamed.

## Honest limitations

- WebSocket is in-process — won't scale past one server. Production needs Redis pub/sub.
- No refunds — USDC on-chain is final.
- No automatic 3D-file thumbnailing — sellers upload their own preview screenshot for non-image files.
- Single file per listing (no bundles) for MVP.
- Listing Agent's Brave Search wiring is a stub returning category-default ranges; live search is gated on cost approval.
