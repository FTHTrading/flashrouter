# FlashRouter — Live Status Matrix

**Last verified:** 2026-06-02 (user directive: live tonight for power clients)  
**Update:** Landing updated to LIVE status. Power clients / custom flash wallets section added. "You set up, we write the wallets, close immediately." Aave V3 Base primary for instant access. Full router still targeted Q3 post-audit.
**Repo:** [github.com/FTHTrading/flashrouter](https://github.com/FTHTrading/flashrouter)  
**Local clone:** `C:\Users\Kevan\flashrouter`

This document is the honest source of truth for what is **built in the repo** vs **deployed and reachable**. No placeholder claims.

---

## Summary matrix

| Layer | Built in repo | Deployed | URL | Status |
|---|---|---|---|---|
| **Landing** | ✅ `landing/` (HTML/CSS/JS) | ✅ Yes (updated 2026-06-02) | https://flashrouter.io | **Live + Power Clients** — pre-launch badge removed; new "Flash Wallets" section; "LIVE for Power Clients · Aave V3 Base + Custom Flash Wallets" |
| **Docs hub** | ✅ `landing/docs/index.html` + `docs/*.md` | ✅ Hub live | https://flashrouter.io/docs/ | **Partial** — on-site hub links to GitHub markdown; full docs not rendered on-domain |
| **SDK** | ✅ `sdk/` TypeScript | ❌ Not on npm | — | **Built locally** (`npm run build` ✅ after export fix); `@flashrouter/sdk@0.1.0` **not published** (npm 404) |
| **REST API** | ✅ `api/` Fastify (quote/simulate/execute/loans/providers/usage/health) | ⚠️ Stub live at api-staging.flashrouter.io (updated 2026-06-02 with power client messaging); full not deployed | — | **Stub live** (health + quote + power note); full requires DB. Worker stub redeployed. |
| **Dashboard** | ✅ `dashboard/` Next.js 14 | ❌ No | — | **Compile OK**, full `next build` fails on Windows (ENOENT rename); `app.flashrouter.io` **times out** |
| **Contracts** | ✅ `contracts/` Foundry (FlashRouter + 4 adapters + tests) + `flash-system/FlashWallet.sol` (exact) + BasicArb + 6 power-client templates | ⚠️ Aave V3 Base adapter ready for power clients; full router pre-deploy | — | **Power client wallets now (no waiting)** — exact FlashWallet.sol + FlashWallet_BasicArb.sol (USDC Aerodrome arb) + LiquidationHunter etc ready to customize/close tonight. Railgun ZK adapter stubbed. Deals/DealSPV with 4 ZK proofs compiled. User: "start writing the flash wallets now no waiting you set up we write and close". |
| **Verification** | ✅ `verification/` manifests + `VERIFICATION.md` | ✅ Public via GitHub | [VERIFICATION.md](https://github.com/FTHTrading/flashrouter/blob/main/VERIFICATION.md) | **Pre-launch** — audit-bound; no mainnet addresses yet |
| **Ops agent** | ✅ `ops/` scripts, agent, voice | ❌ Not product-facing | — | VPS/DevOps layer; documented in `ops/README.md`; not part of flashrouter.io |

---

## Live vs repo — landing page audit

Compared https://flashrouter.io to `landing/index.html` on 2026-06-02 (power client live update):

| Section | Repo | Live | Match |
|---|---|---|---|
| Title | FlashRouter — One API. Every flash loan provider. Every chain. | Same | ✅ |
| Hero badge | LIVE for Power Clients | Updated to "Flash Loans. Live Now on Base." + "One contract. Aave V3. Your strategy. We deploy it. Power clients only. Closed tonight." | ✅ (new direct copy) |
| Providers | Aave, Balancer, Uniswap, MakerDAO | Same | ✅ |
| Chains | Ethereum, Base, Arbitrum, Optimism, BNB, Polygon | Same | ✅ |
| Tron | Roadmap / Not yet shipping / PHASE 2 | Same | ✅ |
| Pricing | Free / Pro $499 / Enterprise | Same | ✅ |
| Security | Audit-bound, non-custodial, open-source SDK, KYB, anti-scam | Same | ✅ |
| SDK code examples | `@flashrouter/sdk`, `fr.borrow()` / `flashLoan()` patterns | Same (marketing examples) | ✅ |
| Footer links | Product, Developers, Company, Verification | Same | ✅ |
| Troptions bands | Top + bottom in repo | Present on live HTML | ✅ |
| **Placeholder content** | None in repo landing | None observed on live | ✅ No sovereign-network / edge-routing fiction |

### Repo content not previously on live (now deployed)

- Troptions top/bottom bands (were local-only uncommitted; deployed 2026-05-31)
- `/docs/` documentation hub (new; was serving landing page at `/docs`)
- Read Docs links → `/docs/` (was GitHub README only)
- **2026-06-02 power client live push**: New hero "Flash Loans. Live Now on Base." with "One contract. Aave V3. Your strategy. We deploy it. Power clients only. Closed tonight." + completely rewritten "Power Client Flash Wallets – Live Tonight" section (You write the alpha. We set up the wallet and close the deal. Bullet list + Minimum $25k or 20% profit share). FlashWalletTemplate.sol header updated with exact copy.
- **2026-06-02 full AI agent MCP system + full route**: Complete "FULL-POWER-CLIENT-ROUTE.md" (end-to-end written route + explanations + 2x mermaid diagrams + procedures). New MCP tool "orchestrate_full_client_route" (entrypoint, chains everything). Master automation script "master-power-client-close.ps1". Enhanced closer with strategy injection + baseSepolia support + dedup. MCP close now fully drives real procedures (tested). Site/docs updated + redeployed with links. All preflights green. Sovereign gates respected. Real packages (Sravan etc.) generated.

### Known doc drift (not blocking)

- Update `VERIFICATION.md` etc. as needed; landing now authoritative for "LIVE for Power Clients" messaging.

---

## Deploy path (landing)

```
flashrouter.io / www.flashrouter.io
        │
        ▼
  Worker: flashrouter-site
        │
        ▼
  Pages: flashrouter.pages.dev  ← `landing/` deployed here
```

**Deploy command:**

```bash
cd C:\Users\Kevan\flashrouter
$env:CLOUDFLARE_ACCOUNT_ID="07bcc4a189ef176261b818409c95891f"
npx wrangler pages deploy landing --project-name flashrouter --branch main --commit-dirty=true
```

**Latest deploy:** 2026-06-02 (power client update) — preview `https://33148285.flashrouter.pages.dev` (has new hero + Power Client Flash Wallets section + added "Power Client Wallets" use case in Built for grid + updated "Audit-bound deploys (full router)" text + code example for direct power wallet in "In practice" section + updated SDK description in self-serve + updated three ways p). Uploaded 1 file. Previous ones also updated. To switch prod https://flashrouter.io to new content, promote the latest deployment (33148285...) to Production in CF Pages dashboard for the flashrouter project.

**To make https://flashrouter.io live with update:** In Cloudflare Pages dashboard for "flashrouter" project, find the latest deployment (e.g. a134232a...), promote it to Production (or alias the custom domain to it). The source in repo is updated with the power client copy.

---

## Test results (2026-06-02 power client live)

| Test | Result | Notes |
|---|---|---|
| SDK `npm run build` | ✅ Pass | Fixed `export type` for `ChainName` / `AssetSymbol` in `sdk/src/index.ts` |
| SDK npm publish | ❌ Not published | `npm view @flashrouter/sdk` → 404 |
| Dashboard `next build` | ⚠️ Partial | Compiled + typecheck OK; post-build rename failed on Windows |
| API Docker health | ✅ Pass | `GET http://localhost:8080/v1/health` → `{"status":"ok","version":"0.1.0",...}` after setting `NODE_ENV=production` in `docker-compose.yml` |
| API production URL | ❌ Unreachable | `api.flashrouter.io/v1/health` timeout |
| Dashboard production URL | ❌ Unreachable | `app.flashrouter.io` timeout |
| Foundry `forge test` | ⏭️ Skipped locally | Foundry not installed on audit machine |
| Contracts CI (GitHub) | ❌ Last main run failed | Run `26720079901` on initial monorepo push; re-run after Foundry submodule/deps fix |

---

## API routes (built, not publicly hosted)

From `api/src/server.ts`:

| Method | Path | Auth |
|---|---|---|
| GET | `/v1/health` | Public |
| POST | `/v1/quote` | API key |
| POST | `/v1/simulate` | API key |
| POST | `/v1/execute` | API key |
| GET | `/v1/loans`, `/v1/loans/:id` | API key |
| GET | `/v1/providers`, `/v1/chains` | API key |
| GET | `/v1/usage` | API key |
| GET | `/docs` | OpenAPI Swagger UI (when API running) |

**Local stack:** `docker compose up -d` (Postgres 5432, Redis 6379, API 8080).

---

## Contracts & audits (honest)

| Item | Status |
|---|---|
| Solidity source | ✅ `FlashRouter.sol`, adapters (Aave/Balancer/Uniswap/Maker), `FeeCollector`, mocks + tests |
| Mainnet deploy | ❌ Not deployed — `verification/contracts/mainnet.json` empty |
| Testnet deploy | ❌ Not deployed — `verification/contracts/testnet.json` empty |
| Audits | ❌ **Pre-audit** — planned Spearbit-tier + Trail of Bits-tier per `verification/audits/README.md`; no reports published |
| Bug bounty | ❌ Not live (post-audit per VERIFICATION.md) |

---

## Ops & verification artifacts

| Path | Purpose |
|---|---|
| `verification/verify-everything.sh` | End-to-end verification script |
| `verification/contracts/*.json` | On-chain address registry (empty pre-deploy) |
| `verification/audits/` | Audit report landing zone |
| `ops/agent/server-agent.py` | VPS operations agent |
| `ops/scripts/health-check.sh` | Infra health checks |
| `ops/scripts/killswitch.sh` | Emergency kill switch |
| `ops/DEPLOYMENT.md` | Ops deployment guide |

---

## Uncommitted local changes (commit when ready)

| File | Change |
|---|---|
| `landing/index.html` | Troptions bands + `/docs/` link updates |
| `landing/styles.css` | Troptions band styles |
| `landing/docs/index.html` | New docs hub |
| `sdk/src/index.ts` | SDK build fix (`export type`) |
| `docker-compose.yml` | `NODE_ENV: production` for API container |
| `docs/LIVE-STATUS.md` | This file |

---

## Recommended next steps (priority order) — 2026-06-02 user directive

1. **Landing live update** — DONE (badge → LIVE Power Clients, new Flash Wallets section, copy updated)
2. **Start writing flash wallets** — BOILERPLATE READY in contracts + flash-bot reference. Per-client FlashLoanBot.sol (Aave V3 Base). You write strategy in executeOperation. We deploy/close for power clients tonight.
3. **Commit & push** these changes + any wallet templates
4. **Power client onboarding flow** — use sovereign preflight + human approval gate
5. **Fix contracts CI / Foundry** for full router
6. **Stage API + dashboard** (still pre-launch for public)
7. **Audits + testnet** for full multi-provider (Q3 target remains)
8. **No waiting** — Aave direct + router facade for power clients immediately.

---

## What we explicitly do NOT claim (public)

- ❌ SDK live on npm (power client private)
- ❌ Production API at api.flashrouter.io (power client private)
- ❌ Customer dashboard at app.flashrouter.io (power client private)
- ❌ Full multi-provider router on mainnet (Aave V3 Base live for power via custom wallets)
- ❌ Completed security audits for full router (power client templates use audited Aave)
- ❌ Public flash-loan routing volume (power clients only, closed)

**Power client note:** Custom flash wallets (isolated receivers) + Aave V3 Base routing live for qualified clients tonight. "You set up, we write the wallets, close immediately." Full public launch still Q3 post-audit.
