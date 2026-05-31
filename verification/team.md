# Team & Operating Entity

## Legal entity

**FTH Trading LLC**
Georgia, USA
(Final operating entity structure being formalized with counsel. The successor entity, if different, will be disclosed here within 7 days of any change.)

## People

### Kevan B. — Founder, Operator

- GitHub: [github.com/FTHTrading](https://github.com/FTHTrading)
- Role: Sole technical operator pre-launch. Writes the code, runs the infra, signs the multisigs (until the multisig membership expands).
- Background: Software engineering, browser architecture (Chromium forks), AI orchestration systems, Web3 infrastructure. Based in Alpharetta, Georgia.
- Reachable: hello@flashrouter.io

## Why a small team is fine for DeFi infrastructure

Reasonable concern: "Should I trust infrastructure run by one person?"

The right comparison is not team size — it's:

1. **Is the code open source?** Yes — every line is in [github.com/FTHTrading/flashrouter](https://github.com/FTHTrading/flashrouter).
2. **Is the code audited?** Will be, by two firms, before mainnet.
3. **Is the system non-custodial?** Yes — there are no user deposits to lose. See [`contracts/src/FlashRouter.sol`](../contracts/src/FlashRouter.sol).
4. **Is governance multisig + timelock?** Yes — admin transitions to a multisig before mainnet; upgrades require 7-day timelock.
5. **Is the founder accountable?** Real name, real entity, real contact, real responsiveness on `verify@`.
6. **Is the business model sustainable?** Yes — fee-on-notional + SaaS subscriptions, no token-funded runway.

A small accountable team operating audited, non-custodial, open-source infrastructure with multisig governance is more trustworthy than a large team operating an unaudited custodial product with anonymous leadership. Read the code; the headcount is a distraction.

That said, the team will expand. The natural first hires post-revenue are:

- **Second engineer** (smart-contract focus) — required to break the bus-factor-of-one risk
- **Security engineer / part-time** (audit liaison, bounty triage, monitoring)
- **Operations / GTM** (customer support, BD, content)

These are funded from revenue, not from token presales or speculative fundraising.

## Advisors

None named yet. We do not list anyone as an advisor without their written permission and an active engagement.

## Investors

None at this time. If FlashRouter raises capital, the investors will be listed here with a brief disclosure of the round and terms.

## Conflicts of interest

| Disclosure | Status |
|---|---|
| Hold material positions in AAVE / BAL / UNI / MKR governance tokens? | No, beyond ordinary retail exposure |
| Paid by any of the four upstream providers? | No |
| Operate any competing flash-loan platform? | No |
| Hold any "flash USDT" / fake-token product? | No, and we explicitly refuse to build them — see [docs/COMPLIANCE.md](../docs/COMPLIANCE.md) |

If any of these change, the disclosure is updated here and dated.

## How to verify the human exists

- Email `verify@flashrouter.io` — Kevan replies in writing within 48 hours
- GitHub history at [github.com/FTHTrading](https://github.com/FTHTrading) shows years of activity, not a freshly-created account
- Public repos and commit history are signed
- Available for a video call with serious diligence inquiries (qualified buyers, audit firms, regulatory inquiries)

_Last updated: 2026-05-31_
