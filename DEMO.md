# TrustDrop demo runbook

## Pre-flight (do this 30 min before)

- [ ] **Production deploy is up.** `curl https://<your-app>/api/health` → `status: ok`.
- [ ] **Database is seeded** with one ACTIVE listing already created by the test seller, OR you'll create one live (the latter shows the upload flow but eats demo time).
- [ ] **Test seller wallet** has $0 USDC needed (seller is the recipient).
- [ ] **Test buyer wallet** has at least $5 USDC on Base. Verify on BaseScan.
- [ ] **Locus Checkout SDK loads** — open the listing in an incognito tab and confirm the button renders.
- [ ] **Server log tail open** in a side terminal — `railway logs -f` or equivalent. The dual-detection log lines are the punchline.
- [ ] **BaseScan tab queued** — `https://basescan.org/address/0x34184b7bCB4E6519C392467402DB8a853EF57806#events` (Payment Router events).
- [ ] **Browser tabs prepared** in this order:
  1. Landing page `/`
  2. The listing you'll buy `/listing/<id>`
  3. The Improvement Room `/listing/<id>/room`
  4. Buyer dashboard `/dashboard/buyer`
  5. Server log terminal
  6. BaseScan
- [ ] **Improvement Room** has at least one prior message visible so the chat doesn't look empty.
- [ ] **Backup video recorded** in case live demo network fails.

## 90-second script

```
[0–10s]   "Thousands of digital creators sell assets on Discord every day.
           And every day, someone gets scammed. TrustDrop fixes this."

[10–25s]  Seller view: upload a Roblox model on /sell.
          → File encrypted (AES-256). Watermarked preview generated.
          → Listing goes live with a Locus Checkout session attached.

[25–40s]  Buyer enters the Improvement Room.
          → "Can you add armor?"
          → Seller uploads improved version.
          → New preview appears (v2). Seller sets price to $2.00.
          → Old Locus session cancelled, new one created automatically.

[40–55s]  Buyer clicks Buy.
          → Locus Checkout SDK opens embedded.
          → Pays $2.00 USDC from buyer wallet.

[55–70s]  Switch to server log:

          [WEBHOOK]  Payment notification received for session a1b2c3d4...
          [EVENT]    CheckoutPayment detected on block #18294756
          [VERIFY]   sessionPaid(0xa1b2c3d4...) → true
          [RELEASE]  Dual verification passed. Download token generated.

          "Two independent systems caught that payment.
           The webhook from Locus. The event listener reading
           directly from the blockchain. Both confirmed by
           calling sessionPaid() on the Payment Router contract.
           We don't trust anyone — we trust the chain."

          → Buyer's UI shows the download button. Click. File downloads.

[70–80s]  Open BaseScan. Show the CheckoutPayment event:
          session ID, buyer, seller, $2.00 USDC.
          → "On-chain proof. Immutable. Verifiable by anyone."

[80–90s]  Switch to /dashboard/seller — trust score incremented.
          /dashboard/buyer — purchase listed with BaseScan link.

          "The seller can't ship garbage — the buyer verified the preview.
           The buyer can't chargeback — USDC is final.
           TrustDrop. Trust the chain, not the stranger."
```

## Things that have killed past hackathon demos

- **RPC rate-limited mid-demo.** Use a paid Base RPC (Alchemy/QuickNode) or have a backup ready. `https://mainnet.base.org` will throttle.
- **Webhook never fires.** Check Locus dashboard webhook delivery log. The event listener will catch the payment anyway, but the punchline ("two paths") needs both. If the webhook is lagging, narrate that on stage — "the event listener already caught it, the webhook will arrive shortly."
- **Browser blocks `localhost` on Locus Checkout.** Always demo on the deployed origin, not localhost.
- **Volume not mounted.** Encrypted file lookup will fail at download. Verify `/api/health` and try downloading a test purchase BEFORE going on stage.
- **Old session paid in error.** If the Improvement Room price-change demo pays the OLD session ID, the buyer paid the wrong amount. Restart the listing if this happens.

## Recovery if something fails on stage

- File doesn't decrypt: pivot to BaseScan and dashboard — "the on-chain proof is right here, the encrypted file is sitting on the volume waiting." This sells the trust model even without the file.
- Webhook missing: lean into it — "the event listener caught it from the chain directly, that's the whole point of dual detection."
- Whole site is down: switch to backup video.

## Agent buyer demo (optional, 30s extra)

Run from a second terminal:

```bash
curl https://<your-app>/api/agent/discover?maxPrice=5 | jq
# Pick a listing → call its checkout.preflightUrl, payUrl, pollUrlTemplate
# Then GET its downloadUrlTemplate?txId=<txid>
```

Talk track: "Same Checkout session served the human buy. AI agents use the API form. One marketplace, both audiences."
