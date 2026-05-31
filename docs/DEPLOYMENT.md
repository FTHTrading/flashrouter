# FlashRouter — Deployment Runbook

End-to-end deployment for a new chain.

## Prerequisites

- Foundry installed (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- Node 20+
- Multisig address ready (Safe / Squads)
- Treasury address ready
- Quoter signer key in AWS KMS
- Audit complete (mainnet only)

## Phase 1 — Testnet deploy

For each chain (Sepolia, Base Sepolia, Arbitrum Sepolia, etc.):

```bash
cd contracts
cp ../.env.example .env
# Fill in PRIVATE_KEY (burner), ADMIN_ADDRESS (multisig or EOA for testnet),
# TREASURY_ADDRESS, AAVE_V3_POOL (testnet address), BALANCER_VAULT

forge script script/Deploy.s.sol \
    --rpc-url $SEPOLIA_RPC_URL \
    --broadcast \
    --verify
```

Record the deployed addresses in `sdk/src/constants.ts` under the appropriate chain entry.

Whitelist canonical assets:

```bash
cast send $FLASH_ROUTER "setVerifiedAssetsBatch(address[],bool)" \
    "[$USDC,$USDT,$DAI,$WETH]" true \
    --rpc-url $RPC --private-key $ADMIN_PK
```

## Phase 2 — Bug bounty (testnet)

- Post on Immunefi with a $50K cap, testnet-only scope
- Run for 30 days minimum
- Triage every submission, even low-severity
- Track in a public CHANGELOG

## Phase 3 — Mainnet deploy

For each chain:

1. **Pre-flight checks:**
   - Audit reports posted publicly
   - Bug bounty cap raised to $1M on Immunefi
   - Multisig signers confirmed (3-of-5 minimum, 5-of-9 preferred)
   - Status page live
   - On-call rotation set

2. **Deploy:**
   ```bash
   forge script script/Deploy.s.sol \
       --rpc-url $RPC_URL \
       --broadcast \
       --verify \
       --slow \
       --legacy  # if chain doesn't support EIP-1559
   ```

3. **Verify:**
   - Confirm all contracts verified on block explorer
   - Confirm admin is the multisig (not the deployer EOA)
   - Confirm adapter mappings are correct
   - Confirm fee collector points at FeeCollector contract, not EOA

4. **Smoke test:**
   ```bash
   forge script script/SmokeTest.s.sol --rpc-url $RPC_URL --broadcast
   ```

5. **Announce:**
   - Update status page
   - Post in #announcements
   - Tweet from official handle
   - Notify design partners

## Phase 4 — API + dashboard rollout

```bash
# API
cd api
docker build -t flashrouter-api:latest .
docker push ghcr.io/flashrouter/api:latest
# Deploy to your hosting (Fly, Railway, AWS ECS, GCP Cloud Run)

# Run migrations
psql $DATABASE_URL -f migrations/001_initial.sql

# Dashboard
cd ../dashboard
npm install
npm run build
# Deploy via Vercel / Netlify
```

## Phase 5 — Post-deploy monitoring

For 30 days after each mainnet deploy:

- 24/7 on-call rotation
- Watch every tx through your router via Datadog
- Watch every provider's published incident page
- Watch your Immunefi inbox
- Daily Datadog dashboard review

## Rollback / emergency procedures

If you observe anomalous activity:

1. **Pause the router** — `cast send $FLASH_ROUTER "pause()" --rpc-url $RPC --private-key $MULTISIG_PROPOSAL`
   - Requires multisig threshold
   - Existing flash loans complete normally
   - New loans are rejected
2. **Disable affected adapter** — `cast send $FLASH_ROUTER "setAdapter(uint8,address)" PROVIDER_ID 0x0...0`
3. **Post incident** to status page
4. **Investigate** with the audit team
5. **Patch and redeploy** via UUPS upgrade with 7-day timelock

## Chain-specific notes

### Ethereum mainnet
- Highest gas, deepest liquidity, audit required
- Use Flashbots Protect for deploy txs to avoid MEV sandwich

### Base
- Coinbase L2, very low gas
- Aave V3 + Balancer V2 + Uniswap V3 deployed

### Arbitrum
- Heavy MEV activity — ideal customer base for FlashRouter

### Optimism
- Velodrome instead of Uniswap V3 for some pairs; check liquidity

### BNB Chain
- No Balancer V2 → fewer providers, lower routing benefit
- PancakeSwap V3 replaces Uniswap V3 in adapter

### Polygon
- Strong Aave activity — great launch chain
- MakerDAO not deployed

### Tron (Phase 2)
- TVM not EVM-compatible enough for shared contracts
- JustLend = primary flash-loan source
- Separate adapter package, separate deploy pipeline
