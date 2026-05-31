# FlashRouter

**One API. Every flash-loan provider. Every chain.**

[![Contracts CI](https://github.com/FTHTrading/flashrouter/actions/workflows/contracts.yml/badge.svg)](https://github.com/FTHTrading/flashrouter/actions/workflows/contracts.yml)
[![SDK CI](https://github.com/FTHTrading/flashrouter/actions/workflows/sdk.yml/badge.svg)](https://github.com/FTHTrading/flashrouter/actions/workflows/sdk.yml)
[![API CI](https://github.com/FTHTrading/flashrouter/actions/workflows/api.yml/badge.svg)](https://github.com/FTHTrading/flashrouter/actions/workflows/api.yml)
[![CodeQL](https://github.com/FTHTrading/flashrouter/actions/workflows/codeql.yml/badge.svg)](https://github.com/FTHTrading/flashrouter/actions/workflows/codeql.yml)
[![License](https://img.shields.io/badge/contracts-AGPL--3.0-blue.svg)](./LICENSE)
[![License](https://img.shields.io/badge/everything%20else-MIT-green.svg)](./LICENSE)

FlashRouter is a unified, audited, non-custodial flash-loan infrastructure platform. It abstracts every major flash-loan source — **Aave V3**, **Balancer V2**, **Uniswap V3**, **MakerDAO DSS-Flash** — behind a single interface, automatically routes to the cheapest provider, and ships as a smart contract, TypeScript SDK, REST API, web dashboard, and managed-bot service.

For developers, trading desks, liquidation bots, refinance protocols, MEV searchers, and treasury managers — anyone who needs deep, instant, capital-efficient liquidity inside a single atomic transaction.

---

## Quick start

```bash
npm install @flashrouter/sdk viem
```

```typescript
import { FlashRouter } from "@flashrouter/sdk";

const fr = new FlashRouter({ apiKey: process.env.FLASHROUTER_API_KEY! });

const loan = await fr.flashLoan({
  chain: "arbitrum",
  asset: "USDC",
  amount: "5000000",                       // 5 USDC
  strategy: "0xYourStrategyContract",
  wallet,                                    // viem WalletClient
});

console.log(`Profit: ${loan.profit}, provider: ${loan.providerUsed}`);
console.log(`Tx: ${loan.explorerUrl}`);
```

That's it. FlashRouter resolves the cheapest provider, dry-runs the strategy, signs the quote, broadcasts the transaction, and returns a structured result.

[**Full integration guide →**](./docs/INTEGRATION.md)

---

## Supported lenders

| Provider | Fee | Chains | Notes |
|---|---|---|---|
| Aave V3 | 0.05% | Ethereum · Base · Arbitrum · Optimism · BNB · Polygon | Deepest liquidity, broadest asset support |
| Balancer V2 | 0% | Ethereum · Base · Arbitrum · Optimism · Polygon | Cheapest provider, Vault-backed |
| Uniswap V3 | Pool fee (0.01–1%) | Ethereum · Base · Arbitrum · Optimism · BNB · Polygon | Flash swaps via pool callbacks |
| MakerDAO DSS-Flash | 0% (gas only) | Ethereum | Up to 500M DAI per tx |

Phase 2 (Q1 2027): Morpho · Euler V2 · Compound V3 · JustLend (Tron)

---

## Repository layout

```
flashrouter/
├── contracts/      # Solidity — FlashRouter, adapters, libraries, tests (Foundry)
├── sdk/            # @flashrouter/sdk — TypeScript client, multi-chain
├── api/            # @flashrouter/api — Fastify REST API, metering, billing
├── dashboard/      # @flashrouter/dashboard — Next.js 14 customer dashboard
├── landing/        # Marketing landing page — static HTML/CSS/JS
├── docs/           # Architecture, business plan, integration, deployment, GTM, compliance
└── .github/        # CI, issue templates, security policy
```

---

## Documentation

| Doc | What's in it |
|---|---|
| [ARCHITECTURE](./docs/ARCHITECTURE.md) | Five-layer system design, contract model, security model, observability |
| [INTEGRATION](./docs/INTEGRATION.md) | Ship your first flash loan in 10 minutes |
| [DEPLOYMENT](./docs/DEPLOYMENT.md) | Per-chain runbook from testnet to mainnet |
| [COMPLIANCE](./docs/COMPLIANCE.md) | Explicit anti-fraud posture — what we will and won't support |
| [BUSINESS_PLAN](./docs/BUSINESS_PLAN.md) | Market, pricing, year-1 financial model |
| [GTM](./docs/GTM.md) | Go-to-market plan, content strategy, distribution partnerships |

---

## Local development

Requires: Node 20+, Foundry, Docker.

```bash
# Clone and install
git clone https://github.com/FTHTrading/flashrouter.git
cd flashrouter
make install

# Run contracts tests
make contracts-test

# Bring up local Postgres + Redis + API
make docker-up

# Run dashboard
make dev-dashboard
```

[**Full contributing guide →**](./CONTRIBUTING.md)

---

## Security

FlashRouter is **non-custodial by design** — the router never holds user funds between transactions. All flash loans settle atomically; if the user's strategy fails to repay, the entire transaction reverts.

- **Two audits required** before mainnet: Spearbit + Trail of Bits (in progress)
- **$1M bug bounty** on Immunefi (live after mainnet deploy)
- **Multisig + timelock** on all upgrade paths
- **Asset whitelist** enforced on-chain — counterfeit "USDT" clones rejected at the router level
- **Killswitch** — 5-of-9 multisig can pause new loans in <15 minutes

[**Security policy →**](./SECURITY.md) · [**Compliance posture →**](./docs/COMPLIANCE.md)

---

## Anti-fraud posture

FlashRouter is built explicitly to be the legitimate alternative to the "flash USDT" scam ecosystem. We only support assets at their canonical issuer addresses (Tether, Circle, MakerDAO, etc.). Fake-token clones, wallet drainers, and unconfirmed-transaction tricks are rejected at the SDK and contract level.

If you're looking for software to generate fake USDT balances or display unconfirmed transactions, **you are in the wrong repository**. Read our [Compliance Policy](./docs/COMPLIANCE.md).

---

## License

- **Smart contracts** (`contracts/src/`): AGPL-3.0
- **Everything else** (SDK, API, dashboard, landing, docs, scripts): MIT

See [LICENSE](./LICENSE).

---

## Status

Pre-launch. Pre-audit. Treat all addresses in this repository as testnet-only until audited and bug-bountied. Roadmap and launch dates in [BUSINESS_PLAN](./docs/BUSINESS_PLAN.md).

---

## Links

- Website: [flashrouter.io](https://flashrouter.io)
- Docs: [flashrouter.io/docs](https://flashrouter.io/docs)
- Discord: [discord.gg/flashrouter](https://discord.gg/flashrouter)
- X: [@flashrouter](https://twitter.com/flashrouter)
- Email: hello@flashrouter.io
- Security: security@flashrouter.io
