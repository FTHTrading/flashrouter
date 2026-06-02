# FlashRouter — System Architecture

## North-star principle

> The customer should never have to know which lender, which chain, or which protocol version. They specify an asset, an amount, and a callback. FlashRouter handles the rest in one atomic transaction.

Every layer of this system serves that principle.

## Five-layer architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  L5  PRODUCTS   SDK  •  Strategy Builder UI  •  Managed Bots    │
├─────────────────────────────────────────────────────────────────┤
│  L4  ACCESS     REST API  •  GraphQL  •  WebSocket events       │
│                 Auth (API keys + EIP-712 signed requests)        │
│                 Metering, rate limits, billing hooks             │
├─────────────────────────────────────────────────────────────────┤
│  L3  ROUTER     Off-chain quoter: pick cheapest lender           │
│                 Simulator: dry-run via Tenderly / Anvil fork     │
│                 Gas oracle + MEV protection (Flashbots, MEV-Blocker) │
├─────────────────────────────────────────────────────────────────┤
│  L2  CONTRACTS  FlashRouter.sol (entry point, per chain)         │
│                 Adapters: AaveV3, BalancerV2, UniswapV3, Maker   │
│                 StrategyExecutor.sol (user callback wrapper)     │
│                 FeeCollector.sol (basis-points fee + treasury)   │
├─────────────────────────────────────────────────────────────────┤
│  L1  CHAINS     Ethereum • Base • Arbitrum • Optimism • BNB     │
│                 • Polygon  (Tron Phase 2 via separate TVM path)  │
└─────────────────────────────────────────────────────────────────┘
```

## L1 — Chains

Six EVM chains at launch. All share one codebase. Each chain has:

- **One** deployed `FlashRouter` contract (proxy + implementation)
- **One** `FeeCollector` contract (chain-local treasury, sweeps to mainnet)
- **N** lender adapters (one per provider available on that chain)

Per-chain provider matrix:

| Chain | Aave V3 | Balancer V2 | Uniswap V3 | Maker | Notes |
|---|---|---|---|---|---|
| Ethereum | ✅ | ✅ | ✅ | ✅ | Full coverage, highest liquidity |
| Base | ✅ | ✅ | ✅ | ❌ | Maker not deployed |
| Arbitrum | ✅ | ✅ | ✅ | ❌ | Heavy DeFi activity |
| Optimism | ✅ | ✅ | ✅ | ❌ | Velodrome alternative for swaps |
| BNB Chain | ✅ | ❌ | ✅ | ❌ | Balancer not on BNB; PancakeSwap V3 as Uniswap V3 alternative |
| Polygon | ✅ | ✅ | ✅ | ❌ | Strong Aave activity |

**Tron (Phase 2):** TVM is EVM-compatible-ish but TRC-20 and gas/energy model differ enough to warrant a separate adapter path. JustLend is the primary flash-loan source. We will build a `tron-adapter` package that mirrors the SDK interface but executes via TronWeb. Customers see the same API; we handle the chain differences.

## L2 — Smart contracts

### `FlashRouter.sol`

Single entry point per chain. Receives a flash-loan request from the user, dispatches to the selected adapter, ensures repayment, takes the platform fee, and forwards control to the user's strategy contract.

```solidity
function flashLoan(
    Provider provider,        // enum: AAVE_V3 | BALANCER_V2 | UNISWAP_V3 | MAKER
    address asset,
    uint256 amount,
    address strategy,         // user's contract implementing IFlashStrategy
    bytes calldata strategyData
) external returns (uint256 profit);
```

Key properties:

- **Non-custodial.** Router never holds funds outside one atomic tx. Any balance left in the router after a tx is sweepable by anyone (incentivized recovery).
- **Reentrancy guarded.** OpenZeppelin's `ReentrancyGuard` on every external entry.
- **Adapter-agnostic.** Router only knows the `IFlashAdapter` interface. Adding a new lender = deploying a new adapter + registering it.
- **Fee in basis points.** Configurable per asset/chain by governance. Default 2 bps (0.02%). Capped at 10 bps in the contract.
- **Pause-able.** Multisig can pause new flash loans during incidents. Cannot freeze user funds (there are none in the router).
- **Upgradeable.** UUPS proxy pattern. Upgrades require 7-day timelock + multisig.

### Adapters

| Adapter | Interface | Notes |
|---|---|---|
| `AaveV3Adapter.sol` | Implements `IFlashLoanSimpleReceiver` and `IFlashLoanReceiver` | Supports both single-asset and multi-asset flash loans |
| `BalancerV2Adapter.sol` | Implements `IFlashLoanRecipient` | 0% fee, all Vault tokens |
| `UniswapV3Adapter.sol` | Implements `IUniswapV3FlashCallback` | Pool-specific; quoter picks the cheapest pool per asset pair |
| `MakerAdapter.sol` | Direct call to `dss-flash` | DAI only, Ethereum only |

### `StrategyExecutor.sol` (optional library)

Helper contract users can extend instead of implementing `IFlashStrategy` from scratch. Provides utilities for common patterns: arb, liquidation, collateral swap, refinance. Reduces user contract from ~150 LOC to ~30 LOC.

### `FeeCollector.sol`

Receives the basis-points platform fee on every successful flash loan. Per-chain treasury. Sweep function transfers to mainnet treasury via canonical bridges (Wormhole for non-EVM, native bridges for L2s).

### Security model

- **Audits.** Two firms before mainnet: Spearbit + Trail of Bits (or equivalents). Estimated $200K–$400K, 8–12 weeks.
- **Bug bounty.** $1M cap on Immunefi from day one.
- **Formal verification.** Halmos / Certora for the core router logic (no asset loss invariant, reentrancy invariant, fee bound invariant).
- **Simulator.** Every customer SDK call dry-runs against a Tenderly fork before signing, surfacing expected gas, profit, and revert cause if any.
- **Killswitch.** A 5-of-9 multisig can pause new loans in <15 minutes. Cannot freeze user funds.

## L3 — Off-chain router

The off-chain router answers one question per request: **"Which provider gives the user the cheapest total cost for this flash loan on this chain right now?"**

Inputs:

- Asset (e.g., USDC on Arbitrum)
- Amount (e.g., 5M USDC)
- Strategy hash (so we can simulate)

Outputs:

- Provider recommendation
- Expected provider fee
- Expected gas cost (in USD)
- Expected total cost
- Simulation receipt (Tenderly sim URL)
- Signed quote (EIP-712, 60-second validity)

Algorithm:

1. Query liquidity at each provider for the asset on the chain
2. Reject providers without enough depth
3. Compute provider fee (Aave 5 bps, Balancer 0, Uniswap pool tier, Maker 0)
4. Estimate gas via `eth_estimateGas` on a Tenderly fork
5. Convert all costs to USD via Chainlink price feeds
6. Pick min(total cost) provider with depth > 1.5× requested amount (safety margin)
7. Sign the quote with FlashRouter's quoter key
8. Return to user, who signs and broadcasts

Stack:

- **Runtime:** Node.js 20 + Fastify (low latency)
- **Chain access:** Branded secure edge RPC gateways providing high-performance node access and edge-level compliance screening:
  - **EVM Chains:** Gateway at `eth.flashrouter.io` utilizing namespaced path routing (e.g. `https://eth.flashrouter.io/v1/:chain`) pointing to optimized RPC nodes (Ethereum, Base, Arbitrum, Optimism, Polygon, and Base Sepolia). Checks payload for sanctioned Tornado Cash and exploit contracts.
  - **Solana Chain:** Gateway at `sol.flashrouter.io` and `helius.flashrouter.io` proxying requests to Helius (`https://mainnet.helius-rpc.com` and `https://devnet.helius-rpc.com/v1/devnet`) while securely masking the client-side Helius API key. Checks payload for mock Solana sanctioned addresses (`2sV8D3678bBfD46D98C156DB`, `7vD9a65d06dcc435a52D5880C6310Bd6E96c156DB`) and exploit wallets, blocking them with a `403 Forbidden` JSON-RPC response.
- **Simulation:** Tenderly API + local Anvil forks for redundancy
- **Cache:** Redis for liquidity snapshots (5-second TTL)
- **Quoter key:** AWS KMS, never touches disk

## L4 — Access layer

The thing customers actually talk to.

### Authentication

Two modes:

1. **API key** (HMAC). Free tier, Pro tier, Enterprise. Issued via dashboard. Rate-limited per tier.
2. **EIP-712 signed request.** Wallet-native, no account needed. Free tier only. Rate-limited per wallet address.

### Endpoints

```
POST /v1/quote            Get a signed flash-loan quote
POST /v1/simulate         Dry-run a strategy without broadcasting
POST /v1/execute          Broadcast a flash loan (we pay gas, customer reimburses)
GET  /v1/loans/:id        Get a specific flash loan's status
GET  /v1/loans            List your flash loans (paginated)
GET  /v1/providers        Live status of all integrated providers
GET  /v1/chains           Live status of all chains
WS   /v1/stream           Real-time event stream (loans, prices, opportunities)
```

### Metering

Every API call is metered. Tracked in Postgres with hot table for current month, cold table for archive.

Metering dimensions:

- Customer ID
- Endpoint
- Chain
- Provider used
- Notional in USD
- Gas spent in USD
- Platform fee collected in USD
- Latency (ms)
- Success/failure

Aggregations roll up nightly into a billing table.

### Billing

Three revenue streams, blended:

1. **Basis-points fee.** 2 bps on notional, taken on-chain via `FeeCollector`. No customer action.
2. **SaaS subscription.** Free / Pro $499/mo / Enterprise custom. Stripe.
3. **API metered overages.** Pro tier includes 100K calls/mo, $0.001 per call over.
4. **Managed bot profit share.** 20% of net profit from FlashRouter-operated bots. Settled on-chain via revenue-split contract.

Billing engine: Stripe + Lago (open-source metering) + custom on-chain accounting.

## L5 — Products

### Product 1 — Developer SDK + API (foundation)

The thing power users want. TypeScript SDK that abstracts everything. Three lines of code to execute a flash loan.

```typescript
import { FlashRouter } from "@flashrouter/sdk";

const router = new FlashRouter({ apiKey: "fr_live_..." });
const loan = await router.flashLoan({
  chain: "arbitrum",
  asset: "USDC",
  amount: "5000000",
  strategy: myArbitrageContract,
});
```

Target: 1,000 developers in year one.

### Product 2 — Strategy Builder (no-code)

Drag-and-drop web app. User assembles a flash-loan strategy from pre-built blocks (borrow, swap, liquidate, repay) and one-click executes.

Like Furucombo, but better UX, more chains, more providers, transparent fees.

Target: 10,000 monthly active users in year one.

### Product 3 — Managed Bot Platform (capital-efficient)

We run the bots. Customers deposit capital into a non-custodial vault or pay subscription for read-only access to strategies. We take 20% of net profit.

Strategies at launch:

- **Cross-DEX arbitrage** (Uniswap ↔ Sushiswap ↔ Curve ↔ Balancer)
- **Liquidations** (Aave, Compound, Maker)
- **Collateral swap automation** (refinance with one click)
- **Self-liquidation rescue** (better than getting liquidated by a bot, you eat your own liquidation)
- **MEV-aware execution** (Flashbots bundles)

Target: $50M AUM in year one, 20% IRR net of fees.

## What we will NOT support

This is the wall between us and the entire "flash USDT" scam category. Codify it in the contracts and in the API.

- ❌ Tokens whose contract address does not match the canonical issuer (e.g., fake USDT clones)
- ❌ Flash loans whose only purpose is to inflate balance displays for off-chain UI deception
- ❌ Integrations with wallets, exchanges, or platforms known to facilitate "flash sender" fraud
- ❌ Any API endpoint that returns un-signed or un-simulated quotes that could be used in screenshots to deceive
- ❌ "Test mode" or "simulation mode" that produces output indistinguishable from real on-chain results
- ❌ Anonymous high-volume accounts. Pro+ tiers require KYB.

Enforcement:

- Adapters whitelist asset contract addresses against the canonical issuer list (Tether, Circle, MakerDAO, etc.)
- API responses always include `verified: true/false` for the asset based on whitelist
- Dashboard surfaces a warning for any non-whitelisted asset
- Enterprise contracts include a clause prohibiting fraud-facilitation use

## Deployment

- **Testnets:** Sepolia, Base Sepolia, Arbitrum Sepolia, OP Sepolia, BNB testnet, Polygon Amoy
- **Mainnet:** After two audits + 90 days on testnet + $1M bug bounty live for 30 days
- **Tooling:** Foundry (forge, anvil, cast) + Hardhat (deploy scripts) + Tenderly (sim)

## Observability

- **Logs:** Structured JSON to Datadog
- **Metrics:** Prometheus + Grafana
- **Traces:** OpenTelemetry → Honeycomb
- **On-chain:** Custom indexer (TheGraph subgraph per chain) + Dune dashboard
- **Status page:** status.flashrouter.io (Statuspage.io or Better Stack)

## Disaster scenarios and responses

| Scenario | Response |
|---|---|
| Single chain RPC outage | Failover to backup RPC; quotes return `unavailable` for that chain |
| Single provider exploit | Killswitch on that adapter; quotes route to other providers |
| FlashRouter contract bug | Multisig pause; users keep their funds (we never custody) |
| Quoter key compromise | Rotate key via timelock; old quotes expire in 60s anyway |
| API outage | Direct contract calls still work via published ABIs; degraded service |
| Treasury compromise | Treasury is multisig + timelock; bridge route only to known addresses |

## Roadmap

### Q3 2026 (launch quarter)
- Audit completion (Spearbit + Trail of Bits)
- Mainnet deploy on Ethereum, Base, Arbitrum
- SDK v1 + API v1 + Dashboard v1
- Landing page + docs site (mirrored decentralized via `ipfs.flashrouter.io`)
- First 10 design-partner customers

### Q4 2026
- BNB, Polygon, Optimism mainnet
- Strategy Builder beta
- First managed bot strategies (arb + liquidations)
- $1M Immunefi bounty live

### Q1 2027
- Tron adapter (Phase 2)
- GraphQL API + WebSocket streams
- $100M cumulative notional milestone
- Series A raise (if capital-constrained)

### Q2 2027
- Morpho + Euler V2 integration
- Managed bots: $50M AUM target
- Enterprise tier with SLA + dedicated support
- White-label offering for trading firms
