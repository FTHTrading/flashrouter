# Security Policy

## Reporting a vulnerability

If you believe you have found a security vulnerability in FlashRouter, **please do not open a public issue.** Report it privately by email to:

**security@flashrouter.io**

PGP key: posted at [flashrouter.io/.well-known/pgp-key.asc](https://flashrouter.io/.well-known/pgp-key.asc) (after launch)

### What to include

- A clear description of the issue
- Reproduction steps (PoC code, transaction hashes, contract addresses)
- Affected versions / chains
- Your suggested severity (we will independently assess)
- Whether you would like to be credited publicly

### Response SLA

- **Initial acknowledgement:** within 24 hours
- **Triage and severity assessment:** within 3 business days
- **Fix timeline:** depends on severity (Critical: hours, High: days, Medium: weeks)
- **Public disclosure:** coordinated with reporter; typically 30–90 days after fix

## Bug bounty

Once mainnet contracts are deployed, FlashRouter will operate a bug bounty on [Immunefi](https://immunefi.com) with payouts up to **$1,000,000** for critical smart-contract findings. See the live program for current scope, rules, and payouts.

## Scope

### In scope

- Smart contracts under `contracts/src/` deployed at canonical FlashRouter addresses
- The SDK (`@flashrouter/sdk`) on published npm versions
- The API at `https://api.flashrouter.io`
- The dashboard at `https://dashboard.flashrouter.io`
- The landing site at `https://flashrouter.io`

### Out of scope

- Test code, mock contracts, and example strategies under `contracts/test/` and `contracts/src/strategies/`
- Third-party providers (Aave, Balancer, Uniswap, Maker) — please report to them directly
- DoS via flooding (rate-limited at the API layer by design)
- Theoretical attacks without a working PoC
- Issues in dependencies — report upstream first

## Hall of fame

Security researchers who have responsibly disclosed vulnerabilities will be credited here (with permission).
