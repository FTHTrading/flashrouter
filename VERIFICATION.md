# FlashRouter — Verification & Due Diligence

This document answers every legitimacy question a serious buyer, partner, regulator, or journalist would ask. It is the single source of truth. Every claim links to evidence anyone can independently verify.

**Last updated:** 2026-05-31 · **Stage:** Pre-launch (Phase 0)

If you are evaluating FlashRouter and want a question answered that isn't here, email `verify@flashrouter.io` or open an issue tagged `[diligence]`. We respond in writing within 48 hours, and the answer is published here.

---

## Current stage (read this first)

| Milestone | Status | Evidence |
|---|---|---|
| Repository public | ✅ Done | [github.com/FTHTrading/flashrouter](https://github.com/FTHTrading/flashrouter) |
| Smart contracts written | ✅ Done | [contracts/src/](./contracts/src/) — `FlashRouter.sol` + 4 adapters |
| Foundry tests passing | ⏳ In progress | [Actions tab](https://github.com/FTHTrading/flashrouter/actions/workflows/contracts.yml) — see latest run |
| Testnet deployed | ⏳ Planned Q3 2026 | Will appear in [verification/contracts/testnet.json](./verification/contracts/testnet.json) |
| First audit (Spearbit or equivalent) | ⏳ Planned Q3 2026 | Report will land in [verification/audits/](./verification/audits/) |
| Second audit (Trail of Bits or equivalent) | ⏳ Planned Q4 2026 | Same |
| Mainnet deployed | ⏳ Planned Q4 2026 | Will appear in [verification/contracts/mainnet.json](./verification/contracts/mainnet.json) |
| Immunefi bug bounty live ($1M cap) | ⏳ Post-audit | URL published here when live |
| First $1M cumulative notional | ⏳ Post-launch | Auto-tracked by on-chain indexer |
| First $100M cumulative notional | ⏳ Stretch | Same |

**If you are reading this BEFORE the relevant milestone is ✅, treat the corresponding claim as a roadmap commitment, not a current capability.** We will not pretend to have shipped what we haven't shipped.

The landing page at [flashrouter.io](https://flashrouter.io) displays the current stage prominently. Any volume or loan-count numbers there are zero until the indexer counts a real transaction. Pre-launch, the page reads **"Testnet only · Not yet audited"** and the metrics row is hidden.

---

## 1. Contract addresses

### Mainnet (status: NOT YET DEPLOYED)

Authoritative source: [`verification/contracts/mainnet.json`](./verification/contracts/mainnet.json)

This file is empty pre-launch. When mainnet contracts are deployed, every address — `FlashRouter`, `FeeCollector`, and every adapter on every chain — is written here. The file is signed with the deploying multisig and committed in the same atomic PR as the deploy receipts.

### Testnet (status: see testnet.json)

Authoritative source: [`verification/contracts/testnet.json`](./verification/contracts/testnet.json)

Same format, populated after testnet deploys to Sepolia, Base Sepolia, Arbitrum Sepolia, OP Sepolia, BNB testnet, Polygon Amoy.

### Independent verification

When deployed, anyone can verify the addresses are real by:

```bash
# Each chain
cast code 0x<FlashRouter address> --rpc-url <chain RPC>
# Should return non-zero bytecode
cast call 0x<FlashRouter address> "admin()" --rpc-url <chain RPC>
# Should return the multisig address documented in verification/contracts/multisigs.json
```

If a published address returns empty bytecode or wrong admin, the registry is wrong and we want to know — open an issue with `[wrong-address]` and we fix it within hours.

---

## 2. Source verification on block explorers

Every deployed contract is verified on the relevant block explorer (Etherscan, Basescan, Arbiscan, etc.) within 24 hours of deploy. Verification status is tracked in:

[`verification/contracts/verification-status.json`](./verification/contracts/verification-status.json)

For each `(chain, address)` pair we publish:
- Block explorer URL
- "Verified" boolean
- Source code hash (matches `forge build --sizes` output)
- Compiler version + optimizer settings (must match `foundry.toml`)
- Verification timestamp

You can independently verify by:

1. Opening the address on the chain's explorer
2. Confirming the "Contract" tab shows source, not bytecode
3. Comparing the source against [contracts/src/](./contracts/src/) at the tagged release
4. Running `forge verify-contract` yourself if you don't trust our verification

If any contract shows as unverified on its explorer 24 hours after deploy, treat that as a red flag and tell us.

---

## 3. Audit reports

### Pre-launch (where we are)

No audits exist yet. We will not deploy to mainnet without two independent audits.

### Audit plan

| Firm (target) | Scope | Status | Cost | Report URL |
|---|---|---|---|---|
| Spearbit (or equivalent: Cantina, Code4rena Spearbit, Zellic) | Core router + 4 adapters | Quoted | $150–250K | [Will land in verification/audits/](./verification/audits/) |
| Trail of Bits (or equivalent: ChainSecurity, OpenZeppelin) | Full repo + formal verification of critical invariants | Quoted | $200–400K | Same |

When each audit completes:

1. Full report PDF lands in [`verification/audits/`](./verification/audits/) with the firm's signature/letterhead
2. A SHA-256 hash of the PDF is committed alongside it
3. The firm publishes the report on their own site (linked from here as a counter-signature)
4. Every finding is tracked to closure with a linked commit or design rationale
5. A summary "audit response" doc is written explaining how we addressed each finding

Findings tracking: [`verification/audits/findings.md`](./verification/audits/findings.md)

### Bug bounty

After audits, we run a $1M-cap Immunefi bounty. Link goes here when live.

Until then, security reports go to `security@flashrouter.io` (PGP key on the site). See [SECURITY.md](./SECURITY.md).

---

## 4. Real on-chain usage

### Pre-launch claim: zero

There is no production volume yet. Any number displayed anywhere claiming otherwise pre-launch is wrong — please tell us where you saw it so we can fix it.

### Post-launch: independently auditable in real time

When mainnet is live, every dollar of notional we claim is independently auditable:

- **Public indexer** at [stats.flashrouter.io](https://stats.flashrouter.io) (and the same data exposed at `/v1/stats` on the API)
- **The Graph subgraph** per chain — anyone can query without our cooperation
- **Dune dashboard** — community-replicable
- **Etherscan / Basescan / Arbiscan event logs** on the `FlashRouter` contract — `FlashLoanExecuted` event fires on every loan

How to independently verify our claimed volume:

```bash
# Sum every FlashLoanExecuted event's `amount` parameter across all chains
cast logs --address 0x<FlashRouter> \
  --rpc-url <chain RPC> \
  --from-block 0 \
  'FlashLoanExecuted(address,address,uint8,address,uint256,uint256,uint256,uint256)'
```

If our published "total notional" differs from your independent sum by more than 1% (rounding for asset price conversion), we want to know.

### What we will publish

| Metric | Source of truth | Update frequency |
|---|---|---|
| Total notional routed (USD) | Sum of `FlashLoanExecuted.amount` × asset price at event time | Real-time on `/v1/stats` |
| Flash loans executed (count) | Count of `FlashLoanExecuted` events | Real-time |
| Per-chain breakdown | Same, filtered by chain ID | Real-time |
| Per-provider breakdown | Filtered by `provider` indexed param | Real-time |
| Platform fee revenue | Sum of `platformFee` from event | Real-time |
| Active routers (chains live) | Count of chains with deployed FlashRouter at non-zero admin | Daily |

---

## 5. Team transparency

### Operating entity

- **Legal name:** FTH Trading LLC (or successor entity — final structure TBD with counsel)
- **Jurisdiction:** Georgia, USA
- **Founder & operator:** Kevan B. ([GitHub](https://github.com/FTHTrading))
- **Contact:** [hello@flashrouter.io](mailto:hello@flashrouter.io)
- **Security contact:** [security@flashrouter.io](mailto:security@flashrouter.io)
- **Abuse / compliance:** [abuse@flashrouter.io](mailto:abuse@flashrouter.io)

### Why a small team is fine for infrastructure

DeFi infrastructure does not require a large team to be legitimate. What it requires:
- Open-source code (✅ this repo)
- Independent audits (planned, see §3)
- Non-custodial design (✅ verifiable in `contracts/src/FlashRouter.sol`)
- Public on-chain accountability (✅ post-launch)
- Multisig governance (✅ planned, addresses in `verification/contracts/multisigs.json`)
- Public communication & responsiveness (✅ we respond to `verify@` in ≤48h)

A one-person team operating audited, non-custodial infrastructure is more trustworthy than a 50-person team operating custodial, unaudited infrastructure. Read the code, not the headcount.

### Advisors & investors

| Role | Name | Disclosure |
|---|---|---|
| (Reserved for actual advisors as they sign on) | — | — |

We do not list anyone as an advisor or investor without their written permission and an active engagement. If you see a name claimed publicly that isn't here, that claim is wrong.

### Conflicts of interest

We do not currently hold positions in Aave, Balancer, Uniswap, or MakerDAO governance tokens beyond ordinary retail exposure. If that changes, it will be disclosed here.

We are not paid by any of the four upstream providers. FlashRouter is built on top of them as a customer of their public protocols, the same way anyone can be.

---

## 6. What FlashRouter explicitly is NOT

This is the wall between us and the "flash USDT" scam category that pollutes search results. Read the [Compliance Policy](./docs/COMPLIANCE.md) for the full version.

FlashRouter is **not**:
- A token issuer (no FLASH token, no airdrop, no presale)
- A wallet or custodian (we never hold user funds)
- An exchange
- A fundraising platform
- A generator of fake-balance UIs, unconfirmed-transaction tricks, or "flash USDT" software
- An anonymous offshore operation — we publish a legal entity, a real contact, a real founder

If someone is selling something called "FlashRouter" or "Flash Router" that isn't this open-source repository, it is not us. Report it to `abuse@flashrouter.io`.

---

## 7. Verification self-check (anyone can run this)

We publish a script that runs every check in this document and produces a green/yellow/red report. Run it yourself:

```bash
git clone https://github.com/FTHTrading/flashrouter.git
cd flashrouter
bash verification/verify-everything.sh
```

This script:
1. Pulls every claimed address from `verification/contracts/*.json`
2. Calls each one via `cast` against the chain's public RPC and confirms bytecode + admin + adapter list
3. Confirms verification status on each block explorer (via their public APIs)
4. Confirms audit report hashes match the committed PDFs
5. Confirms `FlashLoanExecuted` event count matches our published count (within 1%)
6. Confirms multisig membership matches what we publish
7. Confirms our SDK rejects non-canonical asset addresses

Output goes to stdout AND `verification-report-<date>.json` so you have a timestamped record.

If any check fails, the script exits non-zero and tells you exactly which claim is wrong.

---

## 8. How to ask us anything else

Email `verify@flashrouter.io`. We answer in writing within 48 hours and publish the Q&A in [`verification/faq.md`](./verification/faq.md) so the next person asking gets the answer instantly.

Or open a GitHub issue tagged `[diligence]`. Same SLA, fully public.

---

## 9. Update log

| Date | What changed |
|---|---|
| 2026-05-31 | Initial publication. Pre-launch baseline. |
