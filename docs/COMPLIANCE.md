# FlashRouter — Compliance Posture

This document is the explicit, public statement of what FlashRouter will and will not do. It is the wall between us and the entire "flash USDT" / "flash wallet" scam category that pollutes our search results and our reputation.

## What FlashRouter is

A non-custodial, audited, open-source smart-contract platform that lets developers and trading desks borrow assets from established DeFi lenders (Aave, Balancer, Uniswap, MakerDAO) inside a single atomic transaction, on EVM chains.

A FlashRouter flash loan:

- Has a public on-chain transaction with a verifiable hash
- Settles in one block
- Reverts cleanly if not repaid (no funds at risk for anyone)
- Uses real assets at their canonical contract addresses
- Is visible to anyone with a block explorer

## What FlashRouter is NOT

- Not a token issuer
- Not a wallet
- Not a custodian
- Not an exchange
- Not a fundraising platform
- Not a generator of "test" or "fake" tokens
- Not a producer of unconfirmed-transaction artifacts
- Not a UI mocking tool for crypto balances

## Hard prohibitions (enforced in code and in contract)

We will not facilitate, integrate with, or allow on our platform:

1. **Counterfeit token contracts.** Our adapters whitelist asset addresses against canonical issuer lists ([Tether's official contracts](https://tether.to/en/supported-protocols/), [Circle USDC contracts](https://www.circle.com/en/multi-chain-usdc), MakerDAO DAI, etc.). Any flash loan request for an asset not on the canonical list returns `verified: false` and a warning in the SDK.

2. **Off-chain balance display deception.** Our SDK and API never return data that could be misused to display a balance that does not exist on-chain. Every response includes a transaction hash or simulation receipt that can be independently verified.

3. **Wallet drainers, approval farmers, or signature phishing.** Our contracts request the minimum approval needed for the requested loan, never `MAX_UINT256`. The SDK warns on any unlimited approval.

4. **Anonymous high-volume use.** Free and Pro tiers are usable without KYC. Enterprise and Managed Bot tiers require KYB. Any account exceeding $1M monthly notional is auto-flagged for KYB verification.

5. **Sanctioned addresses.** All API responses are gated by an OFAC-list check (Chainalysis Oracle or [TRM Labs](https://www.trmlabs.com)). Sanctioned addresses cannot use the API or interact with our contracts via meta-transactions we relay.

6. **Integrations with platforms known to facilitate "flash sender" fraud.** Our partnerships team maintains a denylist of known fraud-adjacent platforms, wallets, and exchanges. Listed entities cannot be counterparties in our managed-bot product.

## Active anti-fraud features

- **Asset verifier.** SDK and dashboard surface a green check (canonical issuer) or red warning (unverified) for every asset, on every chain.
- **Phishing detector.** Dashboard scans pasted contract addresses against a known-malicious list and warns before any transaction.
- **Transaction simulator.** Every flash loan runs in a Tenderly fork before broadcast. Simulation results are signed and tamper-evident — they cannot be forged for screenshots.
- **Public dashboard.** Live volume, fee revenue, and per-chain stats published at flashrouter.io/stats. Every dollar we process is publicly counted.
- **Incident transparency.** Any contract incident is disclosed within 24 hours on a public status page. No hush-ups.

## How we handle reports of misuse

Email: `abuse@flashrouter.io` (PGP key published)

Response SLA: 2 business hours initial response, 24 hours triage.

Confirmed misuse triggers:
- Immediate API key revocation
- Wallet address added to internal denylist
- If criminal: report to IC3 (US), Action Fraud (UK), and chain-relevant authorities
- If exchange laundering: report to receiving exchange's compliance team

## How a customer can prove their integrity to us (and to their users)

- Use only assets that show `verified: true` in our SDK responses
- Display our SDK's verification badge in their UI
- Publish their FlashRouter customer ID so users can verify their volume on our public stats page
- Pass KYB and qualify for the "FlashRouter Verified" badge

## Why we publish this

Because flash-loan technology has been hijacked in public conversation by a fraud category that has nothing to do with flash loans. Buyers searching "flash mint" or "flash USDT" find scam kits. Sellers of those kits cite real flash-loan documentation as proof of legitimacy.

This document, our product design, and our brand make the distinction unmistakable.

If you're looking for a way to display fake USDT in a wallet, generate unconfirmed-transaction artifacts, or sell "flash software" to retail buyers — you're in the wrong place. We will not help you, and our product is designed to detect and block your activity.

If you're a legitimate developer, trading desk, or protocol that needs production-grade flash-loan infrastructure — welcome. Read the [Integration Guide](./INTEGRATION.md).
