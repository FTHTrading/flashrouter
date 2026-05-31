/**
 * Tenderly-backed simulator. Dry-runs the strategy against a forked state
 * and returns predicted profit, gas, and revert reason if any.
 *
 * Tenderly API docs: https://docs.tenderly.co/simulations-and-forks/simulation-api
 */
export async function simulateStrategy(input: {
  chain: string;
  asset: string;
  amount: string;
  strategy: string;
  strategyData: string;
  provider: number;
}) {
  // Production: call Tenderly /simulate endpoint with the encoded calldata.
  // Stubbed.
  void input;
  return {
    willSucceed: true,
    revertReason: undefined,
    predictedProfit: "12500", // 12.5 USDC for example
    predictedGas: "342000",
    url: "https://dashboard.tenderly.co/explorer/...",
  };
}
