import {
  createPublicClient,
  http,
  parseAbi,
  encodeFunctionData,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import {
  Provider,
  type ChainName,
  type FlashRouterConfig,
  type FlashLoanParams,
  type FlashLoanResult,
  type Quote,
  type SimulationResult,
  type ProviderStatus,
} from "./types";
import {
  CHAINS,
  VERIFIED_ASSETS,
  DEFAULT_API_URL,
} from "./constants";
import {
  AssetNotVerifiedError,
  FlashRouterError,
  QuoteExpiredError,
  SimulationFailedError,
} from "./errors";

const FLASH_ROUTER_ABI = parseAbi([
  "function flashLoan((uint8 provider, address asset, uint256 amount, address strategy, bytes strategyData, uint256 minProfit, bytes quote) params) external returns (uint256 profit)",
  "function platformFeeBps() external view returns (uint16)",
  "function isVerifiedAsset(address) external view returns (bool)",
  "event FlashLoanExecuted(address indexed caller, address indexed strategy, uint8 indexed provider, address asset, uint256 amount, uint256 providerFee, uint256 platformFee, uint256 profit)",
]);

export class FlashRouter {
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly timeoutMs: number;
  private readonly rpcClients: Map<ChainName, PublicClient> = new Map();

  constructor(config: FlashRouterConfig) {
    if (!config.apiKey || !config.apiKey.startsWith("fr_")) {
      throw new FlashRouterError(
        "Invalid API key. Get one at https://flashrouter.io/dashboard",
        "INVALID_API_KEY",
      );
    }
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl ?? DEFAULT_API_URL;
    this.timeoutMs = config.timeoutMs ?? 30_000;

    // Preconfigure RPC clients
    if (config.rpcClients) {
      for (const [chain, client] of Object.entries(config.rpcClients)) {
        if (client) this.rpcClients.set(chain as ChainName, client);
      }
    }
  }

  /**
   * Execute a flash loan. Full lifecycle:
   *   1. Resolve asset symbol → verified address
   *   2. Request signed quote from FlashRouter (picks cheapest provider)
   *   3. Simulate against Tenderly fork
   *   4. Sign and broadcast tx
   *   5. Wait for receipt, parse profit, return structured result
   */
  async flashLoan(params: FlashLoanParams): Promise<FlashLoanResult> {
    const chainCfg = CHAINS[params.chain];
    if (!chainCfg) {
      throw new FlashRouterError(`Unsupported chain: ${params.chain}`, "UNSUPPORTED_CHAIN");
    }

    // ─── 1. Resolve and verify asset ───────────────────────────────────
    const assetAddr = this.resolveAsset(params.chain, params.asset);

    // ─── 2. Get a signed quote ─────────────────────────────────────────
    const quote = await this.getQuote({
      chain: params.chain,
      asset: assetAddr,
      amount: params.amount,
      provider: params.provider ?? Provider.AUTO,
    });

    if (quote.expiresAt * 1000 < Date.now()) {
      throw new QuoteExpiredError(quote.expiresAt);
    }

    // ─── 3. Simulate (unless explicitly skipped) ───────────────────────
    if (!params.skipSimulation) {
      const sim = await this.simulate({
        chain: params.chain,
        asset: assetAddr,
        amount: params.amount,
        strategy: params.strategy,
        strategyData: params.strategyData ?? "0x",
        provider: quote.provider,
      });
      if (!sim.willSucceed) {
        throw new SimulationFailedError(sim.revertReason ?? "unknown", sim.url);
      }
    }

    // ─── 4. Encode and broadcast ───────────────────────────────────────
    const calldata = encodeFunctionData({
      abi: FLASH_ROUTER_ABI,
      functionName: "flashLoan",
      args: [
        {
          provider: quote.provider,
          asset: assetAddr,
          amount: BigInt(params.amount),
          strategy: params.strategy,
          strategyData: params.strategyData ?? "0x",
          minProfit: BigInt(params.minProfit ?? "0"),
          quote: quote.signature,
        },
      ],
    });

    const account = params.wallet.account;
    if (!account) {
      throw new FlashRouterError("Wallet client has no account", "NO_WALLET_ACCOUNT");
    }

    const txHash = await params.wallet.sendTransaction({
      account,
      to: chainCfg.flashRouter,
      data: calldata,
      chain: null, // viem requires this be explicit per-call
    });

    // ─── 5. Wait for receipt and parse ─────────────────────────────────
    const publicClient = this.getPublicClient(params.chain);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    if (receipt.status !== "success") {
      throw new FlashRouterError(
        `Transaction reverted: ${chainCfg.explorerUrl}/tx/${txHash}`,
        "TX_REVERTED",
      );
    }

    // Parse FlashLoanExecuted event
    const event = this.parseFlashLoanEvent(receipt.logs);

    return {
      txHash,
      blockNumber: receipt.blockNumber,
      providerUsed: event.provider,
      asset: assetAddr,
      amount: params.amount,
      profit: event.profit.toString(),
      providerFee: event.providerFee.toString(),
      platformFee: event.platformFee.toString(),
      gasUsed: receipt.gasUsed,
      effectiveGasPrice: receipt.effectiveGasPrice,
      explorerUrl: `${chainCfg.explorerUrl}/tx/${txHash}`,
    };
  }

  /**
   * Get a signed quote without executing. Useful for showing the user
   * expected fees / gas / profit before they commit.
   */
  async getQuote(input: {
    chain: ChainName;
    asset: Address;
    amount: string;
    provider?: Provider;
  }): Promise<Quote> {
    const res = await this.apiCall<Quote>("/v1/quote", {
      method: "POST",
      body: input,
    });
    return res;
  }

  /**
   * Dry-run a strategy against a Tenderly fork. Returns predicted profit,
   * gas, and revert reason if any.
   */
  async simulate(input: {
    chain: ChainName;
    asset: Address;
    amount: string;
    strategy: Address;
    strategyData: Hex;
    provider: Provider;
  }): Promise<SimulationResult> {
    return await this.apiCall<SimulationResult>("/v1/simulate", {
      method: "POST",
      body: input,
    });
  }

  /**
   * Get live status of every (provider × chain) pair.
   */
  async getProviderStatus(): Promise<ProviderStatus[]> {
    return await this.apiCall<ProviderStatus[]>("/v1/providers", { method: "GET" });
  }

  // ───────────────────────────────────────────────────────────────────────
  //                           PRIVATE HELPERS
  // ───────────────────────────────────────────────────────────────────────

  private resolveAsset(chain: ChainName, asset: string): Address {
    // If it's already an address, verify it's on the whitelist
    if (asset.startsWith("0x") && asset.length === 42) {
      const verified = Object.values(VERIFIED_ASSETS[chain]).some(
        (a) => a.toLowerCase() === asset.toLowerCase(),
      );
      if (!verified) {
        throw new AssetNotVerifiedError(asset, chain);
      }
      return asset as Address;
    }

    // Otherwise treat as a symbol
    const addr = VERIFIED_ASSETS[chain][asset as keyof (typeof VERIFIED_ASSETS)[typeof chain]];
    if (!addr) {
      throw new AssetNotVerifiedError(asset, chain);
    }
    return addr;
  }

  private getPublicClient(chain: ChainName): PublicClient {
    const existing = this.rpcClients.get(chain);
    if (existing) return existing;

    // Lazy default. Production users should pass their own clients with API keys.
    const created = createPublicClient({
      transport: http(),
    });
    this.rpcClients.set(chain, created);
    return created;
  }

  private async apiCall<T>(
    path: string,
    init: { method: "GET" | "POST"; body?: unknown },
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.apiUrl}${path}`, {
        method: init.method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "User-Agent": "@flashrouter/sdk",
        },
        body: init.body ? JSON.stringify(init.body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new FlashRouterError(
          `API ${init.method} ${path} failed: ${res.status} ${text}`,
          "API_ERROR",
        );
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private parseFlashLoanEvent(logs: readonly { topics: readonly Hex[]; data: Hex }[]): {
    provider: Provider;
    providerFee: bigint;
    platformFee: bigint;
    profit: bigint;
  } {
    // event FlashLoanExecuted(address indexed caller, address indexed strategy,
    //   uint8 indexed provider, address asset, uint256 amount,
    //   uint256 providerFee, uint256 platformFee, uint256 profit);
    // Topic[0] = keccak256("FlashLoanExecuted(...)")
    // Topics 1-3 = indexed args; data = remaining args ABI-encoded.

    // In production we'd use viem's parseEventLogs. Simplified here.
    const log = logs.find(
      (l) =>
        l.topics[0] ===
        "0x" /* keccak256 of the event sig — fill in deploy-time */,
    );
    if (!log) {
      return { provider: Provider.AUTO, providerFee: 0n, platformFee: 0n, profit: 0n };
    }
    // (Real decoding logic omitted — use viem's decodeEventLog.)
    return { provider: Provider.AUTO, providerFee: 0n, platformFee: 0n, profit: 0n };
  }
}
