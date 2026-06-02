# FlashRouter — Integration Guide

Ship your first flash loan in 10 minutes.

## 1. Install

```bash
npm install @flashrouter/sdk viem
```

## 2. Get an API key

Sign up at [flashrouter.io/dashboard](https://flashrouter.io/dashboard) or pull UI packages from the decentralized IPFS gateway `ipfs.flashrouter.io`. Free tier gives you $100K notional/month, no credit card.

```bash
export FLASHROUTER_API_KEY="fr_live_abc123..."
```

## 3. Write your strategy contract

Your strategy implements `IFlashStrategy`. It receives the borrowed funds in `onFlashLoan`, does whatever it does, and approves the FlashRouter to pull back `amount + totalFee`.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IFlashStrategy} from "@flashrouter/contracts/interfaces/IFlashStrategy.sol";

interface IERC20 {
    function approve(address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
}

contract MyStrategy is IFlashStrategy {
    address public immutable router;
    address public immutable owner;

    constructor(address _router) {
        router = _router;
        owner = msg.sender;
    }

    function onFlashLoan(
        address asset,
        uint256 amount,
        uint256 totalFee,
        address initiator,
        bytes calldata data
    ) external override returns (bool) {
        require(msg.sender == router, "not router");

        // ── YOUR LOGIC HERE ──
        // e.g. swap, arb, liquidate, refinance
        // Borrowed `amount` of `asset` is in this contract.

        // Approve router to pull repayment
        IERC20(asset).approve(router, amount + totalFee);

        // Send profit to owner
        // ...

        return true;
    }
}
```

See [`contracts/src/strategies/ArbitrageStrategyExample.sol`](../contracts/src/strategies/ArbitrageStrategyExample.sol) for a complete arbitrage implementation.

## 4. Deploy your strategy

```bash
cd contracts
forge script script/DeployStrategy.s.sol --rpc-url $ARB_RPC_URL --broadcast --verify
```

## 5. Execute a flash loan from your app

```typescript
import { FlashRouter } from "@flashrouter/sdk";
import { createWalletClient, http, parseAbiParameters, encodeAbiParameters } from "viem";
import { arbitrum } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const wallet = createWalletClient({
  account: privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`),
  chain: arbitrum,
  transport: http(process.env.ARB_RPC_URL || "https://eth.flashrouter.io"),
});

const fr = new FlashRouter({ apiKey: process.env.FLASHROUTER_API_KEY! });

// Encode strategy-specific data your contract expects
const strategyData = encodeAbiParameters(
  parseAbiParameters("address target, uint24 feeA, uint24 feeB, uint256 minProfit"),
  ["0xUSDT", 500, 3000, 1_000_000n], // example
);

const loan = await fr.flashLoan({
  chain: "arbitrum",
  asset: "USDC",
  amount: "5000000",                          // 5 USDC
  strategy: "0xYourStrategyContract",
  strategyData,
  minProfit: "10000",                          // 0.01 USDC floor
  wallet,
});

console.log(loan);
// {
//   txHash: "0xabc...",
//   blockNumber: 123456789n,
//   providerUsed: 2,                          // Balancer V2
//   asset: "0xaf8...",
//   amount: "5000000",
//   profit: "12500",                           // 0.0125 USDC
//   providerFee: "0",                          // Balancer 0%
//   platformFee: "1000",                       // 2 bps = 0.001 USDC
//   gasUsed: 342000n,
//   effectiveGasPrice: 100000000n,
//   explorerUrl: "https://arbiscan.io/tx/0xabc..."
// }
```

## 6. Monitor in the dashboard

Every loan appears in your dashboard at [flashrouter.io/dashboard](https://flashrouter.io/dashboard) with full breakdowns of fees, gas, profit, and chain.

## Common patterns

### Pattern A — Cross-DEX arbitrage

Borrow asset A, swap on DEX X, swap back on DEX Y, repay. Profit if the spread > total fees.

See [`contracts/src/strategies/ArbitrageStrategyExample.sol`](../contracts/src/strategies/ArbitrageStrategyExample.sol).

### Pattern B — Liquidation

Borrow the debt asset, repay the unhealthy position on Aave/Compound, receive the collateral at a discount, swap collateral back to repay the flash loan, keep the liquidation bonus.

### Pattern C — Collateral swap

Borrow new collateral asset, deposit it into your lending position, withdraw old collateral, swap it back, repay flash loan. Result: collateral type swapped without unwinding the position.

### Pattern D — Refinance (debt swap)

Borrow new debt asset, repay old debt, withdraw collateral (or use a collateral swap), open new debt position on the better-priced protocol, repay flash loan. Result: debt migrated to cheaper protocol in one tx.

### Pattern E — Self-liquidation rescue

You're about to be liquidated. Use a flash loan to repay your own debt, withdraw your collateral, swap enough collateral to repay the flash loan, keep the rest. Result: you avoid the liquidation penalty (often 5–13%) by eating only the flash loan fee (~5 bps + gas).

## Authentication options

### Option 1 — API key (default)

`Authorization: Bearer fr_live_...` — easiest, works everywhere, required for Pro+ features.

### Option 2 — EIP-712 signed request

For wallet-native dApps that don't want to manage server-side API keys. Sign a canonical payload with the user's wallet, include the signature in `X-FR-Signature`. Treated as anonymous free-tier.

```typescript
const signature = await wallet.signTypedData({
  domain: { name: "FlashRouter", version: "1", chainId: 1 },
  types: { Request: [
    { name: "method", type: "string" },
    { name: "path",   type: "string" },
    { name: "body",   type: "bytes" },
    { name: "nonce",  type: "uint256" },
  ]},
  primaryType: "Request",
  message: { method: "POST", path: "/v1/quote", body: encodedBody, nonce: Date.now() },
});

await fetch("https://api.flashrouter.io/v1/quote", {
  method: "POST",
  headers: { "X-FR-Signature": signature, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
```

## What if my asset isn't on the verified list?

Submit it for review at [flashrouter.io/verify-asset](https://flashrouter.io/verify-asset). We add canonical issuers within 24 hours. We do not add fake-token clones, period.

## Need help?

- Docs: [flashrouter.io/docs](https://flashrouter.io/docs) or IPFS mirror: `ipfs.flashrouter.io/docs`
- Discord: [discord.gg/flashrouter](https://discord.gg/flashrouter)
- Email: support@flashrouter.io
- Enterprise: sales@flashrouter.io
