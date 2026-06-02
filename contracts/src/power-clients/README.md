# Power Client Flash Wallets

**Status:** Ready for immediate deployment (Aave V3 Base). **Live Tonight**

**Power Client Flash Wallets – Live Tonight**

You write the alpha.  
We set up the wallet and close the deal.

- Isolated per-client smart contract (your own receiver)
- Deployed on Base (Aave V3)
- You control the `executeOperation()` logic
- Non-custodial. Sovereign. No shared infrastructure
- We handle deployment, verification, and initial testing

You want to hunt liquidations? Run arb? Do whatever the fuck you want. You write it, we ship the contract.

**Minimum:** $25k upfront or 20% profit share.

**How it works (per user directive 2026-06-02):**
- You (Sovereign / FTH) set up the router + this template + deployment pipeline.
- Power client writes their `executeOperation` logic (the "flash wallet" strategy).
- We deploy one isolated instance per client.
- Client controls the contract (owner = their multisig/EOA).
- Close deals tonight. No waiting for full FlashRouter public testnet.

**Templates & Examples (6+):**
- `FlashWallet.sol` — EXACT user-provided skeleton (owner, FlashLoanExecuted event, requestFlashLoan, withdraw; YOUR STRATEGY GOES HERE placeholder).
- `FlashWallet_BasicArb.sol` — basic arb strategy filled (USDC borrow -> Aerodrome swap WETH -> back, repay, emit profit).
- `FlashWalletTemplate.sol` — base boilerplate (synced to exact).
- `FlashWallet_LiquidationHunter.sol`, `FlashWallet_SimpleArb.sol`, `FlashWallet_CollateralSwap.sol`, `FlashWallet_ExamplePower.sol`, `FlashWallet_AerodromeArb.sol` — concrete examples (liq hunter, arb routes, collateral swap).
- `FlashWallet_AerodromeArb.sol` uses real Aerodrome router 0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43 on Base.
- `FlashWallet_CollateralSwap.sol` — example for collateral swaps/refi.
- `FlashWallet_ExamplePower.sol` — example filled for a power client (with mock strategy).
- `FlashWallet_AerodromeArb.sol` — concrete example using Aerodrome router on Base for USDC-WETH arb (with real swap logic; customize routes).

**Usage for client code:**
```solidity
// In your executeOperation:
uint256 totalOwed = amount + premium;

// 1. Do your thing with `amount` of `asset`
//    e.g. swap, arb across DEXes on Base, liquidate, etc.
//    Must be atomic and leave >= totalOwed

// 2. Approve repayment
IERC20(asset).approve(address(POOL), totalOwed);

emit ...
return true;
```

**Deployment (us - for power clients):**
- Use the sibling `flash-bot/` (Hardhat setup with Aave V3, already configured for Base).
  - cd ../flash-bot
  - npm run compile
  - npm run deploy:power-client FlashWallet_LiquidationHunter   (or FlashWallet_SimpleArb or FlashWalletTemplate)
  - Pass PRIVATE_KEY in .env for the client owner wallet (burner with gas).
- Constructor: Base PoolAddressesProvider `0xe20fCBdBfFC4Dd138cE8b2e6FBb6CB49777ad64D`
- After deploy, client (or us) calls `requestFlashLoan` from owner.
- For full router: integrate the deployed wallet address into FlashRouter when ready.
- Foundry alternative: install via irm https://getfoundry.sh | iex then forge build in flashrouter/contracts.

**To "close" a power client (real working script):**
1. Client provides strategy code / logic for executeOperation (or we use BasicArb template).
2. Use the improved closer: `.\scripts\close-power-client.ps1 -ClientName "FooCapital" -WalletType "FlashWallet_BasicArb" -Network "baseSepolia" [-StrategySnippet "your code here"] [-Notes "..."]`
   - Runs sovereign preflight.
   - Generates customized per-client .sol (with injected alpha if provided).
   - Compiles via Hardhat.
   - Writes detailed HANDOFF.md + updates clients/registry.json (deduped).
3. For safe test: use -Network baseSepolia (no real value at risk).
4. For mainnet: -Deploy (ONLY after explicit human approval per sovereign registry).
5. Verify on Basescan (script prints command).
6. Client transfers ownership immediately to their multisig.
7. Bill per terms ($25k or 20%). XRP PoF evidence and Railgun ZK docs referenced in handoff.

Sovereign preflight required before any client deploy (see sovereign-control-plane).

**Security notes:**
- Isolated per client.
- Non-custodial.
- Test thoroughly on Base Sepolia first.
- We will provide per-client verification + on-chain registry entry.

Contact for onboarding: troptions channels or direct.

This is the immediate path while full multi-provider router + audits complete for Q3 public.
