<div align="center">

# ✦ TRUSTDROP

### *Trustless digital marketplace.*

**Encrypted · On-chain · Zero chargebacks · Built for Locus Paygentic Hackathon**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Locus](https://img.shields.io/badge/Powered%20by-Locus%20Pay-6366f1?style=flat-square)](https://paywithlocus.com)
[![Supabase](https://img.shields.io/badge/Storage-Supabase-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---
# TrustDrop

> *Trustless digital asset exchange powered by cryptography, escrow, and on-chain payments*.

#### TrustDrop is a secure marketplace for digital creators and buyers, designed to eliminate scams, fake previews, and payment risks.      
#### It leverages **end-to-end encryption, AI-generated previews, and Locus-powered on-chain payments** to ensure both parties act in good faith.
---
## The Problem

I spent months building digital assets in Blender and trying to sell them online. Every platform failed me in the same ways:

| Pain Point | Reality |
|---|---|
| **Buyer ghosts after receiving the file** | Send first, get paid never |
| **Seller delivers garbage** | Pay first, receive nothing useful |
| **Previews are fabricated** | No way to verify the real file matches |
| **Platform fees** | Gumroad takes up to 23%. Etsy demands KYC + bank accounts |
| **No access for new creators** | Unknown sellers can't build trust. Unknown buyers can't prove intent |

Millions of Roblox modders, Minecraft builders, Blender artists, and game-asset developers transact daily with zero protection on either side.

**TrustDrop fixes the hinged payout problem — the moment where trust has to exist but doesn't.**

---

## The Solution

TrustDrop is a trustless digital asset marketplace where **the file only decrypts after payment is verified on-chain**, escrow protects both sides, and zero KYC is required to get paid.

### AES-256 Encrypted Delivery
Every uploaded file is encrypted with AES-256-CBC before it hits storage. The raw file never exists in a downloadable form — not in the browser, not on the server, not in the preview. A decryption token is only generated after a Locus Checkout payment passes on-chain verification via `sessionPaid()` on the Base Payment Router contract. **No payment = no file. No exceptions.**

### AI-Generated Cinematic Previews
Buyers never see the real file. A TrustDrop AI agent generates a cinematic preview of the actual uploaded asset so buyers can verify what they're purchasing without exposing the raw content. Sellers cannot fake previews — the preview is always generated from the file they actually uploaded.

### The Improvement Room
A live WebSocket negotiation space between buyer and seller — no middlemen, no email chains.

- **Buyer commits 20%** of the listing price to formally request changes
- Funds are held in escrow via an independent Locus Checkout session
- Seller has 48 hours to deliver an updated file (re-encrypted, new preview generated, broadcast via WebSocket)
- On delivery: buyer accepts (commitment deducted from final price) or rejects (funds released)
- On deadline expiry: automatic on-chain check triggers refund
- **Both sides have skin in the game. Both sides act in good faith.**

### Zero-Barrier Payouts via Locus
- 100% of payment goes directly to the seller — no platform cut on purchases
- No KYC, no bank account, no credit card required
- Sellers only need a Locus wallet address
- **Email tipping**: Buyers can tip creators who don't have a crypto wallet yet — the recipient receives a Locus claim link via email to collect USDC, with unclaimed funds auto-refunded after 30 days

---

## Architecture
<img width="3764" height="3985" alt="image" src="https://github.com/user-attachments/assets/e1171411-8caa-416b-8390-2667d71e7c81" />


---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, React 19) |
| **Payments** | Locus Checkout SDK (`@withlocus/checkout-react`), Locus Pay API |
| **Storage** | Supabase Storage (client-side direct uploads via signed URLs) |
| **Database** | PostgreSQL (via `pg`) |
| **Security** | AES-256-CBC file encryption, HMAC-SHA256 webhook verification with `crypto.timingSafeEqual` |
| **Real-time** | Native WebSocket server with HTTP polling fallback |
| **On-chain** | Base (USDC), `sessionPaid()` verification on Base Payment Router |
| **Infrastructure** | Docker, Next.js instrumentation hooks |

---

## Payment Flows

TrustDrop runs **three independent Locus Checkout flows**, each with its own webhook route, metadata schema, and payout logic.

### Flow 1 — Product Purchase
Buyer clicks "Buy Now"  
→ createCheckoutSession({ webhookUrl: /api/checkout/webhook, metadata: { type: 'purchase', listingId } })  
→ Locus Checkout (embedded)  
→ webhook fires checkout.session.paid  
→ HMAC-SHA256 signature verified  
→ sessionPaid() on Base confirmed (dual: webhook + polling)  
→ AES-256 decryption key released  
→ One-time download token issued (expires after first use)  
→ sendPayment() to seller wallet via Locus Pay  

---

### Flow 2 — Commitment Escrow (Improvement Room)
Buyer requests changes  
→ createCheckoutSession({ webhookUrl: /api/room/[id]/commit/confirm, metadata: { type: 'commitment' } })  
→ Funds held (platform wallet as escrow)  
→ Seller delivers updated file (re-encrypted, new AES key, WebSocket broadcast)  
→ Buyer accepts → commitment deducted from final purchase price  
→ Buyer rejects → sendPayment() releases escrow to seller  
→ Deadline expires → check-deadline endpoint auto-triggers refund  

---

### Flow 3 — Creator Tip (Wallet + Email)
Buyer selects amount ($1 / $3 / $5 / custom)  
→ createCheckoutSession({ webhookUrl: /api/tip/webhook, metadata: { deliveryMethod: 'wallet'|'email' } })  
→ On 'checkout.session.paid':  
deliveryMethod === 'wallet' → sendPayment() to seller wallet  
deliveryMethod === 'email'  → sendEmailPayment() → seller gets claim link  
unclaimed after 30 days → auto-refund  

---

## Engineering Challenges

### 1. The Invisible 409 — Commitment Fees That Vanished
After embedded checkout succeeded, `/commit/confirm` called `sessionPaid()` on-chain — but the transaction hadn't propagated yet. The endpoint returned 409, the iframe covered the error UI, and the commitment was silently never created. Funds left the buyer's wallet with nothing to show.

**Fix:** Retry logic — up to 5 attempts at 3-second intervals. UI shows `Verifying payment… (attempt 2/6)`. Commitment banner and timer now reliably appear after payment.

---

### 2. Proxy Upload Wall at 5KB
File uploads silently failed above 5KB. No error, no feedback. BWL's reverse proxy was blocking large request bodies.

**Fix:** Re-architected to client-side direct uploads via Supabase signed URLs. Server generates the URL (`/api/upload/signed-url`), client uploads directly to Supabase, server downloads server-to-server for encryption. No proxy limit, any file size.

---

### 3. The Popup That Died Instantly
Commitment checkout in `popup` mode opened a new tab that browser popup blockers killed within milliseconds. Buyers had no chance to pay.

**Fix:** Switched to `mode="embedded"`. Wrapped in `max-h-[350px] overflow-y-auto` to keep the chat scrollable behind the inline checkout.

---

### 4. Silent Locus Pay 400s
Seller payouts silently failed. Root cause: wrong field names — the API uses `to_address` not `to`, `amount` as a number not a string, `memo` not `reason`, and returns `transaction_id` not `txHash`.

**Fix:** Corrected all field names in `lib/locus.ts`. Lesson: always verify with real API calls, never assume field names from documentation alone.

---

### 5. Dev vs Production API Mismatch
Checkout refused to load on day one. `claw_dev_` keys only work against `beta-api.paywithlocus.com` — we were pointing at `api.paywithlocus.com`.

**Fix:** Strict environment variable validation and documented the mismatch to prevent recurrence.

---

## Getting Started

### Prerequisites
- Node.js v18+
- Locus Developer Account (Beta API Keys)
- Supabase Project
- PostgreSQL Database

---

### Environment Variables

```env
LOCUS_API_KEY=your_beta_api_key
LOCUS_BASE_URL=https://beta-api.paywithlocus.com/api
LOCUS_CHECKOUT_URL=https://beta.paywithlocus.com

SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

DATABASE_URL=postgresql://...
ENCRYPTION_KEY=your_32_byte_hex_aes_key
WEBHOOK_SECRET=your_hmac_secret

PLATFORM_WALLET_ADDRESS=your_locus_wallet
```
Dev API keys only work against beta-api.paywithlocus.com. Production keys only work against api.paywithlocus.com. They are not interchangeable.



### Install & Run

```bash
git clone https://github.com/sunilswain7/TrustDrop.git
cd TrustDrop
npm install
npm run migrate   # runs DB migrations
npm run dev
```
---

### Docker
```bash
docker build -t trustdrop .
docker run -p 3000:3000 --env-file .env trustdrop
```
---

## Locus Track Fit

TrustDrop goes beyond a payment button. The entire product architecture is built on Locus:

| Locus Feature | How TrustDrop Uses It |
|---|---|
| LocusCheckout (embedded) | 3 independent flows: purchase, escrow, tip |
| createCheckoutSession | Dynamic sessions with custom webhookUrl and metadata routing |
| cancelCheckoutSession | Price changes in Improvement Room kill the old session, spin a new one |
| getCheckoutSession | Dual verification — webhook + polling for on-chain propagation resilience |
| sendPayment | Seller payouts, escrow releases |
| sendEmailPayment | Email-based tip claims without requiring a crypto wallet |
| Webhook x-locus-signature | HMAC-SHA256 + crypto.timingSafeEqual on every event |
| receiptConfig | Branded buyer receipts on every purchase |
| Agent payment endpoints | Full autonomous agent purchase flow |

---

## License

MIT © 2026 TrustDrop — Built for the Locus Paygentic Hackathon

