export class FlashRouterError extends Error {
  constructor(message: string, public readonly code: string, public readonly cause?: unknown) {
    super(message);
    this.name = "FlashRouterError";
  }
}

export class AssetNotVerifiedError extends FlashRouterError {
  constructor(assetAddress: string, chain: string) {
    super(
      `Asset ${assetAddress} on ${chain} is not on the verified-issuer whitelist. ` +
        `FlashRouter only supports canonical issuers (Tether, Circle, MakerDAO, etc.) ` +
        `to prevent fake-token fraud. If this is a legitimate asset, request review at https://flashrouter.io/verify-asset`,
      "ASSET_NOT_VERIFIED",
    );
    this.name = "AssetNotVerifiedError";
  }
}

export class QuoteExpiredError extends FlashRouterError {
  constructor(expiredAt: number) {
    super(
      `Quote expired at ${new Date(expiredAt * 1000).toISOString()}. ` +
        `Request a fresh quote and resubmit.`,
      "QUOTE_EXPIRED",
    );
    this.name = "QuoteExpiredError";
  }
}

export class InsufficientLiquidityError extends FlashRouterError {
  constructor(requested: string, available: string, provider: string) {
    super(
      `Insufficient liquidity at ${provider}: requested ${requested}, available ${available}. ` +
        `Try a smaller amount, a different provider, or let FlashRouter auto-route.`,
      "INSUFFICIENT_LIQUIDITY",
    );
    this.name = "InsufficientLiquidityError";
  }
}

export class SimulationFailedError extends FlashRouterError {
  constructor(reason: string, simulationUrl: string) {
    super(
      `Strategy simulation failed: ${reason}. View full trace: ${simulationUrl}`,
      "SIMULATION_FAILED",
    );
    this.name = "SimulationFailedError";
  }
}
