# FlashRouter — Diligence FAQ

Every diligence question we've been asked, plus our written answer. Add yours by emailing `verify@flashrouter.io` or opening a GitHub issue tagged `[diligence]`.

---

### Q: Where are your contract addresses?

**A:** Pre-launch right now — see [VERIFICATION.md §1](../VERIFICATION.md#1-contract-addresses). When contracts deploy, addresses publish to [`verification/contracts/mainnet.json`](./contracts/mainnet.json) in the same atomic commit as the deploy receipt. Anyone can verify the addresses are live by running `cast code <address>` against the chain's public RPC.

### Q: Are the contracts verified on the block explorers?

**A:** They will be within 24 hours of every deploy. Verification status is tracked in [`verification/contracts/verification-status.json`](./contracts/verification-status.json). Source code is in [`contracts/src/`](../contracts/src/), with a tagged release for every deploy. If a deployed address ever shows as unverified on its explorer 24 hours after deploy, that's a bug — please report.

### Q: Can I see the audit reports?

**A:** Not yet — no audits have been completed because the contracts aren't deployed yet. Audit plan: two independent firms (Spearbit-tier and Trail-of-Bits-tier) before any mainnet deploy. Reports land in [`verification/audits/`](./audits/) with SHA-256 hashes that match the same PDFs published on each firm's own website. See [`verification/audits/README.md`](./audits/README.md) for how to verify a report is real.

### Q: The landing page says "$4.2B routed and 1.8M flash loans" — is that real?

**A:** No. Pre-launch placeholder text that should not have been there. We are removing it and replacing with honest stage badges. Post-launch every dollar we claim is auditable in real time from the `FlashLoanExecuted` event logs on the on-chain `FlashRouter` contract. If you saw the old number, here's the apology and the fix is in the commit history at `git log VERIFICATION.md`.

### Q: Who is behind FlashRouter?

**A:** Kevan B., founder, operating as FTH Trading LLC (Georgia, USA). GitHub: [github.com/FTHTrading](https://github.com/FTHTrading). Email: hello@flashrouter.io. Smaller team than a typical "we raised $50M" DeFi project — see [VERIFICATION.md §5](../VERIFICATION.md#5-team-transparency) on why a small team operating audited non-custodial infra is more trustworthy than a large team operating unaudited custodial infra.

### Q: Are you raising money / launching a token?

**A:** Not at this time. No token, no airdrop, no presale, no SAFT, no IDO. If that ever changes, it'll be announced publicly and disclosed here. Anyone soliciting investment in "FlashRouter" via DM is impersonating us — report to `abuse@flashrouter.io`.

### Q: How do I know FlashRouter is different from the "flash USDT" scam category?

**A:** Three independently verifiable signals:

1. **The smart contract enforces a verified-asset whitelist** — counterfeit USDT clones are rejected at the router level. Read [`contracts/src/FlashRouter.sol`](../contracts/src/FlashRouter.sol) line by line and grep for `AssetNotVerified`.
2. **The SDK enforces the same whitelist client-side** — see [`sdk/src/client.ts`](../sdk/src/client.ts) `resolveAsset()`.
3. **Our compliance policy explicitly refuses to help anyone build fake-token / wallet-drainer / flash-USDT software** — [docs/COMPLIANCE.md](../docs/COMPLIANCE.md). Anyone trying to use FlashRouter for that gets denied at the API and contract level.

### Q: What if your code has a bug and people lose money?

**A:** Two layers of defense:

1. **Non-custodial design.** The FlashRouter contract never holds user funds between transactions. If our code has a bug, the worst case is that a transaction reverts — not that anyone's deposit gets stolen, because there are no deposits. Read [`contracts/src/FlashRouter.sol`](../contracts/src/FlashRouter.sol) — there's no `withdraw()` function because there's nothing to withdraw.
2. **Audits + bug bounty + multisig pause.** We do not launch without two audits. We run a $1M Immunefi bounty post-launch. A 5-of-9 multisig can pause new loans in under 15 minutes if an issue is detected. The pause never freezes user funds because, again, we don't hold any.

### Q: Why two audits instead of one?

**A:** Different firms find different bugs. The marginal cost of a second audit is small ($200–400K) versus the cost of a hack (often $10M+ in direct losses plus brand destruction). DeFi has been taught this lesson many times; we are choosing to learn it the cheap way.

### Q: Can I run my own verification?

**A:** Yes. Clone the repo and run:
```bash
bash verification/verify-everything.sh
```
This script independently checks every legitimacy claim against public sources and exits non-zero on any failure. Read the script itself — it's commented and not very long.

### Q: How fast do you respond to security reports?

**A:** Initial acknowledgement: 24 hours. Triage and severity assessment: 3 business days. Fix timeline: depends on severity (critical = hours, high = days). Full policy in [SECURITY.md](../SECURITY.md).

### Q: What jurisdiction are you in? Do you have a lawyer?

**A:** Georgia, USA. Counsel engagement is in progress as the entity formalizes. Once representation is finalized, the firm's name (with permission) will be listed here.

### Q: How do I report misuse of FlashRouter?

**A:** `abuse@flashrouter.io`. We respond within 2 business hours. Confirmed misuse triggers immediate API key revocation, wallet denylist addition, and (if criminal) referral to IC3/FCA/relevant authorities. See the abuse handling section of [docs/COMPLIANCE.md](../docs/COMPLIANCE.md).

---

## How this FAQ is maintained

- Every Q&A is dated and committed to git
- Removing an answer requires a documented reason in the commit message
- The Grok-powered AI operator (see [ops/](../ops/)) reads this file and uses it as the source of truth when answering diligence questions in voice/chat
- If our answer changes (because facts changed), we update the answer and note the change date — we do not silently revise

_Last updated: 2026-05-31_
