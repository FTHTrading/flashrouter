# Audit Reports

This directory holds every external audit FlashRouter receives, in chronological order.

## Status

**Pre-launch.** No audits completed yet. Two are planned before mainnet:

| Firm (target) | Scope | Expected | Cost range |
|---|---|---|---|
| Spearbit (or Cantina / Zellic) | Core router + 4 adapters + FeeCollector | Q3 2026 | $150–250K |
| Trail of Bits (or ChainSecurity / OpenZeppelin) | Full repo + formal verification of critical invariants (no-fund-loss, reentrancy, fee-bound) | Q4 2026 | $200–400K |

We will not deploy to mainnet without both audits complete and all critical + high findings remediated.

## What you will find here when audits are done

For each audit:

```
verification/audits/<firm>-<date>/
├── report.pdf                 the firm's signed report
├── report.pdf.sha256          our hash of the file
├── report.pdf.firm-sig.txt    counter-signature link from the firm's own site
├── findings.md                each finding + our response + linked commit
└── retest.md                  if applicable, the firm's retest sign-off
```

Plus a top-level [`findings.md`](./findings.md) tracking every finding across every audit to closure status.

## How to verify a report is real

When a report appears here:

1. The firm publishes the same report at a URL on their own domain (e.g. `https://spearbit.com/reports/flashrouter-2026Q3.pdf`)
2. We commit that URL in `report.pdf.firm-sig.txt`
3. The SHA-256 hash in this repo must match the SHA-256 of the file at the firm's URL
4. If they don't match, treat the report as forged and tell us at `verify@flashrouter.io`

You can verify with:

```bash
sha256sum verification/audits/<firm>-<date>/report.pdf
curl -sL "$(cat verification/audits/<firm>-<date>/report.pdf.firm-sig.txt)" | sha256sum
# The two hashes must be identical
```

## Why two audits, not one

DeFi has learned the hard way that one audit isn't enough. Two firms with different methodologies and different junior reviewers catch different classes of bugs. The cost difference between one and two audits is small compared to the cost of a hack.

## Why this firm list

We picked firms with public reputations in DeFi specifically (not generic Web3 audit shops). Spearbit, Trail of Bits, ChainSecurity, OpenZeppelin, Zellic, and Cantina have all caught critical bugs in production protocols before launch. We will use whichever combination has the best availability and reviewer fit at engagement time, but the bar is firms with published track records of catching real bugs.

## Bug bounty (separate from audits)

After mainnet: Immunefi $1M cap. URL goes here when live.

Before then: `security@flashrouter.io`. See [SECURITY.md](../../SECURITY.md).
