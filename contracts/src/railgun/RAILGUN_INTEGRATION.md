# Railgun Shielded Flash Loans — Exact Flow (Easiest ZK Privacy Path)

**Recommendation (per directive):** Start with the **Railgun approach** — easiest, fastest, most available today (1–2 weeks). Good enough privacy for alpha. No custom circuits yet.

**Goal:** Maximum privacy on flash loan strategies. Aave flash loans are 100% public (borrow amount, initiator, tx visible to all). Railgun lets you hide *what happens inside* the strategy and the profit routing.

## Contracts Map (The Pieces)

- **Main FlashWallet** (this repo, e.g. FlashWallet.sol or _BasicArb.sol): The public-ish receiver that calls Aave `flashLoanSimple`. This one must be visible for Aave callback. Strategy logic can be partially hidden if using Railgun for internal steps.
- **ZK Verifier Contract** (later, for Noir/custom): Separate verifier for proofs. For Railgun phase: Railgun's own shielded verifier handles privacy.
- **Shielded Pool / Privacy Layer**: Railgun on Base (or Eth). Deposit USDC/ETH into Railgun shielded pool first (off or on ramp via their UI or SDK). Then perform "private" actions from the shielded balance.
- **Strategy Prover** (off-chain): For pure Railgun: minimal. For later Noir: generate proof that `executeOperation` math was correct (e.g. "I swapped X for Y at rate Z and profited >= premium") without revealing the exact DEX venues, sizes, or counterparties.

## Exact Railgun Version Flow (1–2 Weeks Path)

**Pre-flight (one-time or per session):**
1. Power client deposits collateral or operating capital into Railgun shielded pool on Base (using Railgun app or their SDK `shield` / `deposit`).
   - This creates a private "note" / commitment. Public chain sees deposit to Railgun contract, but not linked to specific user after.
2. Client (or our close team) deploys their isolated `FlashWallet` (Aave receiver) with owner = client multisig or EOA that controls the Railgun notes.
3. (Optional) Pre-fund the FlashWallet with tiny gas or leave it gasless (client pays gas for `requestFlashLoan`).

**Per-flash execution (the private alpha loop):**
1. **Public trigger (visible but minimal):** Client (or agent) calls `FlashWallet.requestFlashLoan(USDC, 1_000_000e6)` on the deployed wallet.
   - This is on-chain visible (who called, which wallet, borrow size). This is unavoidable because Aave itself is public.
   - Inside: `POOL.flashLoanSimple(address(this), asset, amount, "", 0)`

2. **Aave callback (executeOperation — the "magic" window):**
   - Aave sends USDC to the FlashWallet.
   - Now the capital is in the public FlashWallet for ~seconds.
   - **Here is where Railgun privacy kicks in for the *strategy execution***:
     - Instead of doing public DEX swaps (which leak venue, route, size), the strategy can:
       - Transfer the borrowed USDC *into* a Railgun shielded note (private send).
       - From the shielded pool, execute the actual alpha steps via Railgun's private transaction system (their "private" DEX adapters if available, or off-chain coordination + private settlement).
       - Railgun allows "shielded transfers" and some shielded interactions. For complex arb/liq, you may still do the actual swaps on public DEX but route profits back through Railgun shielded to break linkability.
     - At minimum: After strategy, the profit + repay amount is pulled from Railgun private balance back to the FlashWallet (via Railgun "unshield" or direct private-to-public controlled by the note owner).
   - Compute `totalOwed = amount + premium`.
   - `IERC20(asset).approve(address(POOL), totalOwed)`
   - Emit `FlashLoanExecuted(asset, amount, profit)` — profit can be 0 or masked if using private accounting off-chain.
   - `return true`

3. **Repay & settle (atomic):**
   - If anything fails (including Railgun note spend proof), whole tx reverts. No loss except gas.
   - Profit (if any) can stay in FlashWallet for `withdraw()` by owner, or immediately shielded again via Railgun for next use.

4. **Post-flight (off-chain / private):**
   - Strategy Prover (simple script for Railgun phase): record the private note hashes, nullifiers, and "I made X profit" claim. Later tie to ZK proof of the math.
   - Client withdraws or rolls profit into next shielded flash.
   - Monitoring: only the public borrow + repay events visible. Exact trades, counterparties, sizes inside strategy hidden behind Railgun.

## Integration Stubs (for flash-system / flashrouter)

See `flash-system/railgun/` for starter (to be expanded in 1-2wk sprint):

- `RailgunFlashAdapter.sol` (stub): Helper that FlashWallet can call to `shieldBorrowed(amount)` and `unshieldForRepay(minAmount)`.
- Off-chain: `railgun-strategy-prover.ts` (Node) — uses Railgun SDK to generate shielded txs / notes for the strategy part. Signs with client key.
- For full hidden strategy later: replace public Aerodrome swaps with Railgun-private swap intents (when Railgun supports private DEX or via their relayers).

**Gas & Complications (realistic):**
- Railgun shielded ops cost more gas (proofs + larger calldata).
- Proof gen (even simple) can be CPU heavy on client machine — run on beefy box or delegated.
- Aave borrow side remains public: everyone sees "FlashWallet_0xABC borrowed 1M USDC". You hide *only the use-of-funds and profit destination*.
- Debugging: Railgun note management is stateful and error-prone (nullifiers, commitments). Test on Base Sepolia first.
- Few people doing this combo yet — alpha surface is real.

## Next After Railgun (2-6 weeks)
- Move to **Noir + Aztec** (or Barretenberg on Base) for custom private circuits proving the *entire* `executeOperation` math privately.
- Full custom ZK circuit + on-chain verifier (hardest, max private, highest gas).

## Timeline (Aggressive but Realistic 2026)
- Day 1-3: Railgun SDK integration + shielded deposit test + adapter stub.
- Day 4-7: Wire adapter into FlashWallet_BasicArb (shield on borrow, private step stub, unshield before repay).
- Day 8-14: End-to-end test (small size), monitoring, client onboarding docs, first power client close using Railgun-shielded flow.
- Parallel: Start Noir circuit sketch for "private arb verifier" (prove two swaps netted > premium without revealing pools).

## Evidence / Treasury Tie-in
See the canonical `flash-system/XRP_TREASURY_POF_EVIDENCE.md` (and the copy in deals/ if present). Key facts for this Railgun-shielded flash capital PoF:

- XRP = $1.2617
- Tx: 8E26321733467C94A1A4291381AA06EA737ACA0EDBF66F6738606B7779DE4F38
- Payment, ledger #104159942 (index 32), validated ~5/11/2026 11:19:30 AM
- From: ALLHEART rnJrjec2vrTJAAQUTMTjj7U6xdXrk9N4mT
- To: rfbZzM6SGZHbfxrg85vyeKSEMMQCfNXTNw (tag 1001)
- 20 XRP ≈ $29.42 delivered, fee 0.006 XRP
- Bithomp: https://bithomp.com/tx/C6355AC600200000 (full Additional data / Balance changes / Raw data / Tx Metadata)
- Sponsored note on page: Earn 12% on XRP | Play Slots and win 70,000 XRP ❤️

This sample demonstrates controllable treasury movement that can be deposited into Railgun shielded pool on Base to fund private strategy execution inside a power client's FlashWallet (Aave borrow public, use-of-funds + profit routing shielded).

Also referenced in:
- flashrouter/landing/index.html #xrp-evidence (full dump)
- deals/best-deals-2026.md + 5046-mckinzey + weild README
- sovereign registry + contracts yaml
- LIVE/DEPLOY-STATUS.md
- MCP tool `verify_xrp_payment`

Bithomp Pro / Address / Connect / Services / Tokens / AMM / NFT / Blockchain / Developers / Legal / Learn more / Chain Of Blocks Summit text preserved for page fidelity.

---

**Start here. No waiting.** We set up the FlashWallet. You write (or we close with) the alpha, now with Railgun privacy layer mapped.

Light mode / dark mode support on the site (see landing styles + data-theme toggle).
