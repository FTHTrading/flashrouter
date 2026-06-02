# FlashRouter — Deploy Status

**Last updated:** 2026-06-02 (power client live push)  
**Hero + Power section updated in landing to exact new copy from user: "Flash Loans. Live Now on Base." and "Power Client Flash Wallets – Live Tonight" with "You write the alpha..." + $25k/20% . Power clients template ready. Deployed to preview.
**User directive:** Update system + site to live tonight. Start writing flash wallets (custom per-client FlashLoanBot receivers on Aave V3 Base) now. No waiting. Set up done — client writes logic, close for power clients.
**Account:** Cloudflare `07bcc4a189ef176261b818409c95891f`  
**Source of truth:** [github.com/FTHTrading/flashrouter](https://github.com/FTHTrading/flashrouter)

---

## What was wrongly deployed before

Prior agent sessions deployed **generic placeholder pages** that did not match the product in the GitHub monorepo:

| Artifact | Problem |
|---|---|
| `flashrouter` Pages project | Served inline HTML titled **"FlashRouter — Sovereign Network Routing"** (network/edge routing fiction, not flash-loan DeFi) |
| `flashrouter-io` Pages project | Served **"High-Performance Edge Routing"** placeholder from `FTH-Dev/projects/flashrouter-io/public/` |
| Worker `flashrouter-site` | Proxied `flashrouter.io` → `https://flashrouter.pages.dev`, so production inherited the wrong Pages content |

None of this reflected `landing/` in the repo (full marketing site: providers, pricing, SDK example, security, pre-launch badge).

---

## What is live now (2026-06-02 power client push)

| Surface | URL | Backend | Status |
|---|---|---|---|
| Production site | https://flashrouter.io | Worker `flashrouter-site` → Pages `flashrouter` | **Live + Power Clients** (200) — updated landing with Flash Wallets section, pre-launch removed |
| Power client flash wallets | (per-client deploys) | Aave V3 Base (via custom FlashLoanBot receivers) | **Ready to close tonight** — boilerplate in contracts + flash-bot reference. You write executeOperation, we deploy for power clients. |
| Full system + ZK + MCP + XRP | landing + docs + api + flash-system/ + deals/ | Source updated + stubs compiled | **Added 2026-06-02** full movie story, exact FlashWallet.sol, BasicArb strategy, Railgun ZK flow+stubs (easiest), 4 ZK DealSPV, best deals, XRP $1.2617 tx full evidence as PoF/treasury, light/dark toggle, MCP 7 tools (GET/POST /mcp live in api + stub), preflights green. |
| Customer dashboard | https://flashrouter-dashboard.pages.dev | Pages `flashrouter-dashboard` | **Live** (200) — static Next.js export (public preview) |
| API staging stub | https://flashrouter-api-stub.kevanbtc.workers.dev | Worker `flashrouter-api-stub` | **Live** (updated 2026-06-02 with power client note) — `GET /v1/health`, `POST /v1/quote`. Source updated in worker-stub/src/index.ts, redeployed. |
| Dashboard custom domain | https://app.flashrouter.io | — | **Not deployed yet** — DNS record missing |
| API custom domain | https://api-staging.flashrouter.io | Worker route configured | **Not deployed yet** — DNS record missing |

### Build status (2026-05-31)

| Component | Build | Deploy |
|---|---|---|
| `api/` (Fastify + tsc) | **Yes** | Full API **not deployed** — requires Postgres + Redis (`docker-compose.yml`) |
| `api/worker-stub/` | N/A (Worker) | **Yes** — health + quote stub on workers.dev |
| `dashboard/` (Next.js static export) | **Yes** | **Yes** — Pages preview URL live |
| `sdk/` | Partial (tsup DTS error) | Not published to npm |

### Full API deploy path (not yet done)

The Fastify API (`api/src/server.ts`) needs **Postgres** and **Redis** at startup (`dbPlugin` throws if DB unreachable). Options:

1. **Fly.io / Railway** — run `docker-compose.yml` stack or `api/Dockerfile` with managed Postgres + Redis
2. **Cloudflare Workers** — only the **stub** is deployed today; full API is not Worker-compatible without Hyperdrive + major refactor

```bash
# Local full stack
make docker-up   # or: docker compose up -d
cd api && npm run start
```

### Dashboard env vars

The dashboard uses **static mock data** only (no `fetch` / `process.env` yet). No env vars required for current deploy.

When wired to the API, set:

- `NEXT_PUBLIC_API_URL` — e.g. `https://api-staging.flashrouter.io` or workers.dev stub URL

### Deploy commands used (2026-05-31)

```bash
# API stub Worker
npx wrangler deploy --cwd api/worker-stub

# Dashboard (after next build with output: export)
cd dashboard && npm run build
npx wrangler pages deploy dashboard/out --project-name flashrouter-dashboard --branch main

# Landing (after footer cross-links)
npx wrangler pages deploy landing --project-name flashrouter --branch main
```

---

## What was live before (landing only)

| Surface | URL | Backend | Content |
|---|---|---|---|
| Production site | https://flashrouter.io | Worker `flashrouter-site` → Pages `flashrouter` | **`landing/` from GitHub** + Troptions top/bottom bands |
| Pages preview | https://flashrouter.pages.dev | Cloudflare Pages `flashrouter` | Same as production |
| Latest deployment | `34960a47` (Pages preview) | Branch `main` | 6 static files (`index.html`, `styles.css`, `main.js`, …) |

### Verification (2026-05-31)

- `curl -sI https://flashrouter.io` → **HTTP 200**, `Content-Type: text/html`
- Title: **FlashRouter — One API. Every flash loan provider. Every chain.**
- Hero copy references **Aave, Balancer, Uniswap, Maker** and **Pre-launch**
- **Powered by Troptions** bands present (top + bottom)

### Deploy command used

```bash
cd C:\Users\Kevan\flashrouter
npx wrangler pages deploy landing --project-name flashrouter --branch main --commit-dirty=true
```

Local clone path: `C:\Users\Kevan\flashrouter` (git remote `https://github.com/FTHTrading/flashrouter.git`, commit `9b7794d` on `main`).

### Local search summary (2026-05-31)

| Path | Verdict |
|---|---|
| `C:\Users\Kevan\flashrouter\` | **Source of truth** — full monorepo (150 files): `landing/`, `contracts/`, `sdk/`, `api/`, `dashboard/`, `docs/`, `verification/`, `ops/` |
| `C:\Users\Kevan\OneDrive - FTH Trading\FTH-Dev\projects\flashrouter-io\` | **Obsolete deploy stub** — was sovereign-networking placeholder; do not use for production |
| `C:\Users\Kevan\OneDrive - FTH Trading\FTH-Dev\` (other) | No separate `flashrouter/` monorepo found |
| `C:\Users\Kevan\Documents\`, `C:\Users\Kevan\Projects\` | No additional flashrouter monorepo |
| Cursor temp workspaces | No alternate Cursor-only build; work lived in `C:\Users\Kevan\flashrouter` |

Local vs GitHub: **in sync on `main`**. Local-only uncommitted changes: Troptions bands in `landing/` + this file.

### Troptions bands

Fleet-standard bands were added to `landing/index.html` and `landing/styles.css` (not in upstream `main` at deploy time). Commit or PR these changes back to GitHub when ready.

---

## Architecture (production path)

```
flashrouter.io / www.flashrouter.io
        │
        ▼
  Worker: flashrouter-site  (reverse proxy)
        │
        ▼
  Pages: flashrouter.pages.dev  ← deploy `landing/` here
```

The `flashrouter-io` Pages project is **not** on the custom domain path; it can be deleted or repurposed after confirming no DNS points to it.

---

## Roadmap — not yet deployed

| Component | Repo path | Suggested host | Notes |
|---|---|---|---|
| Customer dashboard | `dashboard/` (Next.js 14) | `app.flashrouter.io` or `dashboard.flashrouter.io` | Needs `next build` + Pages or Vercel; workspace dep on `@flashrouter/sdk` |
| REST API | `api/` (Fastify) | `api.flashrouter.io` | Worker, Container, or VM; requires Postgres + Redis (`make docker-up`) |
| Docs site | `docs/` (Markdown) | `flashrouter.io/docs` | Could be static export, MkDocs, or GitHub Pages behind path |
| Contracts | `contracts/` (Foundry) | On-chain per chain | Pre-audit; testnet addresses in `verification/contracts/` |
| SDK | `sdk/` | npm `@flashrouter/sdk` | Publish after API stabilizes |

### Recommended order

1. **Docs** — lowest risk; symlink or build `docs/` into `landing/docs/` or separate Pages project  
2. **API** — staging on `api-staging.flashrouter.io` with testnet keys only  
3. **Dashboard** — after API auth + metering endpoints are stable  
4. **Mainnet contracts** — only after Spearbit + Trail of Bits audits per `docs/DEPLOYMENT.md`

---

## Obsolete local project

`C:\Users\Kevan\OneDrive - FTH Trading\FTH-Dev\projects\flashrouter-io\` — placeholder only. **Do not deploy** for production; use `flashrouter/landing/` from the GitHub clone instead.

---

## Quick redeploy

After editing `landing/`:

```bash
cd path/to/flashrouter
npx wrangler pages deploy landing --project-name flashrouter --branch main
```

Allow ~30s for Worker cache; hard-refresh if needed.
