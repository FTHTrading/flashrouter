# FlashRouter — Business Plan

## One-line thesis

**Every serious DeFi actor needs flash loans. Nobody wants to integrate four providers across six chains themselves. FlashRouter is the Twilio of flash loans.**

## Market

### Total addressable market

- **Aave V3 flash loan volume:** ~$500M–$2B per month across all chains ([DeFiLlama](https://defillama.com))
- **Balancer V2 flash loan volume:** ~$100M–$500M per month
- **MEV / arbitrage market:** $700M+ extracted in 2024 ([EigenPhi](https://eigenphi.io))
- **DeFi liquidation volume:** $1B+ per year across Aave, Compound, Maker
- **Refinance / collateral-swap volume:** ~$200M per month, growing

Conservative TAM: **$30B annual flash-loan notional** across the ecosystem.

### Beachhead segments (year one)

1. **Independent MEV searchers** — already write flash-loan code, hate maintaining 4 integrations. ~2,000 active globally. Target: 100 customers.
2. **DeFi protocols** with liquidation engines — Maker, Aave, Compound forks, new lending protocols. Target: 20 protocols.
3. **Trading desks** at crypto-native funds — Jump, GSR, Wintermute, Cumberland, Amber, Galaxy. Target: 5 enterprise contracts.
4. **L2 / appchain teams** that need to bootstrap flash-loan availability on their chain — pay us to deploy and operate. Target: 3 paid integrations.

### Competition and how we win

| Competitor | What they do | Why we win |
|---|---|---|
| Furucombo | No-code DeFi strategy builder (includes flash loans) | They're retail-focused, single-product. We're infrastructure-first with SDK + API + bots. |
| DeFi Saver | Refinance and self-liquidation UI | Same — they're a product, we're a platform. Multi-chain, multi-provider routing is a moat. |
| Instadapp / DSA | DeFi smart-account layer | They route via their own DSA, not direct lender integrations. Higher gas, more abstraction. We're thinner. |
| Equalizer Finance | Flash-loan-as-a-service token model | Token-gated, single chain, single provider. Out of date. |
| Raw direct integration | Customer integrates Aave + Balancer themselves | 4× the dev time, 4× the maintenance, no routing optimization. Our value is concrete and quantifiable. |

The MOAT is **provider count × chain count × execution quality**. Every new provider and chain we add increases the gap. We become the default the same way Alchemy became the default for RPC.

## Pricing

Three blended revenue streams, designed so customers self-select into the tier that fits.

### Tier 1 — Free (acquisition + community)

- Up to **$100K notional / month** through the SDK
- Up to **10,000 API calls / month**
- Public Discord support only
- Standard 2 bps platform fee on every loan
- Powered-by FlashRouter attribution required

Goal: 5,000 free users in year one. Conversion target: 5% to Pro.

### Tier 2 — Pro ($499 / month)

- Up to **$10M notional / month** through the SDK
- Up to **100,000 API calls / month**
- Email support, 1-business-day SLA
- 2 bps platform fee on every loan
- No attribution required
- Access to Strategy Builder web app
- Webhook event streams
- Tenderly simulation included

Goal: 250 Pro customers in year one. ARR contribution: $1.5M.

### Tier 3 — Enterprise (custom, $50K–$500K / year)

- Unlimited notional
- Unlimited API calls
- 1 bp platform fee (negotiated discount)
- Slack-shared channel support, 4-hour SLA
- Dedicated quoter infrastructure
- SOC 2 + KYB compliance package
- White-label option (your branding on dashboard/docs)
- Custom adapter development (we add your chain or your protocol)

Goal: 10 Enterprise customers in year one. ARR contribution: $1M.

### Tier 4 — Managed Bots (revenue share)

- Customer provides capital, we run the strategy
- We take **20% of net profit** monthly
- Floor: customer always gets their capital back (non-custodial vault)
- Strategies: arb, liquidations, refinance automation, collateral swaps

Goal: $50M AUM in year one. At 20% gross APR × 20% take rate = $2M revenue.

### Tier 5 — Basis-points platform fee (always-on)

- 2 bps on every flash loan notional routed through us, across all tiers
- Collected on-chain by `FeeCollector`
- Goal: $10B notional in year one → $2M revenue

## Year-one financial model (base case)

| Stream | Volume / Count | Unit Economics | Revenue |
|---|---|---|---|
| Basis-points fee | $10B notional | 2 bps | $2.0M |
| Pro subscriptions | 250 customers × 12 months | $499/mo | $1.5M |
| Enterprise contracts | 10 customers | $100K avg | $1.0M |
| Managed bot profit share | $50M AUM × 20% APR | 20% take | $2.0M |
| API metered overages | ~5% of Pro/Ent customers | $5K avg | $0.1M |
| **Total revenue** | | | **$6.6M** |

### Cost structure

| Bucket | Year 1 |
|---|---|
| Engineering (8 FTE) | $2.4M |
| Audits (2 firms + ongoing) | $0.4M |
| Bug bounty payouts (reserved) | $0.2M |
| Infra (RPC, sim, hosting) | $0.3M |
| Compliance + legal | $0.3M |
| Go-to-market (events, content) | $0.4M |
| G&A | $0.5M |
| **Total** | **$4.5M** |

**Year 1 contribution margin:** $2.1M (32%). Path to profitability in year two as engineering load tapers and revenue compounds.

## Go-to-market

### Phase 1 — Stealth + design partners (Q3 2026)

- Recruit 10 design partners from your existing network (MEV searchers, trading desks)
- Free everything in exchange for feedback and case studies
- Goal: 5 published case studies by end of Q3

### Phase 2 — Public launch (Q4 2026)

- Hacker News launch ("Show HN: FlashRouter — one API for every flash loan")
- Twitter/X campaign in DeFi developer circles
- Sponsor ETHGlobal, Devcon, DappCon
- Bounty program for first 100 SDK integrations ($500 each)
- Goal: 1,000 SDK installs by end of Q4

### Phase 3 — Distribution partnerships (Q1 2027)

- Integrate with major DeFi dev platforms (Foundry templates, Hardhat plugin, Alchemy)
- L2 chain partnerships — every new L2 wants flash-loan availability on day one, we provide it
- Liquidation bot template repos on GitHub (SEO play, MIT-licensed, links to docs)
- Goal: 3 distribution deals signed

### Phase 4 — Enterprise + white-label (Q2 2027)

- Direct sales to top-20 crypto trading desks
- White-label flash-loan infra for prop trading firms ("Your brand, our backend")
- SOC 2 Type 1 → Type 2 progression
- Goal: $1M ARR from white-label alone

## Capital plan

### Pre-seed / bootstrap (now)

- $0–$500K from founders or angels
- Cover audit + 3 engineers for 9 months
- Get to mainnet with $1M notional in first 30 days

### Seed (Q4 2026)

- $3–5M at $20–30M post
- Crypto-native funds: Variant, Robot, Archetype, Lattice, 1confirmation, Bain Capital Crypto
- Use of funds: 8 FTE, expanded audit budget, BD, bug bounty reserve

### Series A (Q3 2027 — only if needed)

- $15–25M at $100M+ post
- Larger funds: Paradigm, a16z, Multicoin, Pantera
- Use: international expansion, white-label sales team, formal verification, Tron + non-EVM adapters

**Do not raise if not needed.** This business has strong unit economics from day one. Default-alive is the goal.

## Risk register

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| Smart contract exploit | Medium | Catastrophic | Two audits, formal verification, $1M bounty, non-custodial design (no user funds at risk in router) |
| Provider deprecates flash loans | Low | High | Diversified across 4 providers; loss of one = fee increase, not service loss |
| Regulatory action against flash loans | Low | High | Non-custodial, infrastructure-only, no securities, no fundraising, no token. Same legal posture as Alchemy. |
| Aave or Balancer launches competing aggregator | Medium | High | First-mover; better DX; multi-chain from day one; managed bots as moat |
| Crypto market downturn → flash loan volume drops | High | Medium | Revenue is 60% volume-based, 40% subscription. Subscription floor protects downside. |
| Reputation damage from association with "flash USDT" scams | Medium | High | Explicit anti-fraud posture in branding, compliance, and contracts. See `COMPLIANCE.md`. |
| Key personnel departure | Low | Medium | Equity vesting + open-source codebase + documented architecture |

## Defensibility

1. **Audit + reputation moat.** Once we have two big audits and zero incidents, replicating us means doing the same audits and waiting two years to prove no incidents.
2. **Provider count.** Each new lender = new contract, new tests, new audit. We compound this.
3. **Chain count.** Same compounding effect. Plus we negotiate chain-foundation grants on each L2 launch.
4. **Quoter quality.** Better routing = better economics for customer. Real machine learning play here in year 2.
5. **Customer data.** What strategies work, on what assets, at what scale. This data trains better quoting and powers the managed bot product.
6. **Brand.** "Audited, non-custodial, explicit anti-fraud posture" in a category dominated by scam-adjacent products is a permanent differentiator.

## What makes this work

- You already have the technical depth to ship the contracts and SDK.
- The fraud detection skill set you've been building (recognizing flash-USDT scams, OpenClaw research) directly translates to the compliance moat — you understand the threat landscape better than any competitor.
- DeFi has matured. Flash loans are no longer experimental — they're infrastructure. Infrastructure businesses are durable.
- Distribution: your existing network in browser tech, AI orchestration, and Web3 = direct line to early customers.

## What would kill this

- A bug in a deployed contract that loses customer funds. Solve with audits + non-custodial design + multi-sig pause.
- Underestimating the audit/security spend. Plan $400K up front.
- Trying to launch a token. Don't. It changes the regulatory profile and dilutes focus.
- Launching before security work is done. Don't.

## Sequenced 12-month plan

| Month | Milestone |
|---|---|
| 1–2 | Contracts written, tests at 100% coverage, Sepolia deployed |
| 3–4 | Audit #1 (Spearbit), fix findings, SDK alpha |
| 5 | Audit #2 (Trail of Bits), fix findings, dashboard alpha |
| 6 | Testnet bounty program ($50K) |
| 7 | Mainnet deploy on Ethereum + Base + Arbitrum |
| 8 | Public launch, Show HN, Twitter campaign |
| 9 | BNB + Polygon + Optimism mainnet |
| 10 | Strategy Builder beta |
| 11 | First managed bots live, $10M AUM |
| 12 | Tron adapter beta, Series A close (if raising) |
