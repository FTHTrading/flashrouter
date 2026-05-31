# FlashRouter — Go-to-Market Plan

## The pitch (30 seconds)

> Every flash-loan provider has a different interface, a different fee, a different chain footprint. Integrating one is hard. Integrating four is a full-time job. FlashRouter is one API that abstracts all of them, automatically routes to the cheapest, and ships as an SDK, a no-code builder, and a managed bot platform. Audited, non-custodial, open-source SDK. The Twilio of flash loans.

## Three audiences, three motions

### Audience 1 — Solo MEV searchers, arbitrage bot builders

**Where they are:** Twitter/X DeFi crowd, /r/ethdev, EthResearch forum, Paradigm research Slack, Flashbots Discord, EigenPhi leaderboard top 100.

**What they care about:** Latency, gas, provider depth, ease of integration, fast iteration.

**How we reach them:**
- Sponsored issues on awesome-mev, awesome-defi
- Open-source MEV bot templates that use FlashRouter (SEO play, MIT licensed, GitHub stars compound)
- Direct DMs to top searchers on EigenPhi with personalized integration offers
- Bounty: $500 for every first-time integration that does ≥$100K notional in 30 days
- Show HN with technical depth (architecture diagram, code comparison, real cost savings)

**Conversion target:** Free → Pro within 60 days at 8% rate.

### Audience 2 — DeFi protocols (lending, liquidation engines, derivatives)

**Where they are:** Protocol Discords, on-chain via your indexer, governance forums, Devcon, EthCC, ETHDenver hallway tracks.

**What they care about:** Auditing, security posture, uptime SLA, multi-chain support, custom adapter development.

**How we reach them:**
- Conference sponsorship + private dinner format (10 protocols per dinner, you + their lead engineer)
- Custom-built liquidation bot demo using their protocol's data, sent unsolicited
- Audit report sharing as marketing collateral
- Slack-shared channel pilot for 30 days free
- Pricing: $50K–$200K annual contracts, white-glove integration

**Conversion target:** 20 design partners → 10 paid contracts in year one.

### Audience 3 — Trading desks at crypto-native funds

**Where they are:** Crypto Twitter (less so), trading desk Slacks (via warm intros), private Telegrams, conference VIP rooms.

**What they care about:** Discretion, SLA, dedicated infra, KYB partner posture, cost predictability.

**How we reach them:**
- Warm intros only — your existing network in DeFi, browser infra, AI orchestration
- White-label offering: "Your brand, our backend." They get a private FlashRouter instance, you provide ops.
- Enterprise contracts: $100K–$500K annual, multi-year, with profit-share kickers
- Compliance package: SOC 2 Type 1 within 6 months, Type 2 within 18

**Conversion target:** 5 funds → 3 enterprise contracts in year one.

## Content strategy

Publish weekly. Two posts per week minimum.

### Technical posts (Tuesdays)

Audience: developers. Distribution: HN, X, Reddit, dev.to.

Topic queue:
1. "How we built a multi-chain flash-loan router that always picks the cheapest provider"
2. "Why Balancer V2 flash loans are 5 bps cheaper than Aave V3 and when to use which"
3. "The hidden cost of flash loans: gas, MEV, and slippage at scale"
4. "EIP-3156 vs. the real world: what the standard gets wrong"
5. "A liquidation bot in 100 lines of Solidity using FlashRouter"
6. "Refinance Aave → Compound in one transaction, with code"
7. "Self-liquidation: why eating your own liquidation is sometimes smart"
8. "MEV protection for flash-loan strategies: Flashbots, MEV-Blocker, and beyond"
9. "Multi-chain DeFi arbitrage: when the same asset trades for different prices across L2s"
10. "How to read flash-loan transactions on Etherscan — a forensic walkthrough"

### Industry posts (Thursdays)

Audience: protocol teams, funds, ecosystem. Distribution: LinkedIn, X, industry newsletters (The Defiant, Bankless, Milk Road).

Topic queue:
1. "State of the flash-loan market — Q3 2026 report" (data + leaderboard)
2. "The flash-USDT scam ecosystem: how to tell real flash loans from fraud" (this is YOUR moat)
3. "Why every L2 needs a flash-loan layer on day one"
4. "Liquidation as a service: the underwriting case for institutional flash-loan capital"
5. "How DAOs should think about flash-loan governance risk"
6. "Open-sourcing the FlashRouter quoter algorithm"
7. "Annual flash-loan volume report — who's borrowing what, where, and why"

## Distribution partnerships

Top targets:
- **Foundry / Hardhat** — official template integrations ("Flash loans in 5 minutes with FlashRouter")
- **Alchemy / Infura** — RPC partnerships, co-marketing
- **Tenderly** — embedded simulation widget powered by FlashRouter
- **Safe (Gnosis Safe)** — flash-loan transactions as Safe modules
- **Conduit / Caldera / Gelato** — flash-loan layer for new L2/appchains
- **Chainlink / Pyth** — price feeds for the quoter; co-marketing on safety

## Conference calendar

| Event | Date | Investment | Goal |
|---|---|---|---|
| ETHDenver | Feb 2027 | $25K booth + side event | 200 dev signups |
| Devcon | Q3 2027 | $50K sponsor + talk | 50 protocol intros |
| EthCC | Jul 2027 | $30K | 30 fund intros |
| Token2049 | Sep 2027 | $40K | Asia partnerships |
| DappCon | Q2 2027 | $15K | Developer mindshare |

## Pricing experiments

Year one: hold pricing constant to build trust.
Year two: A/B test:
- Lower bps fee (1 bp) vs. raise SaaS ($999/mo)
- Discounts for committed-volume contracts
- Profit-share alternative to bps fee for arb-heavy users

## Metrics that matter

Weekly review:
- New developer signups
- SDK installs (npm download stats)
- Free → Pro conversions
- Notional routed (USD, by chain)
- Platform fees collected (USD)
- Latency (p50, p95, p99 per endpoint)
- Provider uptime per chain
- GitHub stars on monorepo
- Discord active members

Monthly review:
- ARR run rate
- Burn rate
- LTV / CAC by acquisition channel
- Net revenue retention
- Customer NPS

## Risk-adjusted optimism

Most likely outcome: real, useful infra business that does $5–15M ARR in year two, profitable.
Upside case: becomes the default flash-loan layer, $50M+ ARR by year three, acquisition interest from Chainlink, Circle, or a major exchange.
Downside case: a competitor (Aave themselves, Furucombo evolved) launches a better aggregator. We still have the SaaS subscription floor and the managed-bot product.

The business is multiple stable revenue streams against one shared infrastructure investment. That's a good shape.
