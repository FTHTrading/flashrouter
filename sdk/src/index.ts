/**
 * @flashrouter/sdk
 *
 * One API. Every flash-loan provider. Every chain.
 *
 * @example
 *   import { FlashRouter } from "@flashrouter/sdk";
 *
 *   const fr = new FlashRouter({ apiKey: "fr_live_..." });
 *
 *   const loan = await fr.flashLoan({
 *     chain: "arbitrum",
 *     asset: "USDC",
 *     amount: "5000000",      // 5 USDC (6 decimals)
 *     strategy: "0x...",      // your IFlashStrategy contract
 *     wallet: walletClient,   // viem WalletClient
 *   });
 *
 *   console.log(`Profit: ${loan.profit} ${loan.asset}`);
 *   console.log(`Tx hash: ${loan.txHash}`);
 *   console.log(`Provider used: ${loan.providerUsed}`);
 */

export { FlashRouter } from "./client";
export { ChainName, Provider, AssetSymbol } from "./types";
export type {
  FlashRouterConfig,
  FlashLoanParams,
  FlashLoanResult,
  Quote,
  SimulationResult,
  ProviderStatus,
} from "./types";
export { CHAINS, PROVIDERS, VERIFIED_ASSETS } from "./constants";
export { FlashRouterError, AssetNotVerifiedError, QuoteExpiredError } from "./errors";
