import type { Address, Hex, WalletClient, PublicClient } from "viem";

export type ChainName =
  | "ethereum"
  | "base"
  | "arbitrum"
  | "optimism"
  | "bnb"
  | "polygon";

export enum Provider {
  AUTO = 0,
  AAVE_V3 = 1,
  BALANCER_V2 = 2,
  UNISWAP_V3 = 3,
  MAKER_DSS = 4,
}

export type AssetSymbol =
  | "USDC"
  | "USDT"
  | "DAI"
  | "WETH"
  | "WBTC"
  | "USDe"
  | "FRAX";

export interface FlashRouterConfig {
  /** Your FlashRouter API key. Get one at https://flashrouter.io/dashboard */
  apiKey: string;
  /** Override the base API URL (for testnet / self-hosted deployments) */
  apiUrl?: string;
  /** Public RPC clients keyed by chain (optional — SDK provides defaults) */
  rpcClients?: Partial<Record<ChainName, PublicClient>>;
  /** Default chain if omitted on per-call basis */
  defaultChain?: ChainName;
  /** Timeout in ms for API calls (default 30s) */
  timeoutMs?: number;
}

export interface FlashLoanParams {
  /** Target chain — must be supported by FlashRouter */
  chain: ChainName;
  /** Asset to borrow — symbol or address. Symbols are looked up against
   *  the verified-issuer whitelist; addresses are checked against it too. */
  asset: AssetSymbol | Address;
  /** Amount to borrow, as a decimal string in the asset's smallest unit
   *  (e.g. "5000000" for 5 USDC since USDC has 6 decimals). */
  amount: string;
  /** Address of your strategy contract (implements IFlashStrategy) */
  strategy: Address;
  /** Optional ABI-encoded data forwarded to your strategy's onFlashLoan */
  strategyData?: Hex;
  /** Optional minimum profit floor. Reverts on-chain if not met. */
  minProfit?: string;
  /** Optional preferred provider. AUTO (default) = cheapest available. */
  provider?: Provider;
  /** Viem WalletClient to sign and broadcast the transaction */
  wallet: WalletClient;
  /** Optional: skip simulation (defaults to true — always simulate first) */
  skipSimulation?: boolean;
}

export interface Quote {
  /** Provider FlashRouter recommends for this loan */
  provider: Provider;
  /** Chain ID */
  chainId: number;
  /** Asset address */
  asset: Address;
  /** Amount in asset's smallest unit */
  amount: string;
  /** Fee charged by the upstream provider, in asset's smallest unit */
  providerFee: string;
  /** Fee charged by FlashRouter (basis points of notional), asset units */
  platformFee: string;
  /** Estimated gas cost in wei */
  estimatedGas: string;
  /** Estimated gas cost in USD */
  estimatedGasUsd: string;
  /** Total cost in USD (providerFee + platformFee + gas) */
  totalCostUsd: string;
  /** Quote expiration timestamp (seconds since epoch) */
  expiresAt: number;
  /** EIP-712 signature from FlashRouter quoter — submit on-chain to consume */
  signature: Hex;
  /** Quote hash for replay protection */
  quoteHash: Hex;
  /** Tenderly simulation URL */
  simulationUrl: string;
}

export interface SimulationResult {
  /** Whether the strategy would succeed */
  willSucceed: boolean;
  /** Revert reason if it would fail */
  revertReason?: string;
  /** Predicted profit (in asset's smallest unit) */
  predictedProfit: string;
  /** Predicted gas usage */
  predictedGas: string;
  /** Tenderly simulation URL */
  url: string;
}

export interface FlashLoanResult {
  /** Transaction hash of the executed flash loan */
  txHash: Hex;
  /** Block number it was included in */
  blockNumber: bigint;
  /** Provider actually used */
  providerUsed: Provider;
  /** Asset borrowed */
  asset: Address;
  /** Amount borrowed */
  amount: string;
  /** Net profit returned to the caller (in asset units) */
  profit: string;
  /** Provider fee paid (in asset units) */
  providerFee: string;
  /** FlashRouter platform fee paid (in asset units) */
  platformFee: string;
  /** Gas used */
  gasUsed: bigint;
  /** Effective gas price */
  effectiveGasPrice: bigint;
  /** Block explorer URL for the tx */
  explorerUrl: string;
}

export interface ProviderStatus {
  provider: Provider;
  chain: ChainName;
  healthy: boolean;
  liquidityUsd: string;
  feeBps: number;
  lastChecked: string; // ISO timestamp
}
