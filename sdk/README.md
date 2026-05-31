# @flashrouter/sdk

**One API. Every flash-loan provider. Every chain.**

```bash
npm install @flashrouter/sdk viem
```

## Quick start

```typescript
import { FlashRouter } from "@flashrouter/sdk";
import { createWalletClient, http } from "viem";
import { arbitrum } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const wallet = createWalletClient({
  account: privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`),
  chain: arbitrum,
  transport: http(process.env.ARB_RPC_URL),
});

const fr = new FlashRouter({ apiKey: process.env.FLASHROUTER_API_KEY! });

const loan = await fr.flashLoan({
  chain: "arbitrum",
  asset: "USDC",
  amount: "5000000",                              // 5 USDC
  strategy: "0xYourArbitrageStrategyContract",
  wallet,
});

console.log(`Profit: ${loan.profit} (raw units)`);
console.log(`Provider used: ${loan.providerUsed}`);
console.log(`Tx: ${loan.explorerUrl}`);
```

That's it. FlashRouter routes to the cheapest of Aave V3, Balancer V2, Uniswap V3, or Maker DSS-Flash, dry-runs the strategy, signs the quote, and broadcasts.

## Supported chains

Ethereum, Base, Arbitrum, Optimism, BNB Chain, Polygon. Tron support in Phase 2.

## Supported providers

Aave V3, Balancer V2, Uniswap V3, MakerDAO DSS-Flash. More coming.

## Anti-fraud posture

FlashRouter only supports assets at their canonical issuer addresses (Tether, Circle, MakerDAO, etc.). Fake-token clones marketed as "flash USDT" are rejected at the SDK and contract level. Read more in [COMPLIANCE.md](../docs/COMPLIANCE.md).

## License

MIT
